/* =========================================================================
   MOONLIGHT TO STARRY NIGHT — script.js
   Stage 1: background canvas system, nav, scroll progress, reveal-on-view
   ========================================================================= */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------------------
     SCROLL PROGRESS (0 -> 1 across the whole document)
     Drives color interpolation + star/particle density.
     ----------------------------------------------------------------------- */

    let scrollProgress = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const cometTrail = [];  

  function getScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const max = doc.scrollHeight - doc.clientHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
  }

  /* -----------------------------------------------------------------------
     COLOR INTERPOLATION
     Phase 1 (0 - 0.45): pure tech black
     Phase 2 (0.45 - 0.7): transition blend
     Phase 3 (0.7 - 1.0): deep space / starry night
     ----------------------------------------------------------------------- */

  const palette = {
    p1: { bg: [5,5,5],     surface: [16,16,16],  text: [245,245,245], textSec: [161,161,170], border: [255,255,255], accent: [192,192,192], glow: [232,234,237] },
    mid:{ bg: [19,30,46],  surface: [26,40,58],  text: [245,245,245], textSec: [178,186,201], border: [255,255,255], accent: [200,205,215], glow: [232,234,237] },
    p3: { bg: [8,18,41],   surface: [19,41,75],  text: [245,245,245], textSec: [184,196,222], border: [255,255,255], accent: [244,197,66],  glow: [255,209,102] }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t))
    ];
  }

  function rgb(c) { return `rgb(${c[0]}, ${c[1]}, ${c[2]})`; }
  function rgba(c, a) { return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; }

  function getPhaseColors(p) {
    // p: 0 -> 1 overall scroll progress
    if (p <= 0.45) {
      const t = p / 0.45;
      return {
        t,
        bg: lerpColor(palette.p1.bg, palette.mid.bg, t * 0.3),
        surface: lerpColor(palette.p1.surface, palette.mid.surface, t * 0.3),
        text: palette.p1.text,
        textSec: lerpColor(palette.p1.textSec, palette.mid.textSec, t * 0.3),
        border: [255,255,255],
        borderAlpha: 0.08,
        accent: lerpColor(palette.p1.accent, palette.mid.accent, t * 0.3),
        glow: palette.p1.glow
       
      };
    } else if (p <= 0.7) {
      const t = (p - 0.45) / 0.25;
      return {
        t: 0.3 + t * 0.4,
        bg: lerpColor(palette.p1.bg, palette.mid.bg, 0.3 + t * 0.7),
        surface: lerpColor(palette.p1.surface, palette.mid.surface, 0.3 + t * 0.7),
        text: palette.p1.text,
        textSec: lerpColor(palette.p1.textSec, palette.mid.textSec, 0.3 + t * 0.7),
        borderAlpha: 0.08,
        accent: lerpColor(palette.mid.accent, palette.p3.accent, t * 0.5),
        glow: lerpColor(palette.p1.glow, palette.p3.glow, t)
      };
    } else {
      const t = (p - 0.7) / 0.3;
      return {
        t: 0.7 + t * 0.3,
        bg: lerpColor(palette.mid.bg, palette.p3.bg, t),
        surface: lerpColor(palette.mid.surface, palette.p3.surface, t),
        text: palette.p1.text,
        textSec: lerpColor(palette.mid.textSec, palette.p3.textSec, t),
        borderAlpha: 0.1,
        accent: lerpColor(palette.mid.accent, palette.p3.accent, 0.5 + t * 0.5),
        glow: lerpColor(palette.p1.glow, palette.p3.glow, Math.min(1, 0.4 + t))
      };
    }
  }

  function applyColors(p) {
  const c = getPhaseColors(p);
  const root = document.documentElement.style;

  root.setProperty('--bg-color', rgb(c.bg));
  root.setProperty('--surface-color', rgb(c.surface));
  root.setProperty('--text-color', rgb(c.text));
  root.setProperty('--text-secondary', rgb(c.textSec));

  root.setProperty(
    '--border-color',
    `rgba(255,255,255,${c.borderAlpha})`
  );

  root.setProperty('--accent-color', rgb(c.accent));
  root.setProperty('--glow-color', rgb(c.glow));

  return c;
}

  /* -----------------------------------------------------------------------
     CANVAS BACKGROUND: stars, floating particles, shooting stars
     ----------------------------------------------------------------------- */

const canvas = document.getElementById('bg-canvas');

