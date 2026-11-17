// Тюрінговий калькулятор: transition-table editor and step-by-step player.
// Program format: {"q0": {"1": "1q0R", ...}, ...} — the same as prog.json.

const STORAGE_KEY = 'data';
const BLANK = '&';
const STATUS_TEXT = {
  FINISHED: 'Машина досягла фінального стану q*.',
  NO_STATE: 'Зупинка: поточного стану немає в таблиці переходів.',
  NO_RULE: 'Зупинка: для символу під головкою немає команди.',
  STEP_LIMIT: 'Перевищено ліміт тактів — можливе зациклення.',
  INTERRUPTED: 'Виконання перервано користувачем.',
};

let q_rows = 0;
let examples = [];
let player = null; // {result, index, timer, paused}

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------- menu and views ---
const VIEWS = ['machine', 'examples', 'help'];

function toggle_menu(open = !$('menu').classList.contains('open')) {
  $('menu').classList.toggle('open', open);
  $('menu_overlay').hidden = !open;
  $('menu_button').setAttribute('aria-expanded', open);
  if (open) $('menu').querySelector('a.active, a').focus();
}

// The view is chosen by the URL hash (#machine, #examples, #help).
function show_view() {
  const name = location.hash.slice(1);
  const view = VIEWS.includes(name) ? name : 'machine';
  for (const v of VIEWS) $('view_' + v).hidden = v !== view;
  for (const a of $('menu').querySelectorAll('a')) {
    a.classList.toggle('active', a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  toggle_menu(false);
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------- table editor ---
// Unique tape symbols; the apostrophe marks the state in the input word and
// whitespace separates snapshot tokens, so neither can be a symbol.
function alphabet() {
  return [...new Set($('T').value.replace(/[\s']/g, ''))].join('');
}

function button(text, title, onclick, cls = 'icon') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.title = title;
  b.addEventListener('click', onclick);
  return b;
}

// Rows are states q0..q(n-1), columns are tape symbols.  Every structural
// change rebuilds the table from the current commands.
function generate_table(data = {}) {
  let T = alphabet();
  if (!T.includes(BLANK)) T += BLANK;
  $('T').value = T;
  q_rows = Math.max(1, parseInt($('size').value) || 1);
  $('size').value = q_rows;
  const table = document.createElement('table');
  const head = table.insertRow();
  head.appendChild(document.createElement('th'));
  for (const symbol of T) {
    const th = document.createElement('th');
    th.className = 'symbol';
    th.append(symbol);
    if (symbol !== BLANK) {
      th.append(button('×', 'Видалити символ «' + symbol + '»', () => remove_column(symbol)));
    }
    head.appendChild(th);
  }
  const add = document.createElement('th');
  add.className = 'add_column';
  const symbol_input = document.createElement('input');
  symbol_input.id = 'new_symbol';
  symbol_input.maxLength = 1;
  symbol_input.placeholder = 'a';
  symbol_input.title = 'Новий символ алфавіту';
  symbol_input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add_column(); });
  add.append(symbol_input, button('+', 'Додати стовпець', add_column));
  head.appendChild(add);

  for (let i = 0; i < q_rows; i++) {
    const tr = table.insertRow();
    const th = document.createElement('th');
    th.className = 'state';
    th.append('q' + i);
    if (i === q_rows - 1 && q_rows > 1) {
      th.append(button('×', 'Видалити стан q' + i, remove_row));
    }
    tr.appendChild(th);
    for (const symbol of T) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'q_commands__field';
      input.dataset.state = 'q' + i;
      input.dataset.symbol = symbol;
      input.addEventListener('input', () => { input.classList.remove('invalid'); save(); });
      tr.insertCell().appendChild(input);
    }
    tr.insertCell();
  }
  const foot = table.insertRow().insertCell();
  foot.colSpan = T.length + 2;
  foot.appendChild(button('+ Додати стан q' + q_rows, 'Додати рядок', add_row, 'add_row'));
  $('table').replaceChildren(table);
  fill_table(data);
  save();
}

function add_row() {
  $('size').value = q_rows + 1;
  generate_table(get_inputs());
}

// Only the last state can be removed: removing another one would rename
// the states after it and break the commands that refer to them.
function remove_row() {
  if (q_rows <= 1) return;
  const data = get_inputs();
  delete data['q' + (q_rows - 1)];
  $('size').value = q_rows - 1;
  generate_table(data);
}

function add_column() {
  const input = $('new_symbol');
  const symbol = input.value;
  let problem = '';
  if (!symbol || /[\s']/.test(symbol)) problem = 'Введіть один символ (не пробіл і не апостроф).';
  else if (alphabet().includes(symbol)) problem = 'Символ «' + symbol + '» уже є в алфавіті.';
  if (problem) {
    input.setCustomValidity(problem);
    input.reportValidity();
    input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
    return input.focus();
  }
  $('T').value = alphabet() + symbol;
  generate_table(get_inputs());
  $('new_symbol').focus();
}

function remove_column(symbol) {
  $('T').value = alphabet().replace(symbol, '');
  generate_table(get_inputs());
}

function fields() {
  return [...document.getElementsByClassName('q_commands__field')];
}

function get_inputs() {
  const data = {};
  for (const f of fields()) {
    const command = f.value.trim();
    if (command) data[f.dataset.state] = { ...data[f.dataset.state], [f.dataset.symbol]: command };
  }
  return data;
}

function fill_table(data) {
  for (const f of fields()) {
    f.value = (data[f.dataset.state] || {})[f.dataset.symbol] || '';
  }
}

// Rebuild the table so that it fits every state and symbol of `data`.
function read_from_var(data, T = $('T').value) {
  let rows = 0;
  let symbols = T;
  for (const [state, row] of Object.entries(data)) {
    const m = /^q(\d+)$/.exec(state);
    if (m) rows = Math.max(rows, +m[1] + 1);
    symbols += Object.keys(row).join('');
  }
  $('T').value = symbols;
  $('size').value = Math.max(rows, 1);
  generate_table(data);
}

// ------------------------------------------------------------- storage ---
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      T_alphavit: $('T').value, size: q_rows, data: get_inputs(),
      input: $('input_tape').value, num_steps: $('num_steps').value,
    }));
  } catch (e) { /* storage unavailable: nothing to keep */ }
}

