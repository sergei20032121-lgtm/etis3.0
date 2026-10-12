import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { open, BASE, closeAll } from './harness.js';

after(closeAll);

test('расписание: дни, пары, навигация по неделям', async () => {
	const { document, errors } = await open('stu.timetable');
	assert.deepEqual(errors, []);
	assert.ok(document.getElementById('etis3-topbar'), 'верхняя панель');
	const nav = document.querySelector('.ttw');
	assert.ok(nav, 'навигация недели');
	assert.match(nav.textContent, /6 неделя/);
	assert.ok(nav.querySelector('.ttw-share'), 'кнопка «неделя картинкой»');
	// 8 пар в неделе фикстуры
	assert.equal(document.querySelectorAll('.etis3-week-grid .wg-pair, .etis3-week-grid [class*="pair"]').length > 0, true);
});

test('оценки в семестре: карточки дисциплин и КТ', async () => {
	const { document, errors } = await open('stu.signs-current', { url: BASE + 'stu.signs?p_mode=current' });
	assert.deepEqual(errors, []);
	const cards = document.querySelectorAll('.sv-card');
	assert.equal(cards.length, 5, 'пять дисциплин');
	assert.equal(document.querySelectorAll('.sv-kt').length, 20, 'двадцать контрольных точек');
	assert.equal(document.querySelectorAll('.sv-kt--failed').length, 2, 'две несданные КТ');
});

test('оценки за сессии: семестры и средний балл', async () => {
	const { document, errors } = await open('stu.signs-session', { url: BASE + 'stu.signs?p_mode=session' });
	assert.deepEqual(errors, []);
	assert.ok(document.querySelector('.ssv-summary'), 'сводка сессий');
});

test('учебный план: семестры карточками', async () => {
	const { document, errors } = await open('stu.teach_plan');
	assert.deepEqual(errors, []);
	const sems = document.querySelectorAll('.pv-sem');
	assert.equal(sems.length, 4, 'четыре семестра');
	assert.match(sems[0].querySelector('.pv-stats').textContent, /6\s*дисциплин/);
	assert.match(sems[0].textContent, /Экзамен/);
});

test('пропуски: счётчик и список', async () => {
	const { document, errors } = await open('stu.absence');
	assert.deepEqual(errors, []);
	assert.equal(document.querySelector('.av-big')?.textContent, '3');
	assert.equal(document.querySelectorAll('.av-item').length, 2, 'две строки: одна дисциплина пропущена дважды');
});

for (const page of ['stu.login', 'stu.login-v2']) {
	test(`вход (${page}): форма перерисована, поля на месте`, async () => {
		const { document, errors } = await open(page, { url: BASE + 'stu.login' });
		assert.deepEqual(errors, []);
		assert.ok(document.documentElement.classList.contains('etis3-login-page'));
		const form = document.getElementById('form');
		assert.ok(form.querySelector('input[name="p_username"]') && form.querySelector('input[name="p_password"]'));
		assert.ok(form.querySelector('.login-actions #sbmt'), 'кнопка входа в блоке действий');
	});
}

test('вход в приложении: кнопка отпечатка и передача логина', async () => {
	const calls = [];
	const { window, document, errors } = await open('stu.login-v2', {
		url: BASE + 'stu.login',
		before: w => { w.ETIS3Native = { loginSubmitted: (u, p) => calls.push(['submit', u, p]), hasSavedLogin: () => true, biometricLogin: () => calls.push(['bio']), forgetLogin: () => calls.push(['forget']) }; },
	});
	assert.deepEqual(errors, []);
	const bio = document.querySelector('.login-bio');
	assert.ok(bio, 'кнопка «Войти по отпечатку»');
	bio.click();
	document.querySelector('input[name="p_username"]').value = 'Тестов';
	document.querySelector('input[name="p_password"]').value = 'secret';
	document.getElementById('sbmt').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
	assert.deepEqual(calls, [['bio'], ['submit', 'Тестов', 'secret']]);
});

test('без приложения кнопки отпечатка нет', async () => {
	const { document } = await open('stu.login-v2', { url: BASE + 'stu.login' });
	assert.equal(document.querySelector('.login-bio'), null);
});
