(() => {
  'use strict';

  const STORE_KEY = 'purrfect-match-v1';
  const view = document.getElementById('view');
  const overlay = document.getElementById('overlay-root');
  const byId = Object.fromEntries(CATS.map(c => [c.id, c]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp01 = n => Math.max(0, Math.min(1, n));
  const html = str => { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; };

  const ICONS = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.7 1.1 5.2 3 1.5-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 11v6M12 7.2v.1"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-7.5a1 1 0 000-1.8L3.4 3.6a.9.9 0 00-1.3 1l1.9 6.4L13 12l-9 1 -1.9 6.4a.9.9 0 001.3 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
  };

  // ---------- State (kept in this browser only) ----------

  const defaultState = () => ({
    me: {
      name: 'Mr. Whiskers', age: 3, breed: 'Domestic Shorthair', coat: 'orange', pattern: 'tabby', eyes: 'green', accessory: 'bowtie',
      bio: 'Professional napper. Amateur bird watcher. Will share my sunbeam with the right cat.',
    },
    settings: { maxDistance: 25 },
    decisions: {}, // catId -> 'like' | 'nope' | 'super'
    history: [],   // [{ id, kind }] in swipe order, for undo
    matches: {},   // catId -> { at, seen }
    chats: {},     // catId -> [{ from: 'me' | 'them', text, at }]
  });

  let state = load();
  const typing = {};

  function load() {
    const d = defaultState();
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.me) return { ...d, ...s, me: { ...d.me, ...s.me }, settings: { ...d.settings, ...s.settings } };
    } catch { /* storage unavailable or corrupt: start fresh */ }
    return d;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode: keep going in memory */ }
  }

  const meAsCat = () => ({ ...state.me, id: 'me', photos: [{ bg: 'peach', acc: state.me.accessory }] });

  // ---------- Routing ----------

  function route() {
    let [name, arg] = location.hash.slice(1).split('/');
    if (name === 'chat' && !(byId[arg] && state.matches[arg])) name = 'matches';
    if (!['discover', 'matches', 'chat', 'profile'].includes(name)) name = 'discover';

    document.body.dataset.view = name;
    document.querySelectorAll('.tabbar a').forEach(a => {
      const active = a.dataset.tab === (name === 'chat' ? 'matches' : name);
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    closeOverlay();
    view.scrollTop = 0;

    if (name === 'matches') renderMatches();
    else if (name === 'chat') renderChat(arg);
    else if (name === 'profile') renderProfile();
    else renderDiscover();
    updateBadge();
  }

  function updateBadge() {
    const n = Object.values(state.matches).filter(m => !m.seen).length;
    const badge = $('#badge');
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  // ---------- Discover ----------

  const deck = () => CATS.filter(c => !state.decisions[c.id] && c.distance <= state.settings.maxDistance);

  function renderDiscover() {
    view.innerHTML = `
      <section class="discover">
        <div class="deck" id="deck"></div>
        <div class="actions">
          <button class="act small undo" data-act="undo" aria-label="Undo last swipe" title="Undo (Z)">${ICONS.undo}</button>
          <button class="act nope" data-act="nope" aria-label="Nope" title="Nope (←)">${ICONS.x}</button>
          <button class="act small super" data-act="super" aria-label="Super like" title="Super like (↑)">${ICONS.star}</button>
          <button class="act like" data-act="like" aria-label="Like" title="Like (→)">${ICONS.heart}</button>
        </div>
      </section>`;
    $('.actions').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (btn) act(btn.dataset.act);
    });
    $('#deck').addEventListener('click', e => {
      if (e.target.closest('[data-empty="again"]')) meetAgain();
    });
    syncDeck();
  }

  function act(kind) {
    if (kind === 'undo') return undo();
    const top = deck()[0];
    if (top) decide(top, kind);
  }

  // Keeps up to three cards in the DOM; depth drives the stacked look via CSS.
  function syncDeck() {
    const el = $('#deck');
    if (!el) return;
    const cards = deck().slice(0, 3);
    el.querySelectorAll('.card:not(.leaving)').forEach(n => {
      if (!cards.some(c => c.id === n.dataset.id)) n.remove();
    });
    cards.forEach((cat, depth) => {
      let n = el.querySelector(`.card:not(.leaving)[data-id="${cat.id}"]`);
      if (!n) { n = html(cardHTML(cat)); el.appendChild(n); }
      n.style.setProperty('--depth', depth);
      n.classList.toggle('top', depth === 0);
      if (depth === 0 && !n.dataset.bound) { bindCard(n, cat); n.dataset.bound = '1'; }
    });

    const empty = $('.deck-empty', el);
    if (!cards.length && !empty) el.appendChild(html(emptyDeckHTML()));
    if (cards.length && empty) empty.remove();

    $('[data-act="undo"]').disabled = !state.history.length;
    ['nope', 'super', 'like'].forEach(k => { $(`[data-act="${k}"]`).disabled = !cards.length; });
  }

  function cardHTML(cat) {
    return `<article class="card" data-id="${cat.id}" aria-label="${esc(cat.name)}, ${cat.age}">
      <div class="photo">${catArt(cat, 0)}</div>
      <div class="bars" aria-hidden="true">${cat.photos.map((_, i) => `<span class="${i === 0 ? 'on' : ''}"></span>`).join('')}</div>
      <div class="stamp stamp-like" aria-hidden="true">Like</div>
      <div class="stamp stamp-nope" aria-hidden="true">Nope</div>
      <div class="stamp stamp-super" aria-hidden="true">Super<br>purr</div>
      <div class="card-info">
        <div>
          <h2>${esc(cat.name)} <span>${cat.age}</span></h2>
          <p>${esc(cat.breed)} · ${ICONS.pin} ${cat.distance} km away</p>
          <div class="mini-tags">${cat.tags.slice(0, 2).map(t => `<span>${esc(t)}</span>`).join('')}</div>
        </div>
        <button class="info-btn" type="button" aria-label="More about ${esc(cat.name)}">${ICONS.info}</button>
      </div>
    </article>`;
  }

  function emptyDeckHTML() {
    const sleepy = { name: 'Sleeping cat', coat: 'gray', pattern: 'tabby', eyes: 'green', photos: [{ bg: 'lilac', pose: 'happy' }] };
    return `<div class="deck-empty">
      <span class="avatar xl">${catArt(sleepy, 0, { face: true })}</span>
      <h2>That's every cat nearby</h2>
      <p class="muted">You've seen all cats within ${state.settings.maxDistance} km. Widen your search in My cat, or take another look.</p>
      <button class="btn primary" type="button" data-empty="again">Meet them again</button>
      <a class="btn outline" href="#profile">Change distance</a>
    </div>`;
  }

  function bindCard(card, cat) {
    const stamps = { like: $('.stamp-like', card), nope: $('.stamp-nope', card), super: $('.stamp-super', card) };
    let pid = null, sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0, photo = 0;

    const reset = () => {
      card.style.transform = '';
      Object.values(stamps).forEach(s => { s.style.opacity = ''; });
    };

    // Tapping the left or right half flips through photos, like the real thing.
    const tap = e => {
      const r = card.getBoundingClientRect();
      const next = photo + (e.clientX < r.left + r.width / 2 ? -1 : 1);
      if (next < 0 || next >= cat.photos.length) return;
      photo = next;
      $('.photo', card).innerHTML = catArt(cat, photo);
      card.querySelectorAll('.bars span').forEach((s, i) => s.classList.toggle('on', i === photo));
    };

    card.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('button') || !card.classList.contains('top')) return;
      pid = e.pointerId;
      card.setPointerCapture(pid);
      sx = e.clientX; sy = e.clientY; dx = dy = 0; t0 = performance.now();
      card.classList.add('dragging');
    });

    card.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.05}deg)`;
      const up = -dy > Math.abs(dx);
      stamps.like.style.opacity = up ? 0 : clamp01(dx / 90);
      stamps.nope.style.opacity = up ? 0 : clamp01(-dx / 90);
      stamps.super.style.opacity = up ? clamp01(-dy / 90) : 0;
    });

    const end = e => {
      if (e.pointerId !== pid) return;
      pid = null;
      card.classList.remove('dragging');
      if (e.type === 'pointercancel') return reset();
      if (Math.hypot(dx, dy) < 6) { reset(); return tap(e); }
      const fast = Math.abs(dx) / Math.max(1, performance.now() - t0) > 0.5;
      if (-dy > 110 && -dy > Math.abs(dx)) return decide(cat, 'super', card);
      if (dx > 110 || (dx > 40 && fast)) return decide(cat, 'like', card);
      if (dx < -110 || (dx < -40 && fast)) return decide(cat, 'nope', card);
      reset();
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);

    $('.info-btn', card).addEventListener('click', () => openDetail(cat));
  }

  function decide(cat, kind, card) {
    card = card || $(`#deck .card.top[data-id="${cat.id}"]`);
    state.decisions[cat.id] = kind;
    state.history.push({ id: cat.id, kind });

    // Super likes get a 50% chance even with cats who wouldn't normally swipe back.
    const matched = kind !== 'nope' && (cat.likesYou || (kind === 'super' && Math.random() < 0.5));
    if (matched) {
      state.matches[cat.id] = { at: Date.now(), seen: false };
      if (cat.opener) state.chats[cat.id] = [{ from: 'them', text: cat.opener, at: Date.now() }];
    }
    save();

    if (card) flyOut(card, kind);
    syncDeck();
    updateBadge();
    if (matched) setTimeout(() => showMatch(cat), 380);
  }

  function flyOut(card, kind) {
    card.classList.remove('top', 'dragging');
    card.classList.add('leaving');
    $('.stamp-' + kind, card).style.opacity = 1;
    const w = window.innerWidth + 200;
    card.style.transform = kind === 'like' ? `translate(${w}px, 60px) rotate(35deg)`
      : kind === 'nope' ? `translate(${-w}px, 60px) rotate(-35deg)`
        : `translate(0, ${-window.innerHeight - 200}px)`;
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 500);
  }

  function undo() {
    const last = state.history.pop();
    if (!last) return;
    delete state.decisions[last.id];
    delete state.matches[last.id];
    delete state.chats[last.id];
    save();
    syncDeck();
    updateBadge();

    // Slide the card back in from the side it left.
    const card = $(`#deck .card:not(.leaving)[data-id="${last.id}"]`);
    if (!card) return;
    card.style.transition = 'none';
    card.style.transform = last.kind === 'like' ? 'translate(120%, 40px) rotate(25deg)'
      : last.kind === 'nope' ? 'translate(-120%, 40px) rotate(-25deg)' : 'translateY(-120%)';
    card.getBoundingClientRect();
    card.style.transition = '';
    card.style.transform = '';
  }

  function meetAgain() {
    for (const id of Object.keys(state.decisions)) if (!state.matches[id]) delete state.decisions[id];
    state.history = state.history.filter(h => state.matches[h.id]);
    save();
    syncDeck();
  }

  // ---------- Overlays ----------

  function openOverlay(markup, bind) {
    overlay.innerHTML = markup;
    document.body.classList.add('has-overlay');
    bind(overlay.firstElementChild);
    const focusable = overlay.querySelector('button');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeOverlay() {
    overlay.innerHTML = '';
    document.body.classList.remove('has-overlay');
  }

  function showMatch(cat) {
    const bits = Array.from({ length: 16 }, () =>
      `<span style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 2).toFixed(2)}s;--r:${Math.round(Math.random() * 540)}deg">${pick(['🐾', '💖', '🐟', '✨'])}</span>`).join('');
    openOverlay(`<div class="match" role="dialog" aria-modal="true" aria-labelledby="match-title">
      <div class="confetti" aria-hidden="true">${bits}</div>
      <h2 class="match-title" id="match-title">It's a Match!</h2>
      <p>You and ${esc(cat.name)} have liked each other.</p>
      <div class="match-avatars">
        <span class="avatar xl">${catArt(meAsCat(), 0, { face: true })}</span>
        <span class="avatar xl">${catArt(cat, 0, { face: true })}</span>
      </div>
      <button class="btn primary" type="button" data-go="chat">Send a message</button>
      <button class="btn ghost-light" type="button" data-go="close">Keep swiping</button>
    </div>`, root => {
      root.addEventListener('click', e => {
        const go = e.target.closest('[data-go]');
        if (!go) return;
        closeOverlay();
        if (go.dataset.go === 'chat') location.hash = '#chat/' + cat.id;
      });
    });
  }

  function openDetail(cat, withActions = true) {
    openOverlay(`<div class="sheet-backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(cat.name)}'s profile">
        <button class="sheet-close" type="button" aria-label="Close">${ICONS.down}</button>
        <div class="sheet-photos">${cat.photos.map((_, i) => catArt(cat, i)).join('')}</div>
        <p class="photo-hint">${cat.photos.length} photos · scroll sideways</p>
        <div class="sheet-body">
          <h2>${esc(cat.name)} <span>${cat.age}</span></h2>
          <p class="muted">${esc(cat.breed)} · ${cat.distance} km away</p>
          <h3>About me</h3>
          <p>${esc(cat.bio)}</p>
          <h3>Purrsonality</h3>
          <div class="tags">${cat.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
          <h3>Looking for</h3>
          <p>${esc(cat.lookingFor)}</p>
        </div>
        ${withActions ? `<div class="sheet-actions">
          <button class="act nope" type="button" data-act="nope" aria-label="Nope">${ICONS.x}</button>
          <button class="act small super" type="button" data-act="super" aria-label="Super like">${ICONS.star}</button>
          <button class="act like" type="button" data-act="like" aria-label="Like">${ICONS.heart}</button>
        </div>` : ''}
      </div>
    </div>`, root => {
      root.addEventListener('click', e => {
        if (e.target === root || e.target.closest('.sheet-close')) return closeOverlay();
        const a = e.target.closest('[data-act]');
        if (a) { closeOverlay(); decide(cat, a.dataset.act); }
      });
    });
  }

  // ---------- Matches & chat ----------

  function emptyHTML(title, text, href, label) {
    const cat = { name: 'Waiting cat', coat: 'cream', pattern: 'solid', eyes: 'copper', photos: [{ bg: 'rose', pose: 'wink' }] };
    return `<div class="empty">
      <span class="avatar xl">${catArt(cat, 0, { face: true })}</span>
      <h2>${title}</h2><p class="muted">${text}</p>
      <a class="btn primary" href="${href}">${label}</a>
    </div>`;
  }

  function renderMatches() {
    const ids = Object.keys(state.matches).filter(id => byId[id]);
    if (!ids.length) {
      view.innerHTML = emptyHTML('No matches yet', 'Swipe right on a few cats. Someone out there thinks you’re the cat’s pyjamas.', '#discover', 'Start swiping');
      return;
    }
    const msgs = id => state.chats[id] || [];
    const lastAt = id => msgs(id).length ? msgs(id)[msgs(id).length - 1].at : state.matches[id].at;
    const fresh = ids.filter(id => !msgs(id).length).sort((a, b) => state.matches[b].at - state.matches[a].at);
    const convos = ids.filter(id => msgs(id).length).sort((a, b) => lastAt(b) - lastAt(a));

    view.innerHTML = `<section class="matches">
      <h3 class="section-label">New matches <span>${fresh.length}</span></h3>
      ${fresh.length ? `<div class="new-row">${fresh.map(id => `
        <a class="new-match ${state.matches[id].seen ? '' : 'unseen'}" href="#chat/${id}">
          <span class="avatar lg">${catArt(byId[id], 0, { face: true })}</span>
          <span>${esc(byId[id].name)}</span>
        </a>`).join('')}</div>` : '<p class="muted small">Everyone’s already in your messages. Smooth.</p>'}
      <h3 class="section-label">Messages</h3>
      ${convos.length ? `<ul class="convos">${convos.map(id => {
        const m = msgs(id)[msgs(id).length - 1];
        return `<li><a class="convo" href="#chat/${id}">
          <span class="avatar md">${catArt(byId[id], 0, { face: true })}</span>
          <span class="convo-text"><strong>${esc(byId[id].name)}</strong><span class="muted">${m.from === 'me' ? 'You: ' : ''}${esc(m.text)}</span></span>
          ${state.matches[id].seen ? '' : '<span class="dot" aria-label="Unread"></span>'}
        </a></li>`;
      }).join('')}</ul>` : '<p class="muted small">No conversations yet. Tap a new match to say hi.</p>'}
    </section>`;
  }

  function renderChat(id) {
    const cat = byId[id];
    state.matches[id].seen = true;
    save();

    view.innerHTML = `<section class="chat">
      <header class="chat-head">
        <a class="icon-btn" href="#matches" aria-label="Back to matches">${ICONS.back}</a>
        <button class="chat-who" type="button" aria-label="View ${esc(cat.name)}'s profile">
          <span class="avatar sm">${catArt(cat, 0, { face: true })}</span>
          <span><strong>${esc(cat.name)}</strong><small class="muted">${esc(cat.breed)}</small></span>
        </button>
        <button class="unmatch" type="button">Unmatch</button>
      </header>
      <div class="messages" id="msgs" aria-live="polite"></div>
      <div class="chips" id="chips"></div>
      <form class="composer" id="composer" autocomplete="off">
        <input id="msg" placeholder="Say something purrsuasive…" maxlength="300" aria-label="Message ${esc(cat.name)}">
        <button class="send" aria-label="Send">${ICONS.send}</button>
      </form>
    </section>`;

    drawMessages(id);
    $('.chat-who').addEventListener('click', () => openDetail(cat, false));
    $('.unmatch').addEventListener('click', () => {
      if (!confirm(`Unmatch ${cat.name}? Your chat will be deleted.`)) return;
      delete state.matches[id];
      delete state.chats[id];
      save();
      location.hash = '#matches';
    });
    $('#chips').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) send(id, b.textContent);
    });
    $('#composer').addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#msg');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      send(id, text);
    });
  }

  function drawMessages(id) {
    const box = $('#msgs');
    if (!box) return;
    const cat = byId[id];
    const msgs = state.chats[id] || [];
    const at = new Date(state.matches[id].at);
    const when = at.toDateString() === new Date().toDateString() ? 'today' : 'on ' + at.toLocaleDateString();
    box.innerHTML = `<p class="match-note">You matched with ${esc(cat.name)} ${when} 💘</p>`
      + msgs.map(m => `<div class="msg ${m.from}">${esc(m.text)}</div>`).join('')
      + (typing[id] ? `<div class="msg them typing" aria-label="${esc(cat.name)} is typing"><i></i><i></i><i></i></div>` : '');
    box.scrollTop = box.scrollHeight;
    $('#chips').innerHTML = msgs.some(m => m.from === 'me') ? ''
      : QUICK_REPLIES.map(q => `<button type="button">${esc(q)}</button>`).join('');
  }

  function send(id, text) {
    (state.chats[id] ||= []).push({ from: 'me', text, at: Date.now() });
    save();
    if (!typing[id]) {
      typing[id] = true;
      setTimeout(() => reply(id, text), 900 + Math.random() * 1500);
    }
    drawMessages(id);
  }

  function reply(id, text) {
    typing[id] = false;
    if (!state.matches[id]) return; // unmatched while "typing"
    const cat = byId[id];
    state.chats[id].push({ from: 'them', text: replyFor(cat, text), at: Date.now() });
    const viewing = location.hash === '#chat/' + id;
    if (!viewing) {
      state.matches[id].seen = false;
      toast(`${cat.name} replied 💬`);
    }
    save();
    updateBadge();
    if (viewing) drawMessages(id);
    else if (document.body.dataset.view === 'matches') renderMatches();
  }

  function replyFor(cat, text) {
    for (const [re, lines] of REPLIES.keywords) if (re.test(text)) return pick(lines);
    if (cat.lines && Math.random() < 0.5) return pick(cat.lines);
    return pick(REPLIES.generic);
  }

  // ---------- Profile ----------

  function renderProfile() {
    const m = state.me;
    const options = (list, val) => list.map(([v, label]) => `<option value="${v}"${v === val ? ' selected' : ''}>${label}</option>`).join('');
    view.innerHTML = `<section class="profile">
      <div class="me-card">
        <span class="avatar xl" id="me-preview">${catArt(meAsCat(), 0, { face: true })}</span>
        <div><h2 id="me-name">${esc(m.name)}</h2><p class="muted small">This is how other cats see you. Changes save automatically.</p></div>
      </div>
      <form class="form" id="me-form">
        <fieldset>
          <legend>Your cat</legend>
          <label>Name<input name="name" value="${esc(m.name)}" maxlength="24"></label>
          <div class="row">
            <label class="narrow">Age<input name="age" type="number" min="0" max="25" value="${m.age}"></label>
            <label>Breed<input name="breed" value="${esc(m.breed)}" maxlength="30"></label>
          </div>
          <div class="row">
            <label>Coat<select name="coat">${options(CAT_STYLE.coats, m.coat)}</select></label>
            <label>Pattern<select name="pattern">${options(CAT_STYLE.patterns, m.pattern)}</select></label>
          </div>
          <div class="row">
            <label>Eyes<select name="eyes">${options(CAT_STYLE.eyes, m.eyes)}</select></label>
            <label>Accessory<select name="accessory">${options(CAT_STYLE.accessories, m.accessory)}</select></label>
          </div>
          <label>Bio<textarea name="bio" rows="3" maxlength="160">${esc(m.bio)}</textarea></label>
        </fieldset>
        <fieldset>
          <legend>Discovery</legend>
          <label class="range"><span>Maximum distance <output id="dist-out">${state.settings.maxDistance} km</output></span>
            <input name="maxDistance" type="range" min="1" max="50" value="${state.settings.maxDistance}"></label>
        </fieldset>
      </form>
      <fieldset class="demo-zone">
        <legend>Demo</legend>
        <p class="muted small">All profiles are mock data. Your swipes, matches and chats are stored only in this browser.</p>
        <button class="btn outline danger" type="button" id="reset">Reset demo</button>
      </fieldset>
    </section>`;

    const form = $('#me-form');
    form.addEventListener('input', () => {
      const f = new FormData(form);
      Object.assign(state.me, {
        name: f.get('name').trim() || 'Nameless Cat',
        age: Math.max(0, Math.min(25, parseInt(f.get('age'), 10) || 0)),
        breed: f.get('breed').trim(),
        coat: f.get('coat'), pattern: f.get('pattern'), eyes: f.get('eyes'), accessory: f.get('accessory'),
        bio: f.get('bio').trim(),
      });
      state.settings.maxDistance = Number(f.get('maxDistance'));
      save();
      $('#dist-out').textContent = `${state.settings.maxDistance} km`;
      $('#me-name').textContent = state.me.name;
      $('#me-preview').innerHTML = catArt(meAsCat(), 0, { face: true });
    });
    $('#reset').addEventListener('click', () => {
      if (!confirm('Reset all swipes, matches, chats and your profile?')) return;
      state = defaultState();
      save();
      toast('Demo reset');
      location.hash = '#discover';
    });
  }

  // ---------- Misc ----------

  let toastTimer;
  function toast(text) {
    let t = $('.toast');
    if (!t) { t = html('<div class="toast" role="status"></div>'); document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.firstElementChild) return closeOverlay();
    if (overlay.firstElementChild || document.body.dataset.view !== 'discover' || e.target.closest('input, textarea, select')) return;
    const kind = { ArrowLeft: 'nope', ArrowRight: 'like', ArrowUp: 'super', z: 'undo', Z: 'undo' }[e.key];
    if (kind) { e.preventDefault(); act(kind); }
  });

  window.addEventListener('hashchange', route);
  route();
})();
