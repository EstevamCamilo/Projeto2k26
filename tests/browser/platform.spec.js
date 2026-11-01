import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir, readFile } from 'node:fs/promises';
import { tools } from '../../Biblioteca/shared/catalog.js';

test('Hub: busca sem acentos, favoritos, temas e acessibilidade', async ({ page }) => {
  await page.goto('/Biblioteca/index.html');
  await expect(page.locator('#hub-tools .hub-tool-card')).toHaveCount(tools.length);
  await page
    .locator('#featured-tools')
    .getByRole('button', { name: 'Adicionar Caça-palavras aos favoritos' })
    .click();
  await page.getByRole('button', { name: /Meus favoritos/ }).click();
  await expect(page.locator('#hub-tools .hub-tool-card')).toHaveCount(1);
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox', { name: 'Pesquisar ferramentas' }).fill('silabas');
  await expect(page.locator('#hub-tools .hub-tool-card')).toHaveCount(1);
  await expect(page.locator('#hub-tools')).toContainText('Separe as sílabas');
  await page.goto('/Biblioteca/index.html');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Todas as páginas internas têm retorno ao Hub e impressão, sem erro JS', async ({ page }) => {
  const files = await readdir('Biblioteca', { recursive: true });
  const pages = files.filter((path) => path.endsWith('.html') && path !== 'index.html');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const file of pages) {
    await page.goto('/Biblioteca/' + file.split('/').map(encodeURIComponent).join('/'));
    await expect(
      page.locator('.qvc-platform-bar').getByRole('link', { name: 'Voltar ao Hub' })
    ).toBeVisible();
    await expect(
      page.locator('.qvc-platform-bar').getByRole('button', { name: 'Imprimir / Exportar PDF' })
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('Provas: três formatos, pontos, gabarito, edição e JSON', async ({ page }) => {
  await page.goto('/Biblioteca/Gera%20Provas/geraprovas.html');
  await page.getByLabel('Escola / instituição').fill('Escola de teste');
  await page.getByLabel('Turma', { exact: true }).fill('4º A');
  await page.getByLabel('Enunciado', { exact: true }).fill('Quanto é dois mais dois?');
  for (const [i, l] of ['A', 'B', 'C', 'D'].entries())
    await page.getByRole('textbox', { name: 'Alternativa ' + l, exact: true }).fill(String(i + 4));
  await page.locator('#question-submit').click();
  await page.getByLabel('Tipo de questão').selectOption('open');
  await page.getByLabel('Enunciado', { exact: true }).fill('Explique como você pensou.');
  await page.getByLabel('Valor em pontos').fill('2');
  await page.locator('#question-submit').click();
  await page.getByLabel('Tipo de questão').selectOption('truefalse');
  await page.getByLabel('Enunciado', { exact: true }).fill('Avalie as afirmações.');
  const statements = page.locator('#question-statements textarea');
  for (let i = 0; i < (await statements.count()); i++)
    await statements.nth(i).fill(i ? 'O Sol é uma estrela.' : 'Dois mais dois é quatro.');
  await page.locator('#question-submit').click();
  await expect(page.locator('#exam-question-count')).toHaveText('3');
  await expect(page.locator('#exam-total-points')).toContainText('4');
  await page.getByLabel('Incluir gabarito em página separada').check();
  await expect(page.locator('#exam-preview')).toContainText('Gabarito');
  const download = page.waitForEvent('download');
  await page.locator('#exam-export').click();
  const file = await (await download).path();
  const data = JSON.parse(await readFile(file, 'utf8'));
  expect(data.questions.map((q) => q.type)).toEqual(['multiple', 'open', 'truefalse']);
  await page.reload();
  await expect(page.locator('#exam-question-count')).toHaveText('3');
});

test('Horário: cadastros ligados à grade e conflito entre turmas', async ({ page }) => {
  await page.goto('/Biblioteca/HorarioEscolar/index.html');
  await page.getByRole('tab', { name: 'Turmas e cadastros' }).click();
  await page.locator('#teacher-name').fill('Professora de teste');
  await page.locator('#teacher-form').getByRole('button', { name: 'Adicionar professor' }).click();
  await page.locator('#subject-name').fill('Matemática');
  await page.locator('#subject-form').getByRole('button', { name: 'Adicionar disciplina' }).click();
  await page.locator('#class-name').fill('Turma B');
  await page.locator('#class-form').getByRole('button', { name: 'Adicionar turma' }).click();
  await page.getByRole('tab', { name: 'Grade semanal' }).click();
  await page.locator('#lesson-teacher').selectOption({ label: 'Professora de teste' });
  await page.locator('#lesson-subject').selectOption({ label: 'Matemática' });
  await page.locator('#save-lesson').click();
  await expect(page.locator('#schedule-grid')).toContainText('Matemática');
  await page.locator('#lesson-class').selectOption({ label: 'Turma B' });
  await page.locator('#lesson-teacher').selectOption({ label: 'Professora de teste' });
  await page.locator('#lesson-subject').selectOption({ label: 'Matemática' });
  await page.locator('#save-lesson').click();
  await expect(page.locator('#conflicts-list')).toContainText('Professora de teste');
  await page.reload();
  await expect(page.locator('#conflicts-list')).toContainText('Professora de teste');
});

test('Impressão universal preserva cabeçalho e peças de jogos', async ({ page }) => {
  await page.goto('/Biblioteca/Jogos/Jogo%20da%20Velha.html');
  for (const i of [1, 4, 2, 5, 3])
    await page.getByRole('button', { name: `Casa ${i}: vazia`, exact: true }).click();
  await expect(page.locator('#game-status')).toContainText('X venceu');
  await page.evaluate(async () => {
    window.QVC.setSchoolMetadata({
      school: 'Escola de teste',
      student: 'Ana',
      className: '3º A',
      date: '2026-10-31',
    });
    await window.QVC.print();
  });
  const frame = page.frameLocator('#qvc-print-frame');
  await expect(frame.locator('body')).toContainText('Escola de teste');
  await expect(frame.locator('body')).toContainText('Turma: 3º A');
  expect(await frame.locator('.qvc-print-content').innerText()).toContain('X');
  await expect(frame.locator('button,script')).toHaveCount(0);
});

test('Geradores clássicos, atividades infantis e calculadora funcionam', async ({ page }) => {
  for (const path of [
    'Caça-Palavras/cacapalavras.html',
    'EscrevePalavras/EscrevePalavras.html',
    'Separa Silabas/separasilabas.html',
    'LigaPalavras/LigaPalavras.html',
  ]) {
    await page.goto('/Biblioteca/' + path);
    await expect(page.locator('[data-qvc-school-header]')).toBeVisible();
    expect(await page.locator('#conteudo').innerText()).not.toBe('');
  }
  for (const tipo of ['caligrafia', 'labirinto', 'colorir', 'pontos', 'coordenacao']) {
    await page.goto('/Biblioteca/Atividades/index.html?tipo=' + tipo);
    await expect(page.locator('#activity-preview')).not.toBeEmpty();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  await page.goto('/Biblioteca/Calculos/index.html#tool/calculadora');
  await page.locator('#calc-input').fill('2+3*4');
  await page.locator('#calc-input').press('Enter');
  await expect(page.locator('#calc-display')).toHaveText('14');
});

test('PWA abre ferramenta ainda não visitada e calcula sem rede', async ({ page, context }) => {
  await page.goto('/Biblioteca/index.html');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/Biblioteca/Atividades/index.html?tipo=labirinto');
  await expect(page.locator('#activity-preview svg')).toBeVisible();
  await page.goto('/Biblioteca/Calculos/index.html#tool/calculadora');
  await page.locator('#calc-input').fill('2+3*4');
  await page.locator('#calc-input').press('Enter');
  await expect(page.locator('#calc-display')).toHaveText('14');
});
