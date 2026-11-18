"""Tests of the Turing machine engine, the Flask API and the JavaScript port.

    python -m unittest discover -s tests -v

The JavaScript test needs Node.js; without it the test is skipped.
"""
import json
import random
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import turing  # noqa: E402
from app import app  # noqa: E402

ADD = {"q0": {"1": "1q0R", "+": "1q1R"},
       "q1": {"1": "1q1R", "&": "&q2L"},
       "q2": {"1": "&q*N"}}

# example file -> {input word: expected tape}
EXPECTED = {
    "1_addition": {"111+11": "11111", "1+1": "11", "+1": "1"},
    "2_subtraction": {"111-11": "1", "11-11": "", "111-": "111"},
    "3_multiplication": {"11*111": "111111", "1*1": "1", "111*": ""},
    "4_comparison": {"111,11": ">", "11,11": "=", "1,111": "<"},
    "5_doubling": {"111": "111111", "1": "11"},
    "6_binary_increment": {"1011": "1100", "111": "1000", "0": "1"},
    "7_binary_inversion": {"100110": "011001", "1": "0"},
}


def load_example(name):
    return json.loads((ROOT / "examples" / f"{name}.json").read_text(encoding="utf-8"))


def error_cases():
    """Invalid programs and input words: [table, alphabet, word, steps]."""
    return [
        [{"q0": {"1": "1q0"}}, "1&", "11", 10],      # command too short
        [{"q0": {"1": "xq0R"}}, "1&", "11", 10],     # symbol not in alphabet
        [{"q0": {"1": "1q0X"}}, "1&", "11", 10],     # bad move
        [{"q0": {"1": "1z0R"}}, "1&", "11", 10],     # state without q
        [{"q0": {"1": "1q0R"}}, "1", "11", 10],      # no blank in alphabet
        [[], "1&", "11", 10],                        # table is not an object
        [{"q0": 5}, "1&", "11", 10],                 # row is not an object
        [{"q0": {"1": ""}}, "1&", "11", 10],         # empty table
        [{"q0": {"x": "1q0R"}}, "1&", "11", 10],     # column not in alphabet
        [ADD, "1+&", "1'q0'1'", 10],                 # bad state mark
        [ADD, "1+&", "12", 10],                      # input symbol not in alphabet
        [ADD, "1+&", "1'q5'1", 10],                  # start state not in table
    ]


class EngineTest(unittest.TestCase):
    def test_examples(self):
        for name, cases in EXPECTED.items():
            ex = load_example(name)
            for word, tape in cases.items():
                with self.subTest(example=name, word=word):
                    result = turing.run(ex["program"], ex["alphabet"], word, ex["num_steps"])
                    self.assertEqual(result["status"], turing.FINISHED)
                    self.assertEqual(result["tape"], tape)

    def test_log(self):
        result = turing.run(ADD, "1+&", "1+1")
        self.assertEqual(result["steps"], 5)
        self.assertEqual(len(result["log"]), 6)
        self.assertEqual(result["log"][0], {"step": 0, "tape": "q0 1 + 1", "command": ""})
        self.assertEqual(result["log"][2], {"step": 2, "tape": "1 1 q1 1", "command": "1q1R"})
        self.assertEqual(result["snapshot"], "1 1 q* & &")

    def test_state_mark(self):
        # start in q1 on the second "1": the first "+" is never replaced
        result = turing.run(ADD, "1+&", "1+'q1'1")
        self.assertEqual(result["status"], turing.FINISHED)
        self.assertEqual(result["tape"], "1+")

    def test_tape_grows_both_ways(self):
        left = {"q0": {"1": "1q0L", "&": "1q*N"}}
        self.assertEqual(turing.run(left, "1&", "11")["tape"], "111")
        self.assertEqual(turing.run(left, "1&", "11")["head"], 0)
        self.assertEqual(turing.run({"q0": {"&": "1q*N"}}, "1&", "")["tape"], "1")

    def test_statuses(self):
        self.assertEqual(turing.run({"q0": {"1": "1q1R"}}, "1&", "11")["status"], turing.NO_STATE)
        self.assertEqual(turing.run({"q0": {"1": "1q0R"}}, "1&", "11")["status"], turing.NO_RULE)
        loop = {"q0": {"1": "1q0R", "&": "&q0L"}}
        result = turing.run(loop, "1&", "1", max_steps=50)
        self.assertEqual(result["status"], turing.STEP_LIMIT)
        self.assertEqual(result["steps"], 50)

    def test_errors(self):
        for case in error_cases():
            with self.subTest(case=case):
                with self.assertRaises(turing.ProgramError):
                    turing.run(*case)

    def test_error_message(self):
        with self.assertRaisesRegex(turing.ProgramError, "напрям «X» має бути L, R або N"):
            turing.run({"q0": {"1": "1q0X"}}, "1&", "1")


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def post(self, **fields):
        body = {"input": "111+11", "num_steps": 100, "T_alphavit": "1+&", "data": ADD}
        body.update(fields)
        return self.client.post("/run", json=body)

    def test_page(self):
        page = self.client.get("/").get_data(as_text=True)
        self.assertIn("Тюрінговий", page)
        self.assertIn("static/turing.js", page)

    def test_run(self):
        response = self.post()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "FINISHED")
        self.assertEqual(response.json["tape"], "11111")

    def test_run_errors(self):
        for fields in [{"num_steps": 0}, {"num_steps": 100001}, {"num_steps": "x"},
                       {"input": 5}, {"data": {"q0": {"1": "1q0X"}}}]:
            with self.subTest(fields=fields):
                response = self.post(**fields)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json)
        response = self.client.post("/run", data="not json", content_type="text/plain")
        self.assertEqual(response.status_code, 400)

    def test_examples(self):
        examples = self.client.get("/examples").json
        self.assertEqual([e["id"] for e in examples], list(EXPECTED))
        for ex in examples:
            self.assertEqual(ex["result"], EXPECTED[ex["id"]][ex["input"]])

    def test_service_worker(self):
        with self.client.get("/sw.js") as response:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["Cache-Control"], "no-cache")


@unittest.skipUnless(shutil.which("node"), "Node.js is not installed")
class JavaScriptPortTest(unittest.TestCase):
    """static/turing.js must give the same results and messages as turing.py."""

    def test_same_results(self):
        cases = [[ex["program"], ex["alphabet"], word, ex["num_steps"]]
                 for name, words in EXPECTED.items()
                 for ex in [load_example(name)] for word in words]
        cases += error_cases()
        rnd = random.Random(1)
        for _ in range(300):  # random programs over the alphabet 01&
            states = [f"q{i}" for i in range(rnd.randint(1, 4))]
            table = {s: {a: rnd.choice("01&") + rnd.choice(states + ["q*", "q9"]) + rnd.choice("LRN")
                         if rnd.random() < 0.8 else "" for a in "01&"} for s in states}
            word = "".join(rnd.choice("01") for _ in range(rnd.randint(0, 6)))
            cases.append([table, "01&", word, rnd.randint(1, 60)])

        expected = []
        for case in cases:
            try:
                expected.append({"ok": turing.run(*case)})
            except turing.ProgramError as e:
                expected.append({"error": str(e)})
        js = subprocess.run(["node", str(ROOT / "tests" / "run_js.js")], input=json.dumps(cases),
                            capture_output=True, text=True, check=True)
        for case, py, got in zip(cases, expected, json.loads(js.stdout)):
            with self.subTest(case=case):
                self.assertEqual(got, py)


if __name__ == "__main__":
    unittest.main()
