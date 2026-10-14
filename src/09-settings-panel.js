// ============================================================
// ПАНЕЛЬ НАСТРОЕК
// ============================================================

// В userscript-версии нет фоновой проверки (только в расширении)
const IS_USERSCRIPT = typeof ETIS3_USERSCRIPT !== 'undefined';
// Внутри Android-приложения ЕТИС 3.0 (WebView добавляет ETIS3App к User-Agent)
const IS_APP = /ETIS3App\//.test(navigator.userAgent);

const SETTINGS_TOGGLES = {
	'РАСПИСАНИЕ': [
		['highlight', 'play_circle',   'Подсветка текущей пары', 'Выделяет пару, которая идёт сейчас'],
		['widget',    'schedule',      'Виджет следующей пары',  'Показывает, что идёт / что следующее'],
		['pairTypes', 'menu_book',     'Иконки типов пар',       'Лекция, практика, лаб. работа'],
	],
	'ИНТЕРФЕЙС': [
		['aurora',    'blur_on',       'Живой фон',              'Аврора за стеклом на всех страницах'],
		['sky',       'wb_twilight',   'Небо по времени суток',  'Утро, день, вечер и ночь — свои цвета'],
		['season',    'celebration',   'Праздничное оформление', 'Хэллоуин и Новый год — летучие мыши и снег'],
		['notify',    'notifications_active', 'Уведомления о новом', 'Оценки, сообщения и объявления — даже когда ЕТИС закрыт'],
		['compact',   'compress',      'Компактный режим',       'Меньше отступов, больше контента'],
		['scoreDots', 'grade',         'Цветные точки у оценок', 'Индикаторы рядом с баллом'],
	],
};

