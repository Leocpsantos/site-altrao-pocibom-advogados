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
  const finishLoad = () => {
    clearInterval(tick);
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('loaded');
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
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;

    header.classList.toggle('is-scrolled', y > 40);
    const wa = $('.wa-float');
    const shown = y > window.innerHeight * 0.6;
    wa.classList.toggle('is-shown', shown);
    if (!shown) wa.classList.remove('is-open');
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;

    if (!reduceMotion) {
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0, ${center * +el.dataset.speed}px, 0)`;
      });
      parallaxX.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        el.style.transform = `translate3d(${(r.top - window.innerHeight) * +el.dataset.speed}px, 0, 0)`;
      });
    }

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const mid = window.innerHeight * 0.6;
      const p = Math.min(Math.max((mid - r.top) / r.height, 0), 1);
      fill.style.transform = `scaleY(${p})`;
      steps.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle('is-active', sr.top < mid);
      });
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

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
    const loop = () => {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
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
    const loopTilt = () => {
      cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
      if (document.body.classList.contains('loaded')) {
        emblem.style.transform = `rotateY(${cx * 14}deg) rotateX(${-cy * 14}deg)`;
        emblem.style.setProperty('--mx', `${50 + cx * 30}%`);
        emblem.style.setProperty('--my', `${35 + cy * 30}%`);
      }
      requestAnimationFrame(loopTilt);
    };
    loopTilt();
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

  /* ---------- Hero particles (gold dust) ---------- */
  const canvas = $('.hero__canvas');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, particles = [];
    let mouse = { x: -9999, y: -9999 };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(Math.floor((w * h) / 9000), 140);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.35 - 0.05,
        a: Math.random() * 0.6 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    canvas.parentElement.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });

    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

    const draw = () => {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            const f = (120 - dist) / 120;
            p.x += (dx / dist) * f * 1.6;
            p.y += (dy / dist) * f * 1.6;
          }
          p.x += p.vx; p.y += p.vy; p.tw += 0.02;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10;
          const alpha = p.a * (0.6 + Math.sin(p.tw) * 0.4);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(232, 204, 133, ${alpha})`;
          ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(232, 204, 133, .8)';
          ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
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
    setTimeout(() => $('.modal__close', modal).focus(), 50);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
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
  const waWrap = $('.wa-float');
  const waBtn = $('.wa-float__btn');
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
