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