function openSettingsPanel() {
	if (document.getElementById('etis3-sp-overlay')) return;

	const overlay = createEl('div', { id: 'etis3-sp-overlay' });
	const panel   = createEl('div', { id: 'etis3-sp-panel' });

	panel.innerHTML = `
		<div class="etis3-sp-head">
			<div class="etis3-sp-title">
				<span class="material-icons">tune</span>
				ЕТИС 3.0 — Настройки
			</div>
			<button class="etis3-sp-close" id="etis3-sp-close-btn">
				<span class="material-icons">close</span>
			</button>
		</div>
		<div class="etis3-sp-body">
			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">ТЕМА</div>
				<div class="etis3-sp-row3">
					${['auto', 'light', 'dark'].map(t => `
						<button class="etis3-sp-opt" data-theme="${t}">
							<span class="material-icons">${themeIcon(t)}</span>${t === 'auto' ? 'Авто' : THEME_LABELS[t]}
						</button>
					`).join('')}
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">ВИД</div>
				<div class="etis3-sp-row3">
					<button class="etis3-sp-opt" data-layout="modern"><span class="material-icons">dashboard</span>Новый</button>
					<button class="etis3-sp-opt" data-layout="classic"><span class="material-icons">view_sidebar</span>Классический</button>
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">АКЦЕНТНЫЙ ЦВЕТ</div>
				<div class="etis3-sp-accents">
					${Object.entries(ETIS3_ACCENTS).map(([key, x]) => `
						<div class="etis3-sp-swatch" data-accent="${key}" title="${x.label}"
							style="background:${x.light}"></div>
					`).join('')}
					<label class="etis3-sp-swatch etis3-sp-swatch--custom" data-accent="custom" title="Свой цвет"><input type="color" aria-label="Свой цвет"></label>
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">ФОН</div>
				<div class="etis3-sp-walls">
					${Object.entries(ETIS3_WALLPAPERS).map(([key, label]) => `
						<div class="etis3-sp-wall wall-prev--${key}" data-wall="${key}" role="button" tabindex="0">
							${key === 'custom' ? '<span class="material-icons">add_photo_alternate</span>' : ''}<span>${label}</span>
						</div>`).join('')}
				</div>
				<input type="file" accept="image/*" id="etis3-sp-wallfile" hidden>
				<div class="etis3-sp-wallopts">
					<a href="#" id="etis3-sp-wallpick"><span class="material-icons">photo_library</span>Другое фото</a>
					<div class="etis3-sp-font-row">
						<span class="etis3-sp-dim-label">Затемнение</span>
						<input type="range" id="etis3-sp-dim" min="0" max="0.85" step="0.05">
					</div>
				</div>
			</div>

			<div class="etis3-sp-section">
				<div class="etis3-sp-section-label">РАЗМЕР ТЕКСТА</div>
				<div class="etis3-sp-font-row">
					<input type="range" id="etis3-sp-font" min="${ETIS3_FONT_MIN}" max="${ETIS3_FONT_MAX}" step="0.5">
					<span id="etis3-sp-font-val"></span>
				</div>
			</div>

			${Object.entries(SETTINGS_TOGGLES).map(([title, rows]) => [title, rows.filter(r => !(IS_USERSCRIPT && r[0] === 'notify'))]).map(([title, rows]) => `
				<div class="etis3-sp-section">
					<div class="etis3-sp-section-label">${title}</div>
					<div class="etis3-sp-toggles">
						${rows.map(([key, icon, label, sub]) => `
							<div class="etis3-sp-toggle-row">
								<div class="etis3-sp-toggle-info">
									<span class="material-icons">${icon}</span>
									<div>${label}<small>${sub}</small></div>
								</div>
								<label class="etis3-sp-toggle">
									<input type="checkbox" data-setting="${key}">
									<div class="etis3-sp-track"></div>
								</label>
							</div>
						`).join('')}
					</div>
				</div>
			`).join('')}

			<div class="etis3-sp-section etis3-sp-section-last">
				<a href="#" class="etis3-sp-report" id="etis3-sp-report"><span class="material-icons">bug_report</span>Сообщить о проблеме</a>
				<button class="etis3-sp-danger" id="etis3-sp-reset">
					<span class="material-icons">restart_alt</span>
					Сбросить все настройки
				</button>
			</div>
		</div>
	`;

	document.body.appendChild(overlay);
	document.body.appendChild(panel);

	const fontRange = panel.querySelector('#etis3-sp-font');
	const fontVal   = panel.querySelector('#etis3-sp-font-val');

	// Отрисовать текущее состояние (вызывается и при изменениях из попапа)
	function render() {
		panel.querySelectorAll('[data-theme]').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
		panel.querySelectorAll('[data-accent]').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));
		const customSw = panel.querySelector('.etis3-sp-swatch--custom');
		customSw.querySelector('input').value = settings.accentCustom;
		customSw.style.background = settings.accent === 'custom' ? settings.accentCustom : '';
		panel.querySelectorAll('[data-wall]').forEach(t => t.classList.toggle('active', t.dataset.wall === settings.wallpaper));
		const customWall = panel.querySelector('[data-wall="custom"]');
		customWall.style.backgroundImage = wallImg ? `url("${wallImg}")` : '';
		customWall.classList.toggle('has-photo', !!wallImg);
		panel.querySelector('.etis3-sp-wallopts').hidden = settings.wallpaper !== 'custom' || !wallImg;
		panel.querySelector('#etis3-sp-dim').value = settings.wallDim;
		panel.querySelectorAll('[data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === settings.layout));
		panel.querySelectorAll('[data-setting]').forEach(el => { el.checked = settings[el.dataset.setting]; });
		fontRange.value      = settings.fontSize;
		fontVal.textContent  = settings.fontSize + 'px';
	}
	render();
	// Своё фото загружаем, даже если сейчас выбран готовый фон — чтобы плитка «Своё фото» его показывала
	if (!wallImgLoaded) {
		wallImgLoaded = true;
		try { chrome.storage.local.get(ETIS3_WALL_IMG_KEY, res => { wallImg = res?.[ETIS3_WALL_IMG_KEY] || null; render(); }); } catch (e) {}
	}
	panel.etis3Render = render;

	requestAnimationFrame(() => requestAnimationFrame(() => {
		overlay.classList.add('etis3-sp-visible');
		panel.classList.add('etis3-sp-visible');
	}));

	function onKey(e) { if (e.key === 'Escape') close(); }
	function close() {
		document.removeEventListener('keydown', onKey);
		overlay.classList.remove('etis3-sp-visible');
		panel.classList.remove('etis3-sp-visible');
		setTimeout(() => { overlay.remove(); panel.remove(); }, 300);
	}

	document.addEventListener('keydown', onKey);
	overlay.addEventListener('click', close);
	panel.querySelector('#etis3-sp-close-btn').addEventListener('click', close);

	panel.querySelectorAll('[data-theme]').forEach(btn => {
		btn.addEventListener('click', () => { saveSettings({ theme: btn.dataset.theme }); render(); });
	});

	panel.querySelectorAll('[data-layout]').forEach(btn => {
		btn.addEventListener('click', () => { saveSettings({ layout: btn.dataset.layout }); render(); });
	});

	panel.querySelectorAll('.etis3-sp-swatch[data-accent]:not(.etis3-sp-swatch--custom)').forEach(sw => {
		sw.addEventListener('click', () => { saveSettings({ accent: sw.dataset.accent }); render(); });
	});
	const colorInput = panel.querySelector('.etis3-sp-swatch--custom input');
	colorInput.addEventListener('input', () => {   // живой предпросмотр, сохраняем по отпусканию
		settings = etis3Normalize({ ...settings, accent: 'custom', accentCustom: colorInput.value });
		applyAccent();
		render();
	});
	colorInput.addEventListener('change', () => { saveSettings({ accent: 'custom', accentCustom: colorInput.value }); render(); });

	const fileInput = panel.querySelector('#etis3-sp-wallfile');
	const pickPhoto = () => fileInput.click();
	panel.querySelectorAll('[data-wall]').forEach(tile => {
		const pick = () => {
			if (tile.dataset.wall === 'custom' && !wallImg) { pickPhoto(); return; }
			if (tile.dataset.wall === 'custom') wallImgLoaded = true;
			saveSettings({ wallpaper: tile.dataset.wall });
			render();
		};
		tile.addEventListener('click', pick);
		tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
	});
	panel.querySelector('#etis3-sp-wallpick').addEventListener('click', e => { e.preventDefault(); pickPhoto(); });
	fileInput.addEventListener('change', async () => {
		const file = fileInput.files?.[0];
		fileInput.value = '';
		if (!file) return;
		try { await setWallImage(file); showToast('Фон обновлён'); }
		catch (err) { showToast(err.message === 'quota' ? 'Фото не влезло в хранилище — попробуйте другое' : 'Не получилось открыть фото'); }
		render();
	});
	const dimRange = panel.querySelector('#etis3-sp-dim');
	dimRange.addEventListener('input', () => {
		document.documentElement.style.setProperty('--wall-dim', dimRange.value);
	});
	dimRange.addEventListener('change', () => saveSettings({ wallDim: parseFloat(dimRange.value) }));

	fontRange.addEventListener('input', () => {
		saveSettings({ fontSize: parseFloat(fontRange.value) });
		fontVal.textContent = settings.fontSize + 'px';
	});

	panel.querySelectorAll('[data-setting]').forEach(el => {
		el.addEventListener('change', () => saveSettings({ [el.dataset.setting]: el.checked }));
	});

	panel.querySelector('#etis3-sp-report').addEventListener('click', e => { e.preventDefault(); close(); openReportDialog(); });

	panel.querySelector('#etis3-sp-reset').addEventListener('click', () => {
		saveSettings({ ...ETIS3_DEFAULTS });
		render();
		showToast('Настройки сброшены');
	});
}


