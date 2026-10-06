// Сборка userscript-версии: node tools/build-userscript.mjs
// Склеивает styles.css + settings.js + scripts.js в dist/etis3.user.js
// для Stay (Safari на iPhone/iPad) и Tampermonkey / Violentmonkey (Android, ПК).
// API расширения (chrome.storage, chrome.runtime) заменяются прослойкой на localStorage.
import fs from 'fs';
import path from 'path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const REPO = 'https://github.com/sergei20032121-lgtm/etis3.0';
const RAW  = 'https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/main/dist/etis3.user.js';

const css  = read('styles.css');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(read('icon.svg')).toString('base64');

const shim = `
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
				getManifest: () => ({ version: ${JSON.stringify(manifest.version)} }),
				getURL: p => p === 'icon.svg' ? ${JSON.stringify(icon)} : p,
				sendMessage: () => Promise.resolve(),
			},
		};
	})();

	// ---------- Стили ----------
	(() => {
		const style = document.createElement('style');
		style.id = 'etis3-userscript-css';
		style.textContent = ${JSON.stringify(css)};
		(document.head || document.documentElement).appendChild(style);
	})();
`;

const header = `// ==UserScript==
// @name         ЕТИС 3.0
// @namespace    ${REPO}
// @version      ${manifest.version}
// @description  ${manifest.description}
// @author       Комар
// @homepageURL  ${REPO}
// @match        https://student.psu.ru/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    ${RAW}
// @downloadURL  ${RAW}
// ==/UserScript==
`;

const body = `${header}
// Файл собран автоматически из исходников расширения (tools/build-userscript.mjs) — правьте исходники.
(function () {
	'use strict';
	// Менеджеры скриптов на document-start могут запустить нас ещё до <html> — ждём его
	function main() {
${shim}
	// ---------- settings.js ----------
${read('settings.js').replace(/^'use strict';\s*/m, '')}
	// ---------- scripts.js ----------
${read('scripts.js').replace(/^'use strict';\s*/m, '')}
	}
	if (document.documentElement) main();
	else {
		const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); main(); } });
		mo.observe(document, { childList: true });
	}
})();
`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'etis3.user.js'), body);
console.log(`dist/etis3.user.js — ${manifest.version}, ${(body.length / 1024).toFixed(0)} КБ`);
