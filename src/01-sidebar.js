// ============================================================
// АНИМАЦИИ ПОЯВЛЕНИЯ
// ============================================================

function animatePageIn() {
	const sidebar = document.querySelector('.span3');
	if (sidebar) {
		sidebar.style.cssText += 'opacity:0;transform:translateX(-12px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			sidebar.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
			sidebar.style.opacity    = '1';
			sidebar.style.transform  = 'translateX(0)';
		}));
	}

	const h3 = document.querySelector('.span9 > h3');
	if (h3) {
		h3.style.cssText += 'opacity:0;transform:translateX(-10px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			h3.style.transition = 'opacity 0.30s ease 0.08s, transform 0.30s ease 0.08s';
			h3.style.opacity    = '1';
			h3.style.transform  = 'translateX(0)';
		}));
	}

	const cards = document.querySelectorAll(
		'.day, table.common, table.slimtab_nice, .nav.msg, .nav.answ, .teacher_info, .form, .next-pair-widget'
	);
	cards.forEach((el, i) => {
		el.style.cssText += 'opacity:0;transform:translateY(16px)';
		requestAnimationFrame(() => requestAnimationFrame(() => {
			const delay = 80 + i * 50;
			el.style.transition = `opacity 0.36s ease ${delay}ms, transform 0.36s ease ${delay}ms`;
			el.style.opacity    = '1';
			el.style.transform  = 'translateY(0)';
		}));
	});
}


// ============================================================
// ПОИСК ПО САЙДБАРУ
// ============================================================

function addSidebarSearch(sidebar) {
	const wrap  = createEl('div', { className: 'sidebar-search-wrap' });
	const icon  = createEl('span', { className: 'material-icons sidebar-search-icon', textContent: 'search' });
	const input = createEl('input', { type: 'text', placeholder: 'Поиск по меню…', className: 'sidebar-search-input' });
	wrap.appendChild(icon);
	wrap.appendChild(input);
	sidebar.insertBefore(wrap, sidebar.firstChild);

	const allLinks = sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked:not(.etis3-quickbar) > li:not(.etis3-nav-head)');
	input.addEventListener('input', () => {
		const q = input.value.trim().toLowerCase();
		// Во время поиска свёрнутые группы раскрываются, заголовки групп прячутся
		sidebar.classList.toggle('etis3-searching', !!q);
		allLinks.forEach(li => {
			const match = !q || li.textContent.trim().toLowerCase().includes(q);
			li.classList.toggle('etis3-nav-miss', !match);
			li.style.background = (match && q) ? 'var(--color-accent-bg)' : '';
		});
	});
	input.addEventListener('keydown', e => {
		if (e.key === 'Escape') { input.value = ''; input.dispatchEvent(new Event('input')); }
	});
}


// ============================================================
// ИКОНКА ВКЛАДКИ
// ============================================================

function setIcon() {
	const icon = createEl('link', { rel: 'icon', type: 'image/svg+xml', href: chrome.runtime.getURL('icon.svg') });
	document.querySelector('head').appendChild(icon);
}


// ============================================================
// САЙДБАР
// ============================================================

