import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir } from 'node:fs/promises';

test.use({ colorScheme: 'light', serviceWorkers: 'block' });

test('Todas as páginas usam o visual navy, sem controles de alternância', async ({
  page,
  context,
}) => {
  // Old preferences must never change the sole official palette.
  await context.addInitScript(() => {
    localStorage.setItem('qvc-hub-theme', 'light');
    localStorage.setItem('calchub:v1:theme', JSON.stringify('light'));
  });
  const pages = (await readdir('Biblioteca', { recursive: true })).filter((name) =>
    name.endsWith('.html')
  );
  for (const path of pages) {
    await page.goto('/Biblioteca/' + path.split('/').map(encodeURIComponent).join('/'));
    if (path !== 'index.html') await expect(page.locator('.qvc-platform-bar')).toBeVisible();
    else await expect(page.locator('#hub-tools .hub-tool-card').first()).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 28, 39)');
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(234, 242, 248)');
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await expect(page.locator('#theme-toggle,[data-theme],[data-qvc-theme]')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /alternar tema|ativar tema|tema claro|tema escuro/i })
    ).toHaveCount(0);
  }
});

test('Contraste do Hub e controles das ferramentas permanece legível', async ({ page }) => {
  for (const path of [
    'index.html',
    'Gera Provas/geraprovas.html',
    'HorarioEscolar/index.html',
    'Atividades/index.html?tipo=colorir',
    'Jogos/Jogo da Velha.html',
    'Calculos/index.html#tool/calculadora',
    'Tabela Periodica/index.html',
    'TutoriaisCode/Abas Claro.html',
  ]) {
    await page.goto('/Biblioteca/' + path);
    if (path === 'index.html')
      await expect(page.locator('#hub-tools .hub-tool-card').first()).toBeVisible();
    else await expect(page.locator('.qvc-platform-bar')).toBeVisible();
    const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(result.violations, path).toEqual([]);
  }
});

test('Cabeçalho, formulário e documento de impressão preservam cores e valores', async ({
  page,
}) => {
  await page.goto('/Biblioteca/Gera%20Provas/geraprovas.html');
  await page.getByLabel('Escola / instituição').fill('Escola de teste');
  await expect(page.locator('#exam-school')).toHaveCSS('color', 'rgb(234, 242, 248)');
  await expect(page.locator('#exam-school')).toHaveCSS('background-color', 'rgb(20, 36, 49)');
  await page.evaluate(async () => {
    await window.QVC.print();
  });
  const document = page.frameLocator('#qvc-print-frame');
  await expect(document.locator('body')).toContainText('Escola de teste');
  await expect(document.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(document.locator('body')).toHaveCSS('color', 'rgb(23, 43, 58)');
  await expect(document.locator('button,script')).toHaveCount(0);
});
