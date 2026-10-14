// ============================================================
// СТАТИСТИКА ОЦЕНОК
// ============================================================

function buildSignsStats(span9, disciplines, fresh = 0) {
	if (!disciplines.length) return;

	const cur     = disciplines.reduce((s, d) => s + d.cur, 0);
	const max     = disciplines.reduce((s, d) => s + d.max, 0);
	const passed  = disciplines.reduce((s, d) => s + d.passed, 0);
	const failed  = disciplines.reduce((s, d) => s + d.failed, 0);
	const pending = disciplines.reduce((s, d) => s + d.pending, 0);
	const graded  = passed + failed;

	const rows = [...disciplines].sort((a, b) => (b.failed - a.failed) || (a.cur / (a.max || 1)) - (b.cur / (b.max || 1)));

	const w = createEl('div', { className: 'etis3-stats-widget' });
	w.innerHTML = `
		<div class="esw-header">
			<span class="material-icons">analytics</span>
			<span class="esw-title">Сводка по ${/триместр/i.test(span9.querySelector('.submenu')?.textContent || '') ? 'триместру' : 'семестру'}</span>
			${fresh ? `<span class="esw-new">новых оценок: ${fresh}</span>` : ''}
			<label class="esw-goal" title="Цель по баллам в рейтинг для каждой дисциплины — покажу, сколько ещё нужно набрать">
				<span class="material-icons">flag</span>цель
				<input type="number" min="1" max="100" step="1" placeholder="—" inputmode="numeric">
			</label>
		</div>
		<div class="esw-grid">
			<div class="esw-card">
				<div class="esw-label">Баллов в рейтинг</div>
				<div class="esw-value">${fmtNum(cur)}<small> / ${fmtNum(max)}</small></div>
			</div>
			<div class="esw-card">
				<div class="esw-label">КТ сдано</div>
				<div class="esw-value" style="color:var(--color-green)">${passed}<small> / ${graded}</small></div>
			</div>
			<div class="esw-card">
				<div class="esw-label">Не сдано</div>
				<div class="esw-value" style="color:${failed ? 'var(--color-red)' : 'var(--color-text-primary)'}">${failed}</div>
			</div>
			<div class="esw-card">
				<div class="esw-label">КТ впереди</div>
				<div class="esw-value">${pending}</div>
			</div>
		</div>
		<div class="esw-dis-list">
			${rows.map(d => {
				const pct = d.max ? Math.round(d.cur / d.max * 100) : 0;
				return `<div class="esw-dis etis3-dis${d.failed ? ' esw-dis--bad' : ''}" style="--dis-h:${disciplineHue(d.name)}">
					<div class="esw-dis-name" title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</div>
					<div class="esw-dis-bar"><span style="width:${pct}%"></span></div>
					<div class="esw-dis-val">${fmtNum(d.cur)} / ${fmtNum(d.max)}${d.failed ? ` · <b>${d.failed} не сдано</b>` : ''}</div>
					<div class="esw-dis-goal" hidden></div>
				</div>`;
			}).join('')}
		</div>
	`;

	const disEls = w.querySelectorAll('.esw-dis');
	rows.forEach((d, i) => { d.goalCell = disEls[i].querySelector('.esw-dis-goal'); });

	const input = w.querySelector('.esw-goal input');
	const goal  = readGoal();
	if (goal) input.value = goal;
	input.addEventListener('input', () => {
		const v = parseInt(input.value, 10);
		try {
			if (v > 0) localStorage.setItem(GOAL_KEY, String(Math.min(v, 1000)));
			else localStorage.removeItem(GOAL_KEY);
		} catch (e) {}
		updateGoalHints(disciplines);
	});

	// После вкладок «оценки за сессии / в семестре / …» и выбора семестра
	const menus = span9.querySelectorAll(':scope > .submenu');
	if (menus.length) menus[menus.length - 1].after(w);
	else span9.prepend(w);
}


