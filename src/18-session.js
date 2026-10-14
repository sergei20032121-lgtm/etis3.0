// ============================================================
// ПОДГОТОВКА К СЕССИИ: даты экзаменов, отсчёт, калькулятор баллов
// ============================================================

const SCALE_KEY = 'etis3-grade-scale';
// Шкала ПГНИУ: 5 — от 81, 4 — от 61, 3 и зачёт — от 41 балла из 100
const SCALE_DEFAULT = { 5: 81, 4: 61, 3: 41 };

function readScale() {
	try {
		const s = JSON.parse(localStorage.getItem(SCALE_KEY));
		if (s && s[5] > s[4] && s[4] > s[3] && s[3] > 0 && s[5] <= 100) return s;
	} catch (e) {}
	return { ...SCALE_DEFAULT };
}

// Баллы → оценка по шкале (в процентах от максимума дисциплины)
function gradeFor(points, max, report, scale) {
	const pct = max ? points / max * 100 : 0;
	if (/зач/i.test(report) && !/диф|с\s*оценк/i.test(report)) return pct >= scale[3] ? { mark: 'зачёт', cls: 'g5' } : { mark: 'незачёт', cls: 'g2' };
	if (pct >= scale[5]) return { mark: '5', cls: 'g5' };
	if (pct >= scale[4]) return { mark: '4', cls: 'g4' };
	if (pct >= scale[3]) return { mark: '3', cls: 'g3' };
	return { mark: '2', cls: 'g2' };
}

// Недели из ленты расписания: номер, ссылка, сессия ли, дата начала
function readWeeks(doc) {
	const items = [...doc.querySelectorAll('.weeks li')];
	const cur = items.find(li => li.classList.contains('current'));
	const m = (doc.body?.textContent || '').match(/Неделя с (\d{2})\.(\d{2})\.(\d{4})/);
	const curStart = m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
	const curNum = cur ? parseInt(cur.textContent, 10) : NaN;
	return items.map(li => {
		const num = parseInt(li.textContent, 10);
		const a = li.querySelector('a[href]');
		return {
			num, href: a ? new URL(a.getAttribute('href'), location.href).href : null,
			session: li.classList.contains('session') || /аттестац|сесси|экзамен/i.test(li.title || ''),
			current: li === cur,
			start: curStart && !isNaN(num) && !isNaN(curNum) ? new Date(curStart.getTime() + (num - curNum) * 7 * 864e5) : null,
		};
	}).filter(w => !isNaN(w.num));
}

// Экзамены, зачёты и консультации из расписания недели
function readExamPairs(doc) {
	const out = [];
	doc.querySelectorAll('div.day').forEach(day => {
		const date = parseDayDate(day.querySelector('h3')?.textContent || '');
		if (!date) return;
		day.querySelectorAll('tr').forEach(row => {
			const time = row.querySelector('.pair_num .eval')?.textContent.match(/(\d{1,2})[:.](\d{2})/);
			row.querySelectorAll('.pair_info .dis a, .pair_info .dis').forEach(a => {
				if (a.matches('.dis') && a.querySelector('a')) return;
				const full = a.textContent.replace(/\s+/g, ' ').trim();
				const tm = full.match(/\(([^()]*)\)\s*$/);
				const kind = tm ? tm[1].toLowerCase() : '';
				const type = /^экз/.test(kind) ? 'exam' : /^зач|диф/.test(kind) ? 'credit' : /^конс/.test(kind) ? 'consult' : null;
				if (!type) return;
				const box = a.closest('.pair_info > div') || row;
				const when = new Date(date);
				if (time) when.setHours(+time[1], +time[2]);
				out.push({ type, name: tm ? full.slice(0, tm.index).trim() : full, when, aud: box.querySelector('.aud')?.textContent.replace(/\s+/g, ' ').trim() || '' });
			});
		});
	});
	return out;
}

