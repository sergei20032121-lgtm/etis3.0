// ============================================================
// ЧТО НОВОГО — один раз после обновления
// ============================================================

const CHANGELOG = [
	['4.13.0', [
		['notifications_active', 'Расписание звонков', 'Кнопка-колокольчик у недели в расписании (и в Ctrl+K): какая пара идёт, сколько до звонка, все перемены'],
		['celebration', 'Праздничное оформление', 'К Хэллоуину — летучие мыши, к Новому году — снег. Выключается в настройках'],
		['alarm', 'Напоминания о ДЗ', 'Заметка к паре напомнит о себе вечером накануне или за час до пары', 'app'],
		['touch_app', 'Быстрые действия', 'Долгое нажатие на иконку приложения — сразу в расписание, оценки, сообщения или подготовку к сессии', 'app'],
	]],
	['4.12.1', [
		['bug_report', 'Сообщить о проблеме', 'В меню профиля и в настройках: опиши, что не так, — откроется готовое обращение на GitHub или текст для Telegram с версией и страницей (без личных данных)'],
	]],
	['4.12.0', [
		['verified_user', 'Безопасность', 'Новый ключ подписи приложения, обновления скрипта проверяются по подписи, сохранённый пароль открывается только отпечатком или кодом телефона', 'app'],
	]],
	['4.11.0', [
		['event_available', 'Подготовка к сессии', 'Обратный отсчёт, даты экзаменов и консультаций из расписания и калькулятор: двигай баллы за оставшиеся КТ — покажу итоговую оценку. Кнопка на Главной'],
		['fingerprint', 'Вход по отпечатку', 'После входа приложение предложит запомнить его — дальше по отпечатку', 'app'],
	]],
	['4.10.0', [
		['wallpaper', 'Свои фоны', 'Закат, океан, лес, космос, сладкая вата, графит — или своё фото с затемнением. Настройки → «Фон»'],
		['palette', 'Любой цвет акцента', 'Радужный кружок в настройках — выбери свой цвет интерфейса'],
		['ios_share', 'Неделя картинкой', 'Кнопка «Поделиться» рядом со стрелками недели — расписание красивой картинкой для чата группы'],
	]],
	['4.9.0', [
		['widgets', 'Виджет «Следующая пара»', 'Долгий тап по рабочему столу → Виджеты → ЕТИС 3.0. Текущая или следующая пара, аудитория и обратный отсчёт', 'app'],
		['notifications_active', 'Уведомления о новых оценках', 'Приложение само проверяет ЕТИС раз в час и присылает пуш, когда появляется оценка', 'app'],
		['cloud_off', 'Расписание без интернета', 'Если ЕТИС не открывается — на экране ошибки кнопка с сохранённым расписанием', 'app'],
		['photo_library', 'Итоги семестра — в галерею', 'Картинка Wrapped сохраняется в «Галерею» и сразу открывается «Поделиться»', 'app'],
	]],
	['4.8.0', [
		['auto_awesome', 'Итоги семестра · Wrapped', 'Сторис о твоём семестре: пары, контрольные, предмет-фаворит, главный босс, архетип — и картинка, чтобы скинуть в чат группы. Кнопка на Главной'],
	]],
	['4.7.2', [
		['swipe', 'Широкие таблицы на телефоне', 'Учебный план «детально», библиотека и другие таблицы листаются вбок, а не обрезаются'],
		['phone_iphone', 'Без «прыжков» на iPhone', 'При переходе между вкладками больше не мелькает десктопная вёрстка'],
	]],
	['4.7.0', [
		['assignment', 'Заметки и ДЗ к парам', 'Нажми на пару — запиши, что задали или что взять. Видно на паре и на Главной, можно отметить «выполнено»'],
	]],
	['4.6.0', [
		['swipe', 'Свайпы в расписании', 'Листай недели пальцем; сверху — «‹ неделя ›» и «Сегодня»'],
		['add_to_home_screen', 'Иконка на экране «Домой»', 'Safari → «Поделиться» → «На экран Домой» — ЕТИС в один тап, панели Safari в цвет темы'],
		['palette', 'Новая иконка', 'И для расширения, и для экрана «Домой»'],
	]],
	['4.5.1', [
		['build', 'Исправления для iPhone', 'Экран входа и интерфейс запускаются в Stay, даже если скрипт подключился после загрузки страницы'],
	]],
	['4.5.0', [
		['smartphone', 'Мобильная версия', 'Под телефон: нижний док с «Ещё», компактная шапка, учёт выреза iPhone'],
		['phone_iphone', 'Работает на iPhone', 'Через Stay в Safari — без компьютера и магазина расширений'],
	]],
	['4.4.0', [
		['insights', 'Оценки за сессии', 'Средний балл, график по семестрам, распределение оценок и семестры карточками'],
	]],
	['4.3.0', [
		['view_agenda', 'Расписание лентой', 'Дни — карточками, пары — таймлайном: что прошло, что идёт, «окна» между парами'],
		['new_releases', 'Это окно', 'Теперь после обновления видно, что поменялось'],
	]],
	['4.2.0', [
		['notifications_active', 'Уведомления о новом', 'Оценки, сообщения и объявления — счётчик на иконке и уведомление, даже когда ЕТИС закрыт'],
	]],
	['4.1.0', [
		['grade', 'Оценки карточками', 'Каждая дисциплина — карточка со списком КТ, долгами и целью'],
		['menu_book', 'Учебный план, преподаватели, пропуски', 'Перерисованы в новом стиле'],
	]],
	['4.0.0', [
		['home', 'Главная', 'Пары на сегодня, рейтинг, последние оценки, сообщения и объявления на одном экране'],
	]],
	['3.9.0', [
		['dashboard', 'Новый интерфейс', 'Рельс навигации, верхняя панель с текущей парой и меню профиля'],
		['search', 'Поиск по Ctrl+K', 'Быстрый переход на любую страницу ЕТИСа'],
		['blur_on', 'Живой фон', 'Аврора за стеклом, цвета меняются по времени суток'],
	]],
];

