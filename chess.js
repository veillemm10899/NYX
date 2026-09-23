(function () {
    'use strict';

    /* ================= CHESS ENGINE ================= */

    const MATE = 100000;

    const GLYPH = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
    const PTYPE = { P: 'P', N: 'N', B: 'B', R: 'R', Q: 'Q', K: 'K' };

    function colorOf(p) {
        if (p === '.') return null;
        return p === p.toUpperCase() ? 'w' : 'b';
    }

    function pieceType(p) { return p.toUpperCase(); }

    function sqName(sq) {
        return 'abcdefgh'[(sq & 7)] + String(8 - (sq >> 3));
    }

    function mirrorRank(sq) { return ((7 - (sq >> 3)) << 3) + (sq & 7); }

    const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    function parseFEN(fen) {
        const b = new Array(64).fill('.');
        let i = 0;
        const ranks = fen.split(' ')[0].split('/');
        for (let r = 0; r < 8; r++) {
            let f = 0;
            for (const ch of ranks[r]) {
                if (ch >= '1' && ch <= '8') { f += parseInt(ch, 10); }
                else { b[r * 8 + f] = ch; f++; }
            }
        }
        return b;
    }

    function newGame() {
        return {
            b: parseFEN(START),
            turn: 'w',
            castle: { K: true, Q: true, k: true, q: true },
            ep: -1,
            capturedW: [],
            capturedB: [],
            moveN: 0
        };
    }

    /* attack detection */
    const KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    const KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    function inBoard(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

    function isAttacked(st, sq, byW) {
        const f = sq & 7, r = sq >> 3;
        const z = st.b;
        // pawns
        if (byW === 'w') {
            if (inBoard(r + 1, f - 1) && z[(r + 1) * 8 + f - 1] === 'P') return true;
            if (inBoard(r + 1, f + 1) && z[(r + 1) * 8 + f + 1] === 'P') return true;
        } else {
            if (inBoard(r - 1, f - 1) && z[(r - 1) * 8 + f - 1] === 'p') return true;
            if (inBoard(r - 1, f + 1) && z[(r - 1) * 8 + f + 1] === 'p') return true;
        }
        // knights
        for (const [dr, df] of KNIGHT_D) {
            const rr = r + dr, ff = f + df;
            if (inBoard(rr, ff)) {
                const p = z[rr * 8 + ff];
                if (p !== '.' && colorOf(p) === byW && pieceType(p) === 'N') return true;
            }
        }
        // king
        for (const [dr, df] of KING_D) {
            const rr = r + dr, ff = f + df;
            if (inBoard(rr, ff)) {
                const p = z[rr * 8 + ff];
                if (p !== '.' && colorOf(p) === byW && pieceType(p) === 'K') return true;
            }
        }
        // sliders
        const SL = {
            B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
        };
        for (const type of ['B', 'R', 'Q']) {
            for (const [dr, df] of SL[type]) {
                let rr = r + dr, ff = f + df;
                while (inBoard(rr, ff)) {
                    const p = z[rr * 8 + ff];
                    if (p === '.') { rr += dr; ff += df; continue; }
                    if (colorOf(p) === byW && (pieceType(p) === type || pieceType(p) === 'Q')) return true;
                    break;
                }
            }
        }
        return false;
    }

    function kingSq(st, color) {
        const z = st.b;
        const k = color === 'w' ? 'K' : 'k';
        for (let i = 0; i < 64; i++) if (z[i] === k) return i;
        return -1;
    }

    function inCheck(st, color) {
        const k = kingSq(st, color);
        if (k < 0) return true;
        return isAttacked(st, k, color === 'w' ? 'b' : 'w');
    }

    /* move generation */
    function generatePseudo(st, turn) {
        const list = [];
        const z = st.b;
        const myEnemy = turn === 'w' ? 'b' : 'w';
        for (let sq = 0; sq < 64; sq++) {
            const p = z[sq];
            if (p === '.' || colorOf(p) !== turn) continue;
            const type = pieceType(p);
            const f = sq & 7, r = sq >> 3;
            if (type === 'P') {
                const dir = turn === 'w' ? -1 : 1;
                const start = turn === 'w' ? 6 : 1;
                const promoR = turn === 'w' ? 0 : 7;
                const one = (r + dir) * 8 + f;
                if (inBoard(r + dir, f) && z[one] === '.') {
                    if (r + dir === promoR) {
                        ['Q', 'R', 'B', 'N'].forEach(pt => list.push({ f: sq, t: one, flag: 0, promo: turn === 'w' ? pt : pt.toLowerCase() }));
                    } else {
                        list.push({ f: sq, t: one, flag: 0 });
                        if (r === start) {
                            const two = (r + 2 * dir) * 8 + f;
                            if (z[two] === '.') list.push({ f: sq, t: two, flag: 0, epSq: (r + dir) * 8 + f });
                        }
                    }
                }
                for (const df of [-1, 1]) {
                    const ff = f + df, rr = r + dir;
                    if (!inBoard(rr, ff)) continue;
                    const tSq = rr * 8 + ff;
                    if (z[tSq] !== '.' && colorOf(z[tSq]) === myEnemy) {
                        if (rr === promoR) {
                            ['Q', 'R', 'B', 'N'].forEach(pt => list.push({ f: sq, t: tSq, flag: 0, promo: turn === 'w' ? pt : pt.toLowerCase() }));
                        } else {
                            list.push({ f: sq, t: tSq, flag: 0 });
                        }
                    } else if (z[tSq] === '.' && st.ep === tSq) {
                        list.push({ f: sq, t: tSq, flag: 3 });
                    }
                }
            } else if (type === 'N') {
                for (const [dr, df] of KNIGHT_D) {
                    const rr = r + dr, ff = f + df;
                    if (!inBoard(rr, ff)) continue;
                    const tSq = rr * 8 + ff;
                    if (z[tSq] === '.' || colorOf(z[tSq]) === myEnemy) list.push({ f: sq, t: tSq, flag: 0 });
                }
            } else if (type === 'K') {
                for (const [dr, df] of KING_D) {
                    const rr = r + dr, ff = f + df;
                    if (!inBoard(rr, ff)) continue;
                    const tSq = rr * 8 + ff;
                    if (z[tSq] === '.' || colorOf(z[tSq]) === myEnemy) list.push({ f: sq, t: tSq, flag: 0 });
                }
                // castling
                const home = turn === 'w' ? 7 : 0;
                if (r === home && z[home * 8 + 4] === (turn === 'w' ? 'K' : 'k')) {
                    const KS = turn === 'w' ? st.castle.K : st.castle.k;
                    if (z[home * 8 + 7] === (turn === 'w' ? 'R' : 'r') &&
                        z[home * 8 + 5] === '.' && z[home * 8 + 6] === '.' &&
                        !isAttacked(st, home * 8 + 4, myEnemy) && !isAttacked(st, home * 8 + 5, myEnemy)) {
                        list.push({ f: sq, t: home * 8 + 6, flag: 1 });
                    }
                    const QS = turn === 'w' ? st.castle.Q : st.castle.q;
                    if (z[home * 8 + 0] === (turn === 'w' ? 'R' : 'r') &&
                        z[home * 8 + 3] === '.' && z[home * 8 + 2] === '.' && z[home * 8 + 1] === '.' &&
                        !isAttacked(st, home * 8 + 4, myEnemy) && !isAttacked(st, home * 8 + 3, myEnemy)) {
                        list.push({ f: sq, t: home * 8 + 2, flag: 2 });
                    }
                }
            } else {
                const SL = {
                    B: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
                    R: [[-1, 0], [1, 0], [0, -1], [0, 1]],
                    Q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
                };
                for (const [dr, df] of SL[type]) {
                    let rr = r + dr, ff = f + df;
                    while (inBoard(rr, ff)) {
                        const tSq = rr * 8 + ff;
                        if (z[tSq] === '.') {
                            list.push({ f: sq, t: tSq, flag: 0 });
                        } else {
                            if (colorOf(z[tSq]) === myEnemy) list.push({ f: sq, t: tSq, flag: 0 });
                            break;
                        }
                        rr += dr; ff += df;
                    }
                }
            }
        }
        return list;
    }

    function makeMove(st, m) {
        const ns = {
            b: st.b.slice(),
            turn: st.turn === 'w' ? 'b' : 'w',
            castle: { ...st.castle },
            ep: -1,
            capturedW: st.capturedW.slice(),
            capturedB: st.capturedB.slice(),
            moveN: st.moveN + 1
        };
        const p = ns.b[m.f];
        ns.b[m.f] = '.';

        const captured = ns.b[m.t];
        if (captured !== '.') {
            if (st.turn === 'w') ns.capturedW.push(captured);
            else ns.capturedB.push(captured);
        }

        if (m.promo) {
            ns.b[m.t] = m.promo;
            const epCap = ns.b[m.t + (st.turn === 'w' ? 8 : -8)];
            if (m.flag === 3 && epCap !== '.') {
                if (st.turn === 'w') ns.capturedW.push(epCap);
                else ns.capturedB.push(epCap);
            }
        } else if (m.flag === 3) {
            const capSq = m.t + (st.turn === 'w' ? 8 : -8);
            const epCap = ns.b[capSq];
            if (st.turn === 'w') ns.capturedW.push(epCap);
            else ns.capturedB.push(epCap);
            ns.b[capSq] = '.';
            ns.b[m.t] = p;
        } else if (m.flag === 1) {
            const home = st.turn === 'w' ? 7 : 0;
            ns.b[home * 8 + 4] = '.';
            ns.b[home * 8 + 6] = p;
            ns.b[home * 8 + 5] = st.turn === 'w' ? 'R' : 'r';
            ns.b[home * 8 + 7] = '.';
        } else if (m.flag === 2) {
            const home = st.turn === 'w' ? 7 : 0;
            ns.b[home * 8 + 4] = '.';
            ns.b[home * 8 + 2] = p;
            ns.b[home * 8 + 3] = st.turn === 'w' ? 'R' : 'r';
            ns.b[home * 8 + 0] = '.';
        } else {
            ns.b[m.t] = p;
        }

        if (m.epSq) ns.ep = m.epSq;

        // castle rights
        if (p === 'K') { ns.castle.K = false; ns.castle.Q = false; }
        if (p === 'k') { ns.castle.k = false; ns.castle.q = false; }
        const corners = {
            63: 'K', 56: 'Q', 7: 'k', 0: 'q'
        };
        for (const lsq of [m.f, m.t]) {
            if (corners[lsq]) ns.castle[corners[lsq]] = false;
        }
        return ns;
    }

    function legalMoves(st) {
        const turn = st.turn;
        const pseudo = generatePseudo(st, turn);
        const out = [];
        for (const m of pseudo) {
            const ns = makeMove(st, m);
            if (!inCheck(ns, turn)) out.push(m);
        }
        return out;
    }

    /* evaluation */
    const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
    const PST_P = [0, 0, 0, 0, 0, 0, 0, 0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5, 5, 10, 25, 25, 10, 5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, -5, -10, 0, 0, -10, -5, 5,
        5, 10, 10, -20, -20, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0];
    const PST_N = [-50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50];
    const PST_B = [-20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -20, -10, -10, -10, -10, -10, -10, -20];
    const PST_R = [0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0];
    const PST_Q = [-20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20];
    const PST_K = [-30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20];

    function evaluate(st) {
        let s = 0;
        const z = st.b;
        for (let i = 0; i < 64; i++) {
            const p = z[i];
            if (p === '.') continue;
            const c = colorOf(p);
            const t = pieceType(p);
            const mir = mirrorRank(i);
            let pst = 0;
            switch (t) {
                case 'P': pst = PST_P[i]; break;
                case 'N': pst = PST_N[i]; break;
                case 'B': pst = PST_B[i]; break;
                case 'R': pst = PST_R[i]; break;
                case 'Q': pst = PST_Q[i]; break;
                case 'K': pst = PST_K[i]; break;
            }
            if (c === 'w') { s += VAL[t] + pst; if (mir !== i) s += 0; }
            else { s -= VAL[t] + pst; }
        }
        return s;
    }

    function orderMoves(moves, st) {
        const vv = m => {
            const cap = m.t === st.ep ? 100 : 0;
            if (m.flag === 3) return 100;
            const victim = m.t >= 0 && m.t < 64 && st.b[m.t] !== '.' ? VAL[pieceType(st.b[m.t])] : 0;
            return victim * 10 - VAL[pieceType(st.b[m.f])] / 100 + cap + (m.promo ? 9000 : 0);
        };
        moves.sort((a, b) => vv(b) - vv(a));
    }

    const sideSign = st => (st.turn === 'w' ? 1 : -1);

    function negamax(st, depth, alpha, beta) {
        const moves = legalMoves(st);
        if (!moves.length) {
            return inCheck(st, st.turn) ? -(MATE - (CONST_PLY - depth)) : 0;
        }
        if (depth <= 0) return evaluate(st) * sideSign(st);
        orderMoves(moves, st);
        let best = -Infinity;
        for (const m of moves) {
            const val = -negamax(makeMove(st, m), depth - 1, -beta, -alpha);
            if (val > best) best = val;
            if (best > alpha) alpha = best;
            if (alpha >= beta) break;
        }
        return best;
    }

    let CONST_PLY = 0;

    function aiChooseMove(state) {
        const moves = legalMoves(state);
        if (!moves.length) return null;
        orderMoves(moves, state);
        const depth = pieceCount(state) <= 12 ? 4 : 3;
        let alpha = -Infinity, beta = Infinity;
        let bestScore = -Infinity;
        let bestMoves = [];
        for (const m of moves) {
            CONST_PLY = depth;
            const val = -negamax(makeMove(state, m), depth - 1, -beta, -alpha);
            if (val > bestScore) {
                bestScore = val;
                bestMoves = [m];
            } else if (val === bestScore) {
                bestMoves.push(m);
            }
            if (bestScore > alpha) alpha = bestScore;
        }
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    function pieceCount(st) {
        let n = 0;
        for (const p of st.b) if (p !== '.') n++;
        return n;
    }

    function gameStatus(st) {
        const moves = legalMoves(st);
        if (!moves.length) {
            return inCheck(st, st.turn) ? 'checkmate' : 'stalemate';
        }
        if (insufficientMaterial(st)) return 'draw';
        return 'live';
    }

    function insufficientMaterial(st) {
        let counts = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
        let knights = 0, bishops = 0, minor = 0;
        for (const p of st.b) {
            if (p === '.') continue;
            const t = pieceType(p);
            if (t === 'P' || t === 'R' || t === 'Q') return false;
            if (t === 'N') knights++;
            if (t === 'B') bishops++;
            if (t === 'N' || t === 'B') minor++;
        }
        return minor === 0 || (minor === 1);
    }

    /* ================= APP ================= */

    const $ = (id) => document.getElementById(id);
    const KEY_SHOUT = 'nyx_shout_at';
    const SHOUT_COOLDOWN = 3 * 60 * 1000;

    let supabase = null, currentUser = null, profile = null, hasChallenges = false, hasRooms = false;
    let muted = (typeof localStorage !== 'undefined') ? localStorage.getItem('nyx_muted') === '1' : false;
    let audioCtx = null;
    const lastShout = { at: (typeof localStorage !== 'undefined') ? (parseInt(localStorage.getItem(KEY_SHOUT) || '0', 10) || 0) : 0 };

    const st = {
        game: newGame(),
        mode: null,
        mySide: 'w',
        orientation: 'w',
        selected: null,
        legal: [],
        lastMove: null,
        aiThinking: false,
        over: false,
        channel: null,
        matchId: null,
        pendingPromo: null,
        waitChalId: null,
        waitWatcher: null,
        pendingChal: null,
        oppName: null,
        moveLog: [],
        rematch: null
    };

    const el = {};

    /* --- audio --- */
    function ensureAudio() {
        if (audioCtx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }

    function tone(freq, dur, type, gain, delay) {
        if (muted || !audioCtx) return;
        const t = audioCtx.currentTime + (delay || 0);
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type; o.frequency.value = freq;
        o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t); o.stop(t + dur);
    }

    function sfx(kind) {
        ensureAudio();
        if (kind === 'move') tone(340, 0.12, 'sine', 0.05);
        else if (kind === 'capture') { tone(180, 0.12, 'square', 0.06); tone(90, 0.14, 'square', 0.05, 0.03); }
        else if (kind === 'cast') tone(280, 0.12, 'sine', 0.05);
        else if (kind === 'check') tone(660, 0.22, 'sine', 0.07);
        else if (kind === 'promo') { [523, 784, 1046].forEach((f, i) => tone(f, 0.16, 'sine', 0.06, i * 0.09)); }
        else if (kind === 'win') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.07, i * 0.13)); }
        else if (kind === 'lose') { [300, 210, 140].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, i * 0.15)); }
        else if (kind === 'draw') { [440, 440].forEach((f, i) => tone(f, 0.24, 'sine', 0.05, i * 0.18)); }
        else if (kind === 'ding') tone(880, 0.2, 'sine', 0.06);
    }

    /* --- helpers --- */
    function hueOf(s) {
        let h = 0;
        for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return h % 360;
    }
    function gradFor(s) {
        const h = hueOf(s);
        return 'linear-gradient(135deg, hsl(' + h + ' 70% 62%), hsl(' + ((h + 45) % 360) + ' 72% 48%))';
    }
    function avatarText(name) {
        return String(name).replace('Nyx ', '').substring(0, 2).toUpperCase();
    }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }
    function toast(msg) {
        el.toast.textContent = msg;
        el.toast.classList.remove('show');
        void el.toast.offsetWidth;
        el.toast.classList.add('show');
        setTimeout(() => el.toast.classList.remove('show'), 2200);
    }

    function chipNames() {
        const me = profile ? profile.nyx_name : 'You';
        if (st.mode === 'ai') return { white: me, black: 'The Tide' };
        return { white: st.mySide === 'w' ? me : (st.oppName || 'Stranger'), black: st.mySide === 'b' ? me : (st.oppName || 'Stranger') };
    }

    /* --- background --- */
    function bgLoop() {
        const cv = el.fxBg, cx = cv.getContext('2d');
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        let par = [];
        function resizeBg() {
            cv.width = window.innerWidth * dpr;
            cv.height = window.innerHeight * dpr;
            cv.style.width = '100%';
            cv.style.height = '100%';
            cx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const W = window.innerWidth, H = window.innerHeight;
            par = [];
            for (let i = 0; i < 22; i++) {
                par.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.6, s: 0.2 + Math.random() * 0.8, a: 0.14 + Math.random() * 0.35 });
            }
        }
        resizeBg();
        window.addEventListener('resize', resizeBg);
        const W = () => window.innerWidth, H = () => window.innerHeight;
        requestAnimationFrame(function draw(t) {
            const w = W(), h = H();
            const g = cx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#170b33');
            g.addColorStop(1, '#231043');
            cx.fillStyle = g;
            cx.fillRect(0, 0, w, h);
            cx.fillStyle = '#c4b5fd';
            for (const p of par) {
                cx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 900 + p.s * 9));
                cx.beginPath();
                cx.arc(((p.x + t * p.s * 0.003) % w + w) % w, p.y, p.r, 0, Math.PI * 2);
                cx.fill();
            }
            cx.globalAlpha = 1;
            requestAnimationFrame(draw);
        });
    }

    /* --- board rendering --- */
    function buildBoard() {
        const board = el.board;
        board.innerHTML = '';
        for (let i = 0; i < 64; i++) {
            const sq = document.createElement('div');
            sq.className = 'square';
            const f = i & 7, r = i >> 3;
            sq.classList.add((r + f) % 2 ? 'dark' : 'light');
            if (f === 0) {
                const c = document.createElement('span');
                c.className = 'coord rank';
                c.textContent = String(8 - r);
                sq.appendChild(c);
            }
            if (r === 7) {
                const c = document.createElement('span');
                c.className = 'coord file';
                c.textContent = 'abcdefgh'[f];
                sq.appendChild(c);
            }
            sq.addEventListener('click', () => onSquare(st.orientation === 'w' ? i : 63 - i));
            board.appendChild(sq);
        }
        el.sqEls = Array.prototype.slice.call(board.children);
    }

    function fitBoard() {
        const w = window;
        const vw = w.innerWidth;
        const vh = (w.visualViewport && w.visualViewport.height) || w.innerHeight;
        const isDesktop = vw >= 768 && vh >= 560;
        let px;
        if (isDesktop) {
            px = Math.max(360, Math.min(vw * 0.94, vh - 380, 760));
        } else {
            px = Math.max(200, Math.min(vw * 0.94, vh - 260, 560));
        }
        px = Math.min(px, vw - 20);
        document.documentElement.style.setProperty('--bsize', px + 'px');
    }

    function scrollToBoard() {
        if (!el.match || el.match.hidden) return;
        try { el.match.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { el.match.scrollIntoView(); }
    }

    function render() {
        const game = st.game;
        for (const e of el.sqEls) {
            const cd = e.querySelector('.coord');
            if (cd) cd.remove();
        }
        for (let sq = 0; sq < 64; sq++) {
            const elSq = el.sqEls[st.orientation === 'w' ? sq : 63 - sq];
            elSq.className = 'square';
            const f = sq & 7, r = sq >> 3;
            elSq.classList.add((r + f) % 2 ? 'dark' : 'light');
            if (f === 0) {
                const c = document.createElement('span');
                c.className = 'coord rank';
                c.textContent = String(8 - r);
                elSq.appendChild(c);
            }
            if (r === 7) {
                const c = document.createElement('span');
                c.className = 'coord file';
                c.textContent = 'abcdefgh'[f];
                elSq.appendChild(c);
            }
            const p = game.b[sq];
            if (p !== '.') {
                let pieceEl = null;
                for (const child of elSq.children) {
                    if (child.classList.contains('piece')) pieceEl = child;
                }
                if (!pieceEl) {
                    pieceEl = document.createElement('span');
                    pieceEl.className = 'piece';
                    elSq.appendChild(pieceEl);
                }
                pieceEl.textContent = GLYPH[pieceType(p)];
                pieceEl.classList.toggle('white', colorOf(p) === 'w');
                pieceEl.classList.toggle('black', colorOf(p) === 'b');
            } else {
                for (const child of Array.prototype.slice.call(elSq.children)) {
                    if (child.classList.contains('piece')) child.remove();
                }
            }
        }

        if (st.lastMove) {
            markSq(st.lastMove.f, 'last-from');
            markSq(st.lastMove.t, 'last-to');
        }
        if (st.selected !== null) {
            el.sqEls[st.orientation === 'w' ? st.selected : 63 - st.selected].classList.add('selected');
            for (const m of st.legal) {
                const tSq = el.sqEls[st.orientation === 'w' ? m.t : 63 - m.t];
                tSq.classList.add('legal');
                if (game.b[m.t] !== '.' || m.flag === 3) tSq.classList.add('cap');
            }
        }
        const checkKing = kingSq(game, game.turn);
        if (checkKing >= 0 && inCheck(game, game.turn)) {
            markSq(checkKing, 'check');
        }
    }

    function markSq(sq, cls) {
        if (sq < 0 || sq > 63) return;
        el.sqEls[st.orientation === 'w' ? sq : 63 - sq].classList.add(cls);
    }

    function renderCaptured() {
        el.capturedMe.innerHTML = '';
        el.capturedOpp.innerHTML = '';
        const myCaptures = st.mySide === 'w' ? st.game.capturedB : st.game.capturedW;
        const oppCaptures = st.mySide === 'w' ? st.game.capturedW : st.game.capturedB;
        for (const p of myCaptures) {
            const s = document.createElement('span');
            s.textContent = GLYPH[pieceType(p)];
            el.capturedMe.appendChild(s);
        }
        for (const p of oppCaptures) {
            const s = document.createElement('span');
            s.textContent = GLYPH[pieceType(p)];
            el.capturedOpp.appendChild(s);
        }
        let adv = 0;
        const z = st.game.b;
        for (let i = 0; i < 64; i++) {
            const p = z[i];
            if (p === '.') continue;
            if (colorOf(p) === 'w') adv += VAL[pieceType(p)];
            else adv -= VAL[pieceType(p)];
        }
        const sign = (st.mySide === 'w' ? adv : -adv);
        if (sign > 0) el.capturedSum.textContent = '+' + Math.round(sign / 100);
        else if (sign < 0) el.capturedSum.textContent = '-' + Math.round(-sign / 100);
        else el.capturedSum.textContent = '±';
    }

    function refreshChips() {
        const names = chipNames();
        el.whiteName.textContent = names.white;
        el.blackName.textContent = names.black;
        el.whiteAvatar.textContent = avatarText(names.white);
        el.blackAvatar.textContent = avatarText(names.black);
        el.whiteAvatar.style.background = gradFor(names.white);
        el.blackAvatar.style.background = gradFor(names.black);
        el['chipWhite'].style.order = st.orientation === 'w' ? 0 : 2;
        el['chipBlack'].style.order = st.orientation === 'w' ? 2 : 0;
        el.midLabel.style.order = 1;
        updateTurnChip();
    }

    function updateTurnChip() {
        if (st.over || st.aiThinking) {
            el.chipWhite.classList.remove('on-turn');
            el.chipBlack.classList.remove('on-turn');
            return;
        }
        if (st.orientation === 'w') {
            el.chipWhite.classList.toggle('on-turn', st.game.turn === 'w' && myTurn());
            el.chipBlack.classList.toggle('on-turn', st.game.turn === 'b');
        } else {
            el.chipBlack.classList.toggle('on-turn', st.game.turn === 'b' && myTurn());
            el.chipWhite.classList.toggle('on-turn', st.game.turn === 'w');
        }
    }

    function myTurn() {
        if (st.mode === 'ai') return st.game.turn === st.mySide;
        if (st.mode === 'online') return st.game.turn === st.mySide && !st.over && st.channel;
        return false;
    }

    function midLabel(text, cls) {
        el.midLabel.textContent = text;
        el.midLabel.classList.toggle('live', !!cls);
    }

    /* --- interaction --- */
    function onSquare(sq) {
        if (st.over || st.aiThinking) return;
        if (!myTurn()) return;

        const game = st.game;
        const p = game.b[sq];
        if (st.selected !== null && st.legal.some(m => m.t === sq)) {
            let m = st.legal.find(m => m.t === sq);
            const matching = st.legal.filter(m => m.t === sq);
            if (matching.length > 1) {
                st.pendingPromo = matching;
                el.promo.classList.remove('hidden');
                return;
            }
            if (m.flag === 3 || m.promo) {
                st.pendingPromo = matching;
                el.promo.classList.remove('hidden');
                return;
            }
            doMove(m);
            return;
        }
        if (p !== '.' && colorOf(p) === game.turn) {
            st.selected = sq;
            st.legal = legalMoves(game).filter(m => m.f === sq);
            if (!st.legal.length) { st.selected = null; st.legal = []; }
            render();
            return;
        }
        st.selected = null;
        st.legal = [];
        render();
    }

    function doMove(m) {
        st.game = makeMove(st.game, m);
        st.moveLog.push(m);
        st.lastMove = m;
        st.selected = null;
        st.legal = [];
        if (st.game.b[m.t] !== '.' || m.flag === 3) sfx('capture');
        else if (m.flag === 1 || m.flag === 2) sfx('cast');
        else if (m.promo) sfx('promo');
        else sfx('move');
        sendIfOnline(m);
        afterLocalMove();
    }

    function sendIfOnline(m) {
        if (st.mode === 'online' && st.channel) {
            st.channel.send({ type: 'broadcast', event: 'mv', payload: { f: m.f, t: m.t, flag: m.flag || 0, promo: m.promo ? pieceType(m.promo) : null } });
        }
    }

    function afterLocalMove() {
        const status = gameStatus(st.game);
        render();
        renderCaptured();
        refreshChips();

        if (status === 'checkmate') {
            finishGame('checkmate', st.game.turn === 'w' ? 'b' : 'w');
            return;
        }
        if (status === 'stalemate') { finishGame('stalemate', null); return; }
        if (status === 'draw') { finishGame('draw', null); return; }

        if (inCheck(st.game, st.game.turn)) {
            midLabel('CHECK!', true);
            sfx('check');
        } else if (st.mode === 'ai') {
            midLabel(st.game.turn === 'b' ? 'THE TIDE is thinking...' : 'YOUR TURN', st.game.turn === 'w');
        } else if (st.mode === 'online') {
            midLabel(st.game.turn === st.mySide ? 'YOUR TURN' : 'RIVAL IS MOVING...', st.game.turn === st.mySide);
        } else {
            midLabel('YOUR TURN', true);
        }

        if (st.mode === 'ai' && st.game.turn === 'b' && !st.over) {
            st.aiThinking = true;
            refreshChips();
            setTimeout(aiTurn, 400);
        }
    }

    function applyRemote(m) {
        if (st.over) return;
        const list = legalMoves(st.game).filter(x =>
            x.f === m.f && x.t === m.t &&
            (m.promo ? (x.promo && pieceType(x.promo) === pieceType(m.promo)) : !x.promo));
        if (!list.length) {
            toast('Move mismatch — syncing.');
            return;
        }
        const mv = list[0];
        st.game = makeMove(st.game, mv);
        st.moveLog.push(mv);
        st.lastMove = mv;
        st.selected = null;
        st.legal = [];
        if (st.game.b[mv.t] !== '.' || mv.flag === 3) sfx('capture');
        else if (mv.flag === 1 || mv.flag === 2) sfx('cast');
        else if (mv.promo) sfx('promo');
        else sfx('move');
        afterLocalMove();
    }

    function aiTurn() {
        if (st.over) return;
        const mv = aiChooseMove(st.game);
        st.aiThinking = false;
        if (!mv) {
            const status = gameStatus(st.game);
            if (status === 'checkmate') finishGame('checkmate', st.game.turn === 'w' ? 'b' : 'w');
            else if (status === 'stalemate') finishGame('stalemate', null);
            else finishGame('draw', null);
            return;
        }
        st.game = makeMove(st.game, mv);
        st.moveLog.push(mv);
        st.lastMove = mv;
        st.selected = null;
        st.legal = [];
        if (st.game.b[mv.t] !== '.' || mv.flag === 3) sfx('capture');
        else if (mv.flag === 1 || mv.flag === 2) sfx('cast');
        else if (mv.promo) sfx('promo');
        else sfx('move');
        afterLocalMove();
    }

    function finishGame(kind, winner) {
        st.over = true;
        st.selected = null;
        st.legal = [];
        render();
        renderCaptured();
        refreshChips();

        let title = '', sub = '', glyph = 'fas fa-chess';
        if (kind === 'checkmate') {
            const w = winner === 'w';
            title = 'CHECKMATE';
            const winnerName = w ? el.whiteName.textContent : el.blackName.textContent;
            sub = w ? 'Checkmate — ' + winnerName + ' takes the board.' : 'Checkmate — ' + winnerName + ' takes the board.';
            glyph = w && wonByMe(w) ? 'fas fa-trophy' : 'fas fa-skull';
            sfx(wonByMe(w) ? 'win' : 'lose');
        } else if (kind === 'stalemate') {
            title = 'STALEMATE';
            sub = 'No legal moves. The river is flat.';
            glyph = 'fas fa-asterisk';
            sfx('draw');
        } else if (kind === 'draw') {
            title = 'DRAW';
            sub = 'Not enough material to checkmate.';
            glyph = 'fas fa-asterisk';
            sfx('draw');
        } else if (kind === 'resign') {
            title = wonByMe(winner) ? 'VICTORY' : 'RESIGNED';
            sub = wonByMe(winner) ? 'Your rival resigned.' : 'You gave up the board.';
            glyph = wonByMe(winner) ? 'fas fa-trophy' : 'fas fa-flag';
            sfx(wonByMe(winner) ? 'win' : 'lose');
        } else if (kind === 'opp-left') {
            title = 'RIVAL LEFT';
            sub = 'Your opponent wandered off. Match paused.';
            glyph = 'fas fa-person-walking-dashed-line-arrow-right';
        }

        el.resGlyph.innerHTML = '<i class="' + glyph + '"></i>';
        el.resTitle.textContent = title;
        el.resSub.textContent = sub;
        el.overShout.hidden = kind === 'opp-left';
        el.overRematch.hidden = kind === 'opp-left';
        st.rematch = null;
        el.overRematch.disabled = false;
        el.overRematch.querySelector('span').textContent = 'Rematch';
        el.overMenu.hidden = false;
        el.overMenu.querySelector('span').textContent = 'Menu';
        extraOverFor(kind, winner);

        const instant = kind === 'resign' || kind === 'opp-left';
        if (instant) {
            el.over.classList.remove('hidden');
            return;
        }
        if (kind === 'checkmate') {
            midLabel((winner === 'w' ? 'WHITE' : 'BLACK') + ' WINS', true);
        } else {
            midLabel(title, true);
        }
        setTimeout(() => {
            el.over.classList.remove('hidden');
        }, 1400);
    }

    function extraOverFor(kind, winner) {
        if (kind === 'resign' || kind === 'opp-left') {
            if (st.channel) { try { st.channel.unsubscribe(); } catch (e) {} st.channel = null; }
            return;
        }
        if (st.channel) {
            try {
                st.channel.send({ type: 'broadcast', event: 'end', payload: { why: kind } });
            } catch (e) {}
            try { st.channel.unsubscribe(); } catch (e) {}
            st.channel = null;
        }
    }

    function wonByMe(winnerColor) {
        return st.mySide === winnerColor;
    }

    /* --- shout --- */
    async function shoutToRiver(kind, winner) {
        if (!profile) return;
        const now = Date.now();
        if (now - lastShout.at < SHOUT_COOLDOWN) {
            const secs = Math.ceil((SHOUT_COOLDOWN - (now - lastShout.at)) / 1000);
            toast('The river still echoes... wait ' + secs + 's');
            return;
        }
        let msg;
        if (kind === 'checkmate') {
            const w = winner === 'w';
            msg = 'A board of the river: ' + (w ? el.whiteName.textContent : el.blackName.textContent) +
                ' checkmated ' + (w ? el.blackName.textContent : el.whiteName.textContent) +
                ' in the river. Score ' + (w ? '1' : '1') + '–0.';
        } else {
            msg = profile.nyx_name + ' finished a board in the river with ' + (st.oppName || 'The Tide') + '.';
        }

        const row = {
            sender_id: currentUser.id,
            sender_nyx_name: profile.nyx_name,
            sender_nyx_number: profile.nyx_number,
            message: msg,
            message_type: 'text'
        };
        if (hasRooms) row.room = 'main';
        el.overShout.disabled = true;
        try {
            const { error } = await supabase.from('messages').insert(row);
            if (error) throw error;
            lastShout.at = now;
            localStorage.setItem(KEY_SHOUT, String(now));
            toast('Shouted to The Cosmic River.');
        } catch (err) {
            toast('The river is silent right now.');
        } finally {
            el.overShout.disabled = false;
        }
    }

    function choosePromo(type) {
        el.promo.classList.add('hidden');
        const list = st.pendingPromo;
        st.pendingPromo = null;
        if (!list || !list.length) return;
        const m = list.find(mm => mm.promo && pieceType(mm.promo) === type) || list[0];
        doMove(m);
    }

    /* --- controls --- */
    function rebuildBoardControls() {
        el.resignBtn.hidden = st.mode !== 'online';
        el.leaveBtn.hidden = st.mode !== 'online';
    }

    function resetBoardFor(side) {
        st.game = newGame();
        st.over = false;
        st.moveLog = [];
        st.selected = null;
        st.legal = [];
        st.lastMove = null;
        st.mySide = side;
        st.orientation = side;
    }

    function startRematch() {
        if (st.mode === 'online') {
            const side = st.mySide === 'w' ? 'b' : 'w';
            resetBoardFor(side);
            st.rematch = null;
            el.overRematch.disabled = false;
            el.overRematch.querySelector('span').textContent = 'Rematch';
            el.over.classList.add('hidden');
            rebuildBoardControls();
            buildBoard();
            fitBoard();
            refreshChips();
            render();
            renderCaptured();
            midLabel(side === 'w' ? 'YOUR TURN' : 'WAITING FOR WHITE...', side === 'w');
            scrollToBoard();
            return;
        }
        resetBoardFor('w');
        el.over.classList.add('hidden');
        buildBoard();
        fitBoard();
        refreshChips();
        render();
        renderCaptured();
        midLabel('YOUR TURN', true);
        scrollToBoard();
    }

    /* --- modes --- */
    function startAiMatch() {
        st.mode = 'ai';
        st.channel = null;
        resetBoardFor('w');
        st.orientation = 'w';
        el.menu.hidden = true;
        el.onlinePanel.hidden = true;
        el.match.hidden = false;
        el.over.classList.add('hidden');
        el.promo.classList.add('hidden');
        rebuildBoardControls();
        buildBoard();
        fitBoard();
        refreshChips();
        render();
        renderCaptured();
        midLabel('YOUR TURN', true);
        setTimeout(scrollToBoard, 60);
    }

    async function startOnlineMatch(id, side) {
        st.mode = 'online';
        st.matchId = id;
        resetBoardFor(side);
        st.orientation = side;
        el.menu.hidden = true;
        el.onlinePanel.hidden = true;
        el.match.hidden = false;
        el.over.classList.add('hidden');
        el.promo.classList.add('hidden');
        el.waitBanner.hidden = true;
        rebuildBoardControls();
        buildBoard();
        fitBoard();

        const { data: row } = await supabase.from('challenges')
            .select('challenger_name,target_name')
            .eq('id', id)
            .single();
        st.oppName = row ? (side === 'w' ? row.target_name : row.challenger_name) : (st.oppName || 'Stranger');
        refreshChips();
        render();
        renderCaptured();
        midLabel(side === 'w' ? 'YOUR TURN' : 'WAITING FOR WHITE...', side === 'w');

        const ch = supabase.channel('chess-' + id);
        st.channel = ch;
        let seenPresence = 0;

        ch.on('broadcast', { event: 'mv' }, p => applyRemote(p.payload));
        ch.on('broadcast', { event: 'resign' }, p => {
            if (!st.over) finishGame('resign', p.side === 'w' ? 'b' : 'w');
        });
        ch.on('broadcast', { event: 'bye' }, () => {
            if (!st.over) finishGame('opp-left', null);
        });
        ch.on('broadcast', { event: 'rematch' }, () => {
            if (!st.over) return;
            if (st.rematch === 'asked') {
                startRematch();
            } else {
                st.rematch = 'asked';
                el.overRematch.querySelector('span').textContent = 'Rematch';
                toast('Rival wants a rematch. Colors swap.');
            }
        });
        ch.on('presence', { event: 'sync' }, () => {
            const n = Object.keys(ch.presenceState() || {}).length;
            if (seenPresence >= 2 && n < 2 && !st.over) finishGame('opp-left', null);
            seenPresence = Math.max(seenPresence, n);
        });
        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try { await ch.track({ in: true }); } catch (e) {}
            }
        });
        setTimeout(scrollToBoard, 60);
    }

    /* --- challenges --- */
    async function refreshLists() {
        const [outRes, incRes, playersRes] = await Promise.all([
            supabase.from('challenges').select('*').eq('challenger_id', currentUser.id).order('created_at', { ascending: false }).limit(12),
            supabase.from('challenges').select('*').eq('target_id', currentUser.id).order('created_at', { ascending: false }).limit(12),
            listOnlineProfiles()
        ]);
        try { renderOut(outRes.data || []); } catch (e) {}
        try { renderInc(incRes.data || []); } catch (e) {}
        try { renderOnline(playersRes); } catch (e) {}
    }

    async function listOnlineProfiles() {
        const direct = async () => {
            const { data, error } = await supabase.from('profiles')
                .select('id, nyx_name, last_seen')
                .eq('is_online', true)
                .neq('id', currentUser.id);
            if (error) throw error;
            return data || [];
        };
        try {
            return await direct();
        } catch (e) {
            try {
                const { data, error } = await supabase.rpc('get_all_profiles');
                if (error) throw error;
                return (data || []).filter(p => p.is_online && p.id !== currentUser.id);
            } catch (e2) {
                return [];
            }
        }
    }

    function renderOut(list) {
        el.outList.innerHTML = '';
        for (const c of list) {
            const item = document.createElement('div');
            item.className = 'op-item';
            item.innerHTML =
                '<span class="op-avatar" style="background:' + gradFor(c.target_name) + '">' + avatarText(c.target_name) + '</span>' +
                '<span class="op-name">' + esc(c.target_name) + '</span>' +
                '<span class="op-tag ' + esc(c.status) + '">' + esc(c.status) + '</span>';
            el.outList.appendChild(item);
        }
        if (!list.length) el.outList.innerHTML = '<p class="op-empty">No challenges sent yet.</p>';
    }

    function renderInc(list) {
        el.incList.innerHTML = '';
        for (const c of list) {
            if (c.status !== 'pending') continue;
            const item = document.createElement('div');
            item.className = 'op-item';
            item.innerHTML =
                '<span class="op-avatar" style="background:' + gradFor(c.challenger_name) + '">' + avatarText(c.challenger_name) + '</span>' +
                '<span class="op-name">' + esc(c.challenger_name) + '</span>';
            const acc = document.createElement('button');
            acc.className = 'op-btn';
            acc.textContent = 'Accept';
            acc.addEventListener('click', () => respondChallenge(c, 'accepted'));
            const dec = document.createElement('button');
            dec.className = 'op-btn';
            dec.textContent = 'Decline';
            dec.addEventListener('click', () => respondChallenge(c, 'declined'));
            item.appendChild(acc);
            item.appendChild(dec);
            el.incList.appendChild(item);
        }
        if (!list.length) el.incList.innerHTML = '<p class="op-empty">No summons yet.</p>';
    }

    function renderOnline(list) {
        el.onlineList.innerHTML = '';
        for (const p of list) {
            const item = document.createElement('div');
            item.className = 'op-item';
            item.innerHTML =
                '<span class="op-avatar" style="background:' + gradFor(p.nyx_name) + '">' + avatarText(p.nyx_name) + '</span>' +
                '<span class="op-name">' + esc(p.nyx_name) + '</span>';
            const btn = document.createElement('button');
            btn.className = 'op-btn';
            btn.textContent = 'Challenge';
            btn.addEventListener('click', () => sendChallenge(p));
            item.appendChild(btn);
            el.onlineList.appendChild(item);
        }
        if (!list.length) el.onlineList.innerHTML = '<p class="op-empty">No one is drifting right now.</p>';
    }

    async function probeOnline() {
        try {
            const { error } = await supabase.from('challenges').select('id').limit(0);
            hasChallenges = !error;
        } catch (e) {
            hasChallenges = false;
        }
        return hasChallenges;
    }

    async function sendChallenge(target) {
        if (!(await probeOnline())) { toast('Challenges are off — run the SQL first.'); return; }
        const { data, error } = await supabase.from('challenges').insert({
            challenger_id: currentUser.id,
            challenger_name: profile ? profile.nyx_name : 'Unknown Nyx',
            target_id: target.id,
            target_name: target.nyx_name,
            status: 'pending'
        }).select('id').single();
        if (error || !data) { toast('Could not send the challenge.'); return; }
        startWaiting(target.nyx_name, data.id);
        refreshLists();
    }

    async function respondChallenge(c, status) {
        await supabase.from('challenges').update({ status }).eq('id', c.id);
        if (st.pendingChal && st.pendingChal.id === c.id) st.pendingChal = null;
        el.chalModal.classList.add('hidden');
        if (status === 'accepted') startOnlineMatch(c.id, 'b');
        refreshLists();
    }

    function startWaiting(name, id) {
        st.waitChalId = id;
        el.waitText.textContent = 'Waiting for ' + name + ' to accept the board...';
        el.waitBanner.hidden = false;
        watchChallenge(id);
    }

    async function watchChallenge(id) {
        if (st.waitWatcher) clearInterval(st.waitWatcher);
        st.waitWatcher = setInterval(async () => {
            if (!st.waitChalId || st.waitChalId !== id) { clearInterval(st.waitWatcher); st.waitWatcher = null; return; }
            try {
                const { data } = await supabase.from('challenges').select('status').eq('id', id).single();
                if (!data) {
                    clearInterval(st.waitWatcher); st.waitWatcher = null;
                    st.waitChalId = null;
                    el.waitBanner.hidden = true;
                    refreshLists();
                } else if (data.status === 'accepted') {
                    clearInterval(st.waitWatcher); st.waitWatcher = null;
                    st.waitChalId = null;
                    el.waitBanner.hidden = true;
                    startOnlineMatch(id, 'w');
                } else if (data.status === 'declined' || data.status === 'cancelled') {
                    clearInterval(st.waitWatcher); st.waitWatcher = null;
                    st.waitChalId = null;
                    el.waitBanner.hidden = true;
                    toast('Your challenge was declined.');
                    refreshLists();
                }
            } catch (e) {}
        }, 2000);
    }

    function cancelWaiting() {
        if (!st.waitChalId) return;
        const id = st.waitChalId;
        if (st.waitWatcher) { clearInterval(st.waitWatcher); st.waitWatcher = null; }
        supabase.from('challenges').delete().eq('id', id).then(() => {}).catch(() => {});
        st.waitChalId = null;
        el.waitBanner.hidden = true;
        refreshLists();
    }

    function subscribeChallenges() {
        const ch = supabase.channel('chal-' + currentUser.id);
        ch.on('postgres_changes', {
            event: 'insert', schema: 'public', table: 'challenges', filter: 'target_id=eq.' + currentUser.id
        }, (payload) => {
            const c = payload.new;
            refreshLists();
            if (!st.channel) {
                st.pendingChal = c;
                el.chalName.textContent = c.challenger_name;
                el.chalModal.classList.remove('hidden');
                sfx('ding');
            } else {
                toast(c.challenger_name + ' summons you after this board.');
            }
        });
        ch.on('postgres_changes', {
            event: 'update', schema: 'public', table: 'challenges', filter: 'challenger_id=eq.' + currentUser.id
        }, (payload) => {
            const c = payload.new;
            refreshLists();
            if (c.status === 'accepted' && !st.channel) {
                st.waitChalId = null;
                if (st.waitWatcher) { clearInterval(st.waitWatcher); st.waitWatcher = null; }
                el.waitBanner.hidden = true;
                el.over.classList.add('hidden');
                startOnlineMatch(c.id, 'w');
            }
        });
        ch.on('postgres_changes', {
            event: 'delete', schema: 'public', table: 'challenges', filter: 'challenger_id=eq.' + currentUser.id
        }, () => {
            if (st.waitChalId) {
                st.waitChalId = null;
                if (st.waitWatcher) { clearInterval(st.waitWatcher); st.waitWatcher = null; }
                el.waitBanner.hidden = true;
            }
            refreshLists();
        });
        ch.subscribe();
    }

    function subscribeOnlineRoster() {
        const pc = supabase
            .channel('roster-' + currentUser.id)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: 'profiles'
            }, () => {
                if (!el.onlinePanel.hidden) refreshLists();
            })
            .subscribe();
        if (window.__rosterSubs) window.__rosterSubs.push(pc);
        else window.__rosterSubs = [pc];
    }

    function startRosterPoll() {
        if (window.__rosterPoll) return;
        window.__rosterPoll = setInterval(() => {
            if (!st.channel && !el.onlinePanel.hidden) refreshLists();
        }, 8000);
    }

    /* --- audio toggle --- */
    function toggleMute() {
        muted = !muted;
        localStorage.setItem('nyx_muted', muted ? '1' : '0');
        el.muteBtn.querySelector('i').className = muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
    }

    /* --- bind --- */
    async function setOnline(online) {
        try {
            await supabase.rpc('update_online_status', { user_id: currentUser.id, online_status: online });
        } catch (e) {
            await supabase.from('profiles').update({ is_online: online }).eq('id', currentUser.id);
        }
    }

    function bind() {
        el.fxBg = $('fx-bg');
        el.muteBtn = $('mute-btn');
        el.menu = $('menu');
        el.playAi = $('play-ai');
        el.playOnline = $('play-online');
        el.onlinePanel = $('online-panel');
        el.outList = $('out-list');
        el.incList = $('inc-list');
        el.onlineList = $('online-list');
        el.match = $('match');
        el.board = $('board');
        el.whiteAvatar = $('white-avatar');
        el.whiteName = $('white-name');
        el.chipWhite = $('chip-white');
        el.blackAvatar = $('black-avatar');
        el.blackName = $('black-name');
        el.chipBlack = $('chip-black');
        el.midLabel = $('mid-label');
        el.capturedMe = $('captured-me');
        el.capturedOpp = $('captured-opp');
        el.capturedSum = $('captured-sum');
        el.resignBtn = $('resign-btn');
        el.leaveBtn = $('leave-btn');
        el.promo = $('promo');
        el.over = $('over');
        el.resGlyph = $('res-glyph');
        el.resTitle = $('res-title');
        el.resSub = $('res-sub');
        el.overShout = $('over-shout');
        el.overRematch = $('over-rematch');
        el.overMenu = $('over-menu');
        el.chalModal = $('chal-modal');
        el.chalName = $('chal-name');
        el.chalAccept = $('chal-accept');
        el.chalDecline = $('chal-decline');
        el.toast = $('toast');

        el.waitBanner = $('wait-banner');
        el.waitText = $('wait-text');

        el.playAi.addEventListener('click', () => { ensureAudio(); startAiMatch(); });
        el.playOnline.addEventListener('click', async () => {
            ensureAudio();
            if (!(await probeOnline())) {
                toast('Challenges are off — run the Chess SQL in Supabase first.');
                return;
            }
            el.onlinePanel.hidden = !el.onlinePanel.hidden;
            if (!el.onlinePanel.hidden) { refreshLists(); startRosterPoll(); }
        });
        el.muteBtn.addEventListener('click', toggleMute);
        el.resignBtn.addEventListener('click', () => {
            if (st.mode !== 'online' || !st.channel) return;
            const side = st.mySide;
            st.channel.send({ type: 'broadcast', event: 'resign', payload: { side: side } });
            finishGame('resign', side === 'w' ? 'b' : 'w');
        });
        el.leaveBtn.addEventListener('click', () => {
            if (st.channel) { try { st.channel.send({ type: 'broadcast', event: 'bye', payload: {} }); } catch (e) {} }
            goHome();
        });
        el.overShout.addEventListener('click', () => shoutToRiver());
        el.overRematch.addEventListener('click', () => {
            if (st.mode !== 'online') {
                if (st.mode === 'ai') { startRematch(); return; }
                return;
            }
            if (!st.channel || !st.over) return;
            st.channel.send({ type: 'broadcast', event: 'rematch', payload: { side: st.mySide } });
            if (st.rematch === 'asked') {
                startRematch();
            } else {
                st.rematch = 'asked';
                el.overRematch.querySelector('span').textContent = 'Waiting for rival...';
                el.overRematch.disabled = true;
            }
        });
        el.overMenu.addEventListener('click', () => {
            if (st.waitChalId) { cancelWaiting(); return; }
            goHome();
        });
        el.waitCancel.addEventListener('click', () => cancelWaiting());
        el.chalAccept.addEventListener('click', () => {
            if (st.pendingChal) respondChallenge(st.pendingChal, 'accepted');
        });
        el.chalDecline.addEventListener('click', () => {
            if (st.pendingChal) respondChallenge(st.pendingChal, 'declined');
        });
        document.querySelectorAll('.promo-btn').forEach(b => {
            b.addEventListener('click', () => choosePromo(b.dataset.p));
        });

        window.addEventListener('resize', fitBoard);
        window.addEventListener('orientationchange', () => setTimeout(fitBoard, 180));
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', fitBoard);
            window.visualViewport.addEventListener('scroll', fitBoard);
        }
        addEventListener('load', () => setTimeout(fitBoard, 80));

        window.addEventListener('beforeunload', () => {
            if (st.channel) { try { st.channel.unsubscribe(); } catch (e) {} }
            if (currentUser) {
                try { setOnline(false); } catch (e) {}
            }
        });
    }

    function goHome() {
        if (st.channel) { try { st.channel.unsubscribe(); } catch (e) {} st.channel = null; }
        if (st.waitWatcher) { clearInterval(st.waitWatcher); st.waitWatcher = null; }
        st.mode = null;
        st.waitChalId = null;
        el.match.hidden = true;
        el.over.classList.add('hidden');
        el.waitBanner.hidden = true;
        el.chalModal.classList.add('hidden');
        el.menu.hidden = false;
        el.onlinePanel.hidden = true;
        refreshLists();
    }

    /* --- boot --- */
    async function boot() {
        supabase = window.supabaseConfig.supabaseClient;

        const params = new URLSearchParams(window.location.search);
        const mid = params.get('m');
        const side = params.get('s');
        const deepLink = !!(mid && (side === 'w' || side === 'b'));

        bind();
        if (deepLink) {
            el.menu.hidden = true;
            el.onlinePanel.hidden = true;
            el.match.hidden = false;
            setTimeout(scrollToBoard, 40);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = 'login.html'; return; }
        currentUser = user;

        const { data: prof, error } = await supabase.from('profiles')
            .select('nyx_name, nyx_number')
            .eq('id', currentUser.id)
            .single();
        if (!error) profile = prof;

        const { error: colErr } = await supabase.from('messages').select('room').limit(0);
        hasRooms = !colErr;

        const { error: chalErr } = await supabase.from('challenges').select('id').limit(0);
        hasChallenges = !chalErr;

        bgLoop();
        buildBoard();
        fitBoard();
        refreshChips();
        render();
        renderCaptured();

        try { await setOnline(true); } catch (e) {}

        if (hasChallenges) {
            subscribeChallenges();
            setInterval(() => { if (!st.channel) refreshLists(); }, 15000);
            refreshLists();
        } else {
            el.playOnline.classList.add('pending');
            el.playOnline.querySelector('.glow-btn-tag').textContent = 'SETUP';
            setTimeout(async () => {
                if (await probeOnline()) {
                    el.playOnline.classList.remove('pending');
                    el.playOnline.querySelector('.glow-btn-tag').textContent = '1v1';
                    subscribeChallenges();
                    refreshLists();
                }
            }, 3000);
        }
        subscribeOnlineRoster();
        setTimeout(refreshLists, 1500);

        if (deepLink) {
            startOnlineMatch(mid, side);
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { newGame, makeMove, legalMoves, inCheck, kingSq, gameStatus, aiChooseMove, sqName, evaluate };
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();