// ============================================================
// ЛОГИН
// ============================================================

// Приложение запоминает логин/пароль только по согласию (диалог после входа) и хранит их зашифрованными
function initAppLogin(form) {
	const user = form.querySelector('#login, input[name="p_username"]');
	const pass = form.querySelector('input[type="password"]');
	let last = '';
	const report = () => {
		if (!user?.value.trim() || !pass?.value) return;
		const key = user.value.trim() + '\n' + pass.value;
		if (key === last) return;   // клик по кнопке и submit формы — одно и то же
		last = key;
		try { window.ETIS3Native.loginSubmitted(user.value.trim(), pass.value); } catch (e) {}
	};
	form.querySelector('#sbmt')?.addEventListener('click', report, true);
	form.addEventListener('keydown', e => { if (e.key === 'Enter') report(); }, true);
	form.addEventListener('submit', report, true);
	let saved = false;
	try { saved = window.ETIS3Native.hasSavedLogin(); } catch (e) {}
	if (!saved) return;
	const bio = createEl('a', { href: '#', className: 'login-bio', innerHTML: '<span class="material-icons">fingerprint</span>Войти по отпечатку' });
	const forget = createEl('a', { href: '#', className: 'login-bio-forget', textContent: 'Забыть сохранённый вход' });
	bio.addEventListener('click', e => { e.preventDefault(); window.ETIS3Native.biometricLogin(); });
	forget.addEventListener('click', e => { e.preventDefault(); window.ETIS3Native.forgetLogin(); bio.remove(); forget.remove(); });
	form.append(bio, forget);
}