async function sessionCollect() {
	const onTimetable = location.pathname.endsWith('stu.timetable') && document.querySelector('.weeks');
	const [signsDoc, planDoc, ttDoc] = await Promise.all([
		fetchEtisPage('stu.signs?p_mode=current'),
		fetchEtisPage('stu.teach_plan').catch(() => null),
		onTimetable ? Promise.resolve(document) : fetchEtisPage('stu.timetable').catch(() => null),
	]);
	const term = (wrappedTerms(signsDoc).find(t => t.current) || {}).label || '';
	const dis = [...signsDoc.querySelectorAll('table.common')].map(parseSignsTable).filter(Boolean);

	// Отчётность по учебному плану текущего семестра
	const reports = {};
	if (planDoc && term) {
		const h = [...planDoc.querySelectorAll('h3')].find(x => x.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === term.toLowerCase());
		const table = h?.nextElementSibling?.matches('table.common') ? h.nextElementSibling : null;
		planRows(table).forEach(({ c, group }) => {
			reports[disciplineKey(c[0]?.textContent || '')] = { name: c[0]?.textContent.trim() || '', report: c[1]?.textContent.trim() || '', choice: group > 0 };
		});
	}

	const weeks = ttDoc ? readWeeks(ttDoc) : [];
	const now = etisNow();
	const sessionWeeks = weeks.filter(w => w.session && w.href && (!w.start || w.start.getTime() + 7 * 864e5 > now.getTime()));
	const pairs = [];
	if (ttDoc && sessionWeeks.length) {
		const docs = await Promise.all(sessionWeeks.slice(0, 8).map(w => fetchEtisPage(w.href).catch(() => null)));
		docs.filter(Boolean).forEach(d => pairs.push(...readExamPairs(d)));
	}
	const seen = new Set();
	const uniq = pairs.filter(p => { const k = p.type + p.name + p.when.getTime(); if (seen.has(k)) return false; seen.add(k); return true; });
	return { term, dis, reports, weeks, sessionWeeks, pairs: uniq };
}

function sessionModel(data) {
	const now = Date.now();
	const items = {};
	const add = key => items[key] || (items[key] = { key, name: '', report: '', dis: null, exam: null, consult: null });
	data.dis.forEach(d => { const it = add(disciplineKey(d.name)); it.name = d.name; it.dis = d; });
	Object.entries(data.reports).forEach(([k, r]) => {
		if (!/экз|зач/i.test(r.report)) return;
		// Дисциплина по выбору — только та, которую студент выбрал (она есть в оценках или расписании)
		if (r.choice && !items[k] && !data.pairs.some(p => disciplineKey(p.name) === k)) return;
		const it = add(k); it.name = it.name || r.name; it.report = r.report;
	});
	data.pairs.filter(p => p.when.getTime() > now - 864e5).sort((a, b) => a.when - b.when).forEach(p => {
		const it = add(disciplineKey(p.name));
		it.name = it.name || p.name;
		if (p.type === 'consult') { if (!it.consult) it.consult = p; }
		else if (!it.exam) { it.exam = p; if (!it.report) it.report = p.type === 'exam' ? 'Экзамен' : 'Зачёт'; }
	});
	const list = Object.values(items).filter(it => it.report || it.exam);
	list.sort((a, b) => (a.exam ? a.exam.when : Infinity) - (b.exam ? b.exam.when : Infinity) || (/экз/i.test(b.report) - /экз/i.test(a.report)) || a.name.localeCompare(b.name));
	// Ближайший экзамен — из ещё не прошедших
	const firstExam = list.map(it => it.exam).filter(e => e && e.when.getTime() >= now).sort((a, b) => a.when - b.when)[0] || null;
	const sessionStart = data.sessionWeeks.find(w => w.start)?.start || null;
	return { list, firstExam, sessionStart };
}

