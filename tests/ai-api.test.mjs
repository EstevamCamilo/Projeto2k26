import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createAIHandler } from '../server/ai/handler.mjs';
import {
  validateAIRequest,
  validateAIResult,
  generationSchema,
} from '../Biblioteca/shared/ai-contract.js';
const baseEnv = () => ({
  OPENAI_API_KEY: 'test-server-only-api-key',
  AI_ACCESS_PASSWORD: 'test-password-private',
  AI_SESSION_SECRET: 'test-secret-with-at-least-thirty-two-bytes',
});
const request = (kind = 'words', count = 3) => ({
  kind,
  topic: 'Ecossistema marinho',
  level: 'Ensino fundamental',
  count,
});
const words = {
  kind: 'words',
  title: 'Vida marinha',
  instructions: 'Encontre os termos.',
  words: ['BALEIA', 'CORAL', 'POLVO'],
};
const upstream = (data = words) =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify(data) }],
        },
      ],
    }),
    { status: 200 }
  );
async function start(t, env = baseEnv(), fetchImpl = async () => upstream(), now) {
  const handler = createAIHandler({ env, fetchImpl, now });
  const server = http.createServer(async (req, res) => {
    if (!(await handler(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      })
  );
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function call(action, body, cookie, extra = {}) {
    const headers = {
      ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra.headers,
    };
    return fetch(`${origin}/api/ai/${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      ...extra,
      headers,
    });
  }
  async function login() {
    const response = await call('login', { password: env.AI_ACCESS_PASSWORD });
    assert.equal(response.status, 200, await response.clone().text());
    return response.headers.get('set-cookie').split(';')[0];
  }
  return { call, login, origin };
}
test('contrato limita entrada e normaliza os quatro formatos sem aceitar dados impossíveis', () => {
  assert.deepEqual(validateAIRequest({ ...request(), ignored: '<script>' }), request());
  for (const bad of [
    null,
    {},
    { ...request(), kind: '__proto__' },
    { ...request(), count: 25 },
    { ...request(), count: 1.5 },
    { ...request(), topic: 'x'.repeat(301) },
  ])
    assert.throws(() => validateAIRequest(bad));
  assert.deepEqual(validateAIResult({ ...words, injected: true }, request()), words);
  assert.throws(() => validateAIResult({ ...words, words: ['ação', 'ACAO'] }, request()));
  assert.throws(() => validateAIResult({ ...words, words: ['DOIS TERMOS'] }, request()));
  assert.throws(() => validateAIResult({ ...words, words: ['<script>'] }, request()));
  for (const sentence of ['x'.repeat(29), 'O mar, a vida', 'linha\nnova'])
    assert.throws(() =>
      validateAIResult(
        { kind: 'handwriting', title: 'Escrita', instructions: '', sentences: [sentence] },
        request('handwriting')
      )
    );
  const handwritingPattern = new RegExp(
    generationSchema(request('handwriting')).properties.sentences.items.pattern
  );
  assert.equal(handwritingPattern.test('Marinho'), true);
  assert.equal(handwritingPattern.test('O mar\né azul'), false);
  const exam = {
    kind: 'exam',
    title: 'Prova',
    instructions: '',
    questions: [
      { type: 'multiple', prompt: 'Escolha.', points: 1, options: ['A', 'B'], answer: 1 },
      { type: 'open', prompt: 'Explique.', points: 2.5, lines: 3, modelAnswer: 'Modelo.' },
      {
        type: 'truefalse',
        prompt: 'Julgue.',
        points: 1,
        statements: [{ text: 'O mar é água.', answer: true }],
      },
    ],
  };
  assert.deepEqual(validateAIResult(exam, request('exam')), exam);
  assert.throws(() =>
    validateAIResult({ ...exam, questions: [{ ...exam.questions[0], answer: 2 }] }, request('exam'))
  );
  const schedule = {
    kind: 'schedule',
    title: 'Semana',
    instructions: '',
    lessons: [{ day: 0, period: 1, subject: 'Ciências', teacher: '' }],
  };
  assert.deepEqual(validateAIResult(schedule, request('schedule')), schedule);
  assert.throws(() =>
    validateAIResult(
      { ...schedule, lessons: [schedule.lessons[0], schedule.lessons[0]] },
      request('schedule')
    )
  );
  assert.throws(() =>
    validateAIResult(
      { ...schedule, lessons: [{ ...schedule.lessons[0], period: 4 }] },
      request('schedule')
    )
  );
  assert.throws(() => validateAIRequest({ ...request('schedule'), periodCount: 0 }));
  assert.throws(() => validateAIRequest(request('schedule', 16)));
  assert.equal(
    generationSchema(request('schedule')).properties.lessons.items.properties.period.maximum,
    3
  );
  assert.equal(
    generationSchema({ ...request('schedule'), periodCount: 6 }).properties.lessons.items.properties
      .period.maximum,
    6
  );
  assert.deepEqual(
    generationSchema(request('schedule')).properties.lessons.items.properties.teacher.enum,
    ['']
  );
});
test('status não expõe segredos e serviço incompleto nunca chama OpenAI', async (t) => {
  let calls = 0;
  const app = await start(t, {}, async () => {
    calls++;
    throw new Error('must not call');
  });
  const response = await app.call('status');
  assert.deepEqual(await response.json(), { configured: false, authenticated: false });
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal((await app.call('generate', request())).status, 503);
  assert.equal(calls, 0);
});
test('origem, autenticação e métodos bloqueiam chamadas pagas indevidas', async (t) => {
  let calls = 0;
  const app = await start(t, baseEnv(), async () => {
    calls++;
    return upstream();
  });
  assert.equal((await app.call('generate', request())).status, 401);
  for (const Origin of ['https://attacker.example', 'null'])
    assert.equal(
      (
        await app.call('login', { password: baseEnv().AI_ACCESS_PASSWORD }, null, {
          headers: { Origin },
        })
      ).status,
      403
    );
  assert.equal((await app.call('generate')).status, 405);
  assert.equal((await app.call('no-such-action')).status, 404);
  assert.equal(calls, 0);
});
test('sessão HttpOnly assinada autentica, expira e rejeita adulteração', async (t) => {
  let time = Date.now();
  const app = await start(
    t,
    baseEnv(),
    async () => upstream(),
    () => time
  );
  const login = await app.call('login', { password: baseEnv().AI_ACCESS_PASSWORD }),
    header = login.headers.get('set-cookie');
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Path=\/api\/ai/);
  const cookie = header.split(';')[0];
  assert.deepEqual(await (await app.call('status', undefined, cookie)).json(), {
    configured: true,
    authenticated: true,
  });
  assert.equal((await app.call('generate', request(), cookie + 'x')).status, 401);
  time += 9 * 60 * 60 * 1000;
  assert.equal((await app.call('generate', request(), cookie)).status, 401);
});
test('Responses API usa segredo somente no header servidor, JSON estrito e store:false', async (t) => {
  let captured;
  const app = await start(t, baseEnv(), async (url, options) => {
    captured = { url, options };
    return upstream();
  });
  const response = await app.call('generate', request(), await app.login());
  assert.equal(response.status, 200);
  const raw = await response.text();
  assert.deepEqual(JSON.parse(raw), { data: words });
  assert.equal(raw.includes(baseEnv().OPENAI_API_KEY), false);
  assert.equal(raw.includes(baseEnv().AI_ACCESS_PASSWORD), false);
  assert.equal(captured.url, 'https://api.openai.com/v1/responses');
  assert.equal(captured.options.headers.Authorization, `Bearer ${baseEnv().OPENAI_API_KEY}`);
  const body = JSON.parse(captured.options.body);
  assert.equal(body.store, false);
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.schema.additionalProperties, false);
  assert.equal(body.max_output_tokens <= 14000, true);
  assert.equal(captured.options.redirect, 'error');
});
test('JSON incorreto, corpo excessivo e entrada inválida não chegam ao provedor', async (t) => {
  let calls = 0;
  const app = await start(t, baseEnv(), async () => {
      calls++;
      return upstream();
    }),
    cookie = await app.login();
  assert.equal((await app.call('generate', '{broken', cookie)).status, 400);
  assert.equal((await app.call('generate', 'x'.repeat(9000), cookie)).status, 413);
  assert.equal(
    (await app.call('generate', request(), cookie, { headers: { 'Content-Type': 'text/plain' } }))
      .status,
    415
  );
  assert.equal((await app.call('generate', { ...request(), count: 99 }, cookie)).status, 400);
  assert.equal(calls, 0);
});
test('proteção de login bloqueia força bruta com Retry-After', async (t) => {
  const app = await start(t);
  for (let i = 0; i < 5; i++)
    assert.equal((await app.call('login', { password: 'wrong' })).status, 401);
  const response = await app.call('login', { password: baseEnv().AI_ACCESS_PASSWORD });
  assert.equal(response.status, 429);
  assert.equal(Number(response.headers.get('retry-after')) > 0, true);
});
test('limite diário global não pode ser contornado com outra sessão', async (t) => {
  let calls = 0;
  const app = await start(t, { ...baseEnv(), AI_DAILY_LIMIT: '1' }, async () => {
    calls++;
    return upstream();
  });
  assert.equal((await app.call('generate', request(), await app.login())).status, 200);
  assert.equal((await app.call('generate', request(), await app.login())).status, 429);
  assert.equal(calls, 1);
});
test('limites Redis são atômicos e compartilhados entre instâncias', async (t) => {
  const counts = new Map();
  let providerCalls = 0;
  const env = {
    ...baseEnv(),
    AI_REQUIRE_SHARED_LIMITS: 'true',
    UPSTASH_REDIS_REST_URL: 'https://redis.example',
    UPSTASH_REDIS_REST_TOKEN: 'private-redis-token',
    AI_DAILY_LIMIT: '1',
  };
  const transport = async (url, options) => {
    if (String(url).startsWith('https://redis.example')) {
      assert.equal(options.headers.Authorization, 'Bearer private-redis-token');
      const command = JSON.parse(options.body);
      assert.equal(command[0], 'EVAL');
      assert.match(command[1], /INCR/);
      assert.match(command[1], /PEXPIRE/);
      const key = command[3],
        count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return new Response(JSON.stringify({ result: [count, 60000] }), { status: 200 });
    }
    providerCalls++;
    return upstream();
  };
  const first = await start(t, env, transport),
    second = await start(t, env, transport),
    cookie = await first.login();
  assert.equal((await first.call('generate', request(), cookie)).status, 200);
  assert.equal((await second.call('generate', request(), cookie)).status, 429);
  assert.equal(providerCalls, 1);
});
test('produção serverless exige origem, segredo forte e armazenamento compartilhado', async (t) => {
  const app = await start(t, {
    ...baseEnv(),
    NODE_ENV: 'production',
    VERCEL: '1',
    APP_ORIGIN: 'https://qvc.example',
  });
  assert.deepEqual(await (await app.call('status')).json(), {
    configured: false,
    authenticated: false,
  });
  const weak = await start(t, { ...baseEnv(), AI_SESSION_SECRET: 'weak' });
  assert.equal((await (await weak.call('status')).json()).configured, false);
  const missingOrigin = await start(t, { ...baseEnv(), NODE_ENV: 'production' });
  assert.equal((await (await missingOrigin.call('status')).json()).configured, false);
});
test('falha do armazenamento bloqueia sem fallback inseguro', async (t) => {
  const app = await start(
    t,
    {
      ...baseEnv(),
      AI_REQUIRE_SHARED_LIMITS: 'true',
      UPSTASH_REDIS_REST_URL: 'https://redis.example',
      UPSTASH_REDIS_REST_TOKEN: 'secret',
    },
    async () => {
      throw new Error('sensitive failure');
    }
  );
  const response = await app.call('login', { password: baseEnv().AI_ACCESS_PASSWORD });
  assert.equal(response.status, 503);
  const serialized = await response.text();
  assert.equal(serialized.includes('sensitive failure'), false);
  assert.equal(JSON.parse(serialized).error.code, 'LIMITER_UNAVAILABLE');
});
test('erros OpenAI são sanitizados e conteúdo inválido nunca é aceito', async (t) => {
  for (const status of [401, 403, 404, 429, 500]) {
    const app = await start(
      t,
      baseEnv(),
      async () => new Response('secret-provider-body-with-key', { status })
    );
    const response = await app.call('generate', request(), await app.login());
    assert.equal([502, 503].includes(response.status), true);
    assert.equal((await response.text()).includes('secret-provider-body'), false);
  }
  const app = await start(t, baseEnv(), async () =>
    upstream({ ...words, words: ['POLVO', 'POLVO'] })
  );
  const invalid = await app.call('generate', request(), await app.login());
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error.code, 'INVALID_AI_RESPONSE');
});
test('timeout aborta chamada e recusa do modelo gera mensagem pública', async (t) => {
  const app = await start(
    t,
    { ...baseEnv(), OPENAI_TIMEOUT_MS: '1000' },
    async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true }
        );
      })
  );
  const response = await app.call('generate', request(), await app.login());
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'AI_TIMEOUT');
  const refused = await start(
    t,
    baseEnv(),
    async () =>
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ content: [{ type: 'refusal', refusal: 'sensitive-provider-text' }] }],
        }),
        { status: 200 }
      )
  );
  const refusal = await refused.call('generate', request(), await refused.login());
  assert.equal(refusal.status, 422);
  assert.equal((await refusal.text()).includes('sensitive-provider-text'), false);
});
test('logout remove cookie e status reflete ausência de sessão', async (t) => {
  const app = await start(t),
    cookie = await app.login(),
    response = await app.call('logout', {}, cookie);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.deepEqual(await (await app.call('status')).json(), {
    configured: true,
    authenticated: false,
  });
});
test('orçamento total55s desconta latência Redis antes de aceitar timeout OpenAI50s', async (t) => {
  let clock = Date.now(),
    providerStarted = false;
  const env = {
    ...baseEnv(),
    OPENAI_TIMEOUT_MS: '50000',
    UPSTASH_REDIS_REST_URL: 'https://redis.example',
    UPSTASH_REDIS_REST_TOKEN: 'token',
  };
  const app = await start(
    t,
    env,
    async (url, options) => {
      if (String(url).startsWith('https://redis.example')) {
        clock += 17900;
        return new Response(JSON.stringify({ result: [1, 60000] }), { status: 200 });
      }
      providerStarted = true;
      return new Promise((_resolve, reject) =>
        options.signal.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true }
        )
      );
    },
    () => clock
  );
  const cookie = await app.login(),
    started = Date.now(),
    response = await app.call('generate', request(), cookie);
  assert.equal(providerStarted, true);
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'AI_TIMEOUT');
  assert.equal(
    Date.now() - started < 3000,
    true,
    'o timeout deveria ser limitado ao orçamento restante (~1s), não50s'
  );
});