function cmpVersion(a, b) {
	const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
	for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
	return 0;
}

async function showWhatsNew() {
	let current;
	try { current = chrome.runtime.getManifest().version; } catch (e) { return; }
	const KEY = 'etis3-version-seen';
	await settingsReady;
	const got = await new Promise(r => { try { chrome.storage.local.get([KEY, ETIS3_STORAGE_KEY], r); } catch (e) { r({}); } });
	const seen = got?.[KEY];
	try { chrome.storage.local.set({ [KEY]: current }); } catch (e) {}
	if (seen && cmpVersion(seen, current) >= 0) return;

	// Свежая установка (настроек ещё не было) — короткое приветствие вместо списка изменений
	const fresh = !seen && etis3FirstRun;
	const entries = fresh ? [] : CHANGELOG.filter(([v]) => !seen || cmpVersion(v, seen) > 0).slice(0, 4);
	const items = fresh ? [
		['home', 'Главная', 'Пары, рейтинг, оценки и сообщения на одном экране — логотип «Е» слева сверху'],
		['search', 'Ctrl+K или /', 'Поиск по всем страницам ЕТИСа'],
		['notifications_active', 'Уведомления', 'Новые оценки и сообщения — даже когда ЕТИС закрыт'],
		['tune', 'Настройки', 'Тема, акцент, вид и фон — в иконке расширения'],
	] : entries.flatMap(([, list]) => list).filter(it => !it[3] || (it[3] === 'app') === IS_APP);
	if (!items.length) return;

	const wrap = createEl('div', { id: 'etis3-whatsnew', role: 'dialog', 'aria-label': 'Что нового' });
	wrap.innerHTML = `
		<div class="wn-box">
			<div class="wn-glow"></div>
			<div class="wn-head">
				<div class="wn-logo">Е</div>
				<div>
					<div class="wn-kicker">${fresh ? 'Добро пожаловать' : 'Обновление ' + escapeHtml(current)}</div>
					<h2>${fresh ? 'Это ЕТИС 3.0' : 'Что нового'}</h2>
				</div>
			</div>
			<div class="wn-list">
				${items.map(([icon, title, text], i) => `
					<div class="wn-item" style="--i:${i}">
						<span class="material-icons">${icon}</span>
						<div><b>${escapeHtml(title)}</b><span>${escapeHtml(text)}</span></div>
					</div>`).join('')}
			</div>
			<button type="button" class="wn-ok">${fresh ? 'Поехали' : 'Круто'}</button>
		</div>`;
	document.body.appendChild(wrap);
	requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));
	const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 300); document.removeEventListener('keydown', onKey); };
	const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
	document.addEventListener('keydown', onKey);
	wrap.querySelector('.wn-ok').addEventListener('click', close);
	wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
	setTimeout(() => wrap.querySelector('.wn-ok')?.focus({ preventScroll: true }), 400);
}


