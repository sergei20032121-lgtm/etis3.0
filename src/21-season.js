
// ============================================================
// ПРАЗДНИЧНОЕ ОФОРМЛЕНИЕ — Хэллоуин и Новый год
// ============================================================
// Только страницы кабинета, за стеклом (как аврора). Выключается в настройках,
// при «уменьшении движения» — без анимации. Для проверки: ?etis3-season=halloween|newyear

function currentSeason(d = new Date()) {
	const forced = new URLSearchParams(location.search).get('etis3-season');
	if (forced === 'halloween' || forced === 'newyear') return forced;
	const m = d.getMonth() + 1, day = d.getDate();
	if ((m === 10 && day >= 24) || (m === 11 && day <= 2)) return 'halloween';
	if ((m === 12 && day >= 15) || (m === 1 && day <= 10)) return 'newyear';
	return null;
}

// var, а не let: applySettings() зовёт applySeason() при старте, раньше этой строки
var seasonLayer = null, snowStop = null;

function applySeason() {
	const root = document.documentElement;
	const s = settings.season && document.querySelector('div.span3') ? currentSeason() : null;
	['halloween', 'newyear'].forEach(k => root.classList.toggle('etis3-season-' + k, s === k));
	if (!s) { seasonLayer?.remove(); seasonLayer = null; snowStop?.(); snowStop = null; return; }
	if (seasonLayer?.dataset.season === s) return;
	seasonLayer?.remove(); snowStop?.(); snowStop = null;
	seasonLayer = createEl('div', { id: 'etis3-season', 'aria-hidden': 'true' });
	seasonLayer.dataset.season = s;
	if (s === 'halloween') {
		const bat = '<svg viewBox="0 0 64 32"><path d="M32 10c2-4 6-6 6-6s-1 4 0 6c4-6 14-8 26-4-6 2-9 6-9 11-4-3-8-3-11 1-2-2-5-3-7-1-2-3-3-5-5-7-2 2-3 4-5 7-2-2-5-1-7 1-3-4-7-4-11-1 0-5-3-9-9-11 12-4 22-2 26 4 1-2 0-6 0-6s4 2 6 6z"/></svg>';
		seasonLayer.innerHTML = [1, 2, 3, 4, 5].map(i => `<i class="ss-bat ss-bat--${i}">${bat}</i>`).join('');
	} else {
		const c = createEl('canvas', { className: 'ss-snow' });
		seasonLayer.appendChild(c);
		snowStop = startSnow(c);
	}
	document.body.prepend(seasonLayer);
}

function startSnow(canvas) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	let W = 0, H = 0, flakes = [], raf = 0, stopped = false;
	const resize = () => {
		const dpr = Math.min(2, devicePixelRatio || 1);
		W = innerWidth; H = innerHeight;
		canvas.width = W * dpr; canvas.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const n = Math.round(Math.min(90, W * H / 14000));
		flakes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.8 + Math.random() * 2.4, v: 0.25 + Math.random() * 0.7, d: Math.random() * Math.PI * 2 }));
	};
	const draw = () => {
		ctx.clearRect(0, 0, W, H);
		ctx.fillStyle = document.documentElement.getAttribute('theme') === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(150,170,210,0.75)';
		flakes.forEach(f => {
			if (!reduce) { f.y += f.v; f.d += 0.01; f.x += Math.sin(f.d) * 0.35; if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; } }
			ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
		});
		if (!reduce && !stopped && !document.hidden) raf = requestAnimationFrame(draw);
	};
	const onVis = () => { if (!document.hidden && !stopped && !reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } };
	resize(); draw();
	window.addEventListener('resize', resize);
	document.addEventListener('visibilitychange', onVis);
	return () => { stopped = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); };
}

onReady(applySeason);
