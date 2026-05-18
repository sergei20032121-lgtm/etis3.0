/* ============================================================
   ЕТИС 3.0 by Комар
   ============================================================ */

'use strict';

// ============================================================
// РАСПИСАНИЕ ПАР (время начала и конца)
// ============================================================

const PAIR_SCHEDULE = [
	{ num: 1, start: [8,  0],  end: [9,  35]  },
	{ num: 2, start: [9,  45], end: [11, 20]  },
	{ num: 3, start: [11, 30], end: [13, 5]   },
	{ num: 4, start: [13, 35], end: [15, 10]  },
	{ num: 5, start: [15, 20], end: [16, 55]  },
	{ num: 6, start: [17, 5],  end: [18, 40]  },
	{ num: 7, start: [18, 45], end: [20, 20]  },
	{ num: 8, start: [20, 25], end: [22, 0]   },
];

function nowMinutes() {
	const d = new Date();
	return d.getHours() * 60 + d.getMinutes();
}

function getCurrentPairNum() {
	const now = nowMinutes();
	for (const p of PAIR_SCHEDULE) {
		const s = p.start[0]*60 + p.start[1];
		const e = p.end[0]*60   + p.end[1];
		if (now >= s && now <= e) return p.num;
	}
	return null;
}

function getNextPair() {
	const now = nowMinutes();
	for (const p of PAIR_SCHEDULE) {
		const s = p.start[0]*60 + p.start[1];
		if (s > now) return { ...p, minutesUntil: s - now };
	}
	return null;
}

function pairProgress() {
	const now = nowMinutes();
	for (const p of PAIR_SCHEDULE) {
		const s = p.start[0]*60 + p.start[1];
		const e = p.end[0]*60   + p.end[1];
		if (now >= s && now <= e) return Math.round((now - s) / (e - s) * 100);
	}
	return null;
}

function formatTime(h, m) {
	return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}


// ============================================================
// ТЕМА
// ============================================================

let theme = 'auto';
let prefersColorSchemeMedia;

function setDarkTheme(e) {
	document.documentElement.setAttribute('theme', e.matches ? 'dark' : 'light');
	loadAccent();
}

function setSystemThemeDetection() {
	if (window.matchMedia) {
		prefersColorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
		document.documentElement.setAttribute('theme', prefersColorSchemeMedia.matches ? 'dark' : 'light');
		prefersColorSchemeMedia.addEventListener('change', setDarkTheme);
	}
}

function removeSystemThemeDetection() {
	if (window.matchMedia && prefersColorSchemeMedia)
		prefersColorSchemeMedia.removeEventListener('change', setDarkTheme);
}

function detectTheme() {
	const saved = localStorage.getItem('theme');
	if (saved) {
		theme = saved;
		if (theme === 'auto') setSystemThemeDetection();
		else document.documentElement.setAttribute('theme', theme);
	} else {
		theme = 'auto';
		setSystemThemeDetection();
	}
}

function themeIcon(t) {
	return t === 'dark' ? 'dark_mode' : t === 'light' ? 'light_mode' : 'brightness_6';
}

function switchTheme(e) {
	const next   = { auto: 'light', light: 'dark', dark: 'auto' };
	const labels = { auto: 'Системная', light: 'Светлая', dark: 'Тёмная' };
	if (theme === 'auto') removeSystemThemeDetection();
	theme = next[theme];
	if (theme === 'auto') setSystemThemeDetection();
	else document.documentElement.setAttribute('theme', theme);
	localStorage.setItem('theme', theme);
	loadAccent();
	const a    = e.currentTarget;
	const icon = a.querySelector('.material-icons');
	const txt  = a.querySelector('.theme-label');
	if (txt)  txt.textContent = labels[theme];
	if (icon) icon.textContent = themeIcon(theme);
}

detectTheme();


// ============================================================
// АКЦЕНТНЫЙ ЦВЕТ
// ============================================================

const ACCENT_PRESETS = {
	violet: { light: '#7c6fd4', dark: '#9d8ef0', label: 'Фиолетовый' },
	blue:   { light: '#4f86f7', dark: '#7eaaff', label: 'Синий'      },
	teal:   { light: '#0d9488', dark: '#2dd4bf', label: 'Изумрудный' },
	rose:   { light: '#e11d6a', dark: '#fb7bb0', label: 'Розовый'    },
};