function styleSidebar(sidebar) {
	requestAnimationFrame(() => {
		const top = sessionStorage.getItem('sidebar-scroll');
		if (top) sidebar.scrollTop = parseInt(top, 10);
		window.addEventListener('beforeunload', () => {
			sessionStorage.setItem('sidebar-scroll', Math.round(sidebar.scrollTop));
		});
	});

	// ЕТИС иногда помечает активными несколько пунктов (учебный план + дисциплины по выбору) —
	// если есть точное совпадение с адресом, подсвечиваем только его
	const items = [...sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked > li')];
	const exact = items.filter(li => li.querySelector('a')?.href === window.location.href);
	if (exact.length) items.forEach(li => li.classList.toggle('active', exact.includes(li)));

	const nav = sidebar.querySelector('ul:nth-last-child(1)');
	if (nav) {
		const li            = createEl('li');
		const switcher      = createEl('a', { className: 'theme-switcher-btn' });
		const switcherIcon  = createEl('span', { className: 'material-icons', textContent: themeIcon(settings.theme) });
		const switcherLabel = createEl('span', { className: 'theme-label', textContent: THEME_LABELS[settings.theme] });
		switcher.appendChild(switcherIcon);
		switcher.appendChild(switcherLabel);
		switcher.addEventListener('click', switchTheme);
		li.appendChild(switcher);
		nav.prepend(li);

		const iconMap = {
			'stu.change_pass_form':       'vpn_key',
			'stu_email_pkg.change_email': 'alternate_email',
			'stu.change_pr_page':         'account_box',
			'stu.logout':                 'exit_to_app',
		};
		nav.querySelectorAll('li > a').forEach(a => {
			const name = iconMap[navKey(a)];
			if (name) a.prepend(createEl('span', { className: 'material-icons', textContent: name }));
		});
	}

	sidebar.querySelectorAll('li').forEach(li => {
		const a    = li.querySelector('a');
		const href = a ? navKey(a) : '';
		if (href === 'stu_plus.add_snils' || href === 'ebl_stu.ebl_choice' || li.classList.contains('warn_menu'))
			a?.appendChild(createEl('span', { className: 'badge-point' }));
	});

	groupSidebarNav(sidebar);
	addSidebarSearch(sidebar);
	addProfileCard(sidebar);

	// Прогресс-бар семестра
	addSemesterProgress(sidebar);

	// Кнопка настроек ЕТИС 3.0
	const allNavs = sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked');
	const lastNav = allNavs[allNavs.length - 1];
	if (lastNav) {
		const li = createEl('li', { className: 'etis3-settings-li' });
		const a  = createEl('a',  { className: 'etis3-settings-btn', href: '#' });
		a.innerHTML = '<span class="material-icons">tune</span><span>Настройки ЕТИС 3.0</span>';
		a.addEventListener('click', e => { e.preventDefault(); openSettingsPanel(); });
		li.appendChild(a);
		lastNav.appendChild(li);

		// Нижний блок (тема, пароль, email, выход, настройки) — строка иконок с подсказками
		lastNav.classList.add('etis3-quickbar');
		lastNav.querySelectorAll('li > a').forEach(link => {
			link.title = [...link.childNodes].filter(n => !n.classList?.contains('material-icons'))
				.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
		});
	}

	// Подпись ЕТИС 3.0 by Комар внизу сайдбара
	const branding = createEl('div', { className: 'etis3-branding', innerHTML: 'ЕТИС 3.0 <span>by Комар</span>' });
	sidebar.appendChild(branding);
}


// ============================================================
// ГРУППЫ В САЙДБАРЕ
// ============================================================

// Ключ пункта меню: имя страницы (+ режим для учебного плана)
const NAV_ITEMS = {
	'stu.timetable':                ['main',  'event'],
	'stu.signs':                    ['main',  'grade'],
	'stu.teacher_notes':            ['main',  'forum'],
	'stu_ann.announces':            ['main',  'campaign'],
	'stu.teach_plan':               ['study', 'menu_book'],
	'stu.teach_plan?choose_dis':    ['study', 'playlist_add_check'],
	'ebl_stu.ebl_choice':           ['study', 'how_to_vote'],
	'stu.fcl_choice':               ['study', 'extension'],
	'stu.absence':                  ['study', 'event_busy'],
	'stu_jour.group_tt':            ['study', 'fact_check'],
	'stu.ses':                      ['study', 'verified'],
	'stu.teachers':                 ['study', 'school'],
	'est_pkg.show_list':            ['study', 'rate_review'],
	'stu.orders':                   ['docs',  'gavel'],
	'cert_pkg.stu_certif':          ['docs',  'assignment'],
	'stu_pay.contract_list':        ['docs',  'receipt_long'],
	'stu_plus.blank_forms':         ['docs',  'file_copy'],
	'stu.sc_portfolio':             ['docs',  'emoji_events'],
	'stu.library':                  ['res',   'local_library'],
	'stu.electr':                   ['res',   'cloud'],
	'stu_plus.advice':              ['res',   'lightbulb'],
	'stu.about':                    ['res',   'info'],
};

const NAV_GROUPS = [
	['study', 'Учёба',     'school'],
	['docs',  'Документы', 'folder'],
	['res',   'Ресурсы',   'auto_stories'],
];

function navKey(a) {
	try {
		const u = new URL(a.href, location.href);
		const mode = u.searchParams.get('p_mode');
		const page = u.pathname.split('/').pop();
		return mode && NAV_ITEMS[`${page}?${mode}`] ? `${page}?${mode}` : page;
	} catch (e) { return ''; }
}

function readOpenGroups() {
	try { return JSON.parse(localStorage.getItem('etis3-nav-open')) || []; } catch (e) { return []; }
}

function groupSidebarNav(sidebar) {
	const nav = [...sidebar.querySelectorAll('.nav.nav-tabs.nav-stacked')]
		.find(ul => ul.querySelector('a[href*="stu.timetable"]'));
	if (!nav) return;
	nav.classList.add('etis3-main-nav');

	const buckets = { main: [], study: [], docs: [], res: [] };
	[...nav.children].forEach(li => {
		const a = li.querySelector('a');
		if (!a) return;
		const [group, icon] = NAV_ITEMS[navKey(a)] || ['res', 'chevron_right'];
		decorateNavLink(a, icon);
		li.dataset.group = group;
		buckets[group].push(li);
	});

	// Главное — сверху всегда, в заданном порядке
	const mainOrder = Object.keys(NAV_ITEMS).filter(k => NAV_ITEMS[k][0] === 'main');
	buckets.main.sort((x, y) => mainOrder.indexOf(navKey(x.querySelector('a'))) - mainOrder.indexOf(navKey(y.querySelector('a'))));
	buckets.main.forEach(li => nav.appendChild(li));

	const open = readOpenGroups();
	NAV_GROUPS.forEach(([key, title, icon]) => {
		const items = buckets[key];
		if (!items.length) return;
		const hasActive = items.some(li => li.classList.contains('active'));
		const isOpen = hasActive || open.includes(key);

		const head = createEl('li', { className: 'etis3-nav-head' });
		const btn  = createEl('a', { className: 'etis3-nav-head__btn' });
		btn.innerHTML = `<span class="material-icons">${icon}</span><span class="etis3-nav-label">${title}</span><span class="etis3-nav-head__count">${items.length}</span><span class="material-icons etis3-nav-head__chevron">expand_more</span>`;
		head.appendChild(btn);
		head.classList.toggle('etis3-nav-head--open', isOpen);
		nav.appendChild(head);
		items.forEach(li => { li.classList.toggle('etis3-nav-closed', !isOpen); nav.appendChild(li); });

		btn.addEventListener('click', e => {
			e.preventDefault();
			const nowOpen = !head.classList.contains('etis3-nav-head--open');
			head.classList.toggle('etis3-nav-head--open', nowOpen);
			items.forEach(li => li.classList.toggle('etis3-nav-closed', !nowOpen));
			const state = new Set(readOpenGroups());
			nowOpen ? state.add(key) : state.delete(key);
			try { localStorage.setItem('etis3-nav-open', JSON.stringify([...state])); } catch (err) {}
		});
	});
}

// Иконка слева, подпись по центру, счётчик «(3)» — бейджем справа
function decorateNavLink(a, icon) {
	const point = a.querySelector('.badge-point');
	const label = createEl('span', { className: 'etis3-nav-label' });
	[...a.childNodes].forEach(n => { if (n !== point) label.appendChild(n); });

	const last = label.lastChild;
	if (last && last.nodeType === Node.TEXT_NODE) {
		const m = last.textContent.match(/\s*\(([\d/]+)\)\s*$/);
		if (m) {
			last.textContent = last.textContent.slice(0, m.index);
			const count = createEl('span', { className: 'etis3-nav-count', textContent: m[1] });
			if (!/[1-9]/.test(m[1])) count.classList.add('etis3-nav-count--zero');
			a.append(createEl('span', { className: 'material-icons', textContent: icon }), label, count);
			if (point) a.appendChild(point);
			return;
		}
	}
	a.append(createEl('span', { className: 'material-icons', textContent: icon }), label);
	if (point) a.appendChild(point);
}


// Шапка ЕТИСа скрыта стилями — переносим ФИО и направление в сайдбар
function addProfileCard(sidebar) {
	const info = document.querySelector('.navbar .span12 > span');
	if (!info) return;
	const fullName = (info.firstChild?.textContent || '').replace(/\(.*?\)/, '').trim();
	if (!fullName) return;
	const parts = [...info.querySelectorAll(':scope > span')].map(s => s.textContent.trim()).filter(Boolean);
	const words = fullName.split(/\s+/);
	const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

	const card = createEl('div', { className: 'etis3-profile', title: fullName });
	card.appendChild(createEl('div', { className: 'etis3-profile__avatar', textContent: initials }));
	const text = createEl('div', { className: 'etis3-profile__info' });
	text.appendChild(createEl('div', { className: 'etis3-profile__name', textContent: words.slice(0, 2).join(' ') }));
	if (parts.length) text.appendChild(createEl('div', { className: 'etis3-profile__sub', textContent: parts.join(' · ') }));
	card.appendChild(text);
	sidebar.prepend(card);
}


