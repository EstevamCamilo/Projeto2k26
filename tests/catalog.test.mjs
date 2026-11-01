import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools, searchTools } from '../Biblioteca/shared/catalog.js';
import { resolveRequest } from '../scripts/serve.mjs';
import { linearSystem } from '../Biblioteca/Calculos/js/calculations.js';
test('catálogo tem IDs únicos e todos os destinos existem', () => {
  assert.equal(new Set(tools.map((t) => t.id)).size, tools.length);
  for (const tool of tools)
    assert.ok(
      existsSync(resolve('Biblioteca', decodeURIComponent(tool.path.split(/[?#]/)[0]))),
      tool.path
    );
});
test('busca normaliza acentos e múltiplos termos e respeita categorias', () => {
  assert.ok(searchTools('silabas').some((t) => t.id === 'separa-silabas'));
  assert.equal(searchTools('montar inexistente').length, 0);
  assert.ok(searchTools('', 'Professores').every((t) => t.category === 'Professores'));
});
test('servidor rejeita caminhos privados e resolve arquivos públicos', () => {
  assert.equal(resolveRequest('/workspace/Projeto2k26', '/.git/config'), null);
  assert.equal(resolveRequest('/workspace/Projeto2k26', '/.env'), null);
  assert.equal(resolveRequest('/workspace/Projeto2k26', '/node_modules/dep.js'), null);
  assert.equal(
    resolveRequest('/workspace/Projeto2k26', '/Biblioteca/index.html'),
    '/workspace/Projeto2k26/Biblioteca/index.html'
  );
});
test('sistema com 0x + 0y = 1 é impossível', () => {
  assert.equal(linearSystem(0, 0, 1, 0, 0, 1).kind, 'none');
  assert.equal(linearSystem(0, 0, 0, 0, 0, 0).kind, 'infinite');
});
