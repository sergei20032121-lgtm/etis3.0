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
	pageInterval(render, 60 * 1000);
	pageListen(document, 'etis3-notes-changed', render);
	days[0].before(wrap);
	days.forEach(d => d.classList.add('etis3-orig'));
	return wrap;
}


