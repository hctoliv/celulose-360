(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PHONE = () => innerWidth <= 760;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (motion && window.Lenis && hasGsap) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const lock = on => { document.documentElement.style.overflow = on ? 'hidden' : ''; if (lenis) on ? lenis.stop() : lenis.start(); };

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(t, { duration: 1.6, offset: 0 }); else t.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
  }));

  /* ---------- menu ---------- */
  const menuBtn = $('[data-menu]'), panel = $('[data-menu-panel]');
  function closeMenu() { if (panel.hidden) return; panel.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); lock(false); }
  menuBtn.addEventListener('click', () => {
    if (panel.hidden) { panel.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); lock(true); } else closeMenu();
  });

  /* ---------- header hide on scroll down ---------- */
  const hd = $('[data-hd]');
  let lastY = 0;
  const onScrollHd = () => {
    const y = scrollY;
    hd.classList.toggle('is-hidden', y > lastY + 4 && y > 400 && panel.hidden);
    if (y < lastY - 4 || y < 400) hd.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScrollHd, { passive: true });

  /* ---------- hero frame sequence ---------- */
  const FRAMES = 134;
  const canvas = $('[data-seq]'), ctx = canvas.getContext('2d', { alpha: false });
  const frames = new Array(FRAMES);
  const src = i => `img/frames/${String(i).padStart(3, '0')}.webp`;
  let want = 0, drawn = -1;
  const nearest = i => {
    for (let d = 0; d < FRAMES; d++) {
      const a = frames[i - d], b = frames[i + d];
      if (a && a.complete && a.naturalWidth) return a;
      if (b && b.complete && b.naturalWidth) return b;
    }
    return null;
  };
  const draw = i => {
    want = i;
    const img = frames[i] && frames[i].complete && frames[i].naturalWidth ? frames[i] : nearest(i);
    if (!img) return;
    const key = img === frames[i] ? i : -1;
    if (key === drawn && key !== -1) return;
    drawn = key;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  const load = i => new Promise(r => {
    if (frames[i]) return r();
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { if (i === want) draw(i); r(); };
    im.onerror = () => { if (im.dataset.retry) return r(); im.dataset.retry = 1; setTimeout(() => { im.src = src(i) + '?r=1'; }, 700); };
    im.src = src(i);
    frames[i] = im;
  });
  // ordem: primeiro um a cada 6, depois o resto, com no máximo 6 pedidos simultâneos
  const order = [];
  [6, 3, 1].forEach(s => { for (let i = 0; i < FRAMES; i += s) if (!order.includes(i)) order.push(i); });
  const firstFrame = load(0).then(() => draw(0));
  const pump = async () => {
    let k = 0;
    const worker = async () => { while (k < order.length) await load(order[k++]); };
    await Promise.all(Array.from({ length: 6 }, worker));
  };

  /* stages */
  const STAGES = [
    [0, 'fig. a · floresta cultivada'],
    [.21, 'fig. b · tronco de eucalipto'],
    [.39, 'fig. c · anéis de crescimento'],
    [.66, 'fig. d · fibras da madeira'],
    [.82, 'fig. e · lignina e fibras'],
  ];
  const stageEl = $('[data-stage]'), ticks = $$('.specimen__ticks li');
  let stageIx = -1;
  const setStage = p => {
    let ix = 0;
    STAGES.forEach(([at], i) => { if (p >= at) ix = i; });
    if (ix === stageIx) return;
    stageIx = ix;
    stageEl.textContent = STAGES[ix][1];
    ticks.forEach((t, i) => t.classList.toggle('on', i <= ix));
  };
  setStage(0);

  /* narração palavra por palavra, como no reel */
  const narr = $('[data-narr]');
  const words = narr.getAttribute('aria-label').split(' ');
  narr.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
  const wEls = $$('.w', narr);
  let shown = -1;
  const setNarr = p => {
    const n = Math.round(clamp(p / .92, 0, 1) * wEls.length) - 1;
    if (n === shown) return;
    shown = n;
    // janela: mostra a frase corrente (como legenda) e mantém leitura
    wEls.forEach((el, i) => {
      el.classList.toggle('on', i <= n);
      el.classList.toggle('new', i === n);
    });
  };

  /* ---------- spores (live) ---------- */
  const sp = $('[data-spores]'), sx = sp.getContext('2d');
  let parts = [], spW = 0, spH = 0, heroVisible = true;
  const resizeSp = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    spW = sp.clientWidth; spH = sp.clientHeight;
    sp.width = spW * dpr; sp.height = spH * dpr; sx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = PHONE() ? 26 : 60;
    parts = Array.from({ length: n }, () => ({ x: Math.random() * spW, y: Math.random() * spH, r: Math.random() * 1.8 + .4, vx: (Math.random() - .5) * .18, vy: -(Math.random() * .25 + .05), a: Math.random() * .5 + .15, ph: Math.random() * 6.28 }));
  };
  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  let spRunning = false;
  const tickSp = t => {
    if (!heroVisible || document.hidden) { spRunning = false; return; }
    {
      sx.clearRect(0, 0, spW, spH);
      for (const p of parts) {
        p.x += p.vx + Math.sin(t / 1400 + p.ph) * .15 + mx * .25;
        p.y += p.vy + my * .1;
        if (p.y < -10) { p.y = spH + 10; p.x = Math.random() * spW; }
        if (p.x < -10) p.x = spW + 10; if (p.x > spW + 10) p.x = -10;
        sx.beginPath(); sx.arc(p.x, p.y, p.r, 0, 6.283);
        sx.fillStyle = `rgba(190, 230, 140, ${p.a * (.6 + .4 * Math.sin(t / 900 + p.ph))})`;
        sx.fill();
      }
    }
    requestAnimationFrame(tickSp);
  };
  const startSp = () => { if (motion && !spRunning && heroVisible) { spRunning = true; requestAnimationFrame(tickSp); } };
  resizeSp();
  let rsT;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(resizeSp, 200); });
  document.addEventListener('visibilitychange', startSp);
  startSp();

  /* ---------- word fill (manifesto) ---------- */
  const mt = $('[data-words]');
  const greens = ['transforma', 'indústria.'];
  mt.innerHTML = mt.textContent.split(' ').map(w => `<span class="w${greens.includes(w) ? ' g' : ''}">${w}</span>`).join(' ');
  const mWords = $$('.w', mt);

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-rise], [data-speech]').forEach(el => io.observe(el));

  const animIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)));
  $$('[data-anim]').forEach(el => { el.classList.add('is-off'); animIO.observe(el); });

  /* ---------- microscópio ---------- */
  const lens = $$('[data-lens]'), scopeN = $('[data-scope-n]');
  const setLens = i => {
    lens.forEach((im, k) => im.classList.toggle('is-on', k === i));
    $$('.obs__item').forEach((o, k) => o.classList.toggle('is-on', k === i));
    scopeN.textContent = `lâmina ${String(i + 1).padStart(2, '0')} / 04`;
  };
  const obsIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setLens(+e.target.dataset.obs); }), { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-obs]').forEach(o => obsIO.observe(o));
  setLens(0);
  const scope = $('[data-scope]');
  scope.addEventListener('pointermove', e => {
    if (!motion) return;
    const r = scope.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    lens.forEach(im => { if (im.classList.contains('is-on')) im.style.transform = `scale(1.12) translate(${-x * 6}%, ${-y * 6}%)`; });
  });
  scope.addEventListener('pointerleave', () => lens.forEach(im => { im.style.transform = ''; }));

  /* contador do carrossel no mobile */
  const obsList = $('.obs'), obsN = $('[data-obs-n]');
  obsList.addEventListener('scroll', () => {
    const w = obsList.firstElementChild.offsetWidth + 12;
    obsN.textContent = String(clamp(Math.round(obsList.scrollLeft / w) + 1, 1, 4)).padStart(2, '0');
  }, { passive: true });

  /* barra fixa no mobile: aparece depois do hero, some no CTA final */
  const dock = $('[data-dock]'), ctaSec = $('#contato');
  let ctaIn = false;
  new IntersectionObserver(es => { ctaIn = es[0].isIntersecting; updDock(); }).observe(ctaSec);
  const updDock = () => dock.classList.toggle('is-on', scrollY > innerHeight * .9 && !ctaIn && panel.hidden);
  addEventListener('scroll', updDock, { passive: true });

  /* ---------- elo na cadeia ---------- */
  const ELO = [
    ['Trilhas de aprendizado', 'Conhecimento Técnico: processos industriais, ecossistema florestal, sustentabilidade e tecnologia. Tudo sobre a cadeia da celulose, para quem está começando.'],
    ['Qualificação', 'Cursos online e presenciais, certificações Celulose 360° e capacitação profissional para o setor.'],
    ['Mercado & Economia', 'Dados de produção, exportação, preços e consumo global. Gráficos interativos e análises do setor para decisões mais inteligentes.'],
    ['IEO C360°', 'Inteligência para Excelência Operacional: registro de ocorrências, preservação de conhecimento e tomada de decisão. Para melhorar a eficiência operacional e a qualidade do processo.'],
    ['Conteúdo gratuito', 'Da floresta à indústria, do mercado global à sustentabilidade: visão 360° do setor, com informação curada da FAOSTAT, IBGE e fontes oficiais.'],
  ];
  const eloK = $('[data-elo-k]'), eloT = $('[data-elo-t]');
  const setElo = i => {
    $$('[data-elo]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.elo === i)));
    eloK.textContent = `Comece por aqui · ${ELO[i][0]}`;
    eloT.textContent = ELO[i][1];
    if (hasGsap && motion) gsap.fromTo([eloK, eloT], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power2.out' });
  };
  $$('[data-elo]').forEach(b => b.addEventListener('click', () => setElo(+b.dataset.elo)));
  setElo(0);

  /* ---------- videos ---------- */
  const vid = $('[data-autovid]'), sb = $('[data-sound]');
  const juniaSrc = () => PHONE() ? vid.dataset.srcM : vid.dataset.src;
  const vIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { if (!vid.src) vid.src = juniaSrc(); vid.play().catch(() => {}); } else vid.pause();
  }), { threshold: .35 });
  vIO.observe(vid);
  const setSound = on => {
    vid.muted = !on;
    sb.querySelector('use').setAttribute('href', on ? '#sound' : '#mute');
    sb.querySelector('span').textContent = on ? 'Som ligado' : 'Ativar som';
    sb.setAttribute('aria-label', on ? 'Desativar som' : 'Ativar som');
  };
  sb.addEventListener('click', () => { if (!vid.src) vid.src = juniaSrc(); setSound(vid.muted); if (!vid.muted) { vid.currentTime = 0; vid.play().catch(() => {}); } });

  const film = $('[data-film-panel]'), fv = $('[data-film-video]');
  const openFilm = (file, poster) => {
    fv.src = file; fv.poster = poster; film.hidden = false; lock(true);
    if (!vid.paused) vid.pause();
    fv.play().catch(() => {});
  };
  const closeFilm = () => { fv.pause(); fv.removeAttribute('src'); fv.load(); film.hidden = true; lock(false); };
  $$('[data-film], [data-film-dock]').forEach(b => b.addEventListener('click', () => openFilm('video/floresta.mp4', 'img/floresta-poster.webp')));
  $('[data-junia]').addEventListener('click', () => openFilm(juniaSrc(), 'img/junia-poster.webp'));
  $('[data-film-close]').addEventListener('click', closeFilm);
  film.addEventListener('click', e => { if (e.target === film) closeFilm(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!film.hidden) closeFilm(); closeMenu(); } });

  /* ---------- scroll-driven ---------- */
  const heroUpdate = p => {
    draw(Math.round(clamp(p, 0, 1) * (FRAMES - 1)));
    setStage(p);
    setNarr(p);
  };

  if (hasGsap) {
    ScrollTrigger.create({
      trigger: '[data-hero]', start: 'top top', end: 'bottom bottom',
      onUpdate: s => heroUpdate(s.progress),
    });
    ScrollTrigger.create({ trigger: '[data-hero]', start: 'top bottom', end: 'bottom top', onToggle: s => { heroVisible = s.isActive; startSp(); } });

    if (motion) {
      gsap.to('.hero__copy', { yPercent: -14, opacity: .15, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: '62% bottom', end: 'bottom bottom', scrub: true } });
      gsap.to('.hero__scroll', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: '+=300', scrub: true } });
    }

    // manifesto: palavras preenchem
    ScrollTrigger.create({
      trigger: mt, start: 'top 85%', end: 'bottom 45%',
      onUpdate: s => { const n = Math.round(s.progress * mWords.length); mWords.forEach((w, i) => w.classList.toggle('on', i < n)); },
    });

    // jornada horizontal (desktop)
    const mm = gsap.matchMedia();
    const track = $('[data-jor-track]'), vine = $('[data-vine]'), jn = $('[data-jor-n]');
    const vlen = vine.getTotalLength();
    vine.style.strokeDasharray = vlen; vine.style.strokeDashoffset = vlen;
    mm.add('(min-width: 761px)', () => {
      const dist = () => track.scrollWidth - (innerWidth - $('.jor__intro').offsetWidth) + 40;
      const tw = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '[data-jor]', pin: '.jor__pin', start: 'top top', end: () => '+=' + dist(), scrub: .6, invalidateOnRefresh: true,
          onUpdate: s => {
            vine.style.strokeDashoffset = vlen * (1 - s.progress);
            jn.textContent = String(Math.min(5, Math.floor(s.progress * 4.999) + 1)).padStart(2, '0');
          },
        },
      });
      $$('.st__img img').forEach(img => gsap.fromTo(img, { xPercent: 4 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: img.closest('.st'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
      return () => { vine.style.strokeDashoffset = vlen; };
    });
    mm.add('(max-width: 760px)', () => {
      const onS = () => {
        const w = track.firstElementChild.offsetWidth + 14;
        jn.textContent = String(clamp(Math.round(track.scrollLeft / w) + 1, 1, 5)).padStart(2, '0');
      };
      track.addEventListener('scroll', onS, { passive: true });
      return () => track.removeEventListener('scroll', onS);
    });

    // anel 360
    const arc = $('[data-arc]'), deg = $('[data-deg]');
    ScrollTrigger.create({
      trigger: '[data-ring]', start: 'top 80%', end: 'center 40%', scrub: true,
      onUpdate: s => { arc.style.strokeDashoffset = 942.5 * (1 - s.progress); deg.textContent = Math.round(s.progress * 360); },
    });

    // header link ativo
    $$('.hd__nav a').forEach(a => {
      const t = $(a.getAttribute('href'));
      if (t) ScrollTrigger.create({ trigger: t, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('is-on', s.isActive) });
    });
  } else {
    // fallback sem GSAP
    const hero = $('[data-hero]');
    addEventListener('scroll', () => {
      const r = hero.getBoundingClientRect();
      heroUpdate(clamp(-r.top / (r.height - innerHeight), 0, 1));
      mWords.forEach(w => w.classList.add('on'));
    }, { passive: true });
  }

  /* ---------- preloader ---------- */
  const loader = $('.loader'), count = $('[data-count]');
  const rings = $$('.loader .ring');
  const start = performance.now();
  const MIN = motion ? 1900 : 300;
  let loaded = false;
  Promise.race([firstFrame.then(() => document.fonts ? document.fonts.ready : null), new Promise(r => setTimeout(r, 5000))]).then(() => { loaded = true; });
  const tickL = t => {
    const p = clamp((t - start) / MIN, 0, loaded ? 1 : .92);
    count.textContent = String(Math.round(p * 360)).padStart(3, '0');
    rings.forEach((r, i) => { r.style.strokeDashoffset = 600 * (1 - clamp(p * 1.6 - i * .1, 0, 1)); });
    if (p < 1) return requestAnimationFrame(tickL);
    loader.classList.add('is-out');
    document.body.classList.remove('is-loading');
    if (lenis) lenis.start();
    pump();
    if (hasGsap && motion) {
      gsap.from('.hero__title .line > span', { yPercent: 110, duration: 1.2, stagger: .09, ease: 'expo.out', delay: .35 });
      gsap.from(['.kicker', '.hero__bio', '.hero__actions'], { opacity: 0, y: 20, duration: 1, stagger: .08, ease: 'power3.out', delay: .6 });
      gsap.from('.specimen', { opacity: 0, y: 60, scale: .96, duration: 1.4, ease: 'expo.out', delay: .45 });
    }
    setTimeout(() => { loader.remove(); if (hasGsap) ScrollTrigger.refresh(); }, 1300);
  };
  requestAnimationFrame(tickL);
})();
