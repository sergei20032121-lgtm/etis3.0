// ============================================================
// ЗАМЕТКИ И ДЗ К ПАРАМ
// ============================================================
// Хранятся в chrome.storage.local (в userscript — в localStorage), ключ —
// дата | номер пары | дисциплина. Вместе с текстом сохраняем данные пары,
// чтобы заметку можно было открыть и с другой недели, и с Главной.

const NOTES_KEY = 'etis3-notes';
let pairNotes = {};
const pairRegistry = new Map();

function noteKey(date, num, name) { return `${date ? ymd(date) : '—'}|${num}|${disciplineKey(name)}`; }

function registerPair(p, date) {
	const key = noteKey(date, p.num, p.name);
	pairRegistry.set(key, { name: p.name, num: p.num, type: p.type ? p.type.label : '', icon: p.type ? p.type.icon : '',
		aud: p.aud || '', teacher: p.teacher || '', date: date ? ymd(date) : '' });
	return key;
}

try {
	chrome.storage.local.get(NOTES_KEY, r => {
		pairNotes = (r && r[NOTES_KEY]) || {};
		if (Object.keys(pairNotes).length) document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
	});
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !changes[NOTES_KEY]) return;
		pairNotes = changes[NOTES_KEY].newValue || {};
		document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
	});
} catch (e) {}

function saveNote(key, patch) {
	const pair = pairRegistry.get(key) || pairNotes[key]?.pair;
	const next = { ...(pairNotes[key] || {}), ...patch, pair, updated: Date.now() };
	if (!next.text?.trim() && !next.done) delete pairNotes[key];
	else { next.text = next.text || ''; pairNotes[key] = next; }
	// Старые выполненные заметки (больше 60 дней) убираем
	const cutoff = ymd(new Date(Date.now() - 60 * 864e5));
	Object.keys(pairNotes).forEach(k => { const n = pairNotes[k]; if (n.done && n.pair?.date && n.pair.date < cutoff) delete pairNotes[k]; });
	try { chrome.storage.local.set({ [NOTES_KEY]: pairNotes }); } catch (e) {}
	document.dispatchEvent(new CustomEvent('etis3-notes-changed'));
}

function dateFromYmd(s) { const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }

function relDay(s) {
	const d = dateFromYmd(s);
	if (!d) return '';
	const today = new Date(new Date().setHours(0, 0, 0, 0));
	const diff = Math.round((d - today) / 864e5);
	if (diff === 0) return 'сегодня';
	if (diff === 1) return 'завтра';
	if (diff === -1) return 'вчера';
	if (diff > 1 && diff < 7) return d.toLocaleDateString('ru-RU', { weekday: 'long' });
	return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
}

// Блок «Заметки и ДЗ» на Главной: невыполненное (включая просроченное) и выполненное за сегодня
function tasksHtml() {
	const today = ymd(new Date());
	const list = Object.entries(pairNotes)
		.filter(([, n]) => n.text?.trim() && (!n.done || n.pair?.date === today))
		.sort((a, b) => (a[1].done - b[1].done) || String(a[1].pair?.date).localeCompare(String(b[1].pair?.date)))
		.slice(0, 6);
	if (!list.length) return `<div class="hm-empty hm-tasks-empty"><span class="material-icons">touch_app</span><span>Нажми на любую пару в расписании — добавишь заметку или домашку. Они появятся здесь.</span></div>`;
	return `<div class="hm-list">${list.map(([key, n]) => {
		const late = !n.done && n.pair?.date && n.pair.date < today;
		return `<div class="hm-task etis3-dis${n.done ? ' hm-task--done' : ''}${late ? ' hm-task--late' : ''}" style="--dis-h:${disciplineHue(n.pair?.name || '')}">
			<button type="button" class="hm-task-check" data-note-toggle="${escapeHtml(key)}" title="${n.done ? 'Вернуть' : 'Выполнено'}"><span class="material-icons">${n.done ? 'check_circle' : 'radio_button_unchecked'}</span></button>
			<div class="hm-task-body" data-key="${escapeHtml(key)}" role="button" tabindex="0">
				<div class="hm-task-text">${escapeHtml(n.text.split('\n')[0])}</div>
				<div class="hm-task-meta"><i></i>${escapeHtml(n.pair?.name || '')}<span>${escapeHtml(late ? 'просрочено · ' + relDay(n.pair.date) : relDay(n.pair?.date))}</span></div>
			</div>
		</div>`;
	}).join('')}</div>`;
}

