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
	initWideTables();
});

// Таблицы шире своей колонки (на телефоне) листаются вбок, а не обрезаются карточкой
function initWideTables() {
	const mark = () => {
		document.querySelectorAll('.span9 table').forEach(t => {
			if (t.classList.contains('etis3-orig') || t.closest('.etis3-view')) return;
			t.classList.remove('etis3-wide');
			const box = t.parentElement;
			if (box && t.offsetWidth && t.scrollWidth > box.clientWidth + 2) t.classList.add('etis3-wide');
		});
	};
	mark();
	let timer;
	window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(mark, 150); });
	document.fonts?.ready?.then(mark);
}


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





