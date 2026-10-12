// ============================================================
// НЕДЕЛЯ КАРТИНКОЙ — расписание для чата группы
// ============================================================

function hexToHue(hex) {
	const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
	const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
	if (!d) return 260;
	const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return Math.round((h * 60 + 360) % 360);
}

function renderWeekImage(week, title, sub, isCurrentWeek) {
	const W = 1080, P = 72;
	const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#7c6fd4';
	const hue = /^#[0-9a-f]{6}$/i.test(accent) ? hexToHue(accent) : 260;
	const font = (w, size) => `${w} ${size}px -apple-system, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif`;
	const fmt = ([h, m]) => `${h}:${String(m).padStart(2, '0')}`;
	const slot = num => PAIR_SCHEDULE.find(p => p.num === num);
	const days = week.filter(d => d.pairs.length);
	const total = days.reduce((s, d) => s + d.pairs.length, 0);

	const measure = document.createElement('canvas').getContext('2d');
	const wrap = (text, maxW, f, maxLines) => {
		measure.font = f;
		const words = text.split(/\s+/), lines = [];
		let line = '';
		words.forEach(w => { const t = line ? line + ' ' + w : w; if (measure.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
		if (line) lines.push(line);
		if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (measure.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l.trimEnd() + '…'; }
		return lines;
	};
	const ellipsize = (text, maxW, f) => wrap(text, maxW, f, 1)[0] || '';

	// Раскладка: сначала считаем высоту, потом рисуем
	const nameW = W - P * 2 - 210, nameFont = font(700, 38), subFont = font(500, 28);
	const blocks = days.map(d => ({
		d, rows: d.pairs.map(p => {
			const lines = wrap(p.name, nameW, nameFont, 2);
			const subText = [p.type?.label, p.aud].filter(Boolean).join(' · ');
			return { p, lines, subText, h: 44 + lines.length * 48 + (subText ? 40 : 0) };
		}),
	}));
	let H = 430;
	blocks.forEach(b => { H += 90 + b.rows.reduce((s, r) => s + r.h + 16, 0); });
	H = Math.max(1350, H + 130);

	const c = document.createElement('canvas');
	c.width = W; c.height = H;
	const x = c.getContext('2d');
	const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };

	const bg = x.createLinearGradient(0, 0, W * 0.4, H);
	bg.addColorStop(0, `hsl(${hue} 55% 18%)`); bg.addColorStop(0.5, `hsl(${(hue + 30) % 360} 45% 11%)`); bg.addColorStop(1, '#090912');
	x.fillStyle = bg; x.fillRect(0, 0, W, H);
	[[W * 0.85, 140, 520, `hsla(${hue},90%,62%,0.35)`], [80, H * 0.55, 600, `hsla(${(hue + 60) % 360},85%,55%,0.18)`], [W * 0.7, H - 120, 520, `hsla(${(hue + 300) % 360},85%,60%,0.2)`]].forEach(([cx, cy, r, col]) => {
		const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(0, 0, W, H);
	});

	// Шапка
	x.fillStyle = 'rgba(255,255,255,0.65)'; x.font = font(700, 30);
	x.fillText('МОЯ НЕДЕЛЯ', P, 120);
	x.fillStyle = '#fff'; x.font = font(800, 104);
	x.fillText(title, P, 236);
	x.fillStyle = 'rgba(255,255,255,0.75)'; x.font = font(500, 38);
	x.fillText(ellipsize(sub, W - P * 2, font(500, 38)), P, 300);
	let cx = P;
	[`${total} ${plural(total, 'пара', 'пары', 'пар')}`, `${days.length} ${plural(days.length, 'учебный день', 'учебных дня', 'учебных дней')}`].forEach(t => {
		x.font = font(700, 28);
		const w = x.measureText(t).width + 48;
		x.fillStyle = 'rgba(255,255,255,0.12)'; rr(cx, 340, w, 56, 28); x.fill();
		x.fillStyle = '#fff'; x.fillText(t, cx + 24, 378);
		cx += w + 14;
	});

	let y = 470;
	blocks.forEach(({ d, rows }) => {
		const label = d.title.replace(/\s+/g, ' ').trim();
		x.font = font(800, 40); x.fillStyle = '#fff';
		x.fillText(label, P, y + 44);
		if (d.isToday && isCurrentWeek) {
			const lw = x.measureText(label).width;
			x.font = font(700, 24);
			const tw = x.measureText('СЕГОДНЯ').width + 32;
			x.fillStyle = `hsl(${hue} 85% 66%)`; rr(P + lw + 20, y + 12, tw, 42, 21); x.fill();
			x.fillStyle = '#120f22'; x.fillText('СЕГОДНЯ', P + lw + 36, y + 42);
		}
		y += 74;
		rows.forEach(({ p, lines, subText, h }) => {
			const t = slot(p.num);
			const dh = disciplineHue(p.name);
			x.fillStyle = 'rgba(255,255,255,0.075)'; rr(P, y, W - P * 2, h, 32); x.fill();
			x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; rr(P, y, W - P * 2, h, 32); x.stroke();
			x.fillStyle = '#fff'; x.font = font(800, 40);
			x.fillText(t ? fmt(t.start) : `${p.num} пара`, P + 32, y + 62);
			if (t) { x.fillStyle = 'rgba(255,255,255,0.55)'; x.font = font(600, 28); x.fillText(fmt(t.end), P + 32, y + 102); }
			x.fillStyle = `hsl(${dh} 80% 64%)`; rr(P + 170, y + 26, 8, h - 52, 4); x.fill();
			x.fillStyle = '#fff'; x.font = nameFont;
			lines.forEach((l, i) => x.fillText(l, P + 200, y + 62 + i * 48));
			if (subText) { x.fillStyle = 'rgba(255,255,255,0.68)'; x.font = subFont; x.fillText(ellipsize(subText, nameW, subFont), P + 200, y + 62 + lines.length * 48 + 4); }
			y += h + 16;
		});
		y += 16;
	});

	x.fillStyle = 'rgba(255,255,255,0.5)'; x.font = font(600, 28);
	x.fillText('ЕТИС 3.0', P, H - 64);
	return c;
}


