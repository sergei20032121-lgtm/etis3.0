/* ============================================================
   ЕТИС 3.0 by Комар
   ============================================================ */

'use strict';

// ============================================================
// РАСПИСАНИЕ ПАР (время начала и конца)
// ============================================================
// Значения по умолчанию — звонки ПГНИУ. На странице расписания время начала
// уточняется из самой таблицы (learnPairTimes), пара длится 1 ч 35 мин.

const PAIR_LENGTH_MIN = 95;

const PAIR_SCHEDULE = [
	{ num: 1, start: [8,  0],  end: [9,  35]  },
	{ num: 2, start: [9,  45], end: [11, 20]  },
	{ num: 3, start: [11, 30], end: [13, 5]   },
	{ num: 4, start: [13, 30], end: [15, 5]   },
	{ num: 5, start: [15, 15], end: [16, 50]  },
	{ num: 6, start: [17, 0],  end: [18, 35]  },
	{ num: 7, start: [18, 40], end: [20, 15]  },
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

function pairProgress() {
	const now = nowMinutes();
	for (const p of PAIR_SCHEDULE) {
		const s = p.start[0]*60 + p.start[1];
		const e = p.end[0]*60   + p.end[1];
		if (now >= s && now <= e) return Math.round((now - s) / (e - s) * 100);
	}
	return null;
}

function formatDuration(mins) {
	if (mins < 60) return `${mins} мин`;
	const h = Math.floor(mins / 60), m = mins % 60;
	return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function formatTime(h, m) {
	return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}


// ============================================================
// НАСТРОЙКИ
// ============================================================
// Источник правды — chrome.storage.local. Копия в localStorage сайта
// нужна только чтобы на document_start применить тему без мигания.

let settings = etis3Normalize(readSettingsMirror() || etis3FromLegacy(localStorage));

function readSettingsMirror() {
	try { return JSON.parse(localStorage.getItem(ETIS3_STORAGE_KEY)); } catch (e) { return null; }
}

function writeSettingsMirror() {
	try { localStorage.setItem(ETIS3_STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
}

function saveSettings(patch) {
	settings = etis3Normalize({ ...settings, ...patch });
	writeSettingsMirror();
	etis3StorageSet(settings);
	applySettings();
}

// Всё, что можно применить без перезагрузки страницы
function applySettings() {
	applyTheme();
	const root = document.documentElement;
	root.style.setProperty('font-size', settings.fontSize + 'px', 'important');
	root.classList.toggle('etis3-compact',      settings.compact);
	root.classList.toggle('etis3-no-highlight', !settings.highlight);
	root.classList.toggle('etis3-no-widget',    !settings.widget);
	root.classList.toggle('etis3-no-pairtypes', !settings.pairTypes);
	root.classList.toggle('etis3-no-scoredots', !settings.scoreDots);
	syncThemeSwitcher();
	document.getElementById('etis3-sp-panel')?.etis3Render?.();
}

async function initSettings() {
	const stored = await etis3StorageGet();
	if (stored) {
		settings = etis3Normalize(stored);
	} else {
		// Первый запуск или миграция со старых ключей localStorage
		etis3StorageSet(settings);
	}
	writeSettingsMirror();
	applySettings();

	// Мусор от версий до 3.2: кэш расписания, который никогда не читался
	try { ['etis3-tt-cache', 'etis3-last-week'].forEach(k => localStorage.removeItem(k)); } catch (e) {}

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !changes[ETIS3_STORAGE_KEY]) return;
		settings = etis3Normalize(changes[ETIS3_STORAGE_KEY].newValue);
		writeSettingsMirror();
		applySettings();
	});
}


// ============================================================
// ТЕМА
// ============================================================

const THEME_LABELS = { auto: 'Системная', light: 'Светлая', dark: 'Тёмная' };
const prefersDark  = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

prefersDark?.addEventListener('change', () => { if (settings.theme === 'auto') applyTheme(); });

function applyTheme() {
	document.documentElement.setAttribute('theme', etis3IsDark(settings.theme) ? 'dark' : 'light');
	applyAccent(settings.accent);
}

function themeIcon(t) {
	return t === 'dark' ? 'dark_mode' : t === 'light' ? 'light_mode' : 'brightness_6';
}

function switchTheme() {
	const next = { auto: 'light', light: 'dark', dark: 'auto' };
	saveSettings({ theme: next[settings.theme] });
}

function syncThemeSwitcher() {
	const btn = document.querySelector('.theme-switcher-btn');
	if (!btn) return;
	const icon = btn.querySelector('.material-icons');
	const txt  = btn.querySelector('.theme-label');
	if (icon) icon.textContent = themeIcon(settings.theme);
	if (txt)  txt.textContent  = THEME_LABELS[settings.theme];
}


// ============================================================
// АКЦЕНТНЫЙ ЦВЕТ
// ============================================================

function applyAccent(key) {
	const preset = ETIS3_ACCENTS[key] || ETIS3_ACCENTS.violet;
	const isDark = document.documentElement.getAttribute('theme') === 'dark';
	const hex    = isDark ? preset.dark : preset.light;
	const rgb    = etis3HexToRgb(hex);
	const root   = document.documentElement;
	root.style.setProperty('--color-accent',         hex);
	root.style.setProperty('--color-accent-rgb',     rgb);
	root.style.setProperty('--color-accent-glow',     `rgba(${rgb},0.38)`);
	root.style.setProperty('--color-accent-bg',       `rgba(${rgb},0.11)`);
	root.style.setProperty('--color-accent-bg-hover', `rgba(${rgb},0.20)`);
	root.style.setProperty('--gradient-accent',       `linear-gradient(135deg,${hex},${hex}cc)`);
	root.style.setProperty('--color-text-link',       hex);
	root.style.setProperty('--color-text-accent',     hex);
}

applySettings();
initSettings();


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

	// ЕТИС иногда помечает активными несколько пунктов (учебный план + дисциплины по выбору) —
	// если есть точное совпадение с адресом, подсвечиваем только его
	const items = [...sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked > li')];
	const exact = items.filter(li => li.querySelector('a')?.href === window.location.href);
	if (exact.length) items.forEach(li => li.classList.toggle('active', exact.includes(li)));

	const nav = sidebar.querySelector('ul:nth-last-child(1)');
	if (nav) {
		const li            = createEl('li');
		const switcher      = createEl('a', { className: 'theme-switcher-btn' });
		const switcherIcon  = createEl('span', { className: 'material-icons', textContent: themeIcon(settings.theme) });
		const switcherLabel = createEl('span', { className: 'theme-label', textContent: THEME_LABELS[settings.theme] });
		switcher.appendChild(switcherIcon);
		switcher.appendChild(switcherLabel);
		switcher.addEventListener('click', switchTheme);
		li.appendChild(switcher);
		nav.prepend(li);

		const iconMap = {
			'stu.change_pass_form':       'vpn_key',
			'stu_email_pkg.change_email': 'alternate_email',
			'stu.change_pr_page':         'account_box',
			'stu.logout':                 'exit_to_app',
		};
		nav.querySelectorAll('li > a').forEach(a => {
			const name = iconMap[a.getAttribute('href')];
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
	addProfileCard(sidebar);

	// Прогресс-бар семестра
	addSemesterProgress(sidebar);

	// Кнопка настроек ЕТИС 3.0
	const allNavs = sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked');
	const lastNav = allNavs[allNavs.length - 1];
	if (lastNav) {
		const li = createEl('li', { className: 'etis3-settings-li' });
		const a  = createEl('a',  { className: 'etis3-settings-btn', href: '#' });
		a.innerHTML = '<span class="material-icons">tune</span><span>Настройки ЕТИС 3.0</span>';
		a.addEventListener('click', e => { e.preventDefault(); openSettingsPanel(); });
		li.appendChild(a);
		lastNav.appendChild(li);
	}

	// Подпись ЕТИС 3.0 by Комар внизу сайдбара
	const branding = createEl('div', { className: 'etis3-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	sidebar.appendChild(branding);
}


// Шапка ЕТИСа скрыта стилями — переносим ФИО и направление в сайдбар
function addProfileCard(sidebar) {
	const info = document.querySelector('.navbar .span12 > span');
	if (!info) return;
	const fullName = (info.firstChild?.textContent || '').replace(/\(.*?\)/, '').trim();
	if (!fullName) return;
	const parts = [...info.querySelectorAll(':scope > span')].map(s => s.textContent.trim()).filter(Boolean);
	const words = fullName.split(/\s+/);
	const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

	const card = createEl('div', { className: 'etis3-profile', title: fullName });
	card.appendChild(createEl('div', { className: 'etis3-profile__avatar', textContent: initials }));
	const text = createEl('div', { className: 'etis3-profile__info' });
	text.appendChild(createEl('div', { className: 'etis3-profile__name', textContent: words.slice(0, 2).join(' ') }));
	if (parts.length) text.appendChild(createEl('div', { className: 'etis3-profile__sub', textContent: parts.join(' · ') }));
	card.appendChild(text);
	sidebar.prepend(card);
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
		case 'stu.announce':
		case 'stu_ann.announces':          stylePage_announce();                   break;
		case 'stu.teacher_notes':          stylePage_teacherNotes();              break;
		case 'cert_pkg.stu_certif':        stylePage_certif(span9);               break;
		case 'stu.signs':                  stylePage_signs(span9, pageMode);      break;
		case 'stu.electr':                 stylePage_electr(span9);               break;
	}
}


// ============================================================
// ЛОГИН
// ============================================================

function styleLoginPage(page) {
	document.body.innerHTML = '<div class="login-container">' + document.body.innerHTML + '</div>';
	const loginContainer = document.querySelector('div.login-container');
	const loginItems     = document.querySelector('#form > div.items');
	if (!loginItems) return;
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
		if (footer) {
			footer.className = 'footer';
			footer.innerHTML = '<p>' + footer.innerHTML + '</p><p>' + escapeHtml(infoStr) + '</p>';
			loginContainer.appendChild(footer);
		}
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

	// Анимированный фон — частицы
	initLoginParticles(loginContainer);
}


// ============================================================
// ЧАСТИЦЫ НА СТРАНИЦЕ ВХОДА
// ============================================================

function initLoginParticles(container) {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

	const canvas = createEl('canvas', { id: 'etis3-particles' });
	container.insertBefore(canvas, container.firstChild);

	const ctx = canvas.getContext('2d');
	let W, H, particles, mouse = { x: -999, y: -999 };

	const isDark = () => document.documentElement.getAttribute('theme') === 'dark';

	function resize() {
		W = canvas.width  = window.innerWidth;
		H = canvas.height = window.innerHeight;
	}

	function getAccentRgb() {
		return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim()
			|| (isDark() ? '157,142,240' : '124,111,212');
	}

	class Particle {
		constructor(index) {
			this.reset(true);
			// Равномерное распределение по экрану при старте
			this.y = Math.random() * H;
			this.index = index;
		}

		reset(initial = false) {
			this.x     = Math.random() * W;
			this.y     = initial ? Math.random() * H : H + 20;
			this.r     = Math.random() * 2.2 + 0.6;
			this.speedY = -(Math.random() * 0.4 + 0.15);
			this.speedX = (Math.random() - 0.5) * 0.3;
			this.alpha  = Math.random() * 0.5 + 0.15;
			this.targetAlpha = this.alpha;
			this.pulse  = Math.random() * Math.PI * 2; // фаза пульсации
			this.pulseSpeed = Math.random() * 0.012 + 0.005;
			this.glow   = Math.random() > 0.75; // часть частиц с glow
		}

		update() {
			this.x    += this.speedX;
			this.y    += this.speedY;
			this.pulse += this.pulseSpeed;

			// Лёгкое притяжение к курсору
			const dx = mouse.x - this.x;
			const dy = mouse.y - this.y;
			const dist = Math.sqrt(dx*dx + dy*dy);
			if (dist < 140) {
				const force = (140 - dist) / 140 * 0.012;
				this.x += dx * force;
				this.y += dy * force;
			}

			// Пульсация прозрачности
			this.alpha = this.targetAlpha * (0.7 + 0.3 * Math.sin(this.pulse));

			if (this.y < -20) this.reset();
		}

		draw(rgb) {
			ctx.save();

			if (this.glow) {
				ctx.shadowBlur  = this.r * 8;
				ctx.shadowColor = `rgba(${rgb}, 0.6)`;
			}

			ctx.globalAlpha = this.alpha;
			ctx.fillStyle   = `rgba(${rgb}, 1)`;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function drawConnections(rgb) {
		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const dx   = particles[i].x - particles[j].x;
				const dy   = particles[i].y - particles[j].y;
				const dist = Math.sqrt(dx*dx + dy*dy);
				if (dist < 100) {
					const alpha = (1 - dist / 100) * 0.12;
					ctx.beginPath();
					ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
					ctx.lineWidth   = 0.5;
					ctx.moveTo(particles[i].x, particles[i].y);
					ctx.lineTo(particles[j].x, particles[j].y);
					ctx.stroke();
				}
			}
		}
	}

	function init() {
		resize();
		const count = Math.min(80, Math.floor(W * H / 14000));
		particles   = Array.from({ length: count }, (_, i) => new Particle(i));
	}

	let animId;
	function animate() {
		const rgb = getAccentRgb();
		ctx.clearRect(0, 0, W, H);
		drawConnections(rgb);
		particles.forEach(p => { p.update(); p.draw(rgb); });
		animId = requestAnimationFrame(animate);
	}

	window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
	window.addEventListener('resize', () => { resize(); });
	window.addEventListener('beforeunload', () => cancelAnimationFrame(animId));

	init();
	animate();
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

	// Счётчики разделов: «(0)» → «0», пустые разделы приглушаем
	span9.querySelectorAll('h3 > a.dashed > span[id$="_cnt"]').forEach(cnt => {
		const n = parseInt(cnt.textContent.replace(/\D/g, ''), 10) || 0;
		cnt.textContent = n;
		cnt.closest('h3').classList.toggle('etis3-section--empty', n === 0);
	});

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
	const now = new Date();
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

	span9.querySelectorAll('div.day > table > tbody > tr').forEach(row => {
		// Перенос преподавателя
		const teacher = row.querySelector('span.teacher');
		if (teacher) {
			const td = createEl('td', { className: 'pair_teacher', innerHTML: teacher.innerHTML });
			row.appendChild(td);
			row.querySelector('td.pair_jour')?.remove();
			teacher.remove();
		}

		// Тип пары — чип. Исходный текст «(лек.)» оставляем скрытым:
		// он виден при выключенных иконках и попадает в копирование.
		const disLink = row.querySelector('.pair_info .dis a');
		const type    = disLink && parsePairType(disLink.textContent);
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

	// Виджет и подсветка — после обработки строк, обновляются раз в минуту
	const todayBlock = findTodayBlock(span9);
	let widget = null;

	function refresh() {
		const pairs = readPairs(todayBlock);
		highlightCurrentPair(span9, pairs);

		// Виджет показываем только на неделе, где есть сегодняшний день
		if (!todayBlock) return;
		const fresh = buildNextPairWidget(pairs);
		if (widget) {
			widget.replaceWith(fresh);
		} else {
			const firstDay = span9.querySelector('div.day');
			if (firstDay) firstDay.before(fresh);
			else span9.prepend(fresh);
		}
		widget = fresh;
	}
	refresh();
	setInterval(refresh, 60 * 1000);

	if (todayBlock) {
		setTimeout(() => todayBlock.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
	}
}

function copyTimetable(span9) {
	const lines = [];
	span9.querySelectorAll('div.day').forEach(day => {
		const title = day.querySelector('h3')?.textContent.replace(/\s+/g,' ').trim() || '';
		lines.push('\n' + title.toUpperCase());
		day.querySelectorAll('table tbody tr').forEach(row => {
			const num  = row.querySelector('.pair_num .eval')?.textContent.trim(); // время начала, «8:00»
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

		// В начале текста ЕТИС ставит отступ из &nbsp; и переносы — срезаем всё до первого символа
		const body = msg.querySelectorAll('li')[1];
		if (body) body.innerHTML = body.innerHTML.replace(/^(\s|&nbsp;|<br\s*\/?>)+/i, '');

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
// ЭЛЕКТРОННЫЕ РЕСУРСЫ — логины и пароли копируются по клику
// ============================================================

function stylePage_electr(span9) {
	const table = span9?.querySelector('#resources');
	if (!table) return;
	table.querySelectorAll('tr').forEach(row => {
		const cells = row.querySelectorAll('td');
		if (cells.length < 2) return;
		[...cells].slice(1).forEach(td => {
			// «Код доступа УЗ: F9E5-…» → копируем только сам код
			const value = td.textContent.trim().replace(/^[^:]*:\s*(?=\S+$)/, '');
			if (!value || td.querySelector('a')) return;
			td.classList.add('etis3-copy');
			td.title = 'Нажми, чтобы скопировать';
			td.addEventListener('click', () => {
				navigator.clipboard.writeText(value)
					.then(() => showToast('Скопировано'))
					.catch(() => showToast('Не удалось скопировать'));
			});
		});
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
	buildSignsStats(span9);

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

		// Цветные точки рядом с каждой оценкой
		row.querySelectorAll('td').forEach(td => {
			const n = parseFloat(td.textContent.trim());
			if (isNaN(n) || n <= 0 || n > 10) return;
			const dot = createEl('span', { className: 'score-dot' });
			dot.classList.add(n >= 7 ? 'score-dot--high' : n >= 4 ? 'score-dot--mid' : 'score-dot--low');
			dot.title = `${n} / 10`;
			td.appendChild(dot);
		});
	});
}


// ============================================================
// MAIN
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
	setIcon();
	stylePages();
	initPageTransitions();
});


// ============================================================
// ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ
// ============================================================

function initPageTransitions() {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

	const overlay = createEl('div', { id: 'etis3-page-overlay' });
	document.body.appendChild(overlay);

	// Вернулись кнопкой «Назад» из bfcache — снять затемнение
	window.addEventListener('pageshow', () => overlay.classList.remove('etis3-overlay--out'));

	// Плавное затемнение перед переходом по внутренним ссылкам.
	// Слушаем на bubbling: если ссылку уже обработал скрипт ЕТИСа, не трогаем.
	document.addEventListener('click', e => {
		if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
		const a = e.target.closest('a[href]');
		if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('onclick')) return;

		const href = a.getAttribute('href');
		if (!href || href.startsWith('#')) return;

		let url;
		try { url = new URL(href, location.href); } catch (err) { return; }
		if (url.origin !== location.origin) return; // заодно отсекает javascript: и mailto:
		if (url.pathname === location.pathname && url.search === location.search && url.hash) return;

		e.preventDefault();
		overlay.classList.add('etis3-overlay--out');
		setTimeout(() => { window.location.href = url.href; }, 200);
	});
}


// ============================================================
// ПРОГРЕСС-БАР СЕМЕСТРА В САЙДБАРЕ
// ============================================================

function addSemesterProgress(sidebar) {
	// Определяем текущий семестр по дате
	const now    = new Date();
	const month  = now.getMonth() + 1; // 1-12
	const day    = now.getDate();

	let semStart, semEnd, semName;

	// Осенний семестр: сентябрь — декабрь (примерно 1 сен — 25 дек)
	// Весенний семестр: февраль — июнь (примерно 10 фев — 30 июн)
	if (month >= 9 || month === 1) {
		semName  = 'Осенний семестр';
		semStart = new Date(now.getFullYear(), 8, 1);   // 1 сен
		semEnd   = new Date(now.getFullYear(), 11, 25); // 25 дек
		if (month === 1) {
			// Январь — уже следующий год после осеннего
			semStart = new Date(now.getFullYear() - 1, 8, 1);
			semEnd   = new Date(now.getFullYear() - 1, 11, 25);
		}
	} else {
		semName  = 'Весенний семестр';
		semStart = new Date(now.getFullYear(), 1, 10);  // 10 фев
		semEnd   = new Date(now.getFullYear(), 5, 30);  // 30 июн
	}

	const total   = semEnd - semStart;
	const passed  = Math.min(Math.max(now - semStart, 0), total);
	const pct     = Math.round((passed / total) * 100);
	const weeksLeft = Math.max(0, Math.ceil((semEnd - now) / (7 * 24 * 3600 * 1000)));

	const wrap = createEl('div', { className: 'semester-progress' });
	wrap.innerHTML = `
		<div class="semester-progress__header">
			<span class="semester-progress__name">${semName}</span>
			<span class="semester-progress__pct">${pct}%</span>
		</div>
		<div class="semester-progress__bar">
			<div class="semester-progress__fill" style="width:${pct}%"></div>
		</div>
		<div class="semester-progress__sub">${weeksLeft > 0 ? `ещё ${weeksLeft} нед.` : 'семестр завершён'}</div>
	`;

	// Вставляем перед первым nav
	const firstNav = sidebar.querySelector('.nav.nav-tabs.nav-stacked');
	if (firstNav) sidebar.insertBefore(wrap, firstNav);
	else sidebar.prepend(wrap);
}





// ============================================================
// ПАНЕЛЬ НАСТРОЕК
// ============================================================

const SETTINGS_TOGGLES = {
	'РАСПИСАНИЕ': [
		['highlight', 'play_circle',   'Подсветка текущей пары', 'Выделяет пару, которая идёт сейчас'],
		['widget',    'schedule',      'Виджет следующей пары',  'Показывает, что идёт / что следующее'],
		['pairTypes', 'menu_book',     'Иконки типов пар',       'Лекция, практика, лаб. работа'],
	],
	'ИНТЕРФЕЙС': [
		['compact',   'compress',      'Компактный режим',       'Меньше отступов, больше контента'],
		['scoreDots', 'grade',         'Цветные точки у оценок', 'Индикаторы рядом с баллом'],
	],
};

function openSettingsPanel() {
	if (document.getElementById('etis3-sp-overlay')) return;

	const overlay = createEl('div', { id: 'etis3-sp-overlay' });
	const panel   = createEl('div', { id: 'etis3-sp-panel' });

	panel.innerHTML = `
		<div class="etis3-sp-head">
			<div class="etis3-sp-title">
				<span class="material-icons">tune</span>
				ЕТИС 3.0 — Настройки
			</div>
			<button class="etis3-sp-close" id="etis3-sp-close-btn">
				<span class="material-icons">close</span>
			</button>
		</div>
		<div class="etis3-sp-body">
			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">ТЕМА</div>
				<div class="etis3-sp-row3">
					${['auto', 'light', 'dark'].map(t => `
						<button class="etis3-sp-opt" data-theme="${t}">
							<span class="material-icons">${themeIcon(t)}</span>${t === 'auto' ? 'Авто' : THEME_LABELS[t]}
						</button>
					`).join('')}
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">АКЦЕНТНЫЙ ЦВЕТ</div>
				<div class="etis3-sp-accents">
					${Object.entries(ETIS3_ACCENTS).map(([key, x]) => `
						<div class="etis3-sp-swatch" data-accent="${key}" title="${x.label}"
							style="background:${x.light}"></div>
					`).join('')}
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">РАЗМЕР ТЕКСТА</div>
				<div class="etis3-sp-font-row">
					<input type="range" id="etis3-sp-font" min="${ETIS3_FONT_MIN}" max="${ETIS3_FONT_MAX}" step="0.5">
					<span id="etis3-sp-font-val"></span>
				</div>
			</div>

			${Object.entries(SETTINGS_TOGGLES).map(([title, rows]) => `
				<div class="etis3-sp-section">
					<div class="etis3-sp-section-label">${title}</div>
					<div class="etis3-sp-toggles">
						${rows.map(([key, icon, label, sub]) => `
							<div class="etis3-sp-toggle-row">
								<div class="etis3-sp-toggle-info">
									<span class="material-icons">${icon}</span>
									<div>${label}<small>${sub}</small></div>
								</div>
								<label class="etis3-sp-toggle">
									<input type="checkbox" data-setting="${key}">
									<div class="etis3-sp-track"></div>
								</label>
							</div>
						`).join('')}
					</div>
				</div>
			`).join('')}

			<div class="etis3-sp-section etis3-sp-section-last">
				<button class="etis3-sp-danger" id="etis3-sp-reset">
					<span class="material-icons">restart_alt</span>
					Сбросить все настройки
				</button>
			</div>
		</div>
	`;

	document.body.appendChild(overlay);
	document.body.appendChild(panel);

	const fontRange = panel.querySelector('#etis3-sp-font');
	const fontVal   = panel.querySelector('#etis3-sp-font-val');

	// Отрисовать текущее состояние (вызывается и при изменениях из попапа)
	function render() {
		panel.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
		panel.querySelectorAll('[data-accent]').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));
		panel.querySelectorAll('[data-setting]').forEach(el => { el.checked = settings[el.dataset.setting]; });
		fontRange.value      = settings.fontSize;
		fontVal.textContent  = settings.fontSize + 'px';
	}
	render();
	panel.etis3Render = render;

	requestAnimationFrame(() => requestAnimationFrame(() => {
		overlay.classList.add('etis3-sp-visible');
		panel.classList.add('etis3-sp-visible');
	}));

	function onKey(e) { if (e.key === 'Escape') close(); }
	function close() {
		document.removeEventListener('keydown', onKey);
		overlay.classList.remove('etis3-sp-visible');
		panel.classList.remove('etis3-sp-visible');
		setTimeout(() => { overlay.remove(); panel.remove(); }, 300);
	}

	document.addEventListener('keydown', onKey);
	overlay.addEventListener('click', close);
	panel.querySelector('#etis3-sp-close-btn').addEventListener('click', close);

	panel.querySelectorAll('[data-theme]').forEach(btn => {
		btn.addEventListener('click', () => { saveSettings({ theme: btn.dataset.theme }); render(); });
	});

	panel.querySelectorAll('[data-accent]').forEach(sw => {
		sw.addEventListener('click', () => { saveSettings({ accent: sw.dataset.accent }); render(); });
	});

	fontRange.addEventListener('input', () => {
		saveSettings({ fontSize: parseFloat(fontRange.value) });
		fontVal.textContent = settings.fontSize + 'px';
	});

	panel.querySelectorAll('[data-setting]').forEach(el => {
		el.addEventListener('change', () => saveSettings({ [el.dataset.setting]: el.checked }));
	});

	panel.querySelector('#etis3-sp-reset').addEventListener('click', () => {
		saveSettings({ ...ETIS3_DEFAULTS });
		render();
		showToast('Настройки сброшены');
	});
}


// ============================================================
// СТАТИСТИКА ОЦЕНОК
// ============================================================

function buildSignsStats(span9) {
	const allScores = [];
	const bySubj = [];

	span9.querySelectorAll('table.common').forEach(table => {
		const scores = [];
		table.querySelectorAll('tbody tr td').forEach(td => {
			const n = parseFloat(td.textContent.trim());
			if (!isNaN(n) && n > 0 && n <= 10) { scores.push(n); allScores.push(n); }
		});
		if (scores.length) {
			const th = table.querySelector('th');
			bySubj.push({ name: (th ? th.textContent.trim().slice(0,55) : 'Дисциплина'), scores });
		}
	});

	if (allScores.length < 2) return;

	const avg = arr => arr.reduce((a,b)=>a+b,0) / arr.length;
	const g   = avg(allScores).toFixed(2);
	const col = +g >= 7 ? 'var(--color-green)' : +g >= 4 ? 'var(--color-yellow)' : 'var(--color-red)';
	const pct = Math.round(allScores.filter(s=>s>=7).length / allScores.length * 100);
	const best  = bySubj.length > 1 ? [...bySubj].sort((a,b)=>avg(b.scores)-avg(a.scores))[0]  : null;
	const worst = bySubj.length > 1 ? [...bySubj].sort((a,b)=>avg(a.scores)-avg(b.scores))[0]  : null;

	const w = createEl('div', { className: 'etis3-stats-widget' });
	w.innerHTML = `
		<div class="esw-header">
			<span class="material-icons">analytics</span>
			<span class="esw-title">Статистика оценок</span>
		</div>
		<div class="esw-grid">
			<div class="esw-card">
				<div class="esw-label">Средний балл</div>
				<div class="esw-value" style="color:${col}">${g}</div>
			</div>
			<div class="esw-card">
				<div class="esw-label">Всего оценок</div>
				<div class="esw-value">${allScores.length}</div>
			</div>
			<div class="esw-card">
				<div class="esw-label">Высоких ≥7</div>
				<div class="esw-value" style="color:var(--color-green)">${pct}%</div>
			</div>
			<div class="esw-card">
				<div class="esw-label">Дисциплин</div>
				<div class="esw-value">${bySubj.length}</div>
			</div>
		</div>
		${best && worst && best.name !== worst.name ? `
		<div class="esw-extremes">
			<div class="esw-ext esw-ext-best">
				<span class="material-icons">emoji_events</span>
				<div>
					<div class="esw-ext-label">Лучше всего</div>
					<div class="esw-ext-name">${escapeHtml(best.name)}</div>
					<div class="esw-ext-val">${avg(best.scores).toFixed(1)} / 10</div>
				</div>
			</div>
			<div class="esw-ext esw-ext-worst">
				<span class="material-icons">trending_down</span>
				<div>
					<div class="esw-ext-label">Стоит подтянуть</div>
					<div class="esw-ext-name">${escapeHtml(worst.name)}</div>
					<div class="esw-ext-val">${avg(worst.scores).toFixed(1)} / 10</div>
				</div>
			</div>
		</div>` : ''}
		<div class="esw-bar-wrap">
			<div class="esw-bar-title">Распределение</div>
			<div class="esw-bars">
				${[1,2,3,4,5,6,7,8,9,10].map(n => {
					const cnt = allScores.filter(s => Math.round(s) === n).length;
					const h   = Math.max(Math.round(cnt / allScores.length * 100), cnt > 0 ? 4 : 0);
					const c   = n >= 7 ? 'var(--color-green)' : n >= 4 ? 'var(--color-yellow)' : 'var(--color-red)';
					return `<div class="esw-bar-col">
						<div class="esw-bar-fill" style="height:${h}%;background:${c}" title="${cnt}×"></div>
						<div class="esw-bar-num">${n}</div>
					</div>`;
				}).join('')}
			</div>
		</div>
	`;

	span9.prepend(w);
}