// ---------- Оценки за сессии ----------
const SESSION_GRADE = {
	'5': { cls: 'g5', num: 5 }, '4': { cls: 'g4', num: 4 }, '3': { cls: 'g3', num: 3 }, '2': { cls: 'g2', num: 2 },
	'отлично': { cls: 'g5', num: 5 }, 'хорошо': { cls: 'g4', num: 4 }, 'удовлетворительно': { cls: 'g3', num: 3 }, 'неудовлетворительно': { cls: 'g2', num: 2 },
};

function sessionGrade(text) {
	const t = text.trim().toLowerCase();
	if (SESSION_GRADE[t]) return { ...SESSION_GRADE[t], text: t.length > 2 ? String(SESSION_GRADE[t].num) : t };
	if (/^незач/.test(t)) return { cls: 'gfail', num: null, text: 'незачёт' };
	if (/^зач/.test(t)) return { cls: 'gpass', num: null, text: 'зачёт' };
	if (/неяв/.test(t)) return { cls: 'gfail', num: null, text: 'неявка' };
	return { cls: '', num: null, text: t || '—' };
}

function buildSessionView(span9) {
	const table = span9?.querySelector(':scope > table.common');
	if (!table) return;
	const terms = [];
	table.querySelectorAll('tr').forEach(tr => {
		const head = tr.querySelector('th[colspan]');
		if (head) {
			const txt = head.textContent.replace(/\s+/g, ' ').trim();
			const m = txt.match(/^(.*?)\s*\((\d+)\s*курс\)/);
			terms.push({ title: m ? m[1] : txt.split(',')[0], course: m ? +m[2] : null,
				end: (txt.match(/(\d{2}\.\d{2}\.\d{4})/) || [])[1] || '', rows: [] });
			return;
		}
		const c = [...tr.children];
		if (c.length < 4 || c[0].tagName === 'TH' || !terms.length) return;
		terms[terms.length - 1].rows.push({ dis: c[0].textContent.trim(), grade: sessionGrade(c[1].textContent), date: c[2].textContent.trim(), who: c[3].textContent.trim() });
	});
	const filled = terms.filter(t => t.rows.length);
	if (!filled.length) return;

	const avg = rows => { const n = rows.map(r => r.grade.num).filter(x => x); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
	const all = filled.flatMap(t => t.rows);
	const total = avg(all);
	const count = k => all.filter(r => r.grade.cls === k).length;
	const dist = [['g5', '5', count('g5')], ['g4', '4', count('g4')], ['g3', '3', count('g3')], ['g2', '2', count('g2')], ['gpass', 'зачёт', count('gpass')], ['gfail', 'незачёт', count('gfail')]].filter(d => d[2]);
	const exams = dist.filter(d => /^g[2-5]$/.test(d[0])).reduce((s, d) => s + d[2], 0);
	filled.forEach(t => { t.avg = avg(t.rows); });

	// График среднего по семестрам: одна линия, точки с подсказками
	const pts = filled.filter(t => t.avg !== null);
	let chart = '';
	if (pts.length > 1) {
		const W = 600, H = 150, px = 18, py = 18;
		const min = Math.min(3, ...pts.map(p => p.avg)), max = 5;
		const x = i => px + i * (W - px * 2) / (pts.length - 1);
		const y = v => py + (max - v) / (max - min) * (H - py * 2);
		const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ');
		chart = `<svg class="ssv-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Средний балл по семестрам">
			${[5, 4, 3].filter(v => v >= min).map(v => `<line x1="${px}" x2="${W - px}" y1="${y(v)}" y2="${y(v)}" class="ssv-grid"/>`).join('')}
			<polyline points="${line} ${x(pts.length - 1)},${H - py} ${x(0)},${H - py}" class="ssv-area"/>
			<polyline points="${line}" class="ssv-line" vector-effect="non-scaling-stroke"/>
		</svg>
		<div class="ssv-dots">${pts.map((p, i) => `<span class="ssv-dot" style="left:${(x(i) / W * 100).toFixed(2)}%;top:${(y(p.avg) / H * 100).toFixed(2)}%" data-tip="${escapeHtml(p.title)}: ${fmtNum(Math.round(p.avg * 100) / 100)}"></span>`).join('')}</div>
		<div class="ssv-ylabels">${[5, 4, 3].filter(v => v >= min).map(v => `<span style="top:${(y(v) / H * 100).toFixed(2)}%">${v}</span>`).join('')}</div>
		<div class="ssv-xlabels">${pts.map((p, i) => `<span style="left:${(x(i) / W * 100).toFixed(2)}%">${escapeHtml(p.title.replace(/\s*(семестр|триместр)/i, ''))}</span>`).join('')}</div>`;
	}

	const last = pts[pts.length - 1], prev = pts[pts.length - 2];
	const delta = last && prev ? last.avg - prev.avg : null;
	const wrap = createEl('div', { className: 'etis3-view ssv' });
	wrap.innerHTML = `
		<section class="ssv-summary">
			<div class="ssv-hero">
				<div class="ssv-label">Средний балл за экзамены</div>
				<div class="ssv-big">${total !== null ? fmtNum(Math.round(total * 100) / 100) : '—'}</div>
				<div class="ssv-sub">${exams} экз. · ${count('gpass') + count('gfail')} зач. · ${filled.length} ${/триместр/i.test(filled[0].title) ? 'триместров' : 'семестров'}</div>
				${delta !== null ? `<div class="ssv-delta ${delta >= 0 ? 'up' : 'down'}"><span class="material-icons">${delta >= 0 ? 'trending_up' : 'trending_down'}</span>${delta >= 0 ? '+' : '−'}${fmtNum(Math.abs(Math.round(delta * 100) / 100))} за последний</div>` : ''}
			</div>
			${chart ? `<div class="ssv-trend"><div class="ssv-label">Средний балл по ${/триместр/i.test(filled[0].title) ? 'триместрам' : 'семестрам'}</div><div class="ssv-plot">${chart}</div></div>` : ''}
			<div class="ssv-dist">
				<div class="ssv-label">Оценки</div>
				<div class="ssv-bar">${dist.map(([k, , n]) => `<i class="${k}" style="flex:${n}" title="${n}"></i>`).join('')}</div>
				<div class="ssv-legend">${dist.map(([k, label, n]) => `<span><i class="${k}"></i>${label}<b>${n}</b></span>`).join('')}</div>
			</div>
		</section>
		${[...filled].reverse().map((t, ti) => `
			<section class="ssv-term${ti === 0 ? '' : ' ssv-term--old'}">
				<header class="ssv-term-head">
					<h3>${escapeHtml(t.title)}</h3>
					${t.course ? `<span class="ssv-course">${t.course} курс</span>` : ''}
					<span class="ssv-term-avg">${t.avg !== null ? `средний <b>${fmtNum(Math.round(t.avg * 100) / 100)}</b>` : 'только зачёты'}</span>
				</header>
				<div class="ssv-rows">${t.rows.map(r => `
					<div class="ssv-row etis3-dis" style="--dis-h:${disciplineHue(r.dis)}">
						<span class="ssv-grade ${r.grade.cls}">${r.grade.cls === 'gpass' ? '<span class="material-icons">check</span>' : escapeHtml(r.grade.text)}</span>
						<span class="ssv-dis">${escapeHtml(r.dis)}<small>${escapeHtml(r.who)}</small></span>
						<span class="ssv-date">${escapeHtml(r.date)}</span>
					</div>`).join('')}
				</div>
			</section>`).join('')}
	`;
	table.before(wrap);
	table.classList.add('etis3-orig');

	// Подсказки на точках графика
	wrap.querySelectorAll('.ssv-dot').forEach(d => d.title = d.dataset.tip);

	// Длинное пояснение ЕТИСа — под спойлер
	const note = span9.querySelector(':scope > p');
	if (note) {
		const det = createEl('details', { className: 'etis3-view ssv-note' });
		det.innerHTML = `<summary><span class="material-icons">info</span>Если оценка указана неверно</summary><div>${note.innerHTML}</div>`;
		note.after(det);
		note.classList.add('etis3-orig');
	}
}


// ---------- Неделя: «‹ неделя ›», «Сегодня» и свайпы ----------
function weekLinks() {
	const cur = document.querySelector('.weeks li.current');
	const link = li => li?.querySelector('a')?.href || null;
	return { cur, prev: link(cur?.previousElementSibling), next: link(cur?.nextElementSibling) };
}

function buildWeekNav(span9, week, todayBtn) {
	const { cur, prev, next } = weekLinks();
	if (!cur) return null;
	const dates = week.map(d => d.date).filter(Boolean);
	const fmt = d => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
	let range = '';
	if (dates.length) {
		const a = dates[0], b = dates[dates.length - 1];
		range = a.getMonth() === b.getMonth() ? `${a.getDate()}–${fmt(b)}` : `${fmt(a)} – ${fmt(b)}`;
	}
	const isCurrentWeek = week.some(d => d.isToday);
	const kind = cur.title ? ` · ${cur.title.toLowerCase()}` : '';
	const nav = createEl('div', { className: 'etis3-view ttw' });
	nav.innerHTML = `
		<a class="ttw-arrow${prev ? '' : ' ttw-arrow--off'}" ${prev ? `href="${escapeHtml(prev)}"` : ''} aria-label="Предыдущая неделя"><span class="material-icons">chevron_left</span></a>
		<div class="ttw-mid">
			<b>${escapeHtml(cur.textContent.trim())} неделя${isCurrentWeek ? ' <span class="ttw-now">текущая</span>' : ''}</b>
			<span>${escapeHtml(range + kind)}</span>
		</div>
		${!isCurrentWeek && todayBtn?.href ? `<a class="ttw-today" href="${escapeHtml(todayBtn.href)}">Сегодня</a>` : ''}
		<a class="ttw-bells" href="#" data-bells role="button" title="Расписание звонков" aria-label="Расписание звонков"><span class="material-icons">notifications_active</span></a>
		${week.some(d => d.pairs.length) ? '<a class="ttw-share" href="#" role="button" title="Неделя картинкой — скинуть в чат" aria-label="Поделиться неделей"><span class="material-icons">ios_share</span></a>' : ''}
		<a class="ttw-arrow${next ? '' : ' ttw-arrow--off'}" ${next ? `href="${escapeHtml(next)}"` : ''} aria-label="Следующая неделя"><span class="material-icons">chevron_right</span></a>`;
	nav.querySelector('.ttw-share')?.addEventListener('click', async e => {
		e.preventDefault();
		const btn = e.currentTarget;
		if (btn.classList.contains('is-busy')) return;
		btn.classList.add('is-busy');
		try {
			const canvas = renderWeekImage(week, `${cur.textContent.trim()} неделя`, range + kind, isCurrentWeek);
			await saveCanvasImage(canvas, `etis-nedelya-${cur.textContent.trim()}.png`, 'Моя неделя');
		} finally { btn.classList.remove('is-busy'); }
	});
	return nav;
}

// Свайп влево / вправо по расписанию — следующая / предыдущая неделя (только сенсорные экраны)
function initWeekSwipe(span9) {
	if (!('ontouchstart' in window)) return;
	const { prev, next } = weekLinks();
	if (!prev && !next) return;
	let x0 = 0, y0 = 0, t0 = 0, active = false, dx = 0;
	const target = () => span9.querySelector('.ttv') || span9.querySelector('.etis3-week-grid');
	span9.addEventListener('touchstart', e => {
		if (e.touches.length !== 1 || e.target.closest('.etis3-week-grid, .weeks, .submenu, input, textarea')) { active = false; return; }
		x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); active = true; dx = 0;
	}, { passive: true });
	span9.addEventListener('touchmove', e => {
		if (!active) return;
		dx = e.touches[0].clientX - x0;
		const dy = e.touches[0].clientY - y0;
		if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { active = false; resetSwipe(); return; }
		if ((dx > 0 && !prev) || (dx < 0 && !next)) dx *= 0.25; // некуда листать — пружиним
		const el = target();
		if (el) { el.style.transition = 'none'; el.style.transform = `translateX(${dx * 0.6}px)`; el.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.4)); }
	}, { passive: true });
	const resetSwipe = () => {
		const el = target();
		if (!el) return;
		el.style.transition = 'transform 0.3s cubic-bezier(.2,.8,.2,1), opacity 0.3s';
		el.style.transform = ''; el.style.opacity = '';
	};
	span9.addEventListener('touchend', () => {
		if (!active) return;
		active = false;
		const fast = Math.abs(dx) > 40 && Date.now() - t0 < 250;
		const url = dx < 0 ? next : prev;
		if (url && (Math.abs(dx) > 90 || fast)) {
			const el = target();
			if (el) { el.style.transition = 'transform 0.25s ease-in, opacity 0.25s'; el.style.transform = `translateX(${dx < 0 ? -40 : 40}vw)`; el.style.opacity = '0'; }
			setTimeout(() => { location.href = url; }, 180);
		} else resetSwipe();
	});
}


