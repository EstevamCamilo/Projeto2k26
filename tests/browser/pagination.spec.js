import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function geometry(frame) {
  return frame.evaluate(() =>
    [...document.querySelectorAll('.qvc-a4-page')].map((page) => {
      const body = page.querySelector('.qvc-a4-body').getBoundingClientRect();
      const flow = page.querySelector('.qvc-a4-flow').getBoundingClientRect();
      const size = page.getBoundingClientRect();
      return { width: size.width, height: size.height, overflow: flow.bottom - body.bottom };
    })
  );
}

test('Prova longa: perguntas inteiras, gabarito separado e cabeçalhos em todas as páginas A4', async ({
  page,
  browser,
}) => {
  await page.goto('/Biblioteca/Gera%20Provas/geraprovas.html');
  const fixture = await page.evaluate(async () => {
    const { createExam } = await import('/Biblioteca/Gera%20Provas/exam-model.mjs');
    const exam = createExam();
    exam.metadata.school = 'Escola da paginação';
    exam.metadata.title = 'Avaliação extensa';
    exam.questions = Array.from({ length: 36 }, (_, i) => ({
      id: `q_${i}`,
      type: 'open',
      points: 1,
      prompt: `QUESTAO_${i + 1} Explique o que você aprendeu sobre a natureza e escreva um exemplo.`,
      lines: 4,
      modelAnswer: `GABARITO_${i + 1} Resposta de referência do professor.`,
    }));
    exam.includeAnswerKey = true;
    return exam;
  });
  await page.addInitScript(
    (exam) => localStorage.setItem('qvc:exams:v2', JSON.stringify(exam)),
    fixture
  );
  await page.reload();
  await page.evaluate(() => window.QVC.print());
  const frame = page.frames().find((candidate) => candidate.parentFrame());
  await expect(page.frameLocator('#qvc-print-frame').locator('.exam-question')).toHaveCount(36);
  await expect(page.frameLocator('#qvc-print-frame').locator('.exam-key-item')).toHaveCount(36);
  const pages = await frame.locator('.qvc-a4-page').count();
  expect(pages).toBeGreaterThan(6);
  await expect(frame.locator('.qvc-a4-header [data-qvc-school-header]')).toHaveCount(pages);
  for (const item of await geometry(frame)) {
    expect(item.width).toBeCloseTo((210 * 96) / 25.4, 0);
    expect(item.height).toBeCloseTo((297 * 96) / 25.4, 0);
    expect(item.overflow).toBeLessThanOrEqual(1);
  }
  expect(
    await frame.locator('.exam-question').evaluateAll((nodes) =>
      nodes.every((node) => {
        const bounds = node.getBoundingClientRect();
        const body = node
          .closest('.qvc-a4-page')
          .querySelector('.qvc-a4-body')
          .getBoundingClientRect();
        return bounds.top >= body.top - 1 && bounds.bottom <= body.bottom + 1;
      })
    )
  ).toBe(true);
  const answerPage = await frame
    .locator('.exam-key-item')
    .first()
    .evaluate((node) => node.closest('.qvc-a4-page').textContent);
  expect(answerPage).toContain('Gabarito do educador');
  expect(answerPage).not.toContain('QUESTAO_');
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(
    await frame.locator('html').evaluate((node) => '<!doctype html>' + node.outerHTML),
    { waitUntil: 'networkidle' }
  );
  const pdf = await pdfPage.pdf({ preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(pages);
  await pdfPage.close();
});

test('Tabela com 100 linhas repete o thead e preserva cada linha uma única vez na prévia', async ({
  page,
}) => {
  await page.goto('/Biblioteca/Atividades/index.html?tipo=caligrafia');
  await page.evaluate(() => {
    const article = document.createElement('article');
    article.id = 'pagination-fixture';
    article.append(window.QVC.createSchoolHeader('Tabela extensa', { school: 'Escola da tabela' }));
    const table = document.createElement('table');
    const heading = table.createTHead().insertRow();
    for (const text of ['Número', 'Atividade']) {
      const th = document.createElement('th');
      th.textContent = text;
      heading.append(th);
    }
    const body = table.createTBody();
    for (let i = 1; i <= 100; i++) {
      const row = body.insertRow();
      row.dataset.row = String(i);
      row.style.height = '14mm';
      row.insertCell().textContent = String(i);
      row.insertCell().textContent = `LINHA_${i}`;
    }
    article.append(table);
    document.body.append(article);
  });
  await page.evaluate(() => window.QVC.preview({ target: '#pagination-fixture' }));
  const frame = page.frames().find((candidate) => candidate.parentFrame());
  const pages = await frame.locator('.qvc-a4-page').count();
  expect(pages).toBeGreaterThan(5);
  await expect(frame.locator('tbody tr')).toHaveCount(100);
  await expect(frame.locator('thead')).toHaveCount(pages);
  expect(
    await frame
      .locator('tbody tr')
      .evaluateAll((rows) => rows.map((row) => Number(row.dataset.row)))
  ).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  for (const item of await geometry(frame)) expect(item.overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('#qvc-preview-summary')).toContainText(`${pages} folhas A4`);
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await expect(page.locator('.qvc-preview-indicator')).toHaveText(`Página 2 de ${pages}`);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator('.qvc-preview-dialog')
      .evaluate((node) => node.getBoundingClientRect().right <= innerWidth)
  ).toBe(true);
  await page.getByRole('button', { name: 'Fechar pré-visualização' }).click();
  await expect(page.locator('.qvc-preview-dialog')).toHaveCount(0);
});

test('Um parágrafo maior que a folha é dividido sem perder texto; desenhos continuam visíveis', async ({
  page,
}) => {
  await page.goto('/Biblioteca/Atividades/index.html?tipo=labirinto');
  await page.evaluate(() => {
    const article = document.createElement('article');
    article.id = 'text-fixture';
    const paragraph = document.createElement('p');
    paragraph.textContent = Array.from({ length: 7000 }, (_, i) => `palavra${i}`).join(' ');
    const first = document.createElement('span');
    first.textContent = 'Antes';
    const last = document.createElement('strong');
    last.textContent = 'depois';
    paragraph.append(' ', first, ' ', last);
    article.append(paragraph);
    document.body.append(article);
  });
  await page.evaluate(() => window.QVC.print({ target: '#text-fixture' }));
  let frame = page.frames().find((candidate) => candidate.parentFrame());
  const text = await frame.locator('.qvc-a4-flow').allTextContents();
  expect(text.join('').trim().split(/\s+/)).toEqual([
    ...Array.from({ length: 7000 }, (_, i) => `palavra${i}`),
    'Antes',
    'depois',
  ]);
  for (const item of await geometry(frame)) expect(item.overflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.QVC.print());
  frame = page.frames().find((candidate) => candidate.parentFrame());
  await expect(frame.locator('.early-drawing')).toBeVisible();
  for (const item of await geometry(frame)) expect(item.overflow).toBeLessThanOrEqual(1);
});
