// ============================================================
// СЕМЕСТР WRAPPED — итоги семестра сторис-слайдами
// ============================================================

const WR_MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
const WR_MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const WR_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function plural(n, one, few, many) {
	const a = Math.abs(n) % 100, b = a % 10;
	if (a > 10 && a < 20) return many;
	if (b > 1 && b < 5) return few;
	if (b === 1) return one;
	return many;
}

// Семестры со страницы «оценки в семестре»: [{ term, label, current }]
function wrappedTerms(doc) {
	const menus = [...doc.querySelectorAll('.span9 .submenu, .submenu')];
	const menu = menus.find(m => m.querySelector('a[href*="p_term="]') || /семестр|триместр/i.test(m.textContent) && !/сесси/i.test(m.textContent));
	if (!menu) return [];
	return [...menu.querySelectorAll('.submenu-item')].map((it, i) => {
		const a = it.querySelector('a');
		const term = a ? +(new URL(a.href, location.href).searchParams.get('p_term') || i + 1) : i + 1;
		return { term, label: it.textContent.replace(/\s+/g, ' ').trim(), current: !a };
	}).filter(t => t.label);
}

let wrDefaultTerm = null;

async function wrappedCollect(term) {
	const signsDoc = await fetchEtisPage('stu.signs?p_mode=current' + (term ? '&p_term=' + term : ''));
	const terms = wrappedTerms(signsDoc);
	// В меню без ссылки — выбранный семестр; «текущий» — тот, что ЕТИС открывает по умолчанию
	const sel = terms.find(t => t.current) || terms[0] || { term: term || 1, label: 'Семестр' };
	if (!term) wrDefaultTerm = sel.term;
	terms.forEach(t => { t.current = t.term === (wrDefaultTerm ?? sel.term); });
	const cur = { ...sel, current: !term || sel.term === wrDefaultTerm };
	const dis = [...signsDoc.querySelectorAll('table.common')].map(parseSignsTable).filter(Boolean);

	const [plan, session, absence] = await Promise.all([
		fetchEtisPage('stu.teach_plan').then(doc => {
			const h = [...doc.querySelectorAll('h3')].find(x => x.textContent.replace(/\s+/g, ' ').trim().toLowerCase() === cur.label.toLowerCase());
			const table = h?.nextElementSibling?.matches('table.common') ? h.nextElementSibling : null;
			if (!table) return null;
			let aud = 0, self = 0, count = 0;
			// Из группы «по выбору» студент изучает одну дисциплину — считаем только первую
			planRows(table).filter(r => r.first).forEach(({ c }) => {
				const n = c.slice(2).map(td => parseFloat(td.textContent.replace(',', '.')) || 0);
				aud += n[0] || 0; self += n[1] || 0; count++;
			});
			return { aud, self, count };
		}).catch(() => null),
		fetchEtisPage('stu.signs?p_mode=session').then(doc => {
			const rows = [];
			let take = false;
			doc.querySelectorAll('.span9 table.common tr').forEach(tr => {
				const head = tr.querySelector('th[colspan]');
				if (head) { take = head.textContent.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(cur.label.toLowerCase()); return; }
				const c = [...tr.children];
				if (take && c.length >= 4 && c[0].tagName !== 'TH') rows.push({ dis: c[0].textContent.trim(), grade: sessionGrade(c[1].textContent) });
			});
			return rows.length ? rows : null;
		}).catch(() => null),
		// Пропуски ЕТИС показывает только по текущему учебному году — берём их для текущего семестра
		cur.current ? fetchEtisPage('stu.absence').then(doc => {
			const table = doc.querySelector('table.slimtab_nice');
			if (!table) return null;
			const rows = [...table.querySelectorAll('tr')].slice(1).map(tr => {
				const c = [...tr.children];
				return { dis: c[2]?.textContent.trim() || '', n: Math.max(1, c[1]?.querySelectorAll('font').length || 0) };
			}).filter(r => r.dis);
			return { total: rows.reduce((s, r) => s + r.n, 0), rows };
		}).catch(() => null) : Promise.resolve(null),
	]);
	return { terms, term: cur, dis, plan, session, absence };
}