function applyAccent(key) {
	const preset = ACCENT_PRESETS[key] || ACCENT_PRESETS.violet;
	const isDark = document.documentElement.getAttribute('theme') === 'dark';
	const hex    = isDark ? preset.dark : preset.light;
	const r = parseInt(hex.slice(1,3),16);
	const g = parseInt(hex.slice(3,5),16);
	const b = parseInt(hex.slice(5,7),16);
	const root = document.documentElement;
	root.style.setProperty('--color-accent',         hex);
	root.style.setProperty('--color-accent-glow',     `rgba(${r},${g},${b},0.38)`);
	root.style.setProperty('--color-accent-bg',       `rgba(${r},${g},${b},0.11)`);
	root.style.setProperty('--color-accent-bg-hover', `rgba(${r},${g},${b},0.20)`);
	root.style.setProperty('--gradient-accent',       `linear-gradient(135deg,${hex},${hex}cc)`);
	root.style.setProperty('--color-text-link',       hex);
	root.style.setProperty('--color-text-accent',     hex);
}

function loadAccent() {
	applyAccent(localStorage.getItem('etis3-accent') || 'violet');
}

loadAccent();


// ============================================================
// КЭШ РАСПИСАНИЯ
// ============================================================

const CACHE_KEY    = 'etis3-tt-cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

function saveTimetableCache(html) {
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), html }));
	} catch(e) {}
}

function loadTimetableCache() {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const { ts, html } = JSON.parse(raw);
		if (Date.now() - ts > CACHE_TTL_MS) return null;
		return { html, age: Math.round((Date.now() - ts) / 60000) };
	} catch(e) { return null; }
}

function clearTimetableCache() {
	localStorage.removeItem(CACHE_KEY);
}


// ============================================================
// УТИЛИТЫ
// ============================================================

function createEl(tag, attrs = {}) {
	const el = document.createElement(tag);
	Object.entries(attrs).forEach(([k, v]) => {
		if (k === 'className')   el.className = v;
		else if (k === 'textContent') el.textContent = v;
		else if (k === 'innerHTML')   el.innerHTML = v;
		else el.setAttribute(k, v);
	});
	return el;
}

function createTooltipTriangle() {
	const xmlns = 'http://www.w3.org/2000/svg';
	const svg   = document.createElementNS(xmlns, 'svg');
	svg.setAttributeNS(null, 'width', '15');
	svg.setAttributeNS(null, 'height', '9');
	svg.setAttributeNS(null, 'viewBox', '0 0 15 9');
	svg.setAttributeNS(null, 'fill', 'none');
	svg.classList.add('sign-tooltip-triangle');
	const path = document.createElementNS(xmlns, 'path');
	path.classList.add('tooltipTriangle');
	path.setAttributeNS(null, 'd', 'M6.79289 7.79289L0.707107 1.70711C0.0771419 1.07714 0.523308 0 1.41421 0H13.5858C14.4767 0 14.9229 1.07714 14.2929 1.70711L8.20711 7.79289C7.81658 8.18342 7.18342 8.18342 6.79289 7.79289Z');
	svg.appendChild(path);
	return svg;
}

function showToast(text, duration = 2400) {
	let container = document.getElementById('etis3-toasts');
	if (!container) {
		container = createEl('div', { id: 'etis3-toasts' });
		document.body.appendChild(container);
	}
	const toast = createEl('div', { className: 'etis3-toast', textContent: text });
	container.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add('etis3-toast--show'));
	setTimeout(() => {
		toast.classList.remove('etis3-toast--show');
		setTimeout(() => toast.remove(), 380);
	}, duration);
}


// ============================================================
// АНИМАЦИИ ПОЯВЛЕНИЯ
// ============================================================

function animatePageIn() {
	const sidebar = document.querySelector('.span3');
	if (sidebar) {
		sidebar.style.cssText += 'opacity:0;transform:translateX(-12px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			sidebar.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
			sidebar.style.opacity    = '1';
			sidebar.style.transform  = 'translateX(0)';
		}));
	}

	const h3 = document.querySelector('.span9 > h3');
	if (h3) {
		h3.style.cssText += 'opacity:0;transform:translateX(-10px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			h3.style.transition = 'opacity 0.30s ease 0.08s, transform 0.30s ease 0.08s';
			h3.style.opacity    = '1';
			h3.style.transform  = 'translateX(0)';
		}));
	}

	const cards = document.querySelectorAll(
		'.day, table.common, table.slimtab_nice, .nav.msg, .nav.answ, .teacher_info, .form, .next-pair-widget'
	);
	cards.forEach((el, i) => {
		el.style.cssText += 'opacity:0;transform:translateY(16px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			const delay = 80 + i * 50;
			el.style.transition = `opacity 0.36s ease ${delay}ms, transform 0.36s ease ${delay}ms`;
			el.style.opacity    = '1';
			el.style.transform  = 'translateY(0)';
		}));
	});
}


// ============================================================
// ПОИСК ПО САЙДБАРУ
// ============================================================

