
// ============================================================
// СООБЩИТЬ О ПРОБЛЕМЕ — готовый отчёт для GitHub или Telegram
// ============================================================
// В отчёт попадает только техническое: версия, где запущено, страница (без id и данных),
// размер экрана, настройки вида и последние ошибки скрипта. Ни ФИО, ни оценок, ни cookie.

const REPORT_REPO = 'https://github.com/sergei20032121-lgtm/etis3.0';

function reportPlatform() {
	const ua = navigator.userAgent;
	const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'другая ОС';
	const browser = /YaBrowser\/[\d.]+/.exec(ua)?.[0] || /Edg\/[\d.]+/.exec(ua)?.[0] || /Firefox\/[\d.]+/.exec(ua)?.[0]
		|| /Chrome\/[\d.]+/.exec(ua)?.[0] || (/Safari/.test(ua) ? 'Safari ' + (/Version\/([\d.]+)/.exec(ua)?.[1] || '') : 'браузер');
	const kind = IS_APP ? 'Android-приложение' : IS_USERSCRIPT ? (os === 'iOS' ? 'userscript (Stay)' : 'userscript') : 'расширение';
	return `${kind} · ${os} · ${browser}`;
}

// Страница без персональных параметров: только имя и режимы
function reportPage() {
	const keep = ['p_mode', 'p_term', 'p_week', 'p_cons'];
	const u = new URL(location.href);
	const q = keep.filter(k => u.searchParams.has(k)).map(k => `${k}=${u.searchParams.get(k)}`).join('&');
	return u.pathname.split('/').pop() + (q ? '?' + q : '') + (u.hash && /^#[a-z-]+$/i.test(u.hash) ? u.hash : '');
}

function reportInfo() {
	let version = '?';
	try { version = chrome.runtime.getManifest().version; } catch (e) {}
	const lines = [
		`Версия: ${version}`,
		`Где: ${reportPlatform()}`,
		`Страница: ${reportPage()}`,
		`Экран: ${innerWidth}×${innerHeight} @${Math.round(devicePixelRatio * 100) / 100}x`,
		`Вид: ${settings.layout}, тема ${settings.theme} (${document.documentElement.getAttribute('theme')}), акцент ${settings.accent}, фон ${settings.wallpaper}, шрифт ${settings.fontSize}px`,
	];
	if (recentErrors.length) {
		lines.push('Ошибки скрипта:');
		recentErrors.forEach(e => lines.push(`  ${e.at} ${e.msg}${e.where ? ' (' + e.where + ')' : ''}`));
	} else lines.push('Ошибок скрипта не было');
	return lines.join('\n');
}

function openReportDialog() {
	document.getElementById('etis3-report')?.remove();
	const info = reportInfo();
	const root = createEl('div', { id: 'etis3-report', className: 'rp', role: 'dialog', 'aria-label': 'Сообщить о проблеме' });
	root.innerHTML = `
		<div class="rp-card">
			<div class="rp-head"><span class="material-icons">bug_report</span><h2>Сообщить о проблеме</h2>
				<a href="#" class="rp-close" aria-label="Закрыть"><span class="material-icons">close</span></a></div>
			<textarea class="rp-text" rows="4" placeholder="Что случилось и что ожидали? Например: «на странице оценок не видно последней колонки»"></textarea>
			<label class="rp-check"><input type="checkbox" checked> Приложить техническую информацию</label>
			<pre class="rp-info">${escapeHtml(info)}</pre>
			<div class="rp-note">Без ФИО, оценок и данных входа — только то, что видно выше. Скриншот можно приложить уже на GitHub или в Telegram.</div>
			<div class="rp-actions">
				<a href="#" class="rp-btn rp-btn--main" data-act="github"><span class="material-icons">open_in_new</span>Открыть на GitHub</a>
				<a href="#" class="rp-btn" data-act="copy"><span class="material-icons">content_copy</span>Скопировать для Telegram</a>
			</div>
		</div>`;
	document.body.appendChild(root);
	requestAnimationFrame(() => root.classList.add('rp--in'));
	const text = root.querySelector('.rp-text');
	const withInfo = root.querySelector('.rp-check input');
	const pre = root.querySelector('.rp-info');
	withInfo.addEventListener('change', () => { pre.hidden = !withInfo.checked; });
	setTimeout(() => text.focus(), 50);

	const close = () => { root.classList.remove('rp--in'); setTimeout(() => root.remove(), 200); document.removeEventListener('keydown', onKey, true); };
	const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
	document.addEventListener('keydown', onKey, true);
	root.addEventListener('click', e => { if (e.target === root) close(); });
	root.querySelector('.rp-close').addEventListener('click', e => { e.preventDefault(); close(); });

	const compose = () => {
		const what = text.value.trim() || '(описание не заполнено)';
		return { what, full: what + (withInfo.checked ? '\n\n---\n' + info : '') };
	};
	root.querySelector('[data-act="github"]').addEventListener('click', e => {
		e.preventDefault();
		const { what, full } = compose();
		const title = what.split('\n')[0].slice(0, 80);
		const body = full.replace(/\n---\n/, '\n\n**Техническая информация**\n```\n') + (withInfo.checked ? '\n```' : '');
		window.open(`${REPORT_REPO}/issues/new?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
		close();
	});
	root.querySelector('[data-act="copy"]').addEventListener('click', async e => {
		e.preventDefault();
		const { full } = compose();
		let ok = false;
		try { await navigator.clipboard.writeText(full); ok = true; } catch (err) {
			const ta = createEl('textarea', { value: full });
			ta.style.cssText = 'position:fixed;opacity:0';
			document.body.appendChild(ta); ta.select();
			try { ok = document.execCommand('copy'); } catch (e2) {}
			ta.remove();
		}
		showToast(ok ? 'Скопировано — вставьте в Telegram' : 'Не получилось скопировать');
		if (ok) close();
	});
}

function initReport() {
	if (!document.querySelector('div.span3')) return;
	paletteItems.push({ label: 'Сообщить о проблеме', icon: 'bug_report', hint: 'Действие', run: () => openReportDialog() });
}
onReady(initReport);
