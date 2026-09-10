"""Check entrypoint assets and DOM hooks without browser automation."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'dist'

class Page(HTMLParser):
    ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, 'Duplicate id'
            self.ids.add(attrs['id'])
        for key in ('src', 'href'):
            ref = attrs.get(key, '')
            if ref and not ref.startswith(('http', '#')):
                assert (ROOT / ref).exists(), ref

page=Page()
page.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
js=(ROOT / 'app.js').read_text(encoding='utf-8')
dynamic={'add-comparison'}
for selector in re.findall(r"\$\('#([\w-]+)'\)", js):
    assert selector in page.ids | dynamic, selector
for path in ('regions.geojson','regions_scored.json'):
    json.loads((ROOT / 'data' / path).read_text(encoding='utf-8'))
print('Static assets, JSON and DOM hooks validated.')
