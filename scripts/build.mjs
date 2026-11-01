import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['Biblioteca', 'index.html']) {
  await cp(file, resolve('dist', file), {
    recursive: true,
    filter: (source) =>
      !source
        .split(/[\\/]/)
        .some((part) => ['.git', 'node_modules', 'tests', 'Projeto2k26'].includes(part)),
  });
}
const info = await stat('dist/Biblioteca/index.html');
if (!info.size) throw new Error('O Hub não foi gerado.');
console.log(
  'Build estático pronto em dist/. Nenhuma dependência externa é necessária para o uso normal.'
);
