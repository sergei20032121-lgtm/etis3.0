// ============================================================
// НОВЫЙ ИНТЕРФЕЙС: верхняя панель, палитра команд, кэш недели
// ============================================================

// ---------- Кэш расписания ----------
// Расписание с прошлого визита нужно, чтобы на любой странице показывать
// текущую / следующую пару в верхней панели.
const WEEK_CACHE_KEY = 'etis3-week-cache';

function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function readWeekCache() {
	try { const c = JSON.parse(localStorage.getItem(WEEK_CACHE_KEY)); return c && c.days ? c : null; } catch (e) { return null; }
}

function cacheWeek(week) {
	const days = {};
	const old  = readWeekCache();
	const keepFrom = ymd(new Date(Date.now() - 14 * 864e5));
	if (old) Object.entries(old.days).forEach(([k, v]) => { if (k >= keepFrom) days[k] = v; });
	week.forEach(d => {
		if (!d.date) return;
		days[ymd(d.date)] = d.pairs.map(p => ({ num: p.num, name: p.name, type: p.type?.label || '', aud: p.aud }));
	});
	const times = PAIR_SCHEDULE.map(p => ({ num: p.num, start: p.start, end: p.end }));
	try { localStorage.setItem(WEEK_CACHE_KEY, JSON.stringify({ days, times, saved: Date.now() })); } catch (e) {}
	document.dispatchEvent(new CustomEvent('etis3-week-cached'));
}

// Статус дня по кэшу: { state: 'now'|'next'|'done'|'free', pair, slot, mins }
function todayStatus() {
	const c = readWeekCache();
	if (!c) return null;
	const today = c.days[ymd(new Date())];
	if (!today) return null;
	const now = nowMinutes();
	const pairs = today.map(p => ({ ...p, slot: c.times.find(t => t.num === p.num) })).filter(p => p.slot)
		.sort((a, b) => a.num - b.num);
	if (!pairs.length) return { state: 'free' };
	const m = t => t[0] * 60 + t[1];
	const cur = pairs.find(p => now >= m(p.slot.start) && now <= m(p.slot.end));
	if (cur) return { state: 'now', pair: cur, mins: m(cur.slot.end) - now, pct: Math.round((now - m(cur.slot.start)) / (m(cur.slot.end) - m(cur.slot.start)) * 100) };
	const next = pairs.find(p => m(p.slot.start) > now);
	if (next) return { state: 'next', pair: next, mins: m(next.slot.start) - now };
	return { state: 'done' };
}

// ---------- Верхняя панель ----------
function navLabel(a) {
	return (a.querySelector('.etis3-nav-label')?.textContent || a.textContent).replace(/\s+/g, ' ').trim();
}

