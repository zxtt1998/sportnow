from __future__ import annotations
import hashlib
import html
import json
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[2]
UTC = timezone.utc

def iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec='seconds').replace('+00:00', 'Z')

def parse_date(value: str, now: datetime | None = None) -> datetime:
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        date = parsedate_to_datetime(value)
    if date.tzinfo is None:
        raise ValueError('Missing timezone')
    date = date.astimezone(UTC)
    if now and date > now + timedelta(hours=6):
        raise ValueError('Publication is more than six hours in the future')
    return date

class TextOnly(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []; self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style'}: self.hidden += 1
        if tag in {'p', 'br', 'div', 'li'}: self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag in {'script', 'style'}: self.hidden = max(0, self.hidden - 1)
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

def plain_text(value: str, limit: int = 2000) -> str:
    parser = TextOnly(); parser.feed(value or '')
    return re.sub(r'\s+', ' ', html.unescape(''.join(parser.parts))).strip()[:limit]

def normalize(value: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))

def canonical_url(value: str, hosts: list[str] | None = None) -> str:
    parsed = urlsplit(value.strip())
    host = (parsed.hostname or '').lower().rstrip('.')
    if parsed.scheme not in {'http', 'https'} or not host or parsed.username or parsed.password:
        raise ValueError('Article URL must be an absolute public HTTP(S) URL')
    if parsed.port not in {None, 80, 443}:
        raise ValueError('Nonstandard article URL port')
    if hosts and not any(host == h or host.endswith('.' + h) for h in hosts):
        raise ValueError('Article URL outside publisher allowlist')
    if host in {'localhost', '127.0.0.1', '0.0.0.0', '::1'}: raise ValueError('Local URL')
    query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
             if not k.lower().startswith(('utm_', 'at_')) and k.lower() not in {'fbclid', 'gclid', 'cmp', 'campaign', 'source', 'platform', 'rss'}]
    return urlunsplit(('https', host.removeprefix('www.'), parsed.path.rstrip('/') or '/', urlencode(sorted(query)), ''))

def article_id(url: str) -> str:
    return 'news-' + hashlib.sha256(url.encode()).hexdigest()[:24]

def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def read_json(path: Path, fallback):
    if not path.exists(): return fallback
    # Corrupt historical files must stop publication, never silently become empty.
    return json.loads(path.read_text(encoding='utf-8'))

def atomic_json(path: Path, value) -> bool:
    content = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == content: return False
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp'); temp.write_text(content, encoding='utf-8'); temp.replace(path)
    return True