function wrappedStats(data) {
	const kts = data.dis.flatMap(d => d.kts.map(k => ({ ...k, dis: d.name })));
	const graded = kts.filter(k => k.status !== 'pending');
	const passed = graded.filter(k => k.status === 'passed').length;
	const failed = graded.length - passed;
	const pts = graded.reduce((s, k) => s + (k.cur ?? k.grade ?? 0), 0);
	const ptsMax = graded.reduce((s, k) => s + (k.max || 0), 0);

	const perDis = data.dis.map(d => {
		const g = d.kts.filter(k => k.status !== 'pending');
		const got = g.reduce((s, k) => s + (k.cur ?? k.grade ?? 0), 0);
		const max = g.reduce((s, k) => s + (k.max || 0), 0);
		return { name: d.name, got, max, pct: max ? got / max : null, graded: g.length, failed: g.filter(k => k.status === 'failed').length, total: d.kts.length };
	}).filter(d => d.graded && d.pct !== null);
	const byPct = [...perDis].sort((a, b) => b.pct - a.pct || b.graded - a.graded);
	const fav = byPct[0] || null;
	const boss = byPct.length > 1 ? [...perDis].sort((a, b) => b.failed - a.failed || a.pct - b.pct)[0] : null;

	// Когда всё происходило
	const dated = graded.map(k => ({ ...k, t: parseRuDate(k.date) })).filter(k => k.t);
	const months = {}, days = {};
	dated.forEach(k => {
		const d = new Date(k.t);
		months[d.getMonth()] = (months[d.getMonth()] || 0) + 1;
		const key = d.toDateString();
		days[key] = (days[key] || 0) + 1;
	});
	const peakMonth = Object.entries(months).sort((a, b) => b[1] - a[1])[0];
	const peakDay = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
	let late = 0;
	if (dated.length >= 4) {
		const ts = dated.map(k => k.t).sort((a, b) => a - b);
		const end = ts[ts.length - 1];
		late = ts.filter(t => end - t <= 21 * 864e5).length / ts.length;
	}

	const teachers = {};
	graded.forEach(k => { const t = (k.teacher || '').trim(); if (t) teachers[t] = (teachers[t] || 0) + 1; });
	const topTeacher = Object.entries(teachers).sort((a, b) => b[1] - a[1])[0];

	const pct = ptsMax ? pts / ptsMax : 0;
	const pendingShare = kts.length ? (kts.length - graded.length) / kts.length : 0;
	let persona;
	if (graded.length < 3 || pendingShare > 0.6) persona = ['flight_takeoff', 'Разгон', 'Семестр только набирает обороты — самое интересное впереди. Загляни сюда ближе к сессии.'];
	else if (!failed && pct >= 0.9) persona = ['military_tech', 'Перфекционист', 'Ни одного долга и почти максимум баллов. Преподаватели тебя запомнят.'];
	else if (late >= 0.45) persona = ['bolt', 'Спринтер дедлайнов', 'Почти половина контрольных — за последние три недели. Адреналин — твоё топливо.'];
	else if (failed && pct >= 0.7) persona = ['local_fire_department', 'Феникс', 'Были и провалы, но ты поднимаешься и забираешь своё.'];
	else if (pct >= 0.75) persona = ['shield', 'Стабильный танк', 'Ровно, уверенно, без паники. Так и закрывают сессии.'];
	else persona = ['hiking', 'Выживший', 'Было непросто, но ты всё ещё здесь. А это главное.'];

	const sess = data.session;
	const sessNums = sess ? sess.map(r => r.grade.num).filter(Boolean) : [];
	return {
		kts: kts.length, graded: graded.length, passed, failed, pts, ptsMax, pct, pendingShare,
		fav, boss: boss && boss.name !== fav?.name ? boss : null,
		peakMonth: peakMonth && dated.length >= 3 ? { m: +peakMonth[0], n: peakMonth[1] } : null,
		peakDay: peakDay && peakDay[1] >= 2 ? { t: new Date(peakDay[0]), n: peakDay[1] } : null,
		teachers: Object.keys(teachers).length, topTeacher: topTeacher ? { name: topTeacher[0], n: topTeacher[1] } : null,
		late, persona,
		pairs: data.plan ? Math.round(data.plan.aud / 2) : null, aud: data.plan?.aud || 0, self: data.plan?.self || 0,
		disCount: data.plan?.count || data.dis.length,
		absence: data.absence,
		session: sess ? { rows: sess, avg: sessNums.length ? sessNums.reduce((a, b) => a + b, 0) / sessNums.length : null, fives: sess.filter(r => r.grade.num === 5).length, passes: sess.filter(r => r.grade.cls === 'gpass').length } : null,
	};
}

