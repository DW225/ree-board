import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import references from './visual-baseline.json' with { type: 'json' };

const directory = new URL('./tailwind-v4.spec.ts-snapshots/', import.meta.url);
const checksum = data => createHash('sha256').update(data).digest('hex');
const signal = AbortSignal.timeout(120_000);
await mkdir(directory, { recursive: true });
for (const { name, url, sha256 } of references) {
  const file = new URL(name, directory);
  const cached = await readFile(file).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (cached && checksum(cached) === sha256) continue;
  const response = await fetch(url, { signal });
  assert(response.ok, `Download failed for ${name}: ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  assert.equal(checksum(data), sha256, `Invalid reference checksum: ${name}`);
  await writeFile(file, data);
}
console.log(`Verified ${references.length} original visual references.`);
