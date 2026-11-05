from __future__ import annotations
import json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from .model import ROOT, canonical_url, parse_date

SCHEMA = ROOT / 'config/news.schema.json'

def validate_news(data: dict) -> None:
    schema = json.loads(SCHEMA.read_text())
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(data)
    from .model import digest
    if data['revision'] != digest(data['articles']): raise ValueError('Incorrect news revision')
    seen = set()
    for article in data['articles']:
        if article['id'] in seen: raise ValueError('Duplicate article ID')
        seen.add(article['id'])
        if canonical_url(article['originalUrl']) != article['originalUrl']: raise ValueError('Non-canonical article URL')
        parse_date(article['publishedAt']); parse_date(article['fetchedAt'])
        policy = article['contentPolicy']
        if not policy['allowHeadlines'] or not policy['permissionReference']: raise ValueError('Publication permission missing')
        if article['summaryOriginal'] and not policy['allowSummary']: raise ValueError('Summary storage not permitted')
        if article['titleZh'] and not policy['allowTitleTranslation']: raise ValueError('Title translation not permitted')
        if article['summaryZh'] and not policy['allowSummaryTranslation']: raise ValueError('Summary translation not permitted')
        if article['isDemo']: raise ValueError('Demo article in production data')

def validate_pair(news: dict, status: dict) -> None:
    validate_news(news)
    from .model import digest
    if status.get('schemaVersion') != 2 or status.get('newsRevision') != digest(news['articles']): raise ValueError('News/status revision mismatch')
    expected = {'total': len(news['articles']), 'nba': sum(a['category'] == 'nba' for a in news['articles']), 'football': sum(a['category'] == 'football' for a in news['articles'])}
    if status.get('counts') != expected: raise ValueError('Incorrect article counts')
    for source in status['sources']:
        if source['fetchStatus'] not in {'ok', 'error', 'disabled'}: raise ValueError('Invalid source fetch status')
        if source['publicationStatus'] not in {'allowed', 'blocked'}: raise ValueError('Invalid source publication status')
        if source.get('lastSuccessAt'): parse_date(source['lastSuccessAt'])

if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument('--data-dir', type=Path, default=ROOT/'public/data'); args=parser.parse_args()
    validate_pair(json.loads((args.data_dir/'news.json').read_text()), json.loads((args.data_dir/'sources-status.json').read_text()))
    print('news.json and sources-status.json are valid')
