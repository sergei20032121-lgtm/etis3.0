// ============================================================
// СТРАНИЦЫ — диспетчер
// ============================================================

function stylePages() {
	const page  = window.location.pathname.split('/').pop();
	// Страница входа: форма с паролем и без меню кабинета
	const login = document.querySelector('div.login form') && document.querySelector('input[type="password"], #sbmt') && !document.querySelector('div.span3')
		|| document.querySelector('body > div.login');

	if (login) { styleLoginPage(page); return; }

	const sidebar = document.querySelector('div.span3');
	if (sidebar) {
		styleSidebar(sidebar);
		buildAurora(document.body, 'aurora--page');
		buildWall(document.body);
		buildTopbar(sidebar);
		initCommandPalette(sidebar);
		greetAfterLogin();
		showWhatsNew();
	}

	const warning = document.querySelector('div.warning');
	const span9   = document.querySelector('div.span9');
	if (warning && span9) span9.prepend(warning);

	animatePageIn();
	stylePageContent();
}

// Оформление содержимого страницы. При мягком переходе вызывается снова
// для подменённого div.span9 — без перестройки сайдбара и панели.
function stylePageContent() {
	const page     = window.location.pathname.split('/').pop();
	const span9    = document.querySelector('div.span9');
	const pageMode = new URLSearchParams(window.location.search).get('p_mode');

	// Открыл страницу — фоновый счётчик по ней обнуляется
	const seenKinds = { 'stu.teacher_notes': ['notes'], 'stu_ann.announces': ['ann'], 'stu.announce': ['ann'] }[page]
		|| (page === 'stu.signs' && pageMode === 'current' && !/p_term=/.test(location.search) ? ['grades'] : null);
	if (seenKinds) { try { chrome.runtime.sendMessage({ type: 'etis3-seen', kinds: seenKinds }).catch?.(() => {}); } catch (e) {} }

	switch (page) {
		case 'stu.teach_plan':             stylePage_teachPlan(span9, pageMode); if (!pageMode) buildPlanView(span9); break;
		case 'stu.tpr':                    stylePage_tpr(span9);                  break;
		case 'stu.teachers':               stylePage_teachers(span9); buildTeachersView(span9); break;
		case 'stu.absence':                buildAbsenceView(span9);               break;
		case 'stu.sc_portfolio':           stylePage_portfolio(span9);            break;
		case 'stu.timetable':              stylePage_timetable(span9);            break;
		case 'stu.change_pass_form':
		case 'stu.change_pass':            stylePage_changePass(span9);           break;
		case 'stu_email_pkg.change_email': stylePage_changeEmail(span9);          break;
		case 'stu.announce':
		case 'stu_ann.announces':          stylePage_announce();                   break;
		case 'stu.teacher_notes':          stylePage_teacherNotes();              break;
		case 'cert_pkg.stu_certif':        stylePage_certif(span9);               break;
		case 'stu.signs':                  stylePage_signs(span9, pageMode); if (!pageMode || pageMode === 'session') buildSessionView(span9); break;
		case 'stu.electr':                 stylePage_electr(span9);               break;
	}
}


