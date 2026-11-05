from __future__ import annotations
import re
from .model import ROOT, normalize, read_json

GLOSSARY = read_json(ROOT / 'config/glossary.json', {})

def matching_spans(text: str, entries: list[dict]):
    candidates = []
    # NFKD can change offsets; use normalized text for matching only, never slicing originals.
    for entry in entries:
        for alias in entry['aliases']:
            pattern = r'(?<!\w)' + re.escape(alias) + r'(?!\w)'
            for match in re.finditer(pattern, text, re.IGNORECASE): candidates.append((match.start(), match.end(), entry))
            # Accent-insensitive fallback is used by classification below, not replacement.
    selected = []; end = -1
    for start, stop, entry in sorted(candidates, key=lambda item: (item[0], -(item[1] - item[0]))):
        if start >= end: selected.append((start, stop, entry)); end = stop
    return selected

def contains(text: str, aliases: list[str]) -> bool:
    value = normalize(text)
    return any(re.search(r'(?<!\w)' + re.escape(normalize(alias)) + r'(?!\w)', value) for alias in aliases)

def identify(title: str, summary: str, category: str, defaults=()):
    text = title + ' ' + summary
    entities = [e for e in GLOSSARY['entities'] if e['category'] == category and contains(text, e['aliases'])]
    tags = set(defaults)
    if any(e['kind'] == 'player' for e in entities): tags.add('球员')
    if any(e['id'] == 'spurs' for e in entities): tags.add('马刺')
    if any(e['id'] == 'madrid' for e in entities): tags.add('皇家马德里')
    if category == 'football':
        competitions = [e['zh'] for e in GLOSSARY['competitions'] if contains(text, e['aliases'])]
        tags.update(competitions)
        if any(c in {'英超', '西甲', '德甲', '意甲', '法甲'} for c in competitions): tags.add('五大联赛')
    tags.update(e['zh'] for e in GLOSSARY['topics'] if e['category'] == category and contains(text, e['aliases']))
    return [e['id'] for e in entities if e['kind'] == 'team'], [e['id'] for e in entities if e['kind'] == 'player'], sorted(tags)

def protect_terms(text: str):
    entries = GLOSSARY['entities'] + GLOSSARY['competitions']
    spans = matching_spans(text, entries)
    parts = []; terms = {}; position = 0
    for index, (start, stop, entry) in enumerate(spans):
        key = f'SNTERM{index}ZX'
        parts.extend([text[position:start], key]); terms[key] = entry['zh']; position = stop
    parts.append(text[position:])
    return ''.join(parts), terms

def restore_terms(text: str, terms: dict) -> str:
    for token in terms:
        if len(re.findall(r'(?<![A-Za-z0-9_])' + re.escape(token) + r'(?![A-Za-z0-9_])', text)) != 1:
            raise ValueError('Translation changed an entity placeholder; keep original')
    for token, chinese in terms.items(): text = re.sub(r'(?<![A-Za-z0-9_])' + re.escape(token) + r'(?![A-Za-z0-9_])', lambda _: chinese, text)
    return text