function restore() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { /* ignore */ }
  if (!saved || !saved.data) return false;
  $('T').value = saved.T_alphavit || $('T').value;
  $('size').value = saved.size || 1;
  $('input_tape').value = saved.input ?? $('input_tape').value;
  $('num_steps').value = saved.num_steps || $('num_steps').value;
  generate_table(saved.data);
  return true;
}

// ------------------------------------------------------------ examples ---
// Small picture for an example card: the input tape (head marked with a
// pink triangle) above the tape the program leaves after it stops.
function tape_svg(input, result) {
  const NS = 'http://www.w3.org/2000/svg';
  const CELL = 18, STEP = 20, X0 = 42, MAX = 8;
  const el = (name, attrs, text) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const parts = input.split("'");
  const head = parts.length === 3 ? parts[0].length : 0;
  const word = parts.length === 3 ? parts[0] + parts[2] : input;
  const svg = el('svg', { class: 'mini', viewBox: '0 0 220 72', role: 'img',
    'aria-label': (word || BLANK) + ' → ' + (result || BLANK) });
  const row = (symbols, y, cls) => {
    let cells = [...(symbols || BLANK)];
    if (cells.length > MAX) cells = cells.slice(0, MAX - 1).concat('…');
    cells.forEach((symbol, i) => {
      svg.append(el('rect', { class: cls, x: X0 + i * STEP, y, width: CELL, height: CELL, rx: 3 }),
                 el('text', { x: X0 + i * STEP + CELL / 2, y: y + CELL / 2 }, symbol));
    });
  };
  svg.append(el('text', { class: 'label', x: 6, y: 21 }, 'вхід'),
             el('text', { class: 'label', x: 6, y: 57 }, 'вихід'),
             el('path', { class: 'arrow', d: 'M20 32 V42 M15 37 L20 43 L25 37' }));
  if (head < MAX) {
    const x = X0 + head * STEP + CELL / 2;
    svg.append(el('path', { class: 'head', d: `M${x - 5} 3 H${x + 5} L${x} 9 Z` }));
  }
  row(word, 12, 'in');
  row(result, 48, 'out');
  return svg;
}

async function load_examples() {
  try {
    const response = await fetch('/examples');
    examples = await response.json();
  } catch (e) {
    return;
  }
  for (const ex of examples) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'example_card';
    card.dataset.id = ex.id;
    const title = document.createElement('h3');
    title.textContent = ex.title;
    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = ex.description || '';
    const explanation = document.createElement('p');
    explanation.className = 'explanation';
    explanation.textContent = ex.explanation || '';
    card.append(title, tape_svg(ex.input, ex.result), description, explanation);
    card.addEventListener('click', () => apply_example(ex.id));
    $('examples').appendChild(card);
  }
}

function apply_example(id) {
  const ex = examples.find((e) => e.id === id);
  if (!ex) return;
  for (const card of $('examples').children) {
    card.classList.toggle('selected', card.dataset.id === id);
  }
  $('input_tape').value = ex.input;
  $('num_steps').value = ex.num_steps || 1000;
  read_from_var(ex.program, ex.alphabet);
  location.hash = '#machine';
  show_status('Завантажено приклад «' + ex.title + '». Натисніть «Запустити».');
}

// --------------------------------------------------------------- files ---
function from_file() {
  const file = $('file').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      read_from_var(JSON.parse(reader.result));
      show_status('Таблицю завантажено з файлу ' + file.name + '.');
    } catch (e) {
      show_status('Файл не є таблицею переходів у форматі JSON.', true);
    }
    $('file').value = '';
  };
  reader.readAsText(file);
}

function download(name, type, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); // required for firefox
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function write_and_download() {
  download('prog.json', 'application/json', JSON.stringify(get_inputs(), null, 2));
}