function buildTopbar(sidebar) {
	// Пункт «Главная» — первым в навигации
	const mainNav = sidebar.querySelector('.etis3-main-nav');
	if (mainNav && !mainNav.querySelector('.etis3-home-li')) {
		const li = createEl('li', { className: 'etis3-home-li' });
		li.dataset.group = 'main';
		li.innerHTML = '<a href="stu.timetable#home"><span class="material-icons">home</span><span class="etis3-nav-label">Главная</span></a>';
		mainNav.prepend(li);
	}
	// «Ещё» — на телефоне открывает всю навигацию снизу листом
	if (mainNav && !mainNav.querySelector('.etis3-more-li')) {
		const more = createEl('li', { className: 'etis3-more-li' });
		more.dataset.group = 'main';
		more.innerHTML = '<a href="#"><span class="material-icons">menu</span><span class="etis3-nav-label">Ещё</span></a>';
		const firstHead = mainNav.querySelector('.etis3-nav-head');
		firstHead ? firstHead.before(more) : mainNav.appendChild(more);
		const backdrop = createEl('div', { id: 'etis3-sheet-backdrop' });
		document.body.appendChild(backdrop);
		const toggle = open => {
			document.documentElement.classList.toggle('etis3-sheet-open', open);
			if (open) sidebar.scrollTop = 0;
		};
		more.querySelector('a').addEventListener('click', e => { e.preventDefault(); toggle(!document.documentElement.classList.contains('etis3-sheet-open')); });
		backdrop.addEventListener('click', () => toggle(false));
		sidebar.addEventListener('click', e => { if (e.target.closest('a[href]:not([href="#"])')) toggle(false); });
		document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
	}
	if (isHomeRoute()) {
		sidebar.querySelectorAll('.etis3-main-nav > li.active').forEach(li => li.classList.remove('active'));
		mainNav?.querySelector('.etis3-home-li')?.classList.add('active');
	}

	const active  = sidebar.querySelector('.etis3-main-nav > li.active > a');
	const group   = active?.closest('li')?.dataset.group;
	const crumb   = NAV_GROUPS.find(g => g[0] === group)?.[1] || '';
	const pageTtl = active ? navLabel(active) : (document.querySelector('.span9 > h3')?.textContent.trim() || 'ЕТИС');

	// Активная группа подсвечивается и на свёрнутом рельсе
	if (group && group !== 'main') {
		[...sidebar.querySelectorAll('.etis3-nav-head')].find(h => h.textContent.includes(crumb))?.classList.add('etis3-nav-head--active');
	}

	// Иконки для блока анкет / опросов, чтобы он жил на рельсе
	sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked:not(.etis3-main-nav):not(.etis3-quickbar) > li > a').forEach(a => {
		if (a.querySelector('.material-icons')) return;
		const t = a.textContent.toLowerCase();
		const icon = /опрос/.test(t) ? 'ballot' : /анкет/.test(t) ? 'assignment_turned_in' : /оцени/.test(t) ? 'star_rate' : 'push_pin';
		a.prepend(createEl('span', { className: 'material-icons', textContent: icon }));
		const text = [...a.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
		text.forEach(n => { const span = createEl('span', { className: 'etis3-nav-label', textContent: n.textContent.trim() }); n.replaceWith(span); });
		a.style.removeProperty('background-color');
		a.style.removeProperty('color');
	});

	const profile = sidebar.querySelector('.etis3-profile');
	const bar = createEl('header', { id: 'etis3-topbar' });
	bar.innerHTML = `
		<a class="tb-brand" href="stu.timetable#home" title="Главная">
			<span class="tb-logo">Е</span>
		</a>
		<div class="tb-title">
			${crumb ? `<span class="tb-crumb">${escapeHtml(crumb)}</span>` : ''}
			<span class="tb-page">${escapeHtml(pageTtl)}</span>
		</div>
		<button type="button" class="tb-search" title="Поиск по ЕТИСу">
			<span class="material-icons">search</span>
			<span class="tb-search-text">Найти страницу или действие</span>
			<kbd>Ctrl K</kbd>
		</button>
		<a class="tb-pair" href="stu.timetable" hidden></a>
		<div class="tb-clock"><b></b><small></small></div>
		<button type="button" class="tb-icon tb-theme" title="Сменить тему"><span class="material-icons"></span></button>
		<div class="tb-user">
			<button type="button" class="tb-avatar" title="${escapeHtml(profile?.title || 'Профиль')}">${escapeHtml(profile?.querySelector('.etis3-profile__avatar')?.textContent || '')}<span class="material-icons">person</span></button>
			<div class="tb-menu" hidden></div>
		</div>
	`;
	document.body.appendChild(bar);

	// Часы
	const clock = bar.querySelector('.tb-clock');
	const tickClock = () => {
		const d = new Date();
		clock.querySelector('b').textContent = formatTime(d.getHours(), d.getMinutes());
		clock.querySelector('small').textContent = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
	};
	tickClock();

	// Текущая / следующая пара
	const pairEl = bar.querySelector('.tb-pair');
	const renderPair = () => {
		const st = todayStatus();
		if (!st) { pairEl.hidden = true; return; }
		pairEl.hidden = false;
		pairEl.className = 'tb-pair tb-pair--' + st.state;
		pairEl.style.removeProperty('--dis-h');
		if (st.pair) pairEl.style.setProperty('--dis-h', disciplineHue(st.pair.name));
		const label = {
			now:  () => `<span class="tb-pair-k">Сейчас · ещё ${formatDuration(st.mins)}</span>`,
			next: () => `<span class="tb-pair-k">${st.mins <= 90 ? `Через ${formatDuration(st.mins)}` : `В ${formatTime(...st.pair.slot.start)}`}</span>`,
		}[st.state];
		pairEl.innerHTML = st.pair
			? `<span class="tb-pair-dot"></span><span class="tb-pair-txt">${label()}<span class="tb-pair-name">${escapeHtml(st.pair.name)}</span></span>
			   ${st.pair.aud ? `<span class="tb-pair-aud">${escapeHtml(st.pair.aud.replace(/^ауд\.\s*/i, '').replace(/\s*\(.*\)$/, ''))}</span>` : ''}
			   ${st.state === 'now' ? `<span class="tb-pair-bar"><i style="width:${st.pct}%"></i></span>` : ''}`
			: `<span class="material-icons">${st.state === 'free' ? 'weekend' : 'check_circle'}</span><span class="tb-pair-txt"><span class="tb-pair-name">${st.state === 'free' ? 'Сегодня пар нет' : 'Пары на сегодня всё'}</span></span>`;
		pairEl.title = st.pair ? [st.pair.name, st.pair.type, st.pair.aud].filter(Boolean).join('\n') : '';
	};
	renderPair();
	document.addEventListener('etis3-week-cached', renderPair);
	setInterval(() => { tickClock(); renderPair(); }, 20 * 1000);

	// Тема
	const themeBtn = bar.querySelector('.tb-theme');
	const syncTheme = () => { themeBtn.firstElementChild.textContent = themeIcon(settings.theme); themeBtn.title = 'Тема: ' + THEME_LABELS[settings.theme]; };
	syncTheme();
	themeBtn.addEventListener('click', () => { switchTheme(); syncTheme(); });
	chrome.storage?.onChanged?.addListener(syncTheme);

	// Поиск
	bar.querySelector('.tb-search').addEventListener('click', () => openCommandPalette());

	// Меню профиля
	const menu = bar.querySelector('.tb-menu');
	const sem  = sidebar.querySelector('.semester-progress');
	const quick = [...sidebar.querySelectorAll('.etis3-quickbar a[href]:not(.etis3-settings-btn)')];
	menu.innerHTML = `
		<div class="tbm-head">
			<div class="tbm-avatar">${escapeHtml(profile?.querySelector('.etis3-profile__avatar')?.textContent || '')}</div>
			<div><div class="tbm-name">${escapeHtml(profile?.title || '')}</div><div class="tbm-sub">${escapeHtml(profile?.querySelector('.etis3-profile__sub')?.textContent || '')}</div></div>
		</div>
		${sem ? `<div class="tbm-sem">${sem.innerHTML}</div>` : ''}
		<div class="tbm-links">
			${quick.map(a => `<a href="${escapeHtml(a.href)}" class="${/logout/.test(a.href) ? 'tbm-danger' : ''}${a.classList.contains('need_redirect') ? ' need_redirect' : ''}"><span class="material-icons">${a.querySelector('.material-icons')?.textContent || 'chevron_right'}</span>${escapeHtml(a.title || navLabel(a))}</a>`).join('')}
			<a href="#" class="tbm-theme"><span class="material-icons">contrast</span>Тема: <span class="tbm-theme-name">${THEME_LABELS[settings.theme]}</span></a>
			<a href="#" class="tbm-settings"><span class="material-icons">tune</span>Настройки ЕТИС 3.0</a>
			<a href="#" class="tbm-report"><span class="material-icons">bug_report</span>Сообщить о проблеме</a>
		</div>
	`;
	// Выход — последним
	const logout = menu.querySelector('.tbm-danger');
	if (logout) menu.querySelector('.tbm-links').appendChild(logout);
	menu.querySelector('.tbm-settings').addEventListener('click', e => { e.preventDefault(); menu.hidden = true; openSettingsPanel(); });
	menu.querySelector('.tbm-report').addEventListener('click', e => { e.preventDefault(); menu.hidden = true; openReportDialog(); });
	menu.querySelector('.tbm-theme').addEventListener('click', e => {
		e.preventDefault(); switchTheme(); syncTheme();
		menu.querySelector('.tbm-theme-name').textContent = THEME_LABELS[settings.theme];
	});
	document.body.appendChild(menu);
	const avatar = bar.querySelector('.tb-avatar');
	avatar.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
	document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
	window.addEventListener('scroll', () => { menu.hidden = true; }, { passive: true });
	document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.hidden = true; });
}

