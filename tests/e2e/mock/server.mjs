import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import config from '../../../postcss.config.mjs';

const require = createRequire(import.meta.url);
const bundle = await build({
  entryPoints: ['tests/e2e/mock/editor.tsx'],
  bundle: true,
  write: false,
  outfile: "/tmp/ree-fixture/editor.js",
  metafile: true,
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
  alias: { ...Object.fromEntries(['post', 'task', 'vote', 'guest', 'member'].map(name => [`@/lib/actions/${name}/action`, './tests/e2e/mock/actions.ts'])), 'next/dynamic': './tests/e2e/mock/dynamic.tsx' },
});
assert(!Object.keys(bundle.metafile.inputs).some(path =>
  /(?:lib\/(?:db|utils\/supabase)|@supabase|@libsql|ably)[/\\]/.test(path),
), 'The mock editor must not include live service clients');
const css = process.env.E2E_PRODUCTION_CSS
  ? { css: await readFile(process.env.E2E_PRODUCTION_CSS, 'utf8') }
  : await postcss(Object.entries(config.plugins).map(
  ([name, options]) => require(name)(options),
)).process(await readFile('app/globals.css', 'utf8'), { from: 'app/globals.css' });

const assets = new Map([
  ['/editor.js', ['text/javascript', bundle.outputFiles.find(file => file.path.endsWith(".js")).text]],
  ['/editor.css', ['text/css', css.css + bundle.outputFiles.filter(file => file.path.endsWith('.css')).map(file => file.text).join('\n')]],
  ['/board/mock', ['text/html', '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mock post editor</title><link rel="stylesheet" href="/editor.css"><body><div id="root"></div><script src="/editor.js"></script></body></html>']],
]);

// Test assets only. Service requests must be handled explicitly by Playwright.
createServer((request, response) => {
  const asset = assets.get(new URL(request.url, 'http://127.0.0.1').pathname);
  if (!asset || request.method !== 'GET') {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': asset[0] }).end(asset[1]);
}).listen(3100, '127.0.0.1');
