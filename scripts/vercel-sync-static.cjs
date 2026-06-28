/**
 * After Vite writes the admin SPA to dist/admin/, copy marketing static files into dist/
 * so Vercel (outputDirectory: dist) serves both the site and /admin.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const toCopy = [
  'index.html',
  'track',
  'karting',
  'rocket-rally',
  'events',
  'garages',
  'css',
  'js',
  'searched_images',
];

if (!fs.existsSync(path.join(dist, 'admin'))) {
  console.error('vercel-sync-static: expected dist/admin/ from Vite build first');
  process.exit(1);
}

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

for (const name of toCopy) {
  const from = path.join(root, name);
  if (!fs.existsSync(from)) {
    continue;
  }
  const to = path.join(dist, name);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

console.log('vercel-sync-static: copied public assets into dist/');
