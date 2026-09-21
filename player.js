/* Renders the demo from window.DEMO (manifest.js) and drives playback.
 *
 * Audio: Web Audio API. Every model of a clip is decoded to an AudioBuffer, so switching models
 * mid-playback is a ~30 ms crossfade to the same offset in another buffer (sample-aligned, no
 * drift, no rebuffering). Spectrograms are pre-rendered images, crossfaded on switch.
 */
(() => {
  'use strict';

  const DEMO = window.DEMO;
  const root = document.getElementById('demo');
  if (!DEMO) {
    root.innerHTML = '<p class="fatal wrap">manifest.js not found. Run <code>python3 build.py</code> first.</p>';
    return;
  }

  const FADE_IN = 0.012;   // s, click-free start
  const XFADE = 0.03;      // s, model switch / seek crossfade
  const NYQUIST_KHZ = 22.05;
  const MAX_DECODED_CARDS = 2; // decoded audio is ~20 MB per model; keep memory bounded

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    spin: '<svg viewBox="0 0 24 24" class="spin" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2.6" stroke-dasharray="36 60" stroke-linecap="round"/></svg>',
  };

  // ------------------------------------------------------------------ helpers
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  };
  const chipText = (m) => (m.subgroup ? `${m.subgroup} \u00b7 ` : '') + m.label;
  const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  let ctx = null;
  const audioCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    return ctx;
  };
  const decode = (ab) => new Promise((resolve, reject) => {
    // Safari < 14.1 only supports the callback form; newer browsers call both.
    const p = audioCtx().decodeAudioData(ab, resolve, reject);
    if (p && p.catch) p.catch(() => {});
  });

  // One shared animation loop for whichever cards are playing.
  const playing = new Set();
  let raf = 0;
  const loop = () => {
    raf = 0;
    for (const c of [...playing]) c.tick();
    if (playing.size) raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  const decodedCards = [];
  const allCards = [];

  // Rows that have a `group` label (the RESTORE stems) can be collapsed so the page can focus on the
  // comparison of the final systems. One switch for the whole page, remembered between visits.
  const STEMS_OPEN_DEFAULT = false;
  const STEMS_KEY = 'restore-demo-stems-open';
  let stemsOpen = STEMS_OPEN_DEFAULT;
  try { const v = localStorage.getItem(STEMS_KEY); if (v !== null) stemsOpen = v === '1'; } catch (_) { /* storage blocked */ }
  const setStemsOpen = (open) => {
    stemsOpen = open;
    try { localStorage.setItem(STEMS_KEY, open ? '1' : '0'); } catch (_) { /* ignore */ }
    allCards.forEach((c) => c.applyStems());
  };

  // ------------------------------------------------------------------ card
  class Card {
    static last = null;

    constructor(item) {
      this.item = item;
      this.dur = item.duration;
      this.models = item.models.map((m) => ({ ...DEMO.models[m.id], ...m, buf: null, p: null, bytes: null }));
      this.byId = Object.fromEntries(this.models.map((m) => [m.id, m]));
      this.active = this.models[0].id;   // model the user has selected
      this.state = 'paused';             // 'paused' | 'loading' | 'playing'
      this.offset = 0;                   // s, position while not playing
      this.startedAt = 0;                // ctx time corresponding to position 0 while playing
      this.cur = null;                   // sounding voice {id, src, g}
      this.pending = null;               // model we are waiting on to finish loading
      this.dragging = false;
      this.dragPos = 0;
      this.gen = 0;
      this.lastSec = -1;
      this.toggles = [];                 // stem-row toggle buttons
      this.bodies = [];                  // collapsible button containers
      allCards.push(this);
      this.el = this.build();
      this.el.__card = this;
      this.refreshNote();
      this.ui();
    }

    // ---------- DOM
    build() {
      const { item } = this;
      const m0 = this.byId[this.active];

      this.imgs = {};
      const imgs = this.models.map((m) => (this.imgs[m.id] = h('img', {
        src: m.spec, alt: '', loading: 'lazy', decoding: 'async', class: m.id === this.active ? 'is-on' : '',
      })));

      const grid = [5, 10, 15, 20].map((khz) =>
        h('div', { class: 'fline', style: `top:${(1 - khz / NYQUIST_KHZ) * 100}%` }, h('span', {}, `${khz} kHz`)));

      this.chipDot = h('i', { class: 'dot', style: `--c:${m0.color}` });
      this.chipLbl = h('span', {}, chipText(m0));
      this.playhead = h('div', { class: 'playhead' });
      this.hoverLbl = h('span', {}, '0:00');
      this.hover = h('div', { class: 'hover' }, this.hoverLbl);

      this.spec = h('div', {
        class: 'spec', tabindex: '0', role: 'slider', 'aria-label': `Seek in ${item.title}`,
        'aria-valuemin': '0', 'aria-valuemax': String(Math.round(this.dur)), 'aria-valuenow': '0', 'aria-valuetext': '0:00',
      }, imgs, grid, h('div', { class: 'chip' }, this.chipDot, this.chipLbl), this.hover, this.playhead);
      this.bindSpec();

      const step = this.dur > 40 ? 10 : 5;
      const ticks = [];
      for (let t = 0; t <= this.dur + 0.01; t += step) {
        const end = Math.abs(t - this.dur) < 0.5;
        ticks.push(h('span', { class: end ? 'end' : '', style: `left:${(t / this.dur) * 100}%` }, fmt(t)));
      }

      this.playBtn = h('button', { class: 'play', type: 'button', 'aria-label': 'Play', onclick: () => { Card.last = this; this.toggle(); } });
      this.curEl = h('span', {}, '0:00');
      this.status = h('div', { class: 'status', 'aria-live': 'polite' });

      this.btns = {};
      const button = (m, i) => (this.btns[m.id] = h('button', {
        class: 'mbtn' + (m.ours ? ' is-ours' : ''), type: 'button', 'aria-pressed': String(m.id === this.active),
        onclick: (e) => {
          this.select(m.id);
          if (e.detail > 0) e.currentTarget.blur(); // keep Space/arrows for playback after a mouse click
        },
        // stems load on demand (to bound memory), so start decoding as soon as one is hovered/focused
        onpointerenter: () => this.warm(m.id),
        onfocus: () => this.warm(m.id),
      }, h('i', { class: 'dot', style: `--c:${m.color}` }), h('span', {}, m.label),
      m.ours ? h('em', {}, 'ours') : null, i < 9 ? h('kbd', {}, String(i + 1)) : null));

      // Rows = consecutive models with the same `group`; clusters = consecutive `subgroup` within a row.
      const rows = [];
      this.models.forEach((m, i) => {
        const g = m.group || '';
        let row = rows[rows.length - 1];
        if (!row || row.label !== g) rows.push(row = { label: g, subs: [] });
        const sg = m.subgroup || '';
        let sub = row.subs[row.subs.length - 1];
        if (!sub || sub.label !== sg) row.subs.push(sub = { label: sg, items: [] });
        sub.items.push(button(m, i));
      });
      const switcher = h('div', { class: 'switcher' }, rows.map((row) => {
        const collapsible = !!row.label;
        const n = row.subs.reduce((k, sub) => k + sub.items.length, 0);
        const body = h('div', { class: 'mrow-body' }, row.subs.map((sub) =>
          h('div', { class: 'msub', role: sub.label ? 'group' : null, 'aria-label': sub.label || null },
            sub.label ? h('span', { class: 'msub-label' }, sub.label) : null, sub.items)));
        if (!collapsible) return h('div', { class: 'mrow', role: 'group', 'aria-label': 'Systems' }, body);
        const toggle = h('button', {
          class: 'mrow-toggle', type: 'button', 'aria-expanded': String(stemsOpen),
          onclick: (e) => { setStemsOpen(!stemsOpen); if (e.detail > 0) e.currentTarget.blur(); },
        }, h('i', { class: 'chev', 'aria-hidden': 'true' }), h('span', { class: 'lbl' }, row.label),
        h('span', { class: 'count' }, String(n)), h('span', { class: 'act' }, stemsOpen ? 'Hide' : 'Show'));
        body.hidden = !stemsOpen;
        this.toggles.push(toggle);
        this.bodies.push(body);
        return h('div', { class: 'mrow', role: 'group', 'aria-label': row.label }, toggle, body);
      }));

      this.note = h('p', { class: 'note' });

      this.setState('paused');
      return h('article', { class: 'card' },
        h('header', { class: 'card-head' }, h('h4', {}, item.title)),
        this.spec,
        h('div', { class: 'taxis' }, ticks),
        h('div', { class: 'controls' }, this.playBtn,
          h('div', { class: 'clock' }, this.curEl, h('span', {}, ` / ${fmt(this.dur)}`)), this.status),
        switcher, this.note);
    }

    bindSpec() {
      const at = (e) => {
        const r = this.spec.getBoundingClientRect();
        return clamp((e.clientX - r.left) / r.width, 0, 1);
      };
      this.spec.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        Card.last = this;
        this.dragging = true;
        this.dragPos = at(e) * this.dur;
        this.spec.setPointerCapture(e.pointerId);
        this.ui();
      });
      this.spec.addEventListener('pointermove', (e) => {
        const f = at(e);
        if (this.dragging) { this.dragPos = f * this.dur; this.ui(); }
        if (e.pointerType === 'mouse' || this.dragging) {
          this.hover.style.left = `${f * 100}%`;
          this.hover.classList.toggle('flip', f > 0.9);
          this.hover.style.opacity = '1';
          this.hoverLbl.textContent = fmt(f * this.dur);
        }
      });
      this.spec.addEventListener('pointerup', () => {
        if (!this.dragging) return;
        this.dragging = false;
        this.seek(this.dragPos);
      });
      this.spec.addEventListener('pointercancel', () => { this.dragging = false; this.ui(); });
      this.spec.addEventListener('pointerleave', () => { this.hover.style.opacity = '0'; });
    }

    setState(s) {
      this.state = s;
      this.el?.classList.toggle('is-playing', s === 'playing');
      this.playBtn.innerHTML = s === 'loading' ? ICONS.spin : s === 'playing' ? ICONS.pause : ICONS.play;
      this.playBtn.setAttribute('aria-label', s === 'paused' ? 'Play' : 'Pause');
    }

    setStatus(text, err = false) {
      this.status.textContent = text;
      this.status.classList.toggle('err', err);
    }

    refreshNote() {
      this.note.innerHTML = this.byId[this.active].note;
    }

    refreshLoadUI() {
      // stems are decoded on demand, so only count them once they have been requested
      const wanted = this.models.filter((m) => !m.group || m.p || m.buf);
      const ready = wanted.filter((m) => m.buf).length;
      const started = this.models.some((m) => m.p);
      for (const m of this.models) this.btns[m.id].classList.toggle('is-loading', !!m.p && !m.buf);
      if (started && ready < wanted.length) this.setStatus(`Loading audio ${ready}/${wanted.length}`);
      else this.setStatus('');
    }

    fail(err) {
      console.error(err);
      this.setState('paused');
      playing.delete(this);
      const local = location.protocol === 'file:';
      this.setStatus(local ? 'Serve this folder over HTTP to play audio' : "Couldn't load audio", true);
    }

    ui() {
      const pos = this.dragging ? this.dragPos : this.position();
      this.playhead.style.left = `${(pos / this.dur) * 100}%`;
      this.curEl.textContent = fmt(pos);
      const sec = Math.floor(pos);
      if (sec !== this.lastSec) {
        this.lastSec = sec;
        this.spec.setAttribute('aria-valuenow', String(sec));
        this.spec.setAttribute('aria-valuetext', `${fmt(pos)} of ${fmt(this.dur)}`);
      }
    }

    isHidden(m) { return !!m.group && !stemsOpen; }

    applyStems() {
      for (const t of this.toggles) {
        t.setAttribute('aria-expanded', String(stemsOpen));
        t.querySelector('.act').textContent = stemsOpen ? 'Hide' : 'Show';
      }
      for (const b of this.bodies) b.hidden = !stemsOpen;
      // a stem can't stay selected (or sounding) once its button is hidden: go back to the final system
      if (this.isHidden(this.byId[this.active])) {
        const back = this.models.find((m) => m.ours) || this.models.find((m) => !m.group);
        if (back) this.select(back.id);
      }
    }

    // ---------- loading
    prefetch() {
      const m = this.byId[this.active];
      if (m.buf || m.p || m.bytes) return;
      m.bytes = fetch(m.audio).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
      m.bytes.catch(() => { m.bytes = null; });
    }

    load(id) {
      const m = this.byId[id];
      if (m.buf) return Promise.resolve(m.buf);
      if (!m.p) {
        const gen = this.gen;
        m.bytes = m.bytes || fetch(m.audio).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
        m.p = m.bytes.then(decode).then((buf) => {
          if (gen !== this.gen) return buf; // released while loading
          m.buf = buf;
          m.bytes = null;
          this.refreshLoadUI();
          return buf;
        });
        m.p.catch(() => { m.p = null; m.bytes = null; this.refreshLoadUI(); });
        this.refreshLoadUI();
      }
      return m.p;
    }

    /** Decode every system in the background once playback starts. Stems (models with a group) wait until asked for. */
    loadRest() {
      for (const m of this.models) if (!m.group && !m.buf && !m.p) this.load(m.id).catch(() => {});
    }

    warm(id) {
      const m = this.byId[id];
      if (ctx && !m.buf && !m.p) this.load(id).catch(() => {});
    }

    noteDecoded() {
      const i = decodedCards.indexOf(this);
      if (i >= 0) decodedCards.splice(i, 1);
      decodedCards.push(this);
      for (const c of [...decodedCards]) {
        if (decodedCards.length <= MAX_DECODED_CARDS) break;
        if (c !== this && c.state === 'paused') { c.release(); decodedCards.splice(decodedCards.indexOf(c), 1); }
      }
    }

    release() {
      this.gen++;
      for (const m of this.models) { m.buf = null; m.p = null; m.bytes = null; }
      this.refreshLoadUI();
    }

    // ---------- transport
    position() {
      const p = this.state === 'playing' ? audioCtx().currentTime - this.startedAt : this.offset;
      return clamp(p, 0, this.dur);
    }

    toggle() {
      if (this.state === 'paused') this.play(); else this.pause();
    }

    async play() {
      for (const c of [...playing]) if (c !== this) c.pause();
      this.pending = null;
      this.setState('loading');
      const c = audioCtx();
      const resumed = c.state === 'running' ? null : c.resume(); // must be called inside the user gesture
      try {
        if (resumed) await resumed;
        while (!this.byId[this.active].buf) {
          await this.load(this.active);
          if (this.state !== 'loading') return; // paused while loading
        }
      } catch (err) { this.fail(err); return; }
      if (this.state !== 'loading') return;
      this.noteDecoded();
      this.startedAt = c.currentTime - this.offset;
      this.cur = this.spawn(this.active, this.offset, FADE_IN);
      this.setState('playing');
      playing.add(this);
      kick();
      this.loadRest();
    }

    pause() {
      if (this.state === 'playing') {
        this.offset = this.position();
        if (this.cur) this.retire(this.cur, 0.02);
        this.cur = null;
      }
      this.pending = null;
      playing.delete(this);
      this.setState('paused');
      this.ui();
    }

    finish() {
      if (this.cur) this.retire(this.cur, 0.005);
      this.cur = null;
      this.offset = 0;
      playing.delete(this);
      this.setState('paused');
      this.ui();
    }

    tick() {
      if (this.position() >= this.dur - 0.03) { this.finish(); return; }
      this.ui();
    }

    spawn(id, pos, fade) {
      const c = audioCtx();
      const src = c.createBufferSource();
      src.buffer = this.byId[id].buf;
      const g = c.createGain();
      src.connect(g).connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + fade);
      src.start(t, clamp(pos, 0, this.dur - 0.001));
      return { id, src, g };
    }

    retire(voice, fade) {
      const t = audioCtx().currentTime;
      voice.g.gain.cancelScheduledValues(t);
      voice.g.gain.setValueAtTime(voice.g.gain.value, t);
      voice.g.gain.linearRampToValueAtTime(0, t + fade);
      voice.src.stop(t + fade + 0.02);
      voice.src.onended = () => voice.g.disconnect();
    }

    /** Continue playback at `pos` with model `id`, crossfading from whatever is sounding now. */
    retarget(id, pos) {
      const old = this.cur;
      this.startedAt = audioCtx().currentTime - pos;
      this.cur = this.spawn(id, pos, XFADE);
      if (old) this.retire(old, XFADE);
    }

    seek(t) {
      t = clamp(t, 0, this.dur);
      if (this.state === 'playing') this.retarget(this.cur ? this.cur.id : this.active, t);
      else this.offset = t;
      this.ui();
    }

    select(id) {
      Card.last = this;
      if (id === this.active) return;
      this.active = id;
      const m = this.byId[id];
      for (const [mid, btn] of Object.entries(this.btns)) btn.setAttribute('aria-pressed', String(mid === id));
      for (const [mid, img] of Object.entries(this.imgs)) img.classList.toggle('is-on', mid === id);
      this.chipDot.style.setProperty('--c', m.color);
      this.chipLbl.textContent = chipText(m);
      this.refreshNote();

      if (this.state !== 'playing') return;
      if (m.buf) {
        this.pending = null;
        this.retarget(id, this.position());
      } else {
        // not decoded yet: keep the current model sounding and switch the moment it is ready
        this.pending = id;
        this.load(id).then(() => {
          if (this.pending === id && this.state === 'playing') {
            this.pending = null;
            this.retarget(id, this.position());
          }
        }).catch((err) => this.fail(err));
      }
    }
  }

  // ------------------------------------------------------------------ render
  const cards = [];
  DEMO.sections.forEach((sec, i) => {
    const groups = sec.groups.map((g) => {
      const list = g.items.map((it) => { const c = new Card(it); cards.push(c); return c.el; });
      return h('div', { class: 'group', id: g.title ? g.id : null },
        g.title ? h('div', { class: 'group-head' }, h('h3', {}, g.title), g.intro ? h('p', { html: g.intro }) : null) : null,
        h('div', { class: 'cards' }, list));
    });
    root.append(h('section', { class: 'dataset', id: sec.id },
      h('div', { class: 'wrap' },
        h('div', { class: 'dataset-head' },
          h('span', { class: 'eyebrow' }, `Section ${String(i + 1).padStart(2, '0')}`),
          h('h2', {}, sec.title),
          h('p', { class: 'lede', html: sec.intro })),
        groups)));
  });

  // fetch the first model of each clip once it is near the viewport so Play starts instantly
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.__card.prefetch(); io.unobserve(en.target); }
    }, { rootMargin: '300px' });
    cards.forEach((c) => io.observe(c.el));
  }

  // ------------------------------------------------------------------ keyboard
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
    const card = (t.closest && t.closest('.card') && t.closest('.card').__card) || Card.last;
    if (!card) return;
    const onButton = t.closest && t.closest('button, a');
    if (e.key === ' ') {
      if (onButton) return; // native activation
      e.preventDefault();
      Card.last = card;
      card.toggle();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (t.closest && t.closest('a')) return;
      e.preventDefault();
      Card.last = card;
      card.seek(card.position() + (e.key === 'ArrowRight' ? 5 : -5));
    } else if (/^[1-9]$/.test(e.key)) {
      const m = card.models[Number(e.key) - 1];
      if (m && !card.isHidden(m)) { e.preventDefault(); card.select(m.id); }
    }
  });

  // ------------------------------------------------------------------ nav + banner
  const links = [...document.querySelectorAll('.topnav a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  const spy = () => {
    const y = window.innerHeight * 0.35;
    let cur = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < y) cur = i; });
    links.forEach((a, i) => (i === cur ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  if (location.protocol === 'file:') {
    const b = h('div', { class: 'banner', role: 'note', html:
      'Audio can’t load from a <code>file://</code> page. Run <code>python3 -m http.server 8000</code> in this folder and open <code>http://localhost:8000</code>.' });
    document.querySelector('.guide .wrap').prepend(b);
  }
})();