function save_log() {
  if (!player) return;
  const { result, index } = player;
  const lines = result.log.slice(0, index + 1).map(
    (s) => `${s.step}. ${s.tape}${s.command ? '   (' + s.command + ')' : ''}`);
  lines.push('', STATUS_TEXT[player.status] || '', 'Тактів: ' + result.log[index].step);
  download('journal.txt', 'text/plain;charset=utf-8', lines.join('\n'));
}

// ------------------------------------------------------------- running ---
function show_status(text, error = false) {
  $('status').textContent = text;
  $('status').className = error ? 'error' : text ? 'ok' : '';
}

function set_running(running) {
  $('run_button').disabled = running;
  $('pause_button').disabled = !running;
  $('stop_button').disabled = !running;
  $('finish_button').disabled = !running;
  $('pause_button').textContent = 'Пауза';
}

// Snapshot "1 1 q0 1 + 1": the state name stands before the scanned symbol.
function draw_tape(snapshot) {
  const tokens = snapshot.split(' ');
  const at = tokens.findIndex((t) => t.length > 1 && t[0] === 'q');
  const cells = tokens.filter((_, i) => i !== at).map((symbol, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = symbol;
    if (i === at) {
      cell.classList.add('head');
      cell.dataset.state = tokens[at];
    }
    return cell;
  });
  $('tape').replaceChildren(...cells);
}

// State and scanned symbol of a snapshot like "1 1 q0 1 + 1".
function scanned(snapshot) {
  const tokens = snapshot.split(' ');
  const at = tokens.findIndex((t) => t.length > 1 && t[0] === 'q');
  return { state: tokens[at], symbol: tokens[at + 1] };
}

// Mark the table cell (state, symbol) with `cls`; null clears the mark.
function highlight_cell(cls, cell = null) {
  for (const td of document.querySelectorAll('#table td.' + cls)) td.classList.remove(cls);
  if (!cell) return;
  const input = fields().find((f) => f.dataset.state === cell.state && f.dataset.symbol === cell.symbol);
  if (input) input.parentElement.classList.add(cls);
}

function show_step(i) {
  const s = player.result.log[i];
  draw_tape(s.tape);
  // the command of step i was taken from the configuration of step i - 1
  highlight_cell('active', i > 0 ? scanned(player.result.log[i - 1].tape) : null);
  const li = document.createElement('li');
  li.textContent = s.tape + (s.command ? '   (' + s.command + ')' : '');
  const prev = $('output').querySelector('.current');
  if (prev) prev.classList.remove('current');
  li.className = 'current';
  $('output').appendChild(li);
  $('output').scrollTop = $('output').scrollHeight;
  show_status('Такт ' + s.step + ' з ' + player.result.steps);
}

function tick() {
  player.timer = null;
  if (player.paused) return;
  if (player.index + 1 >= player.result.log.length) return done(player.result.status);
  show_step(++player.index);
  player.timer = setTimeout(tick, 1000 - $('speed').value);
}

function done(status) {
  clearTimeout(player.timer);
  player.status = status;
  const step = player.result.log[player.index].step;
  let text = STATUS_TEXT[status] + ' Тактів: ' + step + '.';
  if (status === 'FINISHED') text += ' Результат: ' + (player.result.tape || '(порожня стрічка)');
  show_status(text, status !== 'FINISHED');
  if (status === 'NO_RULE' || status === 'NO_STATE') {
    highlight_cell('missing', scanned(player.result.log[player.index].tape));
  }
  set_running(false);
}

async function run() {
  if (player && player.timer) clearTimeout(player.timer);
  $('output').replaceChildren();
  $('tape').replaceChildren();
  $('log_button').disabled = true;
  for (const f of fields()) f.classList.remove('invalid');
  highlight_cell('active');
  highlight_cell('missing');
  const data = get_inputs();
  if (Object.keys(data).length === 0) return show_status('Таблиця переходів порожня.', true);
  save();
  let response, result;
  try {
    response = await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: $('input_tape').value, num_steps: $('num_steps').value,
        size: q_rows, T_alphavit: $('T').value, data,
      }),
    });
    result = await response.json();
  } catch (e) {
    return show_status('Сервер недоступний.', true);
  }
  if (!response.ok) return show_status('Помилка: ' + result.error, true);
  player = { result, index: 0, timer: null, paused: false };
  $('log_button').disabled = false;
  set_running(true);
  show_step(0);
  player.timer = setTimeout(tick, 1000 - $('speed').value);
}

function toggle_pause() {
  player.paused = !player.paused;
  $('pause_button').textContent = player.paused ? 'Продовжити' : 'Пауза';
  if (!player.paused && !player.timer) tick();
}

function stop() {
  done('INTERRUPTED');
}

function finish() {
  clearTimeout(player.timer);
  while (player.index + 1 < player.result.log.length) show_step(++player.index);
  done(player.result.status);
}

// ---------------------------------------------------------------- init ---
window.addEventListener('hashchange', show_view);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('menu').classList.contains('open')) {
    toggle_menu(false);
    $('menu_button').focus();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  show_view();
  load_examples();
  for (const id of ['input_tape', 'num_steps']) $(id).addEventListener('change', save);
  if (!restore()) generate_table();
});
