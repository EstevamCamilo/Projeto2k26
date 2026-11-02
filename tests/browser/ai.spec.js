import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ serviceWorkers: 'block' });
const exam = {
  kind: 'exam',
  title: 'Vida no oceano',
  instructions: 'Leia e responda com atenção.',
  questions: [
    {
      type: 'multiple',
      prompt: 'Qual destes animais é um mamífero?',
      points: 2,
      options: ['Baleia', 'Sardinha', 'Tubarão'],
      answer: 0,
    },
    {
      type: 'open',
      prompt: 'Como podemos proteger os oceanos?',
      points: 2,
      lines: 4,
      modelAnswer: 'Reduzindo resíduos e preservando os habitats.',
    },
    {
      type: 'truefalse',
      prompt: 'Marque verdadeiro ou falso.',
      points: 1,
      statements: [{ text: 'Os corais são animais.', answer: true }],
    },
  ],
};

async function mockAI(page, data, { login = false, generateStatus = 200 } = {}) {
  const requests = [];
  let authenticated = !login;
  await page.route('**/api/ai/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    const body = action === 'status' ? undefined : route.request().postDataJSON();
    if (action === 'generate') requests.push(body);
    if (action === 'login') {
      expect(body).toEqual({ password: 'senha-local-para-teste' });
      authenticated = true;
    }
    await route.fulfill({
      status: action === 'generate' ? generateStatus : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        action === 'status'
          ? { configured: true, authenticated }
          : action === 'login'
            ? { authenticated }
            : generateStatus === 200
              ? { data }
              : {
                  error: {
                    code: 'PROVIDER_BUSY',
                    message: 'A OpenAI está indisponível. Tente mais tarde.',
                  },
                }
      ),
    });
  });
  return requests;
}
async function generate(page, path, count = 3, login = false) {
  await page.goto('/Biblioteca/' + path);
  await page.locator('.qvc-ai-launcher').click();
  if (login) {
    await page.locator('#qvc-ai-password').fill('senha-local-para-teste');
    await page.locator('#qvc-ai-login').click();
  }
  await expect(page.locator('#qvc-ai-generate')).toBeEnabled();
  await page.locator('#qvc-ai-topic').fill('Ecossistema marinho');
  await page.locator('#qvc-ai-count').fill(String(count));
  await page.locator('#qvc-ai-generate').click();
}
async function apply(page) {
  await expect(page.locator('#qvc-ai-preview')).toBeVisible();
  await expect(page.locator('#qvc-ai-apply')).toBeDisabled();
  await page.locator('#qvc-ai-reviewed').check();
  await page.locator('#qvc-ai-apply').click();
  await expect(page.locator('#qvc-ai-dialog')).not.toBeVisible();
}

test('ChatGPT: login, revisão editável, três tipos de questão e desfazer após recarregar', async ({
  page,
}) => {
  const requests = await mockAI(page, exam, { login: true });
  await generate(page, 'Gera%20Provas/geraprovas.html', 3, true);
  await expect(page.locator('#qvc-ai-password')).toHaveValue('');
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(0);
  await expect(page.locator('#qvc-ai-title')).toHaveValue('Vida no oceano');
  await page.locator('#qvc-ai-title').fill('Minha avaliação revisada');
  const result = await new AxeBuilder({ page }).include('#qvc-ai-dialog').analyze();
  expect(result.violations).toEqual([]);
  await apply(page);
  await expect(page.locator('#exam-title')).toHaveValue('Minha avaliação revisada');
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(3);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ kind: 'exam', topic: 'Ecossistema marinho', count: 3 });
  expect(Object.keys(requests[0]).sort()).toEqual(['count', 'kind', 'level', 'topic']);
  await page.reload();
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(3);
  await page.locator('#exam-undo-import').click();
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(0);
});

