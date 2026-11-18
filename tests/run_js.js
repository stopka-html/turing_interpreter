// Helper for tests/test_turing.py: runs static/turing.js on the cases read
// from stdin ([[table, alphabet, word, max_steps], ...]) and prints the
// results as JSON: [{"ok": result} | {"error": message}, ...].
const Turing = require('../static/turing.js');

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const results = JSON.parse(input).map((args) => {
    try {
      return { ok: Turing.run(...args) };
    } catch (e) {
      if (!(e instanceof Turing.ProgramError)) throw e;
      return { error: e.message };
    }
  });
  process.stdout.write(JSON.stringify(results));
});
