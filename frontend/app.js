// app.js — Main todo app logic
// Vanilla JS, no frameworks, no bundlers.

// ── Config ──────────────────────────────────────────────────────────────────
// Set window.CHECKMARK_API_URL before this script loads to override in production.
// e.g. <script>window.CHECKMARK_API_URL = 'https://your-api.railway.app';</script>
const API_URL = window.CHECKMARK_API_URL || 'http://localhost:8000';

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  todos:         [],    // full list from API
  filter:        'all', // 'all' | 'low' | 'medium' | 'high'
  editingId:     null,  // null = add mode, number = edit mode
  chaosActive:   false,
  chaosSnapshot: [],    // todo order captured before shuffle
};

// ── Auth ─────────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('checkmark-token');
}

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
        ...(opts.headers || {}),
      },
    });
  } catch (_) {
    showToast('Network error — check your connection.', 'error');
    return null;
  }

  if (res.status === 401) {
    localStorage.removeItem('checkmark-token');
    window.location.replace('login.html');
    return null;
  }

  return res;
}

async function loadTodos() {
  const res = await apiFetch('/todos');
  if (!res || !res.ok) return;
  state.todos = await res.json();
}

async function apiCreateTodo(data) {
  const res = await apiFetch('/todos', { method: 'POST', body: JSON.stringify(data) });
  if (!res || !res.ok) return null;
  return res.json();
}

async function apiUpdateTodo(id, data) {
  const res = await apiFetch('/todos/' + id, { method: 'PUT', body: JSON.stringify(data) });
  if (!res || !res.ok) return null;
  return res.json();
}

async function apiCompleteTodo(id) {
  const res = await apiFetch('/todos/' + id + '/complete', { method: 'PATCH' });
  if (!res || !res.ok) return null;
  return res.json();
}

