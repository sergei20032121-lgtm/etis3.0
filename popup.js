/* ============================================================
   ЕТИС 3.0 — попап настроек
   Пишет в chrome.storage.local, открытые вкладки ЕТИСа
   подхватывают изменения сами через storage.onChanged
   ============================================================ */

'use strict';

let settings = { ...ETIS3_DEFAULTS };

const themeBtns  = document.querySelectorAll('.theme-btn[data-theme-val]');
const layoutBtns = document.querySelectorAll('.layout-btn');
const accentRow  = document.getElementById('accent-row');
const fontRange  = document.getElementById('font-size-range');
const fontVal    = document.getElementById('font-size-val');
const toggles    = document.querySelectorAll('[data-setting]');

Object.entries(ETIS3_ACCENTS).forEach(([key, preset]) => {
	const sw = document.createElement('button');
	sw.className        = 'accent-swatch';
	sw.dataset.accent   = key;
	sw.title            = preset.label;
	sw.setAttribute('aria-label', preset.label);
	sw.style.background = `linear-gradient(135deg, ${preset.light}, ${preset.dark})`;
	sw.addEventListener('click', () => save({ accent: key }));
	accentRow.appendChild(sw);
});

function render() {
	const isDark = etis3IsDark(settings.theme);
	const preset = ETIS3_ACCENTS[settings.accent] || ETIS3_ACCENTS.violet;
	const hex    = isDark ? preset.dark : preset.light;
	const rgb    = etis3HexToRgb(hex);
	const root   = document.documentElement;
	root.setAttribute('data-theme', isDark ? 'dark' : 'light');
	root.style.setProperty('--accent',      hex);
	root.style.setProperty('--accent-glow', `rgba(${rgb},0.35)`);
	root.style.setProperty('--accent-bg',   `rgba(${rgb},0.12)`);

	themeBtns.forEach(b => b.classList.toggle('active', b.dataset.themeVal === settings.theme));
	layoutBtns.forEach(b => b.classList.toggle('active', b.dataset.layoutVal === settings.layout));
	accentRow.querySelectorAll('.accent-swatch').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));
	fontRange.value     = settings.fontSize;
	fontVal.textContent = settings.fontSize + 'px';
	toggles.forEach(el => { el.checked = settings[el.dataset.setting]; });
}

function save(patch, notice = '✓ Сохранено') {
	settings = etis3Normalize({ ...settings, ...patch });
	etis3StorageSet(settings);
	render();
	showSaved(notice);
}

themeBtns.forEach(btn => btn.addEventListener('click', () => save({ theme: btn.dataset.themeVal })));
layoutBtns.forEach(btn => btn.addEventListener('click', () => save({ layout: btn.dataset.layoutVal })));
fontRange.addEventListener('input', () => save({ fontSize: parseFloat(fontRange.value) }));
toggles.forEach(el => el.addEventListener('change', () => save({ [el.dataset.setting]: el.checked })));
document.getElementById('btn-reset').addEventListener('click', () => save({ ...ETIS3_DEFAULTS }, '↺ Сброшено'));

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

let noticeTimer;
function showSaved(text) {
	const el = document.getElementById('save-notice');
	el.textContent = text;
	el.classList.add('show');
	clearTimeout(noticeTimer);
	noticeTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

etis3StorageGet().then(stored => {
	if (stored) settings = etis3Normalize(stored);
	render();
});
render();
