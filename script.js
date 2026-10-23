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

/* ---------- Animated background: drifting glow orbs + particles ---------- */
(() => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const orbs = Array.from({ length: 6 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: 140 + Math.random() * 220,
    vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
    hue: [348, 0, 280, 20, 350, 265][Math.floor(Math.random() * 6)],
    a: 0.10 + Math.random() * 0.08
  }));
  const dots = Array.from({ length: 70 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    vy: -(Math.random() * 0.25 + 0.05), vx: (Math.random() - 0.5) * 0.12,
    tw: Math.random() * Math.PI * 2, ts: 0.008 + Math.random() * 0.02
  }));

  function draw() {
    ctx.fillStyle = '#0c0c11';
    ctx.fillRect(0, 0, W, H);
    for (const o of orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, `hsla(${o.hue}, 80%, 55%, ${o.a})`);
      g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
    }
    for (const p of dots) {
      p.tw += p.ts;
      const alpha = 0.25 + Math.abs(Math.sin(p.tw)) * 0.45;
      ctx.fillStyle = `rgba(255, 120, 120, ${alpha * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      if (p.x < -4) p.x = W + 4; if (p.x > W + 4) p.x = -4;
    }
    if (!reduced) requestAnimationFrame(draw);
  }
  draw();
})();