function daysUntil(date) {
	const a = etisNow(); a.setHours(0, 0, 0, 0);
	const b = new Date(date); b.setHours(0, 0, 0, 0);
	return Math.round((b - a) / 864e5);
}

function daysLabel(n) {
	if (n <= 0) return n === 0 ? 'сегодня' : 'прошло';
	if (n === 1) return 'завтра';
	return `через ${n} ${plural(n, 'день', 'дня', 'дней')}`;
}

// Отсчёт для Главной — по ленте недель на странице расписания, без запросов
function sessionCountdownQuick() {
	const weeks = readWeeks(document);
	const now = Date.now();
	const w = weeks.find(x => x.session && x.start && x.start.getTime() + 7 * 864e5 > now);
	if (!w) return null;
	const n = daysUntil(w.start);
	return n > 0 ? n : 0;
}

async function openSessionPrep() {
	document.getElementById('etis3-sess')?.remove();
	const root = createEl('div', { id: 'etis3-sess', className: 'sp', role: 'dialog', 'aria-label': 'Подготовка к сессии' });
	root.innerHTML = `<div class="sp-sheet"><button type="button" class="sp-close" aria-label="Закрыть"><span class="material-icons">close</span></button>
		<div class="sp-body"><div class="sp-loading"><div class="wr-spinner"></div>Собираем экзамены и баллы…</div></div></div>`;
	document.body.appendChild(root);
	document.documentElement.classList.add('etis3-wr-open');
	requestAnimationFrame(() => root.classList.add('sp--in'));
	const close = () => {
		root.classList.remove('sp--in');
		document.documentElement.classList.remove('etis3-wr-open');
		document.removeEventListener('keydown', onKey, true);
		setTimeout(() => root.remove(), 300);
		if (location.hash === '#session') history.replaceState(null, '', location.pathname + location.search);
	};
	const onKey = e => { if (e.key === 'Escape' && !e.target.closest?.('input')) { e.stopPropagation(); close(); } };
	document.addEventListener('keydown', onKey, true);
	root.querySelector('.sp-close').addEventListener('click', close);
	root.addEventListener('click', e => { if (e.target === root) close(); });

	let data;
	try { data = await sessionCollect(); }
	catch (e) {
		root.querySelector('.sp-body').innerHTML = `<div class="sp-loading"><span class="material-icons">cloud_off</span>${e.message === 'login' ? 'Сессия ЕТИС закончилась — войди заново.' : 'Не получилось загрузить данные ЕТИС.'}</div>`;
		return;
	}
	if (!root.isConnected) return;
	renderSessionPrep(root.querySelector('.sp-body'), data);
}