if (!canvas) {
  console.error('Canvas not found');
  return;
}

const ctx = canvas.getContext('2d');

  let width, height, dpr;
  let stars = [];
  let particles = [];
  let shootingStars = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
  }

  function initStars() {
    const count = Math.round((width * height) / 2200);
stars = Array.from({ length: count }, () => {
  const bright = Math.random() < 0.08;

  return {
    x: Math.random() * width,
    y: Math.random() * height,

    r: bright
      ? Math.random() * 2 + 1.5
      : Math.random() * 1.2 + 0.4,

    bright,

    baseAlpha: bright
      ? Math.random() * 0.3 + 0.8
      : Math.random() * 0.4 + 0.4,

    twinkleSpeed: Math.random() * 0.015 + 0.004,
    twinklePhase: Math.random() * Math.PI * 2
  };
});

    const particleCount = Math.round((width * height) / 60000);
    particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.12 + 0.04),
      speedX: (Math.random() - 0.5) * 0.05,
      alpha: Math.random() * 0.3 + 0.1
    }));
  }

  function maybeSpawnShootingStar(intensity) {
    if (Math.random() < 0.008 * intensity) {
      const startX = Math.random() * width * 0.6 + width * 0.2;
      shootingStars.push({
        x: startX,
        y: Math.random() * height * 0.3,
        len: Math.random() * 120 + 100,
        speed: Math.random() * 9 + 7,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
  }

  let frame = 0;

  function drawFrame() {
    frame++;
    ctx.clearRect(0, 0, width, height);

    const c = getPhaseColors(scrollProgress);
    const starVisibility = 0.8 + c.t * 0.2; // stars become more vivid deeper into the scroll
    const particleVisibility = 0.25 + c.t * 0.75;
    const accentRGB = c.glow;

    // Stars
    for (const s of stars) {
      const twinkle = Math.sin(frame * s.twinkleSpeed + s.twinklePhase) * 0.35 + 0.65;
      const alpha = s.baseAlpha * twinkle * starVisibility;
if (s.bright) {
  ctx.shadowBlur = 15;
  ctx.shadowColor =
    `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},0.8)`;
}

ctx.beginPath();
ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);

ctx.fillStyle =
`rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},${alpha})`;

ctx.fill();

ctx.shadowBlur = 0;
    }
for (let i = 0; i < stars.length; i++) {

  const a = stars[i];

  if (!a.bright) continue;

  for (let j = i + 1; j < stars.length; j++) {

    const b = stars[j];

    if (!b.bright) continue;

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 120) {

      ctx.beginPath();

      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      ctx.strokeStyle =
        `rgba(255,255,255,${0.04 * (1 - dist / 120)})`;

      ctx.lineWidth = 0.5;

      ctx.stroke();
    }
  }
}    

    // Floating particles (slow drift, more visible later in scroll)
    if (!reduceMotion) {
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRGB[0]}, ${accentRGB[1]}, ${accentRGB[2]}, ${p.alpha * particleVisibility})`;
        ctx.fill();
      }
    }

    // Shooting stars — only in deeper phases, sparse
    if (!reduceMotion && c.t > 0.55) {
      maybeSpawnShootingStar(c.t);
      shootingStars.forEach((s) => {
        const dx = Math.cos(s.angle) * s.speed;
        const dy = Math.sin(s.angle) * s.speed;
        s.x += dx;
        s.y += dy;
        s.life -= 0.012;

        const tailX = s.x - Math.cos(s.angle) * s.len;
        const tailY = s.y - Math.sin(s.angle) * s.len;
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255,255,255,${Math.max(0, s.life)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      });
      shootingStars = shootingStars.filter((s) => s.life > 0 && s.y < height + 100 && s.x < width + 100);
    }
/* ---------------------------------------
   CURSOR COMET
--------------------------------------- */

cometTrail.forEach((p) => {

  p.life -= 0.03;

  ctx.beginPath();

  ctx.arc(
    p.x,
    p.y,
    2,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    `rgba(255,255,255,${Math.max(0,p.life)})`;

  ctx.fill();
});

for (let i = 1; i < cometTrail.length; i++) {

  const a = cometTrail[i - 1];
  const b = cometTrail[i];

  ctx.beginPath();

  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);

  ctx.strokeStyle =
    `rgba(255,255,255,${a.life * 0.25})`;

  ctx.lineWidth = 1;

  ctx.stroke();
}

requestAnimationFrame(drawFrame);

  }

  /* -----------------------------------------------------------------------
     SCROLL HANDLER (rAF-throttled)
     ----------------------------------------------------------------------- */

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        scrollProgress = getScrollProgress();
        applyColors(scrollProgress);
        ticking = false;
      });
      ticking = true;
    }

    const header = document.getElementById('site-header');
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }

  /* -----------------------------------------------------------------------
     NAV: mobile toggle + smooth close-on-click
     ----------------------------------------------------------------------- */

  function initNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -----------------------------------------------------------------------
     SCROLL INDICATOR: click to advance to About
     ----------------------------------------------------------------------- */

  function initScrollIndicator() {
    const btn = document.getElementById('scroll-indicator');
    btn.addEventListener('click', () => {
      document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* -----------------------------------------------------------------------
     REVEAL ON VIEW (IntersectionObserver)
     ----------------------------------------------------------------------- */

  function initReveal() {
    const targets = document.querySelectorAll(
      '.about-card, .focus-card, .project-card, .skill-group, .research-paper-card, .research-side, .cert-badge, .achievement-highlight, .philosophy-pillar, .contact-link, .contact-form'
    );
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => observer.observe(t));

    // About section editorial reveal (heading lines + paragraphs) fires once,
    // the moment the section itself enters view — see initAboutSection().
    const aboutRevealItems = document.querySelectorAll('.about-reveal');
    const aboutRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          aboutRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    aboutRevealItems.forEach((t) => aboutRevealObserver.observe(t));

    // Trigger cert progress ring animation when it enters view
    const progressRing = document.querySelector('.cert-progress-ring svg circle:last-child');
    if (progressRing) {
      const ringObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            progressRing.style.animation = 'none';
            void progressRing.offsetWidth; // reflow
            progressRing.style.animation = '';
            ringObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      ringObserver.observe(progressRing.closest('.cert-badge-progress') || progressRing);
    }
  }

  /* -----------------------------------------------------------------------
     OBSERVATORY — TELESCOPE EXPERIENCE
     6 disciplines, side arrows, drag, constellation-dot nav
     ----------------------------------------------------------------------- */

  const DISCIPLINES = [
    {
      id: 0,
      tag: 'Discipline 01',
      name: 'Cybersecurity',
      glowColor: 'rgba(100,160,255,0.7)',
      focus: ['SOC Operations', 'Threat Detection', 'Incident Response', 'Threat Hunting', 'Log Analysis', 'Security Monitoring'],
      tools: ['Splunk', 'Suricata', 'Snort', 'Wireshark', 'Zeek']
    },
    {
      id: 1,
      tag: 'Discipline 02',
      name: 'Networking',
      glowColor: 'rgba(160,190,220,0.6)',
      focus: ['Routing', 'Switching', 'Network Design', 'Troubleshooting', 'Packet Analysis'],
      tools: ['Cisco Packet Tracer', 'Wireshark', 'Scapy']
    },
    {
      id: 2,
      tag: 'Discipline 03',
      name: 'Cloud & Infrastructure',
      glowColor: 'rgba(60,100,200,0.6)',
      focus: ['AWS Fundamentals', 'Security Hardening', 'Cloud Architecture', 'Infrastructure Security'],
      tools: ['AWS', 'Linux', 'Docker']
    },
    {
      id: 3,
      tag: 'Discipline 04',
      name: 'Development & Automation',
      glowColor: 'rgba(180,200,235,0.55)',
      focus: ['Python Automation', 'Security Tooling', 'APIs', 'Full Stack Development'],
      tools: ['Python', 'FastAPI', 'Streamlit', 'JavaScript', 'Git']
    },
    {
      id: 4,
      tag: 'Discipline 05',
      name: 'Research & Publications',
      glowColor: 'rgba(244,197,66,0.55)',
      isResearch: true,
      focus: ['Cybersecurity Research', 'Emerging Technologies', 'Security Analysis', 'Academic Writing'],
      tools: ['ICDCIT 2026', 'Quantum Game Theory', 'Cryptography'],
      research: {
        title: 'Cryptographic Applications in Quantum Game Theory',
        conference: 'ICDCIT 2026 — Student Research Symposium',
        description: 'Explores the intersection of cryptography, game theory, and emerging computational models — examining cryptographic mechanisms in quantum strategic environments.',
        award: '🏆  2nd Place, Student Research Symposium'
      }
    },
    {
      id: 5,
      tag: 'Discipline 06',
      name: 'Photography',
      glowColor: 'rgba(244,197,66,0.65)',
      isPhotography: true,
      focus: ['Astrophotography', 'Street Photography', 'Architecture', 'Visual Storytelling'],
      tools: ['Composition', 'Long Exposure', 'Pattern Recognition', 'Light Reading']
    }
  ];

  let currentDisc = 0;
  let dragStartX = 0;
  let isDragging = false;
  let dragMoved = false;

  function renderDiscPanel(disc) {
    const panel = document.getElementById('disc-panel');
    if (!panel) return;

    // stagger delays for focus tags
    const focusTags = disc.focus.map((f, i) =>
      `<li style="animation-delay:${0.05 + i * 0.06}s">${f}</li>`
    ).join('');

    const toolTags = disc.tools.map((t, i) =>
      `<li style="animation-delay:${0.12 + i * 0.06}s">${t}</li>`
    ).join('');

    const researchBlock = disc.isResearch ? `
      <div class="disc-research-card">
        <h4>${disc.research.title}</h4>
        <p>${disc.research.description}</p>
        <span class="badge">${disc.research.conference}</span>
        <br><span class="badge" style="color:var(--p3-starlight)">${disc.research.award}</span>
        <br><br>
        <a href="#research" class="link-arrow" style="font-size:0.84rem">View Research →</a>
      </div>
    ` : '';

    panel.innerHTML = `
      <div class="disc-panel-inner">
        <p class="disc-panel-tag">${disc.tag}</p>
        <h3 class="disc-panel-name">${disc.name}</h3>
        ${researchBlock}
        <p class="disc-focus-label">Focus Areas</p>
        <ul class="disc-focus-list">${focusTags}</ul>
        <p class="disc-tools-label">${disc.isResearch ? 'Keywords' : 'Tools'}</p>
        <ul class="disc-tools-list">${toolTags}</ul>
      </div>
    `;
  }

  function activateDisc(index, direction) {
    const prev = currentDisc;
    currentDisc = ((index % DISCIPLINES.length) + DISCIPLINES.length) % DISCIPLINES.length;

    const disc = DISCIPLINES[currentDisc];

    // swap SVG star layers
    document.querySelectorAll('.disc-star').forEach((el, i) => {
      el.classList.toggle('active', i === currentDisc);
    });

    // update lens outer glow
    const lens = document.getElementById('telescope-lens');
    if (lens) lens.style.setProperty('--lens-glow', disc.glowColor);

    // warm mode for photography
    const obs = document.querySelector('.observatory');
    if (obs) obs.classList.toggle('warm-mode', !!disc.isPhotography);

    // update detail panel
    renderDiscPanel(disc);

    // update dot nav + counter + name
    document.querySelectorAll('.tele-dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentDisc);
    });
    const counter = document.getElementById('tele-counter');
    if (counter) counter.textContent = `${String(currentDisc + 1).padStart(2,'0')} / ${String(DISCIPLINES.length).padStart(2,'0')}`;
    const nameEl = document.getElementById('tele-name');
    if (nameEl) nameEl.textContent = disc.name;
  }

  function initObservatory() {
    const lens   = document.getElementById('telescope-lens');
    const prev   = document.getElementById('telescope-prev');
    const next   = document.getElementById('telescope-next');
    const dots   = document.getElementById('telescope-dots');
    const hint   = document.getElementById('lens-drag-hint');

    if (!lens || !dots) return;

    // Build constellation dots
    DISCIPLINES.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'tele-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', DISCIPLINES[i].name);
      dot.addEventListener('click', () => activateDisc(i));
      dots.appendChild(dot);
    });

    // Activate first
    activateDisc(0);

    // Arrow nav
    if (prev) prev.addEventListener('click', () => activateDisc(currentDisc - 1));
    if (next) next.addEventListener('click', () => activateDisc(currentDisc + 1));

    // Keyboard nav
    document.addEventListener('keydown', (e) => {
      const obs = document.querySelector('.observatory');
      if (!obs) return;
      const rect = obs.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') activateDisc(currentDisc + 1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   activateDisc(currentDisc - 1);
    });

    // Drag on lens (mouse)
    lens.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragMoved  = false;
      dragStartX = e.clientX;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - dragStartX) > 5) dragMoved = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (!dragMoved) return;
      const delta = e.clientX - dragStartX;
      if (Math.abs(delta) > 40) {
        activateDisc(currentDisc + (delta < 0 ? 1 : -1));
      }
    });

    // Drag on lens (touch)
    lens.addEventListener('touchstart', (e) => {
      dragStartX = e.touches[0].clientX;
      dragMoved  = false;
    }, { passive: true });

    lens.addEventListener('touchmove', (e) => {
      if (Math.abs(e.touches[0].clientX - dragStartX) > 5) dragMoved = true;
    }, { passive: true });

    lens.addEventListener('touchend', (e) => {
      if (!dragMoved) return;
      const delta = e.changedTouches[0].clientX - dragStartX;
      if (Math.abs(delta) > 40) {
        activateDisc(currentDisc + (delta < 0 ? 1 : -1));
      }
    });

    // hide drag hint after first interaction
    const hideHint = () => {
      if (hint) hint.classList.add('hidden');
      lens.removeEventListener('mousedown', hideHint);
      lens.removeEventListener('touchstart', hideHint);
    };
    lens.addEventListener('mousedown', hideHint);
    lens.addEventListener('touchstart', hideHint);
  }

  /* -----------------------------------------------------------------------
     INIT
     ----------------------------------------------------------------------- */

  function init() {
    resize();
    applyColors(0);
    requestAnimationFrame(drawFrame);

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cometTrail.push({ x: mouseX, y: mouseY, life: 1 });
      if (cometTrail.length > 25) cometTrail.shift();
    });

    initNav();
    initScrollIndicator();
    initReveal();
    initProjectModal();
    initObservatory();
    initGallery();
    initLightbox();
    initConstellationCanvas();
    initContactForm();
    initFooterCanvas();
  }

  document.addEventListener('DOMContentLoaded', init);

  /* -----------------------------------------------------------------------
     GALLERY — filter + staggered reveal
     ----------------------------------------------------------------------- */

  function initGallery() {
    const filters = document.querySelectorAll('.gallery-filter');
    const items   = document.querySelectorAll('.gallery-item');
    if (!filters.length) return;

    // Stagger items in on first load
    items.forEach((item, i) => {
      item.style.animationDelay = (i * 0.07) + 's';
      item.classList.add('gallery-item-ready');
    });

    filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        filters.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const cat = btn.dataset.filter;
        items.forEach((item) => {
          const match = cat === 'all' || item.dataset.category === cat;
          item.classList.toggle('hidden', !match);
        });
      });
    });

    // Click opens lightbox
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index, 10);
        openLightbox(idx);
      });
    });
  }

  /* -----------------------------------------------------------------------
     LIGHTBOX
     ----------------------------------------------------------------------- */

  const galleryData = [
    { caption: 'Deep Sky — Astrophotography',      cat: 'Astrophotography' },
    { caption: 'Urban Frame — Street',              cat: 'Street'           },
    { caption: 'Geometry in Light — Architecture', cat: 'Architecture'     },
    { caption: 'Milky Way Arc — Astrophotography', cat: 'Astrophotography' },
    { caption: 'Forest Light — Nature',            cat: 'Nature'           },
    { caption: 'Candid Moment — Street',           cat: 'Street'           },
    { caption: 'Angular Study — Architecture',     cat: 'Architecture'     },
    { caption: 'Horizon — Nature',                 cat: 'Nature'           },
    { caption: 'Star Cluster — Astrophotography',  cat: 'Astrophotography' },
  ];

  let lightboxIndex = 0;

  function openLightbox(idx) {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;
    lightboxIndex = idx;
    updateLightboxContent();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateLightboxContent() {
    const data    = galleryData[lightboxIndex] || {};
    const caption = document.getElementById('lightbox-caption');
    if (caption) {
      caption.textContent = data.caption || 'Photography';
    }
  }

  function initLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn  = document.getElementById('lightbox-prev');
    const nextBtn  = document.getElementById('lightbox-next');
    if (!overlay) return;

    closeBtn && closeBtn.addEventListener('click', closeLightbox);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox(); });

    prevBtn && prevBtn.addEventListener('click', () => {
      lightboxIndex = ((lightboxIndex - 1) + galleryData.length) % galleryData.length;
      updateLightboxContent();
    });

    nextBtn && nextBtn.addEventListener('click', () => {
      lightboxIndex = (lightboxIndex + 1) % galleryData.length;
      updateLightboxContent();
    });

    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft')  { lightboxIndex = ((lightboxIndex - 1) + galleryData.length) % galleryData.length; updateLightboxContent(); }
      if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % galleryData.length; updateLightboxContent(); }
    });
  }

  /* -----------------------------------------------------------------------
     ABOUT SECTION — scoped atmosphere + slow-orbiting swirl stars
     Everything here is local to #about. It never writes to the site-wide
     --bg-color variables set by applyColors(), so the rest of the page's
     background system is completely untouched.
     ----------------------------------------------------------------------- */



  /* -----------------------------------------------------------------------
     CONSTELLATION CANVAS
     Draws subtle lines between gallery items as they come into view.
     ----------------------------------------------------------------------- */

  function initConstellationCanvas() {
    const canvas = document.getElementById('constellation-canvas');
    const section = document.querySelector('.photography');
    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    let points = [];
    let animFrame;
    let visible = false;

    function resizeCanvas() {
      const rect = section.getBoundingClientRect();
      canvas.width  = section.offsetWidth;
      canvas.height = section.offsetHeight;
    }

    function collectPoints() {
      const sectionRect = section.getBoundingClientRect();
      const items = section.querySelectorAll('.gallery-item:not(.hidden)');
      points = [];
      items.forEach((item) => {
        const r = item.getBoundingClientRect();
        points.push({
          x: r.left - sectionRect.left + r.width  / 2,
          y: r.top  - sectionRect.top  + r.height / 2,
        });
      });
    }

    function drawConstellation(progress) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!points.length) return;

      const accentRGB = getPhaseColors(scrollProgress).glow;
      const maxDist = 320;

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx   = points[i].x - points[j].x;
          const dy   = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18 * progress;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Node dots at each gallery item center
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},${0.35 * progress})`;
        ctx.fill();
      });
    }

    // IntersectionObserver to trigger canvas when section visible
    let constellationProgress = 0;
    let targetProgress = 0;

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
        if (visible) {
          targetProgress = 1;
          resizeCanvas();
          collectPoints();
          if (!animFrame) animateConstellation();
        } else {
          targetProgress = 0;
        }
      });
    }, { threshold: 0.1 });

    sectionObserver.observe(section);

    function animateConstellation() {
      constellationProgress += (targetProgress - constellationProgress) * 0.04;
      drawConstellation(constellationProgress);

      if (visible || constellationProgress > 0.01) {
        animFrame = requestAnimationFrame(animateConstellation);
      } else {
        animFrame = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Redraw on filter change (gallery items reflow)
    document.querySelectorAll('.gallery-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTimeout(() => { resizeCanvas(); collectPoints(); }, 50);
      });
    });

    window.addEventListener('resize', () => { resizeCanvas(); collectPoints(); });
  }

  /* -----------------------------------------------------------------------
     CONTACT FORM — client-side validation + mailto fallback
     ----------------------------------------------------------------------- */

  function initContactForm() {
    const form   = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name    = form.querySelector('#cf-name').value.trim();
      const email   = form.querySelector('#cf-email').value.trim();
      const subject = form.querySelector('#cf-subject').value;
      const message = form.querySelector('#cf-message').value.trim();

      if (!name || !email || !message) {
        if (status) { status.textContent = 'Please fill in all required fields.'; status.style.color = '#ff6b6b'; }
        return;
      }

      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(email)) {
        if (status) { status.textContent = 'Please enter a valid email address.'; status.style.color = '#ff6b6b'; }
        return;
      }

      // Build mailto link as graceful fallback (no backend needed for GitHub Pages)
      const sub  = subject ? encodeURIComponent('[Portfolio] ' + subject) : encodeURIComponent('[Portfolio] Message from ' + name);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:rewa@example.com?subject=${sub}&body=${body}`;

      if (status) {
        status.style.color = 'var(--p3-gold)';
        status.textContent = 'Opening your email client…';
        setTimeout(() => { status.textContent = ''; }, 4000);
      }
    });
  }

  /* -----------------------------------------------------------------------
     FOOTER CANVAS — deep space starfield, gold-tinted
     ----------------------------------------------------------------------- */

  function initFooterCanvas() {
    const canvas = document.getElementById('footer-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h, stars = [];

    function resizeFooter() {
      const footer = canvas.closest('.site-footer-block');
      if (!footer) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = footer.offsetWidth;
      h = footer.offsetHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawnFooterStars();
    }

    function spawnFooterStars() {
      const count = Math.round((w * h) / 3500);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.55 + 0.2,
        twinkleSpeed: Math.random() * 0.012 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.22
      }));
    }

    let footerFrame = 0;
    let footerRunning = false;

    function drawFooter() {
      footerFrame++;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = Math.sin(footerFrame * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        const a = s.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? `rgba(244,197,66,${a})`
          : `rgba(220,225,240,${a})`;
        ctx.fill();
      }
      if (footerRunning) requestAnimationFrame(drawFooter);
    }

    // Only animate when footer in view
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !footerRunning) {
          footerRunning = true;
          resizeFooter();
          requestAnimationFrame(drawFooter);
        } else if (!entry.isIntersecting) {
          footerRunning = false;
        }
      });
    }, { threshold: 0.05 });

    const footer = document.querySelector('.site-footer-block');
    if (footer) footerObserver.observe(footer);
    window.addEventListener('resize', resizeFooter);
  }

  /* -----------------------------------------------------------------------
     PHILOSOPHY PILLARS — extend initReveal to cover them with stagger
     ----------------------------------------------------------------------- */

  // (Handled inside initReveal via .philosophy-pillar selector — no separate init needed)
  // CSS already has .philosophy-pillar { opacity:0; transform:translateY(16px); }
  // and .philosophy-pillar.in-view { opacity:1; transform:translateY(0); }
  // IntersectionObserver in initReveal covers any .philosophy-pillar elements.

  const architectureContent = {
    nettwin: {
      title: 'NetTwin Analyzer — Architecture',
      steps: [
        'Raw Cisco-style configuration files are ingested and parsed into a structured intermediate representation.',
        'NetworkX reconstructs the enterprise topology as a graph — devices as nodes, links as edges.',
        'Validation passes check VLAN consistency, ACL rules, and routing tables for misconfigurations.',
        'An Isolation Forest model flags anomalous device or traffic patterns as elevated risk.',
        'Results render through a Streamlit dashboard with Plotly visualizations of topology and risk hotspots.'
      ]
    },
    soc2: {
      title: 'SOC 2 Audit Assistant — Architecture',
      steps: [
        'Compliance queries and audit evidence are ingested and normalized with Pandas.',
        'Evidence is mapped against ISO 27001 and SOC 2 control requirements.',
        'A risk classification layer scores gaps and prioritizes remediation owners.',
        'Structured audit responses and reports are generated for reviewer sign-off.'
      ]
    },
    blindsight: {
      title: 'BlindSight — Architecture',
      steps: [
        'Incoming content (images, messages, links) is processed through OCR to extract text.',
        'Extracted text and URLs are checked against the VirusTotal API for known threat indicators.',
        'A threat scoring model combines OCR signals and URL intelligence into a single risk score.',
        'The FastAPI backend serves results to a React Native client with remediation guidance.'
      ]
    }
  };

  function initProjectModal() {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');

    function openModal(key) {
      const data = architectureContent[key];
      if (!data) return;
      titleEl.textContent = data.title;
      bodyEl.innerHTML = data.steps.map((step, i) =>
        `<div class="arch-step"><span class="arch-step-num">${String(i + 1).padStart(2, '0')}</span><span>${step}</span></div>`
      ).join('');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-modal]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(link.dataset.modal);
      });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

})();
/* =========================================================================
   SOCIAL CONSTELLATION
   First click activates.
   Second click opens the selected destination.
   ========================================================================= */

const constellation =
document.getElementById("social-constellation");

const constellationStars =
document.querySelectorAll(".constellation-star");

const constellationStatus =
document.getElementById("constellation-status");

let constellationActive = false;
let selectedStar = null;

if (constellation && constellationStars.length) {

  constellationStars.forEach((star) => {

    star.addEventListener("click", function (event) {

      /* First click activates the constellation */

      if (!constellationActive) {

        event.preventDefault();

        constellationActive = true;

        constellation.classList.add("active");

        selectedStar = star;

        star.classList.add("selected");

        constellationStatus.textContent =
          `Continue to ${star.dataset.platform} ↗`;

        return;
      }

      /* Clicking another star changes selection */

      if (selectedStar !== star) {

        event.preventDefault();

        if (selectedStar) {
          selectedStar.classList.remove("selected");
        }

        selectedStar = star;

        star.classList.add("selected");

        constellationStatus.textContent =
          `Continue to ${star.dataset.platform} ↗`;

        return;
      }

      /* Second click on the same star follows the link */

    });

  });

}