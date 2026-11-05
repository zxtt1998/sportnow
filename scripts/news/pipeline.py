from __future__ import annotations
import argparse
import copy
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from .entities import identify
from .feeds import fetch_feed
from .model import ROOT, UTC, article_id, atomic_json, canonical_url, digest, iso, normalize, parse_date, read_json
from .translation import ArgosTranslator, TranslationBudget, translate_field, SETTINGS
from .validate import validate_news, validate_pair


def check_sources(sources):
    ids=set()
    for source in sources:
        if source['id'] in ids: raise ValueError('Duplicate source')
        ids.add(source['id'])
        policy=source['policy']
        if policy['allowHeadlines'] and (policy['mode']=='blocked' or not policy['permissionReference'].strip()):
            raise ValueError('Public headlines require a recorded permission reference')
        if policy['allowSummaryTranslation'] and not policy['allowSummary']: raise ValueError('Translation requires summary storage permission')
        if any(policy[k] for k in ['allowTitleTranslation','allowSummaryTranslation']) and not policy['allowHeadlines']:
            raise ValueError('Translation requires publication permission')


def normalize_item(item, source, now, previous=None):
    url=canonical_url(item['url'],source['articleHosts']); title=item['title'].strip()
    if not title: raise ValueError('Empty title')
    published=parse_date(item['published'],now)
    policy=copy.deepcopy(source['policy'])
    summary=item['summary'] if policy['allowSummary'] else ''
    # Entity classification only uses text whose storage/processing is permitted.
    team_ids,player_ids,tags=identify(title,summary,source['category'],source.get('defaultTags',[]))
    article={'id': article_id(url), 'category':source['category'], 'sourceId':source['id'], 'sourceName':source['name'],
             'titleOriginal':title,'titleZh':'','summaryOriginal':summary,'summaryZh':'', 'originalUrl':url,
             'publishedAt':iso(published),'fetchedAt':iso(now),'tags':tags,'teamIds':team_ids,'playerIds':player_ids,
             'translationStatus':'pending','translationFields':{'title':'pending','summary':'empty' if not summary else 'pending'},
             'contentPolicy':policy,'isDemo':False, 'eventKey': digest(normalize(title))[:16]}
    if previous:
        article['fetchedAt']=previous['fetchedAt']
        for original,chinese,field,allow in [('titleOriginal','titleZh','title','allowTitleTranslation'),('summaryOriginal','summaryZh','summary','allowSummaryTranslation')]:
            if article[original]==previous[original] and policy[allow] and previous['contentPolicy'].get(allow):
                article[chinese]=previous[chinese]
                article['translationFields'][field]=previous.get('translationFields',{}).get(field,'translated' if previous[chinese] else 'pending')
    return article


def deduplicate(articles):
    result=[]; urls={}
    # Canonical URL is primary. Similar titles are only merged within 48 hours/category.
    for article in sorted(articles,key=lambda a:(a['publishedAt'],a['sourceId']),reverse=True):
        url=canonical_url(article['originalUrl'])
        if url in urls:
            target=urls[url]
            target['tags']=sorted(set(target['tags']+article['tags']))
            continue
        title=normalize(article['titleOriginal'])
        duplicate=next((a for a in result if a['category']==article['category'] and abs((parse_date(a['publishedAt'])-parse_date(article['publishedAt'])).total_seconds())<172800
                        and re.findall(r'\d+(?:[.,]\d+)*',a['titleOriginal'])==re.findall(r'\d+(?:[.,]\d+)*',article['titleOriginal']) and len(title)>24 and SequenceMatcher(None,normalize(a['titleOriginal']),title).ratio()>=0.96),None)
        if duplicate: continue
        result.append(article);urls[url]=article
    return result