test('ChatGPT: palavras revisadas geram uma grade real sem interpretar HTML', async ({ page }) => {
  const title = '<img src=x onerror=alert(1)> Oceano';
  await mockAI(page, {
    kind: 'words',
    title,
    instructions: 'Encontre os seres marinhos.',
    words: ['CORAL', 'BALEIA', 'TUBARAO'],
  });
  await generate(page, 'Ca%C3%A7a-Palavras/cacapalavras.html');
  await expect(page.locator('#qvc-ai-title')).toHaveValue(title);
  await expect(page.locator('#qvc-ai-preview img')).toHaveCount(0);
  await page.locator('#qvc-ai-items').fill('CORAL\nBALEIA\nPEIXE');
  await apply(page);
  await expect(page.locator('#categorias')).toHaveValue('chatgpt');
  await expect(page.locator('.qvc-wordsearch-list li')).toHaveCount(3);
  await expect(page.locator('.qvc-wordsearch-list')).toContainText('PEIXE');
  await expect(page.locator('#tabela td').first()).toBeVisible();
  await expect(page.locator('#conteudo')).toContainText(title);
  await expect(page.locator('#conteudo img')).toHaveCount(0);
});

test('ChatGPT: caligrafia preserva frases e instruções após recarregar', async ({ page }) => {
  const instructions = 'Trace as frases e escreva novamente.';
  await mockAI(page, {
    kind: 'handwriting',
    title: 'Meu oceano',
    instructions,
    sentences: ['O mar tem vida.', 'A baleia nada.', 'O coral é colorido.'],
  });
  await generate(page, 'Atividades/index.html?tipo=caligrafia');
  await apply(page);
  await expect(page.locator('.early-tracing-row')).toHaveCount(3);
  await expect(page.locator('#activity-preview')).toContainText(instructions);
  await page.reload();
  await expect(page.locator('.early-tracing-row')).toHaveCount(3);
  await expect(page.locator('#activity-preview')).toContainText(instructions);
});

test('ChatGPT: proposta de horário adiciona aulas sem conflitos', async ({ page }) => {
  await mockAI(page, {
    kind: 'schedule',
    title: 'Semana do oceano',
    instructions: 'Revise a disponibilidade.',
    lessons: [
      { day: 0, period: 1, subject: 'Ciências marinhas', teacher: '' },
      { day: 1, period: 2, subject: 'Leitura sobre o mar', teacher: '' },
      { day: 4, period: 3, subject: 'Arte com cores do oceano', teacher: '' },
    ],
  });
  await generate(page, 'HorarioEscolar/index.html');
  await apply(page);
  await expect(page.locator('#lesson-count')).toHaveText('3');
  await expect(page.locator('#conflict-count')).toHaveText('0');
  await expect(page.locator('#schedule-preview')).toContainText('Ciências marinhas');
  await expect(page.locator('#schedule-preview')).toContainText('Professor a definir');
  await page.reload();
  await expect(page.locator('#lesson-count')).toHaveText('3');
});

test('ChatGPT: serviço não configurado e erro da API preservam o rascunho', async ({ page }) => {
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ configured: false, authenticated: false }),
    })
  );
  await page.goto('/Biblioteca/Gera%20Provas/geraprovas.html');
  await page.locator('.qvc-ai-launcher').click();
  await expect(page.locator('#qvc-ai-status')).toContainText('ainda não foi ativado');
  await expect(page.locator('#qvc-ai-generate')).toBeDisabled();
  await page.locator('#qvc-ai-close').click();
  await page.unroute('**/api/ai/status');
  await mockAI(page, exam, { generateStatus: 503 });
  await generate(page, 'Gera%20Provas/geraprovas.html');
  await expect(page.locator('#qvc-ai-status')).toContainText('indisponível');
  await expect(page.locator('#qvc-ai-preview')).not.toBeVisible();
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(0);
  await expect(page.locator('#qvc-ai-generate')).toBeEnabled();
});

test('ChatGPT: cancelar geração não aplica uma resposta atrasada', async ({ page }) => {
  await mockAI(page, exam);
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/ai/generate', async (route) => {
    await delayed;
    await route
      .fulfill({ contentType: 'application/json', body: JSON.stringify({ data: exam }) })
      .catch(() => {});
  });
  await generate(page, 'Gera%20Provas/geraprovas.html');
  await expect(page.locator('.qvc-ai-spinner')).toBeVisible();
  await page.locator('#qvc-ai-cancel').click();
  await expect(page.locator('#qvc-ai-generate')).toBeEnabled();
  release();
  await expect(page.locator('#qvc-ai-status')).toContainText('cancelad');
  await expect(page.locator('#qvc-ai-preview')).not.toBeVisible();
  await expect(page.locator('#exam-preview .exam-question')).toHaveCount(0);
});