function wrappedSlides(data, s, name) {
	const hue = n => disciplineHue(n || '');
	const num = (v, dec = 0) => `<b class="wr-num" data-count="${v}" data-dec="${dec}">${dec ? String(v.toFixed(dec)).replace('.', ',') : Math.round(v)}</b>`;
	const inProgress = data.term.current && s.pendingShare > 0.2;
	const slides = [];

	slides.push({ h: [265, 320], html: `
		<div class="wr-kicker wr-in">ЕТИС Wrapped</div>
		<h1 class="wr-title wr-in" style="--d:1">${escapeHtml(data.term.label)}</h1>
		<p class="wr-lead wr-in" style="--d:2">${name ? escapeHtml(name) + ', давай' : 'Давай'} посмотрим, каким он ${inProgress ? 'получается' : 'получился'}.</p>
		${data.terms.length > 1 ? `<div class="wr-terms wr-in" style="--d:3">${data.terms.map(t => `<button type="button" data-wr-term="${t.term}" class="${t.term === data.term.term ? 'is-on' : ''}">${t.current ? '● ' : ''}${escapeHtml(t.label)}</button>`).join('')}</div>` : ''}
		<div class="wr-hint wr-in" style="--d:4"><span class="material-icons">touch_app</span>Нажимай справа, чтобы листать</div>` });

	if (s.pairs) slides.push({ h: [200, 250], html: `
		<div class="wr-kicker wr-in">В аудиториях</div>
		<div class="wr-big wr-in" style="--d:1">${num(s.pairs)}<span>${plural(s.pairs, 'пара', 'пары', 'пар')}</span></div>
		<p class="wr-lead wr-in" style="--d:2">Это ${s.aud} ${plural(s.aud, 'час', 'часа', 'часов')} — или ${Math.round(s.aud / 24 * 10) / 10} суток без перерыва.</p>
		${s.self ? `<p class="wr-sub wr-in" style="--d:3">И ещё ${s.self} ч самостоятельной работы по ${s.disCount} ${plural(s.disCount, 'дисциплине', 'дисциплинам', 'дисциплинам')}.</p>` : ''}` });

	if (s.graded) slides.push({ h: [140, 175], html: `
		<div class="wr-kicker wr-in">Контрольные точки</div>
		${s.passed ? `<div class="wr-big wr-in" style="--d:1">${num(s.passed)}<span>${plural(s.passed, 'сдана', 'сданы', 'сдано')}</span></div>` : `<div class="wr-big wr-in" style="--d:1">${num(s.kts)}<span>${plural(s.kts, 'КТ', 'КТ', 'КТ')} в семестре</span></div>`}
		<div class="wr-meter wr-in" style="--d:2"><i style="--w:${s.kts ? s.passed / s.kts * 100 : 0}%"></i></div>
		<p class="wr-lead wr-in" style="--d:3">${!s.passed ? `Первые оценки уже пришли. ${s.failed} ${plural(s.failed, 'ждёт', 'ждут', 'ждут')} реванша — время есть.` : s.failed ? `${Math.round(s.passed / s.graded * 100)}% — с первого раза. Ещё ${s.failed} ${plural(s.failed, 'ждёт', 'ждут', 'ждут')} реванша.` : 'Все — с первого раза. Ни одного долга.'}</p>
		${s.kts > s.graded ? `<p class="wr-sub wr-in" style="--d:4">Впереди ещё ${s.kts - s.graded} из ${s.kts}.</p>` : ''}` });

	if (s.ptsMax) slides.push({ h: [45, 15], html: `
		<div class="wr-kicker wr-in">Баллы</div>
		<div class="wr-ring wr-in" style="--d:1;--p:${Math.round(s.pct * 100)}">
			<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="52" pathLength="100"/></svg>
			<div>${num(Math.round(s.pct * 100))}<span>%</span></div>
		</div>
		<p class="wr-lead wr-in" style="--d:2">${fmtNum(s.pts)} ${plural(Math.round(s.pts), 'балл', 'балла', 'баллов')} из ${fmtNum(s.ptsMax)} возможных за сданные КТ.</p>` });

	if (s.fav) slides.push({ h: [hue(s.fav.name), hue(s.fav.name) + 40], html: `
		<div class="wr-kicker wr-in">Предмет-фаворит</div>
		<span class="material-icons wr-icon wr-in" style="--d:1">favorite</span>
		<h2 class="wr-name wr-in" style="--d:2">${escapeHtml(s.fav.name)}</h2>
		<p class="wr-lead wr-in" style="--d:3">${s.fav.pct > 1 ? `${Math.round(s.fav.pct * 100)}% баллов — больше максимума. Это вообще законно?` : `${Math.round(s.fav.pct * 100)}% баллов — лучший результат семестра.`}</p>` });

	if (s.boss) slides.push({ h: [hue(s.boss.name), hue(s.boss.name) - 40], html: `
		<div class="wr-kicker wr-in">Главный босс</div>
		<span class="material-icons wr-icon wr-in" style="--d:1">fitness_center</span>
		<h2 class="wr-name wr-in" style="--d:2">${escapeHtml(s.boss.name)}</h2>
		<p class="wr-lead wr-in" style="--d:3">${s.boss.failed ? `${s.boss.failed} ${plural(s.boss.failed, 'несданная КТ', 'несданные КТ', 'несданных КТ')}. ` : ''}${Math.round(s.boss.pct * 100)}% баллов — здесь пришлось попотеть.</p>` });

	if (s.peakMonth) slides.push({ h: [320, 15], html: `
		<div class="wr-kicker wr-in">Самый жаркий месяц</div>
		<div class="wr-big wr-in" style="--d:1"><span class="wr-word">${WR_MONTHS_NOM[s.peakMonth.m]}</span></div>
		<p class="wr-lead wr-in" style="--d:2">В ${WR_MONTHS_IN[s.peakMonth.m]} — ${s.peakMonth.n} ${plural(s.peakMonth.n, 'оценка', 'оценки', 'оценок')} за КТ.</p>
		${s.peakDay ? `<p class="wr-sub wr-in" style="--d:3">А ${s.peakDay.t.getDate()} ${WR_MONTHS_GEN[s.peakDay.t.getMonth()]} прилетело сразу ${s.peakDay.n} ${plural(s.peakDay.n, 'оценка', 'оценки', 'оценок')} за день.</p>` : ''}` });

	if (s.teachers >= 2) slides.push({ h: [180, 215], html: `
		<div class="wr-kicker wr-in">Преподаватели</div>
		<div class="wr-big wr-in" style="--d:1">${num(s.teachers)}<span>${plural(s.teachers, 'преподаватель', 'преподавателя', 'преподавателей')}</span></div>
		<p class="wr-lead wr-in" style="--d:2">ставили тебе баллы в этом семестре.</p>
		${s.topTeacher?.n >= 2 ? `<p class="wr-sub wr-in" style="--d:3">Больше всего оценок — ${s.topTeacher.n} — от: ${escapeHtml(s.topTeacher.name)}</p>` : ''}` });

	if (s.absence) slides.push({ h: s.absence.total ? [30, 5] : [150, 120], html: s.absence.total ? `
		<div class="wr-kicker wr-in">Пропуски</div>
		<div class="wr-big wr-in" style="--d:1">${num(s.absence.total)}<span>${plural(s.absence.total, 'пропуск', 'пропуска', 'пропусков')}</span></div>
		<p class="wr-lead wr-in" style="--d:2">${inProgress ? 'Это пока что — семестр ещё идёт.' : s.pairs ? `Из ${s.pairs} пар — посещаемость около ${Math.max(0, Math.round((1 - s.absence.total / s.pairs) * 100))}%.` : 'Бывает.'}</p>` : `
		<div class="wr-kicker wr-in">Пропуски</div>
		<div class="wr-big wr-in" style="--d:1"><b class="wr-num">0</b><span>пропусков</span></div>
		<p class="wr-lead wr-in" style="--d:2">${inProgress ? 'Ни одного — так держать.' : 'Ни одного. Легенда.'}</p>` });

	if (s.session) slides.push({ h: [50, 95], html: `
		<div class="wr-kicker wr-in">Сессия</div>
		${s.session.avg ? `<div class="wr-big wr-in" style="--d:1">${num(s.session.avg, 2)}<span>средний балл</span></div>` : ''}
		<div class="wr-grades wr-in" style="--d:2">${s.session.rows.map(r => `<span class="wr-g wr-g--${r.grade.cls}" title="${escapeHtml(r.dis)}">${escapeHtml(r.grade.num ? String(r.grade.num) : r.grade.text === 'зачёт' ? 'зач' : r.grade.text)}</span>`).join('')}</div>
		<p class="wr-lead wr-in" style="--d:3">${s.session.fives ? `${s.session.fives} ${plural(s.session.fives, 'пятёрка', 'пятёрки', 'пятёрок')}` : ''}${s.session.fives && s.session.passes ? ' и ' : ''}${s.session.passes ? `${s.session.passes} ${plural(s.session.passes, 'зачёт', 'зачёта', 'зачётов')}` : ''}.</p>` });

	slides.push({ h: [280, 200], html: `
		<div class="wr-kicker wr-in">Твой архетип</div>
		<span class="material-icons wr-icon wr-icon--xl wr-in" style="--d:1">${s.persona[0]}</span>
		<h2 class="wr-title wr-in" style="--d:2">${s.persona[1]}</h2>
		<p class="wr-lead wr-in" style="--d:3">${s.persona[2]}</p>` });

	const facts = [
		s.pairs && ['event_seat', String(s.pairs), plural(s.pairs, 'пара', 'пары', 'пар')],
		s.passed && ['task_alt', String(s.passed), 'КТ сдано'],
		s.ptsMax && ['insights', Math.round(s.pct * 100) + '%', 'баллов'],
		s.session?.avg && ['school', fmtNum(Math.round(s.session.avg * 100) / 100), 'балл сессии'],
		s.absence && ['event_busy', String(s.absence.total), plural(s.absence.total, 'пропуск', 'пропуска', 'пропусков')],
	].filter(Boolean).slice(0, 4);
	slides.push({ h: [265, 200], final: true, html: `
		<div class="wr-card wr-in">
			<div class="wr-card-top"><span>ЕТИС Wrapped</span><span>${escapeHtml(data.term.label)}</span></div>
			${name ? `<div class="wr-card-name">${escapeHtml(name)}</div>` : ''}
			<div class="wr-card-persona"><span class="material-icons">${s.persona[0]}</span>${s.persona[1]}</div>
			<div class="wr-card-facts">${facts.map(([i, v, l]) => `<div><span class="material-icons">${i}</span><b>${escapeHtml(v)}</b><small>${escapeHtml(l)}</small></div>`).join('')}</div>
			${s.fav ? `<div class="wr-card-fav"><small>фаворит</small>${escapeHtml(s.fav.name)}</div>` : ''}
		</div>
		<div class="wr-actions wr-in" style="--d:2">
			<button type="button" class="wr-btn wr-btn--main" data-wr-save><span class="material-icons">ios_share</span>Сохранить картинку</button>
			<button type="button" class="wr-btn" data-wr-again><span class="material-icons">replay</span>Ещё раз</button>
		</div>`, facts });
	return slides;
}

