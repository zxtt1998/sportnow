from __future__ import annotations
import multiprocessing as mp
import os
import re
import time
from pathlib import Path
from .entities import GLOSSARY, protect_terms, restore_terms
from .model import ROOT, digest, read_json

SETTINGS = read_json(ROOT / "config/translation.json", {})
TRANSLATION_VERSION = f"argos:{SETTINGS['libraryVersion']}:{SETTINGS['modelVersion']}:g{digest(GLOSSARY)[:12]}"


def model_is_installed():
    try:
        import argostranslate.package

        return any(
            p.from_code == "en"
            and p.to_code == "zh"
            and str(p.package_version) == SETTINGS["modelVersion"]
            for p in argostranslate.package.get_installed_packages()
        )
    except Exception:
        return False


class TranslationUnavailable(Exception):
    pass


def _worker(connection, model_version):
    try:
        os.environ["ARGOS_DEVICE_TYPE"] = "cpu"
        os.environ.setdefault("OMP_NUM_THREADS", "2")
        import argostranslate.package
        import argostranslate.translate
        import stanza
        from functools import partial

        # The preparer installs English SBD resources. Inference never refreshes them.
        stanza.Pipeline = partial(
            stanza.Pipeline, download_method=stanza.DownloadMethod.NONE
        )
        # Inference must remain offline even if an upstream sentencizer attempts a download.
        import socket

        original_connect = socket.socket.connect
        original_connect_ex = socket.socket.connect_ex

        def offline_connect(sock, address):
            if sock.family in {socket.AF_INET, socket.AF_INET6}:
                raise OSError("Network disabled during offline inference")
            return original_connect(sock, address)

        def offline_connect_ex(sock, address):
            if sock.family in {socket.AF_INET, socket.AF_INET6}:
                raise OSError("Network disabled during offline inference")
            return original_connect_ex(sock, address)

        socket.socket.connect = offline_connect
        socket.socket.connect_ex = offline_connect_ex
        packages = argostranslate.package.get_installed_packages()
        if not any(
            p.from_code == "en"
            and p.to_code == "zh"
            and str(p.package_version) == model_version
            for p in packages
        ):
            raise TranslationUnavailable(
                "Pinned English-Chinese model is not installed"
            )
        language = next(
            x
            for x in argostranslate.translate.get_installed_languages()
            if x.code == "en"
        )
        target = next(
            x
            for x in argostranslate.translate.get_installed_languages()
            if x.code == "zh"
        )
        translator = language.get_translation(target)
        connection.send(("ready", None))
        while True:
            value = connection.recv()
            if value is None:
                break
            try:
                connection.send(("ok", translator.translate(value)))
            except Exception as error:
                connection.send(
                    ("error", type(error).__name__ + ": " + str(error)[:200])
                )
    except Exception as error:
        connection.send(("error", type(error).__name__ + ": " + str(error)[:200]))
    finally:
        connection.close()


class ArgosTranslator:
    """One offline CPU process, bounded per-field inference; no remote translation calls."""

    def __init__(self, startup_timeout=60):
        self.process = None
        self.connection = None
        self.available = False
        self.error = None
        parent, child = mp.get_context("spawn").Pipe()
        self.connection = parent
        self.process = mp.get_context("spawn").Process(
            target=_worker, args=(child, SETTINGS["modelVersion"]), daemon=True
        )
        self.process.start()
        child.close()
        if not parent.poll(startup_timeout):
            self.error = "Model startup timed out"
            self.close()
            return
        kind, value = parent.recv()
        self.available = kind == "ready"
        if not self.available:
            self.error = value
            self.close()

    def translate(self, text: str) -> str:
        if not self.available:
            raise TranslationUnavailable(self.error or "Model is unavailable")
        self.connection.send(text)
        if not self.connection.poll(SETTINGS["maxSecondsPerField"]):
            self.error = "Translation field timed out"
            self.close()
            raise TranslationUnavailable(self.error)
        kind, value = self.connection.recv()
        if kind != "ok":
            raise ValueError(value)
        return value

    def close(self):
        self.available = False
        if self.process:
            if self.process.is_alive():
                try:
                    if self.connection:
                        self.connection.send(None)
                except (BrokenPipeError, OSError):
                    pass
                self.process.join(timeout=2)
            if self.process.is_alive():
                self.process.terminate()
                self.process.join(timeout=5)
            self.process.close()
            self.process = None
        if self.connection:
            self.connection.close()
            self.connection = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def cache_key(text: str, field: str) -> str:
    return digest(
        [
            text,
            field,
            SETTINGS["engine"],
            SETTINGS["libraryVersion"],
            SETTINGS["modelVersion"],
            digest(GLOSSARY),
        ]
    )


def translate_field(text: str, field: str, cache: dict, translator) -> tuple[str, str]:
    if not text:
        return "", "empty"
    key = cache_key(text, field)
    if key in cache:
        return cache[key]["text"], "cached"
    if len(text) > SETTINGS["maxCharactersPerField"]:
        return "", "skipped_limit"
    if not translator or not translator.available:
        return "", "unavailable"
    try:
        protected, terms = protect_terms(text)
        translated = restore_terms(translator.translate(protected), terms).strip()
        if not re.search(r"[\u3400-\u9fff]", translated):
            raise ValueError("No Chinese output")
        if len(translated) > len(text) * 5 + 100:
            raise ValueError("Output unexpectedly expanded")
        # Reject changed numeric facts rather than silently accepting them.
        for number in re.findall(r"(?<!\w)\d+(?:[.,]\d+)*(?!\w)", text):
            if number not in translated:
                raise ValueError("Translation changed a numeric fact")
        cache[key] = {
            "text": translated,
            "engine": "argos",
            "modelVersion": SETTINGS["modelVersion"],
            "field": field,
        }
        return translated, "translated"
    except Exception:
        return "", "failed"


class TranslationBudget:
    def __init__(self):
        self.started = time.monotonic()
        self.count = 0

    def take(self):
        if (
            self.count >= SETTINGS["maxArticlesPerRun"]
            or time.monotonic() - self.started >= SETTINGS["maxRunSeconds"]
        ):
            return False
        self.count += 1
        return True
