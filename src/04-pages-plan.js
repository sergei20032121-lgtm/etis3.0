// ============================================================
// УЧЕБНЫЙ ПЛАН
// ============================================================

function stylePage_teachPlan(span9, pageMode) {
	if (!span9) return;
	if (pageMode === 'advanced') {
		const a = span9.querySelector('a:nth-child(2)');
		if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
	} else {
		const d = span9.querySelector('div:nth-child(2)');
		if (d) d.className = 'teach-plan';
		const a = span9.querySelector('div:nth-child(2) > div > a');
		if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
	}
}

function stylePage_tpr(span9) {
	if (!span9) return;
	const a = span9.querySelector('a');
	if (a) { a.className = 'icon-button icon-feedback'; a.text = 'Оставить отзыв'; }
}


// ============================================================
// ПРЕПОДАВАТЕЛИ
// ============================================================

function stylePage_teachers(span9) {
	if (!span9) return;
	const a = span9.querySelector('a');
	if (a) a.className = 'icon-button icon-analytics';
	span9.querySelectorAll('.teacher_desc').forEach(desc => {
		['teacher_name', 'chair'].forEach(cls => {
			const container = desc.querySelector('.' + cls);
			const img = container && container.querySelector('img');
			if (!img) return;
			const btn = createEl('a', { className: 'icon-button2', textContent: 'today' });
			btn.setAttribute('onclick', img.getAttribute('onclick'));
			btn.title = img.title;
			img.remove();
			container.appendChild(btn);
		});
	});
}


// ============================================================
// ПОРТФОЛИО
// ============================================================

function stylePage_portfolio(span9) {
	if (!span9) return;

	// Счётчики разделов: «(0)» → «0», пустые разделы приглушаем
	span9.querySelectorAll('h3 > a.dashed > span[id$="_cnt"]').forEach(cnt => {
		const n = parseInt(cnt.textContent.replace(/\D/g, ''), 10) || 0;
		cnt.textContent = n;
		cnt.closest('h3').classList.toggle('etis3-section--empty', n === 0);
	});

	span9.querySelectorAll('img[name="load_doc"]').forEach(img => {
		const btn = createEl('a', { className: 'icon-button2', textContent: 'attach_file' });
		['name','data-tab','data-term','data-ttp','data-dis'].forEach(a => btn.setAttribute(a, img.getAttribute(a)));
		btn.setAttribute('onclick', 'get_files()');
		img.parentNode.prepend(btn);
		img.remove();
	});
}


