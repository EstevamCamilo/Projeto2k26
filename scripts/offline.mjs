import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
const files = [];
async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'tests', 'Projeto2k26'].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path);
    else if (
      /\.(html|css|js|mjs|svg|webmanifest)$/.test(item.name) &&
      !/(?:\.test\.mjs|sw\.js|offline-files\.js)$/.test(item.name)
    )
      files.push(path);
  }
}
await walk('Biblioteca');
files.push('Biblioteca/shared/app-icon-192.png', 'Biblioteca/shared/app-icon-512.png');
files.sort();
const hash = createHash('sha256');
for (const path of files) hash.update(await readFile(path));
const urls = files.map(
  (path) => './' + relative('Biblioteca', path).split('/').map(encodeURIComponent).join('/')
);
await writeFile(
  'Biblioteca/shared/offline-files.js',
  `self.QVC_CACHE_VERSION=${JSON.stringify(hash.digest('hex').slice(0, 12))};\nself.QVC_OFFLINE_FILES=${JSON.stringify(urls, null, 2)};\n`
);
console.log(`Offline: ${files.length} arquivos essenciais, sem imagens grandes do acervo.`);
