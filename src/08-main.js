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
function markWideTables() {
	document.querySelectorAll('.span9 table').forEach(t => {
		if (t.classList.contains('etis3-orig') || t.closest('.etis3-view')) return;
		t.classList.remove('etis3-wide');
		const box = t.parentElement;
		if (box && t.offsetWidth && t.scrollWidth > box.clientWidth + 2) t.classList.add('etis3-wide');
	});
}

function initWideTables() {
	const mark = markWideTables;
	mark();
	let timer;
	window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(mark, 150); });
	document.fonts?.ready?.then(mark);
}


// ============================================================
// ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ
// ============================================================

function initPageTransitions() {
	const soft = softNavEnabled();
	if (soft) initSoftNav();
	const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	if (reduced && !soft) return;

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
		// Файлы (вложения сообщений, документы) скачиваются, а не открываются — страница остаётся, затемнять нельзя
		if (/file_download|get_file|download|\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|jpe?g|png)$/i.test(url.pathname + url.search)) return;

		e.preventDefault();
		if (soft && canSoftNav(url)) { softNavigate(url.href); return; }
		if (reduced) { window.location.href = url.href; return; }
		overlay.classList.add('etis3-overlay--out');
		setTimeout(() => { window.location.href = url.href; }, 200);
		// Если вместо перехода началось скачивание или ссылка никуда не ведёт — снять затемнение
		setTimeout(() => overlay.classList.remove('etis3-overlay--out'), 2500);
	});
}


// ============================================================
// МЯГКИЕ ПЕРЕХОДЫ (iPhone)
// ============================================================
// Stay на iPhone подключает скрипт асинхронно, уже после того как Safari
// нарисовал голую страницу ЕТИСа, — при каждом переходе мелькает старый
// интерфейс. Поэтому там страницу не перезагружаем: забираем следующую
// запросом и подменяем только содержимое (div.span9).

// Страницы, которые можно подменять: без своих форм и скриптов, ломающихся без перезагрузки
const SOFT_NAV_PAGES = new Set([
	'stu.timetable', 'stu.signs', 'stu.teach_plan', 'stu.absence', 'stu.teachers',
	'stu_ann.announces', 'stu.announce', 'stu.teacher_notes', 'cert_pkg.stu_certif',
	'stu.about', 'stu.ses', 'stu.electr', 'stu.tpr',
]);

function softNavEnabled() {
	let force = null;
	try { force = localStorage.getItem('etis3-softnav'); } catch (e) {}
	if (force === '1') return true;
	if (force === '0') return false;
	const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
	return IS_USERSCRIPT && ios && !!document.querySelector('div.span3') && !!document.querySelector('div.span9');
}

function canSoftNav(url) {
	return url.origin === location.origin && SOFT_NAV_PAGES.has(url.pathname.split('/').pop())
		&& SOFT_NAV_PAGES.has(location.pathname.split('/').pop()) && !!document.querySelector('div.span9');
}

let softNavSeq = 0;
let softNavKey = location.pathname + location.search;

function initSoftNav() {
	history.replaceState({ ...(history.state || {}), etis3: 1 }, '', location.href);
	// «Назад» / «Вперёд»: если сменилась страница, а не только #якорь — подгружаем её
	window.addEventListener('popstate', () => {
		if (location.pathname + location.search === softNavKey) return;
		if (canSoftNav(new URL(location.href))) softNavigate(location.href, { push: false });
		else location.reload();
	});
}

async function softNavigate(href, { push = true } = {}) {
	const seq  = ++softNavSeq;
	const old  = document.querySelector('div.span9');
	const hard = () => { if (seq === softNavSeq) { if (push) location.href = href; else location.reload(); } };
	old?.classList.add('etis3-soft-leaving');
	document.documentElement.classList.add('etis3-soft-loading');

	let doc, finalUrl;
	try {
		const res = await fetch(href, { credentials: 'include' });
		if (!res.ok) throw new Error(res.status);
		finalUrl = new URL(res.url || href);
		const buf = await res.arrayBuffer();
		const ct  = res.headers.get('content-type') || '';
		const enc = /utf-?8/i.test(ct) ? 'utf-8' : 'windows-1251';
		doc = new DOMParser().parseFromString(new TextDecoder(enc).decode(buf), 'text/html');
	} catch (e) {
		return hard();
	}
	if (seq !== softNavSeq) return;
	document.documentElement.classList.remove('etis3-soft-loading');

	// Выкинуло на вход, ошибка, редирект куда-то ещё — обычный переход
	const span9 = doc.querySelector('div.span9');
	const target = new URL(href);
	if (!span9 || !doc.querySelector('div.span3') || finalUrl.pathname !== target.pathname) return hard();

	const warning = doc.querySelector('div.warning');
	if (warning) span9.prepend(warning);
	const fresh = document.importNode(span9, true);
	const scripts = [...fresh.querySelectorAll('script')];
	scripts.forEach(s => s.remove());

	resetPageScope();
	document.getElementById('etis3-home')?.remove();
	document.documentElement.classList.remove('etis3-home', 'etis3-sheet-open');
	(document.querySelector('div.span9') || old).replaceWith(fresh);
	document.title = doc.title || document.title;
	if (push) history.pushState({ etis3: 1 }, '', finalUrl.pathname + finalUrl.search + target.hash);
	softNavKey = location.pathname + location.search;

	runPageScripts(scripts, fresh);
	syncSidebarActive(doc);
	window.scrollTo(0, 0);
	try { stylePageContent(); } catch (e) { console.error('[ЕТИС 3.0]', e); }
	const sidebar = document.querySelector('div.span3');
	if (sidebar && !isHomeRoute()) topbarTitle(sidebar);
	markWideTables();

	fresh.classList.add('etis3-soft-entering');
	requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.remove('etis3-soft-entering')));
}

// Встроенные скрипты страницы (функции для onclick и т. п.) сами не выполнятся —
// подключаем их заново, внешние — только если их ещё нет
function runPageScripts(scripts, root) {
	scripts.forEach(old => {
		const src = old.getAttribute('src');
		if (src && [...document.scripts].some(s => s.src === new URL(src, location.href).href)) return;
		const s = document.createElement('script');
		if (src) s.src = src; else s.textContent = old.textContent;
		root.appendChild(s);
	});
}

// Подсветка пункта меню по свежей странице ЕТИСа
function syncSidebarActive(doc) {
	const sidebar = document.querySelector('div.span3');
	if (!sidebar) return;
	const activeHrefs = new Set([...doc.querySelectorAll('div.span3 li.active > a[href]')]
		.map(a => { try { return new URL(a.getAttribute('href'), location.href).href; } catch (e) { return ''; } }));
	const items = [...sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked > li')].filter(li => !li.classList.contains('etis3-nav-head'));
	const hrefOf = li => li.querySelector('a[href]')?.href || '';
	const exact = items.filter(li => hrefOf(li) === location.href);
	const on = exact.length ? exact : items.filter(li => activeHrefs.has(hrefOf(li)));
	items.forEach(li => li.classList.toggle('active', on.includes(li)));
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





