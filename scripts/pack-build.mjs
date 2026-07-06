// Packs the CRA `build/` output into a single flat archive (build-sea/app.pack)
// that gets embedded into the single-executable as a SEA asset.
// Format: repeated [uint32LE pathLen][path utf8][uint32LE contentLen][content].
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const BUILD = join(ROOT, 'build');
const OUT_DIR = join(ROOT, 'build-sea');
const OUT = join(OUT_DIR, 'app.pack');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

let files;
try {
  files = walk(BUILD);
} catch {
  console.error('[pack-build] No build/ directory — run `npm run build` first.');
  process.exit(1);
}
if (!files.length) {
  console.error('[pack-build] build/ is empty — run `npm run build` first.');
  process.exit(1);
}

const chunks = [];
for (const full of files) {
  const webPath = '/' + relative(BUILD, full).split(sep).join('/');
  const pathBuf = Buffer.from(webPath, 'utf8');
  const content = readFileSync(full);
  const lenPath = Buffer.alloc(4); lenPath.writeUInt32LE(pathBuf.length, 0);
  const lenBody = Buffer.alloc(4); lenBody.writeUInt32LE(content.length, 0);
  chunks.push(lenPath, pathBuf, lenBody, content);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, Buffer.concat(chunks));
console.log(`[pack-build] packed ${files.length} files → ${relative(ROOT, OUT)} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
