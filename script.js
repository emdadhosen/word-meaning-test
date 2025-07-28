// --- DOM References ---
const htmlRoot         = document.documentElement;
const themeToggle      = document.getElementById('themeToggle');
const settingsBtn      = document.getElementById('settingsBtn');
const settingsModal    = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const correctInput     = document.getElementById('correctSoundInput');
const incorrectInput   = document.getElementById('incorrectSoundInput');

const newWordIn     = document.getElementById('newWord');
const newMeanIn     = document.getElementById('newMeaning');
const entriesList   = document.getElementById('currentEntries');
const setNameIn     = document.getElementById('setName');
const saveSetBtn    = document.getElementById('saveSetBtn');
const updateSetBtn  = document.getElementById('updateSetBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const savedSetsList = document.getElementById('savedSetsList');
const startTestBtn  = document.getElementById('startTestBtn');
const manageArea    = document.getElementById('manageArea');
const testArea      = document.getElementById('testArea');

const questionEl = document.getElementById('question');
const optionsEl  = document.getElementById('options');
const scoreEl    = document.getElementById('score');
const pctEl      = document.getElementById('pct');
const endTestBtn = document.getElementById('endTestBtn');

const playWordBtn = document.getElementById('playWordBtn');

// --- State & Audio ---
let entries        = [];
let editingSet     = null;
let pool           = [];
let idx            = 0;
let correct        = 0;
let wrong          = 0;
let correctAudio   = null;
let incorrectAudio = null;

// --- Theme Persistence ---
const THEME_KEY = 'spellingAppTheme';
function applyTheme(theme) {
  htmlRoot.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}
themeToggle.onclick = () => {
  applyTheme(htmlRoot.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
};
applyTheme(localStorage.getItem(THEME_KEY) || 'light');

// --- Settings Modal Logic ---
settingsBtn.onclick      = () => settingsModal.classList.remove('hidden');
closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');

correctInput.onchange = e => {
  const file = e.target.files[0];
  if (file) correctAudio = new Audio(URL.createObjectURL(file));
};
incorrectInput.onchange = e => {
  const file = e.target.files[0];
  if (file) incorrectAudio = new Audio(URL.createObjectURL(file));
};

// --- Storage Helpers ---
function storageKey(name) {
  return 'wordset_' + name;
}
function getSetNames() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('wordset_'))
    .map(k => k.replace('wordset_', ''));
}

// --- Utilities ---
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function speak(word) {
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  speechSynthesis.speak(u);
}

// --- Render Current Entries ---
function renderCurrentEntries() {
  entriesList.innerHTML = '';
  entries.forEach((e, i) => {
    const li = document.createElement('li');
    li.textContent = `${e.word} — ${e.meaning}`;
    const btn = document.createElement('button');
    btn.textContent = '✖';
    btn.onclick = () => {
      entries.splice(i, 1);
      renderCurrentEntries();
    };
    li.appendChild(btn);
    entriesList.appendChild(li);
  });
}

// --- Render Saved Sets ---
function renderSavedSets() {
  savedSetsList.innerHTML = '';
  const names = getSetNames();
  if (!names.length) {
    savedSetsList.textContent = 'No saved sets yet.';
    return;
  }
  names.forEach(name => {
    const row = document.createElement('div');
    row.className = 'saved-set';

    const div = document.createElement('div');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'setSelect';
    radio.value = name;
    radio.id = 'r_' + name;
    const lbl = document.createElement('label');
    lbl.htmlFor = radio.id;
    lbl.textContent = name;
    div.append(radio, lbl);

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.onclick = () => loadSetForEdit(name);

    const renameBtn = document.createElement('button');
    renameBtn.textContent = '✏ rename';
    renameBtn.onclick = () => renameSet(name);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'delete';
    deleteBtn.onclick = () => deleteSet(name);

    row.append(div, editBtn, renameBtn, deleteBtn);
    savedSetsList.appendChild(row);
  });
}

// --- CRUD: Sets ---
function loadSetForEdit(name) {
  const data = JSON.parse(localStorage.getItem(storageKey(name)));
  entries = data.entries.slice();
  editingSet = name;
  setNameIn.value = name;
  saveSetBtn.classList.add('hidden');
  updateSetBtn.classList.remove('hidden');
  cancelEditBtn.classList.remove('hidden');
  renderCurrentEntries();
}

function renameSet(oldName) {
  const newName = prompt('New name:', oldName);
  if (!newName || newName === oldName) return;
  if (localStorage.getItem(storageKey(newName))) {
    alert('Name taken.');
    return;
  }
  const payload = localStorage.getItem(storageKey(oldName));
  localStorage.setItem(storageKey(newName), payload);
  localStorage.removeItem(storageKey(oldName));
  renderSavedSets();
}

function deleteSet(name) {
  if (!confirm(`Are you sure you want to delete set “${name}”?`)) return;
  localStorage.removeItem(storageKey(name));
  renderSavedSets();
}

// --- Save / Update Handlers ---
saveSetBtn.onclick = () => {
  const name = setNameIn.value.trim();
  if (!name) return alert('Enter set name.');
  if (!entries.length) return alert('Add entries.');
  if (localStorage.getItem(storageKey(name))) {
    alert('Name taken.');
    return;
  }
  localStorage.setItem(storageKey(name), JSON.stringify({ entries }));
  entries = [];
  setNameIn.value = '';
  renderCurrentEntries();
  renderSavedSets();
};

updateSetBtn.onclick = () => {
  const name = setNameIn.value.trim();
  if (!name) return alert('Name required.');
  if (!entries.length) return alert('Add entries.');
  if (name !== editingSet && localStorage.getItem(storageKey(name))) {
    alert('Name taken.');
    return;
  }
  if (name !== editingSet) {
    localStorage.removeItem(storageKey(editingSet));
  }
  localStorage.setItem(storageKey(name), JSON.stringify({ entries }));
  editingSet = null;
  entries = [];
  setNameIn.value = '';
  saveSetBtn.classList.remove('hidden');
  updateSetBtn.classList.add('hidden');
  cancelEditBtn.classList.add('hidden');
  renderCurrentEntries();
  renderSavedSets();
};

cancelEditBtn.onclick = () => {
  editingSet = null;
  entries = [];
  setNameIn.value = '';
  saveSetBtn.classList.remove('hidden');
  updateSetBtn.classList.add('hidden');
  cancelEditBtn.classList.add('hidden');
  renderCurrentEntries();
};

// --- Add Entry on Enter Key ---
newMeanIn.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const w = newWordIn.value.trim();
    const m = newMeanIn.value.trim();
    if (!w || !m) return alert('Both word + meaning required.');
    entries.push({ word: w, meaning: m });
    newWordIn.value = '';
    newMeanIn.value = '';
    renderCurrentEntries();
  }
});

// --- Start Test (MCQ) ---
startTestBtn.onclick = () => {
  const sel = document.querySelector('input[name="setSelect"]:checked');
  if (!sel) return alert('Select a set.');
  const data = JSON.parse(localStorage.getItem(storageKey(sel.value)));
  pool = shuffle(data.entries.slice());
  idx = 0;
  correct = 0;
  wrong = 0;
  scoreEl.textContent = 'Score: 0';
  pctEl.textContent   = '0%';
  manageArea.classList.add('hidden');
  testArea.classList.remove('hidden');
  nextQuestion();
};

// --- MCQ Logic ---
function nextQuestion()
