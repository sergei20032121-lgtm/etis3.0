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
	pageListen(document, 'wheel', removeTooltip);
	pageCleanup(removeTooltip);

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

	const textGrade = td => {
		const t = (td?.textContent || '').replace(/\s+/g, ' ').trim();
		return t && !/^[-—–.]*$/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t) ? t.slice(0, 20) : '';
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
		// Оценка словами («н/я», «незачёт», «зачтено») — КТ уже прошла, это не «впереди»
		const text  = grade === null ? textGrade(cells[col.grade]) : '';
		const status = grade !== null ? (pass === null || grade >= pass ? 'passed' : 'failed')
			: text ? (/н\s*\/\s*я|не\s*яв|неуд|незач|не\s*зач|^2$/i.test(text) ? 'failed' : 'passed') : 'pending';
		kts.push({ row: tr, gradeCell: cells[col.grade], grade, text, pass, status,
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
		dot.title = k.grade === null ? k.text : `${k.grade} из проходных ${k.pass}`;
		k.gradeCell.appendChild(dot);
	});

	// Сводка по дисциплине рядом с заголовком
	if (!d.heading) return;
	paintDiscipline(d.heading, d.name);
	const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
	const sum = createEl('div', { className: 'etis3-dis-summary' });
	sum.innerHTML = `
		<span class="eds-chip">рейтинг <b>${fmtNum(d.cur)}</b> / ${fmtNum(d.max)}</span>
		<span class="eds-chip eds-chip--ok">сдано ${d.passed}</span>
		${d.failed ? `<span class="eds-chip eds-chip--bad">не сдано ${d.failed}</span>` : ''}
		${d.pending ? `<span class="eds-chip">впереди ${d.pending}${d.left ? ` · до +${fmtNum(d.left)}` : ''}</span>` : ''}
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

// Ключ оценки — дисциплина, семестр и тема КТ (с номером повтора, если темы совпадают).
// Номер строки в ключ не входит: ЕТИС может добавить КТ, и оценки ниже не должны стать «новыми».
function gradeTerm(search = location.search) { return new URLSearchParams(search).get('p_term') || 'cur'; }
function gradeKeys(dkey, kts, term) {
	const seenTopics = {};
	return kts.map(k => {
		const t = k.topic.slice(0, 60);
		seenTopics[t] = (seenTopics[t] || 0) + 1;
		return `${dkey}|${term}|${t}|${seenTopics[t]}`;
	});
}
// Ключ до 4.13.3 — чтобы после обновления старые оценки не подсветились как новые
function legacyGradeKey(dkey, i, topic) { return `${dkey}|${i}|${topic.slice(0, 60)}`; }

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
		const term  = gradeTerm();
		const known = `#${dkey}|${term}` in seen || (term === 'cur' && `#${dkey}` in seen);
		seen[`#${dkey}|${term}`] = 1;
		const keys = gradeKeys(dkey, d.kts, term);
		d.kts.forEach((k, i) => {
			if (k.grade === null) return;
			const key  = keys[i];
			const prev = seen[key] ?? (term === 'cur' ? seen[legacyGradeKey(dkey, i, k.topic)] : undefined);
			if (!known) seen[key] = { g: k.grade, t: 0 };
			else if (!prev || prev.g !== k.grade) seen[key] = { g: k.grade, t: now };
			else seen[key] = prev;
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
	if (need > d.left) return { cls: 'bad', text: `до ${goal} не добрать: максимум ${fmtNum(d.cur + d.left)}${d.failed ? ' без пересдач' : ''}` };
	const share = d.left ? Math.round(need / d.left * 100) : 100;
	return { cls: share > 80 ? 'warn' : '', text: `нужно ещё ${fmtNum(need)} из ${fmtNum(d.left)} (${share}%)` };
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