function styleLoginPage(page) {
	document.body.innerHTML = '<div class="login-container">' + document.body.innerHTML + '</div>';
	const loginContainer = document.querySelector('div.login-container');
	// Разметка входа бывает разной (десктоп / мобильная / восстановление) — ищем по смыслу
	const form = document.querySelector('.login form') || document.querySelector('input[type="password"]')?.form || document.querySelector('form');
	if (!form) return;
	if (!form.id) form.id = 'form';
	let loginItems = form.querySelector(':scope > div.items') || form.querySelector('div.items');
	if (!loginItems) {
		// Нет привычной обёртки полей — создаём, стили рассчитаны на form > .items > .item
		loginItems = createEl('div', { className: 'items' });
		const firstField = form.querySelector('input:not([type="hidden"])');
		firstField ? firstField.before(loginItems) : form.appendChild(loginItems);
	}
	const loginActions = createEl('div', { className: 'login-actions' });
	loginItems.appendChild(loginActions);
	const recovery = page === 'stu_email_pkg.send_r_email';

	form.querySelectorAll(':scope > h1, :scope > h2, :scope > h3').forEach(h => h.classList.add('login-form-title'));
	if (!recovery) {
		document.querySelector('div.choose')?.remove();
		form.prepend(createEl('div', { className: 'psu-logo' }));
		const forgot = [...form.querySelectorAll('a')].find(a => /забыл|восстанов|send_r_email/i.test(a.textContent + a.href));
		if (forgot) { forgot.className = 'forgot-password'; loginActions.appendChild(forgot); }
	}
	const btn = form.querySelector('#sbmt') || form.querySelector('button, input[type="submit"]');
	if (btn) { btn.id = btn.id || 'sbmt'; loginActions.appendChild(btn); }

	// Поля: обёртка .item, подпись после поля (плавающий label), placeholder для :placeholder-shown
	form.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input:not([type])').forEach(inp => {
		let item = inp.closest('div.item');
		if (!item || !form.contains(item)) {
			item = createEl('div', { className: 'item' });
			inp.before(item);
			item.appendChild(inp);
		}
		const lbl = (inp.id && form.querySelector(`label[for="${inp.id}"]`)) || item.querySelector('label');
		if (lbl) {
			item.appendChild(lbl);
		} else if (inp.placeholder && inp.placeholder.trim()) {
			item.appendChild(createEl('label', { textContent: inp.placeholder.trim(), for: inp.id || '' }));
		}
		inp.placeholder = ' ';
		if (item.parentElement !== loginItems) loginItems.insertBefore(item, loginActions);
	});
	form.querySelectorAll('div.item').forEach(item => {
		const err = item.querySelector('div.error_message');
		if (err) { loginContainer.prepend(err); item.remove(); }
	});

	if (!recovery) {
		const infoStr = (loginItems.textContent.match(/По всем вопросам[^\n]*/) || [''])[0].trim();
		const footer  = document.querySelector('div.header_message');
		if (footer) {
			footer.className = 'footer';
			footer.innerHTML = '<p>' + footer.innerHTML + '</p>' + (infoStr ? '<p>' + escapeHtml(infoStr) + '</p>' : '');
			loginContainer.appendChild(footer);
		}
		// Текст «По всем вопросам…» внутри формы больше не нужен — он в подвале
		[...loginItems.childNodes].forEach(n => { if (n.nodeType === 3 && /По всем вопросам/.test(n.textContent)) n.remove(); });
	}

	// Бренд на странице входа
	const brand = createEl('div', { className: 'login-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	loginContainer.appendChild(brand);

	buildLoginScene(loginContainer, page);

	// Анимированный фон — частицы
	initLoginParticles(loginContainer);
}

// ---------- Сцена входа: аврора, приветствие, живая карточка ----------

function loginGreeting(h) {
	if (h >= 5 && h < 12)  return 'Доброе утро';
	if (h >= 12 && h < 17) return 'Добрый день';
	if (h >= 17 && h < 23) return 'Добрый вечер';
	return 'Доброй ночи';
}

function buildLoginScene(container, page) {
	const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const login   = container.querySelector('.login');
	const form    = container.querySelector('.login form, .login #form');
	if (!login || !form) return;
	document.documentElement.classList.add('etis3-login-page');

	// Аврора: большие размытые пятна света за стеклом
	const aurora = buildAurora(container, 'aurora--login');

	// Герой: приветствие, большое название и живые часы
	const recovery = page === 'stu_email_pkg.send_r_email';
	const hero = createEl('div', { className: 'login-hero' });
	hero.innerHTML = `
		<div class="lh-greeting">${recovery ? 'Восстановим доступ' : loginGreeting(new Date().getHours())}</div>
		<h1 class="lh-title" aria-label="ЕТИС 3.0">${[...'ЕТИС'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}<sup>3.0</sup></h1>
		<div class="lh-sub">Личный кабинет студента ПГНИУ</div>
		<div class="lh-clock"><span class="lh-time"></span><span class="lh-date"></span></div>
	`;
	const stage = createEl('div', { className: 'login-stage' });
	login.before(stage);
	stage.append(hero, login);

	const timeEl = hero.querySelector('.lh-time'), dateEl = hero.querySelector('.lh-date');
	const tick = () => {
		const d = new Date();
		timeEl.textContent = formatTime(d.getHours(), d.getMinutes());
		dateEl.textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
	};
	tick();
	setInterval(tick, 10 * 1000);

	// Пароль: показать / скрыть и предупреждение о Caps Lock
	const pass = form.querySelector('input[type="password"]');
	if (pass) {
		const item = pass.closest('.item');
		const eye  = createEl('button', { type: 'button', className: 'login-eye', title: 'Показать пароль', 'aria-label': 'Показать пароль' });
		eye.innerHTML = '<span class="material-icons">visibility</span>';
		eye.addEventListener('click', () => {
			const show = pass.type === 'password';
			pass.type = show ? 'text' : 'password';
			eye.firstChild.textContent = show ? 'visibility_off' : 'visibility';
			eye.title = show ? 'Скрыть пароль' : 'Показать пароль';
			pass.focus();
		});
		const caps = createEl('div', { className: 'login-caps', textContent: 'Включён Caps Lock' });
		item?.append(eye, caps);
		const checkCaps = e => { if (e.getModifierState) caps.classList.toggle('show', e.getModifierState('CapsLock')); };
		pass.addEventListener('keydown', checkCaps);
		pass.addEventListener('keyup', checkCaps);
		pass.addEventListener('blur', () => caps.classList.remove('show'));
	}

	// Кнопка: состояние «входим…». Сабмит не трогаем — его делает скрипт ЕТИСа.
	const btn = form.querySelector('#sbmt');
	if (btn) btn.addEventListener('click', () => {
		const filled = [...form.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]')].every(i => i.value.trim());
		if (!filled) return;
		btn.classList.add('is-loading');
		container.classList.add('etis3-leaving');
		try { sessionStorage.setItem('etis3-just-logged', '1'); } catch (e) {}
		setTimeout(() => { btn.classList.remove('is-loading'); container.classList.remove('etis3-leaving'); }, 8000);
	});

	// Android-приложение: запомнить вход и «Войти по отпечатку»
	if (window.ETIS3Native?.loginSubmitted) initAppLogin(form);

	// Ошибка входа — карточка «встряхивается»
	if (container.querySelector(':scope > .error_message')) form.classList.add('login-shake');

	// Фокус сразу в первое пустое поле
	setTimeout(() => form.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true }), reduced ? 0 : 900);

	if (reduced) return;

	// Карточка следит за курсором: лёгкий 3D-наклон и блик там, где мышь.
	// Аврора чуть смещается — эффект глубины.
	let raf = 0, mx = 0.5, my = 0.5, gx = 0, gy = 0;
	const apply = () => {
		raf = 0;
		const r = form.getBoundingClientRect();
		const lx = (mx * innerWidth - r.left) / r.width, ly = (my * innerHeight - r.top) / r.height;
		const inside = lx > -0.15 && lx < 1.15 && ly > -0.15 && ly < 1.15;
		form.style.setProperty('--mx', (lx * 100).toFixed(1) + '%');
		form.style.setProperty('--my', (ly * 100).toFixed(1) + '%');
		form.style.setProperty('--ry', inside ? ((lx - 0.5) * 7).toFixed(2) + 'deg' : '0deg');
		form.style.setProperty('--rx', inside ? ((0.5 - ly) * 6).toFixed(2) + 'deg' : '0deg');
		form.classList.toggle('is-hover', inside);
		aurora.style.setProperty('--px', gx.toFixed(3));
		aurora.style.setProperty('--py', gy.toFixed(3));
	};
	window.addEventListener('mousemove', e => {
		mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
		gx = mx - 0.5; gy = my - 0.5;
		if (!raf) raf = requestAnimationFrame(apply);
	});
	document.addEventListener('mouseleave', () => { mx = my = -1; gx = gy = 0; if (!raf) raf = requestAnimationFrame(apply); });
}


