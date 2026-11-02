import { AIError } from './errors.mjs';
const SCRIPT =
  "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return {n,redis.call('PTTL',KEYS[1])}";
const MAX_LOCAL_KEYS = 5000;
/** Limite atômico Redis para múltiplas instâncias; memória limitada para um processo Node. */
export function createRateLimiter({ env, fetchImpl, now = Date.now }) {
  const buckets = new Map();
  return async function consume(key, maximum, windowMs) {
    let count, ttl;
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const endpoint = new URL(env.UPSTASH_REDIS_REST_URL);
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password)
          throw new Error('Invalid Redis URL');
        const response = await fetchImpl(endpoint.href, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['EVAL', SCRIPT, '1', `qvc:ai:${key}`, String(windowMs)]),
          signal: AbortSignal.timeout(5000),
          redirect: 'error',
        });
        if (!response.ok) throw new Error('Redis unavailable');
        const body = await response.json();
        if (
          !Array.isArray(body.result) ||
          body.result.length !== 2 ||
          !body.result.every(Number.isFinite)
        )
          throw new Error('Invalid limiter response');
        [count, ttl] = body.result;
        if (count < 1 || ttl < 0) throw new Error('Invalid limiter counter');
      } catch {
        throw new AIError(
          503,
          'LIMITER_UNAVAILABLE',
          'O controle de uso está indisponível. Tente novamente em alguns instantes.'
        );
      }
    } else {
      if (env.VERCEL || env.AI_REQUIRE_SHARED_LIMITS === 'true')
        throw new AIError(
          503,
          'SHARED_LIMITER_REQUIRED',
          'O serviço precisa de um controle de uso compartilhado para esta implantação.'
        );
      const time = now();
      for (const [oldKey, bucket] of buckets) if (bucket.expires <= time) buckets.delete(oldKey);
      let bucket = buckets.get(key);
      if (!bucket) {
        // Não descartar contadores ativos sob ataque.
        if (buckets.size >= MAX_LOCAL_KEYS)
          throw new AIError(
            503,
            'LIMITER_CAPACITY',
            'O serviço está ocupado. Tente novamente em alguns instantes.'
          );
        bucket = { count: 0, expires: time + windowMs };
        buckets.set(key, bucket);
      }
      count = ++bucket.count;
      ttl = bucket.expires - time;
    }
    if (count > maximum)
      throw new AIError(
        429,
        'RATE_LIMITED',
        'Você atingiu o limite temporário de uso. Aguarde antes de tentar novamente.',
        Math.max(1, Math.ceil(ttl / 1000))
      );
  };
}