def apply_translation(article, cache, translator, budget, counters):
    policy=article['contentPolicy']; has_work=False
    for original,chinese,field,allow in [('titleOriginal','titleZh','title','allowTitleTranslation'),('summaryOriginal','summaryZh','summary','allowSummaryTranslation')]:
        if not article[original]: article['translationFields'][field]='empty';continue
        if not policy[allow]: article[chinese]='';article['translationFields'][field]='skipped_policy';continue
        if article[chinese]: continue
        has_work=True
    permitted=not has_work or budget.take()
    for original,chinese,field,allow in [('titleOriginal','titleZh','title','allowTitleTranslation'),('summaryOriginal','summaryZh','summary','allowSummaryTranslation')]:
        if not article[original] or not policy[allow] or article[chinese]:continue
        if not permitted:article['translationFields'][field]='pending';continue
        text,status=translate_field(article[original],field,cache,translator)
        article[chinese]=text;article['translationFields'][field]=status
        if status=='translated':counters['translatedFields']+=1
        if status=='cached':counters['cacheHits']+=1
    fields=[article['translationFields']['title']]
    if article['summaryOriginal']:fields.append(article['translationFields']['summary'])
    successes=sum(s in {'translated','cached'} for s in fields)
    if successes==len(fields):article['translationStatus']='translated'
    elif successes:article['translationStatus']='partial'
    elif all(s=='skipped_policy' for s in fields):article['translationStatus']='skipped_policy'
    elif 'failed' in fields:article['translationStatus']='failed'
    elif 'unavailable' in fields:article['translationStatus']='unavailable'
    else:article['translationStatus']='pending'