// ---------- Карточка пары ----------
function openPairSheet(key) {
	const p = pairRegistry.get(key) || pairNotes[key]?.pair;
	if (!p || document.getElementById('etis3-pair-sheet')) return;
	const note = pairNotes[key] || {};
	const slot = PAIR_SCHEDULE.find(x => x.num === p.num);
	const date = dateFromYmd(p.date);
	const wrap = createEl('div', { id: 'etis3-pair-sheet', role: 'dialog', 'aria-label': p.name });
	wrap.innerHTML = `
		<div class="ps-box etis3-dis" style="--dis-h:${disciplineHue(p.name)}">
			<div class="ps-grab"></div>
			<header class="ps-head">
				<i class="ps-dot"></i>
				<div class="ps-title">
					<h3>${escapeHtml(p.name)}</h3>
					${p.type ? `<span class="ps-type"><span class="material-icons">${p.icon || 'class'}</span>${escapeHtml(p.type)}</span>` : ''}
				</div>
				<button type="button" class="ps-close" aria-label="Закрыть"><span class="material-icons">close</span></button>
			</header>
			<div class="ps-rows">
				${date ? `<div><span class="material-icons">calendar_today</span>${escapeHtml(date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>` : ''}
				<div><span class="material-icons">schedule</span>${slot ? `${formatTime(...slot.start)}–${formatTime(...slot.end)} · ` : ''}${p.num} пара</div>
				${p.aud ? `<div><span class="material-icons">room</span>${escapeHtml(p.aud)}</div>` : ''}
				${p.teacher ? `<div><span class="material-icons">person</span>${escapeHtml(p.teacher)}</div>` : ''}
			</div>
			<label class="ps-label" for="ps-note">Заметка или домашнее задание</label>
			<textarea id="ps-note" rows="4" placeholder="Что задали, что взять с собой, что не забыть…">${escapeHtml(note.text || '')}</textarea>
			<div class="ps-actions">
				<label class="ps-done"><input type="checkbox" ${note.done ? 'checked' : ''}><span class="ps-check"><span class="material-icons">check</span></span>Выполнено</label>
				<button type="button" class="ps-copy"><span class="material-icons">content_copy</span>Скопировать</button>
			</div>
		</div>`;
	document.body.appendChild(wrap);
	requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('show')));

	const ta = wrap.querySelector('textarea'), done = wrap.querySelector('.ps-done input');
	let timer = null;
	const persist = () => { clearTimeout(timer); saveNote(key, { text: ta.value, done: done.checked }); };
	ta.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(persist, 400); });
	done.addEventListener('change', persist);
	wrap.querySelector('.ps-copy').addEventListener('click', () => {
		const text = [p.name + (p.type ? ` (${p.type.toLowerCase()})` : ''),
			[date ? date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : '', slot ? `${formatTime(...slot.start)}–${formatTime(...slot.end)}` : `${p.num} пара`].filter(Boolean).join(', '),
			p.aud, p.teacher, ta.value.trim() ? '\n' + ta.value.trim() : ''].filter(Boolean).join('\n');
		navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано')).catch(() => showToast('Не удалось скопировать'));
	});
	const close = () => {
		persist();
		wrap.classList.remove('show');
		document.removeEventListener('keydown', onKey);
		setTimeout(() => wrap.remove(), 300);
	};
	const onKey = e => { if (e.key === 'Escape') close(); };
	document.addEventListener('keydown', onKey);
	wrap.querySelector('.ps-close').addEventListener('click', close);
	wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
	// Не на телефоне — сразу в поле заметки (на телефоне клавиатура закрыла бы карточку)
	if (!('ontouchstart' in window)) setTimeout(() => ta.focus({ preventScroll: true }), 250);
}

// Тап по паре или заметке открывает карточку; кружок на Главной отмечает «выполнено»
document.addEventListener('click', e => {
	const toggle = e.target.closest('[data-note-toggle]');
	if (toggle) {
		const key = toggle.dataset.noteToggle;
		saveNote(key, { done: !pairNotes[key]?.done });
		return;
	}
	const el = e.target.closest('.hm-pair[data-key], .hm-task-body[data-key]');
	if (!el || e.target.closest('a')) return;
	openPairSheet(el.dataset.key);
});
document.addEventListener('keydown', e => {
	if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.hm-pair[data-key], .hm-task-body[data-key]')) {
		e.preventDefault();
		openPairSheet(e.target.dataset.key);
	}
});



// ---------- Напоминания о ДЗ (Android-приложение) ----------
// Вечером накануне (19:00), а если уже поздно — за час до пары. Только невыполненные заметки с текстом.
function syncAppReminders() {
	if (!window.ETIS3Native?.setReminders) return;
	const now = Date.now();
	const list = [];
	Object.entries(pairNotes).forEach(([key, n]) => {
		if (n.done || !n.text?.trim() || !n.pair?.date) return;
		const day = dateFromYmd(n.pair.date);
		const slot = PAIR_SCHEDULE.find(p => p.num === +n.pair.num);
		if (!day || !slot) return;
		const start = new Date(day); start.setHours(slot.start[0], slot.start[1], 0, 0);
		if (start.getTime() <= now) return;
		const eve = new Date(day); eve.setDate(eve.getDate() - 1); eve.setHours(19, 0, 0, 0);
		const at = eve.getTime() > now ? eve.getTime() : start.getTime() - 3600e3;
		if (at <= now) return;
		const when = eve.getTime() > now ? 'Завтра' : 'Через час';
		list.push({ id: key, at, title: `${when}: ${n.pair.name}${n.pair.num ? ` · ${n.pair.num} пара` : ''}`, text: n.text.trim().slice(0, 300) });
	});
	try { window.ETIS3Native.setReminders(JSON.stringify(list)); } catch (e) {}
}
document.addEventListener('etis3-notes-changed', syncAppReminders);