// Картинка 1080×1920 для сторис / чата группы
function wrappedImage(data, s, name, facts) {
	const W = 1080, H = 1920;
	const c = document.createElement('canvas');
	c.width = W; c.height = H;
	const x = c.getContext('2d');
	const g = x.createLinearGradient(0, 0, W, H);
	g.addColorStop(0, 'hsl(265 70% 22%)'); g.addColorStop(0.55, 'hsl(225 70% 16%)'); g.addColorStop(1, 'hsl(190 80% 18%)');
	x.fillStyle = g; x.fillRect(0, 0, W, H);
	[[220, 380, 520, 'hsla(280,90%,60%,0.45)'], [900, 1200, 600, 'hsla(190,90%,55%,0.35)'], [300, 1650, 480, 'hsla(330,90%,60%,0.3)']].forEach(([cx, cy, r, col]) => {
		const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
		rg.addColorStop(0, col); rg.addColorStop(1, 'transparent');
		x.fillStyle = rg; x.fillRect(0, 0, W, H);
	});
	const font = (w, size) => `${w} ${size}px -apple-system, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif`;
	const wrapText = (text, maxW, size, weight) => {
		x.font = font(weight, size);
		const words = text.split(' '), lines = [];
		let line = '';
		words.forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
		if (line) lines.push(line);
		return lines;
	};
	x.fillStyle = 'rgba(255,255,255,0.7)'; x.font = font(600, 40);
	x.fillText('ЕТИС WRAPPED', 96, 190);
	x.textAlign = 'right'; x.fillText(data.term.label.toUpperCase(), W - 96, 190); x.textAlign = 'left';
	let y = 380;
	if (name) { x.fillStyle = '#fff'; wrapText(name, W - 192, 92, 800).forEach(l => { x.font = font(800, 92); x.fillText(l, 96, y); y += 104; }); y += 40; }
	// архетип
	x.font = font(700, 54);
	const pw = x.measureText(s.persona[1]).width + 80;
	x.fillStyle = 'rgba(255,255,255,0.14)';
	x.beginPath(); x.roundRect?.(96, y - 70, pw, 100, 50); x.fill();
	x.fillStyle = '#fff'; x.fillText(s.persona[1], 136, y - 2);
	y += 110;
	// Факты — плитки 2×2: крупная цифра и подпись
	const tw = (W - 192 - 32) / 2, th = 250;
	facts.forEach(([, v, l], i) => {
		const tx = 96 + (i % 2) * (tw + 32), ty = y + Math.floor(i / 2) * (th + 32);
		x.fillStyle = 'rgba(255,255,255,0.1)';
		x.beginPath(); x.roundRect?.(tx, ty, tw, th, 48); x.fill();
		x.fillStyle = '#fff'; x.font = font(800, 120); x.fillText(v, tx + 48, ty + 150);
		x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = font(600, 42); x.fillText(l, tx + 48, ty + 210);
	});
	y += Math.ceil(facts.length / 2) * (th + 32) + 60;
	if (s.fav) {
		y += 30;
		x.fillStyle = 'rgba(255,255,255,0.6)'; x.font = font(600, 38); x.fillText('ПРЕДМЕТ-ФАВОРИТ', 96, y); y += 70;
		x.fillStyle = '#fff'; wrapText(s.fav.name, W - 192, 58, 700).slice(0, 3).forEach(l => { x.font = font(700, 58); x.fillText(l, 96, y); y += 70; });
	}
	x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = font(600, 36);
	x.fillText('сделано в ЕТИС 3.0', 96, H - 110);
	return c;
}

