"""Download only the pinned en->zh package; failure never blocks feed publication."""

from __future__ import annotations
import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from .model import atomic_json, digest
from .translation import SETTINGS


def prepare_sbd(package):
    import stanza

    settings = SETTINGS["sentenceSplitter"]
    directory = package.package_path / "stanza"
    receipt_path = directory / "sportnow-ready.json"
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if (
            receipt.get("settings") == settings
            and all(
                (directory / path).is_file()
                and hashlib.sha256((directory / path).read_bytes()).hexdigest()
                == checksum
                for path, checksum in receipt.get("files", {}).items()
            )
            and receipt.get("files")
        ):
            return {"cached": True, "resourceFiles": len(receipt["files"])}
    # Only the English tokenizer and its required MWT model, not all Stanza languages.
    stanza.download(
        lang="en",
        model_dir=str(directory),
        processors="tokenize",
        package="default",
        resources_version=settings["resourcesVersion"],
        verbose=False,
    )
    files = {
        str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(directory.rglob("*"))
        if path.is_file()
        and path.suffix in {".pt", ".json"}
        and path.name != "sportnow-ready.json"
    }
    if not files or not (directory / "resources.json").exists():
        raise RuntimeError("English sentence resources are incomplete")
    atomic_json(receipt_path, {"settings": settings, "files": files})
    return {"cached": False, "resourceFiles": len(files)}


def prepare():
    import argostranslate.package

    installed = argostranslate.package.get_installed_packages()
    existing = next(
        (
            p
            for p in installed
            if p.from_code == "en"
            and p.to_code == "zh"
            and str(p.package_version) == SETTINGS["modelVersion"]
        ),
        None,
    )
    result = {
        "available": True,
        "cached": bool(existing),
        "modelVersion": SETTINGS["modelVersion"],
    }
    if not existing:
        argostranslate.package.update_package_index()
        package = next(
            (
                p
                for p in argostranslate.package.get_available_packages()
                if p.from_code == "en"
                and p.to_code == "zh"
                and str(p.package_version) == SETTINGS["modelVersion"]
            ),
            None,
        )
        if not package:
            raise RuntimeError(
                "Pinned en->zh model not found in the official Argos index"
            )
        path = package.download()
        if not path:
            raise RuntimeError("Model download returned no file")
        checksum = hashlib.sha256(Path(path).read_bytes()).hexdigest()
        if checksum != SETTINGS["modelSha256"]:
            raise RuntimeError("Model archive checksum mismatch")
        argostranslate.package.install_from_path(path)
        result.update(archiveSha256=checksum, downloadBytes=Path(path).stat().st_size)
        existing = next(
            p
            for p in argostranslate.package.get_installed_packages()
            if p.from_code == "en"
            and p.to_code == "zh"
            and str(p.package_version) == SETTINGS["modelVersion"]
        )
    result["sentenceSplitter"] = prepare_sbd(existing)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    start = time.monotonic()
    try:
        result = prepare()
    except Exception as error:
        result = {
            "available": False,
            "error": type(error).__name__ + ": " + str(error)[:400],
        }
    result["seconds"] = round(time.monotonic() - start, 2)
    if args.report:
        atomic_json(args.report, result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.strict and not result["available"]:
        raise SystemExit(1)
