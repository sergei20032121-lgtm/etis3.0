/* ============================================================
   ЕТИС 3.0 — общие настройки (content script + попап)
   ============================================================ */

'use strict';

const ETIS3_STORAGE_KEY = 'etis3-settings';

const ETIS3_DEFAULTS = {
	theme:     'auto',   // auto | light | dark
	accent:    'violet',
	fontSize:  10,       // px, база для rem
	highlight: true,     // подсветка текущей пары
	widget:    true,     // виджет следующей пары
	pairTypes: true,     // чипы типов пар
	scoreDots: true,     // цветные точки у оценок
	compact:   false,    // компактный режим
};

const ETIS3_ACCENTS = {
	violet: { light: '#7c6fd4', dark: '#9d8ef0', label: 'Фиолетовый' },
	blue:   { light: '#4f86f7', dark: '#7eaaff', label: 'Синий'      },
	teal:   { light: '#0d9488', dark: '#2dd4bf', label: 'Изумрудный' },
	rose:   { light: '#e11d6a', dark: '#fb7bb0', label: 'Розовый'    },
	green:  { light: '#28a745', dark: '#34c759', label: 'Зелёный'    },
	orange: { light: '#f08c00', dark: '#ff9f0a', label: 'Оранжевый'  },
	indigo: { light: '#5856d6', dark: '#7d7aff', label: 'Индиго'     },
	mint:   { light: '#00a39b', dark: '#00c7be', label: 'Мятный'     },
};

const ETIS3_FONT_MIN = 9;
const ETIS3_FONT_MAX = 12;

// Приводит произвольный объект к валидным настройкам
function etis3Normalize(raw) {
	const s = { ...ETIS3_DEFAULTS };
	if (!raw || typeof raw !== 'object') return s;
	if (['auto', 'light', 'dark'].includes(raw.theme)) s.theme = raw.theme;
	if (raw.accent in ETIS3_ACCENTS) s.accent = raw.accent;
	const fs = parseFloat(raw.fontSize);
	if (!isNaN(fs)) s.fontSize = Math.min(ETIS3_FONT_MAX, Math.max(ETIS3_FONT_MIN, fs));
	['highlight', 'widget', 'pairTypes', 'scoreDots', 'compact'].forEach(k => {
		if (typeof raw[k] === 'boolean') s[k] = raw[k];
	});
	return s;
}

// Старые ключи localStorage (до 3.2) → новый объект
function etis3FromLegacy(ls) {
	const get  = k => { try { return ls.getItem(k); } catch (e) { return null; } };
	const bool = (k, def) => { const v = get(k); return v === null ? def : v !== 'false'; };
	if (get('theme') === null && get('etis3-accent') === null && get('etis3-fontsize') === null) return null;
	return etis3Normalize({
		theme:     get('theme'),
		accent:    get('etis3-accent'),
		fontSize:  get('etis3-fontsize'),
		highlight: bool('etis3-highlight', true),
		widget:    bool('etis3-widget', true),
		pairTypes: bool('etis3-pairtypes', true),
		scoreDots: bool('etis3-scoredots', true),
		compact:   get('etis3-compact') === 'true',
	});
}

function etis3HexToRgb(hex) {
	return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
}

function etis3IsDark(themeSetting) {
	if (themeSetting === 'dark')  return true;
	if (themeSetting === 'light') return false;
	return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function etis3StorageGet() {
	return new Promise(resolve => {
		try {
			chrome.storage.local.get(ETIS3_STORAGE_KEY, res => {
				resolve(chrome.runtime.lastError ? null : (res && res[ETIS3_STORAGE_KEY]) || null);
			});
		} catch (e) { resolve(null); }
	});
}

function etis3StorageSet(settings) {
	try { chrome.storage.local.set({ [ETIS3_STORAGE_KEY]: etis3Normalize(settings) }); } catch (e) {}
}
