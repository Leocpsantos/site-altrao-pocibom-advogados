/* =========================================================
   ALTRÃO & POCIBOM — interações
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, n) => a + (b - a) * n;

  /* ---------- Split text (hero) ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent;
    const isGold = el.classList.contains('gold-text');
    if (isGold) el.classList.remove('gold-text'), el.classList.add('gold-text-split');
    el.textContent = '';
    const chars = [...text];
    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.transitionDelay = `${0.35 + i * 0.035 + (el.closest('.split-line') ? [...$$('.split-line')].indexOf(el.closest('.split-line')) * 0.18 : 0)}s`;
      if (isGold) {
        span.style.background = 'var(--gold-grad)';
        span.style.backgroundSize = `${chars.length * 100}% 100%`;
        span.style.backgroundPosition = `${(i / Math.max(chars.length - 1, 1)) * 100}% 0`;
        span.style.webkitBackgroundClip = 'text';
        span.style.backgroundClip = 'text';
        span.style.color = 'transparent';
      }
      el.appendChild(span);
    });
    el.setAttribute('aria-label', text);
  });

  /* ---------- Split words (section titles) ---------- */
  $$('.reveal-words').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'word';
            const inner = document.createElement('span');
            inner.textContent = p;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------- Preloader ---------- */
  const bar = $('.preloader__bar span');
  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(progress + Math.random() * 18, 90);
    if (bar) bar.style.width = progress + '%';
  }, 120);
  const BG = { sync: () => {} }; // preenchido pelo campo 3D de partículas
  let startTiltHook = () => {}; // preenchido pelo bloco do tilt do emblema
  const finishLoad = () => {
    clearInterval(tick);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('loaded');
      remeasure(); // a barra de rolagem pode surgir quando o preloader sai
      BG.sync();
      startTiltHook();
    }, reduceMotion ? 0 : 450);
  };
  if (document.readyState === 'complete') finishLoad();
  else window.addEventListener('load', finishLoad);
  setTimeout(finishLoad, 4000); // fallback

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  // stagger siblings
  const groups = new Map();
  $$('.reveal-up').forEach((el) => {
    const p = el.parentElement;
    if (!groups.has(p)) groups.set(p, 0);
    const idx = groups.get(p);
    el.style.setProperty('--d', `${Math.min(idx * 0.09, 0.5)}s`);
    groups.set(p, idx + 1);
  });
  $$('.reveal-up, .reveal-words').forEach((el) => io.observe(el));

  // elementos com clip-path 100% têm área visível zero → observa um sentinela sem recorte
  $$('.reveal-clip').forEach((el) => {
    const sentinel = document.createElement('span');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;inset:0;pointer-events:none;visibility:hidden;';
    if (getComputedStyle(el.parentElement).position === 'static') el.parentElement.style.position = 'relative';
    el.parentElement.appendChild(sentinel);
    const place = () => {
      sentinel.style.inset = 'auto';
      sentinel.style.left = el.offsetLeft + 'px';
      sentinel.style.top = el.offsetTop + 'px';
      sentinel.style.width = el.offsetWidth + 'px';
      sentinel.style.height = el.offsetHeight + 'px';
    };
    place();
    window.addEventListener('resize', place);
    const cio = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('is-in'); cio.disconnect(); window.removeEventListener('resize', place); }
    }, { threshold: 0.1 });
    cio.observe(sentinel);
  });

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const dur = 1800;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Header behaviour, progress, parallax, timeline ---------- */
  const header = $('.header');
  const progressBar = $('.scroll-progress');
  const parallaxEls = $$('.parallax');
  const parallaxX = $$('.parallax-x');
  const timeline = $('.timeline');
  const fill = $('.timeline__fill');
  const steps = $$('.step');
  const waFloat = $('.wa-float');
  let lastY = window.scrollY;
  let ticking = false;

  // posição absoluta (topo da página) sem considerar transforms
  const pageTop = (el) => {
    let t = 0;
    for (let n = el; n; n = n.offsetParent) t += n.offsetTop;
    return t;
  };
  // cache de medidas: lido só em resize/load/fonts, nunca dentro do scroll
  let maxScroll = 0, tlTop = 0, tlH = 1, stepTops = [], pxData = [], pxxData = [];
  const measure = () => {
    maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (timeline) {
      tlTop = pageTop(timeline); tlH = timeline.offsetHeight || 1;
      stepTops = steps.map(pageTop);
    }
    pxData = parallaxEls.map((el) => ({ el, center: pageTop(el) + el.offsetHeight / 2, speed: +el.dataset.speed, last: null }));
    pxxData = parallaxX.map((el) => ({ el, top: pageTop(el.parentElement), speed: +el.dataset.speed, last: null }));
  };
  // estado anterior: só escreve no DOM quando o valor muda
  const st = { prog: null, scrolled: null, shown: null, hidden: null, fill: null, steps: [] };

  const onScroll = (fromScroll = true) => {
    ticking = false;
    // --- leituras (tudo vem do cache; scrollY é a única leitura) ---
    const y = window.scrollY;
    const vh = window.innerHeight;
    const prog = maxScroll > 0 ? Math.min(Math.max(y / maxScroll, 0), 1) : 0;
    const scrolled = y > 40;
    const shown = y > vh * 0.6;
    const menuOpen = document.body.classList.contains('menu-open');
    const hidden = !menuOpen && y > 500 && y > lastY + 4;
    if (fromScroll) lastY = y;
    const mid = vh * 0.6;
    const tl = timeline ? Math.min(Math.max((mid - (tlTop - y)) / tlH, 0), 1) : 0;

    // --- escritas ---
    if (prog !== st.prog) { progressBar.style.transform = `scaleX(${prog})`; st.prog = prog; }
    if (scrolled !== st.scrolled) { header.classList.toggle('is-scrolled', scrolled); st.scrolled = scrolled; }
    if (shown !== st.shown) {
      waFloat.classList.toggle('is-shown', shown);
      if (!shown) waFloat.classList.remove('is-open');
      st.shown = shown;
    }
    // só mexe no header em eventos de scroll (recálculo não deve fazê-lo piscar)
    if (fromScroll && (hidden !== st.hidden || header.classList.contains('is-hidden') !== hidden)) {
      header.classList.toggle('is-hidden', hidden); st.hidden = hidden;
    }

    if (!reduceMotion) {
      for (const d of pxData) {
        const v = Math.round((d.center - y - vh / 2) * d.speed * 100) / 100;
        if (v !== d.last) { d.el.style.transform = `translate3d(0, ${v}px, 0)`; d.last = v; }
      }
      for (const d of pxxData) {
        const v = Math.round((d.top - y - vh) * d.speed * 100) / 100;
        if (v !== d.last) { d.el.style.transform = `translate3d(${v}px, 0, 0)`; d.last = v; }
      }
    }

    if (timeline) {
      if (tl !== st.fill) { fill.style.transform = `scaleY(${tl})`; st.fill = tl; }
      steps.forEach((el, i) => {
        const on = stepTops[i] - y < mid;
        if (on !== st.steps[i]) { el.classList.toggle('is-active', on); st.steps[i] = on; }
      });
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => onScroll(true)); ticking = true; }
  }, { passive: true });

  // recalcula o cache em resize/load (com debounce) e após carregar as fontes
  let mT;
  const remeasure = () => { clearTimeout(mT); mT = setTimeout(() => { measure(); onScroll(false); }, 150); };
  measure();
  onScroll();
  window.addEventListener('resize', remeasure);
  // pega mudanças de altura da página (FAQ, imagens, fontes, barra de rolagem)
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav__link');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionIO.observe(s));

  /* ---------- Mobile menu ---------- */
  const burger = $('.burger');
  const mobileMenu = $('#mobile-menu');
  const toggleMenu = (open) => {
    const isOpen = open ?? !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    burger.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    mobileMenu.setAttribute('aria-hidden', !isOpen);
    if (isOpen) header.classList.remove('is-hidden');
    BG.sync();
  };
  burger.addEventListener('click', () => toggleMenu());
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

  /* ---------- Custom cursor ---------- */
  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => (cursor.style.opacity = 0));
    document.addEventListener('mouseenter', () => (cursor.style.opacity = 1));
    // loop só roda enquanto o anel não alcançou o mouse
    let cursorRaf = 0;
    const loop = () => {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      if (Math.hypot(mx - rx, my - ry) < 0.1) { cursorRaf = 0; return; }
      cursorRaf = requestAnimationFrame(loop);
    };
    const startCursor = () => { if (!cursorRaf) cursorRaf = requestAnimationFrame(loop); };
    window.addEventListener('mousemove', startCursor, { passive: true });
    startCursor();
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, summary, .area-card, label, input, select, textarea')) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, summary, .area-card, label, input, select, textarea')) cursor.classList.remove('is-hover');
    });
    // dentro do iframe do mapa o documento não recebe mousemove: esconde o cursor customizado
    $$('iframe').forEach((f) => {
      f.addEventListener('mouseenter', () => (cursor.style.opacity = 0));
      f.addEventListener('mouseleave', () => (cursor.style.opacity = 1));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('mouseleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- Emblem 3D tilt ---------- */
  const tiltWrap = $('[data-tilt]');
  if (tiltWrap && finePointer && !reduceMotion) {
    const emblem = $('.emblem', tiltWrap);
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
    // loop só roda com o hero visível e enquanto o valor ainda converge
    let tiltRaf = 0, heroVisible = true;
    const loopTilt = () => {
      // antes do 'loaded' não converge: mantém o loop vivo até o preloader sair
      if (!document.body.classList.contains('loaded')) { tiltRaf = requestAnimationFrame(loopTilt); return; }
      cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
      {
        emblem.style.transform = `rotateY(${cx * 14}deg) rotateX(${-cy * 14}deg)`;
        emblem.style.setProperty('--mx', `${50 + cx * 30}%`);
        emblem.style.setProperty('--my', `${35 + cy * 30}%`);
      }
      if (!heroVisible || (Math.abs(cx - tx) < 0.001 && Math.abs(cy - ty) < 0.001)) { tiltRaf = 0; return; }
      tiltRaf = requestAnimationFrame(loopTilt);
    };
    const startTilt = () => { if (!tiltRaf && heroVisible) tiltRaf = requestAnimationFrame(loopTilt); };
    window.addEventListener('mousemove', startTilt, { passive: true });
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; if (heroVisible) startTilt(); }).observe(tiltWrap);
    startTiltHook = startTilt;
    startTilt();
  }

  /* ---------- Soft tilt on lawyer cards ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt-soft]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
      });
      card.addEventListener('mouseleave', () => (card.style.transform = ''));
    });
  }

  /* ---------- Spotlight on area cards ---------- */
  $$('.area-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    });
  });

  /* ---------- Campo 3D de partículas douradas (fundo da página inteira) ---------- */
  const canvas = $('.bg3d');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let mobile = true, MAX_P = 40, TAU_SCROLL = 0, TILT_PX = 0; // reavaliados em aplicaModo()
    const Z_MIN = 1, Z_MAX = 5, PAR = 0.55, MARGEM = 24, DENS = 9000;
    const TAU_TILT = 250;
    const REPEL_R = 110, REPEL_F = 1.4, IDLE_MS = 28, ESCURECER = 0.65;
    const rand = (a, b) => a + Math.random() * (b - a);
    const mod = (a, m) => ((a % m) + m) % m;

    // sprites pré-renderizados: miolo sólido do raio r + halo curto (~3 px) e fraco
    const HALO = 3, NSPR = 8, R0 = 0.3, R1 = 2.2;
    const sprites = Array.from({ length: NSPR }, (_, i) => {
      const r = R0 + ((R1 - R0) * i) / (NSPR - 1);
      const tot = r + HALO, px = Math.ceil(tot * 2 * 2); // 2x para ficar nítido
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      const m = px / 2, k = px / (tot * 2);
      const grad = g.createRadialGradient(m, m, r * k, m, m, tot * k);
      grad.addColorStop(0, 'rgba(232, 204, 133, 0.25)');
      grad.addColorStop(1, 'rgba(232, 204, 133, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, px, px);
      g.fillStyle = 'rgba(232, 204, 133, 1)';
      g.beginPath(); g.arc(m, m, r * k, 0, Math.PI * 2); g.fill();
      return { c, size: tot * 2 };
    });

    let w = 0, h = 0, W2 = 0, H2 = 0, dpr = 1, particles = [];
    // mobile/desktop pela largura; TAU_SCROLL 0 = sem suavização
    const aplicaModo = () => {
      mobile = !finePointer || window.innerWidth < 768;
      MAX_P = mobile ? 40 : 140;
      TAU_SCROLL = mobile ? 0 : 90;
      TILT_PX = mobile ? 0 : 36;
      if (mobile) { cam.x = cam.y = camAlvo.x = camAlvo.y = 0; mx = my = -9999; }
    };
    const calcDpr = () => (mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    let syLisa = window.scrollY, lastSy = syLisa;
    const cam = { x: 0, y: 0 }, camAlvo = { x: 0, y: 0 };
    let mx = -9999, my = -9999, lastMouseT = -1e9;

    const novaParticula = () => {
      const z = rand(Z_MIN, Z_MAX), s = 1 / z;
      // faixa de s (0,2 a 1) -> sprite, com leve sorteio de ±1
      let idx = Math.round(((s - 1 / Z_MAX) / (1 - 1 / Z_MAX)) * (NSPR - 1)) + Math.floor(Math.random() * 3) - 1;
      idx = Math.min(NSPR - 1, Math.max(0, idx));
      return {
        s, spr: sprites[idx],
        x: Math.random() * W2, y: Math.random() * H2,
        vx: rand(-0.08, 0.08) * s, vy: -(0.05 + Math.random() * 0.3) * s,
        a: 0.2 + Math.random() * 0.6, tw: Math.random() * Math.PI * 2,
        ox: 0, oy: 0, // deslocamento temporário da repulsão do mouse
      };
    };
    const ajustaQuantidade = () => {
      const n = Math.min(Math.floor((w * h) / DENS), MAX_P);
      while (particles.length < n) particles.push(novaParticula());
      if (particles.length > n) particles.length = n;
    };
    const dimensiona = () => {
      dpr = calcDpr();
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // desenha um quadro; o brilho cai ao sair do hero (ESCURECER) para não competir com os textos
    const desenha = (k, estatico) => {
      const sy = window.scrollY;
      // estático (reduced-motion): canvas fica atrás de todo o conteúdo, usa o brilho já reduzido
      const dim = estatico ? ESCURECER : 1 - (1 - ESCURECER) * Math.min(Math.max((sy - 0.8 * h) / (0.4 * h), 0), 1);
      const mouseOn = mx > -1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const s = p.s;
        const bx = mod(p.x + cam.x * TILT_PX * s, W2) - MARGEM;
        const by = mod(p.y - syLisa * PAR * s + cam.y * TILT_PX * 0.5 * s, H2) - MARGEM;
        if (mouseOn && s > 0.45) {
          const dx = bx - mx, dy = by - my, d = Math.hypot(dx, dy);
          if (d < REPEL_R && d > 0.01) {
            const f = (1 - d / REPEL_R) * REPEL_F;
            p.ox += (dx / d) * f * k; p.oy += (dy / d) * f * k; // k: independe da taxa de quadros
          }
        }
        let al = p.a * (0.25 + 0.75 * s) * (0.6 + 0.4 * Math.sin(p.tw)) * dim;
        if (dim > ESCURECER && al > 0.6) al = 0.6; // no hero: não atrapalha a leitura do texto
        ctx.globalAlpha = al;
        ctx.drawImage(p.spr.c, bx + p.ox - p.spr.size / 2, by + p.oy - p.spr.size / 2, p.spr.size, p.spr.size);
      }
      ctx.globalAlpha = 1;
    };

    // ---- laço de animação ----
    let raf = 0, lastT = 0;
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (!lastT) { lastT = t; return; } // 1º frame após retomar: sem salto
      const dt = t - lastT;
      const sy = window.scrollY;
      const recente = t - lastMouseT < 1200;
      const ativo = sy !== lastSy || Math.abs(sy - syLisa) > 0.5 ||
        Math.abs(camAlvo.x - cam.x) > 0.002 || Math.abs(camAlvo.y - cam.y) > 0.002 || recente;
      if (!ativo && dt < IDLE_MS) return; // em repouso: ~30 fps
      lastT = t; lastSy = sy;
      const passo = Math.min(dt, 100), k = passo / 16.67;
      // suavização do scroll; saltos grandes (âncoras) são encaixados
      if (TAU_SCROLL) {
        syLisa += (sy - syLisa) * (1 - Math.exp(-passo / TAU_SCROLL));
        if (Math.abs(sy - syLisa) > 2 * h) syLisa = sy; // salto instantâneo: encaixa direto
      } else syLisa = sy;
      if (TILT_PX) {
        const a = 1 - Math.exp(-passo / TAU_TILT);
        cam.x += (camAlvo.x - cam.x) * a; cam.y += (camAlvo.y - cam.y) * a;
      }
      const relax = Math.pow(0.9, k);
      for (const p of particles) {
        p.x = mod(p.x + p.vx * k, W2); p.y = mod(p.y + p.vy * k, H2);
        p.tw += 0.02 * k;
        p.ox *= relax; p.oy *= relax;
      }
      desenha(k);
    };

    // pausa de verdade: aba oculta, preloader, menu ou modal abertos
    const sync = () => {
      if (reduceMotion) return;
      const b = document.body.classList;
      const run = !document.hidden && b.contains('loaded') && !b.contains('menu-open') && !b.contains('modal-open');
      if (run && !raf) { lastT = 0; syLisa = lastSy = window.scrollY; raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    BG.sync = sync;
    document.addEventListener('visibilitychange', sync);

    // mouse só no desktop (passive)
    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        if (mobile) return;
        mx = e.clientX; my = e.clientY; lastMouseT = performance.now();
        camAlvo.x = Math.max(-1, Math.min(1, (mx / w - 0.5) * 2));
        camAlvo.y = Math.max(-1, Math.min(1, (my / h - 0.5) * 2));
      }, { passive: true });
      const zeraMouse = () => { mx = my = -9999; camAlvo.x = camAlvo.y = 0; lastMouseT = performance.now(); };
      document.documentElement.addEventListener('mouseleave', zeraMouse);
      // iframes (mapa) engolem o mouse: tratar como saída
      $$('iframe').forEach((f) => f.addEventListener('mouseenter', zeraMouse));
    }

    // resize com debounce; mudança só de altura (barra do celular) não realoca partículas
    const resize = () => {
      const nw = canvas.clientWidth, nh = canvas.clientHeight;
      if (!nw || !nh) return;
      aplicaModo();
      const dprMudou = calcDpr() !== dpr;
      if (nw === w && nh === h) {
        if (dprMudou) { dimensiona(); if (reduceMotion) desenha(0, true); } // só o DPR mudou (outro monitor)
        return;
      }
      const oldW2 = W2, oldH2 = H2;
      w = nw; h = nh; W2 = w + 2 * MARGEM; H2 = h + 2 * MARGEM;
      dimensiona();
      if (oldW2) for (const p of particles) { p.x = (p.x / oldW2) * W2; p.y = (p.y / oldH2) * H2; }
      ajustaQuantidade();
      if (reduceMotion) desenha(0, true); // estático: redesenha no resize
    };
    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 150); });
    resize();
    if (reduceMotion) desenha(0, true);
    else sync();
  }

  /* ---------- Pausa animações CSS infinitas fora da tela ---------- */
  if (!reduceMotion) {
    const offIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    });
    $$('.hero, .marquee, .about__badge, .national').forEach((el) => offIO.observe(el));
  }

  /* ---------- Accordion smooth animation ---------- */
  $$('.acc').forEach((d) => {
    const summary = $('summary', d);
    const body = $('.acc__body', d);
    summary.addEventListener('click', (e) => {
      if (reduceMotion) return;
      e.preventDefault();
      if (d.open) {
        const anim = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
        d.classList.add('closing');
        anim.onfinish = () => { d.open = false; d.classList.remove('closing'); };
      } else {
        // close siblings
        $$('.acc[open]').forEach((o) => { if (o !== d) o.open = false; });
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ---------- Area modal ---------- */
  const AREAS = {
    civil: {
      n: '01', t: 'Direito Civil',
      i: 'Atuação consultiva e contenciosa na defesa de direitos patrimoniais e pessoais, com foco em soluções seguras e, sempre que possível, consensuais.',
      l: ['Elaboração e revisão de contratos', 'Ações de indenização por danos morais e materiais', 'Cobranças e execuções', 'Responsabilidade civil', 'Acordos e negociações extrajudiciais', 'Notificações extrajudiciais'],
    },
    familia: {
      n: '02', t: 'Família & Sucessões',
      i: 'Questões delicadas tratadas com sensibilidade, sigilo e firmeza técnica — priorizando o bem-estar da família e a segurança patrimonial.',
      l: ['Divórcio judicial e extrajudicial', 'Guarda e regulamentação de visitas', 'Pensão alimentícia e revisão', 'Inventário e partilha de bens', 'Testamentos', 'Planejamento sucessório'],
    },
    trabalhista: {
      n: '03', t: 'Direito Trabalhista',
      i: 'Defesa dos direitos de trabalhadores e assessoria preventiva a empregadores, reduzindo riscos e conflitos na relação de trabalho.',
      l: ['Verbas rescisórias', 'Horas extras e adicionais', 'Reconhecimento de vínculo', 'Acidente e doença ocupacional', 'Assédio moral', 'Consultoria a empresas'],
    },
    previdenciario: {
      n: '04', t: 'Direito Previdenciário',
      i: 'Orientação completa junto ao INSS — do planejamento à concessão — para garantir o melhor benefício possível dentro da lei.',
      l: ['Aposentadorias (idade, tempo, especial, rural)', 'BPC / LOAS', 'Auxílio por incapacidade', 'Pensão por morte', 'Revisão de benefícios', 'Planejamento previdenciário'],
    },
    consumidor: {
      n: '05', t: 'Direito do Consumidor',
      i: 'Proteção contra práticas abusivas de fornecedores, bancos e prestadores de serviço, buscando a reparação adequada de cada dano.',
      l: ['Cobranças e descontos indevidos', 'Negativação indevida', 'Problemas com bancos e empréstimos', 'Planos de saúde', 'Voos atrasados ou cancelados', 'Produtos e serviços com defeito'],
    },
    imobiliario: {
      n: '06', t: 'Imobiliário & Agrário',
      i: 'Segurança jurídica para quem compra, vende, regulariza ou produz — na cidade e no campo.',
      l: ['Usucapião judicial e extrajudicial', 'Regularização de imóveis', 'Contratos de compra e venda', 'Arrendamento e parceria rural', 'Ações possessórias', 'Locação'],
    },
    saude: {
      n: '07', t: 'Direito Médico & da Saúde',
      i: 'Assessoria preventiva e contenciosa para clínicas médicas, odontológicas e profissionais da saúde — mais segurança jurídica para quem cuida de pessoas, em qualquer lugar do Brasil.',
      l: ['Contratos com pacientes e termos de consentimento', 'Defesa em ações de responsabilidade civil', 'Adequação à LGPD para dados de saúde', 'Contratos societários e entre profissionais', 'Processos ético-disciplinares (CRM / CRO)', 'Relação com planos de saúde e convênios', 'Regularização junto à Vigilância Sanitária', 'Questões trabalhistas da clínica'],
    },
  };
  const modal = $('#area-modal');
  let lastFocus = null;
  const openModal = (key) => {
    const a = AREAS[key]; if (!a) return;
    $('#modal-num').textContent = a.n;
    $('#modal-title').textContent = a.t;
    $('#modal-intro').textContent = a.i;
    $('#modal-list').innerHTML = a.l.map((x) => `<li>${x}</li>`).join('');
    modal.dataset.area = a.t;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    BG.sync();
    setTimeout(() => $('.modal__close', modal).focus(), 50);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    BG.sync();
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  $$('.area-card').forEach((c) => {
    c.setAttribute('role', 'button');
    c.addEventListener('click', () => openModal(c.dataset.area));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(c.dataset.area); } });
  });
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
  $('[data-close-go]', modal).addEventListener('click', () => {
    // options seguem a mesma ordem das áreas (índice 0 é o placeholder)
    $('#f-area').selectedIndex = parseInt($('#modal-num').textContent, 10);
    closeModal();
  });
  const waWrap = $('.wa-float');
  const waBtn = $('.wa-float__btn');
  // mantém o foco do teclado dentro do modal / menu móvel enquanto abertos
  const trapFocus = (container, e) => {
    const items = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (modal.classList.contains('is-open')) trapFocus($('.modal__panel', modal), e);
      else if (document.body.classList.contains('menu-open')) {
        // ciclo: botão fechar (burger) + links do menu
        trapFocus({ querySelectorAll: (s) => [burger, ...mobileMenu.querySelectorAll(s)] }, e);
      }
    }
    if (e.key === 'Escape') {
      if (modal.classList.contains('is-open')) closeModal();
      if (document.body.classList.contains('menu-open')) toggleMenu(false);
      waWrap.classList.remove('is-open');
    }
  });

  /* ---------- WhatsApp float ---------- */
  waBtn.addEventListener('click', () => {
    const open = waWrap.classList.toggle('is-open');
    waBtn.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', (e) => { if (!waWrap.contains(e.target)) { waWrap.classList.remove('is-open'); waBtn.setAttribute('aria-expanded', false); } });

  /* ---------- Phone mask ---------- */
  const tel = $('#f-tel');
  tel.addEventListener('input', () => {
    let v = tel.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    else if (v.length) v = v.replace(/^(\d*)/, '($1');
    tel.value = v;
  });

  /* ---------- Contact form → WhatsApp ---------- */
  const form = $('#contact-form');
  const err = $('.form__error', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
    const nome = $('#f-nome').value.trim();
    const telefone = tel.value.trim();
    const area = $('#f-area').value;
    const msg = $('#f-msg').value.trim();
    const lgpd = $('#f-lgpd').checked;
    const adv = $('input[name="adv"]:checked', form);
    const problems = [];
    if (nome.length < 2) { problems.push('nome'); $('#f-nome').parentElement.classList.add('is-invalid'); }
    if (telefone.replace(/\D/g, '').length < 10) { problems.push('telefone'); tel.parentElement.classList.add('is-invalid'); }
    if (!area) { problems.push('área'); $('#f-area').parentElement.classList.add('is-invalid'); }
    if (problems.length) { err.textContent = `Por favor, preencha: ${problems.join(', ')}.`; return; }
    if (!lgpd) { err.textContent = 'Para continuar, autorize o uso dos dados para retorno do contato.'; return; }
    err.textContent = '';
    const advName = adv.nextElementSibling.textContent;
    const text = [
      `Olá, ${advName}! Vim pelo site do escritório Altrão & Pocibom.`,
      '',
      `*Nome:* ${nome}`,
      `*Telefone:* ${telefone}`,
      `*Assunto:* ${area}`,
      msg ? `*Mensagem:* ${msg}` : null,
    ].filter((x) => x !== null).join('\n');
    window.open(`https://wa.me/${adv.value}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  /* ---------- Year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
