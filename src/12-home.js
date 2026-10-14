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
	pageListen(window, 'hashchange', apply);
	pageCleanup(() => document.documentElement.classList.remove('etis3-home'));
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
	discs.forEach(d => { const keys = gradeKeys(disciplineKey(d.name), d.kts, 'cur'); d.kts.forEach((k, i) => {
		if (k.grade === null) return;
		const s = seen[keys[i]] ?? seen[legacyGradeKey(disciplineKey(d.name), i, k.topic)];
		recent.push({ dis: d.name, topic: k.topic, grade: k.grade, max: k.max, pass: k.pass, status: k.status,
			date: k.date, t: parseRuDate(k.date), fresh: !!(s && s.t && now - s.t < NEW_GRADE_DAYS * 864e5) });
	}); });
	recent.sort((a, b) => b.t - a.t);
	return {
		term: /триместр/i.test(doc.querySelector('.submenu')?.textContent || '') ? 'триместр' : 'семестр',
		discs: discs.map(d => ({ name: d.name, cur: d.cur, max: d.max, left: d.left, failed: d.failed, pending: d.pending, passed: d.passed,
			debts: d.kts.filter(k => k.status === 'failed').map(k => k.topic) })),
		recent: recent.slice(0, 6),
	};
}

// Кэш привязан к студенту: на общем компьютере второй не увидит оценки первого
function homeOwner() { return document.querySelector('.etis3-profile')?.title || ''; }
function readHomeCache() {
	let c = {};
	try { c = JSON.parse(localStorage.getItem(HOME_CACHE_KEY)) || {}; } catch (e) {}
	return c.owner === homeOwner() ? c : { owner: homeOwner() };
}

async function refreshHomeData() {
	const cache = readHomeCache();
	const jobs = [
		['grades', 'stu.signs?p_mode=current', doc => readGrades(doc)],
		['notes',  'stu.teacher_notes',        doc => readFeed(doc, 'notes')],
		['ann',    'stu_ann.announces',        doc => readFeed(doc, 'ann')],
	];
	await Promise.all(jobs.map(async ([key, path, parse]) => {
		try { cache[key] = parse(await fetchEtisPage(path)); cache[key + 'At'] = Date.now(); delete cache[key + 'Err']; }
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
	const d = new Date(t), now = etisNow();
	const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
	if (days === 0) return 'сегодня';
	if (days === 1) return 'вчера';
	if (days < 7)   return `${days} дн. назад`;
	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

let homeRedraw = null;

// Ближайший учебный день из кэша расписания (на воскресенье и конец недели)
function nextDayFromCache(now) {
	const c = readWeekCache();
	if (!c) return null;
	const today = ymd(now);
	const key = Object.keys(c.days).filter(k => k > today && c.days[k].length).sort()[0];
	return key ? { date: dateFromYmd(key), count: c.days[key].length } : null;
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
	refreshHomeData().then(fresh => { if (isHomeRoute() && home.isConnected) draw(fresh, false); });
	// Перерисовка по заметкам и раз в минуту (следующая пара, прогресс). Подписка одна на страницу,
	// а рисует всегда текущий дашборд — его пересоздают при каждом заходе на #home.
	homeRedraw = () => { if (isHomeRoute() && home.isConnected) draw(lastData, lastLoading); };
	if (!span9.dataset.homeHooked) {
		span9.dataset.homeHooked = '1';
		pageListen(document, 'etis3-notes-changed', () => homeRedraw?.());
		pageInterval(() => homeRedraw?.(), 60 * 1000);
		pageCleanup(() => { homeRedraw = null; });
	}

	function draw(data, loading) {
		lastData = data; lastLoading = loading;
		let seenFeed = {};
		try { seenFeed = JSON.parse(localStorage.getItem(SEEN_FEED_KEY)) || {}; } catch (e) {}
		const name  = (document.querySelector('.etis3-profile')?.title || '').split(/\s+/)[1] || '';
		const now   = etisNow();
		const today = week.find(d => d.isToday);
		const nextDay = week.find(d => d.date && d.date > now && !d.isToday && d.pairs.length);
		const st    = todayStatus();

		// --- герой ---
		const todayPairs = today ? today.pairs : [];
		let summary;
		const later   = !today && !nextDay ? nextDayFromCache(now) : null;
		const laterTx = later ? ` Следующие пары — ${later.date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}.` : '';
		if (!today && !week.length) summary = 'Расписание этой недели не загружено.';
		else if (!today) summary = nextDay ? `Сегодня пар нет. Следующие — ${nextDay.title.split(',')[0].toLowerCase()}.` : `Сегодня выходной.${laterTx || ' Отдыхай.'}`;
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
					<div class="hm-actions">
						<button type="button" class="hm-wrapped" data-wrapped><span class="material-icons">auto_awesome</span>Итоги семестра<span class="material-icons">arrow_forward</span></button>
						${(() => { const n = sessionCountdownQuick(); return `<button type="button" class="hm-sessbtn" data-session-prep><span class="material-icons">event_available</span>${n === null ? 'Подготовка к сессии' : n === 0 ? 'Сессия уже идёт' : `До сессии ${n} ${plural(n, 'день', 'дня', 'дней')}`}</button>`; })()}
					</div>
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


