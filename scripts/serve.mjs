import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

export function resolveRequest(root, request) {
  let path;
  try {
    path = decodeURIComponent(new URL(request, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (
    path.includes('\0') ||
    path.split(/[\\/]/).some((part) => part.startsWith('.') || part === 'node_modules')
  )
    return null;
  const file = resolve(root, '.' + path);
  return file === root || file.startsWith(root + sep) ? file : null;
}
const rootFlag = process.argv.indexOf('--root');
const root = resolve(rootFlag < 0 ? '.' : process.argv[rootFlag + 1]);
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag < 0 ? process.env.PORT || 5173 : process.argv[portFlag + 1]);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
};
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const server = http.createServer(async (request, response) => {
    let file = resolveRequest(root, request.url || '/');
    if (!file) {
      response.writeHead(403);
      response.end('Acesso negado.');
      return;
    }
    try {
      const info = await stat(file);
      if (info.isDirectory()) file = resolve(file, 'index.html');
      const bytes = await readFile(file);
      response.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Arquivo não encontrado.');
    }
  });
  server.listen(port, '0.0.0.0', () => console.log(`QVC: http://localhost:${port} · ${root}`));
  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
}
