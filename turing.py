"""Deterministic single-tape Turing machine.

A program is a transition table {state: {symbol: command}}, where a command
is a string "<symbol to write><new state><move>", e.g. "1q0R": write 1, go to
state q0, move the head right.  Moves: L (left), R (right), N (stay).
"&" is the blank symbol and "q*" is the final state.
"""

BLANK = "&"
START = "q0"
FINAL = "q*"
MOVES = {"L": -1, "R": 1, "N": 0}

# run statuses
FINISHED = "FINISHED"      # final state q* reached
NO_STATE = "NO_STATE"      # current state has no row in the table
NO_RULE = "NO_RULE"        # no command for the symbol under the head
STEP_LIMIT = "STEP_LIMIT"  # step limit exceeded (probably an infinite loop)


class ProgramError(ValueError):
    """Invalid transition table or input word."""


def parse_command(command, alphabet, where):
    """Split "1q0R" into ("1", "q0", "R")."""
    if not isinstance(command, str) or len(command) < 3:
        raise ProgramError(f"{where}: команда «{command}» закоротка, "
                           "очікується формат «символ стан напрям», напр. 1q0R")
    write, state, move = command[0], command[1:-1], command[-1]
    if write not in alphabet:
        raise ProgramError(f"{where}: символу «{write}» немає в алфавіті")
    if move not in MOVES:
        raise ProgramError(f"{where}: напрям «{move}» має бути L, R або N")
    if not state.startswith("q"):
        raise ProgramError(f"{where}: стан «{state}» має починатися з q")
    return write, state, move


def parse_program(table, alphabet):
    """Validate the table; return {state: {symbol: (write, state, move)}}.
    Empty cells mean "no rule"."""
    if BLANK not in alphabet:
        raise ProgramError(f"алфавіт має містити порожній символ «{BLANK}»")
    if not isinstance(table, dict):
        raise ProgramError("таблиця переходів має бути об’єктом {стан: {символ: команда}}")
    program = {}
    for state, row in table.items():
        if not isinstance(row, dict):
            raise ProgramError(f"рядок стану {state} має бути об’єктом {{символ: команда}}")
        program[state] = {}
        for symbol, command in row.items():
            if not command:
                continue
            if symbol not in alphabet:
                raise ProgramError(f"{state}: символу «{symbol}» немає в алфавіті")
            program[state][symbol] = parse_command(command, alphabet,
                                                   f"{state}, «{symbol}»")
    if not any(program.values()):
        raise ProgramError("таблиця переходів порожня")
    return program


def parse_input(word, alphabet, program):
    """Input word with an optional state mark in apostrophes before the
    scanned symbol, e.g. "11'q0'+11".  Without a mark the machine starts
    in q0 on the first symbol.  Returns (tape, head, state)."""
    state, head = START, 0
    parts = word.split("'")
    if len(parts) == 3:
        state = parts[1]
        head = len(parts[0])
        word = parts[0] + parts[2]
    elif len(parts) != 1:
        raise ProgramError("стан у вхідному слові позначається так: 11'q0'+11")
    for ch in word:
        if ch not in alphabet:
            raise ProgramError(f"символу «{ch}» вхідного слова немає в алфавіті")
    if state not in program:
        raise ProgramError(f"початкового стану {state} немає в таблиці")
    tape = list(word) or [BLANK]
    if head >= len(tape):
        tape.append(BLANK)
    return tape, head, state


def snapshot(tape, head, state):
    """Tape with the state name inserted before the scanned symbol."""
    return " ".join(tape[:head] + [state] + tape[head:])


def run(table, alphabet, word, max_steps=1000):
    """Run the program; returns status, final tape and the step log."""
    program = parse_program(table, alphabet)
    tape, head, state = parse_input(word, alphabet, program)
    log = [{"step": 0, "tape": snapshot(tape, head, state), "command": ""}]
    status, steps = None, 0
    while status is None:
        if state == FINAL:
            status = FINISHED
        elif state not in program:
            status = NO_STATE
        elif tape[head] not in program[state]:
            status = NO_RULE
        elif steps >= max_steps:
            status = STEP_LIMIT
        else:
            write, new_state, move = program[state][tape[head]]
            tape[head] = write
            state = new_state
            head += MOVES[move]
            if head < 0:
                tape.insert(0, BLANK)
                head = 0
            elif head == len(tape):
                tape.append(BLANK)
            steps += 1
            log.append({"step": steps, "tape": snapshot(tape, head, state),
                        "command": write + new_state + move})
    return {"status": status, "steps": steps, "state": state,
            "tape": "".join(tape).strip(BLANK), "head": head,
            "snapshot": snapshot(tape, head, state), "log": log}
