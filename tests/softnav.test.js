import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { open, settle, BASE, closeAll } from './harness.js';

after(closeAll);

const routes = {
	'stu.signs?p_mode=current': 'stu.signs-current',
	'stu.teach_plan': 'stu.teach_plan',
	'stu.timetable': 'stu.timetable',
	'stu.absence': 'stu.absence',
};

const iPhone = w => {
	Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
};

function clickLink(document, href) {
	const a = document.createElement('a');
	a.href = href;
	document.querySelector('div.span9').appendChild(a);
	a.click();
}

test('iPhone: переходы без перезагрузки — содержимое подменяется, оформление остаётся', async () => {
	const { window, document, errors } = await open('stu.timetable', { routes, before: iPhone, width: 390 });
	const topbar = document.getElementById('etis3-topbar');
	assert.ok(topbar);
	const intervals = [];
	const origSet = window.setInterval, origClear = window.clearInterval;
	window.setInterval = (fn, ms) => { const id = origSet(fn, ms); intervals.push(id); return id; };
	window.clearInterval = id => { intervals.splice(intervals.indexOf(id), 1); origClear(id); };

	clickLink(document, 'stu.signs?p_mode=current');
	await settle(window, 80);
	assert.deepEqual(errors, []);
	assert.equal(window.location.href, BASE + 'stu.signs?p_mode=current');
	assert.equal(document.getElementById('etis3-topbar'), topbar, 'панель та же — страница не перезагружалась');
	assert.equal(document.querySelectorAll('.sv-card').length, 5, 'оценки оформлены');
	assert.equal(document.querySelectorAll('div.span9').length, 1);
	assert.match(document.querySelector('#etis3-topbar .tb-page').textContent, /оценки/i);

	clickLink(document, 'stu.teach_plan');
	await settle(window, 80);
	assert.equal(document.querySelectorAll('.pv-sem').length, 4, 'план оформлен');

	clickLink(document, 'stu.timetable');
	await settle(window, 80);
	assert.ok(document.querySelector('.ttw'), 'расписание оформлено');
	const afterOne = intervals.length;
	clickLink(document, 'stu.absence');
	await settle(window, 80);
	clickLink(document, 'stu.timetable');
	await settle(window, 80);
	assert.equal(intervals.length, afterOne, 'таймеры прошлой страницы снимаются');

	window.history.back();
	await settle(window, 80);
	assert.equal(window.location.pathname.split('/').pop(), 'stu.absence');
	assert.ok(document.querySelector('.av-list, .etis3-view, .av-summary') || /пропуск/i.test(document.querySelector('div.span9').textContent), 'назад — снова пропуски');
	assert.deepEqual(errors, []);
});

test('iPhone: если выкинуло на вход — обычный переход', async () => {
	const { window, document } = await open('stu.timetable', { routes: { ...routes, 'stu.absence': 'stu.login' }, before: iPhone, width: 390 });
	clickLink(document, 'stu.absence');
	await settle(window, 80);
	// jsdom не умеет настоящую навигацию: важно, что содержимое не подменили страницей входа
	assert.equal(document.querySelector('div.span9 form#form, div.span9 input[type="password"]'), null);
});

test('на компьютере переходы обычные', async () => {
	const { window, document } = await open('stu.timetable', { routes });
	let fetched = 0;
	const f = window.fetch; window.fetch = (...a) => { fetched++; return f(...a); };
	clickLink(document, 'stu.absence');
	await settle(window, 80);
	assert.equal(fetched, 0);
	assert.ok(document.querySelector('.ttw'), 'страница не подменялась');
});