async function apiDeleteTodo(id) {
  const res = await apiFetch('/todos/' + id, { method: 'DELETE' });
  return res && res.ok;
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function getFiltered() {
  if (state.filter === 'all') return state.todos;
  return state.todos.filter(t => t.priority === state.filter);
}

function renderAll() {
  renderTodos();
  updateProgressBar();
}

function renderTodos() {
  const list    = document.getElementById('todo-list');
  const empty   = document.getElementById('empty-state');
  const visible = getFiltered();

  if (visible.length === 0) {
    list.innerHTML = '';
    updateEmptyState();
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = visible.map(todoCardHTML).join('');
  bindCardEvents();
}

// Escape user-supplied text — prevents XSS
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Each hour highlights a different letter + color for ~5s when you save a todo
// Index = hour (0 = midnight, 13 = 1pm red E's, etc.)
const HOUR_HIGHLIGHTS = [
  { letter: 'a', color: '#f97316' }, { letter: 'b', color: '#7c3aed' },
  { letter: 'c', color: '#0891b2' }, { letter: 'd', color: '#16a34a' },
  { letter: 'e', color: '#ca8a04' }, { letter: 'f', color: '#db2777' },
  { letter: 'g', color: '#2563eb' }, { letter: 'h', color: '#0d9488' },
  { letter: 'i', color: '#9333ea' }, { letter: 'j', color: '#ea580c' },
  { letter: 'k', color: '#4f46e5' }, { letter: 'l', color: '#059669' },
  { letter: 'm', color: '#be123c' }, { letter: 'e', color: '#e11d48' },
  { letter: 'n', color: '#f59e0b' }, { letter: 'o', color: '#8b5cf6' },
  { letter: 'p', color: '#14b8a6' }, { letter: 'q', color: '#ef4444' },
  { letter: 'r', color: '#3b82f6' }, { letter: 's', color: '#22c55e' },
  { letter: 't', color: '#f472b6' }, { letter: 'u', color: '#a855f7' },
  { letter: 'v', color: '#06b6d4' }, { letter: 'w', color: '#7c3aed' },
];

function getHourHighlight() {
  return HOUR_HIGHLIGHTS[new Date().getHours()];
}

function formatHourLabel(h) {
  return (h % 12 || 12) + (h >= 12 ? 'pm' : 'am');
}

function updateHourHint() {
  const el = document.getElementById('hour-hint');
  if (!el) return;
  const h = new Date().getHours();
  const { letter, color } = getHourHighlight();
  el.innerHTML =
    `This hour loves <span style="color:${color};font-weight:800;">${letter.toUpperCase()}</span>'s · ${formatHourLabel(h)}`;
}

function buildTitleHTML(title, highlight = false) {
  const foodEmoji = foodEmojiFor(title);
  const foodSpan  = foodEmoji
    ? `<span class="food-emoji" title="Food detected!">${foodEmoji}</span>`
    : '';

  if (!highlight) return esc(title) + foodSpan;

  const { letter, color } = getHourHighlight();
  const safe            = letter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const html            = esc(title).replace(
    new RegExp(safe, 'gi'),
    m => `<span class="hour-flash-char" style="color:${color}">${m}</span>`
  );
  return html + foodSpan;
}

function flashHourLetter(todoId, title) {
  const { letter } = getHourHighlight();
  if (!new RegExp(letter, 'i').test(title)) return;

  requestAnimationFrame(() => {
    const el = document.querySelector(`.todo-card[data-id="${todoId}"] .todo-title`);
    if (!el) return;
    el.innerHTML = buildTitleHTML(title, true);
    setTimeout(() => { el.innerHTML = buildTitleHTML(title, false); }, 5000);
  });
}

const FOOD_EMOJI = {
  pizza: '🍕', burger: '🍔', taco: '🌮', sushi: '🍣', ramen: '🍜', pasta: '🍝',
  salad: '🥗', soup: '🍲', sandwich: '🥪', bagel: '🥯', donut: '🍩', cake: '🍰',
  cookie: '🍪', bread: '🍞', rice: '🍚', chicken: '🍗', steak: '🥩', fish: '🐟',
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', strawberry: '🍓',
  blueberry: '🫐', mango: '🥭', peach: '🍑', watermelon: '🍉', pineapple: '🍍',
  carrot: '🥕', broccoli: '🥦', tomato: '🍅', potato: '🥔', avocado: '🥑',
  coffee: '☕', tea: '🍵', milk: '🥛', cheese: '🧀', egg: '🥚', bacon: '🥓',
  waffle: '🧇', pancake: '🥞', cereal: '🥣', noodle: '🍜', burrito: '🌯',
  hotdog: '🌭', fries: '🍟', popcorn: '🍿', candy: '🍬', chocolate: '🍫',
  'ice cream': '🍦', yogurt: '🥛', dumpling: '🥟', shrimp: '🦐', crab: '🦀',
  lobster: '🦞', oyster: '🦪', kebab: '🍢', bento: '🍱',
  brunch: '🥞', lunch: '🥪', dinner: '🍽️', breakfast: '🥐', snack: '🍿',
  food: '🍽️', eat: '😋', hungry: '🤤', restaurant: '🍽️', cafe: '☕',
  bakery: '🥐', grocery: '🛒', baking: '🧁', bbq: '🍖', grill: '🔥',
  smoothie: '🥤', juice: '🧃', wine: '🍷', beer: '🍺', cocktail: '🍹',
  peanut: '🥜', almond: '🌰', honey: '🍯', curry: '🍛',
};

function foodEmojiFor(title) {
  const lower = title.toLowerCase();
  for (const [word, emoji] of Object.entries(FOOD_EMOJI)) {
    if (lower.includes(word)) return emoji;
  }
  return null;
}

const ACTION_VERBS = [
  'run', 'walk', 'buy', 'call', 'send', 'write', 'read', 'clean', 'wash', 'fix',
  'build', 'make', 'go', 'email', 'text', 'study', 'work', 'exercise', 'practice',
  'play', 'drive', 'meet', 'visit', 'pay', 'order', 'shop', 'plan', 'submit',
  'finish', 'start', 'begin', 'learn', 'teach', 'help', 'move', 'pack', 'fold',
  'sort', 'file', 'print', 'upload', 'download', 'install', 'update', 'remove',
  'add', 'create', 'edit', 'draw', 'paint', 'sing', 'dance', 'jump', 'swim', 'bike',
  'hike', 'climb', 'lift', 'stretch', 'meditate', 'volunteer', 'return', 'ship',
  'mail', 'share', 'publish', 'record', 'cut', 'trim', 'mow', 'rake', 'sweep',
  'vacuum', 'dust', 'scrub', 'polish', 'iron', 'sew', 'repair', 'organize',
  'declutter', 'recycle', 'plant', 'water', 'harvest', 'bake', 'grill', 'fry',
  'boil', 'steam', 'chop', 'slice', 'mix', 'stir', 'pour', 'serve', 'feed',
  'pick', 'drop', 'deliver', 'fetch', 'grab', 'throw', 'catch', 'kick', 'push',
  'pull', 'carry', 'drag', 'lift', 'open', 'close', 'lock', 'unlock', 'knock',
  'ring', 'book', 'schedule', 'cancel', 'confirm', 'reply', 'answer', 'ask',
];

function hasActionVerb(title) {
  const lower = title.toLowerCase();
  return ACTION_VERBS.some(v => {
    const re = new RegExp('\\b' + v + '(?:s|ed|ing)?\\b', 'i');
    return re.test(lower);
  });
}

function jumpCard(todoId) {
  requestAnimationFrame(() => {
    const card = document.querySelector(`.todo-card[data-id="${todoId}"]`);
    if (!card) return;
    card.classList.add('card-jump');
    setTimeout(() => card.classList.remove('card-jump'), 500);
  });
}

function todoCardHTML(todo) {
  const done = todo.completed;

  const checkboxStyle = done
    ? 'background-color:var(--accent);border:none;'
    : 'border:2px solid var(--border);background:transparent;';

  const checkIcon = done
    ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"
            stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
         <path d="M2 6l3 3 5-5"/>
       </svg>`
    : '';

  const titleStyle = done ? 'text-decoration:line-through;opacity:0.4;' : '';
  const mutedStyle = done ? 'opacity:0.4;' : '';

  const pillClass  = 'pill-' + todo.priority;
  const pillLabel  = todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1);

  const descHTML = todo.description
    ? `<p class="text-xs mt-0.5 truncate" style="color:var(--text-muted);${mutedStyle}">${esc(todo.description)}</p>`
    : '';

  const titleHTML = buildTitleHTML(todo.title);

  return `
    <div class="todo-card flex items-center gap-3 px-4 py-3.5 rounded-xl"
         style="background:var(--bg-card);border:1px solid var(--border);"
         data-id="${todo.id}">

      <button class="checkbox-btn w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
              style="${checkboxStyle}${done ? 'cursor:default;' : 'cursor:pointer;'}"
              data-id="${todo.id}"
              aria-label="${done ? 'Completed' : 'Mark complete'}"
              ${done ? 'disabled' : ''}>
        ${checkIcon}
      </button>

      <div class="flex-1 min-w-0">
        <p class="todo-title text-sm font-medium truncate" style="color:var(--text-primary);${titleStyle}">${titleHTML}</p>
        ${descHTML}
      </div>

      <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${pillClass}">${pillLabel}</span>

      <div class="todo-actions flex items-center gap-0.5 flex-shrink-0">
        <button class="edit-btn p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style="color:var(--text-muted);"
                data-id="${todo.id}" title="Edit" aria-label="Edit">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11.5 2.5l2 2-8.5 8.5H3v-2L11.5 2.5z"/>
          </svg>
        </button>
        <button class="delete-btn p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                style="color:var(--text-muted);"
                data-id="${todo.id}" title="Delete" aria-label="Delete">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 4h10M6 4V3h4v1M4 4l1 9h6l1-9"/>
          </svg>
        </button>
      </div>
    </div>`;
}

function bindCardEvents() {
  // Checkbox — only active on incomplete todos
  document.querySelectorAll('.checkbox-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => handleToggleComplete(+btn.dataset.id));
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(+btn.dataset.id));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(+btn.dataset.id));
  });

  // Show / hide action buttons on hover (desktop)
  document.querySelectorAll('.todo-card').forEach(card => {
    const actions = card.querySelector('.todo-actions');
    if (!actions) return;
    card.addEventListener('mouseenter', () => { actions.style.opacity = '1'; });
    card.addEventListener('mouseleave', () => { actions.style.opacity = ''; });
  });
}

function updateEmptyState() {
  const emoji = document.getElementById('empty-emoji');
  const title = document.getElementById('empty-title');
  const sub   = document.getElementById('empty-sub');

  if (state.filter === 'all') {
    emoji.textContent = '✨';
    title.textContent = 'All clear!';
    sub.textContent   = 'Add a todo to start winning the day.';
  } else {
    emoji.textContent = '🔍';
    title.textContent = 'No ' + state.filter + ' priority todos.';
    sub.textContent   = 'Try a different filter or add one.';
  }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function updateProgressBar() {
  const total = state.todos.length;
  const done  = state.todos.filter(t => t.completed).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById('progress-label').textContent =
    total === 0 ? 'No todos yet' : `${done} of ${total} complete`;
  document.getElementById('progress-pct').textContent =
    total === 0 ? '' : pct + '%';

  const fill = document.getElementById('progress-fill');
  fill.style.width = pct + '%';

  if (pct === 100 && total > 0) {
    fill.classList.remove('wiggle');
    void fill.offsetWidth;          // force reflow to restart animation
    fill.classList.add('wiggle');
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(todoId = null) {
  state.editingId = todoId;

  const titleEl  = document.getElementById('form-title');
  const descEl   = document.getElementById('form-desc');
  const prioEl   = document.getElementById('form-priority');
  const errorEl  = document.getElementById('form-error');

  if (todoId !== null) {
    const todo = state.todos.find(t => t.id === todoId);
    if (!todo) return;
    document.getElementById('modal-heading').textContent = 'Edit todo';
    titleEl.value = todo.title;
    descEl.value  = todo.description || '';
    prioEl.value  = todo.priority;
  } else {
    document.getElementById('modal-heading').textContent = 'Add todo';
    titleEl.value = '';
    descEl.value  = '';
    prioEl.value  = 'low';
  }

  errorEl.textContent = '';
  errorEl.classList.add('hidden');

  const backdrop = document.getElementById('modal-backdrop');
  backdrop.style.display = 'flex';
  requestAnimationFrame(() => titleEl.focus());
}

function closeModal() {
  document.getElementById('modal-backdrop').style.display = 'none';
  state.editingId = null;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title    = document.getElementById('form-title').value.trim();
  const desc     = document.getElementById('form-desc').value.trim();
  const priority = document.getElementById('form-priority').value;
  const errorEl  = document.getElementById('form-error');

  if (!title) {
    errorEl.textContent = 'A title is required.';
    errorEl.classList.remove('hidden');
    document.getElementById('form-title').focus();
    return;
  }

  errorEl.classList.add('hidden');
  const data = { title, priority };
  if (desc) data.description = desc;

  if (state.editingId !== null) {
    const updated = await apiUpdateTodo(state.editingId, data);
    if (updated) {
      const idx = state.todos.findIndex(t => t.id === state.editingId);
      if (idx !== -1) state.todos[idx] = updated;
      exitChaos();
      closeModal();
      renderAll();
      checkTitleEffects(title, updated.id);
      return;
    }
  } else {
    const created = await apiCreateTodo(data);
    if (created) {
      state.todos.unshift(created);
      exitChaos();
      closeModal();
      renderAll();
      checkTitleEffects(title, created.id);
      return;
    }
  }

  closeModal();
  renderAll();
}

function checkTitleEffects(title, todoId) {
  checkEasterEgg(title);

  const food = foodEmojiFor(title);
  if (food) emojiParade([food, food, food, '😋']);

  flashHourLetter(todoId, title);

  if (hasActionVerb(title)) jumpCard(todoId);
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function handleToggleComplete(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo || todo.completed) return;

  // Optimistic update — render immediately for snappy feel
  todo.completed = true;
  renderAll();

  // Sparkle at the checkbox position
  const checkboxEl = document.querySelector(`.checkbox-btn[data-id="${id}"]`);
  if (checkboxEl) sparkle(checkboxEl);

  const result = await apiCompleteTodo(id);
  if (!result) {
    // Revert if API call failed
    todo.completed = false;
    renderAll();
    showToast('Could not mark todo complete.', 'error');
    return;
  }

  // All done? 🎉
  const allDone = state.todos.length > 0 && state.todos.every(t => t.completed);
  if (allDone) setTimeout(celebrate, 350);
}

async function handleDelete(id) {
  exitChaos();
  const ok = await apiDeleteTodo(id);
  if (ok) {
    state.todos = state.todos.filter(t => t.id !== id);
    renderAll();
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    // Best-effort — always clear token regardless of response
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (_) { /* swallow */ }
  localStorage.removeItem('checkmark-token');
  window.location.replace('index.html');
}

// ── Filter ────────────────────────────────────────────────────────────────────
function setFilter(value) {
  state.filter = value;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === value);
  });
  renderTodos();
}

// ── Sparkle — particle burst on checkbox completion ───────────────────────────
function sparkle(el) {
  const rect   = el.getBoundingClientRect();
  const cx     = rect.left + rect.width  / 2;
  const cy     = rect.top  + rect.height / 2;
  const colors = ['#f97316', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
  const count  = 10;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist  = 28 + Math.random() * 18;
    const dx    = Math.cos(angle) * dist;
    const dy    = Math.sin(angle) * dist;
    const size  = 5 + Math.random() * 4;

    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position:      'fixed',
      left:          cx + 'px',
      top:           cy + 'px',
      width:         size + 'px',
      height:        size + 'px',
      borderRadius:  '50%',
      background:    colors[i % colors.length],
      pointerEvents: 'none',
      zIndex:        '9999',
      transform:     'translate(-50%, -50%)',
      opacity:       '1',
      transition:    'transform 0.45s ease-out, opacity 0.45s ease-out',
    });
    document.body.appendChild(dot);

    // Double rAF ensures the starting state paints before the transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => {
      dot.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`;
      dot.style.opacity   = '0';
    }));

    setTimeout(() => dot.remove(), 520);
  }
}

