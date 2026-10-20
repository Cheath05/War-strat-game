// Scans the simulation package for APIs that can give different answers on different
// computers or browsers. Every player's computer runs the same battle (lockstep), so the
// sim may only use exactly-reproducible maths. See docs/architecture.md.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SIM_SRC = join(ROOT, 'packages/sim/src');

const BANNED = [
  [/\bMath\.(random|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|log|log1p|log2|log10|pow|hypot|cbrt|fround|clz32)\b/, 'non-exact Math function (use packages/sim/src/math)'],
  [/\*\*/, 'the ** operator (use x * x)'],
  [/\bDate\b/, 'Date (time differs per computer)'],
  [/\bperformance\b/, 'performance (time differs per computer)'],
  [/\b(setTimeout|setInterval|requestAnimationFrame)\b/, 'timers (the sim advances only by ticks)'],
  [/\bcrypto\b/, 'crypto randomness (use world RNG)'],
  [/\bIntl\b|\btoLocale\w*\(/, 'locale-dependent formatting'],
  [/\bFloat32Array\b/, 'Float32Array (use plain numbers in sim state)'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function stripComments(src) {
  // Replace comments with spaces, keeping line breaks so line numbers stay right.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => m[0] + ' '.repeat(m.length - 2) + m[0]);
}

const problems = [];
for (const file of walk(SIM_SRC)) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const [re, why] of BANNED) {
      if (re.test(line)) problems.push(`${relative(ROOT, file)}:${i + 1}  ${why}\n    ${line.trim()}`);
    }
  });
}

if (problems.length) {
  console.error(`Determinism check failed (${problems.length}):\n` + problems.join('\n'));
  process.exit(1);
}
console.log('Determinism check passed: the sim uses only exact maths.');
