// Zenith '26 — Diwali Festive Animations & Interactive Fireworks Engine

(function () {
  let canvas, ctx;
  let width, height;
  let particles = [];
  let sparks = [];
  let lanterns = [];
  let isRunning = true;
  let lastAutoLaunch = 0;

  // Festive Diwali color palette for fireworks and sparks
  const diwaliColors = [
    '#fbbf24', // Sun Gold
    '#f59e0b', // Amber Gold
    '#f97316', // Marigold Orange
    '#fb7185', // Festive Rose
    '#e11d48', // Ruby Vermilion
    '#38bdf8', // Electric Sky
    '#a855f7', // Mystic Purple
    '#34d399', // Emerald Glow
    '#fef08a', // Bright Yellow
  ];

  function init() {
    canvas = document.getElementById('diwali-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'diwali-canvas';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1'; // Behind modals and cards, above background
      canvas.style.opacity = '0.9';
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Initialize floating sky embers / floating lanterns
    createAmbientParticles();

    // Click on document to burst festive firework
    window.addEventListener('pointerdown', (e) => {
      // Don't trigger on form input fields to avoid distraction
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;
      createFirework(e.clientX, e.clientY, 35);
    });

    // Setup motion toggle button if present
    const toggleBtn = document.getElementById('toggle-diwali-effects');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        isRunning = !isRunning;
        toggleBtn.innerHTML = isRunning ? '🎆 Sparklers: ON' : '🎆 Sparklers: OFF';
        toggleBtn.classList.toggle('opacity-60', !isRunning);
        if (isRunning) requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, width, height);
      });
    }

    // Launch celebratory opening fireworks
    setTimeout(() => {
      createFirework(width * 0.25, height * 0.35, 45);
      createFirework(width * 0.75, height * 0.28, 45);
    }, 600);

    requestAnimationFrame(loop);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createAmbientParticles() {
    lanterns = [];
    const count = Math.min(25, Math.floor(width / 50));
    for (let i = 0; i < count; i++) {
      lanterns.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 1.2,
        color: Math.random() > 0.4 ? '#f59e0b' : '#fbbf24',
        alpha: Math.random() * 0.6 + 0.3,
        speedY: -(Math.random() * 0.4 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        pulseSpeed: Math.random() * 0.04 + 0.02,
        pulse: Math.random() * Math.PI,
      });
    }
  }

  function createFirework(x, y, particleCount = 40) {
    const baseHue = diwaliColors[Math.floor(Math.random() * diwaliColors.length)];
    const secondHue = diwaliColors[Math.floor(Math.random() * diwaliColors.length)];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 4.5 + 1.5;
      sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 0.06,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.012,
        color: Math.random() > 0.3 ? baseHue : secondHue,
        size: Math.random() * 2.5 + 1.5,
        sparkle: Math.random() > 0.4,
      });
    }
  }

  function loop(timestamp) {
    if (!isRunning) return;

    ctx.clearRect(0, 0, width, height);

    // Periodic automatic festive burst in the upper viewport (every 5-7 seconds)
    if (timestamp - lastAutoLaunch > 5500) {
      lastAutoLaunch = timestamp;
      const targetX = width * (0.2 + Math.random() * 0.6);
      const targetY = height * (0.15 + Math.random() * 0.3);
      createFirework(targetX, targetY, 35);
    }

    // Update and draw floating lantern embers
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i];
      l.y += l.speedY;
      l.x += l.speedX + Math.sin(l.pulse) * 0.2;
      l.pulse += l.pulseSpeed;

      // Wrap around screen
      if (l.y < -10) {
        l.y = height + 10;
        l.x = Math.random() * width;
      }

      const currentAlpha = l.alpha * (0.7 + Math.sin(l.pulse) * 0.3);

      ctx.save();
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.globalAlpha = Math.max(0, currentAlpha);
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#f59e0b';
      ctx.fill();
      ctx.restore();
    }

    // Update and draw active firework sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += s.gravity;
      s.vx *= 0.98;
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (s.sparkle ? (Math.random() * 0.8 + 0.6) : 1), 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(loop);
  }

  // Self-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