function renderSessionPrep(body, data) {
	const m = sessionModel(data);
	let scale = readScale();
	const fmtDate = d => d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }) + (d.getHours() ? `, ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` : '');
	const target = m.firstExam ? m.firstExam.when : m.sessionStart;
	const n = target ? daysUntil(target) : null;
	const exams = m.list.filter(it => /экз/i.test(it.report)).length;

	body.innerHTML = `
		<header class="sp-hero">
			<div class="sp-kicker">Подготовка к сессии${data.term ? ' · ' + escapeHtml(data.term) : ''}</div>
			${n !== null ? `<div class="sp-count"><b>${Math.max(0, n)}</b><span>${plural(Math.max(0, n), 'день', 'дня', 'дней')}<small>${m.firstExam ? 'до первого экзамена или зачёта' : 'до недель сессии'}</small></span></div>`
				: '<div class="sp-count sp-count--none"><span>Даты сессии пока не видны<small>Появятся, когда ЕТИС опубликует расписание сессии</small></span></div>'}
			<div class="sp-chips">
				<span>${exams} ${plural(exams, 'экзамен', 'экзамена', 'экзаменов')}</span>
				<span>${m.list.length - exams} ${plural(m.list.length - exams, 'зачёт', 'зачёта', 'зачётов')}</span>
				${target ? `<span>${escapeHtml(fmtDate(target).replace(/,\s*\d+:\d+$/, ''))}</span>` : ''}
			</div>
		</header>
		<div class="sp-scale">
			<span class="material-icons">tune</span>
			<span>Шкала: 5 — от <input type="number" min="1" max="100" data-scale="5" value="${scale[5]}">, 4 — от <input type="number" min="1" max="100" data-scale="4" value="${scale[4]}">, 3 / зачёт — от <input type="number" min="1" max="100" data-scale="3" value="${scale[3]}">% баллов</span>
		</div>
		<div class="sp-list">${m.list.map((it, i) => sessionCard(it, i, fmtDate)).join('') || '<div class="hm-empty">В этом семестре не нашлось экзаменов и зачётов</div>'}</div>`;

	// Калькулятор: ползунки по оставшимся КТ
	const update = card => {
		const it = m.list[+card.dataset.i];
		const d = it.dis;
		if (!d) return;
		const planned = [...card.querySelectorAll('.sp-kt input')].reduce((s, r) => s + (+r.value || 0), 0);
		const total = d.cur + planned;
		const g = gradeFor(total, d.max, it.report, scale);
		card.querySelector('.sp-total b').textContent = fmtNum(total);
		const badge = card.querySelector('.sp-proj');
		// Пока ничего не запланировано, а КТ ещё впереди — прогноз не пугаем «двойкой»
		const unplanned = !planned && d.left > 0;
		badge.className = unplanned ? 'sp-proj' : `sp-proj sp-proj--${g.cls}`;
		badge.textContent = unplanned ? '—' : g.mark;
		badge.title = unplanned ? 'Подвигай ползунки или нажми цель — покажу итоговую оценку' : 'Оценка, если получишь запланированные баллы';
		card.querySelectorAll('.sp-kt').forEach(row => { row.querySelector('output').textContent = row.querySelector('input').value; });
		card.querySelector('.sp-bar i').style.width = `${d.max ? Math.min(100, total / d.max * 100) : 0}%`;
	};
	const need = (it, mark) => {
		const pct = /зач/i.test(it.report) && !/диф/i.test(it.report) ? scale[3] : scale[mark];
		return Math.max(0, Math.ceil(it.dis.max * pct / 100 - it.dis.cur));
	};
	const hint = card => {
		const it = m.list[+card.dataset.i];
		const d = it.dis;
		const el = card.querySelector('.sp-hint');
		if (!d || !el) return;
		const marks = /зач/i.test(it.report) && !/диф/i.test(it.report) ? [3] : [5, 4, 3];
		el.innerHTML = marks.map(mk => {
			const x = need(it, mk);
			const label = mk === 3 && marks.length === 1 ? 'зачёт' : mk;
			if (!x) return `<span class="sp-need sp-need--ok"><b>${label}</b>уже есть</span>`;
			if (x > d.left) return `<span class="sp-need sp-need--bad"><b>${label}</b>не добрать</span>`;
			return `<span class="sp-need" data-target="${mk}" role="button" tabindex="0"><b>${label}</b>ещё ${x} из ${d.left} · ${Math.round(x / d.left * 100)}%</span>`;
		}).join('');
		el.querySelectorAll('[data-target]').forEach(b => b.addEventListener('click', () => {
			// Раскладываем нужные баллы пропорционально максимумам оставшихся КТ
			const x = need(it, +b.dataset.target);
			const rows = [...card.querySelectorAll('.sp-kt input')];
			const k = d.left ? x / d.left : 0;
			let rest = x;
			rows.forEach((r, i) => { const v = i === rows.length - 1 ? Math.min(+r.max, rest) : Math.min(+r.max, Math.ceil(+r.max * k)); r.value = v; rest -= v; });
			update(card);
		}));
	};
	body.querySelectorAll('.sp-card').forEach(card => {
		card.querySelectorAll('.sp-kt input').forEach(r => r.addEventListener('input', () => update(card)));
		update(card); hint(card);
	});
	body.querySelectorAll('.sp-head').forEach(h => h.addEventListener('click', () => h.closest('.sp-card').classList.toggle('sp-card--open')));
	body.querySelectorAll('[data-scale]').forEach(inp => inp.addEventListener('change', () => {
		const next = { ...scale, [inp.dataset.scale]: Math.max(1, Math.min(100, parseInt(inp.value, 10) || scale[inp.dataset.scale])) };
		if (next[5] > next[4] && next[4] > next[3]) { scale = next; try { localStorage.setItem(SCALE_KEY, JSON.stringify(scale)); } catch (e) {} }
		inp.value = scale[inp.dataset.scale];
		body.querySelectorAll('.sp-card').forEach(card => { update(card); hint(card); });
	}));
}

