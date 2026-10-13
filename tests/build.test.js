import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = fs.readFileSync(path.join(ROOT, 'dist/etis3.user.js'), 'utf8');

// Эвристика Stay: любое «нестандартное» window.xxx → режим «page» → скрипт подключается поздно,
// и на iPhone мелькает старый ЕТИС. В сборке не должно быть ни одного window.
test('userscript: нет window.* — Stay подключает его ранним режимом «content»', () => {
	const hits = dist.match(/window\.[a-z|A-z|(|)]*/g) || [];
	assert.deepEqual(hits, []);
	assert.match(dist, /^\/\/ @inject-into\s+content$/m);
	assert.match(dist, /^\/\/ @run-at\s+document-start$/m);
});

test('userscript: никаких внешних запросов к Google Fonts', () => {
	assert.doesNotMatch(dist, /fonts\.googleapis|fonts\.gstatic/);
});
