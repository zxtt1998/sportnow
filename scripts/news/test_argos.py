"""Standalone smoke test. Only project-owned examples are translated, never RSS content."""

from __future__ import annotations
import argparse
import json
import platform
import sys
import time
from pathlib import Path
from .translation import ArgosTranslator, translate_field, SETTINGS
from .model import atomic_json

EXAMPLES = [
    (
        "The San Antonio Spurs and Victor Wembanyama are mentioned in this translation test.",
        ["圣安东尼奥马刺", "维克托·文班亚马"],
    ),
    (
        "Real Madrid and Cristiano Ronaldo are mentioned in this example.",
        ["皇家马德里", "克里斯蒂亚诺·罗纳尔多"],
    ),
    (
        "This example mentions 100 points and the Golden State Warriors.",
        ["100", "金州勇士"],
    ),
]


def smoke():
    start = time.monotonic()
    cache = {}
    results = []
    with ArgosTranslator() as translator:
        if not translator.available:
            raise RuntimeError(translator.error)
        for text, expected in EXAMPLES:
            then = time.monotonic()
            output, status = translate_field(text, "title", cache, translator)
            if status != "translated" or not all(term in output for term in expected):
                raise RuntimeError(
                    "Offline smoke failed: " + text + " / " + status + " / " + output
                )
            cached, cached_status = translate_field(text, "title", cache, translator)
            if cached_status != "cached" or cached != output:
                raise RuntimeError("Translation cache smoke failed")
            results.append(
                {
                    "input": text,
                    "output": output,
                    "seconds": round(time.monotonic() - then, 3),
                    "cacheVerified": True,
                }
            )
    return {
        "passed": True,
        "engine": "Argos Translate",
        "libraryVersion": SETTINGS["libraryVersion"],
        "modelVersion": SETTINGS["modelVersion"],
        "environment": platform.platform(),
        "python": sys.version.split()[0],
        "seconds": round(time.monotonic() - start, 2),
        "samples": results,
        "networkDuringInference": "blocked",
        "note": "Only original SportNow test sentences; no publisher text was translated.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path)
    parser.add_argument("--allow-unavailable", action="store_true")
    args = parser.parse_args()
    try:
        result = smoke()
    except Exception as error:
        result = {
            "passed": False,
            "error": type(error).__name__ + ": " + str(error)[:700],
        }
    if args.report:
        atomic_json(args.report, result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["passed"] and not args.allow_unavailable:
        raise SystemExit(1)
