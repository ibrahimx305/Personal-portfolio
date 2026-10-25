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

/* ---------- Floating theme toggle: dark / light ---------- */
const themeToggleBtn = document.getElementById('themeToggle');
function currentTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}
function paintThemeToggle() {
  if (themeToggleBtn) themeToggleBtn.textContent = currentTheme() === 'dark' ? '☀️' : '🌙';
}
paintThemeToggle();
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ik-theme', next); } catch (e) {}
    paintThemeToggle();
    if (window.__setBgTheme) window.__setBgTheme(next);
  });
}

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 3D tilt cards + hero photo ---------- */
(() => {
  if (REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function addTilt(el, maxDeg) {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotateY(${(px * maxDeg).toFixed(2)}deg) rotateX(${(-py * maxDeg).toFixed(2)}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
  document.querySelectorAll('.project-card, .skill-card, .stat, .contact-card')
    .forEach(el => addTilt(el, 12));
  const photo = document.querySelector('.hero-photo');
  if (photo) addTilt(photo, 8);
})();

/* ---------- 3D universe background (Three.js WebGL) with 2D fallback ---------- */
(() => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  function webglSupported() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (window.THREE && webglSupported()) {
    try { init3D(canvas); return; } catch (e) { /* fall through to 2D */ }
  }
  init2D(canvas);

  function nebulaTexture(r, g, b) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.22)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = grad; g2.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  function init3D(cv) {
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x07070f, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070f, 0.0038);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 62);

    // Starfield — 3D points spread through a deep volume
    const starCount = 1700;
    const pos = new Float32Array(starCount * 3);
    const col = new Float32Array(starCount * 3);
    const tints = [[1, 1, 1], [0.75, 0.82, 1], [0.85, 0.7, 1], [1, 0.85, 0.8]];
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 260;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 160;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
      const t = tints[Math.floor(Math.random() * tints.length)];
      const b = 0.45 + Math.random() * 0.55;
      col[i * 3] = t[0] * b; col[i * 3 + 1] = t[1] * b; col[i * 3 + 2] = t[2] * b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: 0.75, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true
    }));
    scene.add(stars);

    // Nebula sprites drifting in 3D space
    const nebColors = [[139, 92, 246], [59, 130, 246], [236, 72, 153], [230, 57, 70], [99, 102, 241]];
    const nebulae = [];
    for (let i = 0; i < 9; i++) {
      const [r, g, b] = nebColors[i % nebColors.length];
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture(r, g, b), transparent: true, opacity: 0.32,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      const spr = new THREE.Sprite(mat);
      const s = 90 + Math.random() * 110;
      spr.scale.set(s, s, 1);
      spr.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 120, -40 - Math.random() * 90);
      spr.userData.vx = (Math.random() - 0.5) * 0.008;
      spr.userData.vy = (Math.random() - 0.5) * 0.005;
      nebulae.push(spr); scene.add(spr);
    }

    // 3D planet — wireframe sphere + ring + orbiting moon
    const planet = new THREE.Group();
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(13, 36, 36),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.5 })
    );
    planet.add(globe);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(12.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x0d0d1d, transparent: true, opacity: 0.88 })
    );
    planet.add(core);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(19, 0.22, 8, 120),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = Math.PI / 2.4;
    planet.add(ring);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true })
    );
    planet.add(moon);
    planet.position.set(30, 5, -12);
    scene.add(planet);

    // Theme integration — restyle the 3D scene for dark / light
    function applyBgTheme(mode) {
      if (mode === 'light') {
        renderer.setClearColor(0xe9ebf5, 1);
        scene.fog.color.set(0xe9ebf5);
        stars.material.color.set(0x39406e);
        globe.material.color.set(0x7c3aed);
        ring.material.color.set(0x2563eb);
        nebulae.forEach(n => { n.material.opacity = 0.15; n.material.blending = THREE.NormalBlending; n.material.needsUpdate = true; });
      } else {
        renderer.setClearColor(0x07070f, 1);
        scene.fog.color.set(0x07070f);
        stars.material.color.set(0xffffff);
        globe.material.color.set(0x8b5cf6);
        ring.material.color.set(0x60a5fa);
        nebulae.forEach(n => { n.material.opacity = 0.32; n.material.blending = THREE.AdditiveBlending; n.material.needsUpdate = true; });
      }
    }
    window.__setBgTheme = applyBgTheme;
    applyBgTheme(currentTheme());

    // Mouse parallax
    let mx = 0, my = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', e => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const clock = new THREE.Clock();
    function animate() {
      const t = clock.getElapsedTime();
      stars.rotation.y = t * 0.006;
      stars.rotation.x = t * 0.002;
      globe.rotation.y = t * 0.12;
      globe.rotation.x = t * 0.05;
      ring.rotation.z = t * 0.15;
      const a = t * 0.35;
      moon.position.set(Math.cos(a) * 21, Math.sin(a) * 6, Math.sin(a) * 21);
      moon.rotation.y = t * 0.5;
      planet.position.y = 5 + Math.sin(t * 0.4) * 1.6;
      for (const n of nebulae) {
        n.position.x += n.userData.vx; n.position.y += n.userData.vy;
        if (Math.abs(n.position.x) > 130) n.userData.vx *= -1;
        if (Math.abs(n.position.y) > 85) n.userData.vy *= -1;
      }
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      camera.position.x = mx * 7;
      camera.position.y = -my * 4.5;
      camera.lookAt(8, 0, 0);
      renderer.render(scene, camera);
      if (!REDUCED) requestAnimationFrame(animate);
    }
    animate();
  }

  /* ----- 2D fallback: nebula + twinkling stars + shooting stars ----- */
  function init2D(cv) {
    const ctx = cv.getContext('2d');
    let W, H;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let mode2 = currentTheme();
    window.__setBgTheme = m => { mode2 = m; };

    const nebulae = [
      { x: 0.2, y: 0.25, r: 0.45, hue: 275, a: 0.16, vx: 0.00012, vy: 0.00008 },
      { x: 0.8, y: 0.15, r: 0.38, hue: 315, a: 0.13, vx: -0.00010, vy: 0.00006 },
      { x: 0.7, y: 0.75, r: 0.50, hue: 220, a: 0.14, vx: 0.00008, vy: -0.00010 },
      { x: 0.15, y: 0.85, r: 0.40, hue: 348, a: 0.10, vx: -0.00006, vy: -0.00012 }
    ];
    function makeStars(n, rMin, rMax, speed) {
      return Array.from({ length: n }, () => ({
        x: Math.random(), y: Math.random(),
        r: rMin + Math.random() * (rMax - rMin),
        tw: Math.random() * Math.PI * 2, ts: 0.01 + Math.random() * 0.03,
        speed: speed * (0.5 + Math.random())
      }));
    }
    const layers = [makeStars(110, 0.4, 1.0, 0.00006), makeStars(60, 0.8, 1.6, 0.00012), makeStars(28, 1.2, 2.4, 0.0002)];
    let meteors = [], nextMeteor = 2500, last = performance.now();

    function draw(now) {
      const dt = Math.min(now - last, 50); last = now;
      const light = mode2 === 'light';
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (light) { bg.addColorStop(0, '#eef0f8'); bg.addColorStop(0.55, '#e6eaf6'); bg.addColorStop(1, '#dde3f2'); }
      else { bg.addColorStop(0, '#07070f'); bg.addColorStop(0.55, '#0c0c18'); bg.addColorStop(1, '#0a0a12'); }
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const n of nebulae) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < -0.2) n.x = 1.2; if (n.x > 1.2) n.x = -0.2;
        if (n.y < -0.2) n.y = 1.2; if (n.y > 1.2) n.y = -0.2;
        const px = n.x * W, py = n.y * H, pr = n.r * Math.max(W, H);
        const na = n.a * (light ? 0.55 : 1);
        const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, `hsla(${n.hue}, 75%, 55%, ${na})`);
        g.addColorStop(0.6, `hsla(${n.hue}, 70%, 40%, ${na * 0.45})`);
        g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      }
      for (const layer of layers) {
        for (const s of layer) {
          s.tw += s.ts * dt / 16.7;
          s.y += s.speed * dt / 16.7;
          if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
          ctx.fillStyle = light
            ? `rgba(45, 48, 84, ${0.35 + Math.abs(Math.sin(s.tw)) * 0.65})`
            : `rgba(235, 240, 255, ${0.35 + Math.abs(Math.sin(s.tw)) * 0.65})`;
          ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        meteors.push({ x: Math.random() * W * 0.8 + W * 0.1, y: -20, vx: -(4 + Math.random() * 4), vy: 3 + Math.random() * 2.5, life: 1 });
        nextMeteor = 3500 + Math.random() * 5500;
      }
      meteors = meteors.filter(m => m.life > 0);
      for (const m of meteors) {
        m.x += m.vx * dt / 16.7; m.y += m.vy * dt / 16.7; m.life -= 0.012 * dt / 16.7;
        const mc = light ? '70,70,140' : '255,255,255';
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 11, m.y - m.vy * 11);
        grad.addColorStop(0, `rgba(${mc},${Math.max(m.life, 0)})`);
        grad.addColorStop(1, `rgba(${mc},0)`);
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 11, m.y - m.vy * 11); ctx.stroke();
      }
      if (!REDUCED) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
})();
