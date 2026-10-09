/* Графики итогов голосования. Общие для админки (/admin) и публичной страницы итогов (/). */
window.VoteCharts = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt = x => x == null ? '—' : x.toFixed(2).replace('.', ',');
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const plural = (n, one, few, many) => n % 10 === 1 && n % 100 !== 11 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;

  // Строки с оценками, места с учётом равенства баллов
  function ranked(res){
    let place = 0, prev = null;
    return res.rows.filter(r => r.votes > 0 && r.total != null).map((r, i) => {
      if (fmt(r.total) !== prev){ place = i + 1; prev = fmt(r.total); }
      return Object.assign({}, r, {place});
    });
  }
  const medal = p => p <= 3 ? ' m' + p : '';

  function podium(rows){
    if (!rows.length) return '';
    const order = [rows[1], rows[0], rows[2]];
    return `<div class="vc-podium">${order.map((r, i) => {
      if (!r) return '<div></div>';
      const cls = ['p2', 'p1', 'p3'][i];
      return `<div class="vc-pcol ${cls}">
        <span class="vc-pname">${esc(r.name)}</span>
        <span class="vc-pscore">${fmt(r.total)}</span>
        <span class="vc-pvotes">${r.votes} ${plural(r.votes, 'голос', 'голоса', 'голосов')}</span>
        <div class="vc-block">${r.place}</div></div>`;
    }).join('')}</div>`;
  }

  function table(rows, criteria, S){
    const best = criteria.map((_, k) => Math.max(...rows.map(r => r.avgs[k] == null ? -1 : r.avgs[k])));
    return `<div class="vc-tablebox"><table class="vc-table"><thead><tr>
      <th class="c-place">Место</th><th class="c-name">Презентация</th><th>Средний балл</th><th>Голосов</th>
      ${criteria.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td class="c-place"><span class="vc-place${medal(r.place)}">${r.place}</span></td>
        <td class="c-name">${esc(r.name)}</td>
        <td class="c-total"><span class="vc-total"><span class="vc-mini"><i style="width:${r.total / S * 100}%"></i></span><b>${fmt(r.total)}</b></span></td>
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

  function radars(rows, criteria, S){
    if (criteria.length < 3) return '<p class="vc-empty">Профиль строится, когда критериев три и больше.</p>';
    const avg = criteria.map((_, k) => { const v = rows.map(r => r.avgs[k]).filter(a => a != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
    return `<div class="vc-legend"><span><i class="line"></i>презентация</span><span><i class="dash"></i>среднее по всем</span></div>
      <div class="vc-radars">${rows.map(r => `<div class="vc-radar">
        <div class="vc-radar-h"><span class="vc-place${medal(r.place)}">${r.place}</span><span class="n">${esc(r.name)}</span><b>${fmt(r.total)}</b></div>
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
    if (hi - lo < 0.5){ const m = (hi + lo) / 2; lo = Math.max(1, m - 0.25); hi = Math.min(S, m + 0.25); }
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

  // Полный набор: пьедестал, таблица, профили, средний балл, тепловая карта, распределение (+активность в админке)
  function full(res, cfg, opts){
    opts = opts || {};
    const S = cfg.scale, rows = ranked(res);
    if (!rows.length) return '<p class="vc-empty">Графики появятся после первых оценок.</p>';
    const sec = (title, sub, body) => `<section class="vc-section"><h3>${title}</h3>${sub ? `<p class="vc-sub">${sub}</p>` : ''}${body}</section>`;
    return [
      sec('Пьедестал', '', podium(rows)),
      sec('Турнирная таблица', `Средний балл — среднее по ${res.criteria.length} ${plural(res.criteria.length, 'критерию', 'критериям', 'критериям')}. Выделена лучшая оценка в каждом критерии.`, table(rows, res.criteria, S)),
      sec('Профиль каждой презентации', 'Чем дальше точка от центра, тем выше оценка по критерию', radars(rows, res.criteria, S)),
      `<div class="vc-grid2">${sec('Средний балл', `Шкала 0–${S}`, bars(rows, S))}${sec('Сильные и слабые стороны', 'Чем ярче цвет клетки, тем выше оценка', heat(rows, res.criteria, S))}</div>`,
      `<div class="vc-grid2">${sec('Как распределились оценки', 'Доля каждой оценки среди всех оценок презентации', dist(rows, S))}${opts.activity ? sec('Активность', '', activity(res.times, res.now)) : ''}</div>`,
    ].join('');
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

  function image(res, cfg, W, H){
    const S = cfg.scale, rows = ranked(res), land = W > H;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'), M = Math.round(Math.min(W, H) * 0.06);
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    x.fillStyle = C.accent; x.fillRect(0, 0, W, Math.round(H * 0.012));
    x.textBaseline = 'alphabetic';

    // Шапка
    let y = M + 26;
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

    // Пьедестал
    const podX = M, podW = land ? W * 0.44 - M : W - 2 * M;
    const podBottom = land ? H - M : headBottom + 400;
    const top3 = [rows[1], rows[0], rows[2]], hs = [0.62, 1, 0.44], colW = podW / 3, gap = 14;
    const maxH = land ? Math.min(330, (podBottom - headBottom) - 230) : 190;
    top3.forEach((r, i) => {
      if (!r) return;
      const bx = podX + i * colW + gap / 2, bw = colW - gap, bh = Math.max(60, maxH * hs[i]), by = podBottom - bh;
      rr(x, medalColor(r.place), bx, by, bw, bh, [14, 14, 0, 0]);
      x.fillStyle = C.ink; x.textAlign = 'center';
      x.font = `800 ${i === 1 ? 64 : 48}px ${FONT}`; x.fillText(String(r.place), bx + bw / 2, by + (i === 1 ? 74 : 58));
      x.font = `800 ${i === 1 ? 50 : 40}px ${FONT}`; x.fillText(fmt(r.total), bx + bw / 2, by - 22);
      x.font = `600 ${i === 1 ? 26 : 23}px ${FONT}`;
      const nl = wrap(x, r.name, bw, 3);
      nl.forEach((l, j) => x.fillText(l, bx + bw / 2, by - (i === 1 ? 82 : 72) - (nl.length - 1 - j) * 30));
      x.textAlign = 'left';
    });

    // Таблица мест с полосами + лучшие по критериям
    const lx = land ? W * 0.5 : M, lw = land ? W * 0.5 - M : W - 2 * M;
    let ly = land ? M + 20 : podBottom + 60;
    const lb = H - M;
    const crit = res.criteria.map((name, k) => {
      let bestR = null;
      rows.forEach(r => { if (r.avgs[k] != null && (!bestR || r.avgs[k] > bestR.avgs[k])) bestR = r; });
      return bestR ? {name, r: bestR, v: bestR.avgs[k]} : null;
    }).filter(Boolean);
    const critLineH = 46, critH = crit.length ? 34 + crit.length * critLineH + 36 : 0;
    x.fillStyle = C.muted; x.font = `700 22px ${FONT}`; x.fillText('ТУРНИРНАЯ ТАБЛИЦА', lx, ly); ly += 24;
    let avail = lb - ly - critH;
    const minRow = 62;
    let showCrit = crit.length && avail / Math.max(rows.length, 1) >= minRow;
    if (!showCrit) avail = lb - ly;
    const rowH = Math.max(52, Math.min(92, avail / Math.max(rows.length, 1)));
    const fit = Math.min(rows.length, Math.floor(avail / rowH));
    const shown = fit < rows.length ? fit - 1 : fit;
    for (let i = 0; i < shown; i++){
      const r = rows[i], cy = ly + i * rowH + rowH / 2;
      if (i) { x.fillStyle = C.line; x.fillRect(lx, ly + i * rowH, lw, 1); }
      const rad = Math.min(22, rowH * 0.3);
      x.beginPath(); x.arc(lx + rad, cy, rad, 0, Math.PI * 2); x.fillStyle = medalColor(r.place); x.fill();
      x.fillStyle = r.place <= 3 ? C.ink : C.accent; x.font = `800 ${Math.round(rad * 0.95)}px ${FONT}`; x.textAlign = 'center';
      x.fillText(String(r.place), lx + rad, cy + rad * 0.34); x.textAlign = 'left';
      const nameX = lx + rad * 2 + 18, valW = 90, barW = Math.max(120, lw * 0.3), nameW = lw - (nameX - lx) - barW - valW - 24;
      const fs = Math.round(Math.min(26, rowH * 0.32));
      x.font = `600 ${fs}px ${FONT}`;
      const fs2 = Math.round(Math.min(19, rowH * 0.24)), lh = Math.round(fs * 1.18);
      const nl = wrap(x, r.name, nameW, rowH >= fs * 2 + fs2 + 16 ? 2 : 1);
      const top = cy - (nl.length * lh + 4 + fs2) / 2;
      x.fillStyle = C.ink; nl.forEach((l, j) => x.fillText(l, nameX, top + j * lh + fs * 0.9));
      x.fillStyle = C.muted; x.font = `400 ${fs2}px ${FONT}`;
      x.fillText(`${r.votes} ${plural(r.votes, 'голос', 'голоса', 'голосов')}`, nameX, top + nl.length * lh + 4 + fs2 * 0.85);
      const bX = lx + lw - valW - barW, bH = Math.min(18, rowH * 0.24);
      rr(x, C.track, bX, cy - bH / 2, barW, bH, bH / 2);
      rr(x, r.place === 1 ? C.gold : C.accent, bX, cy - bH / 2, Math.max(bH, barW * r.total / S), bH, bH / 2);
      x.fillStyle = C.ink; x.font = `800 ${Math.round(Math.min(32, rowH * 0.42))}px ${FONT}`; x.textAlign = 'right';
      x.fillText(fmt(r.total), lx + lw, cy + 10); x.textAlign = 'left';
    }
    if (shown < rows.length){
      x.fillStyle = C.muted; x.font = `400 22px ${FONT}`;
      x.fillText(`…и ещё ${rows.length - shown} ${plural(rows.length - shown, 'презентация', 'презентации', 'презентаций')}`, lx, ly + shown * rowH + rowH / 2 + 8);
    }
    if (!rows.length){ x.fillStyle = C.muted; x.font = `400 28px ${FONT}`; x.fillText('Оценок пока нет', lx, ly + 40); }

    if (showCrit){
      let cy = lb - crit.length * critLineH - 34 + 22;
      x.fillStyle = C.muted; x.font = `700 22px ${FONT}`; x.fillText('ЛУЧШИЕ ПО КРИТЕРИЯМ', lx, cy - 14);
      cy += 18;
      crit.forEach((c, i) => {
        const yy = cy + i * critLineH;
        rr(x, C.soft, lx, yy, lw, critLineH - 8, 8);
        x.fillStyle = C.accent; x.font = `700 21px ${FONT}`;
        const cw = Math.min(lw * 0.36, 300);
        x.fillText(ellipsis(x, c.name, cw - 16), lx + 14, yy + 26);
        x.fillStyle = C.ink; x.font = `500 21px ${FONT}`;
        x.fillText(ellipsis(x, c.r.name, lw - cw - 90), lx + cw, yy + 26);
        x.font = `800 21px ${FONT}`; x.textAlign = 'right'; x.fillText(fmt(c.v), lx + lw - 14, yy + 26); x.textAlign = 'left';
      });
    }
    return cv;
  }

  function showShot(res, cfg){
    let wrapEl = document.querySelector('.vc-shot');
    if (!wrapEl){ wrapEl = document.createElement('div'); wrapEl.className = 'vc-shot'; document.body.appendChild(wrapEl); }
    const set = (W, H, tag) => {
      const url = image(res, cfg, W, H).toDataURL('image/png');
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

  return {full, image, showShot, tooltips, ranked, fmt};
})();