function addSidebarSearch(sidebar) {
	const wrap  = createEl('div', { className: 'sidebar-search-wrap' });
	const icon  = createEl('span', { className: 'material-icons sidebar-search-icon', textContent: 'search' });
	const input = createEl('input', { type: 'text', placeholder: 'Поиск по меню…', className: 'sidebar-search-input' });
	wrap.appendChild(icon);
	wrap.appendChild(input);
	sidebar.insertBefore(wrap, sidebar.firstChild);

	const allLinks = sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked > li');
	input.addEventListener('input', () => {
		const q = input.value.trim().toLowerCase();
		allLinks.forEach(li => {
			const match = !q || li.textContent.trim().toLowerCase().includes(q);
			li.style.display    = match ? '' : 'none';
			li.style.background = (match && q) ? 'var(--color-accent-bg)' : '';
		});
	});
	input.addEventListener('keydown', e => {
		if (e.key === 'Escape') { input.value = ''; input.dispatchEvent(new Event('input')); }
	});
}


// ============================================================
// ИКОНКА ВКЛАДКИ
// ============================================================

function setIcon() {
	const icon = createEl('link', { rel: 'icon', type: 'image/svg+xml', href: chrome.runtime.getURL('icon.svg') });
	document.querySelector('head').appendChild(icon);
}


// ============================================================
// САЙДБАР
// ============================================================

function styleSidebar(sidebar) {
	requestAnimationFrame(() => {
		const top = sessionStorage.getItem('sidebar-scroll');
		if (top) sidebar.scrollTop = parseInt(top, 10);
		window.addEventListener('beforeunload', () => {
			sessionStorage.setItem('sidebar-scroll', Math.round(sidebar.scrollTop));
		});
	});

	sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked > li').forEach(li => {
		const a = li.querySelector('a');
		if (a && a.href === window.location.href) li.classList.add('active');
	});

	const nav = sidebar.querySelector('ul:nth-last-child(1)');
	if (nav) {
		const li            = createEl('li');
		const switcher      = createEl('a', { className: 'theme-switcher-btn' });
		const switcherIcon  = createEl('span', { className: 'material-icons', textContent: themeIcon(theme) });
		const switcherLabel = createEl('span', { className: 'theme-label', textContent: { auto: 'Системная', light: 'Светлая', dark: 'Тёмная' }[theme] });
		switcher.appendChild(switcherIcon);
		switcher.appendChild(switcherLabel);
		switcher.addEventListener('click', switchTheme);
		li.appendChild(switcher);
		nav.prepend(li);

		const iconMap = {
			null:                         'brightness_6',
			'stu.change_pass_form':       'vpn_key',
			'stu_email_pkg.change_email': 'alternate_email',
			'stu.change_pr_page':         'account_box',
			'stu.logout':                 'exit_to_app',
		};
		nav.querySelectorAll('li > a').forEach(a => {
			const name = iconMap[a.getAttribute('href')] ?? null;
			if (name) a.prepend(createEl('span', { className: 'material-icons', textContent: name }));
		});
	}

	sidebar.querySelectorAll('li').forEach(li => {
		const a    = li.querySelector('a');
		const href = a && a.getAttribute('href');
		if (href === 'stu_plus.add_snils' || href === 'ebl_stu.ebl_choice' || li.classList.contains('warn_menu'))
			a.appendChild(createEl('span', { className: 'badge-point' }));
	});

	addSidebarSearch(sidebar);

	// Подпись ЕТИС 3.0 by Комар внизу сайдбара
	const branding = createEl('div', { className: 'etis3-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	sidebar.appendChild(branding);
}


// ============================================================
// СТРАНИЦЫ — диспетчер
// ============================================================

function stylePages() {
	const page  = window.location.pathname.split('/').pop();
	const login = document.querySelector('body > div.login');

	if (login) { styleLoginPage(page); return; }

	const sidebar = document.querySelector('div.span3');
	if (sidebar) styleSidebar(sidebar);

	const span9    = document.querySelector('div.span9');
	const pageMode = new URLSearchParams(window.location.search).get('p_mode');

	const warning = document.querySelector('div.warning');
	if (warning && span9) span9.prepend(warning);

	animatePageIn();

	switch (page) {
		case 'stu.teach_plan':             stylePage_teachPlan(span9, pageMode);  break;
		case 'stu.tpr':                    stylePage_tpr(span9);                  break;
		case 'stu.teachers':               stylePage_teachers(span9);             break;
		case 'stu.sc_portfolio':           stylePage_portfolio(span9);            break;
		case 'stu.timetable':              stylePage_timetable(span9);            break;
		case 'stu.change_pass_form':
		case 'stu.change_pass':            stylePage_changePass(span9);           break;
		case 'stu_email_pkg.change_email': stylePage_changeEmail(span9);          break;
		case 'stu.announce':               stylePage_announce();                   break;
		case 'stu.teacher_notes':          stylePage_teacherNotes();              break;
		case 'cert_pkg.stu_certif':        stylePage_certif(span9);               break;
		case 'stu.signs':                  stylePage_signs(span9, pageMode);      break;
	}
}


// ============================================================
// ЛОГИН
// ============================================================

function styleLoginPage(page) {
	document.body.innerHTML = '<div class="login-container">' + document.body.innerHTML + '</div>';
	const loginContainer = document.querySelector('div.login-container');
	const loginItems     = document.querySelector('#form > div.items');
	const loginActions   = createEl('div', { className: 'login-actions' });
	loginItems.appendChild(loginActions);

	if (page !== 'stu_email_pkg.send_r_email') {
		document.querySelector('div.choose')?.remove();
		document.getElementById('form').prepend(createEl('div', { className: 'psu-logo' }));
		const forgot = loginItems.querySelector('a');
		if (forgot) { forgot.className = 'forgot-password'; loginActions.appendChild(forgot); }
	}
	document.getElementById('sbmt') && loginActions.appendChild(document.getElementById('sbmt'));

	loginItems.querySelectorAll('div.item').forEach(item => {
		const err = item.querySelector('div.error_message');
		if (err) { loginContainer.prepend(err); item.remove(); return; }
		const inp = item.querySelector('input');
		if (inp) inp.placeholder = ' ';
		const lbl = item.querySelector('label');
		if (lbl) item.appendChild(lbl);
	});

	if (page !== 'stu_email_pkg.send_r_email') {
		const infoStr = loginItems.textContent.split('\n').slice(-3)[0].trim();
		const footer  = document.querySelector('div.header_message');
		footer.className = 'footer';
		footer.innerHTML = '<p>' + footer.innerHTML + '</p><p>' + infoStr + '</p>';
		loginContainer.appendChild(footer);
	}

	// Бренд на странице входа
	const brand = createEl('div', { className: 'login-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	loginContainer.appendChild(brand);

	const form = document.querySelector('.login form, .login #form');
	if (form) {
		form.style.cssText += 'opacity:0;transform:translateY(28px) scale(0.97)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			form.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
			form.style.opacity    = '1';
			form.style.transform  = 'translateY(0) scale(1)';
		}));
	}
}


