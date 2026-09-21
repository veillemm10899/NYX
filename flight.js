(function () {
    'use strict';

    const GRAVITY = 1500;
    const FLAP = -430;
    const MAX_FALL = 950;
    const GATE_SPEED = 200;
    const GAP = 175;
    const PILLAR_W = 80;
    const SPIRIT_R = 11;
    const FLOOR_H = 64;
    const MARGIN_Y = 110;
    const SHOUT_COOLDOWN = 3 * 60 * 1000;

    const C = {
        skyTop: '#170b33',
        skyBottom: '#241248',
        pillar: '#1a1033',
        pillarEdge: '#8b5cf6',
        rim: '#e2b6ff',
        trail: '#a855f7'
    };

    const $ = (id) => document.getElementById(id);

    let supabase = null, currentUser = null, profile = null, hasRooms = false;
    let canvas = null, ctx = null, W = 0, H = 0, dpr = 1, groundY = 0;
    let spiritX = 0;

    let state = 'ready', score = 0, best = 0;
    let spirit = { y: 0, vy: 0, rot: 0 };
    let gates = [], stars = [], effects = [];
    let time = 0, lastFrame = 0, flash = 0, spawnAt = 0, settleTimer = 0;
    let dead = false, overlayShown = false;

    let muted = localStorage.getItem('nyx_muted') === '1';
    let audioCtx = null;
    const lastShout = {
        at: parseInt(localStorage.getItem('nyx_shout_at') || '0', 10) || 0
    };

    const el = {};

    /* ---- audio ---- */
    function ensureAudio() {
        if (audioCtx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }

    function sfx(kind) {
        if (muted || !audioCtx) return;
        const t = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        if (kind === 'flap') {
            o.type = 'square'; o.frequency.setValueAtTime(420, t);
            o.frequency.exponentialRampToValueAtTime(760, t + 0.07);
            g.gain.setValueAtTime(0.08, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            o.start(t); o.stop(t + 0.13);
        } else if (kind === 'ding') {
            [660, 990].forEach((f, i) => {
                const o2 = audioCtx.createOscillator();
                const g2 = audioCtx.createGain();
                o2.type = 'sine'; o2.frequency.value = f;
                o2.connect(g2); g2.connect(audioCtx.destination);
                g2.gain.setValueAtTime(0.07, t + i * 0.06);
                g2.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.18);
                o2.start(t + i * 0.06); o2.stop(t + i * 0.06 + 0.2);
            });
        } else if (kind === 'die') {
            o.type = 'sawtooth'; o.frequency.setValueAtTime(320, t);
            o.frequency.exponentialRampToValueAtTime(70, t + 0.35);
            g.gain.setValueAtTime(0.14, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            o.start(t); o.stop(t + 0.42);
        }
    }

    /* ---- helpers ---- */
    function addEffect(e) { effects.push(e); }

    function burst(x, y, n, opts) {
        opts = opts || {};
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = (opts.speed || 90) + Math.random() * 120;
            addEffect({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: 0.5 + Math.random() * 0.4,
                max: 0.9,
                size: 1.5 + Math.random() * 2,
                ring: false
            });
        }
    }

    function ring(x, y) {
        addEffect({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 0, ring: true });
    }

    function circleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = Math.max(rx, Math.min(cx, rx + rw));
        const ny = Math.max(ry, Math.min(cy, ry + rh));
        const dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy <= r * r;
    }

    /* ---- world ---- */
    function makeStars() {
        stars = [];
        for (let i = 0; i < 70; i++) {
            stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + 0.4, ph: Math.random() * Math.PI * 2, sp: 0.2 + Math.random() * 0.8 });
        }
    }

    function spawnGate() {
        const topCap = MARGIN_Y + GAP / 2;
        const bottomCap = groundY - FLOOR_H * 0.6 - GAP / 2;
        const gapY = topCap + Math.random() * Math.max(10, bottomCap - topCap);
        gates.push({ x: W + PILLAR_W, gapY, passed: false });
    }

    function reset() {
        score = 0;
        spirit = { y: H * 0.45, vy: 0, rot: 0 };
        gates = [];
        state = 'ready';
        dead = false;
        overlayShown = false;
        flash = 0;
        spawnAt = 0;
        settleTimer = 1.2;
        el.gameover.classList.add('hidden');
        cleanEffects();
    }

    function cleanEffects() {
        effects = effects.filter(e => e.life <= 0);
    }

    /* ---- action ---- */
    function flap() {
        if (state === 'dead') return;
        ensureAudio();
        if (state === 'ready') {
            state = 'playing';
            spawnAt = 0.9;
            spirit.vy = FLAP;
            sfx('flap');
            return;
        }
        spirit.vy = FLAP;
        sfx('flap');
    }

    function die() {
        state = 'dead';
        dead = true;
        flash = 1;
        sfx('die');
        burst(spiritX, spirit.y, 42, { speed: 160 });
        const bumped = score > best;
        if (bumped) {
            best = score;
            localStorage.setItem('nyx_flight_best', String(best));
        }
        timelineDie = bumped;
        setTimeout(() => {
            el.goGates.textContent = score;
            el.goScore.textContent = score;
            el.goBest.textContent = best;
            el.gameover.classList.remove('hidden');
            overlayShown = true;
            tryShout();
        }, 520);
    }

    let timelineDie = false;

    /* ---- broadcast ---- */
    async function shoutToRiver() {
        if (!profile) return;
        const now = Date.now();
        if (now - lastShout.at < SHOUT_COOLDOWN) {
            const secs = Math.ceil((SHOUT_COOLDOWN - (now - lastShout.at)) / 1000);
            toast('The river still echoes... wait ' + secs + 's');
            return;
        }

        const parts = [
            'A spirit falls in the river: ' + profile.nyx_name,
            'Gates ' + score,
            'Score ' + score
        ];
        if (timelineDie) parts.push('New best');
        if (best > 0) parts.push('Best ' + best);
        const msg = parts.join(' | ') + '. The river remembers this fall.';

        const row = {
            sender_id: currentUser.id,
            sender_nyx_name: profile.nyx_name,
            sender_nyx_number: profile.nyx_number,
            message: msg,
            message_type: 'text'
        };
        if (hasRooms) row.room = 'main';

        const btn = el.broadcastBtn;
        btn.disabled = true;
        try {
            const { error } = await supabase.from('messages').insert(row);
            if (error) throw error;
            lastShout.at = now;
            localStorage.setItem('nyx_shout_at', String(now));
            toast('Shouted to The Cosmic River.');
        } catch (err) {
            console.error('Shout failed:', err);
            toast('The river is silent right now.');
        } finally {
            btn.disabled = false;
        }
    }

    function tryShout() {
        if (Date.now() - lastShout.at >= SHOUT_COOLDOWN) shoutToRiver();
    }

    function toast(msg) {
        el.toast.textContent = msg;
        el.toast.classList.remove('show');
        void el.toast.offsetWidth;
        el.toast.classList.add('show');
        setTimeout(() => el.toast.classList.remove('show'), 1700);
    }

    /* ---- update ---- */
    function update(dt) {
        time += dt;
        if (flash > 0) flash = Math.max(0, flash - dt * 2.2);

        if (settleTimer > 0) settleTimer -= dt;

        if (state === 'playing') {
            spirit.vy = Math.min(MAX_FALL, spirit.vy + GRAVITY * dt);
            spirit.y += spirit.vy * dt;
            spirit.rot = Math.max(-0.35, Math.min(1.35, spirit.vy / 500));

            if (spirit.y - SPIRIT_R < 0) spirit.y = SPIRIT_R;
            if (spirit.y + SPIRIT_R >= groundY) { spirit.y = groundY - SPIRIT_R; die(); return; }

            if (spawnAt <= 0) { spawnGate(); spawnAt = Math.max(1.12, 1.55 - score * 0.004); }
            spawnAt -= dt;

            for (const g of gates) {
                g.x -= GATE_SPEED * dt;
                if (!g.passed && g.x + PILLAR_W / 2 < spiritX) {
                    g.passed = true;
                    score++;
                    sfx('ding');
                    ring(spiritX, spirit.y);
                }
                const topH = g.gapY - GAP / 2;
                const botY = g.gapY + GAP / 2;
                if (circleRect(spiritX, spirit.y, SPIRIT_R, g.x - PILLAR_W / 2, 0, PILLAR_W, topH) ||
                    circleRect(spiritX, spirit.y, SPIRIT_R, g.x - PILLAR_W / 2, botY, PILLAR_W, groundY - botY)) {
                    die();
                    return;
                }
            }
            gates = gates.filter(g => g.x + PILLAR_W > -80);

            addEffect({
                x: spiritX + (Math.random() - 0.5) * 6,
                y: spirit.y + (Math.random() - 0.5) * 6,
                vx: -60, vy: 30 + Math.random() * 40,
                life: 0.35, max: 0.35, size: 1.5, ring: false
            });
        }

        if (state === 'ready') {
            spirit.y = H * 0.45 + Math.sin(time * 2.4) * 14;
            spirit.rot = Math.sin(time * 2.4) * 0.12;
        }

        for (const e of effects) {
            e.life -= dt;
            if (!e.ring) {
                e.x += (e.vx - (state === 'playing' ? GATE_SPEED : 0)) * dt;
                e.y += e.vy * dt;
            } else {
                e.size += 240 * dt;
            }
            if (e.ring) e.x -= GATE_SPEED * dt;
        }
        effects = effects.filter(e => e.life > 0);
    }

    /* ---- render ---- */
    function render() {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, C.skyTop);
        sky.addColorStop(1, C.skyBottom);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const halo = ctx.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, H * 0.55);
        halo.addColorStop(0, 'rgba(139,92,246,0.28)');
        halo.addColorStop(1, 'rgba(139,92,246,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, W, H);

        const moon = ctx.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, 34);
        moon.addColorStop(0, '#f2f0ff');
        moon.addColorStop(0.35, 'rgba(226,182,255,0.55)');
        moon.addColorStop(1, 'rgba(226,182,255,0)');
        ctx.fillStyle = moon;
        ctx.beginPath();
        ctx.arc(W * 0.78, H * 0.2, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#fff';
        for (const s of stars) {
            const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.6 + s.ph));
            ctx.globalAlpha = tw * 0.8;
            ctx.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        for (const g of gates) {
            const left = g.x - PILLAR_W / 2;
            const topH = g.gapY - GAP / 2;
            const botY = g.gapY + GAP / 2;

            ctx.save();
            ctx.shadowColor = C.pillarEdge;
            ctx.shadowBlur = 18;

            const pg = ctx.createLinearGradient(0, 0, PILLAR_W, 0);
            pg.addColorStop(0, 'rgba(26,16,51,0.95)');
            pg.addColorStop(0.5, 'rgba(43,28,80,0.9)');
            pg.addColorStop(1, 'rgba(26,16,51,0.95)');
            ctx.fillStyle = pg;
            ctx.shadowBlur = 0;

            ctx.fillRect(left, 0, PILLAR_W, topH);
            ctx.fillRect(left, botY, PILLAR_W, groundY - botY);

            ctx.shadowColor = C.rim;
            ctx.shadowBlur = 16;
            ctx.fillStyle = C.rim;
            ctx.fillRect(left, topH - 4, PILLAR_W, 4);
            ctx.fillRect(left, botY, PILLAR_W, 4);
            ctx.restore();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const e of effects) {
            const a = Math.max(0, e.life / e.max);
            if (e.ring) {
                ctx.strokeStyle = 'rgba(226,182,255,' + a * 0.9 + ')';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = 'rgba(168,85,247,' + a * 0.9 + ')';
                ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
            }
        }
        ctx.restore();

        if (state !== 'dead' && !overlayShown) {
            ctx.save();
            ctx.translate(spiritX, spirit.y);
            ctx.rotate(spirit.rot);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const orb = ctx.createRadialGradient(0, 0, 0, 0, 0, SPIRIT_R * 2.6);
            orb.addColorStop(0, 'rgba(226,182,255,0.55)');
            orb.addColorStop(1, 'rgba(168,85,247,0)');
            ctx.fillStyle = orb;
            ctx.beginPath();
            ctx.arc(0, 0, SPIRIT_R * 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const core = ctx.createRadialGradient(-2, -2, 1, 0, 0, SPIRIT_R + 1);
            core.addColorStop(0, '#ffffff');
            core.addColorStop(0.55, '#e2b6ff');
            core.addColorStop(1, '#a855f7');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(0, 0, SPIRIT_R, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(-3.5, -3.5, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        const glowLine = ctx.createLinearGradient(0, groundY - 26, 0, groundY);
        glowLine.addColorStop(0, 'rgba(139,92,246,0)');
        glowLine.addColorStop(1, 'rgba(139,92,246,0.55)');
        ctx.fillStyle = glowLine;
        ctx.fillRect(0, groundY - 26, W, 26);

        const ground = ctx.createLinearGradient(0, groundY, 0, H);
        ground.addColorStop(0, '#1a1033');
        ground.addColorStop(0.12, '#0d0820');
        ground.addColorStop(1, '#07050f');
        ctx.fillStyle = ground;
        ctx.fillRect(0, groundY, W, H - groundY);

        ctx.save();
        ctx.shadowColor = C.rim;
        ctx.shadowBlur = 12;
        ctx.fillStyle = C.rim;
        ctx.fillRect(0, groundY - 2, W, 2);
        ctx.restore();

        if (flash > 0) {
            ctx.fillStyle = 'rgba(242,240,255,' + Math.min(0.55, flash) + ')';
            ctx.fillRect(0, 0, W, H);
        }

        const font = "'Space Grotesk', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (state === 'ready' || state === 'playing') {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = C.trail;
            ctx.shadowBlur = 22;
            ctx.font = '700 ' + Math.min(54, W * 0.14) + 'px ' + font;
            ctx.fillText(String(score), W / 2, Math.max(58, H * 0.07));
            ctx.shadowBlur = 0;
        }

        if (state === 'ready') {
            const a = 0.6 + 0.4 * Math.sin(time * 4);
            ctx.globalAlpha = a;
            ctx.fillStyle = '#e2b6ff';
            ctx.font = '600 ' + Math.min(20, W * 0.05) + 'px ' + font;
            ctx.fillText('TAP or SPACE to rise', W / 2, H * 0.58);
            ctx.globalAlpha = 0.7;
            ctx.font = '500 ' + Math.min(14, W * 0.035) + 'px ' + font;
            ctx.fillText('best ' + best, W / 2, H * 0.58 + 34);
            ctx.globalAlpha = 1;
        }
    }

    /* ---- loop ---- */
    function loop(nowMs) {
        const dt = Math.min(0.05, (nowMs - (lastFrame || nowMs)) / 1000);
        lastFrame = nowMs;
        update(dt);
        render();
        requestAnimationFrame(loop);
    }

    /* ---- input / sizing ---- */
    function resize() {
        const shell = el.shell;
        dpr = Math.min(2.5, window.devicePixelRatio || 1);
        W = Math.max(280, shell.clientWidth);
        H = Math.max(320, shell.clientHeight);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        groundY = Math.round(H - FLOOR_H);
        spiritX = Math.round(W * 0.32);
        makeStars();
    }

    function onGesture(e) {
        const t = e.target;
        if (t && (t.closest && (t.closest('.top-btn') || t.closest('#gameover')))) return;
        flap();
    }

    /* ---- boot ---- */
    async function boot() {
        supabase = window.supabaseConfig.supabaseClient;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = 'login.html'; return; }
        currentUser = user;

        const { data: prof, error } = await supabase
            .from('profiles')
            .select('nyx_name, nyx_number')
            .eq('id', currentUser.id)
            .single();
        if (!error) profile = prof;

        const { error: colErr } = await supabase.from('messages').select('room').limit(0);
        hasRooms = !colErr;

        el.shell = $('shell');
        canvas = $('game-canvas');
        ctx = canvas.getContext('2d');
        el.gameover = $('gameover');
        el.goGates = $('go-gates');
        el.goScore = $('go-score');
        el.goBest = $('go-best');
        el.broadcastBtn = $('broadcast-btn');
        el.restartBtn = $('restart-btn');
        el.muteBtn = $('mute-btn');
        el.toast = $('toast');

        best = parseInt(localStorage.getItem('nyx_flight_best') || '0', 10) || 0;
        updateMuteIcon();

        window.addEventListener('resize', resize);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
        });
        window.addEventListener('pointerdown', onGesture, { passive: true });
        el.muteBtn.addEventListener('click', () => {
            muted = !muted;
            localStorage.setItem('nyx_muted', muted ? '1' : '0');
            updateMuteIcon();
        });
        el.restartBtn.addEventListener('click', () => reset());
        el.broadcastBtn.addEventListener('click', () => shoutToRiver());

        resize();
        reset();
        requestAnimationFrame(loop);
    }

    function updateMuteIcon() {
        const icon = el.muteBtn.querySelector('i');
        if (icon) {
            icon.className = muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();