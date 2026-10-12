// Склеивает модули src/*.js (по порядку имён) в scripts.js — его подключает расширение.
// Один файл, а не набор content-скриптов: так объявления функций «поднимаются» по всему коду, как раньше.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(ROOT, 'src');
const files = fs.readdirSync(dir).filter(f => /^\d+-.*\.js$/.test(f)).sort();
const banner = '/* Файл собран из src/*.js командой `npm run build` — правьте модули в src/ */\n';
const out = banner + files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
fs.writeFileSync(path.join(ROOT, 'scripts.js'), out);
console.log(`scripts.js — ${files.length} модулей, ${Math.round(out.length / 1024)} КБ`);