// ============================================================
// УЧЕБНЫЙ ПЛАН
// ============================================================

function stylePage_teachPlan(span9, pageMode) {
	if (!span9) return;
	if (pageMode === 'advanced') {
		const a = span9.querySelector('a:nth-child(2)');
		if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
	} else {
		const d = span9.querySelector('div:nth-child(2)');
		if (d) d.className = 'teach-plan';
		const a = span9.querySelector('div:nth-child(2) > div > a');
		if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
	}
}

function stylePage_tpr(span9) {
	if (!span9) return;
	const a = span9.querySelector('a');
	if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
}


// ============================================================
// ПРЕПОДАВАТЕЛИ
// ============================================================

function stylePage_teachers(span9) {
	if (!span9) return;
	const a = span9.querySelector('a');
	if (a) a.className = 'icon-button icon-analytics';
	span9.querySelectorAll('.teacher_desc').forEach(desc => {
		['teacher_name', 'chair'].forEach(cls => {
			const container = desc.querySelector('.' + cls);
			const img = container && container.querySelector('img');
			if (!img) return;
			const btn = createEl('a', { className: 'icon-button2', textContent: 'today' });
			btn.setAttribute('onclick', img.getAttribute('onclick'));
			btn.title = img.title;
			img.remove();
			container.appendChild(btn);
		});
	});
}


// ============================================================
// ПОРТФОЛИО
// ============================================================

function stylePage_portfolio(span9) {
	if (!span9) return;
	span9.querySelectorAll('img[name="load_doc"]').forEach(img => {
		const btn = createEl('a', { className: 'icon-button2', textContent: 'attach_file' });
		['name','data-tab','data-term','data-ttp','data-dis'].forEach(a => btn.setAttribute(a, img.getAttribute(a)));
		btn.setAttribute('onclick', 'get_files()');
		img.parentNode.prepend(btn);
		img.remove();
	});
}


// ============================================================
// РАСПИСАНИЕ
// ============================================================

// Определяем тип пары по тексту
function getPairTypeIcon(text) {
	const t = (text || '').toLowerCase();
	if (t.includes('лек'))   return { icon: 'menu_book',     label: 'Лекция',       cls: 'pair-type--lec'  };
	if (t.includes('лаб'))   return { icon: 'science',        label: 'Лаб. работа',  cls: 'pair-type--lab'  };
	if (t.includes('практ')) return { icon: 'edit_note',      label: 'Практика',     cls: 'pair-type--prac' };
	if (t.includes('сем'))   return { icon: 'groups',         label: 'Семинар',      cls: 'pair-type--sem'  };
	if (t.includes('конс'))  return { icon: 'support_agent',  label: 'Консультация', cls: 'pair-type--cons' };
	return null;
}