def run_update(data_dir=ROOT/'public/data', cache_path=ROOT/'.cache/translation-cache.json', now=None, sources=None, fetcher=fetch_feed, translator=None):
    now=now or datetime.now(UTC)
    sources=sources if sources is not None else read_json(ROOT/'config/sources.json',{})['sources']
    check_sources(sources)
    old_news=read_json(data_dir/'news.json',None)
    if old_news:validate_news(old_news)
    old_status=read_json(data_dir/'sources-status.json',{})
    previous_articles=old_news['articles'] if old_news else []
    # Rights can be revoked; a stale permission snapshot must never keep publishing content.
    policies={s['id']:s['policy'] for s in sources}
    previous_articles=[a for a in previous_articles if a['sourceId'] in policies and policies[a['sourceId']]['allowHeadlines']]
    by_url={a['originalUrl']:a for a in previous_articles}
    cache=read_json(cache_path,{})
    state=[]; candidates=[]; any_success=False
    counters={'fetchedItems':0,'publishedItems':0,'translatedFields':0,'translatedArticles':0,'cacheHits':0,'invalidItems':0}
    previous_states={s['sourceId']:s for s in old_status.get('sources',[])}
    for source in sources:
        prev=previous_states.get(source['id'],{})
        current={'sourceId':source['id'],'sourceName':source['name'],'category':source['category'],'feedUrl':source['feedUrl'],'homepageUrl':source['homepageUrl'],
                 'fetchStatus':'disabled','publicationStatus':'allowed' if source['policy']['allowHeadlines'] else 'blocked',
                 'lastSuccessAt':prev.get('lastSuccessAt'),'lastError':None,'httpStatus':None,'fetchedCount':0,'acceptedCount':0,
                 'policyReason':source['policy']['reason'],'licenseUrl':source['policy']['licenseUrl'],'policyHash':digest(source['policy']),
                 'etag':prev.get('etag'),'lastModified':prev.get('lastModified'),'feedFingerprint':prev.get('feedFingerprint')}
        if not source.get('enabled',True): state.append(current);continue
        try:
            response=fetcher(source,prev if prev.get('policyHash')==current['policyHash'] else {})
            current.update(fetchStatus='ok',httpStatus=response['httpStatus'],etag=response.get('etag'),lastModified=response.get('lastModified'))
            any_success=True
            if response['items'] is None:
                current.update(fetchedCount=prev.get('fetchedCount',0),acceptedCount=prev.get('acceptedCount',0))
            else:
                items=response['items'];counters['fetchedItems']+=len(items)
                # For blocked sources, publish only aggregate health/counts, never feed texts or item URLs.
                fingerprint=digest(items) if source['policy']['allowHeadlines'] else digest({'count':len(items)})
                current['feedFingerprint']=fingerprint;current['fetchedCount']=len(items)
                if not prev.get('lastSuccessAt') or fingerprint!=prev.get('feedFingerprint') or prev.get('fetchStatus')!='ok':current['lastSuccessAt']=iso(now)
                if source['policy']['allowHeadlines']:
                    for item in items:
                        try:
                            url=canonical_url(item['url'],source['articleHosts'])
                            article=normalize_item(item,source,now,by_url.get(url))
                            if parse_date(article['publishedAt'])>=now-timedelta(days=30):candidates.append(article);current['acceptedCount']+=1
                        except (ValueError,TypeError,OverflowError):counters['invalidItems']+=1
        except Exception as error:
            current['fetchStatus']='error';current['lastError']={'code':type(error).__name__,'message':str(error)[:300],
                'at':prev.get('lastError',{}).get('at',iso(now)) if prev.get('lastError') and prev['lastError']['code']==type(error).__name__ and prev['lastError']['message']==str(error)[:300] else iso(now)}
        state.append(current)
    # Fresh records override identical URLs; unrelated failures cannot erase the archive.
    merged={a['originalUrl']:copy.deepcopy(a) for a in previous_articles}
    for article in candidates:merged[article['originalUrl']]=article
    articles=deduplicate(list(merged.values()))
    if any_success:articles=[a for a in articles if parse_date(a['publishedAt'])>=now-timedelta(days=30)]
    articles=articles[:1000]
    budget=TranslationBudget()
    for article in articles:
        # Apply today's rights to retained articles too.
        policy=policies[article['sourceId']];article['contentPolicy']=copy.deepcopy(policy)
        if not policy['allowSummary']:article['summaryOriginal']='';article['summaryZh']=''
        before=bool(article['titleZh'])
        apply_translation(article,cache,translator,budget,counters)
        if article['titleZh'] and not before:counters['translatedArticles']+=1
    counters['publishedItems']=len(articles)
    changed=not old_news or articles!=old_news['articles']
    news={'schemaVersion':2,'generatedAt':iso(now) if changed else old_news['generatedAt'],'revision':digest(articles),'articles':articles}
    counts={'total':len(articles),'nba':sum(a['category']=='nba' for a in articles),'football':sum(a['category']=='football' for a in articles)}
    successes=sum(s['fetchStatus']=='ok' for s in state);failures=sum(s['fetchStatus']=='error' for s in state)
    status={'schemaVersion':2,'newsRevision':digest(articles),'updatedAt':iso(now),'lastSuccessfulUpdate':iso(now) if candidates and changed else old_status.get('lastSuccessfulUpdate'),
            'lastRunStatus':'partial' if successes and failures else 'failed' if failures and not successes else 'ok',
            'counts':counts,'sources':state,
            'translation':{'engine':'argos','libraryVersion':SETTINGS['libraryVersion'],'modelVersion':SETTINGS['modelVersion'],
                'available':bool(translator and translator.available),'policyBlockedSources':sum(not s['policy']['allowTitleTranslation'] for s in sources)}}
    comparable={k:v for k,v in status.items() if k!='updatedAt'}
    old_comparable={k:v for k,v in old_status.items() if k!='updatedAt'}
    if comparable==old_comparable:status['updatedAt']=old_status['updatedAt']
    validate_pair(news,status)
    # Only keep translation cache entries still referenced by the bounded catalog.
    from .translation import cache_key
    referenced={cache_key(a[field], name) for a in articles for field,name in [('titleOriginal','title'),('summaryOriginal','summary')] if a[field]}
    cache={key:value for key,value in cache.items() if key in referenced}
    atomic_json(cache_path,cache)
    news_changed=atomic_json(data_dir/'news.json',news);status_changed=atomic_json(data_dir/'sources-status.json',status)
    return {**counters,'sources':[{k:s[k] for k in ['sourceId','fetchStatus','publicationStatus','fetchedCount','acceptedCount','lastError']} for s in state],
            'newsChanged':news_changed,'statusChanged':status_changed,'checkedAt':iso(now)}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=ROOT/'public/data');parser.add_argument('--cache',type=Path,default=ROOT/'.cache/translation-cache.json');parser.add_argument('--report',type=Path);parser.add_argument('--no-translation',action='store_true');args=parser.parse_args()
    should_translate=any(s['policy']['allowTitleTranslation'] or s['policy']['allowSummaryTranslation'] for s in read_json(ROOT/'config/sources.json',{})['sources'])
    translator=ArgosTranslator() if should_translate and not args.no_translation else None
    try:
        report=run_update(args.data_dir,args.cache,translator=translator)
        if args.report:atomic_json(args.report,report)
        import json;print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:
        if translator:translator.close()
