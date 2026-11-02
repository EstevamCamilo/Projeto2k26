import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { validateAIRequest } from '../../Biblioteca/shared/ai-contract.js';
import { AIError } from './errors.mjs';
import { createRateLimiter } from './limits.mjs';
import { generateContent } from './openai.mjs';
const COOKIE = 'qvc_ai_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const BODY_LIMIT = 8192;
const REQUEST_BUDGET_MS = 55000;
const hash = (value) => createHash('sha256').update(value).digest();
function equal(a, b) {
  return timingSafeEqual(hash(a), hash(b));
}
function originConfig(env) {
  if (!env.APP_ORIGIN) return null;
  try {
    const url = new URL(env.APP_ORIGIN);
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !['http:', 'https:'].includes(url.protocol)
    )
      return false;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !local) return false;
    return url.origin;
  } catch {
    return false;
  }
}
function configured(env) {
  const origin = originConfig(env),
    password = env.AI_ACCESS_PASSWORD || '',
    secret = env.AI_SESSION_SECRET || '';
  if (
    !env.OPENAI_API_KEY ||
    env.OPENAI_API_KEY.length < 10 ||
    password.length < 12 ||
    password.length > 500 ||
    Buffer.byteLength(secret) < 32 ||
    secret.length > 1024 ||
    origin === false
  )
    return false;
  if ((env.NODE_ENV === 'production' || env.VERCEL) && !origin) return false;
  if (
    (env.VERCEL || env.AI_REQUIRE_SHARED_LIMITS === 'true') &&
    (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
  )
    return false;
  return true;
}
function ensureOrigin(request, env) {
  const expected = originConfig(env),
    origin = request.headers.origin;
  if (typeof origin !== 'string' || origin === 'null')
    throw new AIError(
      403,
      'ORIGIN_REJECTED',
      'Abra a ferramenta no endereço oficial para usar a IA.'
    );
  if (expected) {
    if (origin !== expected)
      throw new AIError(
        403,
        'ORIGIN_REJECTED',
        'O pedido precisa partir do endereço oficial da plataforma.'
      );
    return;
  }
  try {
    const target = new URL(origin);
    if (
      env.NODE_ENV === 'production' ||
      env.VERCEL ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      target.protocol !== 'http:' ||
      target.host !== request.headers.host
    )
      throw new Error('Origin mismatch');
  } catch {
    throw new AIError(
      403,
      'ORIGIN_REJECTED',
      'Configure o endereço oficial da plataforma para usar a IA.'
    );
  }
}
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function readSession(request, env, now) {
  const cookie = request.headers.cookie;
  if (typeof cookie !== 'string' || cookie.length > 16000 || !env.AI_SESSION_SECRET) return null;
  const raw = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1);
  if (!raw || raw.length > 512) return null;
  const [payload, signature, extra] = raw.split('.');
  if (extra || !payload || !signature || !equal(sign(payload, env.AI_SESSION_SECRET), signature))
    return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      session.v !== 1 ||
      !/^[a-f0-9-]{36}$/.test(session.sid) ||
      !Number.isSafeInteger(session.exp) ||
      session.exp <= now() ||
      session.exp > now() + SESSION_MS + 60000
    )
      return null;
    return session;
  } catch {
    return null;
  }
}
function cookieValue(value, env, maxAge) {
  return `${COOKIE}=${value}; Path=/api/ai; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${env.NODE_ENV === 'production' || env.VERCEL || String(env.APP_ORIGIN || '').startsWith('https:') ? '; Secure' : ''}`;
}
async function readJSON(request) {
  const contentType = String(request.headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (contentType !== 'application/json')
    throw new AIError(415, 'JSON_REQUIRED', 'Envie um pedido JSON válido.');
  const declared = request.headers['content-length'];
  if (declared !== undefined && (!/^\d+$/.test(String(declared)) || Number(declared) > BODY_LIMIT))
    throw new AIError(413, 'BODY_TOO_LARGE', 'O pedido é muito grande. Reduza o texto do tema.');
  let source;
  if (request.body !== undefined) {
    try {
      source = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    } catch {
      throw new AIError(400, 'INVALID_JSON', 'O pedido não contém um JSON válido.');
    }
    if (Buffer.byteLength(source || '') > BODY_LIMIT)
      throw new AIError(413, 'BODY_TOO_LARGE', 'O pedido é muito grande. Reduza o texto do tema.');
  } else {
    source = await new Promise((resolve, reject) => {
      const chunks = [];
      let length = 0,
        ended = false;
      function cleanup() {
        clearTimeout(timer);
        request.removeListener('data', onData);
        request.removeListener('end', onEnd);
        request.removeListener('error', onError);
        request.removeListener('aborted', onAborted);
      }
      function finish(error, value) {
        if (ended) return;
        ended = true;
        cleanup();
        if (error) {
          request.once('error', () => {});
          request.resume();
          reject(error);
        } else resolve(value);
      }
      function onData(chunk) {
        length += chunk.length;
        if (length > BODY_LIMIT)
          finish(
            new AIError(413, 'BODY_TOO_LARGE', 'O pedido é muito grande. Reduza o texto do tema.')
          );
        else chunks.push(chunk);
      }
      function onEnd() {
        finish(null, Buffer.concat(chunks).toString('utf8'));
      }
      function onError() {
        finish(new AIError(400, 'INVALID_BODY', 'Não foi possível ler o pedido.'));
      }
      function onAborted() {
        finish(new AIError(400, 'INVALID_BODY', 'O pedido foi interrompido.'));
      }
      const timer = setTimeout(
        () =>
          finish(
            new AIError(
              408,
              'REQUEST_TIMEOUT',
              'O envio do pedido demorou demais. Tente novamente.'
            )
          ),
        10000
      );
      timer.unref?.();
      request.on('data', onData);
      request.once('end', onEnd);
      request.once('error', onError);
      request.once('aborted', onAborted);
    });
  }
  try {
    return JSON.parse(source);
  } catch {
    throw new AIError(400, 'INVALID_JSON', 'O pedido não contém um JSON válido.');
  }
}
function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    Vary: 'Origin, Cookie',
    ...headers,
  });
  response.end(JSON.stringify(body));
}
function clientKey(request, env) {
  let address = request.socket?.remoteAddress || 'unknown';
  if (env.VERCEL)
    address = String(
      request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || address
    )
      .split(',')
      .at(-1)
      .trim();
  else if (env.AI_TRUST_PROXY === 'true')
    address = String(request.headers['x-forwarded-for'] || address)
      .split(',')
      .at(-1)
      .trim();
  return createHmac('sha256', env.AI_SESSION_SECRET || 'unconfigured')
    .update(address)
    .digest('hex')
    .slice(0, 32);
}
export function createAIHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
} = {}) {
  const consume = createRateLimiter({ env, fetchImpl, now });
  return async function handle(request, response) {
    let path;
    try {
      path = new URL(request.url || '/', 'http://localhost').pathname;
    } catch {
      return false;
    }
    if (!path.startsWith('/api/ai/')) return false;
    const startedAt = now();
    try {
      const action = /^\/api\/ai\/(status|login|logout|generate)\/?$/.exec(path)?.[1];
      if (!action) throw new AIError(404, 'NOT_FOUND', 'Endpoint de IA não encontrado.');
      const expectedMethod = action === 'status' ? 'GET' : 'POST';
      if (request.method !== expectedMethod) {
        json(
          response,
          405,
          { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' } },
          { Allow: expectedMethod }
        );
        return true;
      }
      const ready = configured(env),
        session = ready ? readSession(request, env, now) : null;
      if (action === 'status') {
        json(response, 200, { configured: ready, authenticated: Boolean(session) });
        return true;
      }
      ensureOrigin(request, env);
      if (action === 'logout') {
        await readJSON(request);
        json(response, 200, { authenticated: false }, { 'Set-Cookie': cookieValue('', env, 0) });
        return true;
      }
      if (!ready)
        throw new AIError(
          503,
          'AI_NOT_CONFIGURED',
          'O administrador ainda precisa configurar a integração com a OpenAI no servidor.'
        );
      const ip = clientKey(request, env);
      if (action === 'login') {
        await consume('login:global', 200, 60000);
        await consume(`login:${ip}`, 5, 15 * 60000);
        const body = await readJSON(request);
        if (
          !body ||
          typeof body !== 'object' ||
          typeof body.password !== 'string' ||
          !equal(body.password, env.AI_ACCESS_PASSWORD)
        )
          throw new AIError(
            401,
            'INVALID_PASSWORD',
            'O código de acesso está incorreto. Confira com o responsável pela plataforma.'
          );
        const payload = Buffer.from(
          JSON.stringify({ v: 1, sid: randomUUID(), exp: now() + SESSION_MS })
        ).toString('base64url');
        const token = `${payload}.${sign(payload, env.AI_SESSION_SECRET)}`;
        json(
          response,
          200,
          { authenticated: true },
          { 'Set-Cookie': cookieValue(token, env, SESSION_MS / 1000) }
        );
        return true;
      }
      if (!session)
        throw new AIError(
          401,
          'AUTH_REQUIRED',
          'Entre com o código de acesso para gerar conteúdo com ChatGPT.'
        );
      let requestData;
      try {
        requestData = validateAIRequest(await readJSON(request));
      } catch (error) {
        if (error instanceof AIError) throw error;
        throw new AIError(400, 'INVALID_REQUEST', error.message);
      }
      await consume(`generate:ip:${ip}`, 12, 10 * 60000);
      await consume(`generate:session:${session.sid}`, 8, 60000);
      const configuredDailyLimit = Number(env.AI_DAILY_LIMIT);
      const dailyLimit =
        Number.isInteger(configuredDailyLimit) &&
        configuredDailyLimit >= 1 &&
        configuredDailyLimit <= 10000
          ? configuredDailyLimit
          : 500;
      await consume(`generate:daily:${Math.floor(now() / 86400000)}`, dailyLimit, 86400000);
      // Reserve 250ms for validation/serialization before Vercel's 60s hard deadline.
      // Body/Redis elapsed time is deducted, without changing the usual 35s provider timeout.
      const remainingMs = REQUEST_BUDGET_MS - (now() - startedAt) - 250;
      const result = await generateContent(requestData, { env, fetchImpl, remainingMs });
      json(response, 200, { data: result });
    } catch (error) {
      const safe =
        error instanceof AIError
          ? error
          : new AIError(
              500,
              'INTERNAL_ERROR',
              'Não foi possível concluir o pedido. Tente novamente em alguns instantes.'
            );
      if (!response.headersSent)
        json(
          response,
          safe.status,
          { error: { code: safe.code, message: safe.message } },
          safe.retryAfter ? { 'Retry-After': String(safe.retryAfter) } : {}
        );
    }
    return true;
  };
}
export const handleAIRequest = createAIHandler();