// Виджет следующей/текущей пары
function buildNextPairWidget(span9) {
	const currentNum = getCurrentPairNum();
	const next       = getNextPair();
	const progress   = pairProgress();

	// Собираем данные пар из DOM
	const pairsData = {};
	span9.querySelectorAll('div.day').forEach(day => {
		// Проверяем, сегодня ли этот день
		const h3text = day.querySelector('h3')?.textContent || '';
		const todayD = new Date().getDate();
		if (!h3text.includes(String(todayD))) return;

		day.querySelectorAll('table tbody tr').forEach(row => {
			const numEl = row.querySelector('.pair_num .eval');
			const disEl = row.querySelector('.pair_info .dis a');
			const audEl = row.querySelector('.pair_info .aud');
			if (!numEl || !disEl) return;
			const num = parseInt(numEl.textContent.trim());
			if (!isNaN(num)) {
				pairsData[num] = {
					name: disEl.textContent.trim(),
					aud:  audEl?.textContent.trim() || '',
				};
			}
		});
	});

	const widget = createEl('div', { className: 'next-pair-widget' });

	if (currentNum && pairsData[currentNum]) {
		// Идёт пара прямо сейчас
		const p     = PAIR_SCHEDULE[currentNum - 1];
		const info  = pairsData[currentNum];
		const endT  = formatTime(p.end[0], p.end[1]);
		const minsLeft = (p.end[0]*60 + p.end[1]) - nowMinutes();

		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">play_circle</span>
				<span>Сейчас идёт · пара ${currentNum}</span>
				<span class="npw-time-badge">до ${endT} · ещё ${minsLeft} мин</span>
			</div>
			<div class="npw-name">${info.name}</div>
			${info.aud ? `<div class="npw-aud"><span class="material-icons">room</span>${info.aud}</div>` : ''}
			<div class="npw-progress-bar"><div class="npw-progress-fill" style="width:${progress}%"></div></div>
		`;
		widget.classList.add('npw--active');
	} else if (next && pairsData[next.num]) {
		// Следующая пара
		const info  = pairsData[next.num];
		const p     = PAIR_SCHEDULE[next.num - 1];
		const startT = formatTime(p.start[0], p.start[1]);

		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">schedule</span>
				<span>Следующая пара · ${next.num}</span>
				<span class="npw-time-badge">в ${startT} · через ${next.minutesUntil} мин</span>
			</div>
			<div class="npw-name">${info.name}</div>
			${info.aud ? `<div class="npw-aud"><span class="material-icons">room</span>${info.aud}</div>` : ''}
		`;
		widget.classList.add('npw--next');
	} else {
		// Пар больше нет
		widget.innerHTML = `
			<div class="npw-label">
				<span class="material-icons npw-icon">check_circle</span>
				<span>На сегодня пар больше нет</span>
			</div>
		`;
		widget.classList.add('npw--done');
	}

	return widget;
}