// ============================================================
// ЧАСТИЦЫ НА СТРАНИЦЕ ВХОДА
// ============================================================

function initLoginParticles(container) {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

	const canvas = createEl('canvas', { id: 'etis3-particles' });
	const ctx = canvas.getContext('2d');
	if (!ctx) return;   // canvas недоступен (отключено ускорение и т.п.) — вход работает и без частиц
	container.insertBefore(canvas, container.firstChild);
	let W, H, particles, mouse = { x: -999, y: -999 };

	const isDark = () => document.documentElement.getAttribute('theme') === 'dark';

	function resize() {
		W = canvas.width  = window.innerWidth;
		H = canvas.height = window.innerHeight;
	}

	function getAccentRgb() {
		return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-rgb').trim()
			|| (isDark() ? '157,142,240' : '124,111,212');
	}

	class Particle {
		constructor(index) {
			this.reset(true);
			// Равномерное распределение по экрану при старте
			this.y = Math.random() * H;
			this.index = index;
		}

		reset(initial = false) {
			this.x     = Math.random() * W;
			this.y     = initial ? Math.random() * H : H + 20;
			this.r     = Math.random() * 2.2 + 0.6;
			this.speedY = -(Math.random() * 0.4 + 0.15);
			this.speedX = (Math.random() - 0.5) * 0.3;
			this.alpha  = Math.random() * 0.5 + 0.15;
			this.targetAlpha = this.alpha;
			this.pulse  = Math.random() * Math.PI * 2; // фаза пульсации
			this.pulseSpeed = Math.random() * 0.012 + 0.005;
			this.glow   = Math.random() > 0.75; // часть частиц с glow
		}

		update() {
			this.x    += this.speedX;
			this.y    += this.speedY;
			this.pulse += this.pulseSpeed;

			// Лёгкое притяжение к курсору
			const dx = mouse.x - this.x;
			const dy = mouse.y - this.y;
			const dist = Math.sqrt(dx*dx + dy*dy);
			if (dist < 140) {
				const force = (140 - dist) / 140 * 0.012;
				this.x += dx * force;
				this.y += dy * force;
			}

			// Пульсация прозрачности
			this.alpha = this.targetAlpha * (0.7 + 0.3 * Math.sin(this.pulse));

			if (this.y < -20) this.reset();
		}

		draw(rgb) {
			ctx.save();

			if (this.glow) {
				ctx.shadowBlur  = this.r * 8;
				ctx.shadowColor = `rgba(${rgb}, 0.6)`;
			}

			ctx.globalAlpha = this.alpha;
			ctx.fillStyle   = `rgba(${rgb}, 1)`;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}

	function drawConnections(rgb) {
		for (let i = 0; i < particles.length; i++) {
			for (let j = i + 1; j < particles.length; j++) {
				const dx   = particles[i].x - particles[j].x;
				const dy   = particles[i].y - particles[j].y;
				const dist = Math.sqrt(dx*dx + dy*dy);
				if (dist < 100) {
					const alpha = (1 - dist / 100) * 0.12;
					ctx.beginPath();
					ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
					ctx.lineWidth   = 0.5;
					ctx.moveTo(particles[i].x, particles[i].y);
					ctx.lineTo(particles[j].x, particles[j].y);
					ctx.stroke();
				}
			}
		}
	}

	function init() {
		resize();
		const count = Math.min(80, Math.floor(W * H / 14000));
		particles   = Array.from({ length: count }, (_, i) => new Particle(i));
	}

	let animId;
	function animate() {
		const rgb = getAccentRgb();
		ctx.clearRect(0, 0, W, H);
		drawConnections(rgb);
		particles.forEach(p => { p.update(); p.draw(rgb); });
		animId = requestAnimationFrame(animate);
	}

	window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
	window.addEventListener('resize', () => { resize(); });
	window.addEventListener('beforeunload', () => cancelAnimationFrame(animId));

	init();
	animate();
}






