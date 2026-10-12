import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { open, settle, BASE, closeAll } from './harness.js';

after(closeAll);

const routes = {
	'stu.signs?p_mode=current': 'stu.signs-current',
	'stu.teach_plan': 'stu.teach_plan',
	'stu.timetable?p_cons=y&p_week=19': 'stu.timetable-session',
	'stu.timetable': 'stu.timetable',
	'stu.absence': 'stu.absence',
};

test('Главная: дашборд с рейтингом по дисциплинам', async () => {
	const { window, document, errors } = await open('stu.timetable', { url: BASE + 'stu.timetable#home', routes });
	await settle(window, 150);
	assert.deepEqual(errors, []);
	assert.ok(document.getElementById('etis3-home'), 'дашборд');
	assert.equal(document.querySelectorAll('.hm-dis').length, 5, 'пять дисциплин в рейтинге');
	assert.ok(document.querySelector('[data-session-prep]'), 'кнопка подготовки к сессии');
	assert.match(document.querySelector('[data-session-prep]').textContent, /сесси/i);
});

test('Подготовка к сессии: экзамены из недели сессии, отчётность из плана, калькулятор', async () => {
	const { window, document, errors } = await open('stu.timetable', { url: BASE + 'stu.timetable#session', routes });
	await settle(window, 200);
	assert.deepEqual(errors, []);
	const cards = [...document.querySelectorAll('.sp-card')];
	const byName = n => cards.find(c => c.querySelector('.sp-name').textContent.includes(n));
	assert.equal(cards.length, 6);
	assert.match(byName('Микропроцессорные').querySelector('.sp-when').textContent, /12\s*янв/);
	assert.match(byName('Физика полупроводников').querySelector('.sp-kind').textContent, /Зачёт/);
	assert.match(byName('Электродинамика').textContent, /консультация/);
	// Шкала ПГНИУ: 5 — от 81 балла из 100
	const card = byName('Электродинамика');
	assert.match(card.querySelector('.sp-hint').textContent, /ещё 81 из 100/);
	card.querySelector('[data-target="5"]').click();
	assert.equal(card.querySelector('.sp-proj').textContent, '5');
	const planned = [...card.querySelectorAll('.sp-kt input')].reduce((s, r) => s + +r.value, 0);
	assert.ok(planned >= 81 && planned <= 100, `разложено ${planned} баллов`);
});

test('Wrapped: слайды по оценкам и плану', async () => {
	const { window, document, errors } = await open('stu.timetable', { url: BASE + 'stu.timetable#wrapped', routes });
	await settle(window, 200);
	assert.deepEqual(errors, []);
	const slides = document.querySelectorAll('.wr-slide');
	assert.ok(slides.length >= 6, `слайдов: ${slides.length}`);
	assert.match(document.querySelector('.wr-slides').textContent, /108\s*пар/);
	assert.match(document.querySelector('.wr-slides').textContent, /Разгон|Перфекционист|Спринтер|Феникс|Стабильный|Выживший/);
});

test('Сообщить о проблеме: техническая информация без персональных данных', async () => {
	const opened = [];
	const { window, document, errors } = await open('stu.signs-current', {
		url: BASE + 'stu.signs?p_mode=current&p_stu_id=12345',
		before: w => { w.open = (u) => opened.push(u); },
	});
	assert.deepEqual(errors, []);
	document.querySelector('.tbm-report').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
	const info = document.querySelector('#etis3-report .rp-info').textContent;
	assert.match(info, /Версия: \d+\.\d+\.\d+/);
	assert.match(info, /Страница: stu\.signs\?p_mode=current/);
	assert.doesNotMatch(info, /12345|Студентов|p_stu_id/);
	document.querySelector('#etis3-report .rp-text').value = 'Не видно колонки\nподробности';
	document.querySelector('#etis3-report [data-act="github"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
	assert.equal(opened.length, 1);
	const u = new URL(opened[0]);
	assert.equal(u.pathname, '/sergei20032121-lgtm/etis3.0/issues/new');
	assert.equal(u.searchParams.get('title'), 'Не видно колонки');
	assert.match(u.searchParams.get('body'), /Техническая информация/);
});