// ── Confetti — fires when every todo is complete ───────────────────────────────
function celebrate() {
  if (typeof confetti !== 'function') return;
  const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#f97316';
  confetti({
    particleCount: 200,
    spread:        85,
    origin:        { y: 0.55 },
    colors:        [accent, '#fbbf24', '#34d399', '#60a5fa', '#f472b6'],
  });
}

// ── Easter eggs ───────────────────────────────────────────────────────────────
const EASTER_EGGS = {
  walk:   ['🐕', '🐾', '🐕', '🐾', '🐕'],
  dog:    ['🐕', '🐕', '🐕', '🐾'],
  gym:    ['💪', '🏋️', '💪', '🔥'],
  water:  ['💧', '🌊', '💧', '🌊'],
  coffee: ['☕', '☕', '☕', '✨'],
  pizza:  ['🍕', '🍕', '🍕', '😋'],
  sleep:  ['😴', '💤', '🌙', '💤'],
  read:   ['📚', '📖', '✨', '📚'],
  cook:   ['🍳', '👨‍🍳', '🍴', '🍳'],
  email:  ['📧', '📨', '📬', '📧'],
  clean:  ['🧹', '✨', '🧹', '✨'],
  grass:  ['🌿', '🌱', '☀️', '🌿'],
  run:    ['🏃', '💨', '🏃', '💨'],
  music:  ['🎵', '🎶', '🎵', '🎸'],
  shop:   ['🛒', '🛍️', '🛒', '💳'],
};

