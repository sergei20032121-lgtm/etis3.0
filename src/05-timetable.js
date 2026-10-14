// ============================================================
// РАСПИСАНИЕ
// ============================================================

const PAIR_TYPES = [
	{ re: /^лек/,   icon: 'menu_book',     label: 'Лекция',       cls: 'pair-type--lec'  },
	{ re: /^лаб/,   icon: 'science',       label: 'Лаб. работа',  cls: 'pair-type--lab'  },
	{ re: /^практ/, icon: 'edit',          label: 'Практика',     cls: 'pair-type--prac' },
	{ re: /^сем/,   icon: 'groups',        label: 'Семинар',      cls: 'pair-type--sem'  },
	{ re: /^конс/,  icon: 'support_agent', label: 'Консультация', cls: 'pair-type--cons' },
];

// Тип пары берём только из скобок в конце названия: «Матан (лек.)»,
// иначе «Диалектика» или «Семантика» распознаются как лекция/семинар
function parsePairType(text) {
	const m = (text || '').match(/\s*\(([^()]*)\)\s*$/);
	if (!m) return null;
	const type = PAIR_TYPES.find(t => t.re.test(m[1].trim().toLowerCase()));
	if (!type) return null;
	return { ...type, name: text.slice(0, m.index).trim(), raw: m[0].trim() };
}

const MONTH_RES = [/^январ/, /^феврал/, /^март/, /^апрел/, /^ма[йя]/, /^июн/, /^июл/, /^август/, /^сентябр/, /^октябр/, /^ноябр/, /^декабр/];

// Заголовок дня → сегодня ли это. Понимает «06.10», «6 октября» и просто число.
function isTodayTitle(text) {
	const now = etisNow();
	const d = now.getDate(), m = now.getMonth() + 1;
	const t = (text || '').toLowerCase();
	const numeric = t.match(/(\d{1,2})\.(\d{1,2})/);
	if (numeric) return +numeric[1] === d && +numeric[2] === m;
	const worded = t.match(/(\d{1,2})\s+([а-яё]+)/);
	if (worded) {
		const mi = MONTH_RES.findIndex(re => re.test(worded[2]));
		return +worded[1] === d && (mi < 0 || mi + 1 === m);
	}
	return new RegExp(`(^|\\D)0?${d}(\\D|$)`).test(t);
}

// Ячейка номера пары в ЕТИСе: «1 пара<br><font class="eval">8:00</font>»
function readPairNum(row) {
	const cell = row.querySelector('.pair_num');
	if (!cell) return NaN;
	const m = cell.textContent.match(/(\d+)\s*пар/i);
	return m ? parseInt(m[1], 10) : NaN;
}

// Время начала пар берём из самой таблицы — у разных корпусов/лет оно может отличаться
function learnPairTimes(span9) {
	span9.querySelectorAll('div.day tr').forEach(row => {
		const num  = readPairNum(row);
		const time = row.querySelector('.pair_num .eval')?.textContent.match(/(\d{1,2})[:.](\d{2})/);
		if (isNaN(num) || !time) return;
		const start = +time[1] * 60 + +time[2];
		const end   = start + PAIR_LENGTH_MIN;
		const slot  = { num, start: [Math.floor(start / 60), start % 60], end: [Math.floor(end / 60), end % 60] };
		const i = PAIR_SCHEDULE.findIndex(p => p.num === num);
		if (i >= 0) PAIR_SCHEDULE[i] = slot;
		else PAIR_SCHEDULE.push(slot);
	});
	PAIR_SCHEDULE.sort((a, b) => a.num - b.num);
}

function findTodayBlock(span9) {
	return [...span9.querySelectorAll('div.day')].find(day => isTodayTitle(day.querySelector('h3')?.textContent)) || null;
}

function readPairs(dayEl) {
	const pairs = {};
	if (!dayEl) return pairs;
	dayEl.querySelectorAll('table tbody tr').forEach(row => {
		const num = readPairNum(row);
		const dis = row.querySelector('.pair_info .dis a');
		if (isNaN(num) || !dis) return;
		pairs[num] = {
			row,
			name: dis.dataset.name || dis.textContent.trim(),
			aud:  row.querySelector('.pair_info .aud')?.textContent.trim() || '',
		};
	});
	return pairs;
}

