// Ошибки, найденные при полной проверке 4.13.x, — чтобы не вернулись
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import vm from 'vm';
import { open, settle, BASE, closeAll, fixture } from './harness.js';

after(closeAll);

const routes = {
	'stu.signs?p_mode=current': 'stu.signs-current',
	'stu.teach_plan': 'stu.teach_plan',
	'stu.timetable': 'stu.timetable',
	'stu.absence': 'stu.absence',
};
const signsUrl = BASE + 'stu.signs?p_mode=current';

test('оценка словами («н/я») — не «впереди», а несдано', async () => {
	const mutate = html => html.replace('<span style="border-bottom:1px dashed;"></span>', '<span style="border-bottom:1px dashed;">н/я</span>');
	const base = await open('stu.signs-current', { url: signsUrl });
	const { document, errors } = await open('stu.signs-current', { url: signsUrl, mutate });
	assert.deepEqual(errors, []);
	assert.equal(document.querySelectorAll('.sv-kt--failed').length, base.document.querySelectorAll('.sv-kt--failed').length + 1);
	assert.ok([...document.querySelectorAll('.sv-kt-score b')].some(b => b.textContent === 'н/я'));
});

test('новая КТ в начале списка не делает старые оценки «новыми»', async () => {
	const first = await open('stu.signs-current', { url: signsUrl });
	const seen = first.window.localStorage.getItem('etis3-seen-grades');
	assert.ok(seen);
	// Через 10 дней ЕТИС добавил по КТ в начало каждой дисциплины, оценки не менялись
	const row = '<tr><td>Новая КТ</td><td align="center">практ</td><td align="center">к/р</td><td align="center"></td><td align="center">5</td><td align="center"></td><td align="center">10</td><td align="center"></td><td></td></tr>';
	const mutate = html => html.replace(/(<th>максимальный<\/th><\/tr>)/g, '$1' + row);
	const later = new Date(Date.now() + 10 * 864e5).toISOString();
	const { document, errors } = await open('stu.signs-current', { url: signsUrl, mutate, now: later, storage: { 'etis3-seen-grades': seen } });
	assert.deepEqual(errors, []);
	assert.equal(document.querySelectorAll('.kt-new-badge').length, 0);
});

test('обновление: оценки, запомненные старым ключом (до 4.13.3), не подсвечиваются', async () => {
	// Старый формат: дисциплина|номер строки|тема — строим его прямо из фикстуры
	const { JSDOM } = await import('jsdom');
	const doc = new JSDOM(fixture('stu.signs-current')).window.document;
	const legacy = {};
	let graded = 0;
	doc.querySelectorAll('table.common').forEach(table => {
		let h = table.previousElementSibling;
		while (h && h.tagName !== 'H3') h = h.previousElementSibling;
		const dkey = h.textContent.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
		legacy['#' + dkey] = 1;
		[...table.querySelectorAll('tr')].filter(tr => !tr.querySelector('th') && !/^(итого|всего)/i.test(tr.cells[0]?.textContent.trim()))
			.forEach((tr, i) => {
				const g = tr.cells[3]?.textContent.trim();
				if (!/^\d+([.,]\d+)?$/.test(g || '')) return;
				const topic = tr.cells[0].textContent.replace(/\s+/g, ' ').trim();
				legacy[`${dkey}|${i}|${topic.slice(0, 60)}`] = { g: parseFloat(g.replace(',', '.')), t: 0 };
				graded++;
			});
	});
	assert.ok(graded > 0, 'в фикстуре есть оценки');
	const { document, errors } = await open('stu.signs-current', { url: signsUrl, storage: { 'etis3-seen-grades': JSON.stringify(legacy) } });
	assert.deepEqual(errors, []);
	assert.equal(document.querySelectorAll('.kt-new-badge').length, 0);
});

