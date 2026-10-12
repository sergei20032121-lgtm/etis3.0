/* ============================================================
   ЕТИС 3.0 by Комар
   ============================================================ */

'use strict';

// ============================================================
// ШРИФТЫ — из самого расширения (в userscript — встроены), без Google Fonts
// ============================================================

(function injectFonts() {
	const url = f => { try { return chrome.runtime.getURL('fonts/' + f); } catch (e) { return ''; } };
	const face = (family, file, extra = '') => url(file)
		? `@font-face{font-family:'${family}';font-style:normal;font-display:swap;src:url("${url(file)}") format('woff2');${extra}}` : '';
	const style = document.createElement('style');
	style.id = 'etis3-fonts';
	style.textContent = [
		face('Inter', 'inter-cyrillic.woff2', 'font-weight:100 900;unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116;'),
		face('Inter', 'inter-latin.woff2', 'font-weight:100 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;'),
		face('Material Icons Outlined', 'material-icons-outlined.woff2', 'font-weight:400;'),
	].join('\n');
	(document.head || document.documentElement).appendChild(style);
})();

// Последние ошибки скрипта — для «Сообщить о проблеме» (только текст и место, без данных страницы)
const recentErrors = [];
(function captureErrors() {
	const push = (msg, where) => {
		recentErrors.push({ msg: String(msg || '').slice(0, 200), where: String(where || '').slice(0, 80), at: new Date().toTimeString().slice(0, 8) });
		if (recentErrors.length > 5) recentErrors.shift();
	};
	window.addEventListener('error', e => push(e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : ''));
	window.addEventListener('unhandledrejection', e => push(e.reason?.message || e.reason, 'promise'));
})();

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

// Цвет дисциплины — из фиксированной палитры контрастных оттенков. Назначение
// запоминается, так что дисциплина одного цвета и в расписании, и в оценках,
// а новая дисциплина получает первый из наименее занятых цветов.
// Порядок важен: первые цвета максимально далеки друг от друга
const DIS_PALETTE   = [212, 28, 145, 280, 338, 182, 48, 250, 8, 100, 196, 306];
const DIS_COLORS_KEY = 'etis3-dis-colors';
let disColors = null;