// ---------- Палитра команд (Ctrl+K) ----------
let paletteItems = [];

function initCommandPalette(sidebar) {
	const seen = new Set();
	sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked a[href]').forEach(a => {
		const href = a.href;
		if (!href || href.endsWith('#') || seen.has(href)) return;
		seen.add(href);
		const group = a.closest('li')?.dataset.group;
		paletteItems.push({
			label: a.title && a.closest('.etis3-quickbar') ? a.title : navLabel(a),
			icon:  a.querySelector('.material-icons')?.textContent || 'chevron_right',
			hint:  NAV_GROUPS.find(g => g[0] === group)?.[1] || (a.closest('.etis3-quickbar') ? 'Профиль' : group === 'main' ? 'Главное' : ''),
			run:   () => { location.href = href; },
		});
	});
	paletteItems.push(
		{ label: 'Сменить тему',            icon: 'contrast', hint: 'Действие', run: () => switchTheme() },
		{ label: 'Настройки ЕТИС 3.0',      icon: 'tune',     hint: 'Действие', run: () => openSettingsPanel() },
		{ label: settings.layout === 'modern' ? 'Классический интерфейс' : 'Новый интерфейс', icon: 'dashboard_customize', hint: 'Действие',
		  run: () => saveSettings({ layout: settings.layout === 'modern' ? 'classic' : 'modern' }) },
	);

	document.addEventListener('keydown', e => {
		const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) { e.preventDefault(); openCommandPalette(); }
		else if (e.key === '/' && !typing) { e.preventDefault(); openCommandPalette(); }
	});
}