function checkEasterEgg(title) {
  const lower = title.toLowerCase();
  for (const [keyword, emojis] of Object.entries(EASTER_EGGS)) {
    if (lower.includes(keyword)) {
      emojiParade(emojis);
      return; // only trigger once per save
    }
  }
}

function emojiParade(emojis) {
  emojis.forEach((emoji, i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.textContent = emoji;
      const topVh = 20 + Math.random() * 55;
      Object.assign(el.style, {
        position:      'fixed',
        top:           topVh + 'vh',
        left:          '-70px',
        fontSize:      '2rem',
        zIndex:        '9998',
        pointerEvents: 'none',
        userSelect:    'none',
        transition:    'left 1.8s linear',
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.left = 'calc(100vw + 70px)';
      }));
      setTimeout(() => el.remove(), 2000);
    }, i * 220);
  });
}

// ── Chaos mode ────────────────────────────────────────────────────────────────
function toggleChaos() {
  state.chaosActive ? undoChaos() : applyChaos();
}

function applyChaos() {
  state.chaosActive   = true;
  state.chaosSnapshot = [...state.todos];

  document.body.classList.add('chaos-mode');

  // Shuffle display order
  state.todos = [...state.todos].sort(() => Math.random() - 0.5);
  renderTodos();

  const chaosEmojis = ['🎲', '🌀', '👻', '🤪', '✨', '🔀', '💫', '🃏'];

  document.querySelectorAll('.todo-card').forEach(card => {
    const rot = (Math.random() - 0.5) * 18;
    const tx  = (Math.random() - 0.5) * 28;
    const ty  = (Math.random() - 0.5) * 12;
    const hue = Math.floor(Math.random() * 360);
    card.style.transition = 'transform 0.35s ease, box-shadow 0.35s ease, filter 0.35s ease';
    card.style.transform  = `rotate(${rot}deg) translate(${tx}px, ${ty}px) scale(${0.92 + Math.random() * 0.16})`;
    card.style.zIndex     = String(Math.floor(Math.random() * 8) + 1);
    card.style.boxShadow  = `${tx / 3}px ${Math.abs(ty) + 4}px 22px rgba(0,0,0,0.12)`;
    card.style.filter     = `hue-rotate(${hue}deg) saturate(${1.1 + Math.random() * 0.5})`;
    card.classList.add('chaos-float');
    card.style.animationDelay = (Math.random() * 1.2) + 's';
  });

  const fill = document.getElementById('progress-fill');
  if (fill) fill.classList.add('chaos-spin');

  document.getElementById('chaos-btn').textContent =
    chaosEmojis[Math.floor(Math.random() * chaosEmojis.length)];
  document.getElementById('undo-chaos-btn').classList.remove('hidden');

  if (typeof confetti === 'function') {
    confetti({ particleCount: 60, spread: 100, origin: { y: 0.7 }, ticks: 80 });
  }
}

