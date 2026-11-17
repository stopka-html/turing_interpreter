import json
from pathlib import Path

from flask import Flask, jsonify, render_template, request

import turing

app = Flask(__name__)
EXAMPLES = Path(__file__).with_name("examples")
MAX_STEPS = 10000  # upper bound for the user's step limit


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/examples")
def examples():
    """Ready-made programs from examples/*.json, each with the tape it
    produces from its own input word (shown in the examples menu)."""
    result = []
    for p in sorted(EXAMPLES.glob("*.json")):
        ex = json.loads(p.read_text(encoding="utf-8"))
        run = turing.run(ex["program"], ex["alphabet"], ex["input"], ex["num_steps"])
        result.append({"id": p.stem, "result": run["tape"], **ex})
    return jsonify(result)


@app.post("/run")
def run():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="запит має бути JSON-об’єктом"), 400
    word, alphabet = data.get("input", ""), data.get("T_alphavit", "")
    if not isinstance(word, str) or not isinstance(alphabet, str):
        return jsonify(error="вхідне слово та алфавіт мають бути рядками"), 400
    try:
        num_steps = int(data.get("num_steps", 1000))
    except (TypeError, ValueError):
        return jsonify(error="ліміт тактів має бути цілим числом"), 400
    if not 1 <= num_steps <= MAX_STEPS:
        return jsonify(error=f"ліміт тактів має бути від 1 до {MAX_STEPS}"), 400
    try:
        result = turing.run(data.get("data"), alphabet, word, num_steps)
    except turing.ProgramError as e:
        return jsonify(error=str(e)), 400
    return jsonify(result)


if __name__ == "__main__":
    from livereload import Server

    app.debug = True
    server = Server(app.wsgi_app)
    server.watch("./templates/*.*")
    server.watch("./static/*.*")
    server.serve()