function sessionCard(it, i, fmtDate) {
	const d = it.dis;
	const kind = /диф/i.test(it.report) ? 'Диф. зачёт' : /экз/i.test(it.report) ? 'Экзамен' : 'Зачёт';
	const days = it.exam ? daysUntil(it.exam.when) : null;
	const pending = d ? d.kts.filter(k => k.status === 'pending' && k.max) : [];
	return `
		<section class="sp-card etis3-dis${i === 0 ? ' sp-card--open' : ''}" data-i="${i}" style="--dis-h:${disciplineHue(it.name)}">
			<div class="sp-head" role="button" tabindex="0">
				<div class="sp-when">${it.exam ? `<b>${it.exam.when.getDate()}</b><span>${it.exam.when.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</span>` : '<span class="material-icons">event_busy</span>'}</div>
				<div class="sp-info">
					<div class="sp-name">${escapeHtml(it.name)}</div>
					<div class="sp-sub"><span class="sp-kind sp-kind--${/экз/i.test(it.report) ? 'exam' : 'credit'}">${kind}</span>${it.exam ? `${escapeHtml(daysLabel(days))}${it.exam.aud ? ' · ' + escapeHtml(it.exam.aud) : ''}` : 'дата пока не известна'}</div>
					${it.consult ? `<div class="sp-sub sp-consult"><span class="material-icons">support_agent</span>консультация ${escapeHtml(fmtDate(it.consult.when))}</div>` : ''}
				</div>
				${d ? '<span class="sp-proj">—</span>' : ''}
				<span class="material-icons sp-chev">expand_more</span>
			</div>
			${d ? `
			<div class="sp-calc">
				<div class="sp-total"><span>Баллы</span><b>${fmtNum(d.cur)}</b><span>из ${fmtNum(d.max)}</span><div class="sp-bar"><i></i></div></div>
				<div class="sp-hint"></div>
				${pending.length ? `<div class="sp-kts-title">Сколько думаешь получить за оставшиеся КТ</div>
				<div class="sp-kts">${pending.map(k => `
					<label class="sp-kt"><span title="${escapeHtml(k.topic)}">${escapeHtml(k.topic)}</span>
						<input type="range" min="0" max="${k.max}" step="1" value="0"><output>0</output><small>/ ${fmtNum(k.max)}</small></label>`).join('')}</div>`
				: '<div class="sp-sub">Все контрольные точки уже оценены</div>'}
			</div>` : ''}
		</section>`;
}

function initSessionPrep() {
	if (!document.querySelector('div.span3')) return;
	paletteItems.push({ label: 'Подготовка к сессии', icon: 'event_available', hint: 'Действие', run: () => openSessionPrep() });
	document.addEventListener('click', e => {
		const b = e.target.closest('[data-session-prep]');
		if (!b) return;
		e.preventDefault();
		openSessionPrep();
	});
	const fromHash = () => { if (location.hash === '#session') openSessionPrep(); };
	window.addEventListener('hashchange', fromHash);
	fromHash();
}
onReady(initSessionPrep);
