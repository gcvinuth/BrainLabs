/* Brain Lab - Multiplayer Games Pack (1-4 players, same screen)
   Loaded by index.html AFTER the main script. Uses its globals:
   appState, activeGame, switchView, showResults, openHowToPlay, howToPlayData, updateHubStats */
(function () {
  const PC = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24'];
  const KEYS = [['a', 'd'], ['arrowleft', 'arrowright'], ['j', 'l'], ['v', 'n']];
  const KL = [['A', 'D'], ['←', '→'], ['J', 'L'], ['V', 'N']];
  const nm = (i, n) => (i < n ? 'P' + (i + 1) : 'BOT ' + (i + 1));
  const TAU = Math.PI * 2;
  let lastN = 2;

  // ---------- shared: session = canvas + keyboard + touch pads + loop ----------
  function session(n, onPress, update, draw) {
    const st = document.getElementById('game-stage');
    st.innerHTML = `<div class="w-full max-w-3xl flex flex-col items-center gap-3">
      <canvas id="mp-c" width="800" height="500" class="w-full rounded-3xl border-2 border-purple-500/30 bg-slate-950 shadow-2xl touch-none"></canvas>
      <div class="w-full grid gap-2" style="grid-template-columns:repeat(${n},1fr)">
        ${Array.from({ length: n }, (_, p) => `<div class="flex gap-1">${[0, 1].map(s =>
          `<button data-p="${p}" data-s="${s}" class="mp-pad flex-1 h-14 rounded-2xl font-black text-white text-sm touch-none select-none" style="background:${PC[p]}44;border:2px solid ${PC[p]}">${KL[p][s]}</button>`).join('')}</div>`).join('')}
      </div></div>`;
    const c = document.getElementById('mp-c'), ctx = c.getContext('2d');
    const held = [0, 1, 2, 3].map(() => [false, false]);
    const press = (p, s, d) => { if (held[p][s] === d) return; held[p][s] = d; if (d) onPress(p, s); };
    const kd = e => { const k = e.key.toLowerCase(); KEYS.forEach((ks, p) => { const s = ks.indexOf(k); if (p < n && s > -1) { e.preventDefault(); if (!e.repeat) press(p, s, true); } }); };
    const ku = e => { const k = e.key.toLowerCase(); KEYS.forEach((ks, p) => { const s = ks.indexOf(k); if (p < n && s > -1) press(p, s, false); }); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    st.querySelectorAll('.mp-pad').forEach(b => {
      const p = +b.dataset.p, s = +b.dataset.s;
      b.addEventListener('pointerdown', e => { e.preventDefault(); press(p, s, true); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => press(p, s, false)));
    });
    let raf, last = performance.now(), stop = false;
    const tick = t => { if (stop) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; update(dt, held); draw(ctx); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const cleanup = () => { stop = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    const ag = { cleanup }; activeGame = ag;
    return { cleanup, ag };
  }

  function finish(g, S, win, n, msg) {
    S.cleanup();
    if (win >= 0 && win < n) { appState.scores[g.key] += 50; localStorage.setItem('bl_' + g.key, appState.scores[g.key]); }
    setTimeout(() => {
      if (activeGame !== S.ag) return;
      showResults(msg, 'Wins: ' + appState.scores[g.key] / 50, () => g.start(n), win >= 0 && win < n ? 3 : 1);
    }, 1100);
  }

  const T = (x, s, tx, px, py, col = '#fff', al = 'center') => { x.font = `800 ${s}px Fredoka, sans-serif`; x.textAlign = al; x.fillStyle = col; x.fillText(tx, px, py); };
  const cdown = (x, phase) => { if (phase > 0) T(x, 110, String(Math.ceil(phase - 0.2) || 'GO!'), 400, 280, '#fff'); };

  // ---------- 1. NEON RACER ----------
  function startRacer(n) {
    const g = GAMES.neonRacer, laps = 3, lanes = [622, 655, 688, 721];
    const cars = lanes.map((x, i) => ({ x, y: 250, a: Math.PI / 2, v: 0, tot: 0, pt: 0, human: i < n, skill: 0.82 + Math.random() * 0.16, trail: [] }));
    let phase = 3.2, over = false;
    const onTrack = (x, y) => ((x - 400) / 350) ** 2 + ((y - 250) / 215) ** 2 <= 1 && ((x - 400) / 200) ** 2 + ((y - 250) / 85) ** 2 >= 1;
    const S = session(n, () => {}, (dt, held) => {
      if (phase > 0) { phase -= dt; return; }
      if (over) return;
      cars.forEach((c, i) => {
        let st = 0;
        if (c.human) st = (held[i][1] ? 1 : 0) - (held[i][0] ? 1 : 0);
        else {
          const th = Math.atan2(c.y - 250, c.x - 400) + 0.32;
          let d = Math.atan2(250 + 150 * Math.sin(th) - c.y, 400 + 275 * Math.cos(th) - c.x) - c.a;
          d = Math.atan2(Math.sin(d), Math.cos(d)); st = Math.max(-1, Math.min(1, d * 3));
        }
        const max = (onTrack(c.x, c.y) ? 200 : 80) * (c.human ? 1 : c.skill);
        c.a += st * 2.5 * dt;
        c.v = c.v < max ? Math.min(max, c.v + 140 * dt) : Math.max(max, c.v - 260 * dt);
        c.v = Math.max(0, c.v - Math.abs(st) * 35 * dt);
        c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
        const th = Math.atan2(c.y - 250, c.x - 400); let d = th - c.pt; d = Math.atan2(Math.sin(d), Math.cos(d));
        c.tot += d; c.pt = th;
        c.trail.push([c.x, c.y]); if (c.trail.length > 12) c.trail.shift();
        if (c.tot >= laps * TAU && !over) { over = true; finish(g, S, i, n, nm(i, n) + ' wins the race!'); }
      });
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const a = cars[i], b = cars[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 16 && d > 0) { const k = (16 - d) / 2 / d; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
      }
    }, x => {
      x.fillStyle = '#0b0b1a'; x.fillRect(0, 0, 800, 500);
      x.beginPath(); x.ellipse(400, 250, 350, 215, 0, 0, TAU); x.fillStyle = '#2a2560'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#9d4edd'; x.stroke();
      x.beginPath(); x.ellipse(400, 250, 200, 85, 0, 0, TAU); x.fillStyle = '#0b0b1a'; x.fill(); x.strokeStyle = '#00f5d4'; x.stroke();
      x.setLineDash([14, 14]); x.beginPath(); x.ellipse(400, 250, 275, 150, 0, 0, TAU); x.strokeStyle = '#ffffff33'; x.lineWidth = 2; x.stroke(); x.setLineDash([]);
      for (let k = 0; k < 10; k++) { x.fillStyle = k % 2 ? '#fff' : '#111'; x.fillRect(600 + k * 15, 246, 15, 8); }
      cars.forEach((c, i) => {
        c.trail.forEach(([tx, ty], k) => { x.fillStyle = PC[i] + '33'; x.fillRect(tx - 3, ty - 3, 6, 6); });
        x.save(); x.translate(c.x, c.y); x.rotate(c.a); x.fillStyle = PC[i]; x.shadowColor = PC[i]; x.shadowBlur = 12; x.fillRect(-10, -6, 20, 12); x.fillStyle = '#fff'; x.fillRect(4, -4, 4, 8); x.restore();
        T(x, 15, `${nm(i, n)}  Lap ${Math.min(laps, Math.floor(c.tot / TAU) + 1)}/${laps}`, 320, 222 + i * 20, PC[i], 'left');
      });
      cdown(x, phase);
    });
  }

  // ---------- 2. LIGHT CYCLES ----------
  function startCycles(n) {
    const g = GAMES.lightCycles, W = 80, H = 50, C = 10, DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
    const grid = new Int8Array(W * H).fill(-1);
    const cy = [[10, 25, 0], [69, 25, 2], [40, 8, 1], [40, 41, 3]].map(([x, y, d], i) => { grid[y * W + x] = i; return { x, y, d, alive: true, human: i < n, q: [] }; });
    let acc = 0, phase = 2.5, over = false;
    const free = (c, d, k) => { for (let j = 1; j <= k; j++) { const x = c.x + DX[d] * j, y = c.y + DY[d] * j; if (x < 0 || y < 0 || x >= W || y >= H || grid[y * W + x] !== -1) return false; } return true; };
    const step = () => {
      cy.forEach(c => {
        if (!c.alive) return;
        if (c.human) { const t = c.q.shift(); if (t !== undefined) c.d = (c.d + (t ? 1 : 3)) % 4; }
        else if (!free(c, c.d, 3) || Math.random() < 0.03) {
          const o = [(c.d + 3) % 4, (c.d + 1) % 4].filter(d => free(c, d, 4)); if (o.length) c.d = o[Math.random() * o.length | 0];
        }
        c.nx = c.x + DX[c.d]; c.ny = c.y + DY[c.d];
        c.dead = c.nx < 0 || c.ny < 0 || c.nx >= W || c.ny >= H || grid[c.ny * W + c.nx] !== -1;
      });
      cy.forEach((a, i) => cy.forEach((b, j) => { if (i < j && a.alive && b.alive && a.nx === b.nx && a.ny === b.ny) a.dead = b.dead = true; }));
      cy.forEach((c, i) => { if (!c.alive) return; if (c.dead) { c.alive = false; return; } c.x = c.nx; c.y = c.ny; grid[c.y * W + c.x] = i; });
      const al = cy.map((c, i) => c.alive ? i : -1).filter(i => i >= 0);
      if (al.length <= 1) { over = true; finish(g, S, al.length ? al[0] : -1, n, al.length ? nm(al[0], n) + ' survives!' : 'Everyone crashed - draw!'); }
      else if (!cy.some(c => c.alive && c.human)) { over = true; finish(g, S, 9, n, 'The bots win this one!'); }
    };
    const S = session(n, (p, s) => { if (cy[p].alive && cy[p].q.length < 2) cy[p].q.push(s); }, dt => {
      if (phase > 0) { phase -= dt; return; }
      if (over) return;
      acc += dt; while (acc > 0.07 && !over) { acc -= 0.07; step(); }
    }, x => {
      x.fillStyle = '#05050f'; x.fillRect(0, 0, 800, 500);
      x.strokeStyle = '#ffffff0d'; x.lineWidth = 1; for (let i = 0; i <= W; i += 4) { x.beginPath(); x.moveTo(i * C, 0); x.lineTo(i * C, 500); x.stroke(); }
      for (let i = 0; i <= H; i += 4) { x.beginPath(); x.moveTo(0, i * C); x.lineTo(800, i * C); x.stroke(); }
      for (let i = 0; i < W * H; i++) if (grid[i] >= 0) { x.fillStyle = PC[grid[i]] + 'cc'; x.fillRect((i % W) * C, ((i / W) | 0) * C, C, C); }
      cy.forEach((c, i) => { x.fillStyle = c.alive ? '#fff' : '#ffffff22'; x.shadowColor = PC[i]; x.shadowBlur = c.alive ? 14 : 0; x.fillRect(c.x * C, c.y * C, C, C); x.shadowBlur = 0; });
      x.strokeStyle = '#9d4edd'; x.lineWidth = 4; x.strokeRect(0, 0, 800, 500);
      cdown(x, phase);
    });
  }

  // ---------- 3. SUMO BUMPERS ----------
  function startSumo(n) {
    const g = GAMES.sumo;
    const ps = [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + 0.8; return { x: 400 + Math.cos(a) * 130, y: 250 + Math.sin(a) * 130, vx: 0, vy: 0, a: a + Math.PI, alive: true, human: i < n, skill: 0.7 + Math.random() * 0.3 }; });
    let R = 235, t = 0, phase = 2.5, over = false;
    const S = session(n, () => {}, (dt, held) => {
      if (phase > 0) { phase -= dt; return; }
      if (over) return;
      t += dt; R = Math.max(105, 235 - t * 5);
      ps.forEach((p, i) => {
        if (!p.alive) return;
        let st = 0;
        if (p.human) st = (held[i][1] ? 1 : 0) - (held[i][0] ? 1 : 0);
        else {
          let tx = 400, ty = 250;
          if (Math.hypot(p.x - 400, p.y - 250) < R - 70) {
            let best = 1e9; ps.forEach((q, j) => { if (j !== i && q.alive) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < best) { best = d; tx = q.x; ty = q.y; } } });
          }
          let d = Math.atan2(ty - p.y, tx - p.x) - p.a; d = Math.atan2(Math.sin(d), Math.cos(d)); st = Math.max(-1, Math.min(1, d * 3 * p.skill));
        }
        p.a += st * 3.2 * dt; p.vx += Math.cos(p.a) * 230 * dt; p.vy += Math.sin(p.a) * 230 * dt;
        const f = Math.pow(0.3, dt); p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt;
      });
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const a = ps[i], b = ps[j]; if (!a.alive || !b.alive) continue;
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 36 && d > 0) {
          const nx = dx / d, ny = dy / d, ov = (36 - d) / 2; a.x += nx * ov; a.y += ny * ov; b.x -= nx * ov; b.y -= ny * ov;
          const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rv < 0) { const j2 = -(1 + 1.2) * rv / 2 + 25; a.vx += j2 * nx; a.vy += j2 * ny; b.vx -= j2 * nx; b.vy -= j2 * ny; }
        }
      }
      ps.forEach(p => { if (p.alive && Math.hypot(p.x - 400, p.y - 250) > R + 10) p.alive = false; });
      const al = ps.map((p, i) => p.alive ? i : -1).filter(i => i >= 0);
      if (al.length <= 1) { over = true; finish(g, S, al.length ? al[0] : -1, n, al.length ? nm(al[0], n) + ' stays on top!' : 'Everyone fell - draw!'); }
      else if (!ps.some(p => p.alive && p.human)) { over = true; finish(g, S, 9, n, 'The bots win this one!'); }
    }, x => {
      x.fillStyle = '#05050f'; x.fillRect(0, 0, 800, 500);
      x.beginPath(); x.arc(400, 250, R, 0, TAU); x.fillStyle = '#2a2560'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#ff007f'; x.stroke();
      ps.forEach((p, i) => {
        if (!p.alive) return;
        x.save(); x.shadowColor = PC[i]; x.shadowBlur = 16; x.beginPath(); x.arc(p.x, p.y, 18, 0, TAU); x.fillStyle = PC[i]; x.fill(); x.restore();
        x.beginPath(); x.arc(p.x + Math.cos(p.a) * 11, p.y + Math.sin(p.a) * 11, 5, 0, TAU); x.fillStyle = '#fff'; x.fill();
        T(x, 13, nm(i, n), p.x, p.y - 26, PC[i]);
      });
      cdown(x, phase);
    });
  }

  // ---------- 4. REFLEX DUEL ----------
  function startReflex(n) {
    const g = GAMES.reflexDuel, ROUNDS = 5, sc = [0, 0, 0, 0];
    let round = 0, state = 'wait', timer = 1.5 + Math.random() * 2.5, t0 = 0, msg = 'Wait for GREEN...', lock = [0, 0, 0, 0], botT = [], over = false;
    const react = p => {
      if (lock[p] || over) return;
      if (state === 'wait') { lock[p] = 1; sc[p] = Math.max(0, sc[p] - 1); msg = nm(p, n) + ' jumped the gun! -1'; }
      else if (state === 'go') { state = 'res'; timer = 1.5; sc[p]++; round++; msg = `${nm(p, n)} +1  (${Math.round(performance.now() - t0)} ms)`; }
    };
    const S = session(n, p => react(p), dt => {
      if (over) return;
      timer -= dt;
      if (state === 'wait' && timer <= 0) { state = 'go'; t0 = performance.now(); botT = [0, 1, 2, 3].map(() => 260 + Math.random() * 320); msg = 'GO!'; }
      else if (state === 'go') { for (let i = n; i < 4; i++) if (performance.now() - t0 >= botT[i]) react(i); }
      else if (state === 'res' && timer <= 0) {
        if (round >= ROUNDS) {
          over = true; const m = Math.max(...sc), w = sc.map((s, i) => s === m ? i : -1).filter(i => i >= 0);
          finish(g, S, w.length === 1 ? w[0] : -1, n, w.length === 1 ? nm(w[0], n) + ' wins the duel!' : 'Tie game!');
        } else { state = 'wait'; lock = [0, 0, 0, 0]; timer = 1.5 + Math.random() * 2.5; msg = 'Wait for GREEN...'; }
      }
    }, x => {
      x.fillStyle = state === 'go' ? '#064e3b' : state === 'res' ? '#1e1b4b' : '#4c0519'; x.fillRect(0, 0, 800, 500);
      T(x, 24, `Round ${Math.min(round + 1, ROUNDS)} / ${ROUNDS}`, 400, 50, '#ffffffaa');
      T(x, state === 'go' ? 130 : 56, state === 'go' ? 'GO!' : msg, 400, 250, state === 'go' ? '#6ee7b7' : '#fff');
      if (state === 'go') T(x, 28, 'PRESS NOW!', 400, 310, '#fff');
      for (let i = 0; i < 4; i++) {
        const bx = 40 + i * 190; x.fillStyle = '#00000066'; x.fillRect(bx, 380, 170, 100); x.strokeStyle = PC[i]; x.lineWidth = 3; x.strokeRect(bx, 380, 170, 100);
        T(x, 20, nm(i, n) + (lock[i] ? ' 🥶' : ''), bx + 85, 410, PC[i]); T(x, 48, String(sc[i]), bx + 85, 462, '#fff');
      }
    });
  }

  // ---------- lobby, cards, wiring ----------
  const GAMES = {
    neonRacer: { key: 'neonRacer', title: 'Neon Racer', icon: 'fa-flag-checkered', color: '#22d3ee', shape: 1, start: startRacer, blurb: 'Steer your neon car round the track for 3 laps. Cars auto-accelerate - brake by steering smart and stay on the asphalt!', how: ['🏁 Race 3 laps - first car over the line wins.', '↔️ Only two controls: steer left / steer right. Gas is automatic.', '🌱 Leaving the track slows you down a lot.', '🤖 Empty seats are filled with bot racers.'] },
    lightCycles: { key: 'lightCycles', title: 'Light Cycles', icon: 'fa-motorcycle', color: '#f472b6', shape: 2, start: startCycles, blurb: 'Leave a glowing wall behind you. Trap rivals, dodge trails - last rider alive wins!', how: ['🏍️ Your cycle never stops and leaves a wall behind it.', '↩️ Tap left / right to turn 90°.', '💥 Hit any wall or trail and you crash.', '🏆 Last rider alive wins. Empty seats are bots.'] },
    sumo: { key: 'sumo', title: 'Sumo Bumpers', icon: 'fa-hockey-puck', color: '#a3e635', shape: 3, start: startSumo, blurb: 'Bump your rivals off a shrinking arena. Steer, ram, survive!', how: ['⚪ Your bumper always drives forward - steer left / right.', '💪 Ram rivals - faster hits push harder.', '🔻 The arena shrinks over time.', '🏆 Last bumper on the platform wins.'] },
    reflexDuel: { key: 'reflexDuel', title: 'Reflex Duel', icon: 'fa-hand-pointer', color: '#fbbf24', shape: 1, start: startReflex, blurb: 'Wait for GREEN, then smash your button first! Jump the gun and you lose a point.', how: ['🔴 Wait while the screen is red - do NOT press.', '🟢 When it turns green press ANY of your two buttons first.', '⚠️ Early press = -1 point and you are frozen for that round.', '🏆 Most points after 5 rounds wins.'] }
  };

  function lobby(g) {
    switchView('game');
    document.getElementById('game-title').innerText = g.title;
    document.getElementById('btn-how-to-play-in-game').onclick = () => openHowToPlay(g.key);
    const st = document.getElementById('game-stage');
    const render = () => {
      st.innerHTML = `<div class="w-full max-w-md text-center space-y-5">
        <div class="text-6xl" style="color:${g.color}"><i class="fa-solid ${g.icon}"></i></div>
        <p class="text-slate-300 text-sm leading-relaxed">${g.blurb}</p>
        <div class="text-[11px] font-bold uppercase tracking-widest text-slate-400">How many players?</div>
        <div class="flex justify-center gap-2">${[1, 2, 3, 4].map(k => `<button data-n="${k}" class="mp-n m3-btn px-5 py-3 rounded-2xl font-black font-display text-lg border ${k === lastN ? 'bg-m3-primary text-white border-purple-400' : 'bg-slate-900/80 text-slate-300 border-slate-700'}">${k}P</button>`).join('')}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">${Array.from({ length: lastN }, (_, i) => `<div class="rounded-2xl px-3 py-2 bg-slate-900/80 border" style="border-color:${PC[i]}"><b style="color:${PC[i]}">P${i + 1}</b> <span class="text-slate-300">${KL[i][0]} / ${KL[i][1]}</span></div>`).join('')}</div>
        <p class="text-[11px] text-slate-500">${lastN < 4 ? 'Empty seats are filled by bots 🤖' : 'Four humans, zero bots!'} Touch pads appear under the game.</p>
        <button id="mp-go" class="m3-btn w-full py-3.5 rounded-full bg-gradient-to-r from-m3-primary via-m3-tertiary to-m3-secondary text-white font-black text-sm shadow-lg">START</button></div>`;
      st.querySelectorAll('.mp-n').forEach(b => b.onclick = () => { playSound('click'); lastN = +b.dataset.n; render(); });
      document.getElementById('mp-go').onclick = () => { playSound('click'); g.start(lastN); };
    };
    render();
  }

  const card = g => `<div data-category="multi" class="game-card m3-surface m3-card expressive-shape-${g.shape} p-6 flex flex-col justify-between border-t-4 shadow-xl" style="border-top-color:${g.color}">
    <div><div class="flex justify-between items-start mb-4">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style="background:${g.color}33;color:${g.color};border:1px solid ${g.color}66"><i class="fa-solid ${g.icon}"></i></div>
      <div class="flex gap-1.5 items-center"><span class="px-2.5 py-1.5 rounded-full bg-slate-800/80 text-[10px] font-black tracking-wider text-cyan-300 border border-slate-700">1-4 PLAYERS</span>
      <button onclick="openHowToPlay('${g.key}')" class="m3-btn text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-full border border-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-circle-info" style="color:${g.color}"></i><span>Rules</span></button></div></div>
      <h3 class="text-2xl font-black font-display text-white mb-1">${g.title}</h3><p class="text-slate-400 text-xs leading-relaxed font-medium mb-4">${g.blurb.split('.')[0]}.</p></div>
    <div class="pt-4 border-t border-white/10 flex items-center justify-between"><div class="text-xs text-slate-400">Wins: <span id="high-${g.key}" class="font-extrabold font-display" style="color:${g.color}">0</span></div>
      <button onclick="startMP('${g.key}')" class="m3-btn px-6 py-2.5 rounded-full text-slate-950 font-black text-xs shadow-lg flex items-center gap-2" style="background:${g.color}"><span>PLAY</span><i class="fa-solid fa-play text-[10px]"></i></button></div></div>`;

  window.startMP = key => lobby(GAMES[key]);

  Object.values(GAMES).forEach(g => {
    appState.scores[g.key] = parseInt(localStorage.getItem('bl_' + g.key) || 0);
    howToPlayData[g.key] = { title: g.title, icon: g.icon, color: 'text-cyan-400', rules: g.how };
  });
  const grid = document.getElementById('game-cards-grid');
  grid.insertAdjacentHTML('afterbegin', Object.values(GAMES).map(card).join(''));
  const bar = document.querySelector('.game-filter-btn').parentElement;
  bar.children[0].insertAdjacentHTML('afterend', `<button onclick="filterGames('multi')" class="game-filter-btn m3-pill px-5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">🎮 Multiplayer 1-4P</button>`);

  const baseUpdate = updateHubStats;
  updateHubStats = function () {
    baseUpdate();
    Object.values(GAMES).forEach(g => { const el = document.getElementById('high-' + g.key); if (el) el.innerText = appState.scores[g.key] / 50; });
  };
  updateHubStats();
})();
