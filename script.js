// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open'))
);

// Reveal sections on scroll
const sections = document.querySelectorAll('.section');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
sections.forEach(s => observer.observe(s));

// Show hero-adjacent first section immediately
document.querySelector('.hero').style.opacity = 1;

/* ---------- Universe background: nebula, starfield, shooting stars ---------- */
(() => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Nebula clouds — huge, soft, slowly drifting
  const nebulae = [
    { x: 0.2, y: 0.25, r: 0.45, hue: 275, a: 0.16, vx: 0.00012, vy: 0.00008 },
    { x: 0.8, y: 0.15, r: 0.38, hue: 315, a: 0.13, vx: -0.00010, vy: 0.00006 },
    { x: 0.7, y: 0.75, r: 0.50, hue: 220, a: 0.14, vx: 0.00008, vy: -0.00010 },
    { x: 0.15, y: 0.85, r: 0.40, hue: 348, a: 0.10, vx: -0.00006, vy: -0.00012 },
    { x: 0.5, y: 0.5, r: 0.60, hue: 250, a: 0.07, vx: 0.00005, vy: 0.00005 }
  ];

  // Starfield — three depth layers
  function makeStars(n, rMin, rMax, speed) {
    return Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(),
      r: rMin + Math.random() * (rMax - rMin),
      tw: Math.random() * Math.PI * 2,
      ts: 0.01 + Math.random() * 0.03,
      speed: speed * (0.5 + Math.random())
    }));
  }
  const layers = [makeStars(110, 0.4, 1.0, 0.00006), makeStars(60, 0.8, 1.6, 0.00012), makeStars(28, 1.2, 2.4, 0.0002)];

  // Shooting stars
  let meteors = [];
  let nextMeteor = 2500;

  function spawnMeteor() {
    const x = Math.random() * W * 0.8 + W * 0.1;
    meteors.push({ x, y: -20, vx: -(4 + Math.random() * 4), vy: 3 + Math.random() * 2.5, life: 1 });
  }

  let last = performance.now();
  function draw(now) {
    const dt = Math.min(now - last, 50); last = now;

    // Deep space base
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#07070f'); bg.addColorStop(0.55, '#0c0c18'); bg.addColorStop(1, '#0a0a12');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Nebulae
    for (const n of nebulae) {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -0.2) n.x = 1.2; if (n.x > 1.2) n.x = -0.2;
      if (n.y < -0.2) n.y = 1.2; if (n.y > 1.2) n.y = -0.2;
      const px = n.x * W, py = n.y * H, pr = n.r * Math.max(W, H);
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `hsla(${n.hue}, 75%, 55%, ${n.a})`);
      g.addColorStop(0.6, `hsla(${n.hue}, 70%, 40%, ${n.a * 0.45})`);
      g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }

    // Stars
    for (const layer of layers) {
      for (const s of layer) {
        s.tw += s.ts * dt / 16.7;
        s.y += s.speed * dt / 16.7;
        if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
        const alpha = 0.35 + Math.abs(Math.sin(s.tw)) * 0.65;
        ctx.fillStyle = `rgba(235, 240, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Meteors
    nextMeteor -= dt;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 3500 + Math.random() * 5500; }
    meteors = meteors.filter(m => m.life > 0);
    for (const m of meteors) {
      m.x += m.vx * dt / 16.7; m.y += m.vy * dt / 16.7; m.life -= 0.012 * dt / 16.7;
      const tail = 90;
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail / 8, m.y - m.vy * tail / 8);
      grad.addColorStop(0, `rgba(255, 255, 255, ${Math.max(m.life, 0)})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail / 8, m.y - m.vy * tail / 8);
      ctx.stroke();
    }

    if (!reduced) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
