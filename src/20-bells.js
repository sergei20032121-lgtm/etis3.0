
// ============================================================
// РАСПИСАНИЕ ЗВОНКОВ — пары и перемены, где мы сейчас
// ============================================================
// Время берётся из PAIR_SCHEDULE (уточняется по таблице расписания ЕТИС).

function bellsState(now = nowMinutes()) {
	const rows = [];
	PAIR_SCHEDULE.forEach((p, i) => {
		const s = p.start[0] * 60 + p.start[1], e = p.end[0] * 60 + p.end[1];
		rows.push({ kind: 'pair', num: p.num, s, e });
		const next = PAIR_SCHEDULE[i + 1];
		if (next) {
			const ns = next.start[0] * 60 + next.start[1];
			if (ns > e) rows.push({ kind: 'break', s: e, e: ns });
		}
	});
	const cur = rows.find(r => now >= r.s && now < r.e) || null;
	return { rows, cur };
}

const fmtMin = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

function openBells() {
	document.getElementById('etis3-bells')?.remove();
	const root = createEl('div', { id: 'etis3-bells', className: 'rp bl', role: 'dialog', 'aria-label': 'Расписание звонков' });
	root.innerHTML = `<div class="rp-card bl-card">
		<div class="rp-head"><span class="material-icons">notifications_active</span><h2>Звонки</h2>
			<a href="#" class="rp-close" aria-label="Закрыть"><span class="material-icons">close</span></a></div>
		<div class="bl-now"></div>
		<div class="bl-list"></div>
	</div>`;
	document.body.appendChild(root);
	requestAnimationFrame(() => root.classList.add('rp--in'));

	const render = () => {
		const now = nowMinutes();
		const { rows, cur } = bellsState(now);
		const first = rows[0], last = rows[rows.length - 1];
		let head;
		if (cur?.kind === 'pair') head = `<b>Идёт ${cur.num} пара</b><span>до конца ${cur.e - now} мин · звонок в ${fmtMin(cur.e)}</span>`;
		else if (cur?.kind === 'break') head = `<b>Перемена</b><span>${cur.e - now} мин до начала пары · в ${fmtMin(cur.e)}</span>`;
		else if (now < first.s) head = `<b>Пары ещё не начались</b><span>первая в ${fmtMin(first.s)}</span>`;
		else head = `<b>Пары закончились</b><span>последний звонок был в ${fmtMin(last.e)}</span>`;
		root.querySelector('.bl-now').innerHTML = head;
		root.querySelector('.bl-list').innerHTML = rows.map(r => {
			const on = r === cur;
			const pct = on ? Math.round((now - r.s) / (r.e - r.s) * 100) : now >= r.e ? 100 : 0;
			return r.kind === 'pair'
				? `<div class="bl-row${on ? ' bl-row--on' : ''}${now >= r.e ? ' bl-row--past' : ''}">
					<span class="bl-num">${r.num}</span>
					<span class="bl-time">${fmtMin(r.s)} – ${fmtMin(r.e)}</span>
					<span class="bl-bar"><i style="width:${pct}%"></i></span></div>`
				: `<div class="bl-break${on ? ' bl-break--on' : ''}">перемена ${r.e - r.s} мин</div>`;
		}).join('');
	};
	render();
	const timer = setInterval(render, 20000);

	const close = () => { clearInterval(timer); root.classList.remove('rp--in'); setTimeout(() => root.remove(), 200); document.removeEventListener('keydown', onKey, true); };
	const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
	document.addEventListener('keydown', onKey, true);
	root.addEventListener('click', e => { if (e.target === root) close(); });
	root.querySelector('.rp-close').addEventListener('click', e => { e.preventDefault(); close(); });
}

function initBells() {
	if (!document.querySelector('div.span3')) return;
	paletteItems.push({ label: 'Расписание звонков', icon: 'notifications_active', hint: 'Действие', run: () => openBells() });
	document.addEventListener('click', e => {
		const b = e.target.closest('[data-bells]');
		if (!b) return;
		e.preventDefault();
		openBells();
	});
	const fromHash = () => { if (location.hash === '#bells') openBells(); };
	window.addEventListener('hashchange', fromHash);
	fromHash();
}
onReady(initBells);
