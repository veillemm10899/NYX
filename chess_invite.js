/* NYX — Chess challenge notification inside the chat.
   Shows a floating accept/decline card when someone challenges you to CHESS. */

(function () {
    'use strict';

    if (!window.supabaseConfig) return;

    const supabase = window.supabaseConfig.supabaseClient;
    let uid = null, card = null, current = null;

    function buildCard() {
        card = document.createElement('div');
        card.id = 'chess-invite';
        card.style.cssText = [
            'position:fixed',
            'left:50%',
            'transform:translateX(-50%)',
            'bottom:max(90px,env(safe-area-inset-bottom))',
            'z-index:999',
            'width:min(420px,92vw)',
            'background:linear-gradient(160deg,#181028,#0f0a1f)',
            'border:1px solid rgba(139,92,246,0.55)',
            'border-radius:18px',
            'padding:14px 16px',
            'box-shadow:0 18px 60px rgba(0,0,0,0.6)',
            'font-family:Inter,system-ui,sans-serif',
            'color:#e9e4ff',
            'display:none'
        ].join(';');
        card.innerHTML =
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' +
            '<span style="font-size:1.3rem;background:linear-gradient(135deg,#8b5cf6,#d946ef);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent"><i class="fas fa-chess-knight"></i></span>' +
            '<div style="flex:1;min-width:0">' +
            '<div style="font-family:Space Grotesk,sans-serif;font-size:0.72rem;letter-spacing:.16em;color:#a78bfa;text-transform:uppercase">Check challenge</div>' +
            '<div id="chess-invite-name" style="font-size:.9rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>' +
            '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px">' +
            '<button id="chess-invite-accept" style="flex:1;border:0;border-radius:12px;padding:11px;background:linear-gradient(135deg,rgba(124,58,237,.92),rgba(217,70,239,.8));color:#fff;font-size:.86rem;font-weight:600;cursor:pointer;font-family:inherit">Accept</button>' +
            '<button id="chess-invite-decline" style="flex:1;border:1px solid rgba(251,113,133,.45);border-radius:12px;padding:11px;background:rgba(251,113,133,.12);color:#fda4af;font-size:.86rem;font-weight:600;cursor:pointer;font-family:inherit">Decline</button>' +
            '</div>';
        document.body.appendChild(card);
        card.querySelector('#chess-invite-accept').addEventListener('click', () => answer('accepted'));
        card.querySelector('#chess-invite-decline').addEventListener('click', () => answer('declined'));
    }

    function show(name, id) {
        current = id;
        document.getElementById('chess-invite-name').textContent = name + ' challenges you to a board.';
        card.style.display = 'block';
    }

    function hide() { card.style.display = 'none'; }

    async function answer(status) {
        if (!current) return;
        const id = current;
        hide();
        if (status === 'accepted') {
            await supabase.from('challenges').update({ status }).eq('id', id);
            window.location.href = 'chess.html?m=' + id + '&s=black';
        } else {
            await supabase.from('challenges').update({ status }).eq('id', id);
        }
        current = null;
    }

    async function boot() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        uid = user.id;
        buildCard();

        const ch = supabase.channel('chal-inv-' + uid);
        ch.on('postgres_changes', {
            event: 'insert', schema: 'public', table: 'challenges',
            filter: 'target_id=eq.' + uid
        }, (payload) => {
            const c = payload.new;
            if (c.status === 'pending') show(c.challenger_name, c.id);
        });
        ch.subscribe();
    }

    boot();
})();