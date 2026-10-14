// Запуск собранного userscript (dist/etis3.user.js) на обезличенных страницах ЕТИС в jsdom.
import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const BASE = 'https://student.psu.ru/pls/stu_cus_et/';
const SCRIPT = fs.readFileSync(path.join(ROOT, 'dist/etis3.user.js'), 'utf8');

export function fixture(name) {
	return fs.readFileSync(path.join(ROOT, 'tests/fixtures', name + '.html'), 'utf8');
}

/**
 * Открывает страницу page (имя фикстуры) по адресу url, запускает скрипт.
 * routes: { 'stu.signs?p_mode=current': 'stu.signs-current', ... } — ответы на fetch() скрипта.
 */
const opened = [];
/** Закрыть все окна — иначе таймеры страницы (часы, небо) не дают процессу завершиться. */
export function closeAll() { opened.splice(0).forEach(w => w.close()); }

export async function open(name, { url, routes = {}, width = 1280, storage = {}, before, mutate, now } = {}) {
	const errors = [];
	const vc = new VirtualConsole();
	vc.on('jsdomError', e => errors.push(e.message));
	const dom = new JSDOM(mutate ? mutate(fixture(name)) : fixture(name), { url: url || BASE + name.replace(/-.*$/, ''), runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
	const w = dom.window;
	opened.push(w);
	// Подменённое «сейчас»: время идёт, но от заданной точки
	if (now) {
		const RealDate = w.Date, shift = new RealDate(now).getTime() - RealDate.now();
		w.Date = class extends RealDate {
			constructor(...a) { super(...(a.length ? a : [RealDate.now() + shift])); }
			static now() { return RealDate.now() + shift; }
		};
	}
	// Чего нет в jsdom
	w.matchMedia = q => ({ matches: /max-width:\s*(\d+)/.test(q) ? width <= +q.match(/max-width:\s*(\d+)/)[1] : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
	w.HTMLCanvasElement.prototype.getContext = () => null;
	w.scrollTo = () => {};
	w.TextDecoder = TextDecoder;
	w.Element.prototype.scrollIntoView = () => {};
	w.fetch = async input => {
		const u = new URL(String(input), w.location.href);
		const key = u.pathname.split('/').pop() + u.search;
		const fx = routes[key] ?? routes[u.pathname.split('/').pop()];
		if (!fx) return new Response('', { status: 404 });
		return new Response(fixture(fx), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
	};
	Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
	w.localStorage.setItem('etis3-us:etis3-version-seen', '"99.0.0"');
	if (before) before(w);
	w.eval(SCRIPT);
	await settle(w);
	return { window: w, document: w.document, errors };
}

export async function settle(w, ms = 60) {
	for (let i = 0; i < 6; i++) await new Promise(r => w.setTimeout(r, ms));
}
