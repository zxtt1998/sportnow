from __future__ import annotations
import time
from urllib.parse import urlsplit
import requests
from defusedxml import ElementTree as ET
from .model import plain_text

USER_AGENT = 'SportNow/2.0 (+https://github.com/zxtt1998/sportnow; RSS-only personal reader)'
MAX_FEED_BYTES = 5 * 1024 * 1024

def local(tag: str) -> str:
    return tag.rsplit('}', 1)[-1]

def children_text(element, names):
    for child in element:
        if local(child.tag) in names:
            return ''.join(child.itertext()).strip()
    return ''

def parse_feed(content: bytes) -> list[dict]:
    root = ET.fromstring(content)
    if local(root.tag) not in {'rss', 'feed', 'RDF'}: raise ValueError('Response is not RSS or Atom')
    entries = [element for element in root.iter() if local(element.tag) in {'item', 'entry'}]
    result = []
    for element in entries:
        url = ''
        for child in element:
            if local(child.tag) == 'link':
                if child.attrib.get('href') and child.attrib.get('rel', 'alternate') == 'alternate':
                    url = child.attrib['href']; break
                if child.text and child.text.strip().startswith(('https://', 'http://')): url = child.text.strip()
        result.append({
            'title': plain_text(children_text(element, {'title'}), 500),
            'summary': plain_text(children_text(element, {'description', 'summary'})),
            'url': url,
            'published': children_text(element, {'pubDate', 'published', 'date'}) or children_text(element, {'updated'}),
        })
    return result

def fetch_feed(source: dict, previous: dict | None = None, session=None) -> dict:
    previous = previous or {}; session = session or requests.Session()
    headers = {'User-Agent': USER_AGENT, 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'}
    # A policy change needs a fresh response, not an old 304 with no retained articles.
    if previous.get('etag'): headers['If-None-Match'] = previous['etag']
    if previous.get('lastModified'): headers['If-Modified-Since'] = previous['lastModified']
    for attempt in range(3):
        try:
            with session.get(source['feedUrl'], headers=headers, timeout=(8, 20), stream=True, allow_redirects=True) as response:
                allowed = {urlsplit(source['feedUrl']).hostname}
                if any(urlsplit(item.url).scheme != 'https' or urlsplit(item.url).hostname not in allowed for item in [*response.history, response]):
                    raise ValueError('Unexpected feed redirect; manual source review required')
                if response.status_code == 304:
                    return {'httpStatus': 304, 'items': None, 'etag': previous.get('etag'), 'lastModified': previous.get('lastModified')}
                response.raise_for_status()
                data = bytearray()
                for chunk in response.iter_content(65536):
                    data.extend(chunk)
                    if len(data) > MAX_FEED_BYTES: raise ValueError('Feed exceeds 5 MiB limit')
                return {'httpStatus': response.status_code, 'items': parse_feed(bytes(data)), 'etag': response.headers.get('ETag'), 'lastModified': response.headers.get('Last-Modified')}
        except requests.HTTPError as error:
            # Never retry or work around 401/403/404/bot restrictions.
            if error.response.status_code < 500 or attempt == 2: raise
        except (requests.Timeout, requests.ConnectionError):
            if attempt == 2: raise
        time.sleep(2 ** attempt)
    raise RuntimeError('Unreachable retry state')