test('Главная в воскресенье: не «расписание не загружено»', async () => {
	const { document, errors } = await open('stu.timetable', { url: BASE + 'stu.timetable#home', routes, now: '2026-10-11T12:00:00+05:00' });
	await settle(document.defaultView, 100);
	assert.deepEqual(errors, []);
	const summary = document.querySelector('.hm-summary')?.textContent || '';
	assert.doesNotMatch(summary, /не загружено/);
	assert.match(summary, /выходной/i);
});

test('подгруппы: у второй пары в ячейке свой преподаватель', async () => {
	const mutate = html => html.replace(/(<td class="pair_info">\n)(<div><span class="teacher">[\s\S]*?)(\n<\/td>)/, (m, a, box, c) =>
		a + box + '\n' + box.replace(/Преподаватель П\. П\./g, 'Второй В. В.') + c);
	const { document, errors } = await open('stu.timetable', { mutate, routes, now: '2026-10-06T09:00:00+05:00' });
	assert.deepEqual(errors, []);
	const text = document.querySelector('.ttv')?.textContent || '';
	assert.match(text, /Второй В\. В\./);
	assert.match(text, /Преподаватель П\. П\./);
});

// ---------- Фоновая проверка расширения ----------
function loadBackground(pages) {
	const store = {}, notes = [], listeners = {};
	const ev = name => ({ addListener: fn => { listeners[name] = fn; } });
	const chrome = {
		storage: { local: { get: async k => ({ [k]: store[k] }), set: async o => Object.assign(store, o) }, onChanged: ev('storage') },
		action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setBadgeTextColor: async () => {}, setTitle: async () => {} },
		notifications: { create: (id, o) => notes.push(o), onClicked: ev('click'), clear() {} },
		alarms: { clear: async () => {}, create() {}, onAlarm: ev('alarm') },
		runtime: { onInstalled: ev('installed'), onStartup: ev('startup'), onMessage: ev('message') },
		tabs: { create() {} },
	};
	const fetch = async url => {
		const key = url.split('/').pop();
		return new Response(pages[key] ?? '', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
	};
	const ctx = vm.createContext({ chrome, fetch, TextDecoder, Response, console, setTimeout, Promise, Object, Math, Date, JSON, String });
	vm.runInContext(fs.readFileSync(new URL('../background.js', import.meta.url), 'utf8'), ctx);
	return { ctx, store, notes, listeners };
}

const gradesPage = g => `<h3>Физика</h3><table><tr><td class="x" data-url="stu.get_ccr_log?p_ctl_id=7&amp;x">${g}</td></tr></table>`;

test('фон: открыл сообщения — новая оценка всё равно приходит', async () => {
	const pages = { 'stu.signs?p_mode=current': gradesPage(''), 'stu.teacher_notes': '', 'stu_ann.announces': '' };
	const bg = loadBackground(pages);
	await bg.ctx.check();
	pages['stu.signs?p_mode=current'] = gradesPage('5');
	bg.listeners.message({ type: 'etis3-seen', kinds: ['notes'] }, {}, () => {});
	await new Promise(r => setTimeout(r, 50)); // проверка после «просмотрено» успевает пройти
	await bg.ctx.check();
	assert.equal(bg.notes.length, 1, 'уведомление об оценке');
	assert.match(bg.notes[0].message, /Физика: 5/);
	assert.equal(bg.store['etis3-bg'].unseen.grades, 1);
});

test('фон: пустая страница оценок (техработы) не затирает снимок', async () => {
	const pages = { 'stu.signs?p_mode=current': gradesPage('5'), 'stu.teacher_notes': '', 'stu_ann.announces': '' };
	const bg = loadBackground(pages);
	await bg.ctx.check();
	pages['stu.signs?p_mode=current'] = '<p>Ведутся технические работы</p>';
	await bg.ctx.check();
	pages['stu.signs?p_mode=current'] = gradesPage('5');
	await bg.ctx.check();
	assert.equal(bg.notes.length, 0, 'знакомая оценка не приходит повторно');
});