function normalizeSearch(s) { return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim(); }

function paletteScore(item, q) {
	if (!q) return 1;
	const l = normalizeSearch(item.label), h = normalizeSearch(item.hint);
	if (l.startsWith(q)) return 100 - l.length / 100;
	if (l.split(' ').some(w => w.startsWith(q))) return 80;
	if (l.includes(q)) return 60;
	const initials = l.split(' ').map(w => w[0]).join('');
	if (initials.startsWith(q)) return 50;
	if (h.includes(q)) return 30;
	// Буквы по порядку: «рсп» → «Расписание»
	let i = 0;
	for (const ch of l) if (ch === q[i]) i++;
	return i === q.length ? 10 : 0;
}

function openCommandPalette() {
	if (document.getElementById('etis3-palette')) return;
	const wrap = createEl('div', { id: 'etis3-palette', role: 'dialog', 'aria-label': 'Поиск' });
	wrap.innerHTML = `
		<div class="pal-box">
			<div class="pal-input"><span class="material-icons">search</span><input type="text" placeholder="Куда пойдём?" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
			<div class="pal-list" role="listbox"></div>
			<div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span><span><kbd>Enter</kbd> открыть</span><span><kbd>/</kbd> или <kbd>Ctrl K</kbd> — вызвать</span></div>
		</div>`;
	document.body.appendChild(wrap);
	requestAnimationFrame(() => wrap.classList.add('show'));

	const input = wrap.querySelector('input'), list = wrap.querySelector('.pal-list');
	let shown = [], sel = 0;
	const render = () => {
		const q = normalizeSearch(input.value);
		shown = paletteItems.map(it => ({ it, s: paletteScore(it, q) })).filter(x => x.s > 0)
			.sort((a, b) => b.s - a.s).slice(0, 9).map(x => x.it);
		sel = Math.min(sel, Math.max(shown.length - 1, 0));
		list.innerHTML = shown.length ? shown.map((it, i) => `
			<div class="pal-item${i === sel ? ' sel' : ''}" data-i="${i}" role="option">
				<span class="material-icons">${it.icon}</span><span class="pal-label">${escapeHtml(it.label)}</span><span class="pal-hint">${escapeHtml(it.hint)}</span>
			</div>`).join('') : '<div class="pal-empty">Ничего не нашлось</div>';
	};
	const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 200); };
	const run = i => { const it = shown[i]; if (!it) return; close(); it.run(); };

	input.addEventListener('input', () => { sel = 0; render(); });
	input.addEventListener('keydown', e => {
		if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(shown.length, 1); render(); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(shown.length, 1); render(); }
		else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
		else if (e.key === 'Escape') { e.preventDefault(); close(); }
	});
	list.addEventListener('mousemove', e => { const el = e.target.closest('.pal-item'); if (el && +el.dataset.i !== sel) { sel = +el.dataset.i; render(); } });
	list.addEventListener('click', e => { const el = e.target.closest('.pal-item'); if (el) run(+el.dataset.i); });
	wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
	render();
	input.focus();
}

// ---------- Приветствие после входа ----------
function greetAfterLogin() {
	let just = false;
	try { just = sessionStorage.getItem('etis3-just-logged') === '1'; sessionStorage.removeItem('etis3-just-logged'); } catch (e) {}
	if (!just && !/stu\.login/.test(document.referrer)) return;
	if (settings.layout === 'modern' && !isHomeRoute()) {
		if (/stu\.timetable$/.test(location.pathname) && !location.search) {
			location.hash = 'home';
		} else {
			try { sessionStorage.setItem('etis3-just-logged', '1'); } catch (e) {}
			location.replace(new URL('stu.timetable#home', location.href).href);
			return;
		}
	}
	const name = (document.querySelector('.etis3-profile')?.title || '').split(/\s+/)[1] || '';
	document.documentElement.classList.add('etis3-welcome');
	setTimeout(() => showToast(`${loginGreeting(new Date().getHours())}${name ? ', ' + name : ''} 👋`, 3200), 500);
	setTimeout(() => document.documentElement.classList.remove('etis3-welcome'), 2500);
}