function stylePage_timetable(span9) {
	if (!span9) return;

	// Кэш — сохраняем HTML расписания
	const cacheKey  = 'etis3-tt-cache-' + window.location.search;
	const timetableEl = span9.querySelector('.timetable, div.day');

	// Проверяем есть ли кэш и стоит ли показать плашку
	const cached = loadTimetableCache();

	// Сохраняем в кэш текущее состояние
	if (timetableEl) {
		saveTimetableCache(span9.innerHTML.substring(0, 50000));
	}

	// Запомнить неделю
	span9.querySelectorAll('.weeks .week > a').forEach(a => {
		a.addEventListener('click', () => {
			try {
				const p = new URL(a.href).searchParams.get('p_week');
				if (p) localStorage.setItem('etis3-last-week', p);
			} catch(e) {}
		});
	});

	// Виджет следующей пары — строим после обработки строк
	// (сначала нужно обработать строки чтоб данные были в DOM)

	// Панель кнопок
	const buttonbar = createEl('div', { className: 'timetable-buttonbar' });
	span9.prepend(buttonbar);

	const consultDiv = span9.querySelector('div:nth-child(6)');
	if (consultDiv) { consultDiv.className = 'timetable-btn consultations'; buttonbar.appendChild(consultDiv); }

	const feedbackBtn = span9.querySelector('a.estimate_tt');
	if (feedbackBtn) { feedbackBtn.className = 'timetable-btn icon-button icon-feedback'; feedbackBtn.text = 'Оставить отзыв'; buttonbar.appendChild(feedbackBtn); }

	const todayBtn = span9.querySelector('a:nth-child(5)');
	if (todayBtn) { todayBtn.className = 'timetable-btn icon-button icon-today'; buttonbar.appendChild(todayBtn); }

	const copyBtn = createEl('a', { className: 'timetable-btn icon-button icon-copy', textContent: 'Скопировать' });
	copyBtn.style.cursor = 'pointer';
	copyBtn.addEventListener('click', () => copyTimetable(span9));
	buttonbar.appendChild(copyBtn);

	// Если есть кэш — кнопка "обновлено N мин назад"
	if (cached) {
		const cacheInfo = createEl('span', {
			className: 'timetable-cache-label',
			textContent: `обновлено ${cached.age} мин назад`,
		});
		buttonbar.appendChild(cacheInfo);
	}

	// Перенос преподавателя + тип пары + подсветка текущей
	const currentNum = getCurrentPairNum();

	span9.querySelectorAll('div.day > table > tbody > tr').forEach(row => {
		// Перенос преподавателя
		const teacher = row.querySelector('span.teacher');
		if (teacher) {
			const td = createEl('td', { className: 'pair_teacher', innerHTML: teacher.innerHTML });
			row.appendChild(td);
			row.querySelector('td.pair_jour')?.remove();
			teacher.remove();
		}

		// Тип пары — иконка
		const disLink = row.querySelector('.pair_info .dis a');
		if (disLink) {
			const fullText = disLink.textContent;
			const typeInfo = getPairTypeIcon(fullText);
			if (typeInfo) {
				// Убираем текстовый тип из названия
				const cleanName = fullText
					.replace(/\(лек\.?\)/i, '')
					.replace(/\(лаб\.?\)/i, '')
					.replace(/\(практ\.?\)/i, '')
					.replace(/\(сем\.?\)/i, '')
					.replace(/\(конс\.?\)/i, '')
					.trim();
				disLink.textContent = cleanName;

				const typeChip = createEl('span', { className: `pair-type-chip ${typeInfo.cls}` });
				const typeIcon = createEl('span', { className: 'material-icons', textContent: typeInfo.icon });
				const typeLbl  = createEl('span', { textContent: typeInfo.label });
				typeChip.appendChild(typeIcon);
				typeChip.appendChild(typeLbl);
				typeChip.title = typeInfo.label;

				const disCell = row.querySelector('.pair_info');
				if (disCell) disCell.appendChild(typeChip);
			}
		}

		// Подсветка текущей пары
		const numEl = row.querySelector('.pair_num .eval');
		if (numEl && currentNum) {
			const num = parseInt(numEl.textContent.trim());
			if (num === currentNum) {
				row.classList.add('pair-row--active');
				// Прогресс внутри ячейки номера
				const prog = pairProgress();
				if (prog !== null) {
					const bar  = createEl('div', { className: 'pair-progress-bar' });
					const fill = createEl('div', { className: 'pair-progress-fill' });
					fill.style.height = prog + '%';
					bar.appendChild(fill);
					row.querySelector('.pair_num')?.appendChild(bar);
				}
			}
		}
	});

	// Виджет ПОСЛЕ обработки строк
	const widget = buildNextPairWidget(span9);
	// Вставляем перед первым .day
	const firstDay = span9.querySelector('div.day');
	if (firstDay) span9.insertBefore(widget, firstDay);
	else span9.prepend(widget);

	// Скролл к сегодня
	const todayNum = new Date().getDate();
	span9.querySelectorAll('div.day h3').forEach(h3 => {
		if (h3.textContent.includes(String(todayNum))) {
			setTimeout(() => h3.closest('.day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
		}
	});

	// Обновляем виджет каждую минуту
	setInterval(() => {
		const newWidget = buildNextPairWidget(span9);
		widget.replaceWith(newWidget);
	}, 60000);
}

function copyTimetable(span9) {
	const lines = [];
	span9.querySelectorAll('div.day').forEach(day => {
		const title = day.querySelector('h3')?.textContent.replace(/\s+/g,' ').trim() || '';
		lines.push('\n' + title.toUpperCase());
		day.querySelectorAll('table tbody tr').forEach(row => {
			const num  = row.querySelector('.pair_num .eval')?.textContent.trim();
			const dis  = row.querySelector('.pair_info .dis a')?.textContent.trim();
			const aud  = row.querySelector('.pair_info .aud')?.textContent.trim();
			const tchr = row.querySelector('.pair_teacher a')?.textContent.trim();
			if (dis) lines.push(`  ${num ? num+' ' : ''}${dis}${aud ? ' · '+aud : ''}${tchr ? ' — '+tchr : ''}`);
		});
		const noPairs = day.querySelector('.no_pairs')?.textContent.trim();
		if (noPairs) lines.push('  ' + noPairs);
	});
	navigator.clipboard.writeText(lines.join('\n'))
		.then(() => showToast('📋 Расписание скопировано'))
		.catch(() => showToast('Не удалось скопировать'));
}


// ============================================================
// СМЕНА ПАРОЛЯ / EMAIL
// ============================================================

function stylePage_changePass(span9) {
	if (!span9) return;
	const form  = span9.querySelector('.form');
	const items = createEl('div', { className: 'items' });
	form.prepend(items);
	form.prepend(span9.querySelector('h3'));
	const labels = form.querySelectorAll('label');
	const inputs = form.querySelectorAll('input');
	for (let i = 0; i < inputs.length; i++) {
		inputs[i].placeholder = ' ';
		const item = createEl('div', { className: 'item' });
		item.appendChild(inputs[i]);
		item.appendChild(labels[i]);
		items.appendChild(item);
	}
}

function stylePage_changeEmail(span9) {
	if (!span9) return;
	const form = span9.querySelector('.form');
	const info = span9.querySelector('div');
	info.className = 'form-info';
	const wrap = createEl('div', { className: 'items' });
	form.prepend(wrap);
	form.prepend(info);
	form.prepend(span9.querySelector('h3'));
	const label = form.querySelector('label');
	const input = form.querySelector('#email');
	if (input) input.placeholder = ' ';
	const item = createEl('div', { className: 'item' });
	if (input) item.appendChild(input);
	if (label) item.appendChild(label);
	wrap.appendChild(item);
}


// ============================================================
// ОБЪЯВЛЕНИЯ / СООБЩЕНИЯ
// ============================================================

function stylePage_announce() {
	document.querySelectorAll('.nav.msg').forEach(msg => {
		msg.classList.add('message');
		const header = createEl('li', { className: 'message-header' });
		msg.prepend(header);
		const title = msg.querySelector('font[style="font-weight:bold"]');
		const time  = msg.querySelector('font[color="#808080"]');
		if (time) time.innerText = time.innerText.substring(0, time.innerText.length - 3);
		header.appendChild(title || createEl('font'));
		if (time) header.appendChild(time);
		const brs = msg.querySelectorAll('li > br');
		brs[0]?.remove(); brs[1]?.remove();
	});
}

function stylePage_teacherNotes() {
	document.querySelector('.weeks')?.classList.add('message-pages');
	document.querySelectorAll('.nav.msg').forEach(msg => {
		msg.classList.add('message');
		if (msg.className.match(/repl_s/)) return;

		const header = createEl('li', { className: 'message-header' });
		msg.insertBefore(header, msg.children[0]);

		const teacher    = msg.querySelector('b');
		const title      = msg.querySelector('font[style="font-weight:bold"]');
		const time       = msg.querySelector('font[color="#808080"]');
		if (time) time.innerText = time.innerText.substring(0, time.innerText.length - 3);
		const discipline = msg.querySelector('font[title="Показать все сообщения по этой дисциплине"]');

		const main = createEl('div', { className: 'message-info main-info' });
		const sec  = createEl('div', { className: 'message-info secondary-info' });
		if (teacher)    main.appendChild(teacher);
		if (title)      main.appendChild(title);
		if (time)       sec.appendChild(time);
		if (discipline) sec.appendChild(discipline);
		header.append(main, sec);

		const brs = msg.querySelectorAll('li > br');
		[0, 1, 2, brs.length - 2, brs.length - 1].forEach(i => brs[i]?.remove());

		const body = msg.querySelectorAll('li')[1];
		if (body) body.innerHTML = body.innerHTML.substring('&nbsp;&nbsp;&nbsp;'.length);

		const answerWrapper = createEl('li', { className: 'answer-wrapper' });
		const answerInput   = msg.querySelector('input[type="button"]');
		const answerButton  = createEl('button', { textContent: 'Добавить ответ' });
		if (answerInput) {
			answerButton.setAttribute('id', answerInput.id);
			answerButton.setAttribute('onclick', answerInput.getAttribute('onclick'));
		}
		answerButton.addEventListener('click', () => {
			answerButton.remove(); answerWrapper.remove();
			const count    = msg.querySelectorAll('li').length;
			const prevLast = msg.querySelector('li:nth-last-child(3)');
			const lastLi   = msg.querySelector('li:nth-last-child(2)');
			if (count > 2) {
				if (prevLast) prevLast.style = 'padding-bottom: 0 !important';
				if (lastLi)   lastLi.style.paddingBottom = '3.2rem';
			} else {
				if (prevLast) prevLast.style = 'padding-bottom: 1.8rem !important';
			}
		});
		answerInput?.remove();
		answerWrapper.appendChild(answerButton);
		msg.appendChild(answerWrapper);
	});
}


// ============================================================
// СПРАВКИ
// ============================================================

function stylePage_certif(span9) {
	if (!span9) return;
	const info = span9.querySelector('span[style="color:#00b050;font-size:1.2em;font-weight:bold;"]');
	if (info) info.className = 'certificates-info';

	span9.querySelectorAll('.ord-name').forEach(ord => {
		const img = ord.querySelector('img');
		if (!img) return;
		const btn = createEl('a', { className: 'icon-button2', textContent: 'description' });
		btn.setAttribute('onclick', img.getAttribute('onclick'));
		btn.title = img.title;
		img.remove(); ord.prepend(btn); ord.classList.add('flex-row');
	});
	span9.querySelectorAll('font[color="blue"]').forEach(font => {
		const img = span9.querySelector('img[src="/etis/pic/text-2.png"]');
		if (!img) return;
		const btn = createEl('a', { className: 'icon-button2', textContent: 'description' });
		btn.setAttribute('onclick', img.getAttribute('onclick'));
		btn.title = img.title;
		img.remove(); font.append(btn); font.classList.add('flex-row');
	});
}


// ============================================================
// ОЦЕНКИ
// ============================================================

function stylePage_signs(span9, pageMode) {
	if (!span9 || pageMode !== 'current') return;

	let tooltipWrapper;
	const tooltipElem     = createEl('div', { className: 'sign-tooltip' });
	const tooltipTriangle = createTooltipTriangle();

	const renderTooltip = (e) => {
		let target = e.target;
		if (target.nodeName !== 'TD') target = target.parentNode;
		const a = target.querySelector('a');
		if (!a || !a.dataset.tooltip || tooltipWrapper) return;
		tooltipWrapper = createEl('div', { className: 'sign-tooltip-wrapper' });
		tooltipElem.innerText = a.dataset.tooltip;
		const isDark = document.documentElement.getAttribute('theme') === 'dark';
		tooltipTriangle.firstChild.setAttributeNS(null, 'fill', isDark ? 'rgba(30,27,55,0.96)' : 'rgba(255,255,255,0.95)');
		tooltipWrapper.append(tooltipElem, tooltipTriangle);
		document.body.appendChild(tooltipWrapper);
		const c    = target.getBoundingClientRect();
		let left   = (c.left + c.width / 2) - (tooltipWrapper.offsetWidth / 2);
		let top    = c.top - tooltipWrapper.offsetHeight;
		if (top < 0) {
			top = c.top + target.offsetHeight;
			tooltipTriangle.style.bottom    = '-2px';
			tooltipTriangle.style.transform = 'scale(1, -1)';
			tooltipWrapper.style.flexDirection = 'column-reverse';
		} else {
			tooltipTriangle.style.bottom    = '2px';
			tooltipTriangle.style.transform = 'scale(1, 1)';
		}
		tooltipWrapper.style.left = left + 'px';
		tooltipWrapper.style.top  = top  + 'px';
	};

	const removeTooltip = () => { if (tooltipWrapper) { tooltipWrapper.remove(); tooltipWrapper = null; } };
	document.addEventListener('wheel', removeTooltip);

	document.querySelectorAll('table.common').forEach(table => {
		let idx = 0;
		table.querySelectorAll('a').forEach(a => {
			if (a.getAttribute('href')?.split('?')[0] !== 'stu.theme') return;
			a.setAttribute('data-tooltip', a.innerText);
			a.innerHTML = 'КТ ' + (++idx);
			a.addEventListener('mouseover', renderTooltip);
			a.parentNode.addEventListener('mouseover', renderTooltip);
			a.parentNode.addEventListener('mouseout', removeTooltip);
		});
		styleSignsRows(table);
	});
}

function styleSignsRows(table) {
	table.querySelectorAll('tbody > tr').forEach(row => {
		const scores = [];
		row.querySelectorAll('td').forEach(td => {
			const n = parseFloat(td.textContent.trim());
			if (!isNaN(n) && n >= 0 && n <= 10) scores.push(n);
		});
		if (!scores.length) return;
		const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
		const filled = scores.filter(s => s > 0).length;
		row.classList.remove('row-green', 'row-yellow', 'row-red');
		if (avg >= 7)      row.classList.add('row-green');
		else if (avg >= 4) row.classList.add('row-yellow');
		else               row.classList.add('row-red');
		const firstCell = row.querySelector('td:first-child');
		if (firstCell && scores.length > 0) {
			const pct  = Math.round((filled / scores.length) * 100);
			const bar  = createEl('div', { className: 'kt-progress' });
			const fill = createEl('div', { className: 'kt-progress-fill' });
			fill.style.width = pct + '%';
			bar.appendChild(fill);
			firstCell.appendChild(bar);
		}
	});
}


// ============================================================
// MAIN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
	setIcon();
	stylePages();
});
