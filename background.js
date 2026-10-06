/* ============================================================
   ЕТИС 3.0 — фоновая проверка новых оценок, сообщений и объявлений
   Раз в N минут скачивает страницы ЕТИСа (с куками пользователя),
   сравнивает со снимком, ставит счётчик на иконку и показывает
   уведомление. Если сессия ЕТИСа истекла — тихо ждёт следующего входа.
   ============================================================ */

'use strict';

const BASE      = 'https://student.psu.ru/pls/stu_cus_et/';
const STATE_KEY = 'etis3-bg';
const ALARM     = 'etis3-check';
const PERIOD_MIN = 30;

// ---------- Утилиты ----------
const stripTags = s => String(s || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
	.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function getSettings() {
	const r = await chrome.storage.local.get('etis3-settings');
	return r['etis3-settings'] || {};
}

async function getState() {
	const r = await chrome.storage.local.get(STATE_KEY);
	return r[STATE_KEY] || { unseen: { grades: 0, notes: 0, ann: 0 } };
}

async function setState(state) { await chrome.storage.local.set({ [STATE_KEY]: state }); }

async function fetchPage(path) {
	const res = await fetch(BASE + path, { credentials: 'include', cache: 'no-store' });
	if (!res.ok) throw new Error('http ' + res.status);
	const buf = await res.arrayBuffer();
	const ct  = res.headers.get('content-type') || '';
	const html = new TextDecoder(/utf-?8/i.test(ct) ? 'utf-8' : 'windows-1251').decode(buf);
	if (/name="p_password"/i.test(html)) throw new Error('login');
	return html;
}

// ---------- Разбор страниц (без DOMParser — его нет в service worker) ----------
// Оценки: у каждой КТ есть уникальный p_ctl_id в ячейке оценки
function parseGrades(html) {
	const out = {};
	html.split(/<h3[^>]*>/i).slice(1).forEach(seg => {
		const dis = stripTags(seg.slice(0, seg.indexOf('</h3>')));
		const re = /<td[^>]*p_ctl_id=(\d+)[^>]*>([\s\S]*?)<\/td>/gi;
		let m;
		while ((m = re.exec(seg))) out[m[1]] = { dis, g: stripTags(m[2]) };
	});
	return out;
}

// Сообщения: id ответа p_anv_id, автор, тема
function parseNotes(html) {
	return html.split(/<ul class="nav msg">/i).slice(1).map(seg => ({
		id:    +((seg.match(/name="p_anv_id"[^>]*value="(\d+)"/i) || seg.match(/value="(\d+)"[^>]*name="p_anv_id"/i) || [])[1] || 0),
		who:   stripTags((seg.match(/<b>\s*<i>([\s\S]*?)<\/i>/i) || [])[1]),
		title: stripTags((seg.match(/<font style="font-weight:bold">([\s\S]*?)<\/font>/i) || [])[1]),
	})).filter(n => n.id);
}

// Объявления: время публикации и заголовок
function parseAnn(html) {
	return html.split(/<ul class="nav msg">/i).slice(1).map(seg => {
		const t = (seg.match(/<font color="#808080">\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/i) || []);
		return {
			t: t.length ? new Date(+t[3], +t[2] - 1, +t[1], +t[4], +t[5]).getTime() : 0,
			title: stripTags((seg.match(/<font style="font-weight:bold">([\s\S]*?)<\/font>/i) || [])[1]),
		};
	}).filter(a => a.t);
}

// ---------- Проверка ----------
async function check({ silent = false } = {}) {
	const state = await getState();
	state.unseen = state.unseen || { grades: 0, notes: 0, ann: 0 };
	const found = [];
	try {
		const [gHtml, nHtml, aHtml] = await Promise.all([
			fetchPage('stu.signs?p_mode=current'), fetchPage('stu.teacher_notes'), fetchPage('stu_ann.announces'),
		]);
		const grades = parseGrades(gHtml);
		const notes  = parseNotes(nHtml);
		const ann    = parseAnn(aHtml);

		if (state.grades) {
			Object.entries(grades).forEach(([id, x]) => {
				const prev = state.grades[id];
				if (x.g && (!prev || prev.g !== x.g)) found.push({ kind: 'grades', text: `${x.dis}: ${x.g}` });
			});
		}
		if (state.notesMax !== undefined) {
			notes.filter(n => n.id > state.notesMax).forEach(n => found.push({ kind: 'notes', text: `${n.who}: ${n.title}` }));
		}
		if (state.annMax !== undefined) {
			ann.filter(a => a.t > state.annMax).forEach(a => found.push({ kind: 'ann', text: a.title }));
		}

		state.grades   = grades;
		state.notesMax = Math.max(state.notesMax || 0, ...notes.map(n => n.id));
		state.annMax   = Math.max(state.annMax || 0, ...ann.map(a => a.t));
		state.status   = 'ok';
		if (!silent) found.forEach(f => { state.unseen[f.kind] = (state.unseen[f.kind] || 0) + 1; });
	} catch (e) {
		state.status = e.message === 'login' ? 'login' : 'error';
	}
	state.lastCheck = Date.now();
	await setState(state);
	await updateBadge(state);
	if (!silent && found.length) await notify(found);
	return state;
}

async function updateBadge(state) {
	const s = state || await getState();
	const n = Object.values(s.unseen || {}).reduce((a, b) => a + b, 0);
	await chrome.action.setBadgeText({ text: n ? String(Math.min(n, 99)) : '' });
	await chrome.action.setBadgeBackgroundColor({ color: '#7c6fd4' });
	try { await chrome.action.setBadgeTextColor?.({ color: '#ffffff' }); } catch (e) {}
	const st = { ok: 'на связи', login: 'нужно войти в ЕТИС', error: 'ЕТИС не отвечает' }[s.status] || '';
	await chrome.action.setTitle({ title: `ЕТИС 3.0${n ? ` — новое: ${n}` : ''}${st ? ` (${st})` : ''}` });
}

const KIND_PAGE  = { grades: 'stu.signs?p_mode=current', notes: 'stu.teacher_notes', ann: 'stu_ann.announces' };
const KIND_TITLE = { grades: 'Новая оценка', notes: 'Новое сообщение', ann: 'Новое объявление' };

async function notify(found) {
	const byKind = {};
	found.forEach(f => (byKind[f.kind] = byKind[f.kind] || []).push(f.text));
	for (const [kind, items] of Object.entries(byKind)) {
		const title = items.length > 1 ? `${KIND_TITLE[kind]}: ${items.length}`.replace('Новая оценка', 'Новые оценки').replace('Новое сообщение', 'Новые сообщения').replace('Новое объявление', 'Новые объявления') : KIND_TITLE[kind];
		chrome.notifications.create('etis3-' + kind + '-' + Date.now(), {
			type: 'basic', iconUrl: 'logo.png', title,
			message: items.slice(0, 3).join('\n') + (items.length > 3 ? `\n…и ещё ${items.length - 3}` : ''),
			priority: 1,
		});
	}
}

chrome.notifications?.onClicked.addListener(id => {
	const kind = (id.match(/^etis3-(\w+)-/) || [])[1];
	chrome.tabs.create({ url: BASE + (KIND_PAGE[kind] || 'stu.timetable#home') });
	chrome.notifications.clear(id);
});

// ---------- Расписание проверок ----------
async function schedule() {
	const s = await getSettings();
	await chrome.alarms.clear(ALARM);
	if (s.notify === false) { await updateBadge(); return; }
	chrome.alarms.create(ALARM, { delayInMinutes: 1, periodInMinutes: PERIOD_MIN });
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener(a => { if (a.name === ALARM) check(); });
chrome.storage.onChanged.addListener((changes, area) => {
	if (area !== 'local' || !changes['etis3-settings']) return;
	const was = changes['etis3-settings'].oldValue?.notify, now = changes['etis3-settings'].newValue?.notify;
	if (was !== now) schedule();
});

// ---------- Сообщения от страниц и попапа ----------
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
	if (msg?.type === 'etis3-seen') {
		// Пользователь открыл страницу — сбрасываем счётчик и обновляем снимок без уведомлений
		getState().then(async state => {
			state.unseen = state.unseen || {};
			(msg.kinds || []).forEach(k => { state.unseen[k] = 0; });
			await setState(state);
			await updateBadge(state);
			check({ silent: true });
		});
		return false;
	}
	if (msg?.type === 'etis3-check-now') {
		check().then(reply);
		return true;
	}
	if (msg?.type === 'etis3-bg-state') {
		getState().then(reply);
		return true;
	}
	return false;
});
