/* Графики итогов голосования. Общие для админки (/admin) и публичной страницы итогов (/). */
window.VoteCharts = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt = x => x == null ? '—' : x.toFixed(2).replace('.', ',');
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;

  // ---------- Фирменный цвет и логотипы ----------
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb2hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lum = h => { const c = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  function applyBrand(cfg){
    const a = /^#[0-9a-f]{6}$/i.test(cfg && cfg.accent || '') ? cfg.accent : '#1D6B57';
    // Слишком светлый цвет темним, чтобы белый текст на кнопках читался
    const base = lum(a) > 0.32 ? mixHex(a, '#000000', 0.35) : a;
    const st = document.documentElement.style;
    st.setProperty('--brand', base);
    st.setProperty('--brand-hi', mixHex(base, '#ffffff', 0.42));
    st.setProperty('--brand-soft', mixHex(base, '#ffffff', 0.88));
    st.setProperty('--brand-soft-dk', mixHex(base, '#121514', 0.8));
    st.setProperty('--brand-mid', mixHex(base, '#ffffff', 0.5));
    st.setProperty('--brand-mid-dk', mixHex(base, '#121514', 0.45));
    let fav = document.querySelector('link[rel="icon"]');
    if (cfg && cfg.logo){ if (!fav){ fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); } fav.href = '/u/' + cfg.logo; }
    return base;
  }
  const logoUrl = f => f ? '/u/' + f : '';
  const initials = name => {
    const w = String(name).split(/\s+[—–-]\s+/)[0].split(/\s+/).filter(x => /[\wА-Яа-яЁё]/.test(x));
    return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '').slice(1, 2))).toUpperCase();
  };
  // Логотип презентации или монограмма из первых букв названия
  function avatar(name, cfg, cls){
    const f = cfg && cfg.logos && cfg.logos[name];
    return f ? `<span class="vc-av ${cls || ''}"><img src="/u/${esc(f)}" alt=""></span>`
             : `<span class="vc-av mono ${cls || ''}" aria-hidden="true">${esc(initials(name))}</span>`;
  }
  function brandHead(cfg){
    if (!cfg.logo && !cfg.org) return '';
    return `<div class="vc-brand">${cfg.logo ? `<img src="/u/${esc(cfg.logo)}" alt="${esc(cfg.org || 'Логотип')}">` : ''}${cfg.org ? `<span>${esc(cfg.org)}</span>` : ''}</div>`;
  }

  // Строки с оценками, места с учётом равенства баллов
  function ranked(res){
    let place = 0, prev = null;
    return res.rows.filter(r => r.votes > 0 && r.total != null).map((r, i) => {
      if (fmt(r.total) !== prev){ place = i + 1; prev = fmt(r.total); }
      return Object.assign({}, r, {place});
    });
  }
  const medal = p => p <= 3 ? ' m' + p : '';

  const FEW = 5;
  function table(rows, criteria, S, cfg){
    const best = criteria.map((_, k) => Math.max(...rows.map(r => r.avgs[k] == null ? -1 : r.avgs[k])));
    return `<div class="vc-tablebox"><table class="vc-table"><thead><tr>
      <th class="c-place">Место</th><th class="c-name">Презентация</th><th>Средний балл</th><th>Голосов</th>
      ${criteria.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td class="c-place"><span class="vc-place${medal(r.place)}">${r.place}</span></td>
        <td class="c-name"><span class="vc-namecell">${avatar(r.name, cfg)}<span>${esc(r.name)}${r.votes < FEW ? '<span class="vc-few">мало голосов</span>' : ''}</span></span></td>
        <td class="c-total"><span class="vc-total"><span class="vc-mini"><i style="width:${r.total / S * 100}%"></i></span><b>${fmt(r.total)}</b></span>${r.ci != null ? `<span class="vc-ci" data-tip="С вероятностью 95% настоящий средний балл лежит в пределах ${fmt(Math.max(0, r.total - r.ci))}–${fmt(Math.min(S, r.total + r.ci))}">± ${fmt(r.ci)}</span>` : ''}</td>
        <td>${r.votes}</td>
        ${r.avgs.map((a, k) => `<td class="${a != null && a === best[k] ? 'vc-cell-best' : ''}">${fmt(a)}</td>`).join('')}
      </tr>`).join('')}</tbody></table></div>`;
  }

  function radarSvg(r, avg, criteria, S){
    const n = criteria.length, R = 78;
    if (n < 3) return '';
    const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
    const pt = (i, v) => [Math.cos(ang(i)) * R * v / S, Math.sin(ang(i)) * R * v / S];
    const step = S <= 5 ? 1 : 2;
    let g = '';
    for (let v = step; v <= S; v += step){
      g += `<polygon points="${criteria.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--grid)" stroke-width="1"/>`;
    }
    criteria.forEach((_, i) => { const [x, y] = pt(i, S); g += `<line x1="0" y1="0" x2="${x}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>`; });
    const poly = vals => vals.map((v, i) => pt(i, v == null ? 0 : v).join(',')).join(' ');
    const labels = criteria.map((c, i) => {
      const [x, y] = pt(i, S * 1.16), a = Math.cos(ang(i));
      const anchor = Math.abs(a) < 0.2 ? 'middle' : a > 0 ? 'start' : 'end';
      const words = c.split(' '), lines = [];
      words.forEach(w => { const l = lines[lines.length - 1]; if (l && (l + ' ' + w).length <= 11) lines[lines.length - 1] = l + ' ' + w; else lines.push(w); });
      const dy = y < -10 ? -(lines.length - 1) * 11 : (y > 10 ? 4 : -(lines.length - 1) * 5.5 + 3);
      return `<text x="${x}" y="${y + dy}" text-anchor="${anchor}" font-size="10" fill="var(--muted)">${lines.map((l, j) => `<tspan x="${x}" dy="${j ? 11 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
    }).join('');
    const dots = r.avgs.map((v, i) => { const [x, y] = pt(i, v || 0); return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5" data-tip="${esc(criteria[i])}: ${fmt(v)} (среднее по всем — ${fmt(avg[i])})"/>`; }).join('');
    return `<svg viewBox="-125 -112 250 228" role="img" aria-label="${esc(r.name)}">${g}
      <polygon points="${poly(avg)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <polygon points="${poly(r.avgs)}" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${labels}</svg>`;
  }

  function radars(rows, criteria, S, cfg){
    if (criteria.length < 3) return '<p class="vc-empty">Профиль строится, когда критериев три и больше.</p>';
    const avg = criteria.map((_, k) => { const v = rows.map(r => r.avgs[k]).filter(a => a != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
    return `<div class="vc-legend"><span><i class="line"></i>презентация</span><span><i class="dash"></i>среднее по всем</span></div>
      <div class="vc-radars">${rows.map(r => `<div class="vc-radar">
        <div class="vc-radar-h"><span class="vc-place${medal(r.place)}">${r.place}</span>${avatar(r.name, cfg, 'sm')}<span class="n">${esc(r.name)}</span><b>${fmt(r.total)}</b></div>
        ${radarSvg(r, avg, criteria, S)}</div>`).join('')}</div>`;
  }

  function bars(rows, S){
    const ticks = Array.from({length: S + 1}, (_, k) => k).filter(k => S <= 5 || k % 2 === 0);
    return `<div class="vc-hbars" style="--ticks:${S}">${rows.map((r, i) => `
      <span class="nm">${esc(r.name)}</span>
      <span class="tr" data-tip="${esc(r.name)}: ${fmt(r.total)} из ${S} · ${r.votes} ${plural(r.votes, 'голос', 'голоса', 'голосов')}"><i class="${r.place === 1 ? 'top' : ''}" style="width:${r.total / S * 100}%;animation-delay:${i * 60}ms"></i></span>
      <span class="vl">${fmt(r.total)}</span>`).join('')}
      <span class="ax">${ticks.map(k => `<span style="left:${k / S * 100}%">${k}</span>`).join('')}</span></div>`;
  }

  function heat(rows, criteria, S){
    const best = criteria.map((_, k) => Math.max(...rows.map(r => r.avgs[k] == null ? -1 : r.avgs[k])));
    const all = [].concat(...rows.map(r => r.avgs)).filter(a => a != null);
    let lo = Math.min(...all), hi = Math.max(...all);
    const span = 0.5 * S / 5;
    if (hi - lo < span){ const m = (hi + lo) / 2; lo = Math.max(1, m - span / 2); hi = Math.min(S, m + span / 2); }
    return `<div class="vc-heat"><table><thead><tr><th>Презентация</th>${criteria.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.name)}</td>${r.avgs.map((a, k) => {
        if (a == null) return '<td>—</td>';
        const p = Math.round(8 + Math.min(1, Math.max(0, (a - lo) / ((hi - lo) || 1))) * 87);
        return `<td class="${a === best[k] ? 'best' : ''}" style="background:color-mix(in oklab,var(--accent) ${p}%,var(--surface));color:${p > 55 ? 'var(--accent-ink)' : 'var(--ink)'}" data-tip="${esc(r.name)} · ${esc(criteria[k])}: ${fmt(a)}">${fmt(a)}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="vc-ramp"><span>${fmt(lo)}</span><span class="g"></span><span>${fmt(hi)}</span><span>· рамкой — лучшая в критерии</span></div>`;
  }

  function bins(dist, S){
    if (S <= 5) return dist.map((n, i) => ({label: String(i + 1), n}));
    const out = [];
    for (let i = 0; i < dist.length; i += 2) out.push({label: (i + 1) + '–' + (i + 2), n: dist[i] + (dist[i + 1] || 0)});
    return out;
  }
  function dist(rows, S){
    const cols = ['--d1', '--d2', '--d3', '--d4', '--d5'];
    return `<div class="vc-dist">${rows.map(r => {
      const b = bins(r.dist || [], S), tot = b.reduce((a, y) => a + y.n, 0);
      return `<span class="nm">${esc(r.name)}</span><span class="st">${b.map((y, i) => y.n ? `<i style="flex:${y.n};background:var(${cols[i]})" data-tip="${esc(r.name)} · оценка ${y.label}: ${y.n} (${pct(y.n, tot)}%)"></i>` : '').join('')}</span>`;
    }).join('')}</div>
    <div class="vc-legend">${bins(Array(S).fill(0), S).map((y, i) => `<span><b style="background:var(${cols[i]})"></b>${y.label}</span>`).join('')}</div>`;
  }

  function activity(times, now){
    if (!times || !times.length) return '<p class="vc-empty">Нет данных</p>';
    const start = Math.floor(times[0] / 60) * 60, end = Math.max(now || 0, times[times.length - 1]);
    const span = Math.max(1, Math.ceil((end - start + 1) / 60)), step = Math.max(1, Math.ceil(span / 40));
    const n = Math.ceil(span / step), b = Array(n).fill(0);
    times.forEach(t => { b[Math.min(n - 1, Math.floor((t - start) / 60 / step))]++; });
    const mx = Math.max(...b), hm = s => new Date(s * 1000).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
    return `<p class="vc-sub">Оценок за ${step === 1 ? 'минуту' : step + ' мин'} · пик ${mx}</p>
      <div class="vc-cols">${b.map((v, i) => `<i class="${v ? '' : 'z'}" style="height:${v / mx * 100}%" data-tip="${hm(start + i * step * 60)}: ${v} ${plural(v, 'оценка', 'оценки', 'оценок')}"></i>`).join('')}</div>
      <div class="vc-cols-ax"><span>${hm(start)}</span><span>${hm(end)}</span></div>`;
  }

  // «Главное»: короткие выводы простыми словами
  function insights(rows, criteria, S){
    const out = [], k = S / 5;  // пороги рассчитаны на шкалу 1–5, для 1–10 масштабируем
    if (!rows.length) return out;
    const q = s => '«' + s + '»';
    const a = rows[0], b = rows[1];
    if (b){
      const d = a.total - b.total, err = Math.sqrt(Math.pow(a.ci || 0, 2) + Math.pow(b.ci || 0, 2));
      if (d < 0.005) out.push({k: 'tie', t: `${q(a.name)} и ${q(b.name)} делят первое место: у обеих ${fmt(a.total)}.`});
      else if (err && d < err) out.push({k: 'tie', t: `Первое место — ${q(a.name)} (${fmt(a.total)}), но отрыв от ${q(b.name)} всего ${fmt(d)}: это в пределах погрешности, по сути они почти равны.`});
      else out.push({k: 'win', t: `Первое место — ${q(a.name)} (${fmt(a.total)}), уверенный отрыв от второго места: ${fmt(d)}.`});
    } else out.push({k: 'win', t: `Оценена одна презентация: ${q(a.name)} — ${fmt(a.total)}.`});
    const withSd = rows.filter(r => r.sd != null && r.votes >= FEW);
    if (withSd.length >= 2){
      const lo = withSd.reduce((m, r) => r.sd < m.sd ? r : m), hi = withSd.reduce((m, r) => r.sd > m.sd ? r : m);
      if (hi.sd - lo.sd >= 0.15 * k){
        out.push({k: 'agree', t: `Самое единодушное мнение — о ${q(lo.name)}: оценки почти у всех близки.`});
        out.push({k: 'split', t: `Сильнее всего мнения разошлись о ${q(hi.name)}: кому-то очень понравилось, кому-то нет.`});
      }
    }
    const cAvg = criteria.map((n, k) => { const v = rows.map(r => r.avgs[k]).filter(x => x != null); return {n, v: v.length ? v.reduce((x, y) => x + y, 0) / v.length : null}; }).filter(c => c.v != null);
    if (cAvg.length >= 2){
      const best = cAvg.reduce((m, c) => c.v > m.v ? c : m), worst = cAvg.reduce((m, c) => c.v < m.v ? c : m);
      if (best.v - worst.v >= 0.1 * k) out.push({k: 'crit', t: `По всем выступлениям выше всего оценили критерий ${q(best.n)} (${fmt(best.v)}), ниже всего — ${q(worst.n)} (${fmt(worst.v)}): здесь есть куда расти.`});
    }
    const few = rows.filter(r => r.votes < FEW);
    if (few.length) out.push({k: 'few', t: `Мало голосов у ${few.map(r => q(r.name)).join(', ')} — их балл менее точный.`});
    return out;
  }
  const ICONS = {win: '★', tie: '≈', agree: '◎', split: '⇅', crit: '◆', few: '!'};
  function insightsHtml(list){
    return `<ul class="vc-ins">${list.map(i => `<li class="i-${i.k}"><span class="ic" aria-hidden="true">${ICONS[i.k]}</span><span>${esc(i.t)}</span></li>`).join('')}</ul>`;
  }

  // Полный набор: главное, таблица, профили, средний балл, тепловая карта, распределение (+активность в админке)
  function full(res, cfg, opts){
    opts = opts || {};
    const S = cfg.scale, rows = ranked(res);
    if (!rows.length) return '<p class="vc-empty">Графики появятся после первых оценок.</p>';
    const sec = (title, sub, body) => `<section class="vc-section"><h3>${title}</h3>${sub ? `<p class="vc-sub">${sub}</p>` : ''}${body}</section>`;
    const ins = insights(rows, res.criteria, S);
    return [
      ins.length ? sec('Главное', '', insightsHtml(ins)) : '',
      sec('Турнирная таблица', `Средний балл — среднее по ${res.criteria.length} ${plural(res.criteria.length, 'критерию', 'критериям', 'критериям')}. «±» — погрешность: чем больше голосов, тем она меньше. Выделена лучшая оценка в каждом критерии.`, table(rows, res.criteria, S, cfg)),
      sec('Профиль каждой презентации', 'Чем дальше точка от центра, тем выше оценка по критерию', radars(rows, res.criteria, S, cfg)),
      `<div class="vc-grid2">${sec('Средний балл', `Шкала 0–${S}`, bars(rows, S))}${sec('Сильные и слабые стороны', 'Чем ярче цвет клетки, тем выше оценка', heat(rows, res.criteria, S))}</div>`,
      `<div class="vc-grid2">${sec('Как распределились оценки', 'Доля каждой оценки среди всех оценок презентации', dist(rows, S))}${opts.activity ? sec('Активность', '', activity(res.times, res.now)) : ''}</div>`,
    ].join('');
  }

  // ---------- Проверка честности ----------
  const dt = t => new Date(t * 1000).toLocaleString('ru-RU', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'});
  function audit(a, opts){
    if (!a) return '';
    opts = opts || {};
    const seal = a.seal;
    const status = !seal
      ? `<div class="vc-seal warn"><b>Итоги ещё не опечатаны</b><span>Отпечаток фиксируется в момент закрытия приёма.</span></div>`
      : a.intact
        ? `<div class="vc-seal ok"><b>✓ Данные не менялись после закрытия</b><span>Итоги опечатаны ${dt(seal.ts)}: ${seal.count} ${plural(seal.count, 'голос', 'голоса', 'голосов')}. Отпечаток сейчас совпадает с опечатанным.</span></div>`
        : `<div class="vc-seal bad"><b>⚠ Данные изменились после закрытия</b><span>Опечатанный отпечаток не совпадает с текущим. Спросите организатора, что произошло.</span></div>`;
    const ev = a.events.length ? `<ol class="vc-log">${a.events.slice().reverse().map(e => `<li class="${esc(e.action)}"><time>${dt(e.ts)}</time><span>${esc(e.detail)}</span></li>`).join('')}</ol>` : '<p class="vc-empty">Записей пока нет.</p>';
    return `<div class="vc-audit">
      ${status}
      <div class="vc-grid2">
        <div class="vc-section"><h3>Найти свой голос</h3>
          <p class="vc-sub">После каждой оценки вы видели код проверки. Введите его — покажем, что записано.</p>
          <form class="vc-lookup" id="vc-lookup"><input id="vc-code" placeholder="ABCD-EF23" maxlength="9" autocomplete="off" aria-label="Код проверки"><button class="btn" type="submit">Проверить</button></form>
          <div id="vc-found" aria-live="polite"></div>
          <h3 style="margin-top:12px">Открытые данные</h3>
          <p class="vc-sub">Все оценки без имён и комментариев. Можно пересчитать места самостоятельно в Excel.</p>
          <div><a class="btn" href="/api/open.csv${opts.key ? '?key=' + encodeURIComponent(opts.key) : ''}">Скачать все оценки (CSV)</a></div>
          <details class="vc-hash"><summary>Отпечаток данных (SHA-256)</summary>
            <code>${esc(seal ? seal.hash : a.current)}</code>
            <p class="vc-sub">Как пересчитать: для каждой строки CSV собрать «код;презентация;оценки через ;», отсортировать строки, соединить переводом строки и посчитать SHA-256.</p></details>
        </div>
        <div class="vc-section"><h3>Журнал организатора</h3><p class="vc-sub">Всё, что влияет на итоги: открытие и закрытие приёма, изменения списка и критериев, удаление оценок.</p>${ev}</div>
      </div></div>`;
  }
  function bindLookup(cfg, key){
    const f = document.getElementById('vc-lookup');
    if (!f) return;
    let cache = null;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const out = document.getElementById('vc-found');
      const code = document.getElementById('vc-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 8){ out.innerHTML = '<p class="vc-sub">Код — 8 символов, например ABCD-EF23.</p>'; return; }
      const want = code.slice(0, 4) + '-' + code.slice(4);
      try {
        if (!cache) cache = await (await fetch('/api/open' + (key ? '?key=' + encodeURIComponent(key) : ''), {cache: 'no-store'})).json();
        const r = cache.rows.find(x => x.receipt === want);
        out.innerHTML = r
          ? `<div class="vc-found ok"><b>✓ Голос найден и учтён</b><span>${esc(r.presentation)}</span><span>${cache.criteria.map((n, i) => `${esc(n)}: <b>${r.scores[i] == null ? '—' : r.scores[i]}</b>`).join(' · ')}</span></div>`
          : `<div class="vc-found bad"><b>Голос с таким кодом не найден</b><span>Проверьте код. Если вы переоценивали презентацию, действует код последней оценки.</span></div>`;
      } catch(err){ out.innerHTML = '<p class="vc-sub">Не удалось загрузить данные. Попробуйте ещё раз.</p>'; }
    });
  }

  // ---------- Картинка итогов (canvas) ----------
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif';
  const C = {bg: '#FFFFFF', ink: '#17191B', muted: '#5D6460', line: '#E3E6DE', track: '#EEF0EA', accent: '#1D6B57', gold: '#E9B949', silver: '#C3C9CF', bronze: '#D29468', soft: '#E7EEE9'};
  function rr(x, c, X, Y, w, h, r){
    r = [].concat(r); const [a, b, d, e] = r.length === 4 ? r : [r[0], r[0], r[0], r[0]];
    x.beginPath(); x.moveTo(X + a, Y); x.lineTo(X + w - b, Y); x.quadraticCurveTo(X + w, Y, X + w, Y + b);
    x.lineTo(X + w, Y + h - d); x.quadraticCurveTo(X + w, Y + h, X + w - d, Y + h); x.lineTo(X + e, Y + h);
    x.quadraticCurveTo(X, Y + h, X, Y + h - e); x.lineTo(X, Y + a); x.quadraticCurveTo(X, Y, X + a, Y); x.closePath();
    x.fillStyle = c; x.fill();
  }
  function wrap(x, text, maxW, maxLines){
    const words = String(text).split(' '), out = []; let line = '';
    for (const w of words){ const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line){ out.push(line); line = w; } else line = t; }
    if (line) out.push(line);
    if (out.length > maxLines){ out.length = maxLines; out[maxLines - 1] = ellipsis(x, out[maxLines - 1] + '…', maxW); }
    return out.map(l => ellipsis(x, l, maxW));
  }
  function ellipsis(x, t, maxW){
    if (x.measureText(t).width <= maxW) return t;
    while (t.length > 1 && x.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t.replace(/…$/, '') + '…';
  }
  const medalColor = p => p === 1 ? C.gold : p === 2 ? C.silver : p === 3 ? C.bronze : C.soft;

  function image(res, cfg, W, H, imgs){
    imgs = imgs || {logos: {}};
    C.accent = applyBrandColor(cfg); C.soft = mixHex(C.accent, '#ffffff', 0.88); C.track = mixHex(C.accent, '#ffffff', 0.9);
    const S = cfg.scale, rows = ranked(res), land = W > H;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'), M = Math.round(Math.min(W, H) * 0.06);
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    x.fillStyle = C.accent; x.fillRect(0, 0, W, Math.round(H * 0.012));
    x.textBaseline = 'alphabetic';

    // Шапка: логотип и название организации справа, если есть
    let y = M + 26;
    if (imgs.logo || cfg.org){
      const lh = 64, right = W - M;
      let lx2 = right;
      if (cfg.org){ x.font = `600 24px ${FONT}`; x.fillStyle = C.muted; x.textAlign = 'right'; x.fillText(ellipsis(x, cfg.org, W * 0.3), right, M + 26 + (imgs.logo ? lh / 2 - 4 : 0)); lx2 = right - Math.min(x.measureText(cfg.org).width, W * 0.3) - 18; x.textAlign = 'left'; }
      if (imgs.logo){ const r = imgs.logo.naturalWidth / imgs.logo.naturalHeight || 1, w = Math.min(lh * r, 260); x.drawImage(imgs.logo, lx2 - w, M - 6, w, w / r); }
    }
    x.fillStyle = C.accent; x.font = `700 24px ${FONT}`; x.fillText('ИТОГИ ГОЛОСОВАНИЯ', M, y);
    y += land ? 66 : 64;
    x.fillStyle = C.ink; x.font = `800 ${land ? 58 : 54}px ${FONT}`;
    const tl = wrap(x, cfg.title, (land ? W * 0.5 : W) - 2 * M, 2);
    tl.forEach((l, i) => x.fillText(l, M, y + i * 64)); y += (tl.length - 1) * 64;
    y += 42;
    x.fillStyle = C.muted; x.font = `400 26px ${FONT}`;
    const d = new Date().toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
    x.fillText(`${d} · ${res.total_votes} ${plural(res.total_votes, 'оценка', 'оценки', 'оценок')} от ${res.voters} ${plural(res.voters, 'человека', 'человек', 'человек')}`, M, y);
    const headBottom = y + 30;

    // Таблица мест с полосами + лучшие по критериям.
    // 16:9: слева шапка и лучшие по критериям, справа таблица. Вертикально: всё друг под другом.
    const lx = land ? W * 0.5 : M, lw = land ? W * 0.5 - M : W - 2 * M;
    let ly = land ? M + 20 + ((imgs.logo || cfg.org) ? 90 : 0) : headBottom + 50;
    const lb = H - M;
    const crit = res.criteria.map((name, k) => {
      let bestR = null;
      rows.forEach(r => { if (r.avgs[k] != null && (!bestR || r.avgs[k] > bestR.avgs[k])) bestR = r; });
      return bestR ? {name, r: bestR, v: bestR.avgs[k]} : null;
    }).filter(Boolean);
    const critLineH = land ? 64 : 46, critFs = land ? 24 : 21;
    const critH = crit.length ? 34 + crit.length * critLineH + (land ? 0 : 36) : 0;
    const critX = land ? M : M, critW = land ? W * 0.44 - M : W - 2 * M;
    x.fillStyle = C.muted; x.font = `700 22px ${FONT}`; x.fillText('ТУРНИРНАЯ ТАБЛИЦА', lx, ly); ly += 24;
    let avail = lb - ly - (land ? 0 : critH);
    const showCrit = crit.length && (land ? lb - critH > headBottom + 30 : avail / Math.max(rows.length, 1) >= 62);
    if (!showCrit) avail = lb - ly;
    const rowH = Math.max(52, Math.min(land ? 140 : 92, avail / Math.max(rows.length, 1)));
    const fit = Math.min(rows.length, Math.floor(avail / rowH));
    const shown = fit < rows.length ? fit - 1 : fit;
    for (let i = 0; i < shown; i++){
      const r = rows[i], cy = ly + i * rowH + rowH / 2;
      if (i) { x.fillStyle = C.line; x.fillRect(lx, ly + i * rowH, lw, 1); }
      const rad = Math.min(24, rowH * 0.3);
      x.beginPath(); x.arc(lx + rad, cy, rad, 0, Math.PI * 2); x.fillStyle = medalColor(r.place); x.fill();
      x.fillStyle = r.place <= 3 ? C.ink : C.accent; x.font = `800 ${Math.round(rad * 0.95)}px ${FONT}`; x.textAlign = 'center';
      x.fillText(String(r.place), lx + rad, cy + rad * 0.34); x.textAlign = 'left';
      let nameX = lx + rad * 2 + 18;
      const pl = imgs.logos[r.name];
      if (pl){ const sz = Math.min(rowH * 0.62, 56); rr(x, '#ffffff', nameX, cy - sz / 2, sz, sz, 8); const k = Math.min(sz / pl.naturalWidth, sz / pl.naturalHeight); x.drawImage(pl, nameX + (sz - pl.naturalWidth * k) / 2, cy - pl.naturalHeight * k / 2, pl.naturalWidth * k, pl.naturalHeight * k); nameX += sz + 14; }
      const valW = 90, barW = Math.max(120, lw * 0.3), nameW = lw - (nameX - lx) - barW - valW - 24;
      const fs = Math.round(Math.min(28, rowH * 0.32));
      x.font = `600 ${fs}px ${FONT}`;
      const fs2 = Math.round(Math.min(20, rowH * 0.24)), lh = Math.round(fs * 1.18);
      const nl = wrap(x, r.name, nameW, rowH >= fs * 2 + fs2 + 16 ? 2 : 1);
      const top = cy - (nl.length * lh + 4 + fs2) / 2;
      x.fillStyle = C.ink; nl.forEach((l, j) => x.fillText(l, nameX, top + j * lh + fs * 0.9));
      x.fillStyle = C.muted; x.font = `400 ${fs2}px ${FONT}`;
      x.fillText(`${r.votes} ${plural(r.votes, 'голос', 'голоса', 'голосов')}`, nameX, top + nl.length * lh + 4 + fs2 * 0.85);
      const bX = lx + lw - valW - barW, bH = Math.min(18, rowH * 0.24);
      rr(x, C.track, bX, cy - bH / 2, barW, bH, bH / 2);
      rr(x, r.place === 1 ? C.gold : C.accent, bX, cy - bH / 2, Math.max(bH, barW * r.total / S), bH, bH / 2);
      x.fillStyle = C.ink; x.font = `800 ${Math.round(Math.min(34, rowH * 0.42))}px ${FONT}`; x.textAlign = 'right';
      x.fillText(fmt(r.total), lx + lw, cy + 10); x.textAlign = 'left';
    }
    if (shown < rows.length){
      x.fillStyle = C.muted; x.font = `400 22px ${FONT}`;
      x.fillText(`…и ещё ${rows.length - shown} ${plural(rows.length - shown, 'презентация', 'презентации', 'презентаций')}`, lx, ly + shown * rowH + rowH / 2 + 8);
    }
    if (!rows.length){ x.fillStyle = C.muted; x.font = `400 28px ${FONT}`; x.fillText('Оценок пока нет', lx, ly + 40); }

    let bottom = ly + Math.max(shown, rows.length ? 0 : 1) * rowH + (shown < rows.length ? rowH : 0);
    if (showCrit){
      // 16:9 — под шапкой слева; вертикально — сразу под таблицей
      let cy = land ? headBottom + 90 : bottom + 70;
      x.fillStyle = C.muted; x.font = `700 22px ${FONT}`; x.fillText('ЛУЧШИЕ ПО КРИТЕРИЯМ', critX, cy - 18);
      const ty = (critLineH - 8) / 2 + critFs * 0.36;
      crit.forEach((c, i) => {
        const yy = cy + i * critLineH;
        rr(x, C.soft, critX, yy, critW, critLineH - 8, 10);
        x.fillStyle = C.accent; x.font = `700 ${critFs}px ${FONT}`;
        const cw = Math.min(critW * 0.38, 300);
        x.fillText(ellipsis(x, c.name, cw - 20), critX + 16, yy + ty);
        x.fillStyle = C.ink; x.font = `500 ${critFs}px ${FONT}`;
        x.fillText(ellipsis(x, c.r.name, critW - cw - 100), critX + cw, yy + ty);
        x.font = `800 ${critFs}px ${FONT}`; x.textAlign = 'right'; x.fillText(fmt(c.v), critX + critW - 16, yy + ty); x.textAlign = 'left';
      });
      if (!land) bottom = cy + crit.length * critLineH;
    }
    // Вертикальную картинку обрезаем по содержимому, чтобы снизу не было пустоты
    if (!land && bottom + M < H){
      const out = document.createElement('canvas'); out.width = W; out.height = Math.round(bottom + M);
      out.getContext('2d').drawImage(cv, 0, 0);
      return out;
    }
    return cv;
  }

  function applyBrandColor(cfg){
    const a = /^#[0-9a-f]{6}$/i.test(cfg && cfg.accent || '') ? cfg.accent : '#1D6B57';
    return lum(a) > 0.32 ? mixHex(a, '#000000', 0.35) : a;
  }
  const loadImg = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  async function loadImages(cfg){
    const out = {logo: cfg.logo ? await loadImg('/u/' + cfg.logo) : null, logos: {}};
    await Promise.all(Object.keys(cfg.logos || {}).map(async n => { const i = await loadImg('/u/' + cfg.logos[n]); if (i) out.logos[n] = i; }));
    return out;
  }
  async function showShot(res, cfg){
    const imgs = await loadImages(cfg);
    let wrapEl = document.querySelector('.vc-shot');
    if (!wrapEl){ wrapEl = document.createElement('div'); wrapEl.className = 'vc-shot'; document.body.appendChild(wrapEl); }
    const set = (W, H, tag) => {
      const url = image(res, cfg, W, H, imgs).toDataURL('image/png');
      wrapEl.innerHTML = `<img alt="Итоги голосования" src="${url}">
        <div class="row"><button class="btn" data-f="l">16:9 для слайда</button><button class="btn" data-f="p">Для телефона</button>
        <a class="btn primary" download="itogi-${tag}.png" href="${url}">Скачать картинку</a><button class="btn" data-f="x">Закрыть</button></div>
        <p>На телефоне можно просто удержать палец на картинке → «Сохранить изображение».</p>`;
      wrapEl.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.f === 'x') wrapEl.remove(); else if (b.dataset.f === 'l') set(1920, 1080, '16x9'); else set(1080, 1350, 'telefon');
      }));
    };
    set(innerWidth > innerHeight ? 1920 : 1080, innerWidth > innerHeight ? 1080 : 1350, innerWidth > innerHeight ? '16x9' : 'telefon');
  }

  // Подсказки при наведении
  let tip = null;
  function tooltips(){
    if (tip) return;
    tip = document.createElement('div'); tip.className = 'vc-tip'; tip.hidden = true; document.body.appendChild(tip);
    document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (!el){ tip.hidden = true; return; } tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; });
    document.addEventListener('mousemove', e => { if (tip.hidden) return; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 12) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; });
  }

  return {full, image, showShot, tooltips, ranked, fmt, radarSvg, plural, applyBrand, avatar, brandHead, logoUrl,
          insights, insightsHtml, audit, bindLookup, loadImages, initials};
})();