function clearChaosVisuals() {
  document.body.classList.remove('chaos-mode');
  const fill = document.getElementById('progress-fill');
  if (fill) fill.classList.remove('chaos-spin');
  document.getElementById('chaos-btn').textContent = '🎲';
  document.getElementById('undo-chaos-btn').classList.add('hidden');
}

function undoChaos() {
  state.chaosActive = false;
  state.todos       = [...state.chaosSnapshot];
  clearChaosVisuals();
  renderTodos();
}

// Exit chaos silently (on add / edit / delete — no snapshot restore)
function exitChaos() {
  if (!state.chaosActive) return;
  state.chaosActive   = false;
  state.chaosSnapshot = [];
  clearChaosVisuals();
}

// ── PDF export ────────────────────────────────────────────────────────────────
function exportTodosPDF() {
  if (!window.jspdf) {
    showToast('PDF library not loaded.', 'error');
    return;
  }
  if (!state.todos.length) {
    showToast('Nothing to export yet.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin    = 44;
  let y           = margin;

  const done = state.todos.filter(t => t.completed).length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Checkmark — My Todos', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${new Date().toLocaleString()} · ${done} of ${state.todos.length} complete`, margin, y);
  y += 30;

  doc.setTextColor(30);
  doc.setFontSize(11);

  state.todos.forEach(todo => {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }

    const mark = todo.completed ? '✓' : '○';
    const line = `${mark}  ${todo.priority.toUpperCase()} — ${todo.title}`;
    doc.setFont('helvetica', todo.completed ? 'normal' : 'bold');
    doc.text(line, margin, y);
    y += 18;

    if (todo.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      const wrapped = doc.splitTextToSize(todo.description, 500);
      doc.text(wrapped, margin + 14, y);
      y += wrapped.length * 13 + 2;
      doc.setFontSize(11);
      doc.setTextColor(30);
    }
    y += 8;
  });

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`checkmark-todos-${date}.pdf`);
  showToast('PDF downloaded!');
}

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position:      'fixed',
    bottom:        '90px',
    left:          '50%',
    transform:     'translateX(-50%)',
    padding:       '10px 20px',
    borderRadius:  '9999px',
    fontSize:      '0.875rem',
    fontWeight:    '600',
    zIndex:        '9999',
    background:    type === 'error' ? '#fee2e2' : 'var(--bg-card)',
    color:         type === 'error' ? '#b91c1c' : 'var(--text-primary)',
    border:        '1px solid var(--border)',
    boxShadow:     '0 4px 12px rgba(0,0,0,0.12)',
    opacity:       '0',
    transition:    'opacity 0.25s ease',
    pointerEvents: 'none',
    whiteSpace:    'nowrap',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {

  // Static element bindings
  document.getElementById('add-btn')
    .addEventListener('click', () => openModal(null));

  document.getElementById('empty-add-btn')
    .addEventListener('click', () => openModal(null));

  document.getElementById('modal-close')
    .addEventListener('click', closeModal);

  document.getElementById('form-cancel')
    .addEventListener('click', closeModal);

  document.getElementById('todo-form')
    .addEventListener('submit', handleFormSubmit);

  // Close modal on backdrop click
  document.getElementById('modal-backdrop')
    .addEventListener('click', e => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

  document.getElementById('chaos-btn')
    .addEventListener('click', toggleChaos);

  document.getElementById('undo-chaos-btn')
    .addEventListener('click', undoChaos);

  document.getElementById('export-pdf-btn')
    .addEventListener('click', exportTodosPDF);

  document.getElementById('logout-btn')
    .addEventListener('click', handleLogout);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  // Keyboard shortcut: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  updateHourHint();
  setInterval(updateHourHint, 60_000);

  // Fetch todos and render
  await loadTodos();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