async function wrappedSave(canvas, label) {
	return saveCanvasImage(canvas, `etis-wrapped-${label.replace(/\s+/g, '-')}.png`, 'Мой семестр');
}

// Картинку — в «Поделиться» (телефон), в галерею (Android-приложение) или скачать (ПК)
async function saveCanvasImage(canvas, name, title) {
	const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
	if (!blob) return;
	if (window.ETIS3Native?.saveImage) {
		window.ETIS3Native.saveImage(canvas.toDataURL('image/png').split(',')[1], name);
		return;
	}
	const file = new File([blob], name, { type: 'image/png' });
	if (navigator.canShare?.({ files: [file] })) {
		try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e.name === 'AbortError') return; }
	}
	const a = createEl('a', { href: URL.createObjectURL(blob), download: name });
	document.body.appendChild(a); a.click(); a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

let wrappedClose = null;

async function openWrapped(term) {
	// Переключение семестра: прошлое окно закрываем целиком, вместе с таймером и клавишами
	wrappedClose?.(true);
	document.getElementById('etis3-wrapped')?.remove();
	const root = createEl('div', { id: 'etis3-wrapped', className: 'wr' });
	root.innerHTML = `
		<div class="wr-stage">
			<div class="wr-bars"></div>
			<button type="button" class="wr-close" aria-label="Закрыть"><span class="material-icons">close</span></button>
			<div class="wr-slides"><div class="wr-slide wr-slide--on wr-loading" style="--h1:265;--h2:320">
				<div class="wr-blob"></div><div class="wr-blob wr-blob--2"></div>
				<div class="wr-body"><div class="wr-spinner"></div><p class="wr-lead">Собираем твой семестр…</p></div>
			</div></div>
		</div>`;
	document.body.appendChild(root);
	document.documentElement.classList.add('etis3-wr-open');
	requestAnimationFrame(() => root.classList.add('wr--in'));

	let timer = null, idx = 0, slides = [], paused = false, startedAt = 0, elapsed = 0;
	const DURATION = 6500;
	const close = instant => {
		if (wrappedClose === close) wrappedClose = null;
		clearTimeout(timer);
		if (instant === true) { root.remove(); document.removeEventListener('keydown', onKey, true); return; }
		root.classList.remove('wr--in');
		document.documentElement.classList.remove('etis3-wr-open');
		document.removeEventListener('keydown', onKey, true);
		setTimeout(() => root.remove(), 300);
		if (location.hash === '#wrapped') history.replaceState(null, '', location.pathname + location.search);
	};
	const onKey = e => {
		if (e.key === 'Escape') { e.stopPropagation(); close(); }
		else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
		else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
	};
	document.addEventListener('keydown', onKey, true);
	wrappedClose = close;
	root.querySelector('.wr-close').addEventListener('click', close);
	root.addEventListener('click', e => { if (e.target === root) close(); });

	const countUp = el => el.querySelectorAll('.wr-num[data-count]').forEach(n => {
		const to = +n.dataset.count, dec = +n.dataset.dec || 0, t0 = performance.now();
		const step = now => {
			const p = Math.min(1, (now - t0) / 1100), v = to * (1 - Math.pow(1 - p, 3));
			n.textContent = dec ? v.toFixed(dec).replace('.', ',') : Math.round(v);
			if (p < 1 && n.isConnected) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	});
	const schedule = (left = DURATION) => {
		clearTimeout(timer);
		startedAt = performance.now();
		if (!slides[idx]?.final) timer = setTimeout(() => go(idx + 1), left);
	};
	const go = i => {
		if (!slides.length) return;
		if (i >= slides.length) { if (!slides[idx].final) i = slides.length - 1; else return; }
		i = Math.max(0, i);
		const els = root.querySelectorAll('.wr-slide');
		els.forEach((el, j) => { el.classList.toggle('wr-slide--on', j === i); el.classList.toggle('wr-slide--past', j < i); });
		root.querySelectorAll('.wr-bars i').forEach((b, j) => { b.className = j < i ? 'is-done' : j === i ? 'is-on' : ''; b.style.setProperty('--dur', DURATION + 'ms'); });
		idx = i; elapsed = 0; paused = false; root.classList.remove('wr--paused');
		countUp(els[i]);
		schedule();
	};
	// Удержание — пауза, как в сторис
	let holdT = 0;
	const stage = root.querySelector('.wr-stage');
	stage.addEventListener('pointerdown', e => {
		if (e.target.closest('button, a')) return;
		holdT = performance.now();
		clearTimeout(timer); elapsed += performance.now() - startedAt; paused = true; root.classList.add('wr--paused');
	});
	const release = () => { if (!paused) return; paused = false; root.classList.remove('wr--paused'); schedule(Math.max(600, DURATION - elapsed)); };
	stage.addEventListener('pointerup', release);
	stage.addEventListener('pointercancel', release);
	// Тап справа — дальше, слева — назад (кнопки внутри слайда работают как обычно)
	stage.addEventListener('click', e => {
		if (e.target.closest('button, a') || performance.now() - holdT > 350) return;
		const r = stage.getBoundingClientRect();
		go(e.clientX - r.left < r.width * 0.3 ? idx - 1 : idx + 1);
	});

	let data;
	try {
		data = await wrappedCollect(term);
	} catch (e) {
		root.querySelector('.wr-body').innerHTML = `<span class="material-icons wr-icon">cloud_off</span><p class="wr-lead">${e.message === 'login' ? 'Сессия ЕТИС закончилась — войди заново.' : 'Не получилось загрузить данные ЕТИС.'}</p>`;
		return;
	}
	if (!root.isConnected) return;
	const s = wrappedStats(data);
	const name = (document.querySelector('.etis3-profile__name')?.textContent || '').trim().split(/\s+/)[1] || '';
	slides = wrappedSlides(data, s, name);
	root.querySelector('.wr-slides').innerHTML = slides.map(sl => `
		<section class="wr-slide${sl.final ? ' wr-slide--final' : ''}" style="--h1:${sl.h[0]};--h2:${sl.h[1]}">
			<div class="wr-blob"></div><div class="wr-blob wr-blob--2"></div>
			<div class="wr-body">${sl.html}</div>
		</section>`).join('');
	root.querySelector('.wr-bars').innerHTML = slides.map(() => '<i></i>').join('');
	root.querySelectorAll('[data-wr-term]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openWrapped(+b.dataset.wrTerm); }));
	root.querySelector('[data-wr-again]')?.addEventListener('click', () => go(0));
	const saveBtn = root.querySelector('[data-wr-save]');
	saveBtn?.addEventListener('click', async () => {
		saveBtn.disabled = true;
		try { await wrappedSave(wrappedImage(data, s, name, slides[slides.length - 1].facts), data.term.label); }
		finally { saveBtn.disabled = false; }
	});
	go(0);
}

function initWrapped() {
	if (!document.querySelector('div.span3')) return;
	paletteItems.push({ label: 'Итоги семестра · Wrapped', icon: 'auto_awesome', hint: 'Действие', run: () => openWrapped() });
	document.addEventListener('click', e => {
		const b = e.target.closest('[data-wrapped]');
		if (!b) return;
		e.preventDefault();
		openWrapped();
	});
	const fromHash = () => { if (location.hash === '#wrapped') openWrapped(); };
	window.addEventListener('hashchange', fromHash);
	fromHash();
}
onReady(initWrapped);


