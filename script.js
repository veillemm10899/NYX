// NYX splash — lightweight ambience, no loading screens.
(() => {
    const starsCanvas = document.getElementById('stars');
    const nebulaCanvas = document.getElementById('nebula');
    if (!starsCanvas || !nebulaCanvas) return;

    const sctx = starsCanvas.getContext('2d');
    const nctx = nebulaCanvas.getContext('2d');
    let w = 0, h = 0;

    const resize = () => {
        w = starsCanvas.width = nebulaCanvas.width = window.innerWidth * devicePixelRatio;
        h = starsCanvas.height = nebulaCanvas.height = window.innerHeight * devicePixelRatio;
        buildStars();
    };

    // Stars
    let stars = [];
    const buildStars = () => {
        stars = [];
        const count = Math.min(220, (w * h) / 9000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: (Math.random() * 1.4 + 0.4) * devicePixelRatio,
                alpha: Math.random() * 0.6 + 0.25,
                speed: Math.random() * 0.9 + 0.3,
                phase: Math.random() * Math.PI * 2,
            });
        }
    };

    // Nebula blobs
    let blobs = [];
    const buildBlobs = () => {
        blobs = [];
        for (let i = 0; i < 4; i++) {
            blobs.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: (Math.random() * 0.35 + 0.2) * Math.max(w, h),
                hue: 250 + Math.random() * 70,
                drift: (Math.random() - 0.5) * 0.15,
                phase: Math.random() * Math.PI * 2,
            });
        }
    };

    const drawNebula = (t) => {
        nctx.clearRect(0, 0, w, h);
        blobs.forEach((b, i) => {
            b.phase += 0.003;
            const pulse = Math.sin(b.phase) * 0.12 + 1;
            const x = b.x + Math.sin(b.phase * 0.5) * 40;
            const y = b.y + Math.cos(b.phase * 0.4) * 40;
            const g = nctx.createRadialGradient(x, y, 0, x, y, b.r * pulse);
            g.addColorStop(0, `hsla(${b.hue}, 90%, 60%, 0.10)`);
            g.addColorStop(0.6, `hsla(${b.hue + 40}, 90%, 55%, 0.05)`);
            g.addColorStop(1, 'transparent');
            nctx.fillStyle = g;
            nctx.fillRect(0, 0, w, h);
        });
    };

    const drawStars = (t) => {
        sctx.clearRect(0, 0, w, h);
        stars.forEach((s) => {
            s.phase += s.speed * 0.02;
            const tw = Math.sin(s.phase) * 0.25 + 0.75;
            const a = s.alpha * tw;
            sctx.beginPath();
            sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            sctx.fillStyle = `rgba(240, 244, 255, ${a})`;
            sctx.shadowColor = `rgba(196, 181, 253, ${a * 0.6})`;
            sctx.shadowBlur = s.r * 4;
            sctx.fill();
            sctx.shadowBlur = 0;
        });
    };

    let start = performance.now();
    const loop = (now) => {
        const t = (now - start) / 1000;
        drawNebula(t);
        drawStars(t);
        requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    buildBlobs();
    requestAnimationFrame(loop);

    // Enter → login
    const enterBtn = document.getElementById('enter-nyx');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            document.getElementById('splash').classList.add('leaving');
            setTimeout(() => { window.location.href = 'login.html'; }, 320);
        });
    }
})();