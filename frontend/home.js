// home.js — Ghost todo list background animation
// Pure vanilla JS, no frameworks.

const TODOS = [
  'Walk the dog 🐕',
  'Grocery shopping',
  'Get calculus assignment done',
  'Buy screen protector',
  'Stop procrastinating on this todo app',
  'Invent excuse for being late',
  'Pretend to have it all together',
  'Reply to that email',
  'Drink more water 💧',
  'Touch grass',
  'Actually go to the gym',
  'Clean my desk (eventually)',
  'Read one chapter. Just one.',
  'Figure out what to cook tonight',
  'Not overthink this todo list',
  'Fix that bug from last week',
  'Call mum back 📞',
  'Submit the assignment already',
  'Take a proper lunch break',
  'Stop refreshing notifications',
  'Meal prep for the week 🥗',
  'Back up the laptop',
  'Cancel that free trial',
  'Finish the side project (lol)',
  'Water the plants 🌱',
];

// Tracks which TODOS indices are currently visible on screen.
// Each slot claims an index before showing it and releases it on fade-out.
const activeIndices = new Set();

// How many simultaneous ghost slots to show in the column
const SLOT_COUNT = 7;

// Probability a ghost item gets "checked" before it fades out
const CHECK_PROBABILITY = 0.3;

// Timing (ms)
const FADE_MS   = 1200;   // CSS transition duration — must match CSS
const HOLD_MIN  = 3000;
const HOLD_MAX  = 6500;
const CHECK_MS  = 1800;   // extra hold after auto-checking
const GAP_MIN   = 600;
const GAP_MAX   = 2800;
const STAGGER   = 700;    // delay between each slot starting up

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── DOM builders ───────────────────────────────────────────────────────────

// Stroke uses var(--accent) so it updates with the active theme automatically.
const CHECK_ICON = `
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
       stroke="var(--accent)" stroke-width="2.5" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5"/>
  </svg>`;

function createSlotEl() {
  const wrapper = document.createElement('div');
  wrapper.className = 'ghost-item flex items-center gap-3 text-sm font-medium w-full';
  wrapper.style.color = 'var(--text-primary)';

  const box = document.createElement('span');
  box.className = 'ghost-box w-4 h-4 rounded border-2 flex-shrink-0';
  box.style.borderColor = 'var(--border)';

  const label = document.createElement('span');
  label.className = 'ghost-label';

  wrapper.appendChild(box);
  wrapper.appendChild(label);

  return { wrapper, box, label };
}

function applyUnchecked(box, label) {
  box.className = 'ghost-box w-4 h-4 rounded border-2 flex-shrink-0';
  box.style.borderColor = 'var(--border)';
  box.style.backgroundColor = '';
  box.innerHTML = '';
  label.style.textDecoration = '';
  label.style.opacity = '';
}

function applyChecked(box, label) {
  box.className = 'ghost-box w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center';
  box.style.borderColor = 'var(--accent)';
  box.style.backgroundColor = 'var(--accent-light)';
  box.innerHTML = CHECK_ICON;
  label.style.textDecoration = 'line-through';
  label.style.opacity = '0.4';
}

// ─── Slot loop ──────────────────────────────────────────────────────────────

/**
 * Independently drives a single ghost slot:
 * fade in → hold → maybe check → fade out → gap → repeat forever.
 */
async function runSlot(wrapper, box, label, startDelay) {
  await sleep(startDelay);

  while (true) {
    // Pick a random todo not currently shown in any other slot
    let idx;
    let attempts = 0;
    do {
      idx = Math.floor(Math.random() * TODOS.length);
      attempts++;
    } while (activeIndices.has(idx) && attempts < TODOS.length * 3);

    // Claim the slot
    activeIndices.add(idx);

    // Reset to unchecked state, set text
    applyUnchecked(box, label);
    label.textContent = TODOS[idx];

    // Fade in
    wrapper.classList.add('visible');

    // Hold while visible
    await sleep(rand(HOLD_MIN, HOLD_MAX));

    // Randomly "complete" the item while it's still on screen
    if (Math.random() < CHECK_PROBABILITY) {
      applyChecked(box, label);
      await sleep(CHECK_MS);
    }

    // Fade out — release the index so another slot can reuse it
    wrapper.classList.remove('visible');
    activeIndices.delete(idx);

    // Wait for CSS fade-out to finish
    await sleep(FADE_MS);

    // Pause before this slot lights up again
    await sleep(rand(GAP_MIN, GAP_MAX));
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

function initGhostBackground() {
  const container = document.getElementById('ghost-bg');
  if (!container) return;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const { wrapper, box, label } = createSlotEl();
    container.appendChild(wrapper);

    // Stagger each slot so they never all fire at the same moment
    const startDelay = i * rand(STAGGER * 0.6, STAGGER * 1.4);
    runSlot(wrapper, box, label, startDelay);
  }
}

document.addEventListener('DOMContentLoaded', initGhostBackground);