// Виджет следующей/текущей пары
function buildNextPairWidget(pairs) {
	const currentNum = getCurrentPairNum();
	const now        = nowMinutes();
	const widget     = createEl('div', { className: 'next-pair-widget' });
	const upcoming   = PAIR_SCHEDULE.find(p => p.start[0] * 60 + p.start[1] > now && pairs[p.num]);

	const audHtml = info => info.aud
		? `<div class="npw-aud"><span class="material-icons">room</span>${escapeHtml(info.aud)}</div>` : '';

	if (currentNum && pairs[currentNum]) {
		const p        = PAIR_SCHEDULE.find(x => x.num === currentNum);
		const info     = pairs[currentNum];
		const minsLeft = (p.end[0] * 60 + p.end[1]) - now;
		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">play_circle</span>
				<span>Сейчас идёт · пара ${currentNum}</span>
				<span class="npw-time-badge">до ${formatTime(p.end[0], p.end[1])} · ещё ${formatDuration(minsLeft)}</span>
			</div>
			<div class="npw-name">${escapeHtml(info.name)}</div>
			${audHtml(info)}
			<div class="npw-progress-bar"><div class="npw-progress-fill" style="width:${pairProgress()}%"></div></div>
		`;
		widget.classList.add('npw--active');
		paintDiscipline(widget, info.name);
	} else if (upcoming) {
		const info  = pairs[upcoming.num];
		const until = upcoming.start[0] * 60 + upcoming.start[1] - now;
		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">schedule</span>
				<span>Следующая пара · ${upcoming.num}</span>
				<span class="npw-time-badge">в ${formatTime(upcoming.start[0], upcoming.start[1])} · через ${formatDuration(until)}</span>
			</div>
			<div class="npw-name">${escapeHtml(info.name)}</div>
			${audHtml(info)}
		`;
		widget.classList.add('npw--next');
		paintDiscipline(widget, info.name);
	} else {
		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">check_circle</span>
				<span>${Object.keys(pairs).length ? 'На сегодня пар больше нет' : 'Сегодня пар нет'}</span>
			</div>
		`;
		widget.classList.add('npw--done');
	}

	return widget;
}

// Подсветка текущей пары — только в блоке сегодняшнего дня
function highlightCurrentPair(span9, pairs) {
	span9.querySelectorAll('tr.pair-row--active').forEach(row => row.classList.remove('pair-row--active'));
	span9.querySelectorAll('.pair-progress-bar').forEach(bar => bar.remove());

	const current = pairs[getCurrentPairNum()];
	if (!current) return;
	current.row.classList.add('pair-row--active');
	const bar  = createEl('div', { className: 'pair-progress-bar' });
	const fill = createEl('div', { className: 'pair-progress-fill' });
	fill.style.height = pairProgress() + '%';
	bar.appendChild(fill);
	current.row.querySelector('.pair_num')?.appendChild(bar);
}

function stylePage_timetable(span9) {
	if (!span9) return;
	learnPairTimes(span9);

	// Панель кнопок
	const buttonbar = createEl('div', { className: 'timetable-buttonbar' });
	span9.prepend(buttonbar);

	// Блок «Консультации…» с кнопкой «Показать»
	const consultDiv = [...span9.children].find(el => el.tagName === 'DIV' && el.querySelector('#tb_show'));
	if (consultDiv) { consultDiv.className = 'timetable-btn consultations'; buttonbar.appendChild(consultDiv); }

	const feedbackBtn = span9.querySelector('a.estimate_tt');
	if (feedbackBtn) { feedbackBtn.className = 'timetable-btn icon-button icon-feedback'; feedbackBtn.text = 'Оставить отзыв'; buttonbar.appendChild(feedbackBtn); }

	const todayBtn = [...span9.children].find(el => el.tagName === 'A' && /сегодн/i.test(el.textContent));
	if (todayBtn) { todayBtn.className = 'timetable-btn icon-button icon-today'; buttonbar.appendChild(todayBtn); }

	const copyBtn = createEl('a', { className: 'timetable-btn icon-button icon-copy', textContent: 'Скопировать' });
	copyBtn.style.cursor = 'pointer';
	copyBtn.addEventListener('click', () => copyTimetable(span9));
	buttonbar.appendChild(copyBtn);

	const icsBtn = createEl('a', { className: 'timetable-btn icon-button icon-event', textContent: 'В календарь', title: 'Скачать неделю в формате .ics для Google / Apple / Outlook' });
	icsBtn.style.cursor = 'pointer';
	icsBtn.addEventListener('click', () => exportTimetableIcs(span9));
	buttonbar.appendChild(icsBtn);

	span9.querySelectorAll('div.day > table > tbody > tr').forEach(row => {
		// Перенос преподавателя. У подгрупп в одной ячейке несколько пар — у каждой свой преподаватель
		const teachers = [...row.querySelectorAll('span.teacher')];
		row.querySelectorAll('.pair_info > div').forEach(box => {
			const t = box.querySelector('span.teacher');
			if (t) box.dataset.teacher = t.textContent.replace(/\s+/g, ' ').trim();
		});
		if (teachers.length) {
			const td = createEl('td', { className: 'pair_teacher', innerHTML: teachers.map(t => t.innerHTML).join('<br>') });
			row.appendChild(td);
			row.querySelector('td.pair_jour')?.remove();
			teachers.forEach(t => t.remove());
		}

		// Тип пары — чип. Исходный текст «(лек.)» оставляем скрытым:
		// он виден при выключенных иконках и попадает в копирование.
		const disLink = row.querySelector('.pair_info .dis a');
		const type    = disLink && parsePairType(disLink.textContent);
		if (disLink) paintDiscipline(row, type ? type.name : disLink.textContent);
		if (type) {
			disLink.dataset.name = type.name;
			disLink.textContent  = type.name + ' ';
			disLink.appendChild(createEl('span', { className: 'pair-type-raw', textContent: type.raw }));

			const chip = createEl('span', { className: `pair-type-chip ${type.cls}`, title: type.label });
			chip.appendChild(createEl('span', { className: 'material-icons', textContent: type.icon }));
			chip.appendChild(createEl('span', { textContent: type.label }));
			row.querySelector('.pair_info')?.appendChild(chip);
		}
	});

	// Пустые слоты: до первой пары дня прячем, «окна» между парами делаем компактными
	span9.querySelectorAll('div.day').forEach(day => {
		const rows = [...day.querySelectorAll('table > tbody > tr')];
		const busy = rows.map(r => !!r.querySelector('.pair_info .dis'));
		const first = busy.indexOf(true);
		rows.forEach((row, i) => {
			if (busy[i]) return;
			row.classList.add(first === -1 || i < first ? 'pair-row--lead' : 'pair-row--empty');
		});
	});

	// Вид «неделя сеткой»
	const week = readWeek(span9);
	cacheWeek(week);
	const daysView = buildTimetableDays(span9, week);
	const weekNav  = buildWeekNav(span9, week, todayBtn);
	if (weekNav) (daysView || span9.querySelector('div.day'))?.before(weekNav);
	initWeekSwipe(span9);
	let grid = null;
	if (week.some(d => d.pairs.length)) {
		grid = buildWeekGrid(week);
		const firstDay = span9.querySelector('div.day');
		if (firstDay) firstDay.before(grid); else span9.appendChild(grid);
		buttonbar.prepend(buildViewSwitch(span9));
	}

	// Виджет и подсветка — после обработки строк, обновляются раз в минуту
	const todayBlock = findTodayBlock(span9);
	let widget = null;

	function refresh() {
		const pairs = readPairs(todayBlock);
		highlightCurrentPair(span9, pairs);
		if (grid) highlightGridNow(grid);

		// Виджет показываем только на неделе, где есть сегодняшний день
		if (!todayBlock) return;
		const fresh = buildNextPairWidget(pairs);
		if (widget) {
			widget.replaceWith(fresh);
		} else {
			const anchor = daysView || grid || span9.querySelector('div.day');
			if (anchor) anchor.before(fresh);
			else span9.prepend(fresh);
		}
		widget = fresh;
	}
	refresh();
	pageInterval(refresh, 60 * 1000);

	// Наступили новые сутки — «сегодня» уже другое: перерисовываем страницу, когда её видно
	const loadDay = ymd(etisNow());
	const dayChanged = () => ymd(etisNow()) !== loadDay;
	pageInterval(() => { if (dayChanged() && document.visibilityState === 'visible') location.reload(); }, 60 * 1000);
	pageListen(document, 'visibilitychange', () => { if (document.visibilityState === 'visible' && dayChanged()) location.reload(); });

	initHomeRoute(span9);

	if (todayBlock && !span9.classList.contains('etis3-tt-grid') && !isHomeRoute()) {
		setTimeout(() => {
			const target = settings.layout === 'modern' ? daysView?.querySelector('.ttv-day--today') : todayBlock;
			target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}, 500);
	}
}

// ---------- Неделя целиком: данные, сетка, экспорт ----------

// Дни недели со всеми парами: [{ title, date, isToday, pairs: [{ num, name, type, aud, teacher }] }]
function readWeek(span9) {
	return [...span9.querySelectorAll('div.day')].map(day => {
		const title = day.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim() || '';
		const pairs = [];
		day.querySelectorAll('table > tbody > tr').forEach(row => {
			const num = readPairNum(row);
			if (isNaN(num)) return;
			row.querySelectorAll('.pair_info .dis a').forEach(a => {
				const full = a.dataset.name ? a.dataset.name + ' ' + (a.querySelector('.pair-type-raw')?.textContent || '') : a.textContent;
				const type = parsePairType(full.trim());
				const box  = a.closest('.pair_info > div') || row;
				pairs.push({
					num,
					name:    type ? type.name : full.trim(),
					type,
					aud:     (box.querySelector('.aud') || row.querySelector('.aud'))?.textContent.replace(/\s+/g, ' ').trim() || '',
					teacher: box.dataset?.teacher || box.querySelector('span.teacher a')?.textContent.trim() || row.querySelector('.pair_teacher a')?.textContent.trim() || '',
				});
			});
		});
		return { title, date: parseDayDate(title), isToday: isTodayTitle(title), pairs };
	});
}

// «Вторник, 6 октября» → Date. Год берём ближайший к сегодняшнему дню.
function parseDayDate(title) {
	const t = title.toLowerCase();
	let d, m;
	const numeric = t.match(/(\d{1,2})\.(\d{1,2})/);
	const worded  = t.match(/(\d{1,2})\s+([а-яё]+)/);
	if (numeric) { d = +numeric[1]; m = +numeric[2] - 1; }
	else if (worded) { d = +worded[1]; m = MONTH_RES.findIndex(re => re.test(worded[2])); }
	if (!d || m === undefined || m < 0) return null;
	const now = etisNow();
	let y = now.getFullYear();
	if (m - now.getMonth() > 6) y--;
	if (now.getMonth() - m > 6) y++;
	return new Date(y, m, d);
}

const TT_VIEW_KEY = 'etis3-tt-view';

function buildViewSwitch(span9) {
	const sw = createEl('div', { className: 'timetable-btn etis3-view-switch', role: 'group' });
	const views = [['list', 'view_agenda', 'Список'], ['grid', 'view_week', 'Неделя']];
	const set = (v, save) => {
		span9.classList.toggle('etis3-tt-grid', v === 'grid');
		sw.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
		if (save) try { localStorage.setItem(TT_VIEW_KEY, v); } catch (e) {}
	};
	views.forEach(([v, icon, label]) => {
		const b = createEl('button', { type: 'button', title: label });
		b.dataset.view = v;
		b.innerHTML = `<span class="material-icons">${icon}</span><span>${label}</span>`;
		b.addEventListener('click', () => set(v, true));
		sw.appendChild(b);
	});
	let saved = 'list';
	try { saved = localStorage.getItem(TT_VIEW_KEY) || 'list'; } catch (e) {}
	set(saved === 'grid' ? 'grid' : 'list', false);
	return sw;
}

const WEEKDAY_SHORT = { 'понедельник': 'Пн', 'вторник': 'Вт', 'среда': 'Ср', 'четверг': 'Чт', 'пятница': 'Пт', 'суббота': 'Сб', 'воскресенье': 'Вс' };

function buildWeekGrid(week) {
	const nums = week.flatMap(d => d.pairs.map(p => p.num));
	const from = Math.min(...nums), to = Math.max(...nums);
	const grid = createEl('div', { className: 'etis3-week-grid', lang: 'ru' });
	grid.style.setProperty('--days', week.length);

	const cell = (cls, html = '') => { const c = createEl('div', { className: cls, innerHTML: html }); grid.appendChild(c); return c; };

	cell('ewg-corner');
	week.forEach(d => {
		const wd   = d.title.split(',')[0].trim();
		const date = d.title.split(',').slice(1).join(',').trim();
		const c = cell('ewg-day' + (d.isToday ? ' ewg-today' : ''),
			`<b>${escapeHtml(WEEKDAY_SHORT[wd.toLowerCase()] || wd)}</b><span>${escapeHtml(date)}</span>`);
		c.title = d.title;
	});

	for (let n = from; n <= to; n++) {
		const slot = PAIR_SCHEDULE.find(p => p.num === n);
		cell('ewg-num', `<b>${n}</b>${slot ? `<span>${formatTime(slot.start[0], slot.start[1])}</span>` : ''}`);
		week.forEach(d => {
			const here = d.pairs.filter(p => p.num === n);
			const c = cell('ewg-cell' + (d.isToday ? ' ewg-today' : '') + (here.length ? '' : ' ewg-empty'));
			c.dataset.num = n;
			here.forEach(p => {
				const item = createEl('div', { className: 'ewg-pair' });
				paintDiscipline(item, p.name);
				item.innerHTML = `
					<div class="ewg-name">${escapeHtml(p.name)}</div>
					<div class="ewg-meta">
						${p.type ? `<span class="material-icons" title="${p.type.label}">${p.type.icon}</span>` : ''}
						${p.aud ? `<span class="ewg-aud">${escapeHtml(p.aud.replace(/^ауд\.\s*/i, '').replace(/\s*\(.*\)$/, ''))}</span>` : ''}
					</div>`;
				item.title = [p.name, p.type?.label, p.aud, p.teacher].filter(Boolean).join('\n');
				c.appendChild(item);
			});
		});
	}
	return grid;
}

function highlightGridNow(grid) {
	grid.querySelectorAll('.ewg-now').forEach(c => c.classList.remove('ewg-now'));
	const num = getCurrentPairNum();
	if (num) grid.querySelector(`.ewg-cell.ewg-today[data-num="${num}"]:not(.ewg-empty)`)?.classList.add('ewg-now');
}

// Экспорт недели в iCalendar. Время «плавающее» (без часового пояса) — календарь
// покажет его как местное, что для расписания и нужно.
function exportTimetableIcs(span9) {
	const week = readWeek(span9);
	const pad  = n => String(n).padStart(2, '0');
	const dt   = (date, [h, m]) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(h)}${pad(m)}00`;
	const esc  = str => String(str).replace(/[\\;,]/g, c => '\\' + c).replace(/\n/g, '\\n');
	const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ETIS 3.0//RU', 'CALSCALE:GREGORIAN'];
	let count = 0;
	week.forEach(d => {
		if (!d.date) return;
		d.pairs.forEach(p => {
			const slot = PAIR_SCHEDULE.find(s => s.num === p.num);
			if (!slot) return;
			const start = dt(d.date, slot.start);
			lines.push('BEGIN:VEVENT',
				`UID:${start}-${p.num}-${count}@etis3`,
				`DTSTAMP:${stamp}`,
				`DTSTART:${start}`,
				`DTEND:${dt(d.date, slot.end)}`,
				`SUMMARY:${esc(p.name + (p.type ? ` (${p.type.label.toLowerCase()})` : ''))}`);
			if (p.aud) lines.push(`LOCATION:${esc(p.aud)}`);
			if (p.teacher) lines.push(`DESCRIPTION:${esc(p.teacher)}`);
			lines.push('END:VEVENT');
			count++;
		});
	});
	lines.push('END:VCALENDAR');
	if (!count) { showToast('На этой неделе пар нет'); return; }

	const first = week.find(d => d.date)?.date;
	const name  = first ? `etis-${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(first.getDate())}.ics` : 'etis.ics';
	const url   = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
	const a     = createEl('a', { href: url, download: name });
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	showToast(`📅 ${count} пар — файл ${name}`);
}

function copyTimetable(span9) {
	const lines = [];
	span9.querySelectorAll('div.day').forEach(day => {
		const title = day.querySelector('h3')?.textContent.replace(/\s+/g,' ').trim() || '';
		lines.push('\n' + title.toUpperCase());
		day.querySelectorAll('table tbody tr').forEach(row => {
			const num  = row.querySelector('.pair_num .eval')?.textContent.trim(); // время начала, «8:00»
			row.querySelectorAll('.pair_info .dis a').forEach(a => {
				const box  = a.closest('.pair_info > div') || row;
				const dis  = a.textContent.trim();
				const aud  = (box.querySelector('.aud') || row.querySelector('.pair_info .aud'))?.textContent.trim();
				const tchr = box.dataset?.teacher || row.querySelector('.pair_teacher a')?.textContent.trim();
				if (dis) lines.push(`  ${num ? num+' ' : ''}${dis}${aud ? ' · '+aud : ''}${tchr ? ' — '+tchr : ''}`);
			});
		});
		const noPairs = day.querySelector('.no_pairs')?.textContent.trim();
		if (noPairs) lines.push('  ' + noPairs);
	});
	navigator.clipboard.writeText(lines.join('\n'))
		.then(() => showToast('📋 Расписание скопировано'))
		.catch(() => showToast('Не удалось скопировать'));
}