function disciplineKey(name) {
	return String(name || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
}

function disciplineHue(name) {
	const key = disciplineKey(name);
	if (!disColors) {
		try { disColors = JSON.parse(localStorage.getItem(DIS_COLORS_KEY)) || {}; } catch (e) { disColors = {}; }
		if (typeof disColors !== 'object' || Array.isArray(disColors)) disColors = {};
	}
	if (key in disColors && DIS_PALETTE[disColors[key]] !== undefined) return DIS_PALETTE[disColors[key]];

	const used = DIS_PALETTE.map(() => 0);
	Object.values(disColors).forEach(i => { if (used[i] !== undefined) used[i]++; });
	const idx = used.indexOf(Math.min(...used));
	disColors[key] = idx;
	try { localStorage.setItem(DIS_COLORS_KEY, JSON.stringify(disColors)); } catch (e) {}
	return DIS_PALETTE[idx];
}

function paintDiscipline(el, name) {
	el.style.setProperty('--dis-h', disciplineHue(name));
	el.classList.add('etis3-dis');
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
	root.classList.toggle('etis3-modern',       settings.layout === 'modern');
	root.classList.toggle('etis3-no-aurora',    !settings.aurora);
	applyWallpaper();
	applySky();
	if (typeof applySeason === 'function') applySeason();
	syncThemeSwitcher();
	document.getElementById('etis3-sp-panel')?.etis3Render?.();
}

let etis3FirstRun = false;

async function initSettings() {
	const stored = await etis3StorageGet();
	if (stored) {
		settings = etis3Normalize(stored);
	} else {
		etis3FirstRun = !readSettingsMirror() && !etis3FromLegacy(localStorage);
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
	applyAccent();
	syncAppMeta();
}

// ---------- «Как приложение»: экран «Домой» на iPhone, цвет панелей браузера ----------
const APP_ICON_URL = 'https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/main/icons/apple-touch-icon.png';

function setMeta(name, content, attr = 'name') {
	let m = document.querySelector(`meta[${attr}="${name}"]`);
	if (!m) {
		m = document.createElement('meta');
		m.setAttribute(attr, name);
		(document.head || document.documentElement).appendChild(m);
	}
	m.content = content;
}

function syncAppMeta() {
	const dark = document.documentElement.getAttribute('theme') === 'dark';
	// Цвет строки состояния и панелей Safari / Chrome на телефоне — под фон темы
	setMeta('theme-color', dark ? '#0d0d14' : '#ecebf4');
	setMeta('color-scheme', dark ? 'dark' : 'light');
}

function setupAppMeta() {
	// Полноэкранный режим («web-app-capable») не включаем: в веб-приложениях с экрана «Домой»
	// iOS не запускает расширения Safari, и userscript (Stay) там не работает.
	// Иконка и название есть — ярлык открывает ЕТИС в Safari, где всё работает.
	setMeta('apple-mobile-web-app-title', 'ЕТИС');
	setMeta('application-name', 'ЕТИС');
	if (!document.querySelector('link[rel="apple-touch-icon"]')) {
		const link = document.createElement('link');
		link.rel = 'apple-touch-icon';
		link.href = APP_ICON_URL;
		(document.head || document.documentElement).appendChild(link);
	}
	// Запущено с экрана «Домой» — без интерфейса браузера
	const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
	document.documentElement.classList.toggle('etis3-standalone', !!standalone);
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
	btn.title = 'Тема: ' + THEME_LABELS[settings.theme];
}


// ============================================================
// АКЦЕНТНЫЙ ЦВЕТ
// ============================================================

function applyAccent() {
	const isDark = document.documentElement.getAttribute('theme') === 'dark';
	const hex    = etis3AccentHex(settings, isDark);
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

// ============================================================
// ФОН СТРАНИЦ: пресеты и своё фото
// ============================================================

let wallImg = null;          // data:-URL своего фото (из chrome.storage)
let wallImgLoaded = false;

function applyWallpaper() {
	const root = document.documentElement;
	root.dataset.wall = settings.wallpaper;
	root.style.setProperty('--wall-dim', settings.wallDim);
	if (settings.wallpaper === 'custom' && !wallImgLoaded) {
		wallImgLoaded = true;
		try {
			chrome.storage.local.get(ETIS3_WALL_IMG_KEY, res => { wallImg = res?.[ETIS3_WALL_IMG_KEY] || null; paintWall(); });
		} catch (e) { /* нет хранилища — останется аврора */ }
	}
	paintWall();
}

function paintWall() {
	const root = document.documentElement;
	const el = document.getElementById('etis3-wall');
	const custom = settings.wallpaper === 'custom' && wallImg;
	root.classList.toggle('etis3-wall-photo', !!custom);
	if (el) el.style.backgroundImage = custom ? `url("${wallImg}")` : '';
}

// Слой фона за стеклом — только на страницах кабинета (вход остаётся с авророй)
function buildWall(parent) {
	if (document.getElementById('etis3-wall')) return;
	parent.prepend(createEl('div', { id: 'etis3-wall', 'aria-hidden': 'true' }));
	paintWall();
}

// Фото → JPEG до 1920px по длинной стороне, чтобы влезть в хранилище
function prepareWallImage(file) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const k = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
			const c = document.createElement('canvas');
			c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
			c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
			URL.revokeObjectURL(img.src);
			let q = 0.82, url = c.toDataURL('image/jpeg', q);
			while (url.length > 1400000 && q > 0.4) { q -= 0.12; url = c.toDataURL('image/jpeg', q); }
			resolve(url);
		};
		img.onerror = () => reject(new Error('image'));
		img.src = URL.createObjectURL(file);
	});
}

