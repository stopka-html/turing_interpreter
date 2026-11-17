"""Build a static copy of the app for GitHub Pages (or any static hosting).

    python build_static.py [output_dir]      # default: dist/

The page, the examples list and the service worker are taken from the Flask
app itself, so the static copy is the same as what the server returns.
Without the server, programs run in the browser (static/turing.js); a long
run that would go to POST /run falls back to the browser too.
"""
import shutil
import sys
from pathlib import Path

from app import app

ROOT = Path(__file__).parent


def build(out):
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "static", out / "static")
    client = app.test_client()
    for url, name in [("/", "index.html"), ("/examples", "examples"), ("/sw.js", "sw.js")]:
        response = client.get(url)
        if response.status_code != 200:
            sys.exit(f"{url}: HTTP {response.status_code}")
        (out / name).write_bytes(response.get_data())
    (out / ".nojekyll").touch()  # serve files as they are, without Jekyll


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "dist")
    build(out)
    print(f"static site: {out}")
