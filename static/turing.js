// Deterministic single-tape Turing machine — a JavaScript port of turing.py,
// so programs run in the browser without the server (offline).  Keep the two
// in sync: same validation, messages, statuses and result format.
//
// A program is a transition table {state: {symbol: command}}, where a command
// is a string "<symbol to write><new state><move>", e.g. "1q0R": write 1, go
// to state q0, move the head right.  Moves: L (left), R (right), N (stay).
// "&" is the blank symbol and "q*" is the final state.

const Turing = (() => {
  const BLANK = '&';
  const START = 'q0';
  const FINAL = 'q*';
  const MOVES = { L: -1, R: 1, N: 0 };

  class ProgramError extends Error {}

  // Python's `str in str` (substring test) and per-code-point indexing.
  const has = (alphabet, s) => alphabet.includes(s);
  const chars = (s) => Array.from(s);

  // Split "1q0R" into ["1", "q0", "R"].
  function parse_command(command, alphabet, where) {
    const c = typeof command === 'string' ? chars(command) : [];
    if (c.length < 3) {
      throw new ProgramError(`${where}: команда «${command}» закоротка, ` +
        'очікується формат «символ стан напрям», напр. 1q0R');
    }
    const write = c[0], state = c.slice(1, -1).join(''), move = c[c.length - 1];
    if (!has(alphabet, write)) throw new ProgramError(`${where}: символу «${write}» немає в алфавіті`);
    if (!(move in MOVES)) throw new ProgramError(`${where}: напрям «${move}» має бути L, R або N`);
    if (!state.startsWith('q')) throw new ProgramError(`${where}: стан «${state}» має починатися з q`);
    return [write, state, move];
  }

  const is_object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

  // Validate the table; return {state: {symbol: [write, state, move]}}.
  // Empty cells mean "no rule".
  function parse_program(table, alphabet) {
    if (!has(alphabet, BLANK)) throw new ProgramError(`алфавіт має містити порожній символ «${BLANK}»`);
    if (!is_object(table)) throw new ProgramError('таблиця переходів має бути об’єктом {стан: {символ: команда}}');
    const program = Object.create(null);  // no prototype: a state may be named "__proto__"
    for (const [state, row] of Object.entries(table)) {
      if (!is_object(row)) throw new ProgramError(`рядок стану ${state} має бути об’єктом {символ: команда}`);
      program[state] = Object.create(null);
      for (const [symbol, command] of Object.entries(row)) {
        if (!command) continue;
        if (!has(alphabet, symbol)) throw new ProgramError(`${state}: символу «${symbol}» немає в алфавіті`);
        program[state][symbol] = parse_command(command, alphabet, `${state}, «${symbol}»`);
      }
    }
    if (!Object.values(program).some((row) => Object.keys(row).length)) {
      throw new ProgramError('таблиця переходів порожня');
    }
    return program;
  }

  // Input word with an optional state mark in apostrophes before the scanned
  // symbol, e.g. "11'q0'+11".  Without a mark the machine starts in q0 on the
  // first symbol.  Returns [tape, head, state].
  function parse_input(word, alphabet, program) {
    let state = START, head = 0;
    const parts = word.split("'");
    if (parts.length === 3) {
      state = parts[1];
      head = chars(parts[0]).length;
      word = parts[0] + parts[2];
    } else if (parts.length !== 1) {
      throw new ProgramError("стан у вхідному слові позначається так: 11'q0'+11");
    }
    for (const ch of word) {
      if (!has(alphabet, ch)) throw new ProgramError(`символу «${ch}» вхідного слова немає в алфавіті`);
    }
    if (!Object.hasOwn(program, state)) throw new ProgramError(`початкового стану ${state} немає в таблиці`);
    const tape = word ? chars(word) : [BLANK];
    if (head >= tape.length) tape.push(BLANK);
    return [tape, head, state];
  }

  // Tape with the state name inserted before the scanned symbol.
  function snapshot(tape, head, state) {
    return [...tape.slice(0, head), state, ...tape.slice(head)].join(' ');
  }

  // Run the program; returns status, final tape and the step log.
  function run(table, alphabet, word, max_steps = 1000) {
    const program = parse_program(table, alphabet);
    let [tape, head, state] = parse_input(word, alphabet, program);
    const log = [{ step: 0, tape: snapshot(tape, head, state), command: '' }];
    let status = null, steps = 0;
    while (status === null) {
      if (state === FINAL) status = 'FINISHED';
      else if (!Object.hasOwn(program, state)) status = 'NO_STATE';
      else if (!Object.hasOwn(program[state], tape[head])) status = 'NO_RULE';
      else if (steps >= max_steps) status = 'STEP_LIMIT';
      else {
        const [write, new_state, move] = program[state][tape[head]];
        tape[head] = write;
        state = new_state;
        head += MOVES[move];
        if (head < 0) {
          tape.unshift(BLANK);
          head = 0;
        } else if (head === tape.length) {
          tape.push(BLANK);
        }
        steps += 1;
        log.push({ step: steps, tape: snapshot(tape, head, state), command: write + new_state + move });
      }
    }
    const strip = new RegExp(`^${BLANK}+|${BLANK}+$`, 'g');
    return {
      status, steps, state, tape: tape.join('').replace(strip, ''), head,
      snapshot: snapshot(tape, head, state), log,
    };
  }

  return { BLANK, START, FINAL, ProgramError, parse_command, parse_program, parse_input, snapshot, run };
})();

if (typeof module !== 'undefined') module.exports = Turing;
