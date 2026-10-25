import re
import time
from django.db import connection

def slugify_title(text):
    if not text:
        return 'item'
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s or 'item'

_NEWS_CACHE = {'timestamp': 0, 'id_to_slug': {}, 'slug_to_id': {}}
_ANNOUNCEMENT_CACHE = {'timestamp': 0, 'id_to_slug': {}, 'slug_to_id': {}}
CACHE_TTL = 60

def _refresh_news_cache(force=False):
    now = time.time()
    if not force and now - _NEWS_CACHE['timestamp'] < CACHE_TTL and _NEWS_CACHE['id_to_slug']:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT news_id, title FROM news_articles ORDER BY news_id ASC")
            rows = cursor.fetchall()
        
        seen = {}
        id_to_slug = {}
        slug_to_id = {}
        for nid, title in rows:
            base = slugify_title(title)
            if base not in seen:
                seen[base] = 1
                slug = base
            else:
                seen[base] += 1
                slug = f"{base}-{seen[base]}"
            id_to_slug[nid] = slug
            slug_to_id[slug] = nid
            # Support alias with ID suffix
            slug_to_id[f"{base}-{nid}"] = nid
        
        _NEWS_CACHE['id_to_slug'] = id_to_slug
        _NEWS_CACHE['slug_to_id'] = slug_to_id
        _NEWS_CACHE['timestamp'] = now
    except Exception:
        pass

def _refresh_announcement_cache(force=False):
    now = time.time()
    if not force and now - _ANNOUNCEMENT_CACHE['timestamp'] < CACHE_TTL and _ANNOUNCEMENT_CACHE['id_to_slug']:
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT announcement_id, title FROM announcements ORDER BY announcement_id ASC")
            rows = cursor.fetchall()
        
        seen = {}
        id_to_slug = {}
        slug_to_id = {}
        for aid, title in rows:
            base = slugify_title(title)
            if base not in seen:
                seen[base] = 1
                slug = base
            else:
                seen[base] += 1
                slug = f"{base}-{seen[base]}"
            id_to_slug[aid] = slug
            slug_to_id[slug] = aid
            # Support alias with ID suffix
            slug_to_id[f"{base}-{aid}"] = aid
        
        _ANNOUNCEMENT_CACHE['id_to_slug'] = id_to_slug
        _ANNOUNCEMENT_CACHE['slug_to_id'] = slug_to_id
        _ANNOUNCEMENT_CACHE['timestamp'] = now
    except Exception:
        pass

def resolve_news_id(identifier):
    if identifier is None:
        return None
    val = str(identifier).strip()
    if not val:
        return None
    if val.isdigit():
        return int(val)
    _refresh_news_cache()
    if val in _NEWS_CACHE['slug_to_id']:
        return _NEWS_CACHE['slug_to_id'][val]
    # Check if ends with ID suffix
    parts = val.rsplit('-', 1)
    if len(parts) == 2 and parts[1].isdigit():
        pid = int(parts[1])
        if pid in _NEWS_CACHE['id_to_slug']:
            return pid
    # Try forcing a refresh in case an article was just created
    _refresh_news_cache(force=True)
    if val in _NEWS_CACHE['slug_to_id']:
        return _NEWS_CACHE['slug_to_id'][val]
    return None

def get_news_slug(news_id):
    if not news_id:
        return ""
    _refresh_news_cache()
    return _NEWS_CACHE['id_to_slug'].get(int(news_id)) or str(news_id)

def resolve_announcement_id(identifier):
    if identifier is None:
        return None
    val = str(identifier).strip()
    if not val:
        return None
    if val.isdigit():
        return int(val)
    _refresh_announcement_cache()
    if val in _ANNOUNCEMENT_CACHE['slug_to_id']:
        return _ANNOUNCEMENT_CACHE['slug_to_id'][val]
    parts = val.rsplit('-', 1)
    if len(parts) == 2 and parts[1].isdigit():
        pid = int(parts[1])
        if pid in _ANNOUNCEMENT_CACHE['id_to_slug']:
            return pid
    _refresh_announcement_cache(force=True)
    if val in _ANNOUNCEMENT_CACHE['slug_to_id']:
        return _ANNOUNCEMENT_CACHE['slug_to_id'][val]
    return None

def get_announcement_slug(announcement_id):
    if not announcement_id:
        return ""
    _refresh_announcement_cache()
    return _ANNOUNCEMENT_CACHE['id_to_slug'].get(int(announcement_id)) or str(announcement_id)