async function setWallImage(file) {
	const url = await prepareWallImage(file);
	await new Promise((resolve, reject) => {
		try {
			chrome.storage.local.set({ [ETIS3_WALL_IMG_KEY]: url }, () => chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve());
		} catch (e) { reject(e); }
	});
	// Userscript-прослойка молча глотает переполнение localStorage — проверяем, что записалось
	const back = await new Promise(r => { try { chrome.storage.local.get(ETIS3_WALL_IMG_KEY, x => r(x?.[ETIS3_WALL_IMG_KEY])); } catch (e) { r(null); } });
	if (back !== url) throw new Error('quota');
	wallImg = url; wallImgLoaded = true;
	saveSettings({ wallpaper: 'custom' });
}

try {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && changes[ETIS3_WALL_IMG_KEY]) { wallImg = changes[ETIS3_WALL_IMG_KEY].newValue || null; wallImgLoaded = true; paintWall(); }
	});
} catch (e) {}

// ============================================================
// НЕБО: цвета фона по времени суток
// ============================================================

function skyPeriod(h = new Date().getHours()) {
	if (h >= 5 && h < 11)  return 'morning';
	if (h >= 11 && h < 17) return 'day';
	if (h >= 17 && h < 22) return 'evening';
	return 'night';
}

function applySky() {
	document.documentElement.dataset.sky = settings.sky ? skyPeriod() : 'evening';
}
setInterval(applySky, 5 * 60 * 1000);

// Аврора — большие размытые пятна света за стеклом (вход и все страницы)
function buildAurora(parent, extraClass = '') {
	if (document.getElementById('etis3-aurora')) return document.getElementById('etis3-aurora');
	const aurora = createEl('div', { id: 'etis3-aurora', className: extraClass, 'aria-hidden': 'true' });
	aurora.innerHTML = ['a', 'b', 'c', 'd'].map(k => `<div class="orb-wrap orb-wrap--${k}"><div class="orb orb--${k}"></div></div>`).join('')
		+ '<div class="aurora-grain"></div>';
	parent.prepend(aurora);
	return aurora;
}

// ЕТИС не задаёт viewport — на телефоне страница рисуется как десктоп в 980px.
// Ставим нормальный, с учётом выреза iPhone (viewport-fit=cover).
function ensureViewport() {
	const apply = () => {
		let meta = document.querySelector('meta[name="viewport"]');
		if (!meta) {
			meta = document.createElement('meta');
			meta.name = 'viewport';
			(document.head || document.documentElement).prepend(meta);
		}
		meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
	};
	apply();
	if (!document.head && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
	holdUntilMobileWidth();
}
ensureViewport();

// Safari применяет новый viewport не сразу: пару кадров страница ещё 980px шириной,
// и вместо мобильной вёрстки мелькает десктопная в натуральную величину.
// Пока ширина не стала «телефонной», прячем страницу (фон остаётся).
function holdUntilMobileWidth() {
	const root = document.documentElement;
	const coarse = window.matchMedia?.('(pointer: coarse)').matches;
	const phone = Math.min(screen.width, screen.height) <= 900;
	const wide = () => window.innerWidth > Math.max(screen.width, screen.height) + 40 || (window.innerWidth > 900 && Math.max(screen.width, screen.height) <= 900);
	if (!coarse || !phone || !wide()) return;
	root.classList.add('etis3-vp-wait');
	const started = Date.now();
	const check = () => {
		if (!wide() || Date.now() - started > 1200) { root.classList.remove('etis3-vp-wait'); window.removeEventListener('resize', check); return; }
		requestAnimationFrame(check);
	};
	window.addEventListener('resize', check);
	requestAnimationFrame(check);
}
setupAppMeta();

applySettings();
const settingsReady = initSettings();


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


