// ==UserScript==
// @name         ЕТИС 3.0
// @namespace    https://github.com/sergei20032121-lgtm/etis3.0
// @version      4.7.0
// @description  Современный редизайн ЕТИСа ПГНИУ: liquid glass, виджет пар, тёмная тема, настройки. by Комар
// @author       Комар
// @homepageURL  https://github.com/sergei20032121-lgtm/etis3.0
// @match        https://student.psu.ru/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/main/dist/etis3.user.js
// @downloadURL  https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/main/dist/etis3.user.js
// ==/UserScript==

// Файл собран автоматически из исходников расширения (tools/build-userscript.mjs) — правьте исходники.
(function () {
	'use strict';
	// Менеджеры скриптов на document-start могут запустить нас ещё до <html> — ждём его
	function main() {

	// ---------- Прослойка вместо API расширения ----------
	const ETIS3_USERSCRIPT = true;
	const chrome = (() => {
		const PREFIX = 'etis3-us:';
		const listeners = [];
		const load = k => { try { const v = localStorage.getItem(PREFIX + k); return v === null ? undefined : JSON.parse(v); } catch (e) { return undefined; } };
		const fire = changes => listeners.forEach(fn => { try { fn(changes, 'local'); } catch (e) {} });
		const local = {
			get(keys, cb) {
				const list = keys === null || keys === undefined ? Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length))
					: Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys);
				const res = {};
				list.forEach(k => { const v = load(k); if (v !== undefined) res[k] = v; });
				if (cb) setTimeout(() => cb(res), 0);
				return Promise.resolve(res);
			},
			set(obj, cb) {
				const changes = {};
				Object.entries(obj).forEach(([k, v]) => {
					changes[k] = { oldValue: load(k), newValue: v };
					try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {}
				});
				fire(changes);
				if (cb) setTimeout(cb, 0);
				return Promise.resolve();
			},
		};
		// Изменения из других вкладок
		window.addEventListener('storage', e => {
			if (!e.key || !e.key.startsWith(PREFIX)) return;
			const parse = v => { try { return v === null ? undefined : JSON.parse(v); } catch (err) { return undefined; } };
			fire({ [e.key.slice(PREFIX.length)]: { oldValue: parse(e.oldValue), newValue: parse(e.newValue) } });
		});
		return {
			storage: { local, onChanged: { addListener: fn => listeners.push(fn) } },
			runtime: {
				lastError: undefined,
				getManifest: () => ({ version: "4.7.0" }),
				getURL: p => p === 'icon.svg' ? "data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2M2MmUzZTt9LmNscy0ye2ZpbGw6I2ZmZjt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmljb248L3RpdGxlPjxyZWN0IGNsYXNzPSJjbHMtMSIgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIzMiIvPjxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTMyLDY5LjRWODcuNzJMNjQsMTA1LjIxLDk2LjA1LDg3LjcyVjY5LjRMNjQsODYuODlaTTY0LDIyLjc5LDEzLjYzLDUwLjI2LDY0LDc3Ljc0bDQxLjIxLTIyLjQ5Vjg2Ljg5aDkuMTZWNTAuMjZaIi8+PC9zdmc+" : p,
				sendMessage: () => Promise.resolve(),
			},
		};
	})();

	// ---------- Стили ----------
	(() => {
		const style = document.createElement('style');
		style.id = 'etis3-userscript-css';
		style.textContent = "/* ============================================================\n   ЕТИС 3.0 — Apple-стиль\n   SF Pro · Чистые поверхности · Тонкие детали\n   ============================================================ */\n\n@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');\n\n@font-face {\n\tfont-family: 'Material Icons Outlined';\n\tfont-style: normal;\n\tfont-weight: 400;\n\tsrc: url(https://fonts.gstatic.com/s/materialiconsoutlined/v38/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUce.woff2) format('woff2');\n}\n\n\n/* ============================================================\n   CSS ПЕРЕМЕННЫЕ\n   ============================================================ */\n\n:root {\n\t--font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', 'Inter', BlinkMacSystemFont, sans-serif;\n\n\t--radius-small:  6px;\n\t--radius-medium: 10px;\n\t--radius-large:  14px;\n\t--radius-xl:     18px;\n\t--radius-xxl:    22px;\n\n\t--width-aside: 22rem;\n\t--width-page:  1140px;\n\t--width-content-margin-left: 3.2rem;\n\n\n\n}\n\n/* ---------- Светлая тема ---------- */\n[theme=\"light\"] {\n\t/* Liquid glass — полупрозрачная молочная подложка + blur + saturation */\n\t--glass-bg:           rgba(255,255,255,0.55);\n\t--glass-bg-hover:     rgba(255,255,255,0.72);\n\t--glass-bg-active:    rgba(255,255,255,0.88);\n\t--glass-bg-sidebar:   rgba(255,255,255,0.52);\n\t--glass-bg-card:      rgba(255,255,255,0.48);\n\t--glass-bg-input:     rgba(255,255,255,0.60);\n\t--glass-bg-tooltip:   rgba(255,255,255,0.94);\n\t--glass-bg-header:    rgba(248,248,252,0.72);\n\n\t/* Highlight-бордер: тонкая белая линия сверху/слева — эффект стекла */\n\t--glass-border:       1px solid rgba(255,255,255,0.70);\n\t--glass-border-light: 1px solid rgba(255,255,255,0.80);\n\t--glass-border-inner: inset 0 1px 0 rgba(255,255,255,0.90), inset 1px 0 0 rgba(255,255,255,0.50);\n\n\t/* Тени чуть мягче — стекло парит */\n\t--glass-shadow:       0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04), var(--glass-border-inner);\n\t--glass-shadow-hover: 0 6px 32px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06), var(--glass-border-inner);\n\t--glass-shadow-card:  0 1px 10px rgba(0,0,0,0.05), var(--glass-border-inner);\n\n\t/* Blur + saturation — ключ liquid glass */\n\t--glass-filter:       blur(24px) saturate(180%) brightness(1.05);\n\t--glass-filter-strong: blur(40px) saturate(200%) brightness(1.04);\n\n\t--color-accent:          #6e62d6;\n\t--color-accent-dark:     #5046c8;\n\t--color-accent-light:    #9d93e8;\n\t--color-accent-glow:     rgba(110,98,214,0.22);\n\t--color-accent-bg:       rgba(110,98,214,0.08);\n\t--color-accent-bg-hover: rgba(110,98,214,0.14);\n\t--gradient-accent:       linear-gradient(135deg, #6e62d6, #9d93e8);\n\n\t--color-red:     #ff3b30;\n\t--color-green:   #34c759;\n\t--color-yellow:  #ff9f0a;\n\t--color-blue:    #007aff;\n\t--color-warning: #ff9f0a;\n\t--color-error:   #ff3b30;\n\t--color-white:   #fff;\n\t--color-dialog-fade: rgba(0,0,0,0.25);\n\n\t--color-text-primary:        rgba(0,0,0,0.88);\n\t--color-text-secondary:      rgba(0,0,0,0.42);\n\t--color-text-tertiary:       rgba(0,0,0,0.26);\n\t--color-text-accent:         #6e62d6;\n\t--color-text-link:           #6e62d6;\n\t--color-text-highlight:      #000;\n\t--color-text-primary-invert: #fff;\n\t--color-text-error:          #ff3b30;\n\n\t--color-scrollbar-thumb:           rgba(0,0,0,0.14);\n\t--color-scrollbar-thumb-highlight: rgba(0,0,0,0.24);\n\n\t--color-table-border:     rgba(0,0,0,0.05);\n\t--color-table-header:     rgba(0,0,0,0.025);\n\t--color-table-highlight:  rgba(110,98,214,0.05);\n\t--color-divider:          rgba(0,0,0,0.06);\n\n\t--bg-gradient:\n\t\tradial-gradient(ellipse at 10% 10%, rgba(var(--color-accent-rgb, 160,140,255), 0.28) 0%, transparent 45%),\n\t\tradial-gradient(ellipse at 85% 20%, rgba(100,160,255,0.22) 0%, transparent 40%),\n\t\tradial-gradient(ellipse at 50% 90%, rgba(180,220,255,0.18) 0%, transparent 40%),\n\t\t#eeeef4;\n}\n\n/* ---------- Тёмная тема ---------- */\n[theme=\"dark\"] {\n\t/* Liquid glass тёмный — дымчато-серая подложка + blur + saturation */\n\t--glass-bg:           rgba(40,40,44,0.58);\n\t--glass-bg-hover:     rgba(55,55,60,0.72);\n\t--glass-bg-active:    rgba(68,68,74,0.88);\n\t--glass-bg-sidebar:   rgba(24,24,28,0.72);\n\t--glass-bg-card:      rgba(38,38,42,0.55);\n\t--glass-bg-input:     rgba(24,24,28,0.65);\n\t--glass-bg-tooltip:   rgba(40,40,44,0.96);\n\t--glass-bg-header:    rgba(24,24,28,0.78);\n\n\t/* Highlight-бордер: тонкая белая линия сверху — стекло на тёмном фоне */\n\t--glass-border:       1px solid rgba(255,255,255,0.10);\n\t--glass-border-light: 1px solid rgba(255,255,255,0.14);\n\t--glass-border-inner: inset 0 1px 0 rgba(255,255,255,0.12), inset 1px 0 0 rgba(255,255,255,0.06);\n\n\t--glass-shadow:       0 2px 20px rgba(0,0,0,0.36), 0 1px 4px rgba(0,0,0,0.24), var(--glass-border-inner);\n\t--glass-shadow-hover: 0 6px 32px rgba(0,0,0,0.52), 0 2px 8px rgba(0,0,0,0.32), var(--glass-border-inner);\n\t--glass-shadow-card:  0 1px 10px rgba(0,0,0,0.26), var(--glass-border-inner);\n\n\t--glass-filter:       blur(24px) saturate(160%) brightness(0.96);\n\t--glass-filter-strong: blur(40px) saturate(180%) brightness(0.95);\n\n\t--color-accent:          #a599f5;\n\t--color-accent-dark:     #c2b9ff;\n\t--color-accent-light:    #c2b9ff;\n\t--color-accent-glow:     rgba(165,153,245,0.28);\n\t--color-accent-bg:       rgba(165,153,245,0.12);\n\t--color-accent-bg-hover: rgba(165,153,245,0.20);\n\t--gradient-accent:       linear-gradient(135deg, #a599f5, #c2b9ff);\n\n\t--color-red:     #ff453a;\n\t--color-green:   #30d158;\n\t--color-yellow:  #ffd60a;\n\t--color-blue:    #0a84ff;\n\t--color-warning: #ffd60a;\n\t--color-error:   #ff453a;\n\t--color-white:   #fff;\n\t--color-dialog-fade: rgba(0,0,0,0.55);\n\n\t--color-text-primary:        rgba(255,255,255,0.88);\n\t--color-text-secondary:      rgba(255,255,255,0.44);\n\t--color-text-tertiary:       rgba(255,255,255,0.26);\n\t--color-text-accent:         #c2b9ff;\n\t--color-text-link:           #b8b0ff;\n\t--color-text-highlight:      #fff;\n\t--color-text-primary-invert: #000;\n\t--color-text-error:          #ff453a;\n\n\t--color-scrollbar-thumb:           rgba(255,255,255,0.14);\n\t--color-scrollbar-thumb-highlight: rgba(255,255,255,0.24);\n\n\t--color-table-border:     rgba(255,255,255,0.05);\n\t--color-table-header:     rgba(255,255,255,0.025);\n\t--color-table-highlight:  rgba(165,153,245,0.08);\n\t--color-divider:          rgba(255,255,255,0.07);\n\n\t--bg-gradient:\n\t\tradial-gradient(ellipse at 15% 10%, rgba(var(--color-accent-rgb, 120,100,220), 0.22) 0%, transparent 40%),\n\t\tradial-gradient(ellipse at 85% 15%, rgba(40,60,130,0.22) 0%, transparent 40%),\n\t\tradial-gradient(ellipse at 50% 85%, rgba(60,40,120,0.20) 0%, transparent 40%),\n\t\t#16161a;\n}\n\n\n/* ============================================================\n   БАЗА\n   ============================================================ */\n\n*,*:before,*:after { box-sizing: border-box !important; }\n\nhtml { font-size: 10px !important; height: 100% !important; }\n\nbody {\n\theight: 100% !important;\n\tbackground: var(--bg-gradient) !important;\n\tbackground-attachment: fixed !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-family: var(--font-family) !important;\n\t-webkit-font-smoothing: antialiased !important;\n\t-moz-osx-font-smoothing: grayscale !important;\n\toverflow-y: overlay !important;\n}\n\n.container {\n\tpadding: 0 !important;\n\tmax-width: var(--width-page) !important;\n\twidth: 100% !important;\n\tmargin: 0 auto !important;\n}\n\n.container .row {\n\tmargin: 0 !important;\n\tpadding: 4rem 2rem 10rem !important;\n}\n\n.span3 {\n\tposition: fixed !important;\n\ttop: 3.6rem !important;\n\tbottom: 0 !important;\n\twidth: var(--width-aside) !important;\n\tmargin: 0 !important;\n\toverflow-x: hidden !important;\n\tfloat: none !important;\n}\n\n.span9 {\n\twidth: auto !important;\n\tmargin-left: calc(var(--width-aside) + var(--width-content-margin-left)) !important;\n\tfloat: none !important;\n}\n\n.span9 > h3 {\n\tfont-size: 2rem !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: -0.03em !important;\n\tmargin-bottom: 1.8rem !important;\n}\n\n.submenu { font-size: 1.2rem !important; margin-bottom: 2.4rem !important; }\n.submenu + .submenu { margin-top: -1.2rem !important; }\n\n.warning {\n\tmargin: 0 0 2rem 0 !important;\n\tbackground: rgba(255,59,48,0.08) !important;\n\tborder: 1px solid rgba(255,59,48,0.20) !important;\n\tborder-radius: var(--radius-large) !important;\n\tcolor: var(--color-text-error) !important;\n\tfont-size: 1.2rem !important;\n\tpadding: 1rem 1.4rem !important;\n}\n\n.flex-row { display: flex !important; align-items: center !important; }\n\n\n/* ============================================================\n   СКРОЛЛБАР\n   ============================================================ */\n\n::-webkit-scrollbar { height: 0.8rem !important; width: 0.8rem !important; background: transparent !important; }\n::-webkit-scrollbar-corner { background: transparent !important; }\n::-webkit-scrollbar-thumb {\n\tbackground-color: var(--color-scrollbar-thumb) !important;\n\tborder-radius: 10rem !important;\n\tborder: 0.2rem solid transparent !important;\n\tbackground-clip: padding-box !important;\n\ttransition: background-color 0.2s ease !important;\n}\n::-webkit-scrollbar-thumb:hover { background-color: var(--color-scrollbar-thumb-highlight) !important; }\n* { scrollbar-width: thin; scrollbar-color: var(--color-scrollbar-thumb) transparent; }\n\n\n/* ============================================================\n   ЦВЕТА\n   ============================================================ */\n\nfont[color=\"red\"],tr[style=\"color:red;\"],span[style=\"color:red;\"],\ndiv[style=\"font-size:0.8em;color:red;\"],font[style=\"color:red;font-weight:bold\"],\nfont[style=\"color:#d00;\"] { color: var(--color-red) !important; }\n\nspan[style=\"color:green;\"],font[color=\"green\"],\ndiv[style=\"font-size:0.8em;color:green;\"] { color: var(--color-green) !important; }\n\nfont[color=\"blue\"],font[style=\"font-weight:bold;color:blue;cursor:pointer\"],\ndiv[style=\"color:blue;font-size: 0.8em;\"],span[style=\"color:blue;\"] { color: var(--color-blue) !important; }\n\nfont[color=\"gray\"],font[color=\"#808080\"],font[style=\"font-size:10px;color:#808080\"],\ndiv[style=\"font-size:0.8em;color:gray;\"],span[style=\"color:#808080\"],\nfont[style=\"font-weight:bold;color:#333333;\"],span[style=\"color:#333333\"] { color: var(--color-text-secondary) !important; }\n\nfont[color=\"#6A0035\"] { color: var(--color-text-accent) !important; }\n\na { color: var(--color-text-link) !important; transition: color 0.12s ease !important; }\na:hover { color: var(--color-accent) !important; opacity: 0.8 !important; }\na.dashed { color: var(--color-text-secondary) !important; }\na.dashed:hover { color: var(--color-text-highlight) !important; }\n\n.navbar-static-top { display: none !important; }\n\n\n/* ============================================================\n   ТАБЛИЦЫ\n   ============================================================ */\n\ntable {\n\tborder-radius: var(--radius-large) !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder-collapse: separate !important;\n\tborder-spacing: 0 !important;\n}\n\n.common,.slimtab_nice,.teach_plan,.question_table {\n\twidth: 100% !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n\tborder-radius: var(--radius-large) !important;\n\toverflow: hidden !important;\n\tposition: relative !important;\n\tmargin-bottom: 2.4rem !important;\n}\n\n.common td,.common th,.slimtab_nice td,.slimtab_nice th,.question_table td {\n\tborder: none !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n\tpadding: 1rem 1.4rem !important;\n\tvertical-align: middle !important;\n}\n\n.common tr:last-child td,.slimtab_nice tr:last-child td,.question_table tr:last-child td {\n\tborder-bottom: none !important;\n}\n\n.common tr,.slimtab_nice tr,.teach_plan tr,.question_table tr {\n\tbackground: transparent !important;\n\ttransition: background 0.10s ease !important;\n}\n\n.common tr:hover,.slimtab_nice tr:hover,.timetable > .day > table tr:hover,.teach_plan tr:hover {\n\tbackground: var(--color-table-highlight) !important;\n}\n\n.common th,.common th.subheader,.common td[colspan=\"10\"],.slimtab_nice th,.teach_plan th {\n\tbackground: var(--color-table-header) !important;\n\tfont-weight: 600 !important;\n\tfont-size: 1.0rem !important;\n\tletter-spacing: 0.06em !important;\n\ttext-transform: uppercase !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n\n.slimtab_nice > tbody > tr > td[valign=\"top\"] { vertical-align: top !important; text-align: left !important; }\n.slimtab_nice > tbody > tr > td[valign=\"top\"]:nth-child(1) { vertical-align: middle !important; text-align: center !important; }\n.common tr > td,.common > tbody > tr > td[align=\"center\"],.slimtab_nice tr > td { text-align: center !important; }\n.common tr > td:nth-child(1),.slimtab_nice tr > td:nth-child(1),\n.cgrldatarow > td[style=\"border-left:none;\"] { text-align: left !important; }\n\n.teach_plan td.bg_bold,.teach_plan td.bgsu { background: var(--color-accent-bg) !important; }\n.teach_plan td,.teach_plan th { border: none !important; border-bottom: 1px solid var(--color-divider) !important; }\n.teach_plan.dis_table { border-collapse: collapse !important; }\n.teach_plan td.w { background: transparent !important; }\n\n\n/* ============================================================\n   ДИАЛОГИ\n   ============================================================ */\n\n.ui-dialog {\n\tbackground: var(--glass-bg-active) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border-light) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: 0 8px 40px rgba(0,0,0,0.18) !important;\n}\n\n.ui-dialog .ui-dialog-content { width: initial !important; height: initial !important; }\n.ui-dialog .ui-dialog-content > form { display: flex !important; flex-direction: column !important; }\n.ui-dialog .ui-dialog-content > form > input { margin-top: 6px !important; }\n.ui-dialog .ui-dialog-content > form > input.btn { align-self: flex-end !important; }\n\n.ui-widget-content { border: none !important; background: transparent !important; color: var(--color-text-primary) !important; }\n.ui-widget-header {\n\tborder: none !important;\n\tbackground: transparent !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n}\n.ui-widget-overlay {\n\tbackground: var(--color-dialog-fade) !important;\n\tbackdrop-filter: blur(12px) !important;\n\t-webkit-backdrop-filter: blur(12px) !important;\n\topacity: 1 !important;\n}\n.ui-dialog .ui-dialog-titlebar-close {\n\tborder: none !important;\n\tbackground: none !important;\n\tcolor: var(--color-text-secondary) !important;\n\tborder-radius: var(--radius-medium) !important;\n\ttransition: all 0.12s ease !important;\n}\n.ui-dialog .ui-dialog-titlebar-close:hover {\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n}\n.ui-dialog .ui-dialog-titlebar-close > .ui-button-icon-primary { display: none !important; }\n.ui-dialog .ui-dialog-titlebar-close:before {\n\tcontent: 'close' !important;\n\tfont-family: 'Material Icons Outlined' !important;\n\tfont-size: 18px !important;\n}\n\n#tooltip {\n\tbackground: var(--glass-bg-tooltip) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-medium) !important;\n\tpadding: 0.5rem 0.9rem !important;\n\tbox-shadow: var(--glass-shadow) !important;\n}\n\n\n/* ============================================================\n   ИНПУТЫ И ФОРМЫ\n   ============================================================ */\n\ninput,select,textarea,button { font-family: inherit !important; }\ntextarea { width: 100% !important; }\n\nselect,textarea {\n\tbackground: var(--glass-bg-input) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tcolor: var(--color-text-primary) !important;\n\tpadding: 0.6rem 1rem !important;\n\tborder-radius: var(--radius-medium) !important;\n\tborder: var(--glass-border) !important;\n\ttransition: all 0.15s ease !important;\n}\nselect:hover,textarea:hover { background: var(--glass-bg-hover) !important; }\nselect:focus,textarea:focus { outline: none !important; border-color: var(--color-accent) !important; box-shadow: 0 0 0 3px var(--color-accent-glow) !important; }\n\ninput[type=\"text\"],input[type=\"password\"],input[type=\"email\"] {\n\tbackground: transparent !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder: none !important;\n\tborder-bottom: 1.5px solid var(--color-divider) !important;\n\tbox-shadow: none !important;\n\twidth: 100% !important;\n\ttransition: border-color 0.15s ease !important;\n}\ninput[type=\"text\"]:focus,input[type=\"password\"]:focus,input[type=\"email\"]:focus {\n\tborder-bottom-color: var(--color-accent) !important;\n\toutline: none !important;\n}\n\ninput[type=\"text\"]:focus ~ label,\ninput[type=\"text\"]:not(:placeholder-shown) ~ label,\ninput[type=\"password\"]:focus ~ label,\ninput[type=\"password\"]:not(:placeholder-shown) ~ label,\ninput[type=\"email\"]:focus ~ label,\ninput[type=\"email\"]:not(:placeholder-shown) ~ label {\n\ttop: -2rem !important;\n\tfont-size: 1.1rem !important;\n\tcolor: var(--color-accent) !important;\n}\n\ninput[type=\"text\"]:-webkit-autofill ~ label,\ninput[type=\"password\"]:-webkit-autofill ~ label,\ninput[type=\"email\"]:-webkit-autofill ~ label { top: -2rem !important; font-size: 1.1rem !important; }\n\ninput:-webkit-autofill,input:-webkit-autofill:hover,\ninput:-webkit-autofill:focus,input:-webkit-autofill:active {\n\ttransition: background-color 9999s ease-in-out 9999s !important;\n\t-webkit-text-fill-color: var(--color-text-primary) !important;\n\tcaret-color: var(--color-text-primary) !important;\n}\n\ninput[type=\"checkbox\"],input[type=\"radio\"] {\n\tdisplay: inline-flex !important;\n\talign-items: center !important;\n\tjustify-content: center !important;\n\tmargin-right: 0.8rem !important;\n}\n\ninput[type=\"checkbox\"]:before {\n\twidth: 1.6rem !important; height: 1.6rem !important;\n\tbackground: var(--glass-bg-input) !important;\n\tborder: var(--glass-border) !important;\n\tcontent: '' !important; position: absolute !important;\n\tborder-radius: 4px !important; transition: all 0.12s ease !important;\n}\ninput[type=\"checkbox\"]:checked:before { background: var(--color-accent) !important; border-color: var(--color-accent) !important; }\ninput[type=\"checkbox\"]:checked:after {\n\tcontent: '' !important; position: absolute !important;\n\twidth: 0.5rem !important; height: 0.9rem !important;\n\tborder-right: 2px solid #fff !important; border-bottom: 2px solid #fff !important;\n\ttransform: rotate(45deg) translate(-1px, -1px) !important;\n}\n\ninput[type=\"radio\"]:before {\n\twidth: 1.6rem !important; height: 1.6rem !important;\n\tbackground: var(--glass-bg-input) !important; border: var(--glass-border) !important;\n\tcontent: '' !important; position: absolute !important; border-radius: 50% !important;\n}\ninput[type=\"radio\"]:checked:after {\n\twidth: 0.7rem !important; height: 0.7rem !important;\n\tbackground: var(--color-accent) !important; content: '' !important;\n\tposition: absolute !important; border-radius: 50% !important;\n}\n\n\n/* ============================================================\n   КНОПКИ\n   ============================================================ */\n\nbutton {\n\tpadding: 0.8rem 1.6rem !important;\n\tcolor: var(--color-text-primary) !important;\n\tbackground: var(--glass-bg) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tfont-size: 1.3rem !important;\n\tfont-weight: 500 !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\ttext-shadow: none !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tline-height: 1 !important;\n\tcursor: pointer !important;\n\ttransition: all 0.15s ease !important;\n}\nbutton:hover,button:focus {\n\tbackground: var(--glass-bg-hover) !important;\n\tbox-shadow: var(--glass-shadow-hover) !important;\n\ttransform: translateY(-1px) !important;\n}\nbutton:active { background: var(--glass-bg-active) !important; box-shadow: none !important; transform: none !important; }\nbutton[disabled] { opacity: 0.38 !important; cursor: default !important; transform: none !important; box-shadow: none !important; }\n\n.button_gray { width: fit-content !important; align-self: flex-end !important; border: none !important; background: none !important; }\n.button_gray button {\n\tcolor: #fff !important;\n\tbackground: var(--gradient-accent) !important;\n\tborder: none !important;\n\tbox-shadow: 0 4px 14px var(--color-accent-glow) !important;\n}\n.button_gray button:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; }\n.button_gray button[disabled] { background: var(--glass-bg) !important; color: var(--color-text-secondary) !important; box-shadow: none !important; }\n\n.button {\n\tfont-family: inherit !important;\n\tborder-radius: var(--radius-large) !important;\n\tborder: none !important; margin: 0 !important;\n\tpadding: 1rem 2.8rem !important;\n\tdisplay: flex !important; align-items: center !important; justify-content: center !important;\n\tfont-weight: 500 !important; transition: all 0.15s ease !important;\n}\n.button.blue,.button.blue:link {\n\tbackground: var(--gradient-accent) !important;\n\tcolor: #fff !important;\n\tborder: none !important;\n\tbox-shadow: 0 4px 14px var(--color-accent-glow) !important;\n}\n.button.blue:hover { opacity: 0.88 !important; transform: translateY(-1px) !important; }\n.button span { border: none !important; color: #fff !important; text-shadow: none !important; padding: 0 !important; }\n.button:active,.button.active { top: 0 !important; box-shadow: none !important; }\n\n.icon-button {\n\tdisplay: inline-flex !important;\n\talign-items: center !important;\n\tbackground: var(--glass-bg) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-size: 1.2rem !important;\n\tfont-weight: 500 !important;\n\tpadding: 0.5rem 1rem !important;\n\tborder-radius: var(--radius-large) !important;\n\tborder: var(--glass-border) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n\ttext-decoration: none !important;\n\ttransition: all 0.15s ease !important;\n}\n.icon-button:hover {\n\tbackground: var(--glass-bg-hover) !important;\n\tbox-shadow: var(--glass-shadow-hover) !important;\n\tcolor: var(--color-text-primary) !important;\n\ttransform: translateY(-1px) !important;\n}\n.icon-button:active { background: var(--glass-bg-active) !important; box-shadow: none !important; transform: none !important; }\n.icon-button:before { margin-right: 0.6rem !important; font-family: 'Material Icons Outlined' !important; font-size: 1.6rem !important; color: var(--color-accent) !important; }\n.icon-button.icon-feedback:before  { content: 'feedback' !important; }\n.icon-button.icon-analytics:before { content: 'analytics' !important; }\n.icon-button.icon-today:before     { content: 'today' !important; }\n\n.icon-button2 {\n\tmargin-left: 0.4rem !important;\n\tfont-family: 'Material Icons Outlined' !important;\n\tfont-size: 1.8rem !important;\n\tcursor: pointer !important;\n\ttext-decoration: none !important;\n\tcolor: var(--color-text-secondary) !important;\n\ttransition: color 0.12s ease !important;\n}\n.icon-button2:hover { color: var(--color-accent) !important; }\n\n.material-icons {\n\tfont-family: 'Material Icons Outlined' !important;\n\tfont-size: 18px !important;\n\tfont-weight: normal !important;\n\tpointer-events: none !important;\n}\n\n\n/* ============================================================\n   САЙДБАР\n   ============================================================ */\n\n.span3 > .nav.nav-tabs.nav-stacked {\n\tbackground: var(--glass-bg-sidebar) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\toverflow: hidden !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked:last-child { margin-bottom: 3.2rem !important; }\n.span3 > .nav.nav-tabs.nav-stacked > li { background: transparent !important; }\n\n.span3 > .nav.nav-tabs.nav-stacked > li > a {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tjustify-content: space-between !important;\n\tpadding: 0.9rem 1.2rem 0.9rem 1.4rem !important;\n\tbackground: transparent !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder: none !important;\n\tcursor: pointer !important;\n\tfont-size: 1.3rem !important;\n\tfont-weight: 400 !important;\n\ttransition: background 0.10s ease, padding-left 0.15s ease !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked > li > a:hover {\n\tbackground: var(--color-table-highlight) !important;\n\tcolor: var(--color-text-primary) !important;\n\tpadding-left: 1.8rem !important;\n}\n\n.span3 > .nav.nav-tabs.nav-stacked > .active { font-weight: 600 !important; display: flex !important; align-items: center !important; }\n.span3 > .nav.nav-tabs.nav-stacked > .active:before {\n\tposition: absolute !important; left: 0 !important;\n\twidth: 3px !important; height: 2.6rem !important;\n\tz-index: 3 !important; content: \"\" !important;\n\tborder-radius: 0 3px 3px 0 !important;\n\tbackground: var(--gradient-accent) !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked > .active > a {\n\twidth: 100% !important;\n\tcolor: var(--color-accent) !important;\n\tbackground: var(--color-accent-bg) !important;\n}\n\n.span3 > .nav.nav-tabs.nav-stacked > li > a > .badge {\n\tbackground: var(--gradient-accent) !important;\n\tpadding: 0.2rem 0.5rem !important;\n\tcolor: #fff !important;\n\tborder-radius: var(--radius-small) !important;\n\tfont-size: 1rem !important;\n\tfont-weight: 600 !important;\n\tmargin: -1rem 0 !important;\n}\n\n.span3 > .nav.nav-tabs.nav-stacked > li > a > .material-icons {\n\tmargin-right: 10px !important;\n\tcolor: var(--color-text-secondary) !important;\n\tfont-size: 16px !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked > .active > a > .material-icons { color: var(--color-accent) !important; }\n.span3 > .nav.nav-tabs.nav-stacked:last-child > li > a { justify-content: left !important; }\n\n.span3 > .nav.nav-tabs.nav-stacked > .warn_menu > a,\n.span3 > .nav.nav-tabs.nav-stacked > li > a[href=\"stu_plus.advice\"] > font > b,\n.span3 > .nav.nav-tabs.nav-stacked > li > a[href=\"stu_plus.add_snils\"] > font > b,\n.span3 > .nav.nav-tabs.nav-stacked > li > a[href=\"ebl_stu.ebl_choice\"] > b {\n\tcolor: var(--color-text-primary) !important;\n\tfont-weight: inherit !important;\n}\n\n.badge-point {\n\tmin-width: 0.6rem !important; width: 0.6rem !important; height: 0.6rem !important;\n\tbackground: var(--color-warning) !important;\n\tpadding: 0 !important; margin: -1.2rem 0.6rem !important;\n\tborder-radius: 50% !important;\n}\n\n\n/* ============================================================\n   РАСПИСАНИЕ\n   ============================================================ */\n\ndiv.timetable-buttonbar {\n\tdisplay: flex !important;\n\tflex-direction: row !important;\n\talign-items: center !important;\n\tjustify-content: flex-end !important;\n\tflex-wrap: wrap !important;\n\tgap: 0.8rem !important;\n\tmargin-bottom: 1.6rem !important;\n}\n.timetable-btn { margin: 0 !important; }\n\ndiv.consultations {\n\tdisplay: flex !important; align-items: center !important;\n\tfloat: none !important; color: var(--color-text-primary) !important;\n\tfont-size: 1.2rem !important;\n}\n\nspan.holiday {\n\tbackground: rgba(52,199,89,0.10) !important;\n\tborder: 1px solid rgba(52,199,89,0.22) !important;\n\tcolor: var(--color-green) !important;\n\tpadding: 0.3rem 0.9rem !important;\n\tborder-radius: 50rem !important;\n\tmargin-top: 0.6rem !important;\n\tdisplay: inline-block !important;\n\tfont-size: 1.1rem !important;\n}\n\n.day {\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\toverflow: hidden !important;\n\tpadding: 0.6rem 0 !important;\n\tmargin-bottom: 1.4rem !important;\n\ttransition: box-shadow 0.18s ease, transform 0.18s ease !important;\n}\n.day:hover { box-shadow: var(--glass-shadow-hover) !important; transform: translateY(-2px) !important; }\n\n.day h3 {\n\tpadding: 1.1rem 1.8rem !important;\n\tmargin: 0 !important;\n\tfont-size: 1.05rem !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0.07em !important;\n\ttext-transform: uppercase !important;\n\tcolor: var(--color-text-secondary) !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n}\n\n.no_pairs {\n\tpadding: 1.4rem 1.8rem 2rem !important;\n\tcolor: var(--color-text-tertiary) !important;\n\tfont-size: 1.2rem !important;\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n}\n.no_pairs::before {\n\tfont-family: 'Material Icons Outlined' !important;\n\tcontent: 'event_busy' !important;\n\tfont-size: 1.6rem !important;\n\topacity: 0.5 !important;\n}\n\n.timetable { display: flex !important; flex-direction: column !important; width: 100% !important; }\n\n.timetable td {\n\tborder: none !important;\n\tvertical-align: middle !important;\n\tpadding-top: 0.3rem !important;\n\tpadding-bottom: 0.3rem !important;\n\tfont-size: 1.25rem !important;\n}\n\n.pair_num { width: 8rem !important; height: 5.4rem !important; border: none !important; font-size: 0 !important; }\n.pair_num .eval { font-size: 1.2rem !important; font-weight: 700 !important; color: var(--color-text-secondary) !important; }\n.pair_info { padding-right: 1.4rem !important; }\n.pair_info .dis a { color: var(--color-text-primary) !important; text-decoration: none !important; font-size: 1.35rem !important; font-weight: 600 !important; letter-spacing: -0.01em !important; transition: color 0.12s ease !important; }\n.pair_info .dis a:hover { color: var(--color-accent) !important; opacity: 1 !important; }\n.pair_teacher { width: 14rem !important; text-align: right !important; padding-right: 1.8rem !important; }\n.pair_teacher > a { color: var(--color-text-secondary) !important; text-decoration: none !important; font-size: 1.15rem !important; transition: color 0.12s ease !important; }\n.pair_teacher > a:hover { color: var(--color-text-highlight) !important; }\n.pair_teacher .eval { display: none !important; }\n.pair_info .aud { color: var(--color-text-secondary) !important; font-size: 1.1rem !important; font-weight: 300 !important; }\n.pair_info .aud > a { display: flex !important; align-items: center !important; color: var(--color-text-secondary) !important; text-decoration: none !important; transition: color 0.12s ease !important; }\n.pair_info .aud > a:hover { color: var(--color-accent) !important; opacity: 1 !important; }\n.pair_info .aud > a > img { display: none !important; }\n.pair_info .aud > a:before { margin-right: 0.5rem !important; font-family: 'Material Icons Outlined' !important; content: 'videocam' !important; font-size: 1.4rem !important; }\n.pair_info div:nth-child(1) { margin-bottom: 0.2rem !important; }\n\n\n/* ============================================================\n   ВЫБОР НЕДЕЛИ\n   ============================================================ */\n\n.week-select h3 { display: none !important; }\n.week-select { margin: 0 auto 2.8rem !important; width: 100% !important; }\n.weeks { display: flex !important; justify-content: center !important; flex-wrap: wrap !important; gap: 0.4rem !important; }\n\n.week {\n\tdisplay: flex !important; justify-content: center !important; align-items: center !important;\n\tbackground: var(--glass-bg) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-medium) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n\tfont-size: 1.25rem !important;\n\tfont-weight: 500 !important;\n\toverflow: hidden !important;\n\ttransition: all 0.12s ease !important;\n\tmargin: 0 !important;\n}\n.week:hover { background: var(--glass-bg-hover) !important; transform: translateY(-2px) scale(1.05) !important; }\n.weeks > .week > a {\n\tdisplay: flex !important; justify-content: center !important; align-items: center !important;\n\twidth: 3.8rem !important; height: 3.8rem !important;\n\tcolor: var(--color-text-primary) !important; text-decoration: none !important;\n}\n.weeks .week.current {\n\tfont-weight: 700 !important;\n\tbackground: var(--color-accent-bg) !important;\n\tborder-color: var(--color-accent) !important;\n}\n.weeks .week.current a { color: var(--color-accent) !important; }\n.weeks .week.session a,.weeks .week.session { color: var(--color-red) !important; }\n.weeks .week.holiday a,.weeks .week.holiday { color: var(--color-green) !important; }\n.weeks .week.pract a,.weeks .week.pract     { color: var(--color-yellow) !important; }\n\n\n/* ============================================================\n   ПРЕПОДАВАТЕЛИ\n   ============================================================ */\n\n.teacher_info {\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\ttransition: box-shadow 0.18s ease, transform 0.18s ease !important;\n}\n.teacher_info:hover { transform: translateY(-3px) !important; box-shadow: var(--glass-shadow-hover) !important; }\n.teacher_photo { padding: 0.8rem !important; border: none !important; }\n.teacher_photo > img { display: block !important; border: none !important; border-radius: var(--radius-large) !important; }\n.teacher_desc { width: 100% !important; padding-left: 1.6rem !important; font-size: 1.25rem !important; }\n.teacher_desc > .chair { color: var(--color-text-secondary) !important; padding-bottom: 0.4rem !important; display: flex !important; align-items: center !important; }\n.teacher_desc > .teacher_name { font-size: 1.6rem !important; font-weight: 600 !important; padding-bottom: 0.8rem !important; display: flex !important; align-items: center !important; }\n.empty { background: initial !important; }\n\n\n/* ============================================================\n   СООБЩЕНИЯ\n   ============================================================ */\n\n.span9 > .nav.nav-tabs.nav-stacked > li > a { border: none !important; }\n.span9 > .nav.answ.nav-tabs.nav-stacked > li > a:hover,\n.span9 > .nav.msg.nav-tabs.nav-stacked > li > a:hover { text-decoration: none !important; }\n.span9 > .nav.answ.nav-tabs.nav-stacked { border: 1px solid var(--color-accent) !important; }\n.span9 > .nav.nav-tabs.nav-stacked > li > a:hover { background: none !important; text-decoration: underline !important; }\n.span9 > .nav.nav-tabs.nav-stacked > li > a:focus { background: none !important; }\n.nav.answ > li > a:hover > font,.nav.msg > li > a:hover > font { color: var(--color-text-primary) !important; }\n\n.nav.answ,.nav.msg {\n\tpadding: 1.4rem !important;\n\tborder: none !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n}\n.nav.answ .review,.nav.msg .review { padding: 0 !important; }\n.nav.answ .comment { margin-bottom: 1.4rem !important; }\n.nav { margin-bottom: 2rem !important; }\n.nav + .nav { margin-top: 2rem !important; }\n\n.nav.msg.message {\n\tpadding: 0 !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\ttransition: box-shadow 0.18s ease, transform 0.18s ease !important;\n}\n.nav.msg.message:hover { transform: translateY(-2px) !important; box-shadow: var(--glass-shadow-hover) !important; }\n.nav.msg.answ.message { border: 1px solid var(--color-accent) !important; box-shadow: 0 0 0 3px var(--color-accent-glow) !important; }\n\n.nav.msg.message > .message-header {\n\tdisplay: flex !important; justify-content: space-between !important;\n\tbackground: var(--glass-bg-header) !important;\n\tborder-radius: var(--radius-xxl) var(--radius-xxl) 0 0 !important;\n\tpadding: 1.6rem 2rem !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n}\n.message-header > font[style=\"font-weight:bold\"] { color: var(--color-text-primary) !important; font-weight: 600 !important; }\n.message-header > font[color=\"#808080\"] { color: var(--color-text-secondary) !important; min-width: 11rem !important; margin-left: 5rem !important; font-size: 1.2rem !important; }\n.nav.msg.message > li:nth-child(2) { padding-top: 2rem !important; padding-bottom: 2rem !important; line-height: 1.6 !important; }\n.nav.msg.message > li { padding-left: 2rem !important; padding-right: 2rem !important; }\n.nav.msg.message > li > a:hover,.nav.msg.message > li > a:focus { background: none !important; text-decoration: underline !important; }\n.nav.msg.message > li:nth-last-child(1) { padding-bottom: 2rem !important; }\n\n.message-pages { display: flex !important; justify-content: start !important; }\n.message-pages > li[style=\"width:5em\"] { display: none !important; }\n.message-info { display: flex !important; flex-direction: column !important; justify-content: space-between !important; }\n.message-info > *:nth-child(1) { margin-bottom: 1rem !important; }\n.message-info.main-info > b > i { display: flex !important; align-items: center !important; font-weight: 600 !important; font-style: normal !important; font-size: 1.5rem !important; }\n.secondary-info { text-align: right !important; margin-left: 5rem !important; }\n.message-info.secondary-info > * { color: var(--color-text-secondary) !important; font-weight: normal !important; }\n.message-info.secondary-info > font[title=\"Показать все сообщения по этой дисциплине\"]::before {\n\tfont-family: 'Material Icons Outlined' !important; content: 'filter_alt' !important;\n\tfont-size: 1.4rem !important; margin-right: 3px !important; vertical-align: top !important;\n}\n.message-info.secondary-info > font[title=\"Показать все сообщения по этой дисциплине\"]:hover { color: var(--color-text-primary) !important; cursor: pointer !important; }\n.secondary-info > font[color=\"#808080\"] { margin-top: 5px !important; }\n.message.nav.msg > li:nth-last-child(3) { padding-bottom: 2rem !important; }\n\n.answer-wrapper { display: flex !important; flex-direction: row-reverse !important; }\n.answer-wrapper > button {\n\tpadding: 0.6rem 1.2rem !important; font-size: 1.2rem !important;\n\tbackground: var(--color-accent-bg) !important;\n\tborder-color: var(--color-accent-light) !important;\n\tcolor: var(--color-accent) !important;\n}\n.answer-wrapper > button:hover { background: var(--color-accent-bg-hover) !important; transform: translateY(-1px) !important; }\n.answer-wrapper > button::before { font-family: 'Material Icons Outlined' !important; content: 'add' !important; font-size: 1.6rem !important; margin-right: 0.4rem !important; }\n\n.message > div > form { display: flex !important; flex-direction: column !important; padding: 0 2rem 2rem !important; }\n.message > div > form > textarea { margin: 0 0 1rem 0 !important; }\n.message > div > form > font { font-size: 1.2rem !important; color: var(--color-text-secondary) !important; margin: 0 0 1rem 0 !important; align-self: flex-end !important; }\n.message > div > form > input {\n\twidth: 13rem !important; height: 3.4rem !important;\n\tdisplay: flex !important; align-items: center !important; justify-content: center !important;\n\tbackground: var(--glass-bg) !important;\n\tcolor: var(--color-text-primary) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\talign-self: flex-end !important;\n\tcursor: pointer !important; transition: all 0.15s ease !important;\n}\n.message > div > form > input:hover { background: var(--glass-bg-hover) !important; }\n.message.repl_s.nav.msg { padding: 2rem !important; }\n.message.repl_s.nav.msg > li { padding: 0 !important; }\n\n\n/* ============================================================\n   ТУЛТИПЫ\n   ============================================================ */\n\n.sign-tooltip-wrapper {\n\tposition: fixed !important; display: flex !important; flex-direction: column !important;\n\talign-items: center !important;\n\tfilter: drop-shadow(0 6px 16px var(--color-accent-glow)) !important;\n\tz-index: 9999 !important;\n}\n.sign-tooltip {\n\tpadding: 0.8rem 1.4rem !important; max-width: 26rem !important;\n\tborder-radius: var(--radius-large) !important;\n\tfont-size: 1.2rem !important; line-height: 1.6 !important; text-align: center !important;\n\tcolor: var(--color-text-primary) !important;\n\tbackground: var(--glass-bg-tooltip) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border-light) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n}\n.sign-tooltip-triangle { position: relative !important; z-index: 11 !important; display: block !important; }\n.tooltipTriangle { opacity: 0.5 !important; }\n\n\n/* ============================================================\n   ПРОЧИЕ РАЗДЕЛЫ\n   ============================================================ */\n\n.themes .hour,.ctl_hours,.book_list .pages,.link_list .descr { color: var(--color-text-secondary) !important; }\n.badge.ctl { padding: 0.2rem 0.5rem !important; background: var(--color-error) !important; border-radius: 0.4rem !important; display: inline !important; font-size: 1.1rem !important; }\n.tpr_part { line-height: 1.6 !important; }\n.ses_part { line-height: 1.6 !important; }\n.cpt_list + h3 { margin-top: 2rem !important; }\n\n.ord-inactive { color: var(--color-text-secondary) !important; }\n.ord-name { font-size: 1.25rem !important; }\n.ord-name > a { text-decoration: none !important; }\n.ord-name > a:hover { text-decoration: underline !important; }\n.ord-name > .icon-button2 { margin: 0 0.4rem 0 0 !important; }\n.certificates-info {\n\tcolor: var(--color-green) !important; font-size: 1.25rem !important;\n\tdisplay: block !important; margin-bottom: 2rem !important;\n\tbackground: rgba(52,199,89,0.08) !important;\n\tborder: 1px solid rgba(52,199,89,0.16) !important;\n\tborder-radius: var(--radius-large) !important;\n\tpadding: 0.8rem 1.2rem !important;\n}\n\n.review { padding-bottom: 3rem !important; border-radius: var(--radius-large) !important; width: 100% !important; }\n.question { margin: 0 0 1.6rem 0 !important; }\n.question li { margin-left: 0.8rem !important; margin-top: 0.4rem !important; }\n.question > .text { color: var(--color-text-primary) !important; }\n.question label { color: var(--color-text-secondary) !important; display: flex !important; align-items: center !important; }\n.comment > label { color: var(--color-text-primary) !important; margin-bottom: 0.4rem !important; }\n.comment > textarea { width: 100% !important; height: 20rem !important; padding: 0.8rem 1.2rem !important; resize: none !important; }\nform.que_form { margin-top: 1rem !important; }\n.question_table { margin: 1.4rem 0 3rem !important; }\n.question_table .text,.question_table tr:first-child { background: var(--color-table-header) !important; }\n.cgrldatarow:hover { background: var(--color-table-highlight) !important; }\n.question_table .answer_cell .answer { margin: 0 !important; }\n\n\n/* ============================================================\n   СТРАНИЦА ВХОДА — Apple-стиль\n   ============================================================ */\n\n.login-container { display: flex !important; flex-direction: column !important; height: 100% !important; }\n.login {\n\tmargin: 2rem auto !important; display: flex !important;\n\talign-items: center !important; justify-content: center !important;\n\tflex: 1 0 auto !important; background: transparent !important;\n}\n.login:before,.login:after { display: none !important; }\n\n.psu-logo {\n\tposition: relative !important; height: 14rem !important; width: 100% !important;\n\tbackground-image: url(\"https://raw.githubusercontent.com/ENAleksey/etis-extension/8bc57f7b991ba8b6a07dec05809ac8c218082db4/psu_logo.svg\") !important;\n\tbackground-size: 14rem !important; background-position: center !important; background-repeat: no-repeat !important;\n\tmargin-bottom: 3.2rem !important; opacity: 0.40 !important;\n\tanimation: logo-breathe 4s ease-in-out infinite !important;\n}\n[theme=\"light\"] .psu-logo { filter: invert(1) !important; }\n\n@keyframes logo-breathe {\n\t0%, 100% { opacity: 0.40; }\n\t50%       { opacity: 0.55; }\n}\n\n.login > form > .choose {\n\tdisplay: block !important; padding: 0 !important; border-bottom: none !important;\n\tbackground: none !important; margin-bottom: 2rem !important; font-size: 0 !important;\n}\n.login > form > .choose > .right { display: none !important; }\n.login > form > .choose > h1 { font-size: 1.8rem !important; }\n\n.login-actions {\n\tdisplay: flex !important; align-items: center !important;\n\tjustify-content: space-between !important;\n\tfont-size: 1.3rem !important; margin-top: 0.8rem !important;\n}\n.forgot-password { color: var(--color-text-secondary) !important; font-size: 1.2rem !important; transition: color 0.12s ease !important; }\n.forgot-password:hover { color: var(--color-accent) !important; opacity: 1 !important; }\n.grecaptcha-badge { display: none !important; }\n\n.footer {\n\tmargin: 0 auto !important; max-width: 80rem !important;\n\tpadding: 2rem !important; color: var(--color-text-tertiary) !important;\n\tfont-size: 1.15rem !important; text-align: center !important;\n}\n.footer p + p { margin-top: 1rem !important; }\n\n.error_message {\n\tposition: fixed !important; left: 0 !important; right: 0 !important; top: 0 !important;\n\tpadding: 1rem 0 !important;\n\tbackground: rgba(255,59,48,0.92) !important;\n\tbackdrop-filter: blur(12px) !important;\n\tcolor: #fff !important; font-size: 1.3rem !important; font-weight: 500 !important;\n\ttext-align: center !important; z-index: 9999 !important;\n}\n.header_message { display: none !important; }\n\n.login form,.form {\n\tdisplay: flex !important; flex-direction: column !important;\n\tpadding: 3.2rem !important;\n\tbackground: var(--glass-bg) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border-light) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06) !important;\n\twidth: 36rem !important; margin: 0 auto !important;\n}\nform br { display: none !important; }\nform > h3 { margin-bottom: 2.8rem !important; font-weight: 700 !important; font-size: 2rem !important; letter-spacing: -0.04em !important; }\nform > .items { padding: 0 !important; font-size: 0 !important; }\nform > .items > .item { position: relative !important; margin: 0 0 3.2rem !important; z-index: 0 !important; font-size: 1.2rem !important; }\n.items > .item > input { text-indent: 0 !important; height: auto !important; line-height: normal !important; font-size: 1.45rem !important; padding: 0.2rem 0 0.8rem !important; }\n.items > .item > label {\n\tcolor: var(--color-text-secondary) !important; position: absolute !important;\n\tmargin: 0 !important; top: 0 !important; padding: 0 0 0.8rem !important;\n\tz-index: -1 !important; transition: all 0.18s ease !important;\n\tuser-select: none !important; font-size: 1.35rem !important;\n}\n.form > .error { color: var(--color-text-error) !important; padding-bottom: 1.6rem !important; }\n.form-info { margin-bottom: 2.8rem !important; }\n.form-info > span {\n\tcolor: var(--color-text-error) !important; font-size: inherit !important;\n\tfont-weight: normal !important; font-style: normal !important;\n\tdisplay: block !important; padding-bottom: 0.6rem !important;\n}\n.form-info > ul { padding-left: 1.6rem !important; padding-top: 0.6rem !important; }\n\n\n/* ============================================================\n   ТОСТЫ\n   ============================================================ */\n\n#etis3-toasts {\n\tposition: fixed !important;\n\tbottom: 2.4rem !important;\n\tright: 2.4rem !important;\n\tz-index: 99999 !important;\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\tgap: 0.8rem !important;\n\tpointer-events: none !important;\n}\n\n.etis3-toast {\n\tbackground: var(--glass-bg-active) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border-light) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;\n\tpadding: 1rem 1.8rem !important;\n\tfont-size: 1.35rem !important;\n\tfont-weight: 500 !important;\n\tcolor: var(--color-text-primary) !important;\n\topacity: 0 !important;\n\ttransform: translateY(10px) scale(0.97) !important;\n\ttransition: opacity 0.25s ease, transform 0.25s ease !important;\n}\n\n.etis3-toast--show {\n\topacity: 1 !important;\n\ttransform: translateY(0) scale(1) !important;\n}\n\n\n/* ============================================================\n   ПОИСК В САЙДБАРЕ\n   ============================================================ */\n\n.sidebar-search-wrap {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.6rem !important;\n\tpadding: 0.8rem 1.2rem !important;\n\tmargin-bottom: 0.4rem !important;\n\tbackground: var(--glass-bg-input) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n}\n\n.sidebar-search-icon {\n\tfont-family: 'Material Icons Outlined' !important;\n\tfont-size: 1.6rem !important;\n\tcolor: var(--color-text-secondary) !important;\n\tpointer-events: none !important;\n\tflex-shrink: 0 !important;\n}\n\n.sidebar-search-input {\n\tbackground: transparent !important;\n\tborder: none !important;\n\tborder-bottom: none !important;\n\tbox-shadow: none !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-size: 1.3rem !important;\n\tfont-family: var(--font-family) !important;\n\twidth: 100% !important;\n\toutline: none !important;\n\tpadding: 0 !important;\n}\n\n.sidebar-search-input::placeholder { color: var(--color-text-tertiary) !important; }\n\n\n/* ============================================================\n   ТЕМА В САЙДБАРЕ\n   ============================================================ */\n\n.theme-switcher-btn {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n\tcolor: var(--color-text-secondary) !important;\n\tcursor: pointer !important;\n\tfont-size: 1.3rem !important;\n\tpadding: 0.9rem 1.2rem 0.9rem 1.4rem !important;\n\ttransition: all 0.12s ease !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n}\n.theme-switcher-btn:hover { background: var(--color-table-highlight) !important; color: var(--color-text-primary) !important; }\n.theme-switcher-btn .material-icons { color: var(--color-accent) !important; }\n\n\n/* ============================================================\n   ВИДЖЕТ ПАРЫ\n   ============================================================ */\n\n.next-pair-widget {\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\tgap: 0.5rem !important;\n\tpadding: 1.4rem 1.8rem !important;\n\tmargin-bottom: 1.8rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n}\n\n.npw--active { border-color: var(--color-accent-light) !important; }\n\n.npw-label {\n\tdisplay: flex !important; align-items: center !important; gap: 0.6rem !important;\n\tfont-size: 1.15rem !important; font-weight: 500 !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n\n.npw-icon { font-family: 'Material Icons Outlined' !important; font-size: 1.6rem !important; color: var(--color-accent) !important; }\n.npw--active .npw-icon { animation: npw-pulse 2s ease-in-out infinite !important; }\n@keyframes npw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }\n\n.npw-time-badge {\n\tmargin-left: auto !important; font-size: 1.1rem !important; font-weight: 500 !important;\n\tcolor: var(--color-accent) !important; background: var(--color-accent-bg) !important;\n\tpadding: 0.2rem 0.8rem !important; border-radius: 50rem !important; white-space: nowrap !important;\n}\n\n.npw-name { font-size: 1.5rem !important; font-weight: 600 !important; color: var(--color-text-primary) !important; letter-spacing: -0.015em !important; line-height: 1.3 !important; }\n.npw-aud { display: flex !important; align-items: center !important; gap: 0.4rem !important; font-size: 1.2rem !important; color: var(--color-text-secondary) !important; }\n.npw-aud .material-icons { font-family: 'Material Icons Outlined' !important; font-size: 1.4rem !important; color: var(--color-text-secondary) !important; }\n.npw-progress-bar { height: 3px !important; background: var(--color-divider) !important; border-radius: 10rem !important; overflow: hidden !important; margin-top: 0.4rem !important; }\n.npw-progress-fill { height: 100% !important; background: var(--gradient-accent) !important; border-radius: 10rem !important; transition: width 1s ease !important; }\n\n\n/* ============================================================\n   ПОДСВЕТКА ТЕКУЩЕЙ ПАРЫ\n   ============================================================ */\n\nhtml:not(.etis3-no-highlight) tr.pair-row--active td { background: var(--color-accent-bg) !important; position: relative !important; }\nhtml:not(.etis3-no-highlight) tr.pair-row--active td:first-child { border-left: 2.5px solid var(--color-accent) !important; }\n.pair-progress-bar { position: absolute !important; top: 0 !important; right: 0 !important; width: 3px !important; height: 100% !important; background: var(--color-divider) !important; border-radius: 10rem !important; overflow: hidden !important; }\n.pair-progress-fill { position: absolute !important; top: 0 !important; width: 100% !important; background: var(--gradient-accent) !important; border-radius: 10rem !important; transition: height 60s linear !important; }\n\n\n/* ============================================================\n   ИКОНКИ ТИПОВ ПАР\n   ============================================================ */\n\n.pair-type-chip {\n\tdisplay: inline-flex !important; align-items: center !important; gap: 0.3rem !important;\n\tfont-size: 1.0rem !important; font-weight: 600 !important;\n\tpadding: 0.2rem 0.65rem !important; border-radius: 50rem !important;\n\tmargin-top: 0.4rem !important; letter-spacing: 0.01em !important;\n\ttransition: transform 0.12s ease !important;\n}\n.pair-type-chip:hover { transform: scale(1.04) !important; }\n.pair-type-chip .material-icons { font-size: 1.2rem !important; }\n\n.pair-type--lec  { background: rgba(88,86,214,0.10) !important; color: #5856d6 !important; }\n.pair-type--lab  { background: rgba(52,199,89,0.10)  !important; color: #34c759 !important; }\n.pair-type--prac { background: rgba(255,159,10,0.10) !important; color: #ff9f0a !important; }\n.pair-type--sem  { background: rgba(0,122,255,0.10)  !important; color: #007aff !important; }\n.pair-type--cons { background: rgba(255,59,48,0.10)  !important; color: #ff3b30 !important; }\n\n[theme=\"dark\"] .pair-type--lec  { background: rgba(94,92,230,0.16) !important; color: #7d7aff !important; }\n[theme=\"dark\"] .pair-type--lab  { background: rgba(48,209,88,0.14)  !important; color: #30d158 !important; }\n[theme=\"dark\"] .pair-type--prac { background: rgba(255,214,10,0.14) !important; color: #ffd60a !important; }\n[theme=\"dark\"] .pair-type--sem  { background: rgba(10,132,255,0.14) !important; color: #0a84ff !important; }\n[theme=\"dark\"] .pair-type--cons { background: rgba(255,69,58,0.14)  !important; color: #ff453a !important; }\n\n\n/* ============================================================\n   ОЦЕНКИ\n   ============================================================ */\n\ntr.row-green  td { background: rgba(52,199,89,0.06)  !important; }\ntr.row-yellow td { background: rgba(255,159,10,0.06) !important; }\ntr.row-red    td { background: rgba(255,59,48,0.06)  !important; }\ntr.row-green:hover  td { background: rgba(52,199,89,0.10)  !important; }\ntr.row-yellow:hover td { background: rgba(255,159,10,0.10) !important; }\ntr.row-red:hover    td { background: rgba(255,59,48,0.10)  !important; }\n\n.kt-progress { height: 3px !important; background: var(--color-divider) !important; border-radius: 10rem !important; margin-top: 0.5rem !important; overflow: hidden !important; }\n.kt-progress-fill { height: 100% !important; background: var(--gradient-accent) !important; border-radius: 10rem !important; transition: width 0.6s ease !important; }\n\n.score-dot { display: inline-block !important; width: 6px !important; height: 6px !important; border-radius: 50% !important; margin-left: 0.5rem !important; vertical-align: middle !important; flex-shrink: 0 !important; }\n.score-dot--high   { background: var(--color-green)  !important; }\n.score-dot--mid    { background: var(--color-yellow) !important; }\n.score-dot--low    { background: var(--color-red)    !important; }\n\n\n/* ============================================================\n   ПРОГРЕСС-БАР СЕМЕСТРА\n   ============================================================ */\n\n.semester-progress {\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n\tpadding: 1.2rem 1.4rem !important;\n\tmargin-bottom: 0.8rem !important;\n}\n.semester-progress__header { display: flex !important; justify-content: space-between !important; align-items: baseline !important; margin-bottom: 0.7rem !important; }\n.semester-progress__name { font-size: 1.2rem !important; font-weight: 600 !important; color: var(--color-text-primary) !important; letter-spacing: -0.01em !important; }\n.semester-progress__pct { font-size: 1.1rem !important; font-weight: 700 !important; color: var(--color-accent) !important; font-variant-numeric: tabular-nums !important; }\n.semester-progress__bar { height: 4px !important; background: var(--color-divider) !important; border-radius: 10rem !important; overflow: hidden !important; margin-bottom: 0.5rem !important; }\n.semester-progress__fill { height: 100% !important; background: var(--gradient-accent) !important; border-radius: 10rem !important; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1) !important; animation: sem-bar-grow 1.2s cubic-bezier(0.4, 0, 0.2, 1) both !important; animation-delay: 0.3s !important; }\n@keyframes sem-bar-grow { from { width: 0% !important; } }\n.semester-progress__sub { font-size: 1.1rem !important; color: var(--color-text-tertiary) !important; }\n\n\n/* ============================================================\n   БРЕНДИНГ\n   ============================================================ */\n\n.etis3-branding {\n\tpadding: 1.2rem 1.4rem !important; font-size: 1.1rem !important; font-weight: 500 !important;\n\tcolor: var(--color-text-tertiary) !important; letter-spacing: 0.02em !important;\n\ttext-align: center !important; border-top: 1px solid var(--color-divider) !important; margin-top: 0.8rem !important;\n}\n.etis3-branding span { color: var(--color-accent) !important; font-weight: 600 !important; }\n\n.login-branding {\n\ttext-align: center !important; font-size: 1.1rem !important; font-weight: 500 !important;\n\tcolor: var(--color-text-tertiary) !important; padding: 1.2rem 0 0 !important; letter-spacing: 0.02em !important;\n}\n.login-branding span { color: var(--color-accent) !important; font-weight: 600 !important; }\n\n\n/* ============================================================\n   ЧАСТИЦЫ И КУРСОР\n   ============================================================ */\n\n#etis3-particles {\n\tposition: fixed !important; inset: 0 !important; z-index: 0 !important;\n\tpointer-events: none !important; width: 100% !important; height: 100% !important;\n}\n\n.login-container { position: relative !important; z-index: 1 !important; }\n.login-container > *:not(#etis3-particles) { position: relative !important; z-index: 2 !important; }\n.login form, .login #form { position: relative !important; z-index: 2 !important; }\n\n@keyframes page-fade-in { from { opacity: 1; } to { opacity: 0; } }\n\n\n/* ============================================================\n   КОМПАКТНЫЙ РЕЖИМ\n   ============================================================ */\n\n.etis3-compact .day { margin-bottom: 1rem !important; border-radius: var(--radius-xl) !important; }\n.etis3-compact .timetable td { padding-top: 0.15rem !important; padding-bottom: 0.15rem !important; font-size: 1.2rem !important; }\n.etis3-compact .pair_num { height: 4.2rem !important; }\n.etis3-compact .pair_info .dis a { font-size: 1.25rem !important; }\n.etis3-compact .common td,.etis3-compact .slimtab_nice td { padding: 0.7rem 1.2rem !important; }\n.etis3-compact .nav.msg { margin-bottom: 1.2rem !important; }\n.etis3-compact .container .row { padding-top: 3rem !important; padding-bottom: 7rem !important; }\n\n\n/* ============================================================\n   ФОКУС — ДОСТУПНОСТЬ\n   ============================================================ */\n\na:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible {\n\toutline: 2px solid var(--color-accent) !important;\n\toutline-offset: 2px !important;\n\tborder-radius: var(--radius-small) !important;\n}\n\n\n/* ============================================================\n   ТИПОГРАФИКА\n   ============================================================ */\n\ntable.common td, table.slimtab_nice td { font-variant-numeric: tabular-nums !important; }\n.span9 > h3 { font-weight: 700 !important; letter-spacing: -0.035em !important; line-height: 1.1 !important; }\n.span3 > .nav.nav-tabs.nav-stacked > .active > a { font-weight: 600 !important; }\n.pair_info .dis a { font-weight: 600 !important; letter-spacing: -0.012em !important; }\n.pair_teacher > a { font-weight: 400 !important; }\n.pair_num .eval { font-weight: 700 !important; font-variant-numeric: tabular-nums !important; }\n.timetable-cache-label { font-size: 1.1rem !important; color: var(--color-text-tertiary) !important; margin-left: auto !important; white-space: nowrap !important; }\n.day-toggle-icon { font-family: 'Material Icons Outlined' !important; font-size: 1.6rem !important; color: var(--color-text-tertiary) !important; margin-left: auto !important; transition: transform 0.22s ease !important; }\n.day--collapsed .day-toggle-icon { transform: rotate(180deg) !important; }\n.badge-point { min-width: 0.6rem !important; width: 0.6rem !important; height: 0.6rem !important; background: var(--color-warning) !important; padding: 0 !important; margin: -1.2rem 0.6rem !important; border-radius: 50% !important; }\n.unread-badge { color: var(--color-accent) !important; font-size: 0.8rem !important; margin-left: 0.4rem !important; animation: pulse-dot 2s ease-in-out infinite !important; }\n@keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }\n.icon-button.icon-copy:before { content: 'content_copy' !important; font-family: 'Material Icons Outlined' !important; }\n\n\n\n\n\n\n/* ============================================================\n   КНОПКА НАСТРОЕК В САЙДБАРЕ\n   ============================================================ */\n\n.etis3-settings-li {\n\tborder-top: 1px solid var(--color-divider) !important;\n\tmargin-top: 0.4rem !important;\n}\n\n.etis3-settings-btn {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n\tpadding: 0.9rem 1.2rem 0.9rem 1.4rem !important;\n\tcolor: var(--color-accent) !important;\n\tfont-size: 1.3rem !important;\n\tfont-weight: 500 !important;\n\ttext-decoration: none !important;\n\ttransition: background 0.10s ease !important;\n}\n.etis3-settings-btn:hover {\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\topacity: 1 !important;\n\tpadding-left: 1.8rem !important;\n}\n.etis3-settings-btn .material-icons {\n\tfont-size: 1.7rem !important;\n\tcolor: var(--color-accent) !important;\n}\n\n\n/* ============================================================\n   ПАНЕЛЬ НАСТРОЕК\n   ============================================================ */\n\n#etis3-sp-overlay {\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tbackground: rgba(0,0,0,0.30) !important;\n\tbackdrop-filter: blur(8px) !important;\n\t-webkit-backdrop-filter: blur(8px) !important;\n\tz-index: 99990 !important;\n\topacity: 0 !important;\n\ttransition: opacity 0.25s ease !important;\n\tpointer-events: none !important;\n}\n#etis3-sp-overlay.etis3-sp-visible {\n\topacity: 1 !important;\n\tpointer-events: auto !important;\n}\n\n#etis3-sp-panel {\n\tposition: fixed !important;\n\ttop: 50% !important;\n\tleft: 50% !important;\n\ttransform: translate(-50%, -48%) scale(0.96) !important;\n\twidth: 420px !important;\n\tmax-width: 92vw !important;\n\tmax-height: 86vh !important;\n\toverflow-y: auto !important;\n\tbackground: var(--glass-bg-active) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border-light) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: 0 20px 60px rgba(0,0,0,0.20) !important;\n\tz-index: 99991 !important;\n\topacity: 0 !important;\n\ttransition: opacity 0.25s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1) !important;\n}\n#etis3-sp-panel.etis3-sp-visible {\n\topacity: 1 !important;\n\ttransform: translate(-50%, -50%) scale(1) !important;\n}\n\n.etis3-sp-head {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tjustify-content: space-between !important;\n\tpadding: 1.6rem 2rem 1.2rem !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n\tposition: sticky !important;\n\ttop: 0 !important;\n\tbackground: var(--glass-bg-active) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder-radius: var(--radius-xxl) var(--radius-xxl) 0 0 !important;\n\tz-index: 1 !important;\n}\n\n.etis3-sp-title {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n\tfont-size: 1.55rem !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: -0.02em !important;\n\tcolor: var(--color-text-primary) !important;\n}\n.etis3-sp-title .material-icons { color: var(--color-accent) !important; font-size: 2rem !important; }\n\n.etis3-sp-close {\n\twidth: 30px !important; height: 30px !important;\n\tborder-radius: 50% !important;\n\tbackground: var(--glass-bg-input) !important;\n\tborder: var(--glass-border) !important;\n\tpadding: 0 !important;\n\tbox-shadow: none !important;\n\tcolor: var(--color-text-secondary) !important;\n\tdisplay: flex !important; align-items: center !important; justify-content: center !important;\n\ttransition: background 0.12s ease !important;\n}\n.etis3-sp-close:hover {\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\ttransform: none !important;\n}\n.etis3-sp-close .material-icons { font-size: 1.6rem !important; }\n\n.etis3-sp-body { padding: 0.6rem 0 1rem !important; }\n\n.etis3-sp-section {\n\tpadding: 1.2rem 2rem !important;\n\tborder-bottom: 1px solid var(--color-divider) !important;\n}\n.etis3-sp-section-last { border-bottom: none !important; }\n\n.etis3-sp-section-label {\n\tfont-size: 1.0rem !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0.07em !important;\n\tcolor: var(--color-text-secondary) !important;\n\tmargin-bottom: 1rem !important;\n}\n\n.etis3-sp-row3 { display: flex !important; gap: 6px !important; }\n\n.etis3-sp-opt {\n\tflex: 1 !important;\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\talign-items: center !important;\n\tgap: 5px !important;\n\tpadding: 1rem 0.5rem !important;\n\tbackground: var(--glass-bg) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\tfont-size: 1.1rem !important;\n\tfont-weight: 500 !important;\n\tcolor: var(--color-text-secondary) !important;\n\tbox-shadow: none !important;\n\ttransition: background 0.12s ease, color 0.12s ease !important;\n}\n.etis3-sp-opt:hover { background: var(--glass-bg-hover) !important; color: var(--color-text-primary) !important; transform: none !important; }\n.etis3-sp-opt.active {\n\tbackground: var(--color-accent-bg) !important;\n\tborder-color: var(--color-accent) !important;\n\tcolor: var(--color-accent) !important;\n}\n.etis3-sp-opt .material-icons { font-size: 1.8rem !important; }\n\n.etis3-sp-accents {\n\tdisplay: grid !important;\n\tgrid-template-columns: repeat(8, 1fr) !important;\n\tgap: 8px !important;\n}\n\n.etis3-sp-swatch {\n\taspect-ratio: 1 !important;\n\twidth: 100% !important;\n\tborder-radius: 50% !important;\n\tborder: 3px solid transparent !important;\n\ttransition: transform 0.12s ease !important;\n}\n.etis3-sp-swatch { cursor: pointer !important; }\n.etis3-sp-swatch:hover { transform: scale(1.12) !important; }\n.etis3-sp-swatch.active { border-color: var(--color-text-primary) !important; }\n\n.etis3-sp-toggles { display: flex !important; flex-direction: column !important; }\n.etis3-sp-toggle-row {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tjustify-content: space-between !important;\n\tpadding: 0.8rem 0 !important;\n}\n.etis3-sp-toggle-row + .etis3-sp-toggle-row { border-top: 1px solid var(--color-divider) !important; }\n\n.etis3-sp-toggle-info {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n\tfont-size: 1.3rem !important;\n\tcolor: var(--color-text-primary) !important;\n}\n.etis3-sp-toggle-info .material-icons { color: var(--color-accent) !important; font-size: 1.6rem !important; flex-shrink: 0 !important; }\n.etis3-sp-toggle-info small { display: block !important; font-size: 1.05rem !important; color: var(--color-text-secondary) !important; margin-top: 1px !important; }\n\n.etis3-sp-toggle { position: relative !important; width: 36px !important; height: 20px !important; flex-shrink: 0 !important; }\n.etis3-sp-toggle input { display: none !important; }\n.etis3-sp-track {\n\tposition: absolute !important; inset: 0 !important;\n\tbackground: var(--color-divider) !important;\n\tborder-radius: 10px !important;\n\ttransition: background 0.18s ease !important;\n}\n.etis3-sp-toggle input:checked + .etis3-sp-track { background: var(--color-accent) !important; }\n.etis3-sp-track::after {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tleft: 2px !important; top: 2px !important;\n\twidth: 16px !important; height: 16px !important;\n\tbackground: #fff !important;\n\tborder-radius: 50% !important;\n\tbox-shadow: 0 1px 3px rgba(0,0,0,0.18) !important;\n\ttransition: transform 0.18s ease !important;\n}\n.etis3-sp-toggle input:checked + .etis3-sp-track::after { transform: translateX(16px) !important; }\n\n.etis3-sp-danger {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.6rem !important;\n\tcolor: var(--color-red) !important;\n\tbackground: rgba(255,59,48,0.08) !important;\n\tborder: 1px solid rgba(255,59,48,0.20) !important;\n\tborder-radius: var(--radius-large) !important;\n\tpadding: 0.8rem 1.4rem !important;\n\tfont-size: 1.3rem !important;\n\tbox-shadow: none !important;\n\ttransition: background 0.12s ease !important;\n}\n.etis3-sp-danger:hover { background: rgba(255,59,48,0.14) !important; transform: none !important; }\n.etis3-sp-danger .material-icons { color: var(--color-red) !important; font-size: 1.6rem !important; }\n\n\n/* ============================================================\n   СТАТИСТИКА ОЦЕНОК\n   ============================================================ */\n\n.etis3-stats-widget {\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xxl) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\tpadding: 1.8rem 2rem !important;\n\tmargin-bottom: 2.4rem !important;\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\tgap: 1.4rem !important;\n}\n\n.esw-header {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.8rem !important;\n}\n.esw-header .material-icons { color: var(--color-accent) !important; font-size: 2rem !important; }\n.esw-title { font-size: 1.55rem !important; font-weight: 700 !important; letter-spacing: -0.02em !important; color: var(--color-text-primary) !important; }\n\n.esw-grid {\n\tdisplay: grid !important;\n\tgrid-template-columns: repeat(4, 1fr) !important;\n\tgap: 0.8rem !important;\n}\n\n.esw-card {\n\tbackground: var(--glass-bg) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\tpadding: 1.1rem 1.3rem !important;\n}\n.esw-label { font-size: 1.0rem !important; color: var(--color-text-secondary) !important; font-weight: 500 !important; margin-bottom: 0.3rem !important; }\n.esw-value { font-size: 2rem !important; font-weight: 800 !important; color: var(--color-text-primary) !important; letter-spacing: -0.03em !important; font-variant-numeric: tabular-nums !important; }\n\n.esw-extremes {\n\tdisplay: grid !important;\n\tgrid-template-columns: 1fr 1fr !important;\n\tgap: 0.8rem !important;\n}\n.esw-ext {\n\tdisplay: flex !important;\n\talign-items: flex-start !important;\n\tgap: 0.9rem !important;\n\tbackground: var(--glass-bg) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\tpadding: 1.1rem 1.3rem !important;\n}\n.esw-ext-best .material-icons  { color: var(--color-green)  !important; font-size: 1.8rem !important; flex-shrink: 0 !important; margin-top: 0.2rem !important; }\n.esw-ext-worst .material-icons { color: var(--color-yellow) !important; font-size: 1.8rem !important; flex-shrink: 0 !important; margin-top: 0.2rem !important; }\n.esw-ext-label { font-size: 1.0rem !important; color: var(--color-text-secondary) !important; margin-bottom: 0.2rem !important; }\n.esw-ext-name  { font-size: 1.2rem !important; font-weight: 600 !important; color: var(--color-text-primary) !important; line-height: 1.3 !important; }\n.esw-ext-val   { font-size: 1.1rem !important; color: var(--color-accent) !important; font-weight: 600 !important; margin-top: 0.2rem !important; }\n\n.esw-bar-wrap { display: flex !important; flex-direction: column !important; gap: 0.5rem !important; }\n.esw-bar-title { font-size: 1.0rem !important; color: var(--color-text-secondary) !important; font-weight: 500 !important; }\n.esw-bars {\n\tdisplay: flex !important;\n\talign-items: flex-end !important;\n\tgap: 4px !important;\n\theight: 56px !important;\n}\n.esw-bar-col {\n\tflex: 1 !important;\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\talign-items: center !important;\n\tgap: 3px !important;\n\theight: 100% !important;\n}\n.esw-bar-fill {\n\twidth: 100% !important;\n\tborder-radius: 3px 3px 0 0 !important;\n\tmin-height: 0 !important;\n}\n.esw-bar-num { font-size: 0.95rem !important; color: var(--color-text-tertiary) !important; font-variant-numeric: tabular-nums !important; }\n\n\n/* ============================================================\n   LIQUID GLASS 2.0 — specular, noise, tinting, edge glow, depth\n   ============================================================ */\n\n/* ----------------------------------------------------------\n   SVG NOISE FILTER — встроенный, не требует внешних файлов\n   ---------------------------------------------------------- */\n\n.etis3-noise-filter {\n\tposition: fixed !important;\n\twidth: 0 !important;\n\theight: 0 !important;\n\tpointer-events: none !important;\n}\n\n/* ----------------------------------------------------------\n   NOISE TEXTURE через CSS — overlay поверх всех glass-элементов\n   Псевдоэлемент ::after с SVG-шумом через data URI\n   ---------------------------------------------------------- */\n\n/* Базовый mixin для glass-элементов — добавляем position:relative если нет */\n.span3 > .nav.nav-tabs.nav-stacked,\n.day,\n.common, .slimtab_nice, .teach_plan, .question_table,\n.ui-dialog,\n.nav.answ, .nav.msg,\n.nav.msg.message,\n.week,\n.teacher_info,\n.next-pair-widget,\n.semester-progress,\n.etis3-stats-widget,\n.login form, .login #form,\n.sign-tooltip,\n.etis3-toast {\n\tposition: relative !important;\n\tisolation: isolate !important;\n}\n\n/* Панель настроек остаётся fixed — блик ::before позиционируется относительно неё */\n#etis3-sp-panel { isolation: isolate !important; }\n\n/* Specular highlight — ::before — тонкий блик по верхнему краю */\n.span3 > .nav.nav-tabs.nav-stacked::before,\n.day::before,\n.common::before,\n.slimtab_nice::before,\n.nav.msg.message::before,\n.next-pair-widget::before,\n.semester-progress::before,\n.etis3-stats-widget::before,\n.login form::before,\n.login #form::before,\n#etis3-sp-panel::before {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tz-index: 1 !important;\n\tpointer-events: none !important;\n\tborder-radius: inherit !important;\n\n\t/* Specular: радиальный градиент — яркое пятно сверху по центру, затухает */\n\tbackground: radial-gradient(\n\t\tellipse 80% 30% at 50% 0%,\n\t\trgba(255,255,255,0.28) 0%,\n\t\trgba(255,255,255,0.10) 40%,\n\t\ttransparent 70%\n\t) !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked::before,\n[theme=\"dark\"] .day::before,\n[theme=\"dark\"] .common::before,\n[theme=\"dark\"] .slimtab_nice::before,\n[theme=\"dark\"] .nav.msg.message::before,\n[theme=\"dark\"] .next-pair-widget::before,\n[theme=\"dark\"] .semester-progress::before,\n[theme=\"dark\"] .etis3-stats-widget::before,\n[theme=\"dark\"] .login form::before,\n[theme=\"dark\"] #etis3-sp-panel::before {\n\tbackground: radial-gradient(\n\t\tellipse 80% 30% at 50% 0%,\n\t\trgba(255,255,255,0.14) 0%,\n\t\trgba(255,255,255,0.05) 40%,\n\t\ttransparent 70%\n\t) !important;\n}\n\n/* Noise texture — ::after — SVG turbulence через data URI */\n.span3 > .nav.nav-tabs.nav-stacked::after,\n.day::after,\n.common::after,\n.slimtab_nice::after,\n.next-pair-widget::after,\n.semester-progress::after,\n.etis3-stats-widget::after,\n.login form::after,\n.login #form::after {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tz-index: 2 !important;\n\tpointer-events: none !important;\n\tborder-radius: inherit !important;\n\topacity: 0.032 !important;\n\tbackground-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\") !important;\n\tbackground-size: 128px 128px !important;\n\tmix-blend-mode: overlay !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked::after,\n[theme=\"dark\"] .day::after,\n[theme=\"dark\"] .common::after,\n[theme=\"dark\"] .slimtab_nice::after,\n[theme=\"dark\"] .next-pair-widget::after,\n[theme=\"dark\"] .semester-progress::after,\n[theme=\"dark\"] .etis3-stats-widget::after,\n[theme=\"dark\"] .login form::after,\n[theme=\"dark\"] .login #form::after {\n\topacity: 0.045 !important;\n\tmix-blend-mode: soft-light !important;\n}\n\n/* ----------------------------------------------------------\n   COLOR TINTING — акцентный цвет просвечивает через стекло\n   ---------------------------------------------------------- */\n\n/* Тонкий цветной слой поверх стекла через outline-box */\n[theme=\"light\"] .span3 > .nav.nav-tabs.nav-stacked,\n[theme=\"light\"] .next-pair-widget,\n[theme=\"light\"] .etis3-stats-widget {\n\tbackground-image: linear-gradient(\n\t\t135deg,\n\t\trgba(110,98,214,0.04) 0%,\n\t\trgba(110,98,214,0.01) 50%,\n\t\ttransparent 100%\n\t) !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked,\n[theme=\"dark\"] .next-pair-widget,\n[theme=\"dark\"] .etis3-stats-widget {\n\tbackground-image: linear-gradient(\n\t\t135deg,\n\t\trgba(165,153,245,0.07) 0%,\n\t\trgba(165,153,245,0.02) 50%,\n\t\ttransparent 100%\n\t) !important;\n}\n\n/* Карточки дней расписания — лёгкий синеватый тинт */\n[theme=\"light\"] .day {\n\tbackground-image: linear-gradient(\n\t\t160deg,\n\t\trgba(120,160,255,0.04) 0%,\n\t\ttransparent 60%\n\t) !important;\n}\n\n[theme=\"dark\"] .day {\n\tbackground-image: linear-gradient(\n\t\t160deg,\n\t\trgba(100,130,255,0.06) 0%,\n\t\ttransparent 60%\n\t) !important;\n}\n\n/* ----------------------------------------------------------\n   EDGE GLOW — свечение акцента по периметру при hover\n   ---------------------------------------------------------- */\n\n/* Карточки — edge glow при hover */\n[theme=\"light\"] .day:hover,\n[theme=\"light\"] .nav.msg.message:hover,\n[theme=\"light\"] .teacher_info:hover {\n\tbox-shadow:\n\t\t0 6px 32px rgba(0,0,0,0.11),\n\t\t0 2px 8px rgba(0,0,0,0.06),\n\t\t0 0 0 1px rgba(110,98,214,0.18),\n\t\t0 0 16px rgba(110,98,214,0.10),\n\t\tvar(--glass-border-inner) !important;\n}\n\n[theme=\"dark\"] .day:hover,\n[theme=\"dark\"] .nav.msg.message:hover,\n[theme=\"dark\"] .teacher_info:hover {\n\tbox-shadow:\n\t\t0 6px 32px rgba(0,0,0,0.52),\n\t\t0 2px 8px rgba(0,0,0,0.32),\n\t\t0 0 0 1px rgba(165,153,245,0.22),\n\t\t0 0 20px rgba(165,153,245,0.12),\n\t\tvar(--glass-border-inner) !important;\n}\n\n/* Кнопки — edge glow */\n[theme=\"light\"] button:hover,\n[theme=\"light\"] button:focus {\n\tbox-shadow:\n\t\t0 4px 20px rgba(0,0,0,0.09),\n\t\t0 1px 4px rgba(0,0,0,0.05),\n\t\t0 0 0 1px rgba(110,98,214,0.15),\n\t\t0 0 12px rgba(110,98,214,0.08),\n\t\tvar(--glass-border-inner) !important;\n}\n\n[theme=\"dark\"] button:hover,\n[theme=\"dark\"] button:focus {\n\tbox-shadow:\n\t\t0 4px 20px rgba(0,0,0,0.40),\n\t\t0 1px 4px rgba(0,0,0,0.22),\n\t\t0 0 0 1px rgba(165,153,245,0.20),\n\t\t0 0 14px rgba(165,153,245,0.10),\n\t\tvar(--glass-border-inner) !important;\n}\n\n/* Сайдбар — edge glow при фокусе/hover ссылок */\n[theme=\"light\"] .span3 > .nav.nav-tabs.nav-stacked > li > a:hover {\n\tbox-shadow: inset 3px 0 12px rgba(110,98,214,0.06) !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked > li > a:hover {\n\tbox-shadow: inset 3px 0 12px rgba(165,153,245,0.08) !important;\n}\n\n/* ----------------------------------------------------------\n   DEPTH LAYERS — разный blur по уровню иерархии\n   Глубже = меньше blur (дальше от зрителя)\n   ---------------------------------------------------------- */\n\n/* Уровень 1 — сайдбар, карточки дней (самые \"близкие\") */\n.span3 > .nav.nav-tabs.nav-stacked,\n.day {\n\tbackdrop-filter: blur(28px) saturate(190%) brightness(1.05) !important;\n\t-webkit-backdrop-filter: blur(28px) saturate(190%) brightness(1.05) !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked,\n[theme=\"dark\"] .day {\n\tbackdrop-filter: blur(28px) saturate(170%) brightness(0.95) !important;\n\t-webkit-backdrop-filter: blur(28px) saturate(170%) brightness(0.95) !important;\n}\n\n/* Уровень 2 — таблицы, сообщения (средний план) */\n.common, .slimtab_nice,\n.nav.msg.message,\n.next-pair-widget,\n.etis3-stats-widget {\n\tbackdrop-filter: blur(20px) saturate(170%) brightness(1.04) !important;\n\t-webkit-backdrop-filter: blur(20px) saturate(170%) brightness(1.04) !important;\n}\n\n[theme=\"dark\"] .common,\n[theme=\"dark\"] .slimtab_nice,\n[theme=\"dark\"] .nav.msg.message,\n[theme=\"dark\"] .next-pair-widget,\n[theme=\"dark\"] .etis3-stats-widget {\n\tbackdrop-filter: blur(20px) saturate(155%) brightness(0.96) !important;\n\t-webkit-backdrop-filter: blur(20px) saturate(155%) brightness(0.96) !important;\n}\n\n/* Уровень 3 — мелкие элементы: semester-progress, недели (дальний план) */\n.semester-progress,\n.week,\nbutton,\n.icon-button {\n\tbackdrop-filter: blur(14px) saturate(150%) brightness(1.03) !important;\n\t-webkit-backdrop-filter: blur(14px) saturate(150%) brightness(1.03) !important;\n}\n\n[theme=\"dark\"] .semester-progress,\n[theme=\"dark\"] .week,\n[theme=\"dark\"] button,\n[theme=\"dark\"] .icon-button {\n\tbackdrop-filter: blur(14px) saturate(140%) brightness(0.97) !important;\n\t-webkit-backdrop-filter: blur(14px) saturate(140%) brightness(0.97) !important;\n}\n\n/* Уровень 0 — диалоги, панель настроек (самый верхний слой) */\n.ui-dialog,\n#etis3-sp-panel {\n\tbackdrop-filter: blur(48px) saturate(220%) brightness(1.06) !important;\n\t-webkit-backdrop-filter: blur(48px) saturate(220%) brightness(1.06) !important;\n}\n\n[theme=\"dark\"] .ui-dialog,\n[theme=\"dark\"] #etis3-sp-panel {\n\tbackdrop-filter: blur(48px) saturate(200%) brightness(0.94) !important;\n\t-webkit-backdrop-filter: blur(48px) saturate(200%) brightness(0.94) !important;\n}\n\n/* Overlay — максимальный blur */\n.ui-widget-overlay,\n#etis3-sp-overlay {\n\tbackdrop-filter: blur(20px) saturate(120%) !important;\n\t-webkit-backdrop-filter: blur(20px) saturate(120%) !important;\n}\n\n/* ----------------------------------------------------------\n   REFRACTION SIMULATION — линзовый эффект на login form\n   ---------------------------------------------------------- */\n\n/* На странице входа форма слегка \"линзует\" фон */\n.login form,\n.login #form {\n\tbackdrop-filter: blur(40px) saturate(200%) brightness(1.06) contrast(1.02) !important;\n\t-webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.06) contrast(1.02) !important;\n\t/* Лёгкий outline-glow — форма \"светится\" */\n\tbox-shadow:\n\t\t0 8px 48px rgba(0,0,0,0.12),\n\t\t0 2px 10px rgba(0,0,0,0.06),\n\t\t0 0 0 1px rgba(255,255,255,0.60),\n\t\t0 0 40px rgba(110,98,214,0.08),\n\t\tinset 0 1px 0 rgba(255,255,255,0.95),\n\t\tinset 0 -1px 0 rgba(255,255,255,0.30) !important;\n}\n\n[theme=\"dark\"] .login form,\n[theme=\"dark\"] .login #form {\n\tbackdrop-filter: blur(40px) saturate(180%) brightness(0.95) contrast(1.04) !important;\n\t-webkit-backdrop-filter: blur(40px) saturate(180%) brightness(0.95) contrast(1.04) !important;\n\tbox-shadow:\n\t\t0 8px 48px rgba(0,0,0,0.45),\n\t\t0 2px 10px rgba(0,0,0,0.28),\n\t\t0 0 0 1px rgba(255,255,255,0.10),\n\t\t0 0 40px rgba(165,153,245,0.12),\n\t\tinset 0 1px 0 rgba(255,255,255,0.14),\n\t\tinset 0 -1px 0 rgba(0,0,0,0.20) !important;\n}\n\n/* ----------------------------------------------------------\n   BOTTOM EDGE HIGHLIGHT — нижний край чуть темнее (толщина стекла)\n   ---------------------------------------------------------- */\n\n[theme=\"light\"] .day,\n[theme=\"light\"] .span3 > .nav.nav-tabs.nav-stacked,\n[theme=\"light\"] .nav.msg.message {\n\tbox-shadow:\n\t\t0 2px 20px rgba(0,0,0,0.07),\n\t\t0 1px 4px rgba(0,0,0,0.04),\n\t\tinset 0 1px 0 rgba(255,255,255,0.90),\n\t\tinset 1px 0 0 rgba(255,255,255,0.50),\n\t\tinset 0 -1px 0 rgba(0,0,0,0.05) !important;\n}\n\n[theme=\"dark\"] .day,\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked,\n[theme=\"dark\"] .nav.msg.message {\n\tbox-shadow:\n\t\t0 2px 20px rgba(0,0,0,0.36),\n\t\t0 1px 4px rgba(0,0,0,0.24),\n\t\tinset 0 1px 0 rgba(255,255,255,0.12),\n\t\tinset 1px 0 0 rgba(255,255,255,0.06),\n\t\tinset 0 -1px 0 rgba(0,0,0,0.18) !important;\n}\n\n/* ----------------------------------------------------------\n   ACCENT PULSE на активном элементе сайдбара\n   ---------------------------------------------------------- */\n\n[theme=\"light\"] .span3 > .nav.nav-tabs.nav-stacked > .active > a {\n\tbackground: var(--color-accent-bg) !important;\n\tbox-shadow: inset 0 0 20px rgba(110,98,214,0.08) !important;\n}\n\n[theme=\"dark\"] .span3 > .nav.nav-tabs.nav-stacked > .active > a {\n\tbackground: var(--color-accent-bg) !important;\n\tbox-shadow: inset 0 0 20px rgba(165,153,245,0.10) !important;\n}\n\n/* ----------------------------------------------------------\n   WEEK CHIPS — улучшенный liquid glass для недель\n   ---------------------------------------------------------- */\n\n[theme=\"light\"] .week:hover {\n\tbox-shadow:\n\t\t0 4px 14px rgba(0,0,0,0.09),\n\t\t0 0 0 1px rgba(110,98,214,0.16),\n\t\tinset 0 1px 0 rgba(255,255,255,0.90) !important;\n}\n\n[theme=\"dark\"] .week:hover {\n\tbox-shadow:\n\t\t0 4px 14px rgba(0,0,0,0.38),\n\t\t0 0 0 1px rgba(165,153,245,0.18),\n\t\tinset 0 1px 0 rgba(255,255,255,0.12) !important;\n}\n\n\n/* ============================================================\n   ПЕРЕКЛЮЧАТЕЛИ ИЗ НАСТРОЕК\n   Классы вешаются на <html>, чтобы применять без перезагрузки\n   ============================================================ */\n\n.pair-type-raw                              { display: none !important; }\n.etis3-no-pairtypes .pair-type-raw          { display: inline !important; }\n.etis3-no-pairtypes .pair-type-chip         { display: none !important; }\n.etis3-no-widget .next-pair-widget          { display: none !important; }\n.etis3-no-highlight .pair-progress-bar      { display: none !important; }\n.etis3-no-scoredots .score-dot              { display: none !important; }\n\n\n/* ============================================================\n   ПЕРЕХОД МЕЖДУ СТРАНИЦАМИ\n   ============================================================ */\n\n#etis3-page-overlay {\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tz-index: 99999 !important;\n\tbackground: var(--bg-gradient) !important;\n\topacity: 0 !important;\n\tpointer-events: none !important;\n\ttransition: opacity 0.2s ease !important;\n}\n#etis3-page-overlay.etis3-overlay--out { opacity: 0.85 !important; }\n\n\n/* ============================================================\n   РАЗМЕР ТЕКСТА В ПАНЕЛИ НАСТРОЕК\n   ============================================================ */\n\n.etis3-sp-font-row {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1.2rem !important;\n}\n.etis3-sp-font-row input[type=\"range\"] {\n\tflex: 1 !important;\n\taccent-color: var(--color-accent) !important;\n\tcursor: pointer !important;\n}\n#etis3-sp-font-val {\n\tmin-width: 3.6rem !important;\n\ttext-align: right !important;\n\tfont-size: 1.2rem !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n\n\n/* ============================================================\n   МЕНЬШЕ ДВИЖЕНИЯ\n   ============================================================ */\n\n@media (prefers-reduced-motion: reduce) {\n\t*, *::before, *::after {\n\t\tanimation-duration: 0.01ms !important;\n\t\tanimation-iteration-count: 1 !important;\n\t\ttransition-duration: 0.01ms !important;\n\t\tscroll-behavior: auto !important;\n\t}\n}\n\n\n/* ============================================================\n   ПОЛИРОВКА 3.3\n   ============================================================ */\n\n/* ---------- Карточка профиля (данные из скрытой шапки ЕТИСа) ---------- */\n.etis3-profile {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1rem !important;\n\tpadding: 1rem 1.2rem !important;\n\tmargin-bottom: 0.6rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbackdrop-filter: var(--glass-filter) !important;\n\t-webkit-backdrop-filter: var(--glass-filter) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n}\n.etis3-profile__avatar {\n\tflex-shrink: 0 !important;\n\twidth: 3.6rem !important;\n\theight: 3.6rem !important;\n\tborder-radius: 50% !important;\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tjustify-content: center !important;\n\tbackground: var(--gradient-accent) !important;\n\tcolor: #fff !important;\n\tfont-size: 1.3rem !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: 0.02em !important;\n}\n.etis3-profile__info { min-width: 0 !important; }\n.etis3-profile__name {\n\tfont-size: 1.35rem !important;\n\tfont-weight: 600 !important;\n\tcolor: var(--color-text-primary) !important;\n\twhite-space: nowrap !important;\n\toverflow: hidden !important;\n\ttext-overflow: ellipsis !important;\n}\n.etis3-profile__sub {\n\tmargin-top: 0.2rem !important;\n\tfont-size: 1.1rem !important;\n\tcolor: var(--color-text-secondary) !important;\n\twhite-space: nowrap !important;\n\toverflow: hidden !important;\n\ttext-overflow: ellipsis !important;\n}\n\n/* ---------- Поиск в сайдбаре: перебить общий стиль input[type=text] ---------- */\n.sidebar-search-wrap .sidebar-search-input,\n.sidebar-search-wrap .sidebar-search-input:focus {\n\tborder: none !important;\n\tborder-bottom: none !important;\n\theight: auto !important;\n\tline-height: 1.4 !important;\n\tmargin: 0 !important;\n}\n.sidebar-search-wrap:focus-within {\n\tborder-color: var(--color-accent) !important;\n\tbox-shadow: 0 0 0 3px var(--color-accent-glow), var(--glass-shadow-card) !important;\n}\n.sidebar-search-icon { line-height: 1 !important; }\n\n/* ---------- Зелёные пункты меню: читаемый контраст в светлой теме ---------- */\n.span3 font[color=\"green\"] > b { font-weight: 600 !important; }\n[theme=\"light\"] .span3 font[color=\"green\"] { color: #1e8e3e !important; }\n\n/* ---------- Заголовки: h2 — заголовок страницы, h3 после него — разделы ---------- */\n.span9 > h2 {\n\tfont-size: 2.4rem !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: -0.03em !important;\n\tline-height: 1.15 !important;\n\tcolor: var(--color-text-primary) !important;\n\tmargin: 0 0 2rem !important;\n}\n.span9 > h2 ~ h3 {\n\tfont-size: 1.6rem !important;\n\tletter-spacing: -0.015em !important;\n\tmargin: 2.4rem 0 1rem !important;\n}\n\n/* ---------- Текстовые страницы («О ресурсе» и т.п.) ---------- */\n.span9 .text { max-width: 72rem !important; }\n.span9 .text p {\n\tfont-size: 1.4rem !important;\n\tline-height: 1.65 !important;\n\ttext-align: left !important;\n\ttext-indent: 0 !important;\n\tmargin: 0 0 1.4rem !important;\n\tcolor: var(--color-text-primary) !important;\n}\n.span9 .text h2 {\n\tfont-size: 1.8rem !important;\n\tfont-weight: 650 !important;\n\tletter-spacing: -0.02em !important;\n\ttext-indent: 0 !important;\n\tmargin: 2.8rem 0 1rem !important;\n}\n\n/* ---------- Списки ссылок (бланки, документы) ---------- */\n.span9 > ul[style*=\"list-style\"] { padding-left: 2rem !important; margin: 0 0 0.4rem !important; }\n.span9 > ul[style*=\"list-style\"] > li {\n\tfont-size: 1.35rem !important;\n\tline-height: 1.5 !important;\n\tmargin-bottom: 0.7rem !important;\n}\n.span9 > ul[style*=\"list-style\"] > li::marker { color: var(--color-text-tertiary) !important; }\n\n/* ---------- Раскрывающиеся разделы (портфолио): h3 > a.dashed ---------- */\n.span9 > h3:has(> a.dashed) {\n\tmargin: 0 0 0.8rem !important;\n\tfont-size: 1.4rem !important;\n\tletter-spacing: 0 !important;\n}\n.span9 > h3 > a.dashed {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1rem !important;\n\tpadding: 1.2rem 1.6rem !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-large) !important;\n\tbackground: var(--glass-bg-card) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-weight: 600 !important;\n\ttext-decoration: none !important;\n\twhite-space: normal !important;\n\topacity: 1 !important;\n\ttransition: background 0.15s ease !important;\n}\n.span9 > h3 > a.dashed:hover { background: var(--glass-bg-hover) !important; }\n.span9 > h3 > a.dashed::after {\n\tcontent: 'expand_more' !important;\n\tfont-family: 'Material Icons Outlined' !important;\n\tfont-size: 2rem !important;\n\tfont-weight: normal !important;\n\tcolor: var(--color-text-tertiary) !important;\n\tmargin-left: 0 !important;\n}\n.span9 > h3 > a.dashed > span[id$=\"_cnt\"] {\n\tmargin-left: auto !important;\n\tpadding: 0.2rem 0.9rem !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\tfont-size: 1.15rem !important;\n\tfont-weight: 600 !important;\n}\n.span9 > h3.etis3-section--empty > a.dashed { opacity: 0.6 !important; }\n.span9 > h3.etis3-section--empty > a.dashed:hover { opacity: 0.85 !important; }\n\n/* ---------- Сообщения и объявления: читаемый текст ---------- */\n.nav.msg.message > li { font-size: 1.35rem !important; line-height: 1.55 !important; }\n.nav.msg.message > li.message-header { line-height: 1.35 !important; }\n.message-header font[style=\"font-weight:bold\"] { font-size: 1.4rem !important; }\n\n/* Ответ студента: файловая форма и кнопка — в стиле «Добавить ответ» */\n.nav.msg.repl_s input[type=\"button\"],\n.nav.msg.repl_s input[type=\"submit\"],\n.nav.msg input[type=\"submit\"] {\n\tmargin-top: 0.8rem !important;\n\tpadding: 0.6rem 1.2rem !important;\n\tfont-size: 1.2rem !important;\n\tfont-family: var(--font-family) !important;\n\tborder-radius: var(--radius-medium) !important;\n\tborder: 1px solid var(--color-accent-light) !important;\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\tcursor: pointer !important;\n}\n.nav.msg.repl_s input[type=\"button\"]:hover,\n.nav.msg input[type=\"submit\"]:hover { background: var(--color-accent-bg-hover) !important; }\n\n/* ---------- Электронные ресурсы ---------- */\n.span9 > p[style*=\"width:800px\"] {\n\twidth: auto !important;\n\tmax-width: 72rem !important;\n\tfont-size: 1.4rem !important;\n\tline-height: 1.55 !important;\n\tmargin-bottom: 1.6rem !important;\n}\n.span9 > h3[style*=\"dotted\"] {\n\twidth: auto !important;\n\tborder: none !important;\n\tborder-left: 3px solid var(--color-accent) !important;\n\tborder-radius: var(--radius-medium) !important;\n\tbackground: var(--color-accent-bg) !important;\n\tpadding: 1.2rem 1.6rem !important;\n\tfont-size: 1.5rem !important;\n\tletter-spacing: -0.01em !important;\n}\ntable#resources { width: 100% !important; }\ntd.etis3-copy {\n\tcursor: copy !important;\n\tfont-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace !important;\n\tfont-size: 1.25rem !important;\n\ttransition: background 0.12s ease, color 0.12s ease !important;\n}\ntd.etis3-copy:hover { background: var(--color-accent-bg) !important; color: var(--color-accent) !important; }\n\n/* ---------- Образовательный стандарт: компетенции ---------- */\n.cpt_list {\n\tdisplay: flex !important;\n\tgap: 0.8rem !important;\n\tfont-size: 1.35rem !important;\n\tline-height: 1.5 !important;\n\tmargin-bottom: 0.8rem !important;\n}\n.cpt_list .cpt_num {\n\tflex-shrink: 0 !important;\n\tmin-width: 2.2rem !important;\n\tcolor: var(--color-accent) !important;\n\tfont-weight: 700 !important;\n\tfont-variant-numeric: tabular-nums !important;\n}\n\n/* ---------- Bootstrap 2 из ЕТИСа: [class^=\"icon-\"] задаёт 14×14px и спрайт глифов\n   всем элементам с классом на icon-, включая наши кнопки — сбрасываем ---------- */\n.icon-button, .icon-button2 {\n\twidth: auto !important;\n\theight: auto !important;\n\tline-height: normal !important;\n\tmargin-top: 0 !important;\n\tvertical-align: middle !important;\n\tbackground-image: none !important;\n}\n.icon-button { white-space: nowrap !important; }\n.span9 > a.icon-button { margin-bottom: 1.6rem !important; }\n.span9 > a.icon-button + br + br { display: none !important; }\n\n/* ---------- Подменю-вкладки (библиотека, обратная связь, …) ---------- */\n.span9 .submenu {\n\tdisplay: flex !important;\n\tflex-wrap: wrap !important;\n\tgap: 0.6rem !important;\n\tmargin: 0 0 2rem !important;\n\tfont-size: 1.25rem !important;\n}\n.span9 .submenu-item {\n\tmargin: 0 !important;\n\tpadding: 0.5rem 1.2rem !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\tfont-weight: 600 !important;\n}\n.span9 .submenu-item:has(> a) { padding: 0 !important; background: none !important; }\n.span9 .submenu-item > a.dashed {\n\tdisplay: inline-block !important;\n\tpadding: 0.5rem 1.2rem !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tcolor: var(--color-text-secondary) !important;\n\tfont-weight: 500 !important;\n\ttext-decoration: none !important;\n}\n.span9 .submenu-item > a.dashed:hover { color: var(--color-text-primary) !important; background: var(--glass-bg-hover) !important; opacity: 1 !important; }\n.span9 > .submenu + p { font-size: 1.3rem !important; margin-bottom: 2rem !important; color: var(--color-text-secondary) !important; }\n\n/* ---------- Список ссылок-строк в контенте (журнал посещений) ---------- */\n.span9 > ul.nav-stacked {\n\tmargin: 0 0 2rem !important;\n\tpadding: 0.4rem !important;\n\tmax-width: 72rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tborder: var(--glass-border) !important;\n\tborder-radius: var(--radius-xl) !important;\n\tbox-shadow: var(--glass-shadow-card) !important;\n}\n.span9 > ul.nav-stacked > li > a {\n\tdisplay: block !important;\n\tpadding: 1rem 1.4rem !important;\n\tborder: none !important;\n\tborder-radius: var(--radius-medium) !important;\n\tbackground: none !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-size: 1.35rem !important;\n}\n.span9 > ul.nav-stacked > li > a:hover { background: var(--color-accent-bg) !important; color: var(--color-accent) !important; opacity: 1 !important; }\n.span9 > ul.nav-stacked > li + li { border-top: 1px solid var(--color-divider) !important; }\n\n/* ---------- Расписание: пустые слоты ---------- */\ntr.pair-row--lead { display: none !important; }\ntr.pair-row--empty td { padding-top: 0.2rem !important; padding-bottom: 0.2rem !important; opacity: 0.45 !important; }\ntr.pair-row--empty .pair_num { height: auto !important; font-size: 1.1rem !important; }\ntr.pair-row--empty .pair_info::after {\n\tcontent: 'окно' !important;\n\tfont-size: 1.15rem !important;\n\tfont-style: italic !important;\n\tcolor: var(--color-text-tertiary) !important;\n}\n\n/* ---------- Расписание: блок синхронизации календаря ---------- */\n.timetable-btn.consultations { flex: 1 1 100% !important; order: 10 !important; }\n.timetable-btn.consultations > h2 {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1rem !important;\n\tmargin: 0 !important;\n\tfont-size: 1.35rem !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0 !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n.timetable-btn.consultations input[type=\"button\"],\n.timetable-btn.consultations button {\n\tpadding: 0.4rem 1.1rem !important;\n\tfont-size: 1.2rem !important;\n\tfont-family: var(--font-family) !important;\n\tborder-radius: 10rem !important;\n\tborder: 1px solid var(--color-accent-light) !important;\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\tcursor: pointer !important;\n}\n.timetable-btn.consultations #resources { margin-top: 1rem !important; font-size: 1.3rem !important; line-height: 1.55 !important; }\n.timetable-btn.consultations #resources h3 { font-size: 1.4rem !important; margin-bottom: 0.6rem !important; }\n\n/* ---------- Поясняющие абзацы в контенте ---------- */\n.span9 > p { font-size: 1.3rem !important; line-height: 1.6 !important; max-width: 80rem !important; }\n\n/* ---------- Оценки: сводка по дисциплине и семестру ---------- */\n.etis3-dis-summary {\n\tdisplay: flex !important;\n\tflex-wrap: wrap !important;\n\talign-items: center !important;\n\tgap: 0.6rem !important;\n\tmargin: -0.8rem 0 1.2rem !important;\n}\n.eds-chip {\n\tpadding: 0.25rem 0.9rem !important;\n\tborder-radius: 10rem !important;\n\tfont-size: 1.15rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tborder: var(--glass-border) !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n.eds-chip b { color: var(--color-text-primary) !important; }\n.eds-chip--ok  { color: var(--color-green) !important; }\n.eds-chip--bad { color: var(--color-red) !important; background: rgba(255,59,48,0.10) !important; }\n.eds-bar, .esw-dis-bar {\n\tflex: 1 1 12rem !important;\n\tmax-width: 24rem !important;\n\theight: 0.5rem !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--color-divider) !important;\n\toverflow: hidden !important;\n}\n.eds-bar-fill, .esw-dis-bar > span {\n\tdisplay: block !important;\n\theight: 100% !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--gradient-accent) !important;\n}\n.esw-value small { font-size: 1.3rem !important; font-weight: 600 !important; color: var(--color-text-tertiary) !important; }\n.esw-dis-list { display: flex !important; flex-direction: column !important; gap: 0.8rem !important; margin-top: 1.4rem !important; }\n.esw-dis {\n\tdisplay: grid !important;\n\tgrid-template-columns: minmax(0, 1fr) 14rem 15rem !important;\n\talign-items: center !important;\n\tgap: 1.2rem !important;\n\tfont-size: 1.25rem !important;\n}\n.esw-dis-name { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; color: var(--color-text-primary) !important; }\n.esw-dis .esw-dis-bar { max-width: none !important; }\n.esw-dis-val { text-align: right !important; color: var(--color-text-secondary) !important; font-variant-numeric: tabular-nums !important; }\n.esw-dis-val b { color: var(--color-red) !important; font-weight: 600 !important; }\n.esw-dis--bad .esw-dis-bar > span { background: var(--color-red) !important; }\n\n\n/* ============================================================\n   САЙДБАР 3.5: группы, иконки, бейджи, строка быстрых действий\n   ============================================================ */\n\n.etis3-main-nav > li > a { justify-content: flex-start !important; gap: 1rem !important; }\n.etis3-main-nav > li > a > .material-icons {\n\tmargin: 0 !important;\n\tfont-size: 1.8rem !important;\n\twidth: 1.8rem !important;\n\tflex-shrink: 0 !important;\n\tcolor: var(--color-text-tertiary) !important;\n\ttransition: color 0.12s ease !important;\n}\n.etis3-main-nav > li > a:hover > .material-icons,\n.etis3-main-nav > .active > a > .material-icons { color: var(--color-accent) !important; }\n.etis3-nav-label { flex: 1 !important; min-width: 0 !important; line-height: 1.3 !important; }\n.etis3-nav-count {\n\tflex-shrink: 0 !important;\n\tmin-width: 2rem !important;\n\tpadding: 0.1rem 0.7rem !important;\n\tborder-radius: 10rem !important;\n\tbackground: var(--color-accent-bg) !important;\n\tcolor: var(--color-accent) !important;\n\tfont-size: 1.1rem !important;\n\tfont-weight: 600 !important;\n\ttext-align: center !important;\n\tfont-variant-numeric: tabular-nums !important;\n}\n.etis3-nav-count--zero { background: none !important; color: var(--color-text-tertiary) !important; font-weight: 500 !important; }\n\n/* Заголовок группы */\n.etis3-main-nav > li.etis3-nav-head { border-top: 1px solid var(--color-divider) !important; }\n.etis3-main-nav > li.etis3-nav-head > a {\n\tpadding-top: 1rem !important;\n\tpadding-bottom: 1rem !important;\n\tfont-size: 1.1rem !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0.06em !important;\n\ttext-transform: uppercase !important;\n\tcolor: var(--color-text-secondary) !important;\n\tuser-select: none !important;\n}\n.etis3-main-nav > li.etis3-nav-head > a:hover { padding-left: 1.4rem !important; color: var(--color-text-primary) !important; }\n.etis3-nav-head__count {\n\tfont-size: 1.05rem !important;\n\tfont-weight: 500 !important;\n\tletter-spacing: 0 !important;\n\tcolor: var(--color-text-tertiary) !important;\n}\n.etis3-main-nav > li.etis3-nav-head > a > .etis3-nav-head__chevron {\n\twidth: auto !important;\n\tfont-size: 2rem !important;\n\ttransition: transform 0.2s ease !important;\n}\n.etis3-nav-head--open .etis3-nav-head__chevron { transform: rotate(180deg) !important; }\n.etis3-nav-head--open + li:not(.etis3-nav-head) { border-top: none !important; }\n\n/* Свёрнутые пункты; при поиске всё раскрыто, несовпадения скрыты */\n.etis3-main-nav > li.etis3-nav-closed { display: none !important; }\n.etis3-searching .etis3-main-nav > li.etis3-nav-closed { display: block !important; }\n.etis3-searching .etis3-main-nav > li.etis3-nav-head { display: none !important; }\n.span3 .nav.nav-tabs.nav-stacked > li.etis3-nav-miss,\n.etis3-searching .etis3-main-nav > li.etis3-nav-miss { display: none !important; }\n\n/* Строка быстрых действий */\n.span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar {\n\tdisplay: flex !important;\n\tjustify-content: space-between !important;\n\tpadding: 0.4rem !important;\n}\n.etis3-quickbar > li { flex: 1 !important; display: block !important; }\n.etis3-quickbar > li::before { display: none !important; }\n.span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar > li > a {\n\tjustify-content: center !important;\n\tpadding: 0.9rem 0 !important;\n\tfont-size: 0 !important;\n\tborder-radius: var(--radius-medium) !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar > li > a:hover { padding-left: 0 !important; background: var(--color-accent-bg) !important; }\n.span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar > li > a > .material-icons {\n\tmargin: 0 !important;\n\tfont-size: 2rem !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n.span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar > li > a:hover > .material-icons { color: var(--color-accent) !important; }\n.etis3-quickbar > .etis3-settings-li { border: none !important; margin: 0 !important; padding: 0 !important; }\n.etis3-quickbar .theme-label,\n.etis3-quickbar .etis3-settings-btn > span:not(.material-icons) { display: none !important; }\n.etis3-main-nav > li.etis3-nav-head > a > .material-icons { text-transform: none !important; letter-spacing: 0 !important; }\n\n\n/* ============================================================\n   ЦВЕТ ДИСЦИПЛИН (--dis-h задаётся из JS по названию)\n   ============================================================ */\n\n.etis3-dis { --dis-color: hsl(var(--dis-h) 70% 64%); --dis-soft: hsla(var(--dis-h), 70%, 64%, 0.12); }\n[theme=\"light\"] .etis3-dis { --dis-color: hsl(var(--dis-h) 62% 46%); --dis-soft: hsla(var(--dis-h), 62%, 46%, 0.09); }\n\n/* Расписание: цветная полоска у пары */\ntr.etis3-dis td.pair_info { box-shadow: inset 3px 0 0 var(--dis-color) !important; padding-left: 1.4rem !important; }\nhtml:not(.etis3-no-highlight) tr.pair-row--active.etis3-dis td { background: var(--dis-soft) !important; }\n\n/* Виджет пары: акцент в цвет дисциплины */\n.next-pair-widget.etis3-dis { border-left: 3px solid var(--dis-color) !important; }\n.next-pair-widget.etis3-dis .npw-progress-fill { background: var(--dis-color) !important; }\n\n/* Оценки: точка у названия дисциплины, полоска в сводке */\nh3.etis3-dis { display: flex !important; align-items: center !important; gap: 0.9rem !important; }\nh3.etis3-dis::before {\n\tcontent: '' !important;\n\tflex-shrink: 0 !important;\n\twidth: 1rem !important;\n\theight: 1rem !important;\n\tborder-radius: 50% !important;\n\tbackground: var(--dis-color) !important;\n\tbox-shadow: 0 0 0 4px var(--dis-soft) !important;\n}\n.esw-dis.etis3-dis .esw-dis-bar > span { background: var(--dis-color) !important; }\n.esw-dis.etis3-dis .esw-dis-name::before {\n\tcontent: '' !important;\n\tdisplay: inline-block !important;\n\twidth: 0.8rem !important;\n\theight: 0.8rem !important;\n\tmargin-right: 0.8rem !important;\n\tborder-radius: 50% !important;\n\tbackground: var(--dis-color) !important;\n\tvertical-align: 0.05em !important;\n}\n\n/* Таблицы: итоговые строки и подзаголовки групп */\ntable.common tr > td[colspan=\"5\"][align=\"right\"],\ntable.common tr > td[colspan=\"5\"][align=\"right\"] ~ td { font-weight: 700 !important; color: var(--color-text-primary) !important; }\ntable.common td[colspan=\"10\"] { text-transform: uppercase !important; letter-spacing: 0.06em !important; font-size: 1.05rem !important; font-weight: 600 !important; color: var(--color-text-tertiary) !important; }\n\n\n/* ============================================================\n   3.6 — НЕДЕЛЯ СЕТКОЙ, ЭКСПОРТ, ЦЕЛИ И НОВЫЕ ОЦЕНКИ\n   ============================================================ */\n\n.icon-button.icon-event:before { content: 'event' !important; }\n\n/* Переключатель «Список / Неделя» */\n.etis3-view-switch {\n\tdisplay: inline-flex !important;\n\tpadding: 0.3rem !important;\n\tgap: 0.2rem !important;\n\tmargin-right: auto !important;\n\tborder-radius: 1.2rem !important;\n\tbackground: var(--glass-bg-card) !important;\n\tborder: var(--glass-border) !important;\n}\n.etis3-view-switch button {\n\tdisplay: inline-flex !important;\n\talign-items: center !important;\n\tgap: 0.5rem !important;\n\tpadding: 0.5rem 1.1rem !important;\n\tborder: 0 !important;\n\tborder-radius: 0.9rem !important;\n\tbackground: transparent !important;\n\tcolor: var(--color-text-secondary) !important;\n\tfont: inherit !important;\n\tfont-size: 1.25rem !important;\n\tcursor: pointer !important;\n\ttransition: background 0.2s, color 0.2s !important;\n}\n.etis3-view-switch button .material-icons { font-size: 1.6rem !important; }\n.etis3-view-switch button:hover { color: var(--color-text-primary) !important; }\n.etis3-view-switch button.active {\n\tbackground: rgba(var(--color-accent-rgb, 124,111,212), 0.16) !important;\n\tcolor: var(--color-accent) !important;\n\tfont-weight: 600 !important;\n}\n\n/* Режимы: в сетке прячем дни, в списке — сетку */\n.span9:not(.etis3-tt-grid) .etis3-week-grid { display: none !important; }\n.span9.etis3-tt-grid div.day { display: none !important; }\n\n.etis3-week-grid {\n\tdisplay: grid !important;\n\tgrid-template-columns: 5.6rem repeat(var(--days, 6), minmax(11rem, 1fr)) !important;\n\tgap: 0.5rem !important;\n\tmargin-bottom: 2rem !important;\n\toverflow-x: auto !important;\n\tanimation: etis3-fade-up 0.35s ease both;\n}\n.ewg-day, .ewg-num {\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\talign-items: center !important;\n\tjustify-content: center !important;\n\tpadding: 0.6rem 0.4rem !important;\n\tfont-size: 1.15rem !important;\n\tcolor: var(--color-text-tertiary) !important;\n\tline-height: 1.3 !important;\n}\n.ewg-day b, .ewg-num b { font-size: 1.35rem !important; color: var(--color-text-primary) !important; }\n.ewg-day span { white-space: nowrap !important; }\n.ewg-day.ewg-today {\n\tborder-radius: 1rem !important;\n\tbackground: rgba(var(--color-accent-rgb, 124,111,212), 0.14) !important;\n}\n.ewg-day.ewg-today b, .ewg-day.ewg-today span { color: var(--color-accent) !important; }\n.ewg-cell {\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\tgap: 0.4rem !important;\n\tmin-height: 5.6rem !important;\n\tborder-radius: 1rem !important;\n}\n.ewg-cell.ewg-empty { border: 1px dashed var(--color-divider) !important; }\n.ewg-cell.ewg-today.ewg-empty { background: rgba(var(--color-accent-rgb, 124,111,212), 0.04) !important; }\n.ewg-pair {\n\tflex: 1 !important;\n\tdisplay: flex !important;\n\tflex-direction: column !important;\n\tjustify-content: space-between !important;\n\tgap: 0.4rem !important;\n\tpadding: 0.7rem 0.9rem !important;\n\tborder-radius: 1rem !important;\n\tbackground: var(--dis-soft, var(--glass-bg-card)) !important;\n\tborder: var(--glass-border) !important;\n\tborder-left: 3px solid var(--dis-color, var(--color-accent)) !important;\n\tcursor: default !important;\n\ttransition: transform 0.2s, box-shadow 0.2s !important;\n}\n.ewg-pair:hover { transform: translateY(-1px) !important; box-shadow: var(--glass-shadow-hover) !important; }\n.ewg-name {\n\tfont-size: 1.2rem !important;\n\tfont-weight: 600 !important;\n\tline-height: 1.3 !important;\n\tcolor: var(--color-text-primary) !important;\n\tdisplay: -webkit-box !important;\n\t-webkit-line-clamp: 3 !important;\n\t-webkit-box-orient: vertical !important;\n\toverflow: hidden !important;\n\thyphens: auto !important;\n\toverflow-wrap: break-word !important;\n}\n.ewg-meta {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 0.5rem !important;\n\tfont-size: 1.1rem !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n.ewg-meta .material-icons { font-size: 1.4rem !important; color: var(--dis-color, var(--color-accent)) !important; }\n.ewg-aud { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }\n.ewg-cell.ewg-now .ewg-pair {\n\tbox-shadow: 0 0 0 2px var(--dis-color, var(--color-accent)) !important;\n}\nhtml.etis3-no-highlight .ewg-cell.ewg-now .ewg-pair { box-shadow: none !important; }\nhtml.etis3-no-pairtypes .ewg-meta .material-icons { display: none !important; }\n\n@keyframes etis3-fade-up {\n\tfrom { opacity: 0; transform: translateY(6px); }\n\tto   { opacity: 1; transform: none; }\n}\n\n/* Новые оценки */\ntable.common tr.kt-new > td { background: rgba(var(--color-accent-rgb, 124,111,212), 0.08) !important; }\n.kt-new-badge {\n\tdisplay: inline-block !important;\n\tmargin-right: 0.5rem !important;\n\tpadding: 0.05rem 0.5rem !important;\n\tborder-radius: 0.6rem !important;\n\tbackground: var(--color-accent) !important;\n\tcolor: #fff !important;\n\tfont-size: 0.95rem !important;\n\tfont-weight: 700 !important;\n\ttext-transform: uppercase !important;\n\tletter-spacing: 0.04em !important;\n\tvertical-align: 0.1em !important;\n}\n.eds-chip--new, .esw-new {\n\tcolor: var(--color-accent) !important;\n\tbackground: rgba(var(--color-accent-rgb, 124,111,212), 0.12) !important;\n}\n.esw-new {\n\tpadding: 0.25rem 0.9rem !important;\n\tborder-radius: 10rem !important;\n\tfont-size: 1.15rem !important;\n\tfont-weight: 600 !important;\n}\n\n/* Цель по баллам */\n.esw-goal {\n\tdisplay: inline-flex !important;\n\talign-items: center !important;\n\tgap: 0.5rem !important;\n\tmargin: 0 0 0 auto !important;\n\tfont-size: 1.2rem !important;\n\tcolor: var(--color-text-secondary) !important;\n\tcursor: text !important;\n}\n.esw-goal .material-icons { font-size: 1.6rem !important; color: var(--color-text-tertiary) !important; }\n.esw-goal input {\n\twidth: 5.6rem !important;\n\theight: auto !important;\n\tmargin: 0 !important;\n\tpadding: 0.35rem 0.6rem !important;\n\tborder-radius: 0.8rem !important;\n\tborder: var(--glass-border) !important;\n\tbackground: var(--glass-bg-card) !important;\n\tcolor: var(--color-text-primary) !important;\n\tfont-size: 1.25rem !important;\n\ttext-align: center !important;\n\tbox-shadow: none !important;\n}\n.esw-goal input:focus { outline: 2px solid var(--color-accent) !important; outline-offset: 1px !important; }\n.esw-dis-goal {\n\tgrid-column: 1 / -1 !important;\n\tmargin-top: -0.6rem !important;\n\tpadding-left: 1.6rem !important;\n\tfont-size: 1.1rem !important;\n\tcolor: var(--color-text-secondary) !important;\n}\n.esw-dis-goal[hidden], .eds-chip--goal[hidden] { display: none !important; }\n.goal--ok   { color: var(--color-green) !important; }\n.goal--warn { color: var(--color-yellow) !important; }\n.goal--bad  { color: var(--color-red) !important; }\n\n@media (prefers-reduced-motion: reduce) {\n\t.etis3-week-grid { animation: none !important; }\n}\n\n\n/* ============================================================\n   LIQUID GLASS 3.7\n   Стекло снова главное: светлее и прозрачнее подложка, яркий\n   блик по верхней кромке, отражение снизу, сильнее размытие и\n   насыщенность, а за стеклом — живой цветной фон, чтобы было\n   что преломлять. Всё через переменные, вёрстка не меняется.\n   ============================================================ */\n\n[theme=\"light\"] {\n\t--glass-sheen:\n\t\tlinear-gradient(180deg, rgba(255,255,255,0.70) 0, rgba(255,255,255,0.18) 3.2rem, rgba(255,255,255,0) 9rem),\n\t\tradial-gradient(140% 9rem at 0 0, rgba(255,255,255,0.45), rgba(255,255,255,0) 70%);\n\t--glass-bg:         var(--glass-sheen), rgba(255,255,255,0.40);\n\t--glass-bg-card:    var(--glass-sheen), rgba(255,255,255,0.34);\n\t--glass-bg-sidebar: var(--glass-sheen), rgba(255,255,255,0.38);\n\t--glass-bg-header:  var(--glass-sheen), rgba(250,250,255,0.55);\n\t--glass-bg-hover:   rgba(255,255,255,0.62);\n\t--glass-bg-active:  rgba(255,255,255,0.80);\n\t--glass-bg-input:   rgba(255,255,255,0.46);\n\n\t--glass-border:       1px solid rgba(255,255,255,0.78);\n\t--glass-border-light: 1px solid rgba(255,255,255,0.90);\n\t--glass-border-inner:\n\t\tinset 0 1px 0 rgba(255,255,255,1),\n\t\tinset 0 -1px 0 rgba(255,255,255,0.45),\n\t\tinset 1px 0 0 rgba(255,255,255,0.55),\n\t\tinset 0 0 0 1px rgba(255,255,255,0.18),\n\t\tinset 0 -1.2rem 2.4rem -1.6rem rgba(255,255,255,0.55);\n\t--glass-shadow:       0 8px 32px rgba(60,50,120,0.10), 0 1px 3px rgba(0,0,0,0.05), var(--glass-border-inner);\n\t--glass-shadow-hover: 0 14px 44px rgba(60,50,120,0.16), 0 2px 6px rgba(0,0,0,0.06), var(--glass-border-inner);\n\t--glass-shadow-card:  0 6px 26px rgba(60,50,120,0.08), 0 1px 2px rgba(0,0,0,0.04), var(--glass-border-inner);\n\n\t--glass-filter:        blur(26px) saturate(200%) brightness(1.06);\n\t--glass-filter-strong: blur(44px) saturate(220%) brightness(1.06);\n\n\t--bg-gradient:\n\t\tradial-gradient(60% 55% at 8% 6%,   rgba(var(--color-accent-rgb, 160,140,255), 0.42) 0%, transparent 70%),\n\t\tradial-gradient(45% 50% at 92% 14%, rgba(255,150,200,0.30) 0%, transparent 70%),\n\t\tradial-gradient(50% 45% at 62% 52%, rgba(var(--color-accent-rgb, 160,140,255), 0.16) 0%, transparent 70%),\n\t\tradial-gradient(55% 50% at 30% 96%, rgba(110,210,255,0.30) 0%, transparent 70%),\n\t\tradial-gradient(40% 40% at 96% 88%, rgba(255,210,140,0.22) 0%, transparent 70%),\n\t\t#ecebf4;\n}\n\n[theme=\"dark\"] {\n\t--glass-sheen:\n\t\tlinear-gradient(180deg, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.03) 3.2rem, rgba(255,255,255,0) 9rem),\n\t\tradial-gradient(140% 9rem at 0 0, rgba(255,255,255,0.07), rgba(255,255,255,0) 70%);\n\t--glass-bg:         var(--glass-sheen), rgba(30,30,42,0.42);\n\t--glass-bg-card:    var(--glass-sheen), rgba(26,26,38,0.36);\n\t--glass-bg-sidebar: var(--glass-sheen), rgba(24,24,34,0.40);\n\t--glass-bg-header:  var(--glass-sheen), rgba(20,20,30,0.60);\n\t--glass-bg-hover:   rgba(255,255,255,0.09);\n\t--glass-bg-active:  rgba(48,48,62,0.86);\n\t--glass-bg-input:   rgba(8,8,16,0.32);\n\n\t--glass-border:       1px solid rgba(255,255,255,0.11);\n\t--glass-border-light: 1px solid rgba(255,255,255,0.16);\n\t--glass-border-inner:\n\t\tinset 0 1px 0 rgba(255,255,255,0.24),\n\t\tinset 0 -1px 0 rgba(255,255,255,0.06),\n\t\tinset 1px 0 0 rgba(255,255,255,0.08),\n\t\tinset 0 -1.2rem 2.4rem -1.6rem rgba(255,255,255,0.07);\n\t--glass-shadow:       0 10px 36px rgba(0,0,0,0.42), 0 1px 3px rgba(0,0,0,0.30), var(--glass-border-inner);\n\t--glass-shadow-hover: 0 16px 48px rgba(0,0,0,0.52), 0 2px 6px rgba(0,0,0,0.34), var(--glass-border-inner);\n\t--glass-shadow-card:  0 8px 30px rgba(0,0,0,0.34), 0 1px 2px rgba(0,0,0,0.26), var(--glass-border-inner);\n\n\t--glass-filter:        blur(28px) saturate(190%) brightness(1.04);\n\t--glass-filter-strong: blur(46px) saturate(210%) brightness(1.02);\n\n\t--bg-gradient:\n\t\tradial-gradient(60% 55% at 8% 6%,   rgba(var(--color-accent-rgb, 120,100,220), 0.40) 0%, transparent 70%),\n\t\tradial-gradient(45% 50% at 94% 12%, rgba(200,60,150,0.26) 0%, transparent 70%),\n\t\tradial-gradient(50% 45% at 62% 52%, rgba(var(--color-accent-rgb, 120,100,220), 0.14) 0%, transparent 70%),\n\t\tradial-gradient(55% 50% at 28% 98%, rgba(30,140,200,0.30) 0%, transparent 70%),\n\t\tradial-gradient(40% 40% at 96% 90%, rgba(110,60,220,0.24) 0%, transparent 70%),\n\t\t#0d0d14;\n}\n\n/* Таблицы: строки прозрачные, стекло видно насквозь; цвета статусов — мягкой подсветкой */\n.common th, .common th.subheader, .slimtab_nice th, .teach_plan th { background: rgba(255,255,255,0.025) !important; }\n[theme=\"light\"] .common th, [theme=\"light\"] .common th.subheader,\n[theme=\"light\"] .slimtab_nice th, [theme=\"light\"] .teach_plan th { background: rgba(255,255,255,0.30) !important; }\ntr.row-green td { background: rgba(52,199,89,0.05) !important; }\ntr.row-red   td { background: rgba(255,59,48,0.07) !important; }\ntr.row-green > td:first-child { box-shadow: inset 3px 0 0 rgba(52,199,89,0.55) !important; }\ntr.row-red   > td:first-child { box-shadow: inset 3px 0 0 rgba(255,59,48,0.65) !important; }\ntr.row-green:hover td { background: rgba(52,199,89,0.12) !important; }\ntr.row-red:hover   td { background: rgba(255,59,48,0.14) !important; }\n\n/* Цвет дисциплин — акцентом, а не заливкой: стекло остаётся стеклом */\n.ewg-pair { background: var(--glass-bg-card) !important; backdrop-filter: var(--glass-filter) !important; -webkit-backdrop-filter: var(--glass-filter) !important; box-shadow: var(--glass-shadow-card) !important; }\n.ewg-pair::after {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tborder-radius: inherit !important;\n\tbackground: linear-gradient(135deg, var(--dis-soft), transparent 70%) !important;\n\tpointer-events: none !important;\n}\n.ewg-pair { position: relative !important; }\n.ewg-pair > * { position: relative !important; z-index: 1 !important; }\n\n\n/* ============================================================\n   ВХОД 3.8 — аврора, герой, живая стеклянная карточка\n   ============================================================ */\n\nhtml.etis3-login-page, html.etis3-login-page body { overflow-x: hidden !important; }\nhtml.etis3-login-page body { background: #0b0b12 !important; }\nhtml.etis3-login-page[theme=\"light\"] body { background: #eef0f8 !important; }\n\n/* ---------- Аврора ---------- */\n#etis3-aurora {\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tz-index: 0 !important;\n\toverflow: hidden !important;\n\tpointer-events: none !important;\n\t--px: 0; --py: 0;\n}\n#etis3-aurora .orb-wrap {\n\tposition: absolute !important;\n\ttransition: transform 1.2s cubic-bezier(.2,.7,.2,1) !important;\n}\n.orb-wrap--a { left: -12vmax; top: -16vmax;  transform: translate(calc(var(--px) * -60px), calc(var(--py) * -60px)); }\n.orb-wrap--b { right: -14vmax; top: -10vmax; transform: translate(calc(var(--px) * 90px),  calc(var(--py) * -40px)); }\n.orb-wrap--c { left: 10vmax; bottom: -22vmax; transform: translate(calc(var(--px) * -40px), calc(var(--py) * 80px)); }\n.orb-wrap--d { right: 6vmax; bottom: -18vmax; transform: translate(calc(var(--px) * 70px),  calc(var(--py) * 60px)); }\n#etis3-aurora .orb {\n\twidth: 56vmax; height: 56vmax;\n\tborder-radius: 50% !important;\n\tfilter: blur(70px) !important;\n\topacity: 0.85;\n\tmix-blend-mode: screen;\n\tanimation: orb-drift 26s ease-in-out infinite alternate;\n}\n.orb--a { background: radial-gradient(circle at 50% 50%, rgba(var(--color-accent-rgb, 124,111,212), 0.95), rgba(var(--color-accent-rgb, 124,111,212), 0) 65%) !important; }\n.orb--b { background: radial-gradient(circle at 50% 50%, rgba(236,72,153,0.70), rgba(236,72,153,0) 65%) !important; width: 46vmax !important; height: 46vmax !important; animation-duration: 31s !important; animation-delay: -8s !important; }\n.orb--c { background: radial-gradient(circle at 50% 50%, rgba(34,180,230,0.70), rgba(34,180,230,0) 65%) !important; animation-duration: 35s !important; animation-delay: -14s !important; }\n.orb--d { background: radial-gradient(circle at 50% 50%, rgba(255,170,80,0.45), rgba(255,170,80,0) 65%) !important; width: 40vmax !important; height: 40vmax !important; animation-duration: 29s !important; animation-delay: -4s !important; }\n[theme=\"light\"] #etis3-aurora .orb { mix-blend-mode: normal; opacity: 0.55; }\n\n@keyframes orb-drift {\n\t0%   { transform: translate(0, 0) scale(1) rotate(0deg); }\n\t33%  { transform: translate(8vmax, 5vmax) scale(1.12) rotate(40deg); }\n\t66%  { transform: translate(-4vmax, 9vmax) scale(0.92) rotate(-20deg); }\n\t100% { transform: translate(6vmax, -4vmax) scale(1.06) rotate(25deg); }\n}\n.aurora-grain {\n\tposition: absolute !important;\n\tinset: 0 !important;\n\topacity: 0.06 !important;\n\tmix-blend-mode: overlay !important;\n\tbackground-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\") !important;\n\tbackground-size: 180px 180px !important;\n}\nhtml.etis3-login-page #etis3-particles { opacity: 0.55 !important; }\n\n/* ---------- Раскладка ---------- */\nhtml.etis3-login-page .login-container { min-height: 100vh !important; height: auto !important; }\n.login-stage {\n\tflex: 1 0 auto !important;\n\tdisplay: grid !important;\n\tgrid-template-columns: minmax(0, 1fr) auto !important;\n\talign-items: center !important;\n\tgap: 6vw !important;\n\twidth: 100% !important;\n\tmax-width: 112rem !important;\n\tmargin: 0 auto !important;\n\tpadding: 6rem 4rem 2rem !important;\n}\n.login-stage > .login { margin: 0 !important; flex: none !important; }\n@media (max-width: 900px) {\n\t.login-stage { grid-template-columns: 1fr !important; justify-items: center !important; text-align: center !important; gap: 3.2rem !important; padding-top: 4rem !important; }\n\t.lh-clock { justify-content: center !important; }\n}\n\n/* ---------- Герой ---------- */\n.login-hero { color: var(--color-text-primary) !important; user-select: none !important; }\n.lh-greeting {\n\tfont-size: 1.8rem !important;\n\tfont-weight: 500 !important;\n\tcolor: var(--color-text-secondary) !important;\n\tletter-spacing: -0.01em !important;\n\tanimation: hero-in 0.9s cubic-bezier(.2,.8,.2,1) 0.15s both;\n}\n.lh-title {\n\tmargin: 0.4rem 0 0 !important;\n\tfont-size: clamp(7rem, 11vw, 15rem) !important;\n\tline-height: 0.95 !important;\n\tfont-weight: 800 !important;\n\tletter-spacing: -0.06em !important;\n\tdisplay: flex !important;\n\talign-items: flex-start !important;\n}\n.login-stage .lh-title { justify-content: inherit; }\n@media (max-width: 900px) { .lh-title { justify-content: center !important; } }\n.lh-title > span {\n\tdisplay: inline-block !important;\n\tbackground: linear-gradient(180deg, #fff 10%, rgba(255,255,255,0.55) 95%) !important;\n\t-webkit-background-clip: text !important;\n\tbackground-clip: text !important;\n\tcolor: transparent !important;\n\tfilter: drop-shadow(0 10px 40px rgba(var(--color-accent-rgb, 124,111,212), 0.45));\n\tanimation: letter-in 1s cubic-bezier(.2,.8,.2,1) both;\n\tanimation-delay: calc(0.25s + var(--i) * 0.08s);\n}\n[theme=\"light\"] .lh-title > span {\n\tbackground: linear-gradient(180deg, rgba(20,18,40,0.92) 10%, rgba(var(--color-accent-rgb, 124,111,212), 0.85) 100%) !important;\n\t-webkit-background-clip: text !important;\n\tbackground-clip: text !important;\n\tfilter: drop-shadow(0 10px 30px rgba(var(--color-accent-rgb, 124,111,212), 0.25));\n}\n.lh-title sup {\n\tmargin: 1.4rem 0 0 1.2rem !important;\n\tpadding: 0.5rem 1.1rem !important;\n\tfont-size: 1.6rem !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: 0 !important;\n\tline-height: 1 !important;\n\tborder-radius: 10rem !important;\n\tcolor: #fff !important;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 0.95), rgba(236,72,153,0.85)) !important;\n\tbox-shadow: 0 6px 24px rgba(var(--color-accent-rgb, 124,111,212), 0.45), inset 0 1px 0 rgba(255,255,255,0.45) !important;\n\tanimation: hero-in 0.8s cubic-bezier(.2,.8,.2,1) 0.75s both;\n}\n.lh-sub {\n\tmargin-top: 1.4rem !important;\n\tfont-size: 1.7rem !important;\n\tcolor: var(--color-text-secondary) !important;\n\tanimation: hero-in 0.9s cubic-bezier(.2,.8,.2,1) 0.55s both;\n}\n.lh-clock {\n\tdisplay: flex !important;\n\talign-items: baseline !important;\n\tgap: 1.4rem !important;\n\tmargin-top: 3.6rem !important;\n\tanimation: hero-in 0.9s cubic-bezier(.2,.8,.2,1) 0.7s both;\n}\n.lh-time {\n\tfont-size: 4.2rem !important;\n\tfont-weight: 300 !important;\n\tletter-spacing: -0.03em !important;\n\tfont-variant-numeric: tabular-nums !important;\n\tcolor: var(--color-text-primary) !important;\n}\n.lh-date { font-size: 1.5rem !important; color: var(--color-text-secondary) !important; }\n.lh-date::first-letter { text-transform: uppercase; }\n\n@keyframes hero-in {\n\tfrom { opacity: 0; transform: translateY(18px); filter: blur(8px); }\n\tto   { opacity: 1; transform: none; filter: none; }\n}\n@keyframes letter-in {\n\tfrom { opacity: 0; transform: translateY(0.35em) scale(0.92); }\n\tto   { opacity: 1; transform: none; }\n}\n\n/* ---------- Карточка ---------- */\n.login-stage > .login { animation: card-in 1.1s cubic-bezier(.16,.84,.24,1) 0.35s both; perspective: 1100px; }\n@keyframes card-in {\n\tfrom { opacity: 0; transform: translateY(40px) scale(0.94); filter: blur(14px); }\n\tto   { opacity: 1; transform: none; filter: none; }\n}\nhtml.etis3-login-page .login form,\nhtml.etis3-login-page .login #form {\n\twidth: 40rem !important;\n\tpadding: 4rem 3.6rem 3.4rem !important;\n\tborder-radius: 3rem !important;\n\ttransform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) !important;\n\ttransform-style: preserve-3d !important;\n\ttransition: transform 0.5s cubic-bezier(.2,.7,.2,1), box-shadow 0.4s ease !important;\n\tbackground:\n\t\tlinear-gradient(180deg, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.02) 6rem, rgba(255,255,255,0) 14rem),\n\t\trgba(22,22,34,0.30) !important;\n\tborder: 1px solid rgba(255,255,255,0.14) !important;\n\tbackdrop-filter: blur(34px) saturate(210%) brightness(1.08) !important;\n\t-webkit-backdrop-filter: blur(34px) saturate(210%) brightness(1.08) !important;\n\tbox-shadow:\n\t\t0 30px 80px rgba(0,0,0,0.45),\n\t\t0 8px 24px rgba(0,0,0,0.25),\n\t\tinset 0 1px 0 rgba(255,255,255,0.32),\n\t\tinset 0 -1px 0 rgba(255,255,255,0.08),\n\t\tinset 1px 0 0 rgba(255,255,255,0.10),\n\t\tinset 0 -3rem 5rem -4rem rgba(255,255,255,0.12) !important;\n}\nhtml.etis3-login-page[theme=\"light\"] .login form,\nhtml.etis3-login-page[theme=\"light\"] .login #form {\n\tbackground:\n\t\tlinear-gradient(180deg, rgba(255,255,255,0.80) 0, rgba(255,255,255,0.30) 6rem, rgba(255,255,255,0.12) 14rem),\n\t\trgba(255,255,255,0.28) !important;\n\tborder: 1px solid rgba(255,255,255,0.85) !important;\n\tbox-shadow:\n\t\t0 30px 80px rgba(60,50,140,0.18),\n\t\t0 8px 24px rgba(60,50,140,0.10),\n\t\tinset 0 1px 0 #fff,\n\t\tinset 0 -1px 0 rgba(255,255,255,0.6),\n\t\tinset 0 -3rem 5rem -4rem rgba(255,255,255,0.7) !important;\n}\n/* Блик за курсором */\nhtml.etis3-login-page .login form::before,\nhtml.etis3-login-page .login #form::before {\n\tbackground: radial-gradient(28rem circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.16), rgba(255,255,255,0) 60%) !important;\n\topacity: 0.6 !important;\n\ttransition: opacity 0.4s ease !important;\n}\nhtml.etis3-login-page .login form.is-hover::before,\nhtml.etis3-login-page .login #form.is-hover::before { opacity: 1 !important; }\nhtml.etis3-login-page[theme=\"light\"] .login #form::before { background: radial-gradient(28rem circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.75), rgba(255,255,255,0) 60%) !important; }\n/* Светящаяся кромка, тоже за курсором */\nhtml.etis3-login-page .login #form > .items::before {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tinset: -1px !important;\n\tborder-radius: 3rem !important;\n\tpadding: 1px !important;\n\tbackground: radial-gradient(22rem circle at var(--mx, 50%) var(--my, 0%), rgba(var(--color-accent-rgb, 124,111,212), 0.9), rgba(255,255,255,0.15) 45%, transparent 70%) !important;\n\t-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) !important;\n\t-webkit-mask-composite: xor !important;\n\tmask-composite: exclude !important;\n\tpointer-events: none !important;\n\tz-index: 3 !important;\n}\nhtml.etis3-login-page .login #form > .items { position: static !important; }\nhtml.etis3-login-page .login #form > * { position: relative; z-index: 4; }\nhtml.etis3-login-page .login #form > .items { z-index: 4 !important; }\nhtml.etis3-login-page .psu-logo {\n\theight: 9rem !important;\n\tbackground-size: 9rem !important;\n\tmargin-bottom: 3.6rem !important;\n\topacity: 0.55 !important;\n\tanimation: logo-breathe 5s ease-in-out infinite !important;\n}\n\n/* Поля */\nhtml.etis3-login-page form > .items > .item { margin-bottom: 3rem !important; }\nhtml.etis3-login-page .items > .item > input {\n\tfont-size: 1.6rem !important;\n\tpadding: 0.4rem 3.2rem 1rem 0 !important;\n\tborder-bottom: 1.5px solid rgba(255,255,255,0.14) !important;\n\tbackground: transparent !important;\n}\nhtml.etis3-login-page[theme=\"light\"] .items > .item > input { border-bottom-color: rgba(0,0,0,0.12) !important; }\nhtml.etis3-login-page .items > .item::after {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tleft: 0; right: 0; bottom: 0;\n\theight: 2px !important;\n\tborder-radius: 2px !important;\n\tbackground: linear-gradient(90deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(236,72,153,0.9)) !important;\n\ttransform: scaleX(0) !important;\n\ttransform-origin: left !important;\n\ttransition: transform 0.45s cubic-bezier(.2,.8,.2,1) !important;\n\tbox-shadow: 0 0 14px rgba(var(--color-accent-rgb, 124,111,212), 0.7) !important;\n\tpointer-events: none !important;\n}\nhtml.etis3-login-page .items > .item:focus-within::after { transform: scaleX(1) !important; }\nhtml.etis3-login-page .items > .item > input:focus { border-bottom-color: transparent !important; }\n\n.login-eye {\n\tposition: absolute !important;\n\tright: -0.4rem !important;\n\tbottom: 0.5rem !important;\n\twidth: 3.2rem !important;\n\theight: 3.2rem !important;\n\tpadding: 0 !important;\n\tborder: 0 !important;\n\tborder-radius: 50% !important;\n\tbackground: transparent !important;\n\tcolor: var(--color-text-tertiary) !important;\n\tcursor: pointer !important;\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tjustify-content: center !important;\n\ttransition: color 0.2s, background 0.2s !important;\n}\n.login-eye:hover { color: var(--color-text-primary) !important; background: rgba(255,255,255,0.08) !important; }\n.login-eye .material-icons { font-size: 1.9rem !important; }\n.login-caps {\n\tposition: absolute !important;\n\tleft: 0 !important;\n\ttop: calc(100% + 0.6rem) !important;\n\tfont-size: 1.1rem !important;\n\tfont-weight: 600 !important;\n\tcolor: var(--color-yellow) !important;\n\topacity: 0 !important;\n\ttransform: translateY(-4px) !important;\n\ttransition: opacity 0.2s, transform 0.2s !important;\n\tpointer-events: none !important;\n}\n.login-caps.show { opacity: 1 !important; transform: none !important; }\n\n/* Кнопка */\nhtml.etis3-login-page .login-actions { margin-top: 1.6rem !important; gap: 1.6rem !important; }\nhtml.etis3-login-page #sbmt {\n\tposition: relative !important;\n\toverflow: hidden !important;\n\tmin-width: 13rem !important;\n\tpadding: 1.25rem 3rem !important;\n\tborder-radius: 1.6rem !important;\n\tfont-size: 1.5rem !important;\n\tfont-weight: 600 !important;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(236,72,153,0.92)) !important;\n\tbox-shadow:\n\t\t0 10px 30px rgba(var(--color-accent-rgb, 124,111,212), 0.45),\n\t\tinset 0 1px 0 rgba(255,255,255,0.45),\n\t\tinset 0 -2px 6px rgba(0,0,0,0.12) !important;\n\ttransition: transform 0.25s cubic-bezier(.2,.8,.2,1), box-shadow 0.25s, filter 0.25s !important;\n}\nhtml.etis3-login-page #sbmt:hover {\n\topacity: 1 !important;\n\ttransform: translateY(-2px) !important;\n\tfilter: brightness(1.08) !important;\n\tbox-shadow: 0 16px 40px rgba(var(--color-accent-rgb, 124,111,212), 0.6), inset 0 1px 0 rgba(255,255,255,0.5) !important;\n}\nhtml.etis3-login-page #sbmt:active { transform: translateY(0) scale(0.97) !important; }\nhtml.etis3-login-page #sbmt::after {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\ttop: 0; bottom: 0; left: -60%;\n\twidth: 50% !important;\n\tbackground: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent) !important;\n\ttransform: skewX(-20deg) !important;\n\tanimation: btn-shine 4.5s ease-in-out 2s infinite !important;\n\tpointer-events: none !important;\n}\n@keyframes btn-shine {\n\t0%, 70% { left: -60%; }\n\t100%    { left: 130%; }\n}\nhtml.etis3-login-page #sbmt.is-loading span { opacity: 0 !important; }\nhtml.etis3-login-page #sbmt.is-loading::before {\n\tcontent: '' !important;\n\tposition: absolute !important;\n\tleft: 50%; top: 50%;\n\twidth: 1.8rem !important; height: 1.8rem !important;\n\tmargin: -0.9rem 0 0 -0.9rem !important;\n\tborder-radius: 50% !important;\n\tborder: 2px solid rgba(255,255,255,0.35) !important;\n\tborder-top-color: #fff !important;\n\tanimation: btn-spin 0.7s linear infinite !important;\n}\n@keyframes btn-spin { to { transform: rotate(360deg); } }\n\n/* Ошибка входа */\nhtml.etis3-login-page .login-container > .error_message {\n\tleft: 50% !important; right: auto !important; top: 2.4rem !important;\n\ttransform: translateX(-50%) !important;\n\tpadding: 1.1rem 2.2rem !important;\n\tborder-radius: 10rem !important;\n\tbackground: rgba(255,59,48,0.82) !important;\n\tbackdrop-filter: blur(20px) saturate(180%) !important;\n\tbox-shadow: 0 10px 30px rgba(255,59,48,0.35), inset 0 1px 0 rgba(255,255,255,0.35) !important;\n\tanimation: hero-in 0.6s cubic-bezier(.2,.8,.2,1) both;\n}\n.login-shake { animation: shake 0.55s cubic-bezier(.36,.07,.19,.97) 1.3s both !important; }\n@keyframes shake {\n\t10%, 90% { translate: -2px 0; }\n\t20%, 80% { translate: 4px 0; }\n\t30%, 50%, 70% { translate: -8px 0; }\n\t40%, 60% { translate: 8px 0; }\n}\n\n/* Подвал */\nhtml.etis3-login-page .footer { position: relative !important; z-index: 2 !important; color: var(--color-text-tertiary) !important; animation: hero-in 1s ease 1s both; }\nhtml.etis3-login-page .login-branding { padding-bottom: 2rem !important; animation: hero-in 1s ease 1.1s both; }\n\n@media (prefers-reduced-motion: reduce) {\n\t#etis3-aurora .orb, .lh-greeting, .lh-title > span, .lh-title sup, .lh-sub, .lh-clock,\n\t.login-stage > .login, html.etis3-login-page #sbmt::after, .login-shake { animation: none !important; }\n}\n.login-container > #etis3-aurora { position: fixed !important; z-index: 0 !important; }\n.login-container > #etis3-particles { z-index: 1 !important; }\nhtml.etis3-login-page .forgot-password { text-decoration: none !important; }\nhtml.etis3-login-page .forgot-password:hover { text-decoration: underline !important; text-underline-offset: 3px !important; }\nhtml.etis3-login-page .login #form > .items::before { padding: 1.5px !important; }\n.login-eye:focus-visible { outline: 2px solid var(--color-accent) !important; outline-offset: 1px !important; }\n@media (max-width: 900px) {\n\thtml.etis3-login-page .login-stage { padding: 4rem 1.6rem 2rem !important; }\n\thtml.etis3-login-page .login-stage > .login { width: 100% !important; display: flex !important; justify-content: center !important; }\n\thtml.etis3-login-page .login #form { width: 100% !important; max-width: 40rem !important; padding: 3.2rem 2.4rem 2.8rem !important; }\n}\n\n\n/* ============================================================\n   НЕБО 3.9 — цвета авроры по времени суток\n   ============================================================ */\n\n:root, [data-sky=\"evening\"] { --orb-b: 236,72,153;  --orb-c: 34,180,230;  --orb-d: 255,170,80;  --orb-a-alpha: 0.95; }\n[data-sky=\"morning\"]        { --orb-b: 255,140,110; --orb-c: 255,196,90;  --orb-d: 120,190,255; --orb-a-alpha: 0.75; }\n[data-sky=\"day\"]            { --orb-b: 80,160,255;  --orb-c: 70,215,190;  --orb-d: 255,190,120; --orb-a-alpha: 0.85; }\n[data-sky=\"night\"]          { --orb-b: 90,60,200;   --orb-c: 20,90,170;   --orb-d: 150,60,200;  --orb-a-alpha: 0.70; }\n\n.orb--a { background: radial-gradient(circle, rgba(var(--color-accent-rgb, 124,111,212), var(--orb-a-alpha)), rgba(var(--color-accent-rgb, 124,111,212), 0) 65%) !important; }\n.orb--b { background: radial-gradient(circle, rgba(var(--orb-b), 0.70), rgba(var(--orb-b), 0) 65%) !important; }\n.orb--c { background: radial-gradient(circle, rgba(var(--orb-c), 0.70), rgba(var(--orb-c), 0) 65%) !important; }\n.orb--d { background: radial-gradient(circle, rgba(var(--orb-d), 0.45), rgba(var(--orb-d), 0) 65%) !important; }\n[data-sky=\"night\"] #etis3-aurora .orb { opacity: 0.6; }\n#etis3-aurora .orb { transition: background 3s ease; }\n\n/* Аврора на обычных страницах — тише и медленнее, поверх неподвижного фона */\n#etis3-aurora.aurora--page { position: fixed !important; inset: 0 !important; z-index: -1 !important; }\n#etis3-aurora.aurora--page .orb { opacity: 0.55; animation-duration: 70s !important; filter: blur(90px) !important; }\n[theme=\"light\"] #etis3-aurora.aurora--page .orb { opacity: 0.38; }\n#etis3-aurora.aurora--page .orb-wrap { transition: none !important; }\nhtml.etis3-no-aurora #etis3-aurora.aurora--page { display: none !important; }\nhtml:not(.etis3-login-page) body { position: relative; z-index: 0; }\n\n\n/* ============================================================\n   ВХОД → КАБИНЕТ: переход\n   ============================================================ */\n\n.login-container.etis3-leaving .login-stage > .login { animation: card-out 0.7s cubic-bezier(.6,0,.4,1) forwards !important; }\n.login-container.etis3-leaving .login-hero { animation: hero-out 0.6s ease forwards !important; }\n.login-container.etis3-leaving #etis3-aurora .orb-wrap { transform: scale(1.25) !important; transition: transform 1.6s cubic-bezier(.2,.7,.2,1) !important; }\n@keyframes card-out { to { opacity: 0; transform: translateY(-20px) scale(1.04); filter: blur(18px); } }\n@keyframes hero-out { to { opacity: 0; transform: translateX(-30px); filter: blur(10px); } }\n\nhtml.etis3-welcome #etis3-aurora .orb-wrap { animation: welcome-zoom 2.2s cubic-bezier(.2,.7,.2,1) both; }\n@keyframes welcome-zoom { from { transform: scale(1.3); opacity: 0; } to { transform: none; opacity: 1; } }\n\n\n/* ============================================================\n   НОВЫЙ ИНТЕРФЕЙС 3.9 — рельс, верхняя панель, палитра\n   ============================================================ */\n\n#etis3-topbar { display: none; }\nhtml.etis3-modern { --rail-w: 6.8rem; --rail-open: 28rem; --gap: 1.6rem; --topbar-h: 6.4rem; }\n\n/* ---------- Каркас ---------- */\nhtml.etis3-modern .container { max-width: none !important; }\nhtml.etis3-modern .container .row {\n\tpadding: calc(var(--topbar-h) + var(--gap) * 2.2) 3.2rem 8rem calc(var(--rail-w) + var(--gap) + 3.2rem) !important;\n}\nhtml.etis3-modern .span9 {\n\tmargin: 0 auto !important;\n\tmax-width: 124rem !important;\n}\n\n/* ---------- Рельс ---------- */\nhtml.etis3-modern .span3 {\n\tposition: fixed !important;\n\tz-index: 60 !important;\n\tleft: var(--gap) !important;\n\ttop: calc(var(--topbar-h) + var(--gap) * 2) !important;\n\tbottom: var(--gap) !important;\n\twidth: var(--rail-w) !important;\n\tpadding: 1rem 0.8rem !important;\n\tborder-radius: 2.4rem !important;\n\toverflow: hidden !important;\n\tbackground: var(--glass-bg-sidebar) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\ttransition: width 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.35s !important;\n\tscrollbar-width: none !important;\n}\nhtml.etis3-modern .span3::-webkit-scrollbar { display: none !important; }\nhtml.etis3-modern .span3:hover,\nhtml.etis3-modern .span3:focus-within {\n\twidth: var(--rail-open) !important;\n\toverflow-y: auto !important;\n\tbox-shadow: var(--glass-shadow-hover), 0 30px 80px rgba(0,0,0,0.25) !important;\n}\n/* В рельсе — только навигация; профиль, поиск и быстрые действия — в верхней панели */\nhtml.etis3-modern .span3 > .etis3-profile,\nhtml.etis3-modern .span3 > .sidebar-search-wrap,\nhtml.etis3-modern .span3 > .semester-progress,\nhtml.etis3-modern .span3 > .etis3-quickbar,\nhtml.etis3-modern .span3 > .etis3-branding { display: none !important; }\n\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked {\n\tbackground: transparent !important;\n\tborder: 0 !important;\n\tbox-shadow: none !important;\n\tbackdrop-filter: none !important;\n\t-webkit-backdrop-filter: none !important;\n\tmargin: 0 0 0.8rem !important;\n\tpadding: 0 !important;\n\twidth: calc(var(--rail-open) - 1.6rem) !important;\n\tborder-radius: 0 !important;\n}\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked::before,\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked::after { display: none !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked + .nav.nav-tabs.nav-stacked { border-top: 1px solid var(--color-divider) !important; padding-top: 0.8rem !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > li > a {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1.4rem !important;\n\tmin-height: 4.4rem !important;\n\tpadding: 0.6rem 1.2rem 0.6rem 1.45rem !important;\n\tborder-radius: 1.4rem !important;\n\twhite-space: nowrap !important;\n\tposition: relative !important;\n}\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > li > a:hover { padding-left: 1.45rem !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > li > a > .material-icons {\n\tflex: none !important;\n\twidth: 2.2rem !important;\n\tfont-size: 2.2rem !important;\n\tmargin: 0 !important;\n}\nhtml.etis3-modern .span3 .etis3-nav-label,\nhtml.etis3-modern .span3 .etis3-nav-head__chevron,\nhtml.etis3-modern .span3 .etis3-nav-count,\nhtml.etis3-modern .span3 .etis3-nav-head__count,\nhtml.etis3-modern .span3 .badge {\n\topacity: 0 !important;\n\ttransition: opacity 0.2s ease !important;\n}\nhtml.etis3-modern .span3:hover .etis3-nav-label,\nhtml.etis3-modern .span3:hover .etis3-nav-head__chevron,\nhtml.etis3-modern .span3:hover .etis3-nav-count,\nhtml.etis3-modern .span3:hover .etis3-nav-head__count,\nhtml.etis3-modern .span3:hover .badge,\nhtml.etis3-modern .span3:focus-within .etis3-nav-label { opacity: 1 !important; transition-delay: 0.08s !important; }\nhtml.etis3-modern .span3 .etis3-nav-label { overflow: hidden !important; text-overflow: ellipsis !important; }\n/* Пункты групп в свёрнутом рельсе не показываем — только головы групп */\nhtml.etis3-modern .span3:not(:hover):not(:focus-within) .etis3-main-nav > li[data-group]:not([data-group=\"main\"]) { display: none !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > .active::before { display: none !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > .active > a,\nhtml.etis3-modern .span3 .etis3-nav-head--active > a {\n\tbackground: rgba(var(--color-accent-rgb, 124,111,212), 0.16) !important;\n\tcolor: var(--color-accent) !important;\n\tbox-shadow: inset 0 1px 0 rgba(255,255,255,0.12) !important;\n}\nhtml.etis3-modern .span3 .etis3-nav-head--active > a .material-icons { color: var(--color-accent) !important; }\n/* Точка-индикатор на иконке, когда подпись спрятана */\nhtml.etis3-modern .span3 .badge-point { position: absolute !important; left: 3.4rem !important; top: 0.9rem !important; margin: 0 !important; }\nhtml.etis3-modern .span3 > .nav > li > a > .badge { position: absolute !important; left: 3rem !important; top: 0.4rem !important; opacity: 1 !important; transform: scale(0.85) !important; }\nhtml.etis3-modern .span3:hover > .nav > li > a > .badge { position: static !important; transform: none !important; margin-left: auto !important; }\n\n/* ---------- Верхняя панель ---------- */\nhtml.etis3-modern #etis3-topbar {\n\tdisplay: flex !important;\n\talign-items: center !important;\n\tgap: 1.2rem !important;\n\tposition: fixed !important;\n\tz-index: 70 !important;\n\ttop: var(--gap) !important;\n\tleft: var(--gap) !important;\n\tright: var(--gap) !important;\n\theight: var(--topbar-h) !important;\n\tpadding: 0 1rem 0 0.8rem !important;\n\tborder-radius: 2.4rem !important;\n\tbackground: var(--glass-bg-header) !important;\n\tbackdrop-filter: var(--glass-filter-strong) !important;\n\t-webkit-backdrop-filter: var(--glass-filter-strong) !important;\n\tborder: var(--glass-border) !important;\n\tbox-shadow: var(--glass-shadow) !important;\n\tanimation: tb-in 0.6s cubic-bezier(.2,.8,.2,1) both;\n\tfont-size: 1.3rem;\n\tcolor: var(--color-text-primary);\n}\n@keyframes tb-in { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }\n\n.tb-brand { flex: none; width: calc(var(--rail-w) - 1.6rem); display: flex; justify-content: center; text-decoration: none !important; }\n.tb-logo {\n\twidth: 4.4rem; height: 4.4rem;\n\tdisplay: grid; place-items: center;\n\tborder-radius: 1.4rem;\n\tfont-size: 2.2rem; font-weight: 800; letter-spacing: -0.04em;\n\tcolor: #fff !important;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(var(--orb-b, 236,72,153), 0.9));\n\tbox-shadow: 0 6px 20px rgba(var(--color-accent-rgb, 124,111,212), 0.45), inset 0 1px 0 rgba(255,255,255,0.45);\n\ttransition: transform 0.3s cubic-bezier(.2,.8,.2,1);\n}\n.tb-brand:hover .tb-logo { transform: rotate(-6deg) scale(1.06); }\n\n.tb-title { display: flex; flex-direction: column; justify-content: center; min-width: 0; line-height: 1.2; margin-left: 1.2rem; }\n.tb-crumb { font-size: 1.1rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-tertiary); }\n.tb-page { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n\n.tb-search {\n\tmargin-left: auto;\n\tdisplay: flex; align-items: center; gap: 0.8rem;\n\twidth: 32rem; max-width: 34vw;\n\theight: 4.2rem;\n\tpadding: 0 0.8rem 0 1.2rem !important;\n\tborder-radius: 1.4rem !important;\n\tborder: var(--glass-border) !important;\n\tbackground: var(--glass-bg-input) !important;\n\tcolor: var(--color-text-secondary) !important;\n\tfont: inherit !important; font-size: 1.3rem !important;\n\tcursor: pointer;\n\ttransition: background 0.2s, box-shadow 0.2s;\n}\n.tb-search:hover { background: var(--glass-bg-hover) !important; box-shadow: 0 0 0 3px var(--color-accent-glow) !important; }\n.tb-search .material-icons { font-size: 2rem; }\n.tb-search-text { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#etis3-topbar kbd, #etis3-palette kbd {\n\tfont: inherit; font-size: 1.05rem; font-weight: 600;\n\tpadding: 0.2rem 0.6rem; border-radius: 0.6rem;\n\tbackground: rgba(127,127,127,0.14); color: var(--color-text-secondary);\n\tborder: 1px solid rgba(127,127,127,0.18); border-bottom-width: 2px;\n}\n\n.tb-pair {\n\tdisplay: flex; align-items: center; gap: 1rem;\n\theight: 4.2rem; max-width: 34rem;\n\tpadding: 0 1.4rem 0 1.2rem;\n\tborder-radius: 1.4rem;\n\tposition: relative; overflow: hidden;\n\ttext-decoration: none !important;\n\tcolor: var(--color-text-primary) !important;\n\tbackground: hsla(var(--dis-h, 250), 70%, 60%, 0.12);\n\tborder: 1px solid hsla(var(--dis-h, 250), 70%, 60%, 0.25);\n\ttransition: transform 0.2s, background 0.2s;\n}\n.tb-pair[hidden] { display: none; }\n.tb-pair:hover { transform: translateY(-1px); background: hsla(var(--dis-h, 250), 70%, 60%, 0.18); }\n.tb-pair--done, .tb-pair--free { background: rgba(127,127,127,0.08); border-color: rgba(127,127,127,0.14); color: var(--color-text-secondary) !important; }\n.tb-pair .material-icons { font-size: 1.9rem; color: var(--color-green); }\n.tb-pair-dot { flex: none; width: 0.9rem; height: 0.9rem; border-radius: 50%; background: hsl(var(--dis-h, 250) 75% 60%); }\n.tb-pair--now .tb-pair-dot { box-shadow: 0 0 0 0 hsla(var(--dis-h, 250), 75%, 60%, 0.6); animation: pair-pulse 2s ease-out infinite; }\n@keyframes pair-pulse { to { box-shadow: 0 0 0 9px hsla(var(--dis-h, 250), 75%, 60%, 0); } }\n.tb-pair-txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }\n.tb-pair-k { font-size: 1.05rem; font-weight: 600; color: var(--color-text-secondary); }\n.tb-pair-name { font-size: 1.3rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.tb-pair-aud { flex: none; font-size: 1.15rem; color: var(--color-text-secondary); padding-left: 1rem; border-left: 1px solid var(--color-divider); }\n.tb-pair-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: transparent; }\n.tb-pair-bar i { display: block; height: 100%; background: hsl(var(--dis-h, 250) 75% 60%); }\n\n.tb-clock { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; padding: 0 0.6rem; }\n.tb-clock b { font-size: 1.8rem; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }\n.tb-clock small { font-size: 1.05rem; color: var(--color-text-secondary); }\n\n.tb-icon, .tb-avatar {\n\tflex: none;\n\twidth: 4.2rem; height: 4.2rem;\n\tdisplay: grid; place-items: center;\n\tpadding: 0 !important;\n\tborder-radius: 1.4rem !important;\n\tborder: var(--glass-border) !important;\n\tbackground: var(--glass-bg-input) !important;\n\tcolor: var(--color-text-secondary) !important;\n\tcursor: pointer;\n\ttransition: background 0.2s, color 0.2s, transform 0.2s;\n}\n.tb-icon:hover { color: var(--color-text-primary) !important; background: var(--glass-bg-hover) !important; transform: rotate(-12deg); }\n.tb-icon .material-icons { font-size: 2.1rem; }\n.tb-user { position: relative; }\n.tb-avatar {\n\tborder-radius: 50% !important;\n\tfont: inherit !important; font-size: 1.4rem !important; font-weight: 700 !important;\n\tcolor: #fff !important;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(var(--orb-c, 34,180,230), 0.9)) !important;\n\tbox-shadow: 0 4px 14px rgba(var(--color-accent-rgb, 124,111,212), 0.4), inset 0 1px 0 rgba(255,255,255,0.4) !important;\n\tborder: 2px solid rgba(255,255,255,0.35) !important;\n}\n.tb-avatar:hover { transform: scale(1.06); }\n.tb-avatar .material-icons { display: none; }\n.tb-avatar:empty .material-icons, .tb-avatar:not(:has(+ *)) .material-icons { display: none; }\n\n.tb-menu {\n\tposition: absolute; right: 0; top: calc(100% + 1.2rem);\n\twidth: 32rem;\n\tpadding: 1.2rem;\n\tborder-radius: 2rem;\n\tbackground: var(--glass-bg-active);\n\tbackdrop-filter: var(--glass-filter-strong);\n\t-webkit-backdrop-filter: var(--glass-filter-strong);\n\tborder: var(--glass-border-light);\n\tbox-shadow: var(--glass-shadow-hover), 0 30px 60px rgba(0,0,0,0.25);\n\tanimation: menu-in 0.25s cubic-bezier(.2,.8,.2,1) both;\n\ttransform-origin: top right;\n}\n.tb-menu[hidden] { display: none; }\n@keyframes menu-in { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }\n.tbm-head { display: flex; align-items: center; gap: 1.2rem; padding: 0.4rem 0.4rem 1.2rem; }\n.tbm-avatar { width: 4.6rem; height: 4.6rem; flex: none; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 1.6rem; color: #fff;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(var(--orb-c, 34,180,230), 0.9)); }\n.tbm-name { font-size: 1.45rem; font-weight: 700; line-height: 1.25; }\n.tbm-sub { font-size: 1.15rem; color: var(--color-text-secondary); margin-top: 0.2rem; }\n.tbm-sem { padding: 1rem 1.2rem; margin-bottom: 0.8rem; border-radius: 1.4rem; background: rgba(127,127,127,0.08); font-size: 1.2rem; }\n.tbm-sem .semester-progress__header { display: flex; justify-content: space-between; font-weight: 600; }\n.tbm-sem .semester-progress__bar { height: 0.5rem; margin: 0.7rem 0 0.5rem; border-radius: 1rem; background: var(--color-divider); overflow: hidden; }\n.tbm-sem .semester-progress__fill { height: 100%; border-radius: 1rem; background: var(--gradient-accent); }\n.tbm-sem .semester-progress__sub { color: var(--color-text-secondary); font-size: 1.1rem; }\n.tbm-links { display: flex; flex-direction: column; gap: 0.2rem; }\n.tbm-links a {\n\tdisplay: flex; align-items: center; gap: 1.2rem;\n\tpadding: 0.9rem 1rem; border-radius: 1.2rem;\n\tcolor: var(--color-text-primary) !important; text-decoration: none !important;\n\tfont-size: 1.35rem;\n\ttransition: background 0.15s;\n}\n.tbm-links a:hover { background: rgba(var(--color-accent-rgb, 124,111,212), 0.12); }\n.tbm-links a .material-icons { font-size: 2rem; color: var(--color-text-secondary); }\n.tbm-links a.tbm-danger { color: var(--color-red) !important; margin-top: 0.4rem; border-top: 1px solid var(--color-divider); border-radius: 0 0 1.2rem 1.2rem; padding-top: 1.2rem; }\n.tbm-links a.tbm-danger .material-icons { color: var(--color-red); }\n\n/* Плитка-заголовок страницы дублируется в верхней панели */\nhtml.etis3-modern .span9 > h3:first-child { margin-top: 0 !important; }\n\n/* Узкие экраны: рельс превращается в нижний док */\n@media (max-width: 900px) {\n\thtml.etis3-modern { --rail-w: 0rem; }\n\thtml.etis3-modern .container .row { padding: calc(var(--topbar-h) + 2.4rem) 1.2rem 11rem !important; }\n\thtml.etis3-modern .span3,\n\thtml.etis3-modern .span3:hover {\n\t\ttop: auto !important; left: 1.2rem !important; right: 1.2rem !important; bottom: 1.2rem !important;\n\t\twidth: auto !important; height: 6.8rem !important;\n\t\tpadding: 0.6rem !important;\n\t\tdisplay: flex !important; overflow: hidden !important;\n\t}\n\thtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked:not(.etis3-main-nav) { display: none !important; }\n\thtml.etis3-modern .span3 > .etis3-main-nav { display: flex !important; width: 100% !important; justify-content: space-around !important; margin: 0 !important; }\n\thtml.etis3-modern .span3 .etis3-main-nav > li:not([data-group=\"main\"]) { display: none !important; }\n\thtml.etis3-modern .span3 .etis3-nav-label { display: none !important; }\n\thtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked > li > a { padding: 1.2rem 1.6rem !important; }\n\thtml.etis3-modern #etis3-topbar { left: 1.2rem !important; right: 1.2rem !important; top: 1.2rem !important; }\n\t.tb-brand, .tb-clock, .tb-search-text, .tb-search kbd, .tb-pair-aud { display: none !important; }\n\t.tb-search { width: 4.2rem !important; padding: 0 !important; justify-content: center; margin-left: auto; }\n\t.tb-pair { max-width: 40vw; }\n\t.tb-title { margin-left: 0.6rem; }\n}\n@media (max-width: 1250px) {\n\t.tb-search { width: 4.2rem !important; padding: 0 !important; justify-content: center; }\n\t.tb-search-text, .tb-search kbd { display: none !important; }\n}\n\n/* ---------- Палитра команд ---------- */\n#etis3-palette {\n\tposition: fixed; inset: 0; z-index: 10000;\n\tdisplay: flex; justify-content: center; align-items: flex-start;\n\tpadding-top: 14vh;\n\tbackground: rgba(0,0,0,0.25);\n\tbackdrop-filter: blur(6px) saturate(120%);\n\t-webkit-backdrop-filter: blur(6px) saturate(120%);\n\topacity: 0; transition: opacity 0.2s ease;\n\tfont-size: 1.4rem; color: var(--color-text-primary);\n}\n#etis3-palette.show { opacity: 1; }\n.pal-box {\n\twidth: min(64rem, calc(100vw - 3.2rem));\n\tborder-radius: 2.4rem;\n\toverflow: hidden;\n\tbackground: var(--glass-bg-active);\n\tbackdrop-filter: blur(40px) saturate(200%);\n\t-webkit-backdrop-filter: blur(40px) saturate(200%);\n\tborder: var(--glass-border-light);\n\tbox-shadow: 0 40px 100px rgba(0,0,0,0.4), var(--glass-border-inner);\n\ttransform: translateY(-10px) scale(0.98);\n\ttransition: transform 0.25s cubic-bezier(.2,.8,.2,1);\n}\n#etis3-palette.show .pal-box { transform: none; }\n.pal-input { display: flex; align-items: center; gap: 1.2rem; padding: 1.6rem 2rem; border-bottom: 1px solid var(--color-divider); }\n.pal-input .material-icons { font-size: 2.4rem; color: var(--color-accent); }\n.pal-input input[type=\"text\"] {\n\tflex: 1; border: 0 !important; background: transparent !important;\n\tfont-size: 1.9rem !important; padding: 0 !important; margin: 0 !important; height: auto !important;\n\tcolor: var(--color-text-primary) !important; box-shadow: none !important;\n}\n.pal-list { padding: 0.8rem; max-height: 50vh; overflow-y: auto; }\n.pal-item {\n\tdisplay: flex; align-items: center; gap: 1.4rem;\n\tpadding: 1.1rem 1.4rem; border-radius: 1.4rem;\n\tcursor: pointer;\n}\n.pal-item .material-icons { font-size: 2.1rem; color: var(--color-text-secondary); }\n.pal-item.sel { background: rgba(var(--color-accent-rgb, 124,111,212), 0.16); }\n.pal-item.sel .material-icons { color: var(--color-accent); }\n.pal-label { flex: 1; font-weight: 500; }\n.pal-hint { font-size: 1.15rem; color: var(--color-text-tertiary); }\n.pal-empty { padding: 2.4rem; text-align: center; color: var(--color-text-secondary); }\n.pal-foot { display: flex; gap: 2rem; padding: 1rem 2rem; border-top: 1px solid var(--color-divider); font-size: 1.15rem; color: var(--color-text-tertiary); }\n.pal-foot kbd { margin-right: 0.3rem; }\n\n@media (prefers-reduced-motion: reduce) {\n\t#etis3-aurora .orb, html.etis3-modern #etis3-topbar, .tb-menu, .tb-pair--now .tb-pair-dot { animation: none !important; }\n}\nhtml.etis3-modern .span3 li:has(> .theme-switcher-btn) { display: none !important; }\nhtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked.etis3-quickbar { display: none !important; }\nhtml.etis3-modern .span3 a, html.etis3-modern .span3 a:hover { text-decoration: none !important; }\nhtml.etis3-modern .span3:hover, html.etis3-modern .span3:focus-within {\n\tbackground: var(--glass-sheen, none), var(--glass-bg-active) !important;\n}\nhtml.etis3-modern[theme=\"light\"] .span3:hover, html.etis3-modern[theme=\"light\"] .span3:focus-within { background: var(--glass-sheen, none), rgba(255,255,255,0.86) !important; }\n/* Меню профиля живёт в body: вложенный backdrop-filter не размывает */\nbody > .tb-menu { position: fixed; top: calc(var(--topbar-h, 6.4rem) + 2.6rem); right: 1.6rem; z-index: 80; }\n@media (max-width: 900px) { body > .tb-menu { right: 1.2rem; top: 8.4rem; width: min(32rem, calc(100vw - 2.4rem)); } }\nhtml.etis3-modern[theme=\"dark\"] .span3:hover, html.etis3-modern[theme=\"dark\"] .span3:focus-within { background: var(--glass-sheen, none), rgba(26,26,38,0.95) !important; }\n\n\n/* ============================================================\n   ГЛАВНАЯ 4.0 — дашборд\n   ============================================================ */\n\nhtml.etis3-home .span9 > :not(#etis3-home) { display: none !important; }\n#etis3-home {\n\tdisplay: grid;\n\tgrid-template-columns: repeat(12, minmax(0, 1fr));\n\tgap: 1.8rem;\n\tcolor: var(--color-text-primary);\n\tfont-size: 1.35rem;\n}\n#etis3-home > * { animation: hm-in 0.6s cubic-bezier(.2,.8,.2,1) both; }\n#etis3-home > :nth-child(2) { animation-delay: 0.06s; }\n#etis3-home > :nth-child(3) { animation-delay: 0.12s; }\n#etis3-home > :nth-child(4) { animation-delay: 0.18s; }\n#etis3-home > :nth-child(5) { animation-delay: 0.24s; }\n#etis3-home > :nth-child(6) { animation-delay: 0.30s; }\n#etis3-home > :nth-child(7) { animation-delay: 0.36s; }\n@keyframes hm-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }\n\n.hm-card {\n\tposition: relative;\n\tpadding: 2rem 2.2rem;\n\tborder-radius: 2.4rem;\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter);\n\t-webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border);\n\tbox-shadow: var(--glass-shadow-card);\n\tmin-width: 0;\n}\n.hm-hero   { grid-column: span 12; }\n.hm-today  { grid-column: span 7; }\n.hm-grades { grid-column: span 5; }\n.hm-recent { grid-column: span 4; }\n.hm-notes  { grid-column: span 4; }\n.hm-ann    { grid-column: span 4; }\n.hm-quick  { grid-column: span 12; }\n@media (max-width: 1250px) {\n\t.hm-today, .hm-grades { grid-column: span 12; }\n\t.hm-recent, .hm-notes, .hm-ann { grid-column: span 6; }\n\t.hm-ann { grid-column: span 12; }\n}\n@media (max-width: 760px) { .hm-recent, .hm-notes, .hm-ann { grid-column: span 12; } }\n\n.hm-card-head { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.6rem; }\n.hm-card-head > .material-icons { font-size: 2.2rem; color: var(--color-accent); }\n.hm-card-head h2 { margin: 0 !important; font-size: 1.8rem !important; font-weight: 700 !important; letter-spacing: -0.02em !important; color: var(--color-text-primary) !important; text-transform: none !important; }\n.hm-more { margin-left: auto; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 1.2rem; color: var(--color-text-secondary) !important; text-decoration: none !important; padding: 0.4rem 0.8rem; border-radius: 1rem; transition: background 0.2s, color 0.2s; }\n.hm-more .material-icons { font-size: 1.6rem; transition: transform 0.2s; }\n.hm-more:hover { color: var(--color-accent) !important; background: rgba(var(--color-accent-rgb, 124,111,212), 0.1); }\n.hm-more:hover .material-icons { transform: translateX(3px); }\n\n/* Герой */\n.hm-hero {\n\tdisplay: flex; align-items: center; gap: 2.4rem;\n\tpadding: 3rem 3.2rem;\n\toverflow: hidden;\n\tbackground:\n\t\tradial-gradient(60% 140% at 0% 0%, rgba(var(--color-accent-rgb, 124,111,212), 0.22), transparent 70%),\n\t\tradial-gradient(50% 140% at 100% 100%, rgba(var(--orb-b, 236,72,153), 0.16), transparent 70%),\n\t\tvar(--glass-bg-card);\n}\n.hm-hero-main { flex: 1; min-width: 0; }\n.hm-hello { font-size: clamp(2.8rem, 3.4vw, 4.4rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }\n.hm-date { margin-top: 0.6rem; font-size: 1.5rem; color: var(--color-text-secondary); }\n.hm-date::first-letter { text-transform: uppercase; }\n.hm-summary { margin-top: 1.4rem; font-size: 1.6rem; font-weight: 500; }\n.hm-chips { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 1.6rem; }\n.hm-chip {\n\tdisplay: inline-flex; align-items: center; gap: 0.6rem;\n\tpadding: 0.6rem 1.2rem; border-radius: 10rem;\n\tfont-size: 1.25rem; font-weight: 600;\n\tcolor: var(--color-text-primary) !important; text-decoration: none !important;\n\tbackground: rgba(127,127,127,0.10); border: 1px solid rgba(127,127,127,0.16);\n\ttransition: transform 0.2s;\n}\n.hm-chip:hover { transform: translateY(-1px); }\n.hm-chip .material-icons { font-size: 1.7rem; }\n.hm-chip--accent { color: var(--color-accent) !important; background: rgba(var(--color-accent-rgb, 124,111,212), 0.14); border-color: rgba(var(--color-accent-rgb, 124,111,212), 0.3); }\n.hm-chip--bad { color: var(--color-red) !important; background: rgba(255,59,48,0.10); border-color: rgba(255,59,48,0.25); }\n\n.hm-ring { position: relative; width: 15rem; height: 15rem; flex: none; }\n.hm-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }\n.hm-ring circle { fill: none; stroke-width: 9; }\n.hm-ring-bg { stroke: rgba(127,127,127,0.16); }\n.hm-ring-fg { stroke: url(#none); stroke: var(--color-accent); stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(var(--color-accent-rgb, 124,111,212), 0.6)); animation: ring-in 1.4s cubic-bezier(.2,.8,.2,1) 0.3s both; }\n@keyframes ring-in { from { stroke-dashoffset: 326.7; } }\n.hm-ring-txt { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; text-align: center; }\n.hm-ring-txt b { font-size: 3rem; font-weight: 800; letter-spacing: -0.03em; }\n.hm-ring-txt span { font-size: 1.2rem; font-weight: 600; color: var(--color-text-secondary); }\n.hm-ring-txt small { font-size: 1.05rem; color: var(--color-text-tertiary); }\n\n/* Таймлайн */\n.hm-timeline { display: flex; flex-direction: column; }\n.hm-pair { display: grid; grid-template-columns: 5.6rem 2.4rem minmax(0, 1fr); align-items: stretch; min-height: 7.2rem; }\n.hm-pair-time { display: flex; flex-direction: column; padding-top: 1rem; line-height: 1.2; }\n.hm-pair-time b { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }\n.hm-pair-time span { font-size: 1.15rem; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }\n.hm-pair-line { position: relative; display: flex; justify-content: center; }\n.hm-pair-line::before { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; background: var(--color-divider); }\n.hm-pair:first-child .hm-pair-line::before { top: 1.6rem; }\n.hm-pair:last-child .hm-pair-line::before { bottom: calc(100% - 1.6rem); }\n.hm-pair-line i { position: relative; margin-top: 1.25rem; width: 1.2rem; height: 1.2rem; border-radius: 50%; background: var(--dis-color); box-shadow: 0 0 0 4px var(--dis-soft); }\n.hm-pair--now .hm-pair-line i { animation: pair-pulse2 2s ease-out infinite; }\n@keyframes pair-pulse2 { 0% { box-shadow: 0 0 0 0 var(--dis-color); } 100% { box-shadow: 0 0 0 12px transparent; } }\n.hm-pair-body {\n\tmargin: 0.4rem 0 1rem 0.8rem;\n\tpadding: 1rem 1.4rem;\n\tborder-radius: 1.6rem;\n\tbackground: linear-gradient(120deg, var(--dis-soft), transparent 80%);\n\tborder: 1px solid rgba(127,127,127,0.12);\n\tborder-left: 3px solid var(--dis-color);\n}\n.hm-pair--now .hm-pair-body { box-shadow: 0 0 0 1px var(--dis-color), 0 8px 30px var(--dis-soft); }\n.hm-pair--past { opacity: 0.45; }\n.hm-pair-name { font-size: 1.5rem; font-weight: 650; font-weight: 600; }\n.hm-pair-meta { display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem; margin-top: 0.5rem; font-size: 1.2rem; color: var(--color-text-secondary); }\n.hm-pair-meta > span { display: inline-flex; align-items: center; gap: 0.4rem; }\n.hm-pair-meta .material-icons { font-size: 1.5rem; }\n.hm-tag { color: var(--dis-color); font-weight: 600; }\n.hm-pair-progress { margin-top: 0.9rem; height: 0.4rem; border-radius: 1rem; background: rgba(127,127,127,0.18); overflow: hidden; }\n.hm-pair-progress i { display: block; height: 100%; background: var(--dis-color); border-radius: 1rem; }\n\n/* Рейтинг */\n.hm-rating { margin-bottom: 1.6rem; }\n.hm-big { font-size: 4.2rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }\n.hm-big small { font-size: 1.8rem; font-weight: 600; color: var(--color-text-tertiary); letter-spacing: 0; }\n.hm-sub { margin-top: 0.4rem; font-size: 1.2rem; color: var(--color-text-secondary); }\n.hm-dis-list { display: flex; flex-direction: column; gap: 1rem; }\n.hm-dis { display: grid; grid-template-columns: minmax(0, 1fr) 9rem auto; align-items: center; gap: 1rem; font-size: 1.25rem; }\n.hm-dis-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.hm-dis-name::before { content: ''; display: inline-block; width: 0.8rem; height: 0.8rem; margin-right: 0.8rem; border-radius: 50%; background: var(--dis-color); }\n.hm-dis-bar { height: 0.5rem; border-radius: 1rem; background: rgba(127,127,127,0.16); overflow: hidden; }\n.hm-dis-bar i { display: block; height: 100%; border-radius: 1rem; background: var(--dis-color); }\n.hm-dis-val { font-variant-numeric: tabular-nums; color: var(--color-text-secondary); text-align: right; white-space: nowrap; }\n.hm-dis-val b { color: var(--color-red); font-weight: 600; }\n\n/* Списки */\n.hm-list { display: flex; flex-direction: column; gap: 0.8rem; }\n.hm-grade { display: flex; align-items: center; gap: 1.2rem; padding: 0.8rem; border-radius: 1.4rem; transition: background 0.2s; }\n.hm-grade:hover { background: rgba(127,127,127,0.07); }\n.hm-grade-score {\n\tflex: none; width: 5.2rem; height: 5.2rem;\n\tdisplay: flex; flex-direction: column; align-items: center; justify-content: center;\n\tborder-radius: 1.4rem; line-height: 1.1;\n\tbackground: var(--dis-soft); border: 1px solid rgba(127,127,127,0.12);\n}\n.hm-grade-score b { font-size: 1.9rem; font-weight: 800; }\n.hm-grade-score span { font-size: 1rem; color: var(--color-text-secondary); }\n.hm-grade-score--failed { background: rgba(255,59,48,0.12); }\n.hm-grade-score--failed b { color: var(--color-red); }\n.hm-grade-info { flex: 1; min-width: 0; }\n.hm-grade-dis { font-size: 1.15rem; font-weight: 600; color: var(--dis-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.hm-grade-topic { font-size: 1.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.hm-grade-date { flex: none; font-size: 1.1rem; color: var(--color-text-tertiary); text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }\n.hm-new { padding: 0.1rem 0.6rem; border-radius: 0.6rem; background: var(--color-accent); color: #fff; font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }\n.hm-grade--new { background: rgba(var(--color-accent-rgb, 124,111,212), 0.08); }\n\n.hm-feed {\n\tdisplay: block; padding: 1.2rem 1.4rem; border-radius: 1.6rem;\n\tcolor: var(--color-text-primary) !important; text-decoration: none !important;\n\tbackground: rgba(127,127,127,0.05); border: 1px solid rgba(127,127,127,0.10);\n\ttransition: background 0.2s, transform 0.2s;\n}\n.hm-feed:hover { background: rgba(127,127,127,0.10); transform: translateY(-1px); }\n.hm-feed--new { border-color: rgba(var(--color-accent-rgb, 124,111,212), 0.45); background: rgba(var(--color-accent-rgb, 124,111,212), 0.08); }\n.hm-feed--new .hm-feed-who::after { content: ''; display: inline-block; width: 0.7rem; height: 0.7rem; margin-left: 0.6rem; border-radius: 50%; background: var(--color-accent); vertical-align: 0.1em; }\n.hm-feed-head { display: flex; justify-content: space-between; gap: 1rem; font-size: 1.15rem; color: var(--color-text-secondary); }\n.hm-feed-who { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.hm-feed-time { flex: none; color: var(--color-text-tertiary); }\n.hm-feed-title { margin-top: 0.4rem; font-size: 1.4rem; font-weight: 600; line-height: 1.3; }\n.hm-feed-text { margin-top: 0.4rem; font-size: 1.25rem; line-height: 1.45; color: var(--color-text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.hm-feed-foot { display: flex; gap: 1.2rem; margin-top: 0.8rem; font-size: 1.1rem; color: var(--color-text-secondary); }\n.hm-feed-foot > span { display: inline-flex; align-items: center; gap: 0.5rem; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.hm-feed-foot i { flex: none; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--dis-color); }\n.hm-feed-foot .material-icons { font-size: 1.4rem; }\n\n.hm-empty { display: flex; align-items: center; gap: 0.8rem; padding: 1.4rem; color: var(--color-text-secondary); font-size: 1.3rem; }\n.hm-empty--big { flex-direction: column; padding: 3.2rem; }\n.hm-empty--big .material-icons { font-size: 3.6rem; color: var(--color-text-tertiary); }\n.hm-skel { display: flex; flex-direction: column; gap: 1rem; }\n.hm-skel i { height: 4.4rem; border-radius: 1.4rem; background: linear-gradient(90deg, rgba(127,127,127,0.08), rgba(127,127,127,0.16), rgba(127,127,127,0.08)); background-size: 200% 100%; animation: skel 1.3s linear infinite; }\n@keyframes skel { to { background-position: -200% 0; } }\n\n/* Быстрые плитки */\n.hm-quick { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1.2rem; }\n.hm-tile {\n\tdisplay: flex; flex-direction: column; gap: 1rem;\n\tpadding: 1.6rem; border-radius: 2rem;\n\tcolor: var(--color-text-primary) !important; text-decoration: none !important;\n\tfont-size: 1.3rem; font-weight: 600;\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border); box-shadow: var(--glass-shadow-card);\n\ttransition: transform 0.25s cubic-bezier(.2,.8,.2,1), box-shadow 0.25s;\n}\n.hm-tile:hover { transform: translateY(-3px); box-shadow: var(--glass-shadow-hover); }\n.hm-tile .material-icons {\n\twidth: 4rem; height: 4rem; display: grid; place-items: center;\n\tborder-radius: 1.2rem; font-size: 2.2rem;\n\tcolor: var(--color-accent); background: rgba(var(--color-accent-rgb, 124,111,212), 0.14);\n}\n\n/* Главная в классическом виде тоже работает */\nhtml:not(.etis3-modern).etis3-home #etis3-home { margin-top: 0; }\n@media (prefers-reduced-motion: reduce) { #etis3-home > *, .hm-ring-fg, .hm-skel i, .hm-pair--now .hm-pair-line i { animation: none !important; } }\n@media (max-width: 760px) {\n\t.hm-hero { padding: 2.2rem; gap: 1.2rem; }\n\t.hm-ring { width: 10rem; height: 10rem; }\n\t.hm-ring-txt b { font-size: 2.2rem; }\n\t.hm-ring-txt small { display: none; }\n\t.hm-card { padding: 1.6rem; }\n}\n\n\n/* ============================================================\n   НОВЫЕ ВИДЫ СТРАНИЦ 4.1\n   ============================================================ */\n\nhtml.etis3-modern .etis3-orig { display: none !important; }\nhtml:not(.etis3-modern) .etis3-view { display: none !important; }\n\n.etis3-view { color: var(--color-text-primary); font-size: 1.35rem; }\n.etis3-view a { text-decoration: none !important; }\n.etis3-view > *, .sv-card, .pv-sem, .tv-card, .av-item { animation: hm-in 0.5s cubic-bezier(.2,.8,.2,1) both; }\n\n/* Общая стеклянная карточка */\n.sv-card, .pv-sem, .tv-card, .av-summary, .av-item {\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter);\n\t-webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border);\n\tbox-shadow: var(--glass-shadow-card);\n\tborder-radius: 2.4rem;\n}\n\n/* ---------- Оценки ---------- */\n.sv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52rem, 1fr)); gap: 1.8rem; margin-top: 1.8rem; }\n@media (max-width: 760px) { .sv-grid { grid-template-columns: 1fr; } }\n.sv-card { padding: 2rem 2.2rem 1.4rem; position: relative; overflow: hidden; }\n.sv-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 9rem; background: linear-gradient(180deg, var(--dis-soft), transparent); pointer-events: none; }\n.sv-card > * { position: relative; }\n.sv-head { display: flex; align-items: flex-start; gap: 1.6rem; }\n.sv-title { flex: 1; display: flex; align-items: flex-start; gap: 1rem; min-width: 0; }\n.sv-title i { flex: none; margin-top: 0.6rem; width: 1.1rem; height: 1.1rem; border-radius: 50%; background: var(--dis-color); box-shadow: 0 0 0 4px var(--dis-soft); }\n.sv-title h3 { margin: 0 !important; padding: 0 !important; font-size: 1.75rem !important; font-weight: 700 !important; line-height: 1.3 !important; letter-spacing: -0.015em !important; color: var(--color-text-primary) !important; border: 0 !important; background: none !important; }\n.sv-title h3::before { display: none !important; }\n.sv-score { flex: none; text-align: right; line-height: 1; }\n.sv-score b { font-size: 3.2rem; font-weight: 800; letter-spacing: -0.04em; }\n.sv-score span { font-size: 1.4rem; font-weight: 600; color: var(--color-text-tertiary); margin-left: 0.3rem; }\n.sv-bar { height: 0.6rem; margin: 1.4rem 0 1.2rem; border-radius: 1rem; background: rgba(127,127,127,0.16); overflow: hidden; }\n.sv-bar i { display: block; height: 100%; border-radius: 1rem; background: var(--dis-color); box-shadow: 0 0 12px var(--dis-color); }\n.sv-meta { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.2rem; }\n.sv-pill { padding: 0.3rem 1rem; border-radius: 10rem; font-size: 1.15rem; font-weight: 600; color: var(--color-text-secondary); background: rgba(127,127,127,0.10); }\n.sv-pill[hidden] { display: none; }\n.sv-pill--ok { color: var(--color-green); background: rgba(52,199,89,0.12); }\n.sv-pill--bad { color: var(--color-red); background: rgba(255,59,48,0.12); }\n.sv-pill--new { color: var(--color-accent); background: rgba(var(--color-accent-rgb, 124,111,212), 0.14); }\n.sv-pill.goal--ok { color: var(--color-green); } .sv-pill.goal--warn { color: var(--color-yellow); } .sv-pill.goal--bad { color: var(--color-red); }\n.sv-kts { display: flex; flex-direction: column; gap: 0.2rem; margin: 0 -0.8rem; }\n.sv-kt { display: flex; align-items: center; gap: 1.2rem; padding: 0.8rem; border-radius: 1.4rem; color: var(--color-text-primary) !important; transition: background 0.15s; }\na.sv-kt:hover { background: rgba(127,127,127,0.08); }\n.sv-kt-score {\n\tflex: none; width: 5rem; height: 4.6rem;\n\tdisplay: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05;\n\tborder-radius: 1.3rem; background: rgba(127,127,127,0.10);\n}\n.sv-kt-score b { font-size: 1.8rem; font-weight: 800; }\n.sv-kt-score small { font-size: 1rem; color: var(--color-text-tertiary); }\n.sv-kt--passed .sv-kt-score { background: rgba(52,199,89,0.14); } .sv-kt--passed .sv-kt-score b { color: var(--color-green); }\n.sv-kt--failed .sv-kt-score { background: rgba(255,59,48,0.14); } .sv-kt--failed .sv-kt-score b { color: var(--color-red); }\n.sv-kt--pending .sv-kt-score b { color: var(--color-text-tertiary); }\n.sv-kt--new { background: rgba(var(--color-accent-rgb, 124,111,212), 0.08); }\n.sv-kt-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }\n.sv-kt-topic { font-size: 1.35rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.sv-kt-topic em { font-style: normal; font-weight: 700; color: var(--dis-color); margin-right: 0.6rem; }\n.sv-kt-sub { font-size: 1.15rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.sv-kt-date { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; font-size: 1.15rem; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }\nhtml.etis3-modern .etis3-stats-widget .esw-dis-list { display: none !important; }\n\n/* ---------- Сообщения ---------- */\nhtml.etis3-modern ul.nav.msg.etis3-msg { border-radius: 2.4rem !important; overflow: hidden !important; }\nhtml.etis3-modern .etis3-msg .message-header { display: flex !important; align-items: center !important; gap: 1.4rem !important; }\n.etis3-msg-avatar {\n\tflex: none; width: 4.4rem; height: 4.4rem; border-radius: 50%;\n\tdisplay: grid; place-items: center;\n\tfont-size: 1.5rem; font-weight: 700; color: #fff;\n\tbackground: linear-gradient(135deg, hsl(var(--dis-h, 250) 65% 55%), hsl(calc(var(--dis-h, 250) + 40) 70% 60%));\n\tbox-shadow: 0 4px 14px hsla(var(--dis-h, 250), 65%, 55%, 0.35), inset 0 1px 0 rgba(255,255,255,0.35);\n}\nhtml:not(.etis3-modern) .etis3-msg-avatar { display: none; }\nhtml.etis3-modern .etis3-msg .message-header > .message-info { flex: 1; min-width: 0; }\nhtml.etis3-modern .etis3-msg.etis3-dis { border-left: 3px solid var(--dis-color) !important; }\nhtml.etis3-modern .etis3-msg font[title^=\"Показать\"] { color: var(--dis-color) !important; }\nhtml.etis3-modern .etis3-msg--new { box-shadow: 0 0 0 1px rgba(var(--color-accent-rgb, 124,111,212), 0.6), var(--glass-shadow-card) !important; }\nhtml.etis3-modern .etis3-msg--new .message-header::after {\n\tcontent: 'новое'; flex: none; padding: 0.2rem 0.8rem; border-radius: 0.8rem;\n\tfont-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;\n\tcolor: #fff; background: var(--color-accent);\n}\nhtml.etis3-modern a.etis3-file {\n\tdisplay: inline-flex !important; align-items: center !important; gap: 0.6rem !important;\n\tpadding: 0.6rem 1.2rem !important; border-radius: 1.2rem !important;\n\tbackground: rgba(127,127,127,0.10) !important; text-decoration: none !important;\n}\nhtml.etis3-modern a.etis3-file::before { content: 'description'; font-family: 'Material Icons Outlined'; font-size: 1.8rem; }\n\n/* ---------- Учебный план ---------- */\n.pv { display: flex; flex-direction: column; gap: 2rem; margin-top: 1.6rem; }\n.pv-sem { padding: 2.2rem; }\n.pv-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1.6rem; }\n.pv-head h3 { margin: 0 !important; font-size: 2.2rem !important; font-weight: 800 !important; letter-spacing: -0.03em !important; color: var(--color-text-primary) !important; border: 0 !important; }\n.pv-stats { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.pv-stats > span { padding: 0.4rem 1.1rem; border-radius: 10rem; font-size: 1.2rem; color: var(--color-text-secondary); background: rgba(127,127,127,0.10); }\n.pv-stats b { color: var(--color-text-primary); }\n.pv-exam b { color: var(--color-red); } .pv-credit b { color: var(--color-green); }\n.pv-section { margin: 1.6rem 0 0.8rem; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-tertiary); }\n.pv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(30rem, 1fr)); gap: 1rem; }\n.pv-item {\n\tdisplay: flex; flex-direction: column; gap: 1rem;\n\tpadding: 1.4rem 1.6rem; border-radius: 1.8rem;\n\tcolor: var(--color-text-primary) !important;\n\tbackground: linear-gradient(135deg, var(--dis-soft), transparent 70%), rgba(127,127,127,0.05);\n\tborder: 1px solid rgba(127,127,127,0.12);\n\tborder-left: 3px solid var(--dis-color);\n\ttransition: transform 0.2s cubic-bezier(.2,.8,.2,1), box-shadow 0.2s;\n}\n.pv-item:hover { transform: translateY(-2px); box-shadow: var(--glass-shadow-hover); }\n.pv-item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }\n.pv-name { font-size: 1.45rem; font-weight: 600; line-height: 1.3; }\n.pv-report { flex: none; padding: 0.2rem 0.8rem; border-radius: 0.8rem; font-size: 1.1rem; font-weight: 700; background: rgba(127,127,127,0.12); color: var(--color-text-secondary); }\n.pv-report--exam { color: var(--color-red); background: rgba(255,59,48,0.12); }\n.pv-report--credit { color: var(--color-green); background: rgba(52,199,89,0.12); }\n.pv-hours { height: 0.6rem; }\n.pv-hbar { display: flex; height: 100%; border-radius: 1rem; overflow: hidden; }\n.pv-hbar i { background: var(--dis-color); } .pv-hbar u { background: hsla(var(--dis-h), 60%, 60%, 0.35); }\n.pv-hours-txt { display: flex; gap: 1.2rem; font-size: 1.15rem; color: var(--color-text-secondary); align-items: center; }\n.pv-hours-txt i, .pv-hours-txt u { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 0.3rem; margin-right: 0.5rem; vertical-align: -0.05em; }\n.pv-hours-txt i { background: var(--dis-color); } .pv-hours-txt u { background: hsla(var(--dis-h), 60%, 60%, 0.35); }\n.pv-hours-txt b { margin-left: auto; color: var(--color-text-primary); }\n\n/* ---------- Преподаватели ---------- */\n.tv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(42rem, 1fr)); gap: 1.6rem; margin-top: 1.6rem; }\n@media (max-width: 760px) { .tv-grid { grid-template-columns: 1fr; } }\n.tv-card { display: flex; gap: 1.8rem; padding: 1.8rem; }\n.tv-photo {\n\tposition: relative; flex: none; width: 9.6rem; height: 12.4rem; border-radius: 1.8rem; overflow: hidden;\n\tdisplay: grid; place-items: center;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 0.85), rgba(var(--orb-c, 34,180,230), 0.75));\n\tbox-shadow: inset 0 1px 0 rgba(255,255,255,0.35);\n}\n.tv-photo span { font-size: 3rem; font-weight: 800; color: #fff; letter-spacing: -0.03em; }\n.tv-photo img { position: absolute; inset: 0; width: 100% !important; height: 100% !important; object-fit: cover; }\n.tv-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.6rem; }\n.tv-name { margin: 0 !important; font-size: 1.7rem !important; font-weight: 700 !important; line-height: 1.25 !important; color: var(--color-text-primary) !important; border: 0 !important; }\n.tv-chair { font-size: 1.2rem; color: var(--color-text-secondary); }\n.tv-dis { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.4rem; }\n.tv-dis-item { display: flex; align-items: baseline; gap: 0.7rem; font-size: 1.3rem; }\n.tv-dis-item i { flex: none; width: 0.8rem; height: 0.8rem; border-radius: 50%; background: var(--dis-color); transform: translateY(-0.1rem); }\n.tv-dis-item small { color: var(--color-text-tertiary); font-size: 1.1rem; }\n.tv-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: auto; padding-top: 0.8rem; }\n.tv-btn {\n\tdisplay: inline-flex; align-items: center; gap: 0.5rem;\n\tpadding: 0.6rem 1.2rem !important; border-radius: 1.2rem !important;\n\tborder: var(--glass-border) !important; background: var(--glass-bg-input) !important;\n\tcolor: var(--color-text-primary) !important; font: inherit !important; font-size: 1.2rem !important; cursor: pointer;\n\ttransition: background 0.2s;\n}\n.tv-btn:hover { background: rgba(var(--color-accent-rgb, 124,111,212), 0.14) !important; }\n.tv-btn .material-icons { font-size: 1.7rem; color: var(--color-accent); }\n\n/* ---------- Пропуски ---------- */\n.av { display: flex; flex-direction: column; gap: 1.4rem; margin-top: 1.4rem; }\n.av-summary { display: flex; align-items: center; gap: 1.6rem; padding: 2rem 2.4rem; }\n.av-big { font-size: 5.6rem; font-weight: 800; letter-spacing: -0.05em; line-height: 1; color: var(--color-red); }\n.av-summary b { display: block; font-size: 1.8rem; }\n.av-summary span { font-size: 1.3rem; color: var(--color-text-secondary); }\n.av-list { display: flex; flex-direction: column; gap: 1rem; }\n.av-item { display: flex; align-items: center; gap: 1.6rem; padding: 1.4rem 1.8rem; border-radius: 2rem; border-left: 3px solid var(--dis-color) !important; }\n.av-dates { display: flex; gap: 0.6rem; flex: none; }\n.av-dates span { width: 5.4rem; padding: 0.6rem 0; border-radius: 1.3rem; text-align: center; font-size: 1.1rem; color: var(--color-text-secondary); background: var(--dis-soft); line-height: 1.15; }\n.av-dates b { display: block; font-size: 2rem; font-weight: 800; color: var(--color-text-primary); }\n.av-info { flex: 1; min-width: 0; }\n.av-dis { font-size: 1.5rem; font-weight: 600; }\n.av-sub { font-size: 1.2rem; color: var(--color-text-secondary); margin-top: 0.3rem; }\n.av-count { font-size: 1.6rem; font-weight: 700; color: var(--color-text-tertiary); }\n\n@media (prefers-reduced-motion: reduce) { .etis3-view > *, .sv-card, .pv-sem, .tv-card, .av-item { animation: none !important; } }\nhtml.etis3-modern .span9 > .teach-plan { display: block !important; width: 100% !important; }\n.pv-choice { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 1.1rem; font-weight: 600; color: var(--color-accent); margin-top: -0.4rem; }\n.pv-choice .material-icons { font-size: 1.5rem; }\n\n\n/* ============================================================\n   РАСПИСАНИЕ — дни лентой (4.3)\n   ============================================================ */\n\n.span9.etis3-tt-grid .ttv { display: none !important; }\n.ttv { display: flex; flex-direction: column; gap: 1.6rem; }\n.ttv-day {\n\tscroll-margin-top: 11rem;\n\tpadding: 1.8rem 2.2rem 1rem;\n\tborder-radius: 2.4rem;\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border);\n\tbox-shadow: var(--glass-shadow-card);\n\tanimation: hm-in 0.5s cubic-bezier(.2,.8,.2,1) both;\n}\n.ttv-day--today {\n\tbackground:\n\t\tradial-gradient(70% 120% at 0% 0%, rgba(var(--color-accent-rgb, 124,111,212), 0.16), transparent 70%),\n\t\tvar(--glass-bg-card);\n\tbox-shadow: 0 0 0 1.5px rgba(var(--color-accent-rgb, 124,111,212), 0.55), var(--glass-shadow-card);\n}\n.ttv-day--past { opacity: 0.62; }\n.ttv-day--past:hover { opacity: 1; }\n.ttv-day--free { padding-bottom: 1.8rem; }\n.ttv-head { display: flex; align-items: center; gap: 1.4rem; margin-bottom: 1.4rem; }\n.ttv-day--free .ttv-head { margin-bottom: 0; }\n.ttv-date {\n\tflex: none; width: 5.6rem; height: 5.6rem; border-radius: 1.6rem;\n\tdisplay: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05;\n\tbackground: rgba(127,127,127,0.10);\n}\n.ttv-date b { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.03em; }\n.ttv-date span { font-size: 1.05rem; color: var(--color-text-secondary); }\n.ttv-day--today .ttv-date { background: var(--color-accent); color: #fff; box-shadow: 0 6px 18px rgba(var(--color-accent-rgb, 124,111,212), 0.45); }\n.ttv-day--today .ttv-date span { color: rgba(255,255,255,0.85); }\n.ttv-title { flex: 1; display: flex; align-items: center; gap: 1rem; min-width: 0; }\n.ttv-title h3 { margin: 0 !important; padding: 0 !important; font-size: 1.9rem !important; font-weight: 700 !important; letter-spacing: -0.02em !important; color: var(--color-text-primary) !important; border: 0 !important; text-transform: none !important; background: none !important; }\n.ttv-title h3::first-letter { text-transform: uppercase; }\n.ttv-badge { padding: 0.2rem 0.9rem; border-radius: 10rem; font-size: 1.1rem; font-weight: 700; color: var(--color-accent); background: rgba(var(--color-accent-rgb, 124,111,212), 0.14); }\n.ttv-info { flex: none; font-size: 1.25rem; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }\n.ttv-day--free .ttv-info { color: var(--color-text-tertiary); }\n\n.hm-pair-num { margin-left: 0.8rem; font-size: 1.05rem; font-weight: 600; color: var(--color-text-tertiary); white-space: nowrap; }\n.hm-gap { display: grid; grid-template-columns: 5.6rem 2.4rem 1fr; align-items: center; min-height: 3rem; }\n.hm-gap span { grid-column: 2; justify-self: center; width: 2px; height: 100%; background: repeating-linear-gradient(180deg, var(--color-divider) 0 4px, transparent 4px 8px); }\n.hm-gap em { grid-column: 3; margin-left: 0.8rem; font-style: normal; font-size: 1.15rem; color: var(--color-text-tertiary); }\n.hm-gap--now em { color: var(--color-accent); font-weight: 600; }\n.hm-gap--now em::before { content: 'сейчас · '; }\nhtml.etis3-modern .span9 .next-pair-widget { margin-bottom: 1.6rem !important; }\n@media (max-width: 760px) {\n\t.ttv-day { padding: 1.4rem 1.4rem 0.6rem; }\n\t.ttv-info { display: none; }\n}\n\n\n/* ============================================================\n   ЧТО НОВОГО\n   ============================================================ */\n\n#etis3-whatsnew {\n\tposition: fixed; inset: 0; z-index: 10001;\n\tdisplay: grid; place-items: center; padding: 2rem;\n\tbackground: rgba(0,0,0,0.30);\n\tbackdrop-filter: blur(8px) saturate(120%); -webkit-backdrop-filter: blur(8px) saturate(120%);\n\topacity: 0; transition: opacity 0.3s ease;\n\tcolor: var(--color-text-primary); font-size: 1.4rem;\n}\n#etis3-whatsnew.show { opacity: 1; }\n.wn-box {\n\tposition: relative; overflow: hidden;\n\twidth: min(52rem, 100%);\n\tpadding: 2.8rem 2.8rem 2.4rem;\n\tborder-radius: 3rem;\n\tbackground: var(--glass-bg-active);\n\tbackdrop-filter: blur(44px) saturate(200%); -webkit-backdrop-filter: blur(44px) saturate(200%);\n\tborder: var(--glass-border-light);\n\tbox-shadow: 0 40px 120px rgba(0,0,0,0.45), var(--glass-border-inner);\n\ttransform: translateY(18px) scale(0.96); transition: transform 0.45s cubic-bezier(.2,.8,.2,1);\n}\n#etis3-whatsnew.show .wn-box { transform: none; }\n.wn-glow { position: absolute; inset: -40% -20% auto -20%; height: 26rem; pointer-events: none;\n\tbackground: radial-gradient(50% 60% at 30% 50%, rgba(var(--color-accent-rgb, 124,111,212), 0.35), transparent 70%),\n\t            radial-gradient(40% 50% at 75% 40%, rgba(var(--orb-b, 236,72,153), 0.25), transparent 70%); }\n.wn-head, .wn-list, .wn-ok { position: relative; }\n.wn-head { display: flex; align-items: center; gap: 1.6rem; margin-bottom: 2.2rem; }\n.wn-logo {\n\twidth: 5.6rem; height: 5.6rem; flex: none; border-radius: 1.8rem;\n\tdisplay: grid; place-items: center; font-size: 2.8rem; font-weight: 800; color: #fff;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(var(--orb-b, 236,72,153), 0.9));\n\tbox-shadow: 0 10px 30px rgba(var(--color-accent-rgb, 124,111,212), 0.5), inset 0 1px 0 rgba(255,255,255,0.45);\n}\n.wn-kicker { font-size: 1.15rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-accent); }\n.wn-head h2 { margin: 0.2rem 0 0 !important; font-size: 2.8rem !important; font-weight: 800 !important; letter-spacing: -0.04em !important; color: var(--color-text-primary) !important; }\n.wn-list { display: flex; flex-direction: column; gap: 1.4rem; max-height: 50vh; overflow-y: auto; }\n.wn-item { display: flex; gap: 1.4rem; align-items: flex-start; opacity: 0; animation: hm-in 0.5s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(0.15s + var(--i) * 0.07s); }\n.wn-item .material-icons {\n\tflex: none; width: 4rem; height: 4rem; display: grid; place-items: center;\n\tborder-radius: 1.2rem; font-size: 2.1rem;\n\tcolor: var(--color-accent); background: rgba(var(--color-accent-rgb, 124,111,212), 0.14);\n}\n.wn-item b { display: block; font-size: 1.5rem; }\n.wn-item span:not(.material-icons) { display: block; margin-top: 0.2rem; font-size: 1.3rem; line-height: 1.45; color: var(--color-text-secondary); }\n#etis3-whatsnew .wn-ok {\n\ttext-align: center !important;\n\tdisplay: flex !important; justify-content: center !important; width: 100%; margin-top: 2.4rem;\n\tpadding: 1.3rem !important; border: 0 !important; border-radius: 1.6rem !important;\n\tfont: inherit !important; font-size: 1.5rem !important; font-weight: 700 !important; color: #fff !important; cursor: pointer;\n\tbackground: linear-gradient(135deg, rgba(var(--color-accent-rgb, 124,111,212), 1), rgba(var(--orb-b, 236,72,153), 0.9)) !important;\n\tbox-shadow: 0 10px 30px rgba(var(--color-accent-rgb, 124,111,212), 0.45), inset 0 1px 0 rgba(255,255,255,0.4) !important;\n\ttransition: transform 0.2s, filter 0.2s;\n}\n#etis3-whatsnew .wn-ok:hover { transform: translateY(-1px); filter: brightness(1.08); }\n@media (prefers-reduced-motion: reduce) { .wn-item { animation: none !important; opacity: 1; } }\n\n\n/* ============================================================\n   ОЦЕНКИ ЗА СЕССИИ (4.4)\n   ============================================================ */\n\n.ssv { display: flex; flex-direction: column; gap: 1.8rem; margin-top: 1.6rem; --g5: 52,199,89; --g4: 10,132,255; --g3: 255,159,10; --g2: 255,59,48; }\n.ssv-summary, .ssv-term {\n\tborder-radius: 2.4rem;\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border); box-shadow: var(--glass-shadow-card);\n\tanimation: hm-in 0.5s cubic-bezier(.2,.8,.2,1) both;\n}\n.ssv-summary { display: grid; grid-template-columns: 22rem minmax(0, 1fr) 26rem; gap: 2.4rem; padding: 2.4rem; align-items: stretch;\n\tbackground: radial-gradient(50% 120% at 0% 0%, rgba(var(--color-accent-rgb, 124,111,212), 0.18), transparent 70%), var(--glass-bg-card); }\n@media (max-width: 1100px) { .ssv-summary { grid-template-columns: 1fr 1fr; } .ssv-trend { grid-column: 1 / -1; order: 3; } }\n@media (max-width: 640px) { .ssv-summary { grid-template-columns: 1fr; } }\n.ssv-label { font-size: 1.15rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-text-tertiary); margin-bottom: 0.8rem; }\n.ssv-big { font-size: 6.4rem; font-weight: 800; letter-spacing: -0.05em; line-height: 1; }\n.ssv-sub { margin-top: 0.8rem; font-size: 1.25rem; color: var(--color-text-secondary); }\n.ssv-delta { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 1.2rem; padding: 0.3rem 1rem; border-radius: 10rem; font-size: 1.2rem; font-weight: 600; }\n.ssv-delta .material-icons { font-size: 1.7rem; }\n.ssv-delta.up { background: rgba(var(--g5), 0.14); color: var(--color-green); }\n.ssv-delta.down { background: rgba(var(--g2), 0.12); color: var(--color-red); }\n\n.ssv-trend { min-width: 0; display: flex; flex-direction: column; }\n.ssv-plot { position: relative; flex: 1; min-height: 15rem; padding-bottom: 2rem; }\n.ssv-chart { position: absolute; inset: 0 0 2rem 0; width: 100%; height: calc(100% - 2rem); overflow: visible; }\n.ssv-grid { stroke: var(--color-divider); stroke-width: 1; vector-effect: non-scaling-stroke; }\n.ssv-axis { font-size: 11px; fill: var(--color-text-tertiary); }\n.ssv-line { fill: none; stroke: var(--color-accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }\n.ssv-area { fill: rgba(var(--color-accent-rgb, 124,111,212), 0.10); stroke: none; }\n.ssv-dots { position: absolute; inset: 0 0 2rem 0; }\n.ssv-dot {\n\tposition: absolute; width: 1rem; height: 1rem; margin: -0.5rem 0 0 -0.5rem; border-radius: 50%;\n\tbackground: var(--color-accent); box-shadow: 0 0 0 2px var(--glass-bg-active, #fff);\n\tcursor: default; transition: transform 0.15s;\n}\n.ssv-dot::after { content: ''; position: absolute; inset: -0.9rem; border-radius: 50%; }\n.ssv-dot:hover { transform: scale(1.5); }\n.ssv-dot:hover::before {\n\tcontent: attr(data-tip); position: absolute; bottom: calc(100% + 1rem); left: 50%; transform: translateX(-50%) scale(0.667);\n\ttransform-origin: bottom center; white-space: nowrap;\n\tpadding: 0.6rem 1rem; border-radius: 1rem; font-size: 1.8rem; font-weight: 600;\n\tbackground: var(--glass-bg-tooltip); color: var(--color-text-primary); box-shadow: var(--glass-shadow); pointer-events: none;\n}\n.ssv-xlabels { position: absolute; left: 0; right: 0; bottom: 0; height: 1.6rem; }\n.ssv-xlabels span { position: absolute; transform: translateX(-50%); font-size: 1.05rem; color: var(--color-text-tertiary); white-space: nowrap; }\n\n.ssv-dist { display: flex; flex-direction: column; }\n.ssv-bar { display: flex; gap: 2px; height: 1.2rem; border-radius: 0.6rem; overflow: hidden; margin: 0.4rem 0 1.4rem; }\n.ssv-bar i, .ssv-legend i { display: block; }\n.ssv-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem 1.4rem; font-size: 1.3rem; }\n.ssv-legend span { display: flex; align-items: center; gap: 0.7rem; color: var(--color-text-secondary); }\n.ssv-legend i { width: 1rem; height: 1rem; border-radius: 0.3rem; flex: none; }\n.ssv-legend b { margin-left: auto; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }\n.ssv-bar .g5, .ssv-legend .g5 { background: rgb(var(--g5)); }\n.ssv-bar .g4, .ssv-legend .g4 { background: rgb(var(--g4)); }\n.ssv-bar .g3, .ssv-legend .g3 { background: rgb(var(--g3)); }\n.ssv-bar .g2, .ssv-legend .g2, .ssv-bar .gfail, .ssv-legend .gfail { background: rgb(var(--g2)); }\n.ssv-bar .gpass, .ssv-legend .gpass { background: rgba(var(--g5), 0.4); }\n\n.ssv-term { padding: 2rem 2.2rem 1.2rem; }\n.ssv-term--old { opacity: 0.92; }\n.ssv-term-head { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 1.2rem; flex-wrap: wrap; }\n.ssv-term-head h3 { margin: 0 !important; padding: 0 !important; font-size: 2rem !important; font-weight: 800 !important; letter-spacing: -0.03em !important; color: var(--color-text-primary) !important; border: 0 !important; background: none !important; }\n.ssv-term-head h3::before { display: none !important; }\n.ssv-course { padding: 0.2rem 0.9rem; border-radius: 10rem; font-size: 1.15rem; font-weight: 600; color: var(--color-text-secondary); background: rgba(127,127,127,0.10); }\n.ssv-term-avg { margin-left: auto; font-size: 1.3rem; color: var(--color-text-secondary); }\n.ssv-term-avg b { font-size: 1.8rem; color: var(--color-text-primary); }\n.ssv-rows { display: grid; grid-template-columns: repeat(auto-fill, minmax(42rem, 1fr)); gap: 0.2rem 1.6rem; margin: 0 -0.6rem; }\n@media (max-width: 640px) { .ssv-rows { grid-template-columns: 1fr; } }\n.ssv-row { display: flex; align-items: center; gap: 1.2rem; padding: 0.7rem 0.6rem; border-radius: 1.2rem; transition: background 0.15s; }\n.ssv-row:hover { background: rgba(127,127,127,0.07); }\n.ssv-grade {\n\tflex: none; width: 4.4rem; height: 4.4rem; border-radius: 1.3rem;\n\tdisplay: grid; place-items: center; font-size: 1.9rem; font-weight: 800;\n\tcolor: var(--color-text-primary); background: rgba(127,127,127,0.10);\n}\n.ssv-grade.g5 { background: rgba(var(--g5), 0.18); box-shadow: inset 0 0 0 1.5px rgba(var(--g5), 0.55); }\n.ssv-grade.g4 { background: rgba(var(--g4), 0.16); box-shadow: inset 0 0 0 1.5px rgba(var(--g4), 0.5); }\n.ssv-grade.g3 { background: rgba(var(--g3), 0.16); box-shadow: inset 0 0 0 1.5px rgba(var(--g3), 0.5); }\n.ssv-grade.g2, .ssv-grade.gfail { background: rgba(var(--g2), 0.16); box-shadow: inset 0 0 0 1.5px rgba(var(--g2), 0.55); font-size: 1.2rem; }\n.ssv-grade.g2 { font-size: 1.9rem; }\n.ssv-grade.gpass { background: rgba(var(--g5), 0.10); }\n.ssv-grade.gpass .material-icons { font-size: 2.2rem; color: var(--color-green); }\n.ssv-dis { flex: 1; min-width: 0; font-size: 1.4rem; font-weight: 500; line-height: 1.3; }\n.ssv-dis small { display: block; font-size: 1.15rem; font-weight: 400; color: var(--color-text-secondary); }\n.ssv-date { flex: none; font-size: 1.15rem; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }\n\n.ssv-note { margin-top: 1.8rem; padding: 1.2rem 1.6rem; border-radius: 1.6rem; background: rgba(127,127,127,0.06); border: 1px solid rgba(127,127,127,0.12); font-size: 1.3rem; line-height: 1.6; color: var(--color-text-secondary); }\n.ssv-note summary { display: flex; align-items: center; gap: 0.8rem; cursor: pointer; font-weight: 600; color: var(--color-text-primary); list-style: none; }\n.ssv-note summary::-webkit-details-marker { display: none; }\n.ssv-note summary .material-icons { font-size: 1.9rem; color: var(--color-accent); }\n.ssv-note > div { margin-top: 1rem; }\n.ssv-plot { padding-left: 2.2rem; }\n.ssv-chart, .ssv-dots { left: 2.2rem !important; }\n.ssv-xlabels { left: 2.2rem; }\n.ssv-ylabels { position: absolute; left: 0; top: 0; bottom: 2rem; width: 1.6rem; }\n.ssv-ylabels span { position: absolute; left: 0; transform: translateY(-50%); font-size: 1.1rem; color: var(--color-text-tertiary); }\n.ssv-chart { width: calc(100% - 2.2rem) !important; }\n\n\n/* ============================================================\n   МОБИЛЬНАЯ ВЕРСИЯ 4.5 (iPhone / Android)\n   ============================================================ */\n\n/* Аврора не должна расширять страницу на телефонах */\n#etis3-aurora { contain: strict !important; overflow: clip !important; width: 100vw !important; height: 100vh !important; height: 100lvh !important; right: auto !important; bottom: auto !important; }\n@media (max-width: 900px) { html, body { overflow-x: clip !important; } }\n\nhtml { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; }\n.etis3-more-li, #etis3-sheet-backdrop { display: none !important; }\n/* Длинные ссылки и слова в объявлениях и сообщениях переносим */\nul.nav.msg li, .hm-feed-text, .ssv-note { overflow-wrap: anywhere; }\n.icon-button.icon-analytics { white-space: normal !important; height: auto !important; text-align: left !important; }\n\n@media (max-width: 900px) {\n\thtml.etis3-modern { --gap: 1rem; --topbar-h: 5.6rem; }\n\n\t/* Шапка: название, поиск, пара, аватар. Тема — в меню профиля */\n\thtml.etis3-modern #etis3-topbar {\n\t\ttop: max(1rem, env(safe-area-inset-top)) !important;\n\t\tleft: max(1rem, env(safe-area-inset-left)) !important; right: max(1rem, env(safe-area-inset-right)) !important;\n\t\theight: var(--topbar-h) !important; gap: 0.6rem !important; padding: 0 0.6rem 0 1.4rem !important; border-radius: 2rem !important;\n\t}\n\t.tb-theme { display: none !important; }\n\t.tb-title { flex: 1 1 auto; min-width: 0; margin-left: 0 !important; }\n\t.tb-crumb { display: none; }\n\t.tb-page { font-size: 1.6rem; }\n\t.tb-pair { flex: 0 1 auto; max-width: 46vw; height: 4rem; padding: 0 1rem; gap: 0.7rem; }\n\t.tb-pair-k { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n\t.tb-pair-name { font-size: 1.2rem; }\n\t.tb-search, .tb-avatar { width: 4rem !important; height: 4rem !important; flex: none; }\n\t.tb-search { margin-left: 0 !important; }\n\tbody > .tb-menu { top: calc(var(--topbar-h) + max(1rem, env(safe-area-inset-top)) + 0.8rem) !important; }\n\thtml.etis3-modern .container .row {\n\t\tpadding: calc(var(--topbar-h) + max(1rem, env(safe-area-inset-top)) + 1.6rem) max(1.2rem, env(safe-area-inset-right)) calc(10rem + env(safe-area-inset-bottom)) max(1.2rem, env(safe-area-inset-left)) !important;\n\t}\n\n\t/* Док снизу: плотнее стекло, учёт полоски «домой» на iPhone, пункт «Ещё» */\n\thtml.etis3-modern .span3, html.etis3-modern .span3:hover {\n\t\tbottom: max(1rem, env(safe-area-inset-bottom)) !important;\n\t\tleft: max(1rem, env(safe-area-inset-left)) !important; right: max(1rem, env(safe-area-inset-right)) !important;\n\t\theight: 6.4rem !important; border-radius: 2.2rem !important;\n\t\tbackground: var(--glass-sheen, none), var(--glass-bg-active) !important;\n\t\ttransition: height 0.35s cubic-bezier(.2,.8,.2,1), border-radius 0.35s !important;\n\t}\n\thtml.etis3-modern .span3 .etis3-more-li { display: block !important; }\n\thtml.etis3-modern .span3 > .etis3-main-nav > li > a { padding: 1rem 1.2rem !important; justify-content: center !important; min-height: 5.2rem !important; }\n\thtml.etis3-modern .span3 > .etis3-main-nav > li > a > .material-icons { font-size: 2.4rem !important; width: 2.4rem !important; }\n\thtml.etis3-modern .span3 .etis3-main-nav > li.etis3-home-li ~ li[data-group=\"main\"]:nth-of-type(n+6):not(.etis3-more-li) { display: none !important; }\n\n\t/* Лист «Ещё»: вся навигация снизу */\n\thtml.etis3-modern.etis3-sheet-open .span3, html.etis3-modern.etis3-sheet-open .span3:hover {\n\t\ttop: auto !important; height: min(78vh, 64rem) !important; display: block !important; overflow-y: auto !important;\n\t\tpadding: 1.2rem 1rem calc(1rem + env(safe-area-inset-bottom)) !important; border-radius: 2.6rem !important; z-index: 90 !important;\n\t}\n\thtml.etis3-modern.etis3-sheet-open .span3 > .nav.nav-tabs.nav-stacked:not(.etis3-quickbar) { display: block !important; width: 100% !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-main-nav > li { display: block !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-main-nav > li.etis3-nav-closed { display: none !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-nav-label,\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-nav-head__chevron,\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-nav-count,\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-nav-head__count { display: inline !important; opacity: 1 !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3 > .nav.nav-tabs.nav-stacked > li > a { justify-content: flex-start !important; padding: 1rem 1.4rem !important; min-height: 4.8rem !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3 .etis3-more-li { display: none !important; }\n\thtml.etis3-modern.etis3-sheet-open .span3::before {\n\t\tcontent: ''; display: block; width: 4.4rem; height: 0.5rem; margin: 0 auto 1rem; border-radius: 1rem;\n\t\tbackground: rgba(127,127,127,0.35);\n\t}\n\thtml.etis3-modern.etis3-sheet-open #etis3-sheet-backdrop {\n\t\tdisplay: block !important; position: fixed; inset: 0; z-index: 85;\n\t\tbackground: rgba(0,0,0,0.35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);\n\t}\n\n\t/* Страницы */\n\t.esw-grid { grid-template-columns: 1fr 1fr !important; }\n\t.esw-header { flex-wrap: wrap; }\n\t.esw-goal { margin-left: 0 !important; }\n\t.sv-card { padding: 1.6rem 1.4rem 1rem; }\n\t.sv-score b { font-size: 2.6rem; }\n\t.sv-kt-date { display: none; }\n\thtml.etis3-modern .etis3-msg .message-header { flex-wrap: wrap !important; }\n\thtml.etis3-modern .etis3-msg .message-header > .secondary-info { flex-basis: 100% !important; text-align: left !important; align-items: flex-start !important; }\n\t.tv-card { gap: 1.2rem; padding: 1.4rem; }\n\t.tv-photo { width: 7.2rem; height: 9.4rem; }\n\t.tv-photo span { font-size: 2.4rem; }\n\t.hm-pair, .hm-gap { grid-template-columns: 4.8rem 2rem minmax(0, 1fr); }\n\t.hm-pair-meta { gap: 0.3rem 1rem; }\n\t.span9 .submenu { display: flex !important; flex-wrap: nowrap !important; overflow-x: auto !important; scrollbar-width: none; margin-right: -1.2rem !important; padding-right: 1.2rem !important; }\n\t.span9 .submenu::-webkit-scrollbar { display: none; }\n\t.span9 .submenu-item { flex: none !important; }\n\t.timetable-buttonbar { justify-content: flex-start !important; }\n\t.etis3-view-switch { margin-right: 0 !important; }\n\tinput, select, textarea { font-size: 16px !important; } /* iOS не зумит поле при фокусе */\n}\n@media (max-width: 900px) {\n\thtml.etis3-modern .span3 > .nav.nav-tabs.nav-stacked.etis3-main-nav { width: 100% !important; justify-content: space-around !important; }\n}\n\n/* Заголовок «Вход» внутри формы: на нашей сцене он лишний — есть герой */\nhtml.etis3-login-page .login-form-title { display: none !important; }\nhtml.etis3-login-page form .item > label { pointer-events: none; }\n\n\n/* ============================================================\n   НЕДЕЛИ И «КАК ПРИЛОЖЕНИЕ» (4.6)\n   ============================================================ */\n\n.ttw {\n\tdisplay: flex; align-items: center; gap: 1rem;\n\tmargin-bottom: 1.6rem; padding: 0.8rem;\n\tborder-radius: 2rem;\n\tbackground: var(--glass-bg-card);\n\tbackdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter);\n\tborder: var(--glass-border); box-shadow: var(--glass-shadow-card);\n}\n.span9.etis3-tt-grid .ttw { display: flex !important; }\n.ttw-arrow {\n\tflex: none; width: 4.4rem; height: 4.4rem; display: grid; place-items: center;\n\tborder-radius: 1.4rem; color: var(--color-text-primary) !important; text-decoration: none !important;\n\tbackground: rgba(127,127,127,0.10); transition: background 0.2s, transform 0.15s;\n}\n.ttw-arrow:hover { background: rgba(var(--color-accent-rgb, 124,111,212), 0.16); }\n.ttw-arrow:active { transform: scale(0.94); }\n.ttw-arrow .material-icons { font-size: 2.6rem; }\n.ttw-arrow--off { opacity: 0.3; pointer-events: none; }\n.ttw-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; line-height: 1.25; text-align: center; }\n.ttw-mid b { font-size: 1.6rem; font-weight: 700; color: var(--color-text-primary); }\n.ttw-mid > span { font-size: 1.2rem; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }\n.ttw-now { margin-left: 0.4rem; padding: 0.1rem 0.7rem; border-radius: 10rem; font-size: 1.05rem; font-weight: 700; color: var(--color-accent); background: rgba(var(--color-accent-rgb, 124,111,212), 0.14); vertical-align: 0.15em; }\n.ttw-today {\n\tflex: none; padding: 0.8rem 1.4rem; border-radius: 1.2rem;\n\tfont-size: 1.3rem; font-weight: 600; color: #fff !important; text-decoration: none !important;\n\tbackground: var(--color-accent); box-shadow: 0 4px 14px rgba(var(--color-accent-rgb, 124,111,212), 0.4);\n}\n/* Родной блок недель в новом виде прячем на телефоне — есть стрелки и свайпы */\n@media (max-width: 900px) {\n\thtml.etis3-modern .span9 .week-select { display: none !important; }\n\thtml.etis3-modern .span9 > div[style*=\"float: right\"], html.etis3-modern .span9 > a[href*=\"schedule_detail\"] { float: none !important; display: inline-block !important; margin: 0 1.2rem 1rem 0 !important; }\n\t.ttv, .etis3-week-grid { will-change: transform; }\n}\n/* Запуск с экрана «Домой» (iPhone): строка состояния поверх — отступ сверху всегда */\nhtml.etis3-standalone.etis3-modern #etis3-topbar { top: max(1rem, env(safe-area-inset-top)) !important; }\n\n\n/* ============================================================\n   ЗАМЕТКИ И ДЗ К ПАРАМ (4.7)\n   ============================================================ */\n\n.hm-pair[data-key] { cursor: pointer; }\n.hm-pair[data-key] .hm-pair-body { transition: transform 0.15s, box-shadow 0.2s, background 0.2s; }\n.hm-pair[data-key]:hover .hm-pair-body { box-shadow: 0 6px 20px var(--dis-soft); }\n.hm-pair[data-key]:active .hm-pair-body { transform: scale(0.985); }\n.hm-pair[data-key]:focus-visible { outline: none; }\n.hm-pair[data-key]:focus-visible .hm-pair-body { box-shadow: 0 0 0 2px var(--color-accent); }\n.hm-pair-note {\n\tdisplay: flex; align-items: flex-start; gap: 0.6rem;\n\tmargin-top: 0.8rem; padding: 0.6rem 0.9rem; border-radius: 1rem;\n\tfont-size: 1.25rem; line-height: 1.4; color: var(--color-text-primary);\n\tbackground: rgba(var(--orb-d, 255,170,80), 0.14); border: 1px solid rgba(var(--orb-d, 255,170,80), 0.28);\n}\n.hm-pair-note span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }\n.hm-pair-note .material-icons { flex: none; font-size: 1.6rem; color: rgb(var(--orb-d, 255,170,80)); }\n.hm-pair-note--done { background: rgba(52,199,89,0.10); border-color: rgba(52,199,89,0.25); color: var(--color-text-secondary); }\n.hm-pair-note--done span:last-child { text-decoration: line-through; }\n.hm-pair-note--done .material-icons { color: var(--color-green); }\n\n/* Главная: блок заметок справа под рейтингом */\n#etis3-home { grid-auto-flow: row dense; }\n.hm-tasks { grid-column: span 7; }\n/* Много пар — «Сегодня» на две строки, заметки справа; мало — рейтинг на две строки, заметки под «Сегодня» */\n#etis3-home:has(.hm-today--tall) .hm-today { grid-row: span 2; }\n#etis3-home:has(.hm-today--tall) .hm-tasks { grid-column: span 5; }\n#etis3-home:not(:has(.hm-today--tall)) .hm-grades { grid-row: span 2; }\n@media (max-width: 1250px) { #etis3-home .hm-today, #etis3-home .hm-grades { grid-row: auto !important; } #etis3-home .hm-tasks { grid-column: span 12 !important; } }\n.hm-task { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.4rem; border-radius: 1.4rem; transition: background 0.15s; }\n.hm-task:hover { background: rgba(127,127,127,0.07); }\n.hm-task-check {\n\tflex: none; width: 3.6rem; height: 3.6rem; display: grid; place-items: center;\n\tpadding: 0 !important; border: 0 !important; background: transparent !important; cursor: pointer;\n\tcolor: var(--dis-color) !important;\n}\n.hm-task-check .material-icons { font-size: 2.4rem; transition: transform 0.2s; }\n.hm-task-check:active .material-icons { transform: scale(0.85); }\n.hm-task-body { flex: 1; min-width: 0; padding: 0.5rem 0.4rem; cursor: pointer; }\n.hm-task-text { font-size: 1.4rem; font-weight: 500; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.hm-task-meta { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.3rem; font-size: 1.15rem; color: var(--color-text-secondary); min-width: 0; }\n.hm-task-meta i { flex: none; width: 0.7rem; height: 0.7rem; border-radius: 50%; background: var(--dis-color); }\n.hm-task-meta span { margin-left: auto; flex: none; color: var(--color-text-tertiary); }\n.hm-task--done .hm-task-text { text-decoration: line-through; color: var(--color-text-tertiary); }\n.hm-task--late .hm-task-meta span { color: var(--color-red); font-weight: 600; }\n.hm-tasks-empty { align-items: flex-start; line-height: 1.5; }\n.hm-tasks-empty .material-icons { color: var(--color-accent); font-size: 2.2rem; flex: none; }\n\n/* ---------- Карточка пары ---------- */\n#etis3-pair-sheet {\n\tposition: fixed; inset: 0; z-index: 10002;\n\tdisplay: flex; align-items: center; justify-content: center; padding: 2rem;\n\tbackground: rgba(0,0,0,0.32);\n\tbackdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);\n\topacity: 0; transition: opacity 0.25s ease;\n\tcolor: var(--color-text-primary); font-size: 1.4rem;\n}\n#etis3-pair-sheet.show { opacity: 1; }\n.ps-box {\n\tposition: relative; width: min(48rem, 100%);\n\tpadding: 1.6rem 2.2rem 2.2rem; border-radius: 2.8rem;\n\tbackground: var(--glass-bg-active);\n\tbackdrop-filter: blur(44px) saturate(200%); -webkit-backdrop-filter: blur(44px) saturate(200%);\n\tborder: var(--glass-border-light);\n\tbox-shadow: 0 40px 100px rgba(0,0,0,0.4), var(--glass-border-inner);\n\ttransform: translateY(16px) scale(0.97); transition: transform 0.35s cubic-bezier(.2,.8,.2,1);\n\toverflow: hidden;\n}\n.ps-box::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 12rem; background: linear-gradient(180deg, var(--dis-soft), transparent); pointer-events: none; }\n.ps-box > * { position: relative; }\n#etis3-pair-sheet.show .ps-box { transform: none; }\n.ps-grab { width: 4.4rem; height: 0.5rem; margin: 0 auto 1.2rem; border-radius: 1rem; background: rgba(127,127,127,0.35); }\n.ps-head { display: flex; align-items: flex-start; gap: 1.2rem; }\n.ps-dot { flex: none; margin-top: 0.7rem; width: 1.2rem; height: 1.2rem; border-radius: 50%; background: var(--dis-color); box-shadow: 0 0 0 4px var(--dis-soft); }\n.ps-title { flex: 1; min-width: 0; }\n.ps-title h3 { margin: 0 !important; padding: 0 !important; font-size: 2rem !important; font-weight: 800 !important; line-height: 1.25 !important; letter-spacing: -0.02em !important; color: var(--color-text-primary) !important; border: 0 !important; background: none !important; }\n.ps-title h3::before { display: none !important; }\n.ps-type { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; padding: 0.2rem 0.9rem; border-radius: 10rem; font-size: 1.2rem; font-weight: 600; color: var(--dis-color); background: var(--dis-soft); }\n.ps-type .material-icons { font-size: 1.5rem; }\n.ps-close {\n\tflex: none; width: 3.6rem; height: 3.6rem; display: grid; place-items: center;\n\tpadding: 0 !important; border: 0 !important; border-radius: 50% !important; cursor: pointer;\n\tbackground: rgba(127,127,127,0.14) !important; color: var(--color-text-secondary) !important;\n}\n.ps-close .material-icons { font-size: 2rem; }\n.ps-rows { display: flex; flex-direction: column; gap: 0.8rem; margin: 1.8rem 0; }\n.ps-rows > div { display: flex; align-items: center; gap: 1.2rem; font-size: 1.4rem; }\n.ps-rows > div:first-child::first-letter { text-transform: uppercase; }\n.ps-rows .material-icons { font-size: 1.9rem; color: var(--color-text-tertiary); }\n.ps-label { display: block; margin-bottom: 0.6rem; font-size: 1.15rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--color-text-tertiary); }\n#etis3-pair-sheet textarea {\n\twidth: 100% !important; min-height: 10rem; resize: vertical;\n\tpadding: 1.2rem 1.4rem !important; border-radius: 1.6rem !important;\n\tfont: inherit !important; font-size: 1.5rem !important; line-height: 1.5 !important;\n\tcolor: var(--color-text-primary) !important;\n\tbackground: var(--glass-bg-input) !important; border: var(--glass-border) !important; box-shadow: none !important;\n}\n#etis3-pair-sheet textarea:focus { outline: none !important; border-color: var(--dis-color) !important; box-shadow: 0 0 0 3px var(--dis-soft) !important; }\n.ps-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.4rem; }\n.ps-done { display: inline-flex; align-items: center; gap: 0.9rem; cursor: pointer; font-size: 1.45rem; font-weight: 500; user-select: none; }\n.ps-done input { position: absolute; opacity: 0; pointer-events: none; }\n.ps-check { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; border-radius: 0.8rem; border: 2px solid rgba(127,127,127,0.45); transition: all 0.2s; }\n.ps-check .material-icons { font-size: 1.8rem; color: #fff; opacity: 0; transform: scale(0.5); transition: all 0.2s; }\n.ps-done input:checked + .ps-check { background: var(--color-green); border-color: var(--color-green); }\n.ps-done input:checked + .ps-check .material-icons { opacity: 1; transform: none; }\n.ps-copy {\n\tdisplay: inline-flex; align-items: center; gap: 0.6rem;\n\tpadding: 0.9rem 1.4rem !important; border-radius: 1.3rem !important; cursor: pointer;\n\tfont: inherit !important; font-size: 1.3rem !important; font-weight: 600 !important;\n\tcolor: var(--color-text-primary) !important; background: rgba(127,127,127,0.12) !important; border: 0 !important;\n}\n.ps-copy .material-icons { font-size: 1.7rem; }\n@media (max-width: 760px) {\n\t#etis3-pair-sheet { align-items: flex-end; padding: 0; }\n\t.ps-box {\n\t\twidth: 100%; border-radius: 2.8rem 2.8rem 0 0;\n\t\tpadding-bottom: calc(2rem + env(safe-area-inset-bottom));\n\t\ttransform: translateY(100%);\n\t}\n}\n@media (min-width: 761px) { .ps-grab { display: none; } }\n.hm-task-check { box-shadow: none !important; outline: none; border-radius: 50% !important; min-width: 0 !important; }\n.hm-task-check:focus-visible { box-shadow: 0 0 0 2px var(--color-accent) !important; }\n";
		(document.head || document.documentElement).appendChild(style);
	})();

	// ---------- settings.js ----------
/* ============================================================
   ЕТИС 3.0 — общие настройки (content script + попап)
   ============================================================ */

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
	layout:    'modern', // modern — рельс + верхняя панель, classic — сайдбар
	aurora:    true,     // живой фон-аврора на всех страницах
	sky:       true,     // цвета фона по времени суток
	notify:    true,     // фоновая проверка новых оценок / сообщений
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
	if (['modern', 'classic'].includes(raw.layout)) s.layout = raw.layout;
	['highlight', 'widget', 'pairTypes', 'scoreDots', 'compact', 'aurora', 'sky', 'notify'].forEach(k => {
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

	// ---------- scripts.js ----------
/* ============================================================
   ЕТИС 3.0 by Комар
   ============================================================ */

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
	applySky();
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
	applyAccent(settings.accent);
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
}
ensureViewport();
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

	const allLinks = sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked:not(.etis3-quickbar) > li:not(.etis3-nav-head)');
	input.addEventListener('input', () => {
		const q = input.value.trim().toLowerCase();
		// Во время поиска свёрнутые группы раскрываются, заголовки групп прячутся
		sidebar.classList.toggle('etis3-searching', !!q);
		allLinks.forEach(li => {
			const match = !q || li.textContent.trim().toLowerCase().includes(q);
			li.classList.toggle('etis3-nav-miss', !match);
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
			const name = iconMap[navKey(a)];
			if (name) a.prepend(createEl('span', { className: 'material-icons', textContent: name }));
		});
	}

	sidebar.querySelectorAll('li').forEach(li => {
		const a    = li.querySelector('a');
		const href = a ? navKey(a) : '';
		if (href === 'stu_plus.add_snils' || href === 'ebl_stu.ebl_choice' || li.classList.contains('warn_menu'))
			a.appendChild(createEl('span', { className: 'badge-point' }));
	});

	groupSidebarNav(sidebar);
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

		// Нижний блок (тема, пароль, email, выход, настройки) — строка иконок с подсказками
		lastNav.classList.add('etis3-quickbar');
		lastNav.querySelectorAll('li > a').forEach(link => {
			link.title = [...link.childNodes].filter(n => !n.classList?.contains('material-icons'))
				.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
		});
	}

	// Подпись ЕТИС 3.0 by Комар внизу сайдбара
	const branding = createEl('div', { className: 'etis3-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	sidebar.appendChild(branding);
}


// ============================================================
// ГРУППЫ В САЙДБАРЕ
// ============================================================

// Ключ пункта меню: имя страницы (+ режим для учебного плана)
const NAV_ITEMS = {
	'stu.timetable':                ['main',  'event'],
	'stu.signs':                    ['main',  'grade'],
	'stu.teacher_notes':            ['main',  'forum'],
	'stu_ann.announces':            ['main',  'campaign'],
	'stu.teach_plan':               ['study', 'menu_book'],
	'stu.teach_plan?choose_dis':    ['study', 'playlist_add_check'],
	'ebl_stu.ebl_choice':           ['study', 'how_to_vote'],
	'stu.fcl_choice':               ['study', 'extension'],
	'stu.absence':                  ['study', 'event_busy'],
	'stu_jour.group_tt':            ['study', 'fact_check'],
	'stu.ses':                      ['study', 'verified'],
	'stu.teachers':                 ['study', 'school'],
	'est_pkg.show_list':            ['study', 'rate_review'],
	'stu.orders':                   ['docs',  'gavel'],
	'cert_pkg.stu_certif':          ['docs',  'assignment'],
	'stu_pay.contract_list':        ['docs',  'receipt_long'],
	'stu_plus.blank_forms':         ['docs',  'file_copy'],
	'stu.sc_portfolio':             ['docs',  'emoji_events'],
	'stu.library':                  ['res',   'local_library'],
	'stu.electr':                   ['res',   'cloud'],
	'stu_plus.advice':              ['res',   'lightbulb'],
	'stu.about':                    ['res',   'info'],
};

const NAV_GROUPS = [
	['study', 'Учёба',     'school'],
	['docs',  'Документы', 'folder'],
	['res',   'Ресурсы',   'auto_stories'],
];

function navKey(a) {
	try {
		const u = new URL(a.href, location.href);
		const mode = u.searchParams.get('p_mode');
		const page = u.pathname.split('/').pop();
		return mode && NAV_ITEMS[`${page}?${mode}`] ? `${page}?${mode}` : page;
	} catch (e) { return ''; }
}

function readOpenGroups() {
	try { return JSON.parse(localStorage.getItem('etis3-nav-open')) || []; } catch (e) { return []; }
}

function groupSidebarNav(sidebar) {
	const nav = [...sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked')]
		.find(ul => ul.querySelector('a[href*="stu.timetable"]'));
	if (!nav) return;
	nav.classList.add('etis3-main-nav');

	const buckets = { main: [], study: [], docs: [], res: [] };
	[...nav.children].forEach(li => {
		const a = li.querySelector('a');
		if (!a) return;
		const [group, icon] = NAV_ITEMS[navKey(a)] || ['res', 'chevron_right'];
		decorateNavLink(a, icon);
		li.dataset.group = group;
		buckets[group].push(li);
	});

	// Главное — сверху всегда, в заданном порядке
	const mainOrder = Object.keys(NAV_ITEMS).filter(k => NAV_ITEMS[k][0] === 'main');
	buckets.main.sort((x, y) => mainOrder.indexOf(navKey(x.querySelector('a'))) - mainOrder.indexOf(navKey(y.querySelector('a'))));
	buckets.main.forEach(li => nav.appendChild(li));

	const open = readOpenGroups();
	NAV_GROUPS.forEach(([key, title, icon]) => {
		const items = buckets[key];
		if (!items.length) return;
		const hasActive = items.some(li => li.classList.contains('active'));
		const isOpen = hasActive || open.includes(key);

		const head = createEl('li', { className: 'etis3-nav-head' });
		const btn  = createEl('a', { className: 'etis3-nav-head__btn' });
		btn.innerHTML = `<span class="material-icons">${icon}</span><span class="etis3-nav-label">${title}</span><span class="etis3-nav-head__count">${items.length}</span><span class="material-icons etis3-nav-head__chevron">expand_more</span>`;
		head.appendChild(btn);
		head.classList.toggle('etis3-nav-head--open', isOpen);
		nav.appendChild(head);
		items.forEach(li => { li.classList.toggle('etis3-nav-closed', !isOpen); nav.appendChild(li); });

		btn.addEventListener('click', e => {
			e.preventDefault();
			const nowOpen = !head.classList.contains('etis3-nav-head--open');
			head.classList.toggle('etis3-nav-head--open', nowOpen);
			items.forEach(li => li.classList.toggle('etis3-nav-closed', !nowOpen));
			const state = new Set(readOpenGroups());
			nowOpen ? state.add(key) : state.delete(key);
			try { localStorage.setItem('etis3-nav-open', JSON.stringify([...state])); } catch (err) {}
		});
	});
}

// Иконка слева, подпись по центру, счётчик «(3)» — бейджем справа
function decorateNavLink(a, icon) {
	const point = a.querySelector('.badge-point');
	const label = createEl('span', { className: 'etis3-nav-label' });
	[...a.childNodes].forEach(n => { if (n !== point) label.appendChild(n); });

	const last = label.lastChild;
	if (last && last.nodeType === Node.TEXT_NODE) {
		const m = last.textContent.match(/\s*\(([\d/]+)\)\s*$/);
		if (m) {
			last.textContent = last.textContent.slice(0, m.index);
			const count = createEl('span', { className: 'etis3-nav-count', textContent: m[1] });
			if (!/[1-9]/.test(m[1])) count.classList.add('etis3-nav-count--zero');
			a.append(createEl('span', { className: 'material-icons', textContent: icon }), label, count);
			if (point) a.appendChild(point);
			return;
		}
	}
	a.append(createEl('span', { className: 'material-icons', textContent: icon }), label);
	if (point) a.appendChild(point);
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
	// Страница входа: форма с паролем и без меню кабинета
	const login = document.querySelector('div.login form') && document.querySelector('input[type="password"], #sbmt') && !document.querySelector('div.span3')
		|| document.querySelector('body > div.login');

	if (login) { styleLoginPage(page); return; }

	const sidebar = document.querySelector('div.span3');
	if (sidebar) {
		styleSidebar(sidebar);
		buildAurora(document.body, 'aurora--page');
		buildTopbar(sidebar);
		initCommandPalette(sidebar);
		greetAfterLogin();
		showWhatsNew();
	}

	const span9    = document.querySelector('div.span9');
	const pageMode = new URLSearchParams(window.location.search).get('p_mode');

	const warning = document.querySelector('div.warning');
	if (warning && span9) span9.prepend(warning);

	animatePageIn();

	// Открыл страницу — фоновый счётчик по ней обнуляется
	const seenKinds = { 'stu.teacher_notes': ['notes'], 'stu_ann.announces': ['ann'], 'stu.announce': ['ann'] }[page]
		|| (page === 'stu.signs' && pageMode === 'current' && !/p_term=/.test(location.search) ? ['grades'] : null);
	if (seenKinds) { try { chrome.runtime.sendMessage({ type: 'etis3-seen', kinds: seenKinds }).catch?.(() => {}); } catch (e) {} }

	switch (page) {
		case 'stu.teach_plan':             stylePage_teachPlan(span9, pageMode); if (!pageMode) buildPlanView(span9); break;
		case 'stu.tpr':                    stylePage_tpr(span9);                  break;
		case 'stu.teachers':               stylePage_teachers(span9); buildTeachersView(span9); break;
		case 'stu.absence':                buildAbsenceView(span9);               break;
		case 'stu.sc_portfolio':           stylePage_portfolio(span9);            break;
		case 'stu.timetable':              stylePage_timetable(span9);            break;
		case 'stu.change_pass_form':
		case 'stu.change_pass':            stylePage_changePass(span9);           break;
		case 'stu_email_pkg.change_email': stylePage_changeEmail(span9);          break;
		case 'stu.announce':
		case 'stu_ann.announces':          stylePage_announce();                   break;
		case 'stu.teacher_notes':          stylePage_teacherNotes();              break;
		case 'cert_pkg.stu_certif':        stylePage_certif(span9);               break;
		case 'stu.signs':                  stylePage_signs(span9, pageMode); if (!pageMode || pageMode === 'session') buildSessionView(span9); break;
		case 'stu.electr':                 stylePage_electr(span9);               break;
	}
}


// ============================================================
// ЛОГИН
// ============================================================

function styleLoginPage(page) {
	document.body.innerHTML = '<div class="login-container">' + document.body.innerHTML + '</div>';
	const loginContainer = document.querySelector('div.login-container');
	// Разметка входа бывает разной (десктоп / мобильная / восстановление) — ищем по смыслу
	const form = document.querySelector('.login form') || document.querySelector('input[type="password"]')?.form || document.querySelector('form');
	if (!form) return;
	if (!form.id) form.id = 'form';
	let loginItems = form.querySelector(':scope > div.items') || form.querySelector('div.items');
	if (!loginItems) {
		// Нет привычной обёртки полей — создаём, стили рассчитаны на form > .items > .item
		loginItems = createEl('div', { className: 'items' });
		const firstField = form.querySelector('input:not([type="hidden"])');
		firstField ? firstField.before(loginItems) : form.appendChild(loginItems);
	}
	const loginActions = createEl('div', { className: 'login-actions' });
	loginItems.appendChild(loginActions);
	const recovery = page === 'stu_email_pkg.send_r_email';

	form.querySelectorAll(':scope > h1, :scope > h2, :scope > h3').forEach(h => h.classList.add('login-form-title'));
	if (!recovery) {
		document.querySelector('div.choose')?.remove();
		form.prepend(createEl('div', { className: 'psu-logo' }));
		const forgot = [...form.querySelectorAll('a')].find(a => /забыл|восстанов|send_r_email/i.test(a.textContent + a.href));
		if (forgot) { forgot.className = 'forgot-password'; loginActions.appendChild(forgot); }
	}
	const btn = form.querySelector('#sbmt') || form.querySelector('button, input[type="submit"]');
	if (btn) { btn.id = btn.id || 'sbmt'; loginActions.appendChild(btn); }

	// Поля: обёртка .item, подпись после поля (плавающий label), placeholder для :placeholder-shown
	form.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input:not([type])').forEach(inp => {
		let item = inp.closest('div.item');
		if (!item || !form.contains(item)) {
			item = createEl('div', { className: 'item' });
			inp.before(item);
			item.appendChild(inp);
		}
		const lbl = (inp.id && form.querySelector(`label[for="${inp.id}"]`)) || item.querySelector('label');
		if (lbl) {
			item.appendChild(lbl);
		} else if (inp.placeholder && inp.placeholder.trim()) {
			item.appendChild(createEl('label', { textContent: inp.placeholder.trim(), for: inp.id || '' }));
		}
		inp.placeholder = ' ';
		if (item.parentElement !== loginItems) loginItems.insertBefore(item, loginActions);
	});
	form.querySelectorAll('div.item').forEach(item => {
		const err = item.querySelector('div.error_message');
		if (err) { loginContainer.prepend(err); item.remove(); }
	});

	if (!recovery) {
		const infoStr = (loginItems.textContent.match(/По всем вопросам[^\n]*/) || [''])[0].trim();
		const footer  = document.querySelector('div.header_message');
		if (footer) {
			footer.className = 'footer';
			footer.innerHTML = '<p>' + footer.innerHTML + '</p>' + (infoStr ? '<p>' + escapeHtml(infoStr) + '</p>' : '');
			loginContainer.appendChild(footer);
		}
		// Текст «По всем вопросам…» внутри формы больше не нужен — он в подвале
		[...loginItems.childNodes].forEach(n => { if (n.nodeType === 3 && /По всем вопросам/.test(n.textContent)) n.remove(); });
	}

	// Бренд на странице входа
	const brand = createEl('div', { className: 'login-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	loginContainer.appendChild(brand);

	buildLoginScene(loginContainer, page);

	// Анимированный фон — частицы
	initLoginParticles(loginContainer);
}

// ---------- Сцена входа: аврора, приветствие, живая карточка ----------

function loginGreeting(h) {
	if (h >= 5 && h < 12)  return 'Доброе утро';
	if (h >= 12 && h < 17) return 'Добрый день';
	if (h >= 17 && h < 23) return 'Добрый вечер';
	return 'Доброй ночи';
}

function buildLoginScene(container, page) {
	const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const login   = container.querySelector('.login');
	const form    = container.querySelector('.login form, .login #form');
	if (!login || !form) return;
	document.documentElement.classList.add('etis3-login-page');

	// Аврора: большие размытые пятна света за стеклом
	const aurora = buildAurora(container, 'aurora--login');

	// Герой: приветствие, большое название и живые часы
	const recovery = page === 'stu_email_pkg.send_r_email';
	const hero = createEl('div', { className: 'login-hero' });
	hero.innerHTML = `
		<div class="lh-greeting">${recovery ? 'Восстановим доступ' : loginGreeting(new Date().getHours())}</div>
		<h1 class="lh-title" aria-label="ЕТИС 3.0">${[...'ЕТИС'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}<sup>3.0</sup></h1>
		<div class="lh-sub">Личный кабинет студента ПГНИУ</div>
		<div class="lh-clock"><span class="lh-time"></span><span class="lh-date"></span></div>
	`;
	const stage = createEl('div', { className: 'login-stage' });
	login.before(stage);
	stage.append(hero, login);

	const timeEl = hero.querySelector('.lh-time'), dateEl = hero.querySelector('.lh-date');
	const tick = () => {
		const d = new Date();
		timeEl.textContent = formatTime(d.getHours(), d.getMinutes());
		dateEl.textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
	};
	tick();
	setInterval(tick, 10 * 1000);

	// Пароль: показать / скрыть и предупреждение о Caps Lock
	const pass = form.querySelector('input[type="password"]');
	if (pass) {
		const item = pass.closest('.item');
		const eye  = createEl('button', { type: 'button', className: 'login-eye', title: 'Показать пароль', 'aria-label': 'Показать пароль' });
		eye.innerHTML = '<span class="material-icons">visibility</span>';
		eye.addEventListener('click', () => {
			const show = pass.type === 'password';
			pass.type = show ? 'text' : 'password';
			eye.firstChild.textContent = show ? 'visibility_off' : 'visibility';
			eye.title = show ? 'Скрыть пароль' : 'Показать пароль';
			pass.focus();
		});
		const caps = createEl('div', { className: 'login-caps', textContent: 'Включён Caps Lock' });
		item?.append(eye, caps);
		const checkCaps = e => { if (e.getModifierState) caps.classList.toggle('show', e.getModifierState('CapsLock')); };
		pass.addEventListener('keydown', checkCaps);
		pass.addEventListener('keyup', checkCaps);
		pass.addEventListener('blur', () => caps.classList.remove('show'));
	}

	// Кнопка: состояние «входим…». Сабмит не трогаем — его делает скрипт ЕТИСа.
	const btn = form.querySelector('#sbmt');
	if (btn) btn.addEventListener('click', () => {
		const filled = [...form.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]')].every(i => i.value.trim());
		if (!filled) return;
		btn.classList.add('is-loading');
		container.classList.add('etis3-leaving');
		try { sessionStorage.setItem('etis3-just-logged', '1'); } catch (e) {}
		setTimeout(() => { btn.classList.remove('is-loading'); container.classList.remove('etis3-leaving'); }, 8000);
	});

	// Ошибка входа — карточка «встряхивается»
	if (container.querySelector(':scope > .error_message')) form.classList.add('login-shake');

	// Фокус сразу в первое пустое поле
	setTimeout(() => form.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true }), reduced ? 0 : 900);

	if (reduced) return;

	// Карточка следит за курсором: лёгкий 3D-наклон и блик там, где мышь.
	// Аврора чуть смещается — эффект глубины.
	let raf = 0, mx = 0.5, my = 0.5, gx = 0, gy = 0;
	const apply = () => {
		raf = 0;
		const r = form.getBoundingClientRect();
		const lx = (mx * innerWidth - r.left) / r.width, ly = (my * innerHeight - r.top) / r.height;
		const inside = lx > -0.15 && lx < 1.15 && ly > -0.15 && ly < 1.15;
		form.style.setProperty('--mx', (lx * 100).toFixed(1) + '%');
		form.style.setProperty('--my', (ly * 100).toFixed(1) + '%');
		form.style.setProperty('--ry', inside ? ((lx - 0.5) * 7).toFixed(2) + 'deg' : '0deg');
		form.style.setProperty('--rx', inside ? ((0.5 - ly) * 6).toFixed(2) + 'deg' : '0deg');
		form.classList.toggle('is-hover', inside);
		aurora.style.setProperty('--px', gx.toFixed(3));
		aurora.style.setProperty('--py', gy.toFixed(3));
	};
	window.addEventListener('mousemove', e => {
		mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
		gx = mx - 0.5; gy = my - 0.5;
		if (!raf) raf = requestAnimationFrame(apply);
	});
	document.addEventListener('mouseleave', () => { mx = my = -1; gx = gy = 0; if (!raf) raf = requestAnimationFrame(apply); });
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
	setInterval(refresh, 60 * 1000);

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
					teacher: row.querySelector('.pair_teacher a')?.textContent.trim() || '',
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
	const now = new Date();
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
	markFeedSeen('ann');
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
	let seenBefore = 0;
	try { seenBefore = (JSON.parse(localStorage.getItem(SEEN_FEED_KEY)) || {}).notes || 0; } catch (e) {}
	const firstPage = !/p_page=([2-9]|\d\d)|p_dis=\d/.test(location.search);
	decorateMessages(seenBefore);
	if (firstPage) markFeedSeen('notes');
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
	const disciplines = [...span9.querySelectorAll('table.common')].map(parseSignsTable).filter(Boolean);
	const fresh = markNewGrades(disciplines);
	buildSignsStats(span9, disciplines, fresh);
	disciplines.forEach(styleSignsTable);
	buildSignsCards(span9, disciplines);
	updateGoalHints(disciplines);

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
			if (!/(^|\/)stu\.theme$/.test((a.getAttribute('href') || '').split('?')[0])) return;
			a.setAttribute('data-tooltip', a.innerText);
			a.innerHTML = 'КТ ' + (++idx);
			a.addEventListener('mouseover', renderTooltip);
			a.parentNode.addEventListener('mouseover', renderTooltip);
			a.parentNode.addEventListener('mouseout', removeTooltip);
		});
	});
}

// Таблица оценок ПГНИУ: Тема | Вид работы | Вид контроля | Оценка | Проходной балл |
// Балл в рейтинг (текущий, максимальный) | Дата | Преподаватель. Оценки не по 10-балльной
// шкале: КТ сдана, если оценка не ниже проходного балла.
function parseSignsTable(table) {
	const rows = [...table.querySelectorAll('tr')];
	const head = rows[0];
	if (!head) return null;

	const col = {};
	let pos = 0;
	head.querySelectorAll('th, td').forEach(cell => {
		const name = cell.textContent.trim().toLowerCase();
		if (name.startsWith('оценка'))         col.grade = pos;
		else if (name.startsWith('проходной')) col.pass = pos;
		else if (name.startsWith('балл в рейтинг')) { col.cur = pos; col.max = pos + 1; }
		else if (name.startsWith('дата'))      col.date = pos;
		else if (name.startsWith('вид работы')) col.work = pos;
		else if (name.startsWith('вид контроля')) col.ctrl = pos;
		pos += cell.colSpan || 1;
	});
	if (col.grade === undefined || col.pass === undefined) return null;

	const num = td => {
		if (!td) return null;
		const t = [...td.childNodes].filter(n => !n.classList?.contains('score-dot')).map(n => n.textContent).join('').trim();
		if (!t || !/^-?\d+([.,]\d+)?$/.test(t)) return null;
		return parseFloat(t.replace(',', '.'));
	};

	const kts = [];
	let total = null;
	rows.forEach(tr => {
		const cells = [...tr.children];
		if (cells.some(c => c.tagName === 'TH')) return;
		if (/^(итого|всего)\s*:?$/i.test(cells[0]?.textContent.trim() || '')) {
			total = { cur: num(cells[1]), max: num(cells[2]) };
			return;
		}
		if (cells.length < pos) return;
		const grade = num(cells[col.grade]);
		const pass  = num(cells[col.pass]);
		const status = grade === null ? 'pending' : (pass === null || grade >= pass ? 'passed' : 'failed');
		kts.push({ row: tr, gradeCell: cells[col.grade], grade, pass, status,
			topic: cells[0]?.textContent.replace(/\s+/g, ' ').trim() || '',
			cur: col.cur !== undefined ? num(cells[col.cur]) : null,
			max: col.cur !== undefined ? num(cells[col.max]) : null,
			date: col.date !== undefined ? (cells[col.date]?.textContent.trim() || '') : '',
			work: col.work !== undefined ? (cells[col.work]?.textContent.trim() || '') : '',
			ctrl: col.ctrl !== undefined ? (cells[col.ctrl]?.textContent.replace(/\s+/g, ' ').trim() || '') : '',
			href: cells[0]?.querySelector('a')?.href || '',
			teacher: cells[cells.length - 1]?.textContent.trim() || '' });
	});
	if (!kts.length) return null;

	const sum = key => kts.reduce((s, k) => s + (k[key] || 0), 0);
	let h = table.previousElementSibling;
	while (h && h.tagName !== 'H3') h = h.previousElementSibling;
	return {
		table, heading: h,
		name: h ? h.textContent.trim() : 'Дисциплина',
		kts,
		cur: total?.cur ?? sum('cur'),
		max: total?.max ?? sum('max'),
		left:    kts.filter(k => k.status === 'pending').reduce((s, k) => s + (k.max || 0), 0),
		passed:  kts.filter(k => k.status === 'passed').length,
		failed:  kts.filter(k => k.status === 'failed').length,
		pending: kts.filter(k => k.status === 'pending').length,
	};
}

function styleSignsTable(d) {
	d.kts.forEach(k => {
		k.row.classList.remove('row-green', 'row-yellow', 'row-red');
		if (k.status === 'passed') k.row.classList.add('row-green');
		if (k.status === 'failed') k.row.classList.add('row-red');
		if (k.status === 'pending') return;
		const dot = createEl('span', { className: 'score-dot ' + (k.status === 'passed' ? 'score-dot--high' : 'score-dot--low') });
		dot.title = `${k.grade} из проходных ${k.pass}`;
		k.gradeCell.appendChild(dot);
	});

	// Сводка по дисциплине рядом с заголовком
	if (!d.heading) return;
	paintDiscipline(d.heading, d.name);
	const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
	const sum = createEl('div', { className: 'etis3-dis-summary' });
	sum.innerHTML = `
		<span class="eds-chip">рейтинг <b>${d.cur}</b> / ${d.max}</span>
		<span class="eds-chip eds-chip--ok">сдано ${d.passed}</span>
		${d.failed ? `<span class="eds-chip eds-chip--bad">не сдано ${d.failed}</span>` : ''}
		${d.pending ? `<span class="eds-chip">впереди ${d.pending}${d.left ? ` · до +${d.left}` : ''}</span>` : ''}
		${d.fresh ? `<span class="eds-chip eds-chip--new">новых ${d.fresh}</span>` : ''}
		<span class="eds-chip eds-chip--goal" hidden></span>
		<span class="eds-bar"><span class="eds-bar-fill" style="width:${pct}%"></span></span>
	`;
	d.heading.after(sum);
	d.goalChip = sum.querySelector('.eds-chip--goal');
}

// ---------- Новые оценки ----------
// Запоминаем, какие оценки уже видели. Оценка, появившаяся с прошлого визита,
// подсвечивается три дня. При самом первом запуске ничего не подсвечиваем.
const SEEN_GRADES_KEY = 'etis3-seen-grades';
const NEW_GRADE_DAYS  = 3;

function gradeKey(dkey, i, topic) { return `${dkey}|${i}|${topic.slice(0, 60)}`; }

function markNewGrades(disciplines) {
	let seen = null;
	try { seen = JSON.parse(localStorage.getItem(SEEN_GRADES_KEY)); } catch (e) {}
	if (!seen || typeof seen !== 'object') seen = {};

	const now = Date.now();
	let fresh = 0;
	disciplines.forEach(d => {
		d.fresh = 0;
		// Дисциплину, которую видим впервые (другой семестр, первый заход), только запоминаем
		const dkey  = disciplineKey(d.name);
		const known = `#${dkey}` in seen;
		seen[`#${dkey}`] = 1;
		d.kts.forEach((k, i) => {
			if (k.grade === null) return;
			const key  = gradeKey(dkey, i, k.topic);
			const prev = seen[key];
			if (!known) seen[key] = { g: k.grade, t: 0 };
			else if (!prev || prev.g !== k.grade) seen[key] = { g: k.grade, t: now };
			if (now - seen[key].t < NEW_GRADE_DAYS * 864e5) {
				k.fresh = true;
				k.row.classList.add('kt-new');
				k.gradeCell.prepend(createEl('span', { className: 'kt-new-badge', textContent: 'new', title: 'Новая оценка' }));
				d.fresh++; fresh++;
			}
		});
	});
	try { localStorage.setItem(SEEN_GRADES_KEY, JSON.stringify(seen)); } catch (e) {}
	return fresh;
}

// ---------- Цель по баллам ----------
// Сколько ещё нужно набрать до цели и реально ли это с оставшимися КТ.
const GOAL_KEY = 'etis3-grade-goal';

function readGoal() {
	try { const g = parseInt(localStorage.getItem(GOAL_KEY), 10); return g > 0 ? g : null; } catch (e) { return null; }
}

function goalHint(d, goal) {
	if (!goal) return null;
	const need = goal - d.cur;
	if (need <= 0) return { cls: 'ok', text: 'цель есть ✓' };
	if (need > d.left) return { cls: 'bad', text: `до ${goal} не добрать: максимум ${d.cur + d.left}${d.failed ? ' без пересдач' : ''}` };
	const share = d.left ? Math.round(need / d.left * 100) : 100;
	return { cls: share > 80 ? 'warn' : '', text: `нужно ещё ${need} из ${d.left} (${share}%)` };
}

function updateGoalHints(disciplines) {
	const goal = readGoal();
	disciplines.forEach(d => {
		const h = goalHint(d, goal);
		[d.goalChip, d.goalCell, d.goalCard].forEach(el => {
			if (!el) return;
			el.hidden = !h;
			el.className = el.className.replace(/\s*goal--\w+/g, '') + (h && h.cls ? ' goal--' + h.cls : '');
			el.textContent = h ? h.text : '';
		});
	});
}


// ============================================================
// MAIN
// ============================================================

// Расширение запускается до DOMContentLoaded, а менеджеры скриптов (Stay на iPhone)
// могут подключить нас уже после — тогда событие не придёт, запускаемся сразу
function onReady(fn) {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
	else setTimeout(fn, 0); // после того, как весь скрипт объявит свои переменные
}

onReady(() => {
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

// В userscript-версии нет фоновой проверки (только в расширении)
const IS_USERSCRIPT = typeof ETIS3_USERSCRIPT !== 'undefined';

const SETTINGS_TOGGLES = {
	'РАСПИСАНИЕ': [
		['highlight', 'play_circle',   'Подсветка текущей пары', 'Выделяет пару, которая идёт сейчас'],
		['widget',    'schedule',      'Виджет следующей пары',  'Показывает, что идёт / что следующее'],
		['pairTypes', 'menu_book',     'Иконки типов пар',       'Лекция, практика, лаб. работа'],
	],
	'ИНТЕРФЕЙС': [
		['aurora',    'blur_on',       'Живой фон',              'Аврора за стеклом на всех страницах'],
		['sky',       'wb_twilight',   'Небо по времени суток',  'Утро, день, вечер и ночь — свои цвета'],
		['notify',    'notifications_active', 'Уведомления о новом', 'Оценки, сообщения и объявления — даже когда ЕТИС закрыт'],
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
				<div class="etis3-sp-section-label">ВИД</div>
				<div class="etis3-sp-row3">
					<button class="etis3-sp-opt" data-layout="modern"><span class="material-icons">dashboard</span>Новый</button>
					<button class="etis3-sp-opt" data-layout="classic"><span class="material-icons">view_sidebar</span>Классический</button>
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

			${Object.entries(SETTINGS_TOGGLES).map(([title, rows]) => [title, rows.filter(r => !(IS_USERSCRIPT && r[0] === 'notify'))]).map(([title, rows]) => `
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
		panel.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === settings.layout));
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

	panel.querySelectorAll('[data-layout]').forEach(btn => {
		btn.addEventListener('click', () => { saveSettings({ layout: btn.dataset.layout }); render(); });
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

function buildSignsStats(span9, disciplines, fresh = 0) {
	if (!disciplines.length) return;

	const cur     = disciplines.reduce((s, d) => s + d.cur, 0);
	const max     = disciplines.reduce((s, d) => s + d.max, 0);
	const passed  = disciplines.reduce((s, d) => s + d.passed, 0);
	const failed  = disciplines.reduce((s, d) => s + d.failed, 0);
	const pending = disciplines.reduce((s, d) => s + d.pending, 0);
	const graded  = passed + failed;

	const rows = [...disciplines].sort((a, b) => (b.failed - a.failed) || (a.cur / (a.max || 1)) - (b.cur / (b.max || 1)));

	const w = createEl('div', { className: 'etis3-stats-widget' });
	w.innerHTML = `
		<div class="esw-header">
			<span class="material-icons">analytics</span>
			<span class="esw-title">Сводка по ${/триместр/i.test(span9.querySelector('.submenu')?.textContent || '') ? 'триместру' : 'семестру'}</span>
			${fresh ? `<span class="esw-new">новых оценок: ${fresh}</span>` : ''}
			<label class="esw-goal" title="Цель по баллам в рейтинг для каждой дисциплины — покажу, сколько ещё нужно набрать">
				<span class="material-icons">flag</span>цель
				<input type="number" min="1" max="100" step="1" placeholder="—" inputmode="numeric">
			</label>
		</div>
		<div class="esw-grid">
			<div class="esw-card">
				<div class="esw-label">Баллов в рейтинг</div>
				<div class="esw-value">${cur}<small> / ${max}</small></div>
			</div>
			<div class="esw-card">
				<div class="esw-label">КТ сдано</div>
				<div class="esw-value" style="color:var(--color-green)">${passed}<small> / ${graded}</small></div>
			</div>
			<div class="esw-card">
				<div class="esw-label">Не сдано</div>
				<div class="esw-value" style="color:${failed ? 'var(--color-red)' : 'var(--color-text-primary)'}">${failed}</div>
			</div>
			<div class="esw-card">
				<div class="esw-label">КТ впереди</div>
				<div class="esw-value">${pending}</div>
			</div>
		</div>
		<div class="esw-dis-list">
			${rows.map(d => {
				const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
				return `<div class="esw-dis etis3-dis${d.failed ? ' esw-dis--bad' : ''}" style="--dis-h:${disciplineHue(d.name)}">
					<div class="esw-dis-name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
					<div class="esw-dis-bar"><span style="width:${pct}%"></span></div>
					<div class="esw-dis-val">${d.cur} / ${d.max}${d.failed ? ` · <b>${d.failed} не сдано</b>` : ''}</div>
					<div class="esw-dis-goal" hidden></div>
				</div>`;
			}).join('')}
		</div>
	`;

	const disEls = w.querySelectorAll('.esw-dis');
	rows.forEach((d, i) => { d.goalCell = disEls[i].querySelector('.esw-dis-goal'); });

	const input = w.querySelector('.esw-goal input');
	const goal  = readGoal();
	if (goal) input.value = goal;
	input.addEventListener('input', () => {
		const v = parseInt(input.value, 10);
		try {
			if (v > 0) localStorage.setItem(GOAL_KEY, String(Math.min(v, 1000)));
			else localStorage.removeItem(GOAL_KEY);
		} catch (e) {}
		updateGoalHints(disciplines);
	});

	// После вкладок «оценки за сессии / в семестре / …» и выбора семестра
	const menus = span9.querySelectorAll(':scope > .submenu');
	if (menus.length) menus[menus.length - 1].after(w);
	else span9.prepend(w);
}


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
		</div>
	`;
	// Выход — последним
	const logout = menu.querySelector('.tbm-danger');
	if (logout) menu.querySelector('.tbm-links').appendChild(logout);
	menu.querySelector('.tbm-settings').addEventListener('click', e => { e.preventDefault(); menu.hidden = true; openSettingsPanel(); });
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


// ============================================================
// ГЛАВНАЯ — дашборд на stu.timetable#home
// ============================================================
// Расписание уже на странице, остальное (оценки, сообщения, объявления)
// подтягиваем запросами к ЕТИСу с теми же куками. Сначала рисуем из кэша,
// потом обновляем свежими данными.

const HOME_CACHE_KEY = 'etis3-home-cache';
const SEEN_FEED_KEY  = 'etis3-seen-feed';

function isHomeRoute() { return location.hash === '#home'; }

function initHomeRoute(span9) {
	const apply = () => {
		const on = isHomeRoute();
		document.documentElement.classList.toggle('etis3-home', on);
		const sidebar = document.querySelector('.span3');
		const homeLi  = sidebar?.querySelector('.etis3-home-li');
		const ttLi    = [...(sidebar?.querySelectorAll('.etis3-main-nav > li') || [])].find(li => /stu\.timetable$/.test(li.querySelector('a')?.getAttribute('href') || '') || /stu\.timetable$/.test(li.querySelector('a')?.href || ''));
		homeLi?.classList.toggle('active', on);
		ttLi?.classList.toggle('active', !on);
		const ttl = document.querySelector('#etis3-topbar .tb-page');
		if (ttl) ttl.textContent = on ? 'Главная' : 'Мое расписание';
		if (on) { renderHome(span9); window.scrollTo(0, 0); }
		else document.getElementById('etis3-home')?.remove();
	};
	window.addEventListener('hashchange', apply);
	apply();
}

async function fetchEtisPage(path) {
	const res = await fetch(new URL(path, location.href).href, { credentials: 'include' });
	if (!res.ok) throw new Error(res.status);
	const buf = await res.arrayBuffer();
	const ct  = res.headers.get('content-type') || '';
	const enc = /utf-?8/i.test(ct) ? 'utf-8' : 'windows-1251';
	const doc = new DOMParser().parseFromString(new TextDecoder(enc).decode(buf), 'text/html');
	if (doc.querySelector('body > div.login #form, form#form input[name="p_password"]')) throw new Error('login');
	return doc;
}

function parseRuDate(str) {
	const m = (str || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
	return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime() : 0;
}

function readFeed(doc, kind) {
	return [...doc.querySelectorAll('ul.nav.msg')].slice(0, 6).map(ul => {
		const first = ul.querySelector('li');
		const time  = first?.querySelector('font[color="#808080"]')?.textContent.trim() || '';
		const title = first?.querySelector('font[style*="bold"]:not([title])')?.textContent.trim() || '';
		const clone = first?.cloneNode(true);
		clone?.querySelectorAll('font, b').forEach(el => el.remove());
		const lines = (clone?.innerText || clone?.textContent || '').split('\n').map(x => x.trim()).filter(Boolean);
		const item  = { t: parseRuDate(time), time, title };
		if (kind === 'notes') {
			item.who  = first?.querySelector('b i, b')?.textContent.trim() || '';
			item.dis  = first?.querySelector('font[title]')?.textContent.trim() || '';
			item.text = lines.join(' ').slice(0, 220);
			item.files = ul.querySelectorAll('a[href*="file_download"]').length;
		} else {
			item.who  = lines.length > 1 ? lines[lines.length - 1] : '';
			item.text = lines.slice(0, -1).join(' ').slice(0, 220);
		}
		return item;
	}).filter(x => x.title || x.text);
}

function readGrades(doc) {
	const discs = [...doc.querySelectorAll('table.common')].map(parseSignsTable).filter(Boolean);
	let seen = {};
	try { seen = JSON.parse(localStorage.getItem(SEEN_GRADES_KEY)) || {}; } catch (e) {}
	const now = Date.now();
	const recent = [];
	discs.forEach(d => d.kts.forEach((k, i) => {
		if (k.grade === null) return;
		const s = seen[gradeKey(disciplineKey(d.name), i, k.topic)];
		recent.push({ dis: d.name, topic: k.topic, grade: k.grade, max: k.max, pass: k.pass, status: k.status,
			date: k.date, t: parseRuDate(k.date), fresh: !!(s && s.t && now - s.t < NEW_GRADE_DAYS * 864e5) });
	}));
	recent.sort((a, b) => b.t - a.t);
	return {
		term: /триместр/i.test(doc.querySelector('.submenu')?.textContent || '') ? 'триместр' : 'семестр',
		discs: discs.map(d => ({ name: d.name, cur: d.cur, max: d.max, left: d.left, failed: d.failed, pending: d.pending, passed: d.passed,
			debts: d.kts.filter(k => k.status === 'failed').map(k => k.topic) })),
		recent: recent.slice(0, 6),
	};
}

function readHomeCache() { try { return JSON.parse(localStorage.getItem(HOME_CACHE_KEY)) || {}; } catch (e) { return {}; } }

async function refreshHomeData() {
	const cache = readHomeCache();
	const jobs = [
		['grades', 'stu.signs?p_mode=current', doc => readGrades(doc)],
		['notes',  'stu.teacher_notes',        doc => readFeed(doc, 'notes')],
		['ann',    'stu_ann.announces',        doc => readFeed(doc, 'ann')],
	];
	await Promise.all(jobs.map(async ([key, path, parse]) => {
		try { cache[key] = parse(await fetchEtisPage(path)); cache[key + 'At'] = Date.now(); }
		catch (e) { cache[key + 'Err'] = String(e.message || e); }
	}));
	try { localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
	// Первый запуск: всё, что уже есть в ленте, считаем прочитанным
	try {
		const seen = JSON.parse(localStorage.getItem(SEEN_FEED_KEY)) || {};
		let changed = false;
		['notes', 'ann'].forEach(k => {
			if (seen[k] === undefined && cache[k]) { seen[k] = Math.max(0, ...cache[k].map(i => i.t)); changed = true; }
		});
		if (changed) localStorage.setItem(SEEN_FEED_KEY, JSON.stringify(seen));
	} catch (e) {}
	return cache;
}

function relTime(t) {
	if (!t) return '';
	const d = new Date(t), now = new Date();
	const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
	if (days === 0) return 'сегодня';
	if (days === 1) return 'вчера';
	if (days < 7)   return `${days} дн. назад`;
	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

function renderHome(span9) {
	let home = document.getElementById('etis3-home');
	if (!home) {
		home = createEl('div', { id: 'etis3-home' });
		span9.prepend(home);
	}
	const week   = readWeek(span9);
	const cache  = readHomeCache();
	let lastData = cache, lastLoading = true;
	draw(cache, true);
	refreshHomeData().then(fresh => { if (isHomeRoute()) draw(fresh, false); });
	if (!home.dataset.notesHooked) {
		home.dataset.notesHooked = '1';
		document.addEventListener('etis3-notes-changed', () => { if (isHomeRoute() && document.getElementById('etis3-home')) draw(lastData, lastLoading); });
	}

	function draw(data, loading) {
		lastData = data; lastLoading = loading;
		let seenFeed = {};
		try { seenFeed = JSON.parse(localStorage.getItem(SEEN_FEED_KEY)) || {}; } catch (e) {}
		const name  = (document.querySelector('.etis3-profile')?.title || '').split(/\s+/)[1] || '';
		const now   = new Date();
		const today = week.find(d => d.isToday);
		const nextDay = week.find(d => d.date && d.date > now && !d.isToday && d.pairs.length);
		const st    = todayStatus();

		// --- герой ---
		const todayPairs = today ? today.pairs : [];
		let summary;
		if (!today) summary = 'Расписание этой недели не загружено.';
		else if (!todayPairs.length) summary = nextDay ? `Сегодня пар нет. Следующие — ${nextDay.title.split(',')[0].toLowerCase()}.` : 'Сегодня пар нет — отдыхай.';
		else if (st?.state === 'now') summary = `Сейчас идёт ${st.pair.num}-я пара, до конца ${formatDuration(st.mins)}.`;
		else if (st?.state === 'next') summary = `Следующая пара через ${formatDuration(st.mins)}, всего сегодня ${todayPairs.length}.`;
		else summary = `Пары на сегодня закончились${nextDay ? ` — дальше ${nextDay.title.split(',')[0].toLowerCase()}` : ''}.`;

		const g = data.grades;
		const debts = g ? g.discs.reduce((n, d) => n + d.failed, 0) : 0;
		const freshGrades = g ? g.recent.filter(r => r.fresh).length : 0;
		const unseenNotes = (data.notes || []).filter(n => n.t > (seenFeed.notes || 0)).length;
		const unseenAnn   = (data.ann || []).filter(n => n.t > (seenFeed.ann || 0)).length;

		const chips = [
			freshGrades ? `<a class="hm-chip hm-chip--accent" href="stu.signs?p_mode=current"><span class="material-icons">auto_awesome</span>новых оценок: ${freshGrades}</a>` : '',
			unseenNotes ? `<a class="hm-chip hm-chip--accent" href="stu.teacher_notes"><span class="material-icons">forum</span>новых сообщений: ${unseenNotes}</a>` : '',
			debts ? `<a class="hm-chip hm-chip--bad" href="stu.signs?p_mode=current"><span class="material-icons">priority_high</span>долгов по КТ: ${debts}</a>` : '',
			unseenAnn ? `<a class="hm-chip" href="stu_ann.announces"><span class="material-icons">campaign</span>новых объявлений: ${unseenAnn}</a>` : '',
		].join('');

		// --- сегодня: таймлайн ---
		const showDay = todayPairs.length ? today : nextDay;
		const dayPairs = showDay ? showDay.pairs : [];
		const m = t => t[0] * 60 + t[1];
		const nowM = nowMinutes();
		const timeline = timelineHtml(dayPairs, showDay === today, false, showDay?.date || null);

		// --- оценки ---
		const gradesHtml = !g ? skeleton(loading, data.gradesErr) : `
			<div class="hm-rating">
				<div class="hm-big">${fmtNum(g.discs.reduce((s, d) => s + d.cur, 0))}<small> / ${fmtNum(g.discs.reduce((s, d) => s + d.max, 0))}</small></div>
				<div class="hm-sub">баллов в рейтинг за ${g.term}</div>
			</div>
			<div class="hm-dis-list">
				${g.discs.map(d => {
					const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
					return `<div class="hm-dis etis3-dis" style="--dis-h:${disciplineHue(d.name)}" title="${escapeHtml(d.name)}${d.debts.length ? '\nДолги: ' + escapeHtml(d.debts.join('; ')) : ''}">
						<span class="hm-dis-name">${escapeHtml(d.name)}</span>
						<span class="hm-dis-bar"><i style="width:${pct}%"></i></span>
						<span class="hm-dis-val">${fmtNum(d.cur)}${d.failed ? ` <b>· ${d.failed} долг${d.failed > 1 ? 'а' : ''}</b>` : ''}</span>
					</div>`;
				}).join('')}
			</div>`;
		const recentHtml = !g ? skeleton(loading, data.gradesErr) : g.recent.length ? g.recent.map(r => `
			<div class="hm-grade etis3-dis${r.fresh ? ' hm-grade--new' : ''}" style="--dis-h:${disciplineHue(r.dis)}">
				<div class="hm-grade-score hm-grade-score--${r.status}"><b>${fmtNum(r.grade)}</b>${r.max ? `<span>из ${fmtNum(r.max)}</span>` : ''}</div>
				<div class="hm-grade-info">
					<div class="hm-grade-dis">${escapeHtml(r.dis)}</div>
					<div class="hm-grade-topic">${escapeHtml(r.topic)}</div>
				</div>
				<div class="hm-grade-date">${r.fresh ? '<span class="hm-new">new</span>' : ''}${escapeHtml(relTime(r.t) || r.date)}</div>
			</div>`).join('') : '<div class="hm-empty">Оценок в этом семестре пока нет</div>';

		const feedHtml = (items, kind, err) => !items ? skeleton(loading, err) : items.length ? items.slice(0, 3).map(n => `
			<a class="hm-feed${n.t > (seenFeed[kind] || 0) ? ' hm-feed--new' : ''}" href="${kind === 'notes' ? 'stu.teacher_notes' : 'stu_ann.announces'}">
				<div class="hm-feed-head">
					<span class="hm-feed-who">${escapeHtml(n.who || '')}</span>
					<span class="hm-feed-time">${escapeHtml(relTime(n.t))}</span>
				</div>
				<div class="hm-feed-title">${escapeHtml(n.title)}</div>
				<div class="hm-feed-text">${escapeHtml(n.text)}</div>
				${n.dis || n.files ? `<div class="hm-feed-foot">${n.dis ? `<span class="etis3-dis" style="--dis-h:${disciplineHue(n.dis)}"><i></i>${escapeHtml(n.dis)}</span>` : ''}${n.files ? `<span><span class="material-icons">attach_file</span>${n.files}</span>` : ''}</div>` : ''}
			</a>`).join('') : '<div class="hm-empty">Пусто</div>';

		// --- быстрые ссылки ---
		const quickKeys = ['stu.teach_plan', 'cert_pkg.stu_certif', 'stu.absence', 'stu.library', 'stu.electr', 'stu.teachers'];
		const quick = quickKeys.map(k => [...document.querySelectorAll('.span3 .etis3-main-nav a[href]')].find(a => navKey(a) === k)).filter(Boolean);

		home.innerHTML = `
			<section class="hm-hero hm-card">
				<div class="hm-hero-main">
					<div class="hm-hello">${loginGreeting(now.getHours())}${name ? ', ' + escapeHtml(name) : ''}</div>
					<div class="hm-date">${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
					<div class="hm-summary">${escapeHtml(summary)}</div>
					${chips ? `<div class="hm-chips">${chips}</div>` : ''}
				</div>
				<div class="hm-hero-side">${semesterRing()}</div>
			</section>

			<section class="hm-card hm-today${dayPairs.length >= 3 ? ' hm-today--tall' : ''}">
				<div class="hm-card-head">
					<span class="material-icons">event</span>
					<h2>${showDay === today ? 'Сегодня' : showDay ? escapeHtml(showDay.title.split(',')[0]) : 'Расписание'}</h2>
					<a class="hm-more" href="stu.timetable" data-tt-link>вся неделя<span class="material-icons">arrow_forward</span></a>
				</div>
				${timeline ? `<div class="hm-timeline">${timeline}</div>` : '<div class="hm-empty hm-empty--big"><span class="material-icons">weekend</span>На этой неделе пар больше нет</div>'}
			</section>

			<section class="hm-card hm-tasks">
				<div class="hm-card-head"><span class="material-icons">assignment</span><h2>Заметки и ДЗ</h2></div>
				${tasksHtml()}
			</section>

			<section class="hm-card hm-grades">
				<div class="hm-card-head">
					<span class="material-icons">insights</span><h2>Рейтинг</h2>
					<a class="hm-more" href="stu.signs?p_mode=current">подробно<span class="material-icons">arrow_forward</span></a>
				</div>
				${gradesHtml}
			</section>

			<section class="hm-card hm-recent">
				<div class="hm-card-head"><span class="material-icons">grade</span><h2>Последние оценки</h2></div>
				<div class="hm-list">${recentHtml}</div>
			</section>

			<section class="hm-card hm-notes">
				<div class="hm-card-head">
					<span class="material-icons">forum</span><h2>Сообщения</h2>
					<a class="hm-more" href="stu.teacher_notes">все<span class="material-icons">arrow_forward</span></a>
				</div>
				<div class="hm-list">${feedHtml(data.notes, 'notes', data.notesErr)}</div>
			</section>

			<section class="hm-card hm-ann">
				<div class="hm-card-head">
					<span class="material-icons">campaign</span><h2>Объявления</h2>
					<a class="hm-more" href="stu_ann.announces">все<span class="material-icons">arrow_forward</span></a>
				</div>
				<div class="hm-list">${feedHtml(data.ann, 'ann', data.annErr)}</div>
			</section>

			${quick.length ? `<section class="hm-quick">${quick.map(a => `
				<a class="hm-tile" href="${escapeHtml(a.href)}"><span class="material-icons">${a.querySelector('.material-icons')?.textContent || 'link'}</span><span>${escapeHtml(navLabel(a))}</span></a>`).join('')}
			</section>` : ''}
		`;
		home.querySelector('[data-tt-link]')?.addEventListener('click', e => { e.preventDefault(); location.hash = ''; history.replaceState(null, '', location.pathname + location.search); window.dispatchEvent(new HashChangeEvent('hashchange')); });
	}

	function skeleton(loading, err) {
		if (!loading && err) return `<div class="hm-empty"><span class="material-icons">cloud_off</span>Не удалось загрузить${err === 'login' ? ' — нужно войти заново' : ''}</div>`;
		return '<div class="hm-skel"><i></i><i></i><i></i></div>';
	}
}

function fmtNum(n) { return n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10).replace('.', ','); }

function semesterRing() {
	const sem = document.querySelector('.span3 .semester-progress');
	const pct = parseInt(sem?.querySelector('.semester-progress__pct')?.textContent, 10) || 0;
	const nm  = sem?.querySelector('.semester-progress__name')?.textContent || 'Семестр';
	const sub = sem?.querySelector('.semester-progress__sub')?.textContent || '';
	const r = 52, c = 2 * Math.PI * r;
	return `<div class="hm-ring" title="${escapeHtml(nm)}">
		<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="hm-ring-bg"/><circle cx="60" cy="60" r="${r}" class="hm-ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg>
		<div class="hm-ring-txt"><b>${pct}%</b><span>${escapeHtml(nm.replace(' семестр', ''))}</span><small>${escapeHtml(sub)}</small></div>
	</div>`;
}

// Отметка «прочитано» для ленты: открыл страницу — всё, что на ней, уже не новое
function markFeedSeen(kind) {
	const items = readFeed(document, kind);
	const newest = Math.max(0, ...items.map(i => i.t));
	if (!newest) return;
	let seen = {};
	try { seen = JSON.parse(localStorage.getItem(SEEN_FEED_KEY)) || {}; } catch (e) {}
	if ((seen[kind] || 0) >= newest) return;
	seen[kind] = newest;
	try { localStorage.setItem(SEEN_FEED_KEY, JSON.stringify(seen)); } catch (e) {}
}


// ============================================================
// НОВЫЕ ВИДЫ СТРАНИЦ (только в «Новом» интерфейсе)
// ============================================================
// Исходная разметка ЕТИСа остаётся на месте с классом etis3-orig и
// прячется стилями — классический вид и переключение на лету работают.

function initials(name) {
	return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ---------- Оценки: карточки дисциплин ----------
function buildSignsCards(span9, disciplines) {
	if (!disciplines.length) return;
	const wrap = createEl('div', { className: 'etis3-view sv-grid' });
	disciplines.forEach(d => {
		const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
		const card = createEl('section', { className: 'sv-card etis3-dis' + (d.failed ? ' sv-card--bad' : '') });
		card.style.setProperty('--dis-h', disciplineHue(d.name));
		card.innerHTML = `
			<header class="sv-head">
				<div class="sv-title"><i></i><h3>${escapeHtml(d.name)}</h3></div>
				<div class="sv-score"><b>${fmtNum(d.cur)}</b><span>/ ${fmtNum(d.max)}</span></div>
			</header>
			<div class="sv-bar"><i style="width:${pct}%"></i>${d.max ? '' : ''}</div>
			<div class="sv-meta">
				<span class="sv-pill sv-pill--ok">сдано ${d.passed}</span>
				${d.failed ? `<span class="sv-pill sv-pill--bad">долги ${d.failed}</span>` : ''}
				${d.pending ? `<span class="sv-pill">впереди ${d.pending}${d.left ? ` · до +${fmtNum(d.left)}` : ''}</span>` : ''}
				${d.fresh ? `<span class="sv-pill sv-pill--new">новых ${d.fresh}</span>` : ''}
				<span class="sv-pill sv-goal" hidden></span>
			</div>
			<div class="sv-kts">
				${d.kts.map((k, i) => `
					<a class="sv-kt sv-kt--${k.status}${k.fresh ? ' sv-kt--new' : ''}" ${k.href ? `href="${escapeHtml(k.href)}"` : ''} title="${escapeHtml(k.topic)}">
						<span class="sv-kt-score"><b>${k.grade === null ? '—' : fmtNum(k.grade)}</b><small>${k.max ? 'из ' + fmtNum(k.max) : ''}</small></span>
						<span class="sv-kt-info">
							<span class="sv-kt-topic"><em>КТ ${i + 1}</em>${escapeHtml(k.topic)}</span>
							<span class="sv-kt-sub">${[k.work, k.ctrl, k.pass !== null ? 'проходной ' + fmtNum(k.pass) : ''].filter(Boolean).map(escapeHtml).join(' · ')}</span>
						</span>
						<span class="sv-kt-date">${k.fresh ? '<span class="hm-new">new</span>' : ''}${escapeHtml(k.date || '')}</span>
					</a>`).join('')}
			</div>`;
		d.goalCard = card.querySelector('.sv-goal');
		wrap.appendChild(card);
		[d.heading, d.table, d.heading?.nextElementSibling?.classList.contains('etis3-dis-summary') ? d.heading.nextElementSibling : null]
			.forEach(el => el?.classList.add('etis3-orig'));
	});
	const first = disciplines[0].heading || disciplines[0].table;
	first.before(wrap);
}

// ---------- Сообщения: аватар, цвет дисциплины, «новое» ----------
function decorateMessages(seenBefore) {
	const msgs = [...document.querySelectorAll('ul.nav.msg')].map(ul => {
		const first = ul.querySelector('li');
		const who = first?.querySelector('b i, b')?.textContent.trim() || '';
		const dis = first?.querySelector('font[title]')?.textContent.trim() || '';
		const t   = parseRuDate(first?.querySelector('font[color="#808080"]')?.textContent || '');
		return { ul, who, dis, t };
	});
	// Разметку переставляет stylePage_teacherNotes — дорисовываем после неё
	queueMicrotask(() => msgs.forEach(({ ul, who, dis, t }) => {
		if (ul.className.match(/repl_s/)) return;
		const header = ul.querySelector('.message-header');
		if (!header) return;
		ul.classList.add('etis3-msg');
		if (dis) { ul.style.setProperty('--dis-h', disciplineHue(dis)); ul.classList.add('etis3-dis'); }
		if (seenBefore && t > seenBefore) ul.classList.add('etis3-msg--new');
		if (who) header.prepend(createEl('div', { className: 'etis3-msg-avatar', textContent: initials(who) }));
		const time = header.querySelector('font[color="#808080"]');
		if (time && t) { time.title = time.textContent; time.textContent = relTime(t) + ', ' + new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
		ul.querySelectorAll('a[href*="file_download"]').forEach(a => a.classList.add('etis3-file'));
	}));
}

// ---------- Учебный план: семестры карточками ----------
function buildPlanView(span9) {
	const heads = [...span9.querySelectorAll('h3')].filter(h => h.nextElementSibling?.matches('table.common'));
	if (!heads.length) return;
	const wrap = createEl('div', { className: 'etis3-view pv' });
	heads.forEach(h => {
		const table = h.nextElementSibling;
		const items = [];
		let section = '';
		table.querySelectorAll('tr').forEach(tr => {
			const sec = tr.querySelector('td[colspan="10"]');
			if (sec) { section = sec.textContent.trim(); return; }
			if (!tr.classList.contains('cgrldatarow')) return;
			const c = [...tr.children].filter(td => td.textContent.trim() !== '{');
			const a = c[0]?.querySelector('a');
			const nums = c.slice(2).map(td => parseFloat(td.textContent.replace(',', '.')) || 0);
			items.push({ name: (a || c[0]).textContent.trim(), href: a?.href || '', report: c[1]?.textContent.trim() || '',
				choice: tr.querySelector('td[rowspan]')?.textContent.trim() === '{' || tr.previousElementSibling?.querySelector('td[rowspan]')?.textContent.trim() === '{',
				aud: nums[0] || 0, self: nums[1] || 0, total: nums[2] || (nums[0] + nums[1]), section });
		});
		if (!items.length) return;
		const exams = items.filter(i => /экзам/i.test(i.report)).length;
		const credits = items.filter(i => /зач/i.test(i.report)).length;
		const hours = items.reduce((s, i) => s + i.total, 0);
		const maxTotal = Math.max(...items.map(i => i.total), 1);
		const sections = [...new Set(items.map(i => i.section))];
		const sem = createEl('section', { className: 'pv-sem' });
		sem.innerHTML = `
			<header class="pv-head">
				<h3>${escapeHtml(h.textContent.trim())}</h3>
				<div class="pv-stats">
					<span><b>${items.length}</b> дисциплин</span>
					${exams ? `<span class="pv-exam"><b>${exams}</b> экз.</span>` : ''}
					${credits ? `<span class="pv-credit"><b>${credits}</b> зач.</span>` : ''}
					<span><b>${hours}</b> ч · ${Math.round(hours / 36)} з.е.</span>
				</div>
			</header>
			${sections.map(secName => `
				${secName && sections.length > 1 ? `<div class="pv-section">${escapeHtml(secName)}</div>` : ''}
				<div class="pv-grid">
					${items.filter(i => i.section === secName).map(i => `
						<a class="pv-item etis3-dis" style="--dis-h:${disciplineHue(i.name)}" ${i.href ? `href="${escapeHtml(i.href)}"` : ''}>
							<div class="pv-item-top">
								<span class="pv-name">${escapeHtml(i.name)}</span>
								<span class="pv-report ${/экзам/i.test(i.report) ? 'pv-report--exam' : /зач/i.test(i.report) ? 'pv-report--credit' : ''}">${escapeHtml(i.report)}</span>
							</div>
							${i.choice ? '<div class="pv-choice"><span class="material-icons">alt_route</span>на выбор</div>' : ''}
							<div class="pv-hours" title="Аудиторная ${i.aud} ч, самостоятельная ${i.self} ч">
								<span class="pv-hbar" style="width:${Math.max(4, i.total / maxTotal * 100)}%">
									<i style="flex:${i.aud || 0.0001}"></i><u style="flex:${i.self || 0.0001}"></u>
								</span>
							</div>
							<div class="pv-hours-txt"><span><i></i>${i.aud} ауд.</span><span><u></u>${i.self} сам.</span><b>${i.total} ч</b></div>
						</a>`).join('')}
				</div>`).join('')}
		`;
		wrap.appendChild(sem);
		h.classList.add('etis3-orig');
		table.classList.add('etis3-orig');
	});
	heads[0].before(wrap);
}

// ---------- Преподаватели: карточки ----------
function buildTeachersView(span9) {
	const tables = [...span9.querySelectorAll('table.teacher_info')];
	if (!tables.length) return;
	const wrap = createEl('div', { className: 'etis3-view tv-grid' });
	tables.forEach(t => {
		const name = t.querySelector('.teacher_name')?.firstChild?.textContent.trim() || '';
		const img  = t.querySelector('.teacher_photo img');
		const chairEl = t.querySelector('.chair');
		const chair = chairEl ? [...chairEl.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim() : '';
		const dis = (t.querySelector('.dis')?.innerText || t.querySelector('.dis')?.textContent || '').split('\n').map(x => x.trim()).filter(Boolean);
		const card = createEl('article', { className: 'tv-card' });
		card.innerHTML = `
			<div class="tv-photo">${img ? `<img src="${escapeHtml(img.src)}" alt="" loading="lazy">` : ''}<span>${escapeHtml(initials(name))}</span></div>
			<div class="tv-body">
				<h3 class="tv-name">${escapeHtml(name)}</h3>
				${chair ? `<div class="tv-chair">${escapeHtml(chair)}</div>` : ''}
				<div class="tv-dis">${dis.map(line => {
					const m = line.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
					const dn = m ? m[1] : line;
					return `<div class="tv-dis-item etis3-dis" style="--dis-h:${disciplineHue(dn)}"><i></i><span>${escapeHtml(dn)}</span>${m ? `<small>${escapeHtml(m[2])}</small>` : ''}</div>`;
				}).join('')}</div>
				<div class="tv-actions"></div>
			</div>`;
		const photo = card.querySelector('.tv-photo img');
		photo?.addEventListener('error', () => photo.remove());
		photo?.addEventListener('load', () => card.classList.add('tv-card--photo'));
		// Кнопки расписания — оригинальные элементы ЕТИСа (их onclick работает в странице)
		const actions = card.querySelector('.tv-actions');
		const btns = [...t.querySelectorAll('.icon-button2')];
		[['Расписание преподавателя', 'event'], ['Расписание кафедры', 'calendar_view_week']].forEach(([title, icon], i) => {
			const src = btns.find(b => b.title === title) || btns[i];
			if (!src) return;
			const b = createEl('button', { type: 'button', className: 'tv-btn', innerHTML: `<span class="material-icons">${icon}</span>${title.replace('Расписание ', '')}` });
			b.addEventListener('click', () => src.click());
			actions.appendChild(b);
		});
		wrap.appendChild(card);
		t.classList.add('etis3-orig');
	});
	tables[0].before(wrap);
	// <br> между таблицами больше не нужны
	span9.querySelectorAll(':scope > br').forEach(br => br.classList.add('etis3-orig'));
}

// ---------- Пропуски ----------
function absenceKind(kind) {
	const k = kind.toLowerCase();
	if (/лекц/.test(k)) return 'Лекция';
	if (/лаб/.test(k)) return 'Лаб. работа';
	if (/практ|семин/.test(k)) return 'Практика';
	return kind.replace(/^Проведение\s+/i, '').replace(/^./, ch => ch.toUpperCase());
}

function buildAbsenceView(span9) {
	const table = span9?.querySelector('table.slimtab_nice');
	if (!table) return;
	const rows = [...table.querySelectorAll('tr')].slice(1).map(tr => {
		const c = [...tr.children];
		return {
			dates: [...(c[1]?.querySelectorAll('font') || [])].map(f => f.textContent.trim()).filter(Boolean),
			dis: c[2]?.textContent.trim() || '', kind: c[3]?.textContent.trim() || '', who: c[4]?.textContent.trim() || '',
		};
	}).filter(r => r.dis);
	const total = rows.reduce((s, r) => s + Math.max(1, r.dates.length), 0);
	const wrap = createEl('div', { className: 'etis3-view av' });
	wrap.innerHTML = rows.length ? `
		<div class="av-summary">
			<div class="av-big">${total}</div>
			<div><b>${total === 1 ? 'пропуск' : total < 5 ? 'пропуска' : 'пропусков'}</b><span>по ${rows.length} ${rows.length === 1 ? 'дисциплине' : 'дисциплинам'}</span></div>
		</div>
		<div class="av-list">
			${rows.map(r => `
				<div class="av-item etis3-dis" style="--dis-h:${disciplineHue(r.dis)}">
					<div class="av-dates">${r.dates.map(d => { const t = parseRuDate(d); return `<span><b>${t ? new Date(t).getDate() : ''}</b>${t ? new Date(t).toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '') : escapeHtml(d)}</span>`; }).join('')}</div>
					<div class="av-info">
						<div class="av-dis">${escapeHtml(r.dis)}</div>
						<div class="av-sub">${escapeHtml(absenceKind(r.kind))}${r.who ? ' · ' + escapeHtml(r.who) : ''}</div>
					</div>
					<div class="av-count">${r.dates.length > 1 ? '×' + r.dates.length : ''}</div>
				</div>`).join('')}
		</div>` : `<div class="hm-empty hm-empty--big"><span class="material-icons">celebration</span>Пропусков нет</div>`;
	table.before(wrap);
	table.classList.add('etis3-orig');
	// «Всего пропущено занятий: N» — текстовый узел после таблицы
	let n = table.nextSibling;
	while (n) { if (n.nodeType === 3 && /Всего пропущено/.test(n.textContent)) { const sp = createEl('span', { className: 'etis3-orig', textContent: n.textContent }); n.replaceWith(sp); break; } n = n.nextSibling; }
}


// Лента пар дня: время, точка-линия, карточка; прошедшие приглушены,
// текущая подсвечена с прогрессом, «окна» между парами подписаны
function timelineHtml(pairs, isToday, withGaps = false, date = null) {
	const m = t => t[0] * 60 + t[1];
	const nowM = nowMinutes();
	let prevEnd = null;
	return pairs.map(p => {
		const slot = PAIR_SCHEDULE.find(x => x.num === p.num);
		let state = '';
		if (isToday && slot) state = nowM > m(slot.end) ? 'past' : nowM >= m(slot.start) ? 'now' : '';
		const pct = state === 'now' ? Math.round((nowM - m(slot.start)) / (m(slot.end) - m(slot.start)) * 100) : 0;
		let gap = '';
		if (withGaps && slot && prevEnd !== null && m(slot.start) - prevEnd >= 30) {
			const inGap = isToday && nowM > prevEnd && nowM < m(slot.start);
			gap = `<div class="hm-gap${inGap ? ' hm-gap--now' : ''}"><span></span><em>окно ${formatDuration(m(slot.start) - prevEnd)}</em></div>`;
		}
		if (slot) prevEnd = Math.max(prevEnd ?? 0, m(slot.end));
		const key  = registerPair(p, date);
		const note = pairNotes[key];
		return gap + `<div class="hm-pair etis3-dis ${state ? 'hm-pair--' + state : ''}${note ? ' hm-pair--note' : ''}" style="--dis-h:${disciplineHue(p.name)}" data-key="${escapeHtml(key)}" tabindex="0" role="button" title="Заметка к паре">
			<div class="hm-pair-time"><b>${slot ? formatTime(...slot.start) : p.num + ' пара'}</b><span>${slot ? formatTime(...slot.end) : ''}</span></div>
			<div class="hm-pair-line"><i></i></div>
			<div class="hm-pair-body">
				<div class="hm-pair-name">${escapeHtml(p.name)}<span class="hm-pair-num">${p.num} пара</span></div>
				<div class="hm-pair-meta">
					${p.type ? `<span class="hm-tag"><span class="material-icons">${p.type.icon}</span>${p.type.label}</span>` : ''}
					${p.aud ? `<span><span class="material-icons">room</span>${escapeHtml(p.aud.replace(/^ауд\.\s*/i, ''))}</span>` : ''}
					${p.teacher ? `<span><span class="material-icons">person</span>${escapeHtml(p.teacher)}</span>` : ''}
				</div>
				${note ? `<div class="hm-pair-note${note.done ? ' hm-pair-note--done' : ''}"><span class="material-icons">${note.done ? 'check_circle' : 'assignment'}</span><span>${escapeHtml(note.text.split('\n')[0])}</span></div>` : ''}
				${state === 'now' ? `<div class="hm-pair-progress"><i style="width:${pct}%"></i></div>` : ''}
			</div>
		</div>`;
	}).join('');
}

// ---------- Расписание: дни лентой (новый вид, режим «Список») ----------
function buildTimetableDays(span9, week) {
	const days = [...span9.querySelectorAll('div.day')];
	if (!days.length) return;
	const wrap = createEl('div', { className: 'etis3-view ttv' });
	const render = () => {
		const m = t => t[0] * 60 + t[1];
		wrap.innerHTML = week.map((d, i) => {
			const slots = d.pairs.map(p => PAIR_SCHEDULE.find(x => x.num === p.num)).filter(Boolean);
			const span = slots.length ? `${formatTime(...slots[0].start)}–${formatTime(...slots[slots.length - 1].end)}` : '';
			const [wd, ...rest] = d.title.split(',');
			const past = d.date && !d.isToday && d.date < new Date(new Date().setHours(0, 0, 0, 0));
			const count = d.pairs.length;
			return `<section class="ttv-day${d.isToday ? ' ttv-day--today' : ''}${past ? ' ttv-day--past' : ''}${count ? '' : ' ttv-day--free'}" data-i="${i}">
				<header class="ttv-head">
					<div class="ttv-date"><b>${d.date ? d.date.getDate() : ''}</b><span>${escapeHtml(rest.join(',').trim().replace(/^\d+\s*/, ''))}</span></div>
					<div class="ttv-title"><h3>${escapeHtml(wd.trim())}</h3>${d.isToday ? '<span class="ttv-badge">сегодня</span>' : ''}</div>
					<div class="ttv-info">${count ? `${count} ${count === 1 ? 'пара' : count < 5 ? 'пары' : 'пар'}${span ? ' · ' + span : ''}` : 'пар нет'}</div>
				</header>
				${count ? `<div class="hm-timeline">${timelineHtml(d.pairs, d.isToday, true, d.date)}</div>` : ''}
			</section>`;
		}).join('');
	};
	render();
	setInterval(render, 60 * 1000);
	document.addEventListener('etis3-notes-changed', render);
	days[0].before(wrap);
	days.forEach(d => d.classList.add('etis3-orig'));
	return wrap;
}


// ============================================================
// ЧТО НОВОГО — один раз после обновления
// ============================================================

const CHANGELOG = [
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
	] : entries.flatMap(([, list]) => list);
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
		<a class="ttw-arrow${next ? '' : ' ttw-arrow--off'}" ${next ? `href="${escapeHtml(next)}"` : ''} aria-label="Следующая неделя"><span class="material-icons">chevron_right</span></a>`;
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


// ============================================================
// ЗАМЕТКИ И ДЗ К ПАРАМ
// ============================================================
// Хранятся в chrome.storage.local (в userscript — в localStorage), ключ —
// дата | номер пары | дисциплина. Вместе с текстом сохраняем данные пары,
// чтобы заметку можно было открыть и с другой недели, и с Главной.

const NOTES_KEY = 'etis3-notes';
let pairNotes = {};
const pairRegistry = new Map();

function noteKey(date, num, name) { return `${date ? ymd(date) : '—'}|${num}|${disciplineKey(name)}`; }

function registerPair(p, date) {
	const key = noteKey(date, p.num, p.name);
	pairRegistry.set(key, { name: p.name, num: p.num, type: p.type ? p.type.label : '', icon: p.type ? p.type.icon : '',
		aud: p.aud || '', teacher: p.teacher || '', date: date ? ymd(date) : '' });
	return key;
}

try {
	chrome.storage.local.get(NOTES_KEY, r => {
		pairNotes = (r && r[NOTES_KEY]) || {};
		if (Object.keys(pairNotes).length) document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
	});
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !changes[NOTES_KEY]) return;
		pairNotes = changes[NOTES_KEY].newValue || {};
		document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
	});
} catch (e) {}

function saveNote(key, patch) {
	const pair = pairRegistry.get(key) || pairNotes[key]?.pair;
	const next = { ...(pairNotes[key] || {}), ...patch, pair, updated: Date.now() };
	if (!next.text?.trim() && !next.done) delete pairNotes[key];
	else { next.text = next.text || ''; pairNotes[key] = next; }
	// Старые выполненные заметки (больше 60 дней) убираем
	const cutoff = ymd(new Date(Date.now() - 60 * 864e5));
	Object.keys(pairNotes).forEach(k => { const n = pairNotes[k]; if (n.done && n.pair?.date && n.pair.date < cutoff) delete pairNotes[k]; });
	try { chrome.storage.local.set({ [NOTES_KEY]: pairNotes }); } catch (e) {}
	document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
}

function dateFromYmd(s) { const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }

function relDay(s) {
	const d = dateFromYmd(s);
	if (!d) return '';
	const today = new Date(new Date().setHours(0, 0, 0, 0));
	const diff = Math.round((d - today) / 864e5);
	if (diff === 0) return 'сегодня';
	if (diff === 1) return 'завтра';
	if (diff === -1) return 'вчера';
	if (diff > 1 && diff < 7) return d.toLocaleDateString('ru-RU', { weekday: 'long' });
	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

// Блок «Заметки и ДЗ» на Главной: невыполненное (включая просроченное) и выполненное за сегодня
function tasksHtml() {
	const today = ymd(new Date());
	const list = Object.entries(pairNotes)
		.filter(([, n]) => n.text?.trim() && (!n.done || n.pair?.date === today))
		.sort((a, b) => (a[1].done - b[1].done) || String(a[1].pair?.date).localeCompare(String(b[1].pair?.date)))
		.slice(0, 6);
	if (!list.length) return `<div class="hm-empty hm-tasks-empty"><span class="material-icons">touch_app</span><span>Нажми на любую пару в расписании — добавишь заметку или домашку. Они появятся здесь.</span></div>`;
	return `<div class="hm-list">${list.map(([key, n]) => {
		const late = !n.done && n.pair?.date && n.pair.date < today;
		return `<div class="hm-task etis3-dis${n.done ? ' hm-task--done' : ''}${late ? ' hm-task--late' : ''}" style="--dis-h:${disciplineHue(n.pair?.name || '')}">
			<button type="button" class="hm-task-check" data-note-toggle="${escapeHtml(key)}" title="${n.done ? 'Вернуть' : 'Выполнено'}"><span class="material-icons">${n.done ? 'check_circle' : 'radio_button_unchecked'}</span></button>
			<div class="hm-task-body" data-key="${escapeHtml(key)}" role="button" tabindex="0">
				<div class="hm-task-text">${escapeHtml(n.text.split('\n')[0])}</div>
				<div class="hm-task-meta"><i></i>${escapeHtml(n.pair?.name || '')}<span>${escapeHtml(late ? 'просрочено · ' + relDay(n.pair.date) : relDay(n.pair?.date))}</span></div>
			</div>
		</div>`;
	}).join('')}</div>`;
}

// ---------- Карточка пары ----------
function openPairSheet(key) {
	const p = pairRegistry.get(key) || pairNotes[key]?.pair;
	if (!p || document.getElementById('etis3-pair-sheet')) return;
	const note = pairNotes[key] || {};
	const slot = PAIR_SCHEDULE.find(x => x.num === p.num);
	const date = dateFromYmd(p.date);
	const wrap = createEl('div', { id: 'etis3-pair-sheet', role: 'dialog', 'aria-label': p.name });
	wrap.innerHTML = `
		<div class="ps-box etis3-dis" style="--dis-h:${disciplineHue(p.name)}">
			<div class="ps-grab"></div>
			<header class="ps-head">
				<i class="ps-dot"></i>
				<div class="ps-title">
					<h3>${escapeHtml(p.name)}</h3>
					${p.type ? `<span class="ps-type"><span class="material-icons">${p.icon || 'class'}</span>${escapeHtml(p.type)}</span>` : ''}
				</div>
				<button type="button" class="ps-close" aria-label="Закрыть"><span class="material-icons">close</span></button>
			</header>
			<div class="ps-rows">
				${date ? `<div><span class="material-icons">calendar_today</span>${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>` : ''}
				<div><span class="material-icons">schedule</span>${slot ? `${formatTime(...slot.start)}–${formatTime(...slot.end)} · ` : ''}${p.num} пара</div>
				${p.aud ? `<div><span class="material-icons">room</span>${escapeHtml(p.aud)}</div>` : ''}
				${p.teacher ? `<div><span class="material-icons">person</span>${escapeHtml(p.teacher)}</div>` : ''}
			</div>
			<label class="ps-label" for="ps-note">Заметка или домашнее задание</label>
			<textarea id="ps-note" rows="4" placeholder="Что задали, что взять с собой, что не забыть…">${escapeHtml(note.text || '')}</textarea>
			<div class="ps-actions">
				<label class="ps-done"><input type="checkbox" ${note.done ? 'checked' : ''}><span class="ps-check"><span class="material-icons">check</span></span>Выполнено</label>
				<button type="button" class="ps-copy"><span class="material-icons">content_copy</span>Скопировать</button>
			</div>
		</div>`;
	document.body.appendChild(wrap);
	requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));

	const ta = wrap.querySelector('textarea'), done = wrap.querySelector('.ps-done input');
	let timer = null;
	const persist = () => { clearTimeout(timer); saveNote(key, { text: ta.value, done: done.checked }); };
	ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(persist, 400); });
	done.addEventListener('change', persist);
	wrap.querySelector('.ps-copy').addEventListener('click', () => {
		const text = [p.name + (p.type ? ` (${p.type.toLowerCase()})` : ''),
			[date ? date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : '', slot ? `${formatTime(...slot.start)}–${formatTime(...slot.end)}` : `${p.num} пара`].filter(Boolean).join(', '),
			p.aud, p.teacher, ta.value.trim() ? '\n' + ta.value.trim() : ''].filter(Boolean).join('\n');
		navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано')).catch(() => showToast('Не удалось скопировать'));
	});
	const close = () => {
		persist();
		wrap.classList.remove('show');
		document.removeEventListener('keydown', onKey);
		setTimeout(() => wrap.remove(), 300);
	};
	const onKey = e => { if (e.key === 'Escape') close(); };
	document.addEventListener('keydown', onKey);
	wrap.querySelector('.ps-close').addEventListener('click', close);
	wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
	// Не на телефоне — сразу в поле заметки (на телефоне клавиатура закрыла бы карточку)
	if (!('ontouchstart' in window)) setTimeout(() => ta.focus({ preventScroll: true }), 250);
}

// Тап по паре или заметке открывает карточку; кружок на Главной отмечает «выполнено»
document.addEventListener('click', e => {
	const toggle = e.target.closest('[data-note-toggle]');
	if (toggle) {
		const key = toggle.dataset.noteToggle;
		saveNote(key, { done: !pairNotes[key]?.done });
		return;
	}
	const el = e.target.closest('.hm-pair[data-key], .hm-task-body[data-key]');
	if (!el || e.target.closest('a')) return;
	openPairSheet(el.dataset.key);
});
document.addEventListener('keydown', e => {
	if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.hm-pair[data-key], .hm-task-body[data-key]')) {
		e.preventDefault();
		openPairSheet(e.target.dataset.key);
	}
});

	}
	if (document.documentElement) main();
	else {
		const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); main(); } });
		mo.observe(document, { childList: true });
	}
})();
