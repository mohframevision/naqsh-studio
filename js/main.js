(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  const navMap = new Map($$('a', links).map(a => [a.getAttribute('href').slice(1), a]));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navMap.forEach(a => a.classList.remove('active'));
      navMap.get(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => navIO.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Hero spotlight + viewfinder ---------- */
  const hero = $('#hero');
  const hud = $('.hud');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--sx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--sy', `${e.clientY - r.top}px`);
    const h = hud.getBoundingClientRect();
    const fx = Math.min(Math.max(e.clientX - h.left, 40), h.width - 40);
    const fy = Math.min(Math.max(e.clientY - h.top, 40), h.height - 40);
    hud.style.setProperty('--fx', `${fx}px`);
    hud.style.setProperty('--fy', `${fy}px`);
  });

  const gridToggle = $('#gridToggle');
  gridToggle.addEventListener('click', () => {
    const off = $('#hudGrid').classList.toggle('off');
    gridToggle.setAttribute('aria-pressed', !off);
  });

  // Timecode at 24 fps (HH:MM:SS:FF), running from page load
  const tcEl = $('#timecode');
  const t0 = performance.now();
  const pad = n => String(n).padStart(2, '0');
  const tick = now => {
    const frames = Math.floor((now - t0) / 1000 * 24);
    const s = Math.floor(frames / 24);
    tcEl.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % 24)}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ---------- Color grade simulator ---------- */
  const looks = [
    { sat: .42, con: .7, bri: 1.14, sep: 0, hue: 0, tint: [230, 150, 70], tintA: 0, rim: .15, vig: .25,
      iso: 800, kelvin: 5600, shutter: '180°', lut: 'S-LOG3 / NONE',
      note: 'هكذا تلتقط الكاميرا المشهد: كل التفاصيل محفوظة، لكن بلا روح بعد. هنا تبدأ صنعتنا.' },
    { sat: 1.3, con: 1.08, bri: 1.04, sep: .22, hue: -6, tint: [235, 150, 60], tintA: .6, rim: 1, vig: .7,
      iso: 400, kelvin: 3400, shutter: '172.8°', lut: 'NAQSH GOLD 01',
      note: 'دفء ذهبي يُبرز ملمس الرمل ولون البشرة. مزاج يوحي بالكرم والفخامة، مثالي للضيافة والعلامات الفاخرة.' },
    { sat: .6, con: 1.5, bri: .68, sep: 0, hue: 0, tint: [20, 55, 120], tintA: .95, rim: 1, vig: 1,
      iso: 1600, kelvin: 7200, shutter: '90°', lut: 'NAQSH NOIR 02',
      note: 'ظلال كحلية عميقة وإضاءة حافة درامية تفصل البطل عن الخلفية. مزاج يصنع الهيبة والترقّب.' }
  ];
  const frame = $('#frame');
  const scene = $('.scene', frame);
  const tint = $('.grade-tint', frame);
  const vignette = $('.vignette', frame);
  const rim = $('.rim', frame);
  const slider = $('#gradeSlider');
  const lookBtns = $$('.look-btn');
  const meta = Object.fromEntries($$('#meta dd').map(d => [d.dataset.k, d]));
  const note = $('#lookNote');
  const lerp = (a, b, t) => a + (b - a) * t;
  let currentLook = -1;

  const applyGrade = v => {
    const t = v / 100;                        // 0..2
    const i = Math.min(Math.floor(t), 1);
    const f = t - i;
    const A = looks[i], B = looks[i + 1];
    const m = k => lerp(A[k], B[k], f);
    scene.style.filter = `saturate(${m('sat')}) contrast(${m('con')}) brightness(${m('bri')}) sepia(${m('sep')}) hue-rotate(${m('hue')}deg)`;
    const c = A.tint.map((x, j) => Math.round(lerp(x, B.tint[j], f)));
    tint.style.background = `linear-gradient(180deg, rgba(${c},${m('tintA')}) 0%, rgba(${c},${m('tintA') * .6}) 100%)`;
    vignette.style.opacity = m('vig');
    rim.style.opacity = m('rim');
    meta.kelvin.textContent = `${Math.round(m('kelvin') / 100) * 100}K`;

    const nearest = Math.round(t);
    if (nearest !== currentLook) {
      currentLook = nearest;
      const L = looks[nearest];
      meta.iso.textContent = L.iso;
      meta.shutter.textContent = L.shutter;
      meta.lut.textContent = L.lut;
      note.textContent = L.note;
      frame.dataset.look = nearest;
      lookBtns.forEach((b, j) => {
        b.classList.toggle('active', j === nearest);
        b.setAttribute('aria-selected', j === nearest);
      });
    }
  };

  let anim;
  const animateTo = target => {
    cancelAnimationFrame(anim);
    if (reduced) { slider.value = target; applyGrade(target); return; }
    const from = +slider.value, start = performance.now(), dur = 700;
    const step = now => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      slider.value = lerp(from, target, e);
      applyGrade(+slider.value);
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };

  slider.addEventListener('input', () => { cancelAnimationFrame(anim); applyGrade(+slider.value); });
  lookBtns.forEach(b => b.addEventListener('click', () => animateTo(+b.dataset.look * 100)));
  applyGrade(0);

  /* ---------- Mouse-tracking glow cards ---------- */
  $$('.glow').forEach(card => card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Selected work: loops play only while visible, click opens full video ---------- */
  const workCards = $$('.work-card');
  if (!reduced) {
    const workIO = new IntersectionObserver(entries => entries.forEach(e => {
      const v = $('video', e.target);
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }), { threshold: .4 });
    workCards.forEach(c => workIO.observe(c));
  }

  const lightbox = $('#lightbox');
  const lightboxVideo = $('#lightboxVideo');
  workCards.forEach(card => card.addEventListener('click', () => {
    lightboxVideo.src = card.dataset.src;
    lightboxVideo.setAttribute('aria-label', card.dataset.title);
    lightbox.showModal();
    lightboxVideo.play().catch(() => {});
  }));
  lightbox.addEventListener('close', () => { lightboxVideo.pause(); lightboxVideo.removeAttribute('src'); lightboxVideo.load(); });
  $('#lightboxClose').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

  /* ---------- Fine-dining menu preview ---------- */
  const menu = {
    coffee: [
      { name: 'V60 إثيوبي ييرغاتشيفي', desc: 'نكهات الياسمين والليمون الأسود، تُحضّر أمامك ببطء.', price: '3.8', sig: true },
      { name: 'كورتادو بحليب الشوفان', desc: 'إسبريسو مزدوج بقوام حريري ولمسة كراميل.', price: '2.4' },
      { name: 'قهوة عربية بالهيل والزعفران', desc: 'وصفة البيت، تُقدّم مع تمر خلاص منتقى.', price: '2.2' },
      { name: 'كولد برو ١٨ ساعة', desc: 'منقوع على البارد، ناعم بلا مرارة.', price: '2.9' }
    ],
    mains: [
      { name: 'ريزوتو الكمأ الأسود', desc: 'أرز أربوريو كريمي، بارميزان معتّق ٢٤ شهراً.', price: '12.5', sig: true },
      { name: 'هامور مشوي على الفحم', desc: 'صلصة الليمون المحروق وخضار الموسم.', price: '9.8' },
      { name: 'ضلع لحم بطيء الطهي', desc: '١٢ ساعة على نار هادئة، بهارات بحرينية دافئة.', price: '14' },
      { name: 'باستا البحر', desc: 'روبيان الخليج، طماطم مدخّنة وريحان طازج.', price: '8.6' }
    ],
    desserts: [
      { name: 'كنافة الفستق بالكريمة', desc: 'تُخبز عند الطلب، تُقدّم ساخنة بماء الورد.', price: '4.2', sig: true },
      { name: 'تشيز كيك الزعفران', desc: 'قاعدة بسكويت بالهيل وصوص التمر.', price: '3.6' },
      { name: 'فوندان الشوكولاتة الداكنة', desc: 'قلب ذائب ٧٠٪ كاكاو وآيس كريم الفانيلا.', price: '3.9' }
    ]
  };
  const menuList = $('#menuList');
  const menuTabs = $$('.menu-tabs button');
  const esc = s => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const renderMenu = key => {
    menuList.innerHTML = menu[key].map((it, i) => `
      <li class="menu-item${it.sig ? ' signature' : ''}" style="--i:${i}">
        <h5>${esc(it.name)}${it.sig ? '<span class="sig-badge">Signature · توقيع الشيف</span>' : ''}</h5>
        <p>${esc(it.desc)}</p>
        <span class="price">${it.price}</span>
      </li>`).join('');
  };
  menuTabs.forEach(btn => btn.addEventListener('click', () => {
    menuTabs.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn); });
    renderMenu(btn.dataset.tab);
  }));
  renderMenu('coffee');

  /* ---------- Project configurator ---------- */
  const form = $('#configurator');
  const panels = $$('.step-panel', form);
  const stepDots = $$('.steps li', form);
  const errScope = $('[data-error="scope"]', form);
  const errFields = $('[data-error="fields"]', form);
  let step = 1;

  const showStep = n => {
    step = n;
    panels.forEach(p => { p.hidden = +p.dataset.panel !== n; });
    stepDots.forEach(li => {
      const s = +li.dataset.step;
      li.classList.toggle('active', s === n);
      li.classList.toggle('done', s < n);
    });
    if (n === 3) renderSummary();
    panels[n - 1].querySelector('input, button')?.focus({ preventScroll: true });
  };

  const validate = n => {
    if (n === 1) {
      const ok = !!form.scope.value;
      errScope.textContent = ok ? '' : 'اختر نوع المشروع لنكمل.';
      return ok;
    }
    if (n === 2) {
      const req = ['name', 'brand', 'phone'].map(k => form.elements[k]);
      req.forEach(el => { el.value = el.value.trim(); el.classList.toggle('invalid', !el.checkValidity()); });
      const bad = req.find(el => !el.checkValidity());
      errFields.textContent = !bad ? '' : bad.name === 'phone' ? 'أدخل رقم هاتف صحيحاً (8 أرقام على الأقل).' : 'يرجى تعبئة الحقول المطلوبة.';
      bad?.focus();
      return !bad;
    }
    return true;
  };

  const renderSummary = () => {
    const rows = [
      ['نوع المشروع', form.scope.value],
      ['الاسم', form.elements.name.value],
      ['العلامة / الشركة', form.brand.value],
      ['الهاتف / واتساب', form.phone.value],
      ['النبذة', form.brief.value.trim() || '—']
    ];
    $('#summary').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd dir="auto">${esc(v)}</dd></div>`).join('');
  };

  form.addEventListener('click', e => {
    if (e.target.closest('[data-next]') && validate(step)) showStep(step + 1);
    if (e.target.closest('[data-prev]')) showStep(step - 1);
  });
  form.addEventListener('change', e => {
    if (e.target.name === 'scope') errScope.textContent = '';
    if (e.target.classList.contains('invalid') && e.target.checkValidity()) e.target.classList.remove('invalid');
  });

  // Studio WhatsApp number, international format, digits only (e.g. '97333124455')
  const WHATSAPP_NUMBER = '97339006824';

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (step !== 3) return;
    if (WHATSAPP_NUMBER) {
      const text = [
        'مرحباً استوديو نقش، أود بدء مشروع جديد:',
        `• نوع المشروع: ${form.scope.value}`,
        `• الاسم: ${form.elements.name.value}`,
        `• العلامة / الشركة: ${form.brand.value}`,
        `• الهاتف: ${form.phone.value}`,
        form.brief.value.trim() && `• النبذة: ${form.brief.value.trim()}`
      ].filter(Boolean).join('\n');
      // opened synchronously inside the submit gesture so popup blockers allow it
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
    const btn = $('#submitBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('loading');
      btn.disabled = false;
      panels.forEach(p => { p.hidden = true; });
      $('.steps', form).hidden = true;
      const phone = Object.assign(document.createElement('bdi'), { dir: 'ltr', textContent: form.phone.value });
      $('#successMsg').replaceChildren(
        `شكراً ${form.elements.name.value}، استلمنا تفاصيل مشروع «${form.scope.value}» لعلامة ${form.brand.value}. سيتواصل معك فريق نقش على `,
        phone, ' خلال 24 ساعة.');
      $('#success').hidden = false;
    }, 1400);
  });

  $('#resetBtn').addEventListener('click', () => {
    form.reset();
    $('#success').hidden = true;
    $('.steps', form).hidden = false;
    showStep(1);
  });
})();
