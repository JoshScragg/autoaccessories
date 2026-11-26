// Serves _site/ the way GitHub Pages does, for the tests:
// - works at "/" and under the site's sub-path (e.g. /autoaccessories/)
// - unknown URLs get 404.html with a 404 status
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('../_site/', import.meta.url).pathname;
const site = JSON.parse(await readFile(new URL('../src/_data/site.json', import.meta.url), 'utf8'));
const PREFIX = new URL(site.url).pathname.replace(/\/$/, ''); // "" or "/repo"
const PORT = Number(process.argv[2] || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (PREFIX && (path === PREFIX || path.startsWith(PREFIX + '/'))) path = path.slice(PREFIX.length) || '/';
  if (path.endsWith('/')) path += 'index.html';
  const file = join(ROOT, normalize(path));
  try {
    if (!file.startsWith(ROOT)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(await readFile(join(ROOT, '404.html')));
  }
}).listen(PORT, () => console.log(`Serving _site at http://localhost:${PORT}${PREFIX}/`));
