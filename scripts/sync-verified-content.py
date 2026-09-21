#!/usr/bin/env python3
"""Render emergency contacts from the supplied JSON; no browser JS required."""
from datetime import date
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    'PDRRMC': ('pdrrmc', 'Provincial emergency contacts (PDRRMC)'),
    'LGU_Quick_Response_Team': ('lgu-quick-response-team', 'LGU quick response teams'),
    'Rural_Health_Unit': ('rural-health-unit', 'Rural health units'),
    'MDRRMO': ('mdrrmo', 'Municipal disaster response (MDRRMO)'),
    'CDRRMO': ('cdrrmo', 'City disaster response (CDRRMO)'),
    'Office_of_the_City_Municipal_Mayor': ('mayors-offices', 'City and municipal mayor’s offices'),
    'Hospitals': ('hospitals', 'Hospitals'),
    'BFP': ('bfp', 'Fire stations (BFP)'),
    'PNP': ('pnp', 'Police stations (PNP)'),
    'Coast_Guard': ('coast-guard', 'Coast Guard'),
    'C_MSWDO': ('social-welfare', 'Social welfare offices (C/MSWDO)'),
}
LABEL_KEYS = ('name', 'municipality_or_city', 'city', 'station', 'unit')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


def phone_href(value):
    if not isinstance(value, str) or not re.fullmatch(r'\+?[0-9\s().-]+', value) or not re.search(r'\d', value):
        raise ValueError('Invalid telephone number: ' + repr(value))
    return 'tel:' + ('+' if value.startswith('+') else '') + re.sub(r'\D', '', value)


def validate(data):
    def nonempty(value):
        return isinstance(value, str) and bool(value.strip())
    if not isinstance(data, dict) or not nonempty(data.get('title')):
        raise ValueError('Missing hotline title')
    date.fromisoformat(data.get('updated_as_of', ''))
    if not isinstance(data.get('notes'), list) or not all(nonempty(note) for note in data['notes']):
        raise ValueError('Invalid hotline notes')
    groups = data.get('hotlines')
    if not isinstance(groups, dict) or set(groups) != set(CATEGORIES):
        raise ValueError('Expected all 11 hotline categories')
    for category, entries in groups.items():
        if not isinstance(entries, list) or not entries:
            raise ValueError('Empty or invalid category: ' + category)
        for entry in entries:
            if not isinstance(entry, dict) or not any(nonempty(entry.get(key)) for key in LABEL_KEYS):
                raise ValueError('Hotline entry is missing a label')
            if set(entry) - set(LABEL_KEYS) - {'numbers', 'details'}:
                raise ValueError('Unsupported hotline entry field')
            for key in LABEL_KEYS:
                if key in entry and not nonempty(entry[key]):
                    raise ValueError('Invalid hotline label')
            if not entry.get('numbers') and not entry.get('details'):
                raise ValueError('Hotline entry has no numbers')
            if 'numbers' in entry:
                if not isinstance(entry['numbers'], list) or not entry['numbers']:
                    raise ValueError('Invalid numbers list')
                for number in entry['numbers']:
                    phone_href(number)
            if 'details' in entry:
                if not isinstance(entry['details'], list) or not entry['details']:
                    raise ValueError('Invalid hotline subdivisions')
                for detail in entry['details']:
                    if not isinstance(detail, dict) or set(detail) != {'subdivision', 'number'} or not nonempty(detail['subdivision']):
                        raise ValueError('Invalid hotline subdivision')
                    phone_href(detail['number'])
    for name in ('APSEMO', 'Albay EMS'):
        matches = [entry for entry in groups['PDRRMC'] if entry.get('name') == name]
        if len(matches) != 1 or not matches[0].get('numbers'):
            raise ValueError('Missing critical contact: ' + name)
    return data


def critical(data):
    result = [('National emergency', '911')]
    for name in ('APSEMO', 'Albay EMS'):
        entry = next(entry for entry in data['hotlines']['PDRRMC'] if entry.get('name') == name)
        result.extend((name, number) for number in entry['numbers'])
    return result


def bar(data):
    items = []
    for name, number in critical(data):
        if name == 'National emergency':
            items.append(f'<a href="{phone_href(number)}" class="hotline-item"><span data-i18n="hotline-bar-national">{escape(name)}: {escape(number)}</span></a>')
        else:
            items.append(f'<a href="{phone_href(number)}" class="hotline-item"><span>{escape(name)}: {escape(number)}</span></a>')
    items.append('<a href="/contact/#emergency-hotlines" class="hotline-item"><span data-i18n="hotline-bar-all">All Albay hotlines</span></a>')
    return ''.join(items)


def directory(data):
    total = sum(len(entries) for entries in data['hotlines'].values())
    updated = date.fromisoformat(data['updated_as_of'])
    months = ('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')
    human_date = f'{updated.day} {months[updated.month - 1]} {updated.year}'
    output = ['<section class="section emergency-directory" id="emergency-hotlines" lang="en"><div class="container">',
              '<h2 data-i18n="hotline-dir-heading">Albay emergency hotlines</h2><p data-i18n="hotline-dir-sub">Call the appropriate office directly using the numbers below.</p>',
              '<div class="emergency-critical" aria-label="Critical emergency contacts">']
    for name, number in critical(data):
        output.append(f'<a href="{phone_href(number)}"><strong>{escape(name)}</strong><span>{escape(number)}</span></a>')
    output += ['</div>', f'<p class="emergency-updated">Directory updated as of <time datetime="{escape(data["updated_as_of"])}">{escape(data["updated_as_of"])}</time>.</p>',
               '<div class="emergency-filters" hidden><div><label for="hotline-search" data-i18n="hotline-search-label">Search hotlines</label><input id="hotline-search" type="search" placeholder="Office, municipality, or number" data-i18n-placeholder="hotline-search-placeholder" autocomplete="off" /></div>',
               '<div><label for="hotline-category" data-i18n="hotline-category-label">Category</label><select id="hotline-category"><option value="" data-i18n="hotline-category-all">All categories</option>']
    for category in data['hotlines']:
        slug, title = CATEGORIES[category]
        output.append(f'<option value="{slug}">{escape(title)}</option>')
    output += ['</select></div><button type="button" id="hotline-clear" data-i18n="hotline-btn-clear" hidden>Clear filters</button></div>',
               f'<p id="hotline-result-count" role="status" aria-live="polite">Showing {total} of {total} contacts</p>',
               '<p id="hotline-jump-guidance" data-i18n="hotline-jump-note" hidden>Jumping to a category clears filters.</p>',
               '<nav class="emergency-jumps" aria-label="Hotline categories">']
    for category in data['hotlines']:
        slug, title = CATEGORIES[category]
        output.append(f'<a href="#hotlines-{slug}">{escape(title)}</a>')
    output += ['</nav>', '<div id="hotline-empty" hidden><h3 data-i18n="hotline-no-match-title">No hotlines match your search.</h3><p data-i18n="hotline-no-match-desc">Try another office, municipality, or number, or clear your filters.</p></div>']
    for category, entries in data['hotlines'].items():
        slug, title = CATEGORIES[category]
        output.append(f'<section class="emergency-category" data-category="{slug}" aria-labelledby="hotlines-{slug}"><h3 id="hotlines-{slug}" tabindex="-1">{escape(title)}</h3><div class="emergency-grid">')
        for entry in entries:
            label = ' — '.join(entry[key] for key in LABEL_KEYS if key in entry)
            output.append(f'<article class="emergency-card"><h4>{escape(label)}</h4>')
            for number in entry.get('numbers', []):
                output.append(f'<a class="emergency-phone" href="{phone_href(number)}" aria-label="Call {escape(label)} at {escape(number)}">{escape(number)}</a>')
            for detail in entry.get('details', []):
                subdivision, number = detail['subdivision'], detail['number']
                output.append(f'<a class="emergency-phone" href="{phone_href(number)}" aria-label="Call {escape(label)} {escape(subdivision)} at {escape(number)}"><span>{escape(subdivision)}</span><span>{escape(number)}</span></a>')
            output.append('</article>')
        output.append('</div></section>')
    output += [f'<aside class="emergency-notes"><h3>Directory notes</h3><p>Notes supplied with the directory dated {human_date}:</p><ul>']
    output.extend(f'<li>{escape(note)}</li>' for note in data['notes'])
    output += ['</ul></aside><section class="emergency-resources"><h3>Official contact resources</h3>',
               '<p><a href="https://ehotlines.e.gov.ph/">National emergency directory (eHotlines)</a> — External resource</p>',
               '<p><a href="https://albay.gov.ph/">Official Albay government website</a> — For office hours and other government inquiries</p>',
               '</section></div></section>']
    return '\n'.join(output)


def offline(data):
    output = ['<div class="hotlines"><h2>Emergency contacts</h2><ul class="hotline-list">']
    for name, number in critical(data):
        output.append(f'<li><span class="hotline-label">{escape(name)}</span><a class="hotline-number" href="{phone_href(number)}">{escape(number)}</a></li>')
    output += ['</ul><p><a href="/contact/#emergency-hotlines">All Albay hotlines</a> (requires a saved page or internet)</p>',
               f'<p>Directory updated as of {escape(data["updated_as_of"])}.</p></div>']
    return '\n'.join(output)


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.nodes, self.stack = source, [], []
        self.lines = [0]
        for line in source.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.feed(source)

    def position(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.position()
        node = {'tag': tag, 'attrs': dict(attrs), 'start': start, 'inner': start + len(self.get_starttag_text()), 'end': start + len(self.get_starttag_text())}
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]['tag'] == tag:
                self.stack[i]['close'] = self.position()
                self.stack[i]['end'] = self.source.find('>', self.position()) + 1
                del self.stack[i:]
                break


def html_files(root=ROOT):
    excluded = {'node_modules', 'dist', '.git', '.next', 'out', 'playwright-report', 'test-results'}
    return [p for p in root.rglob('*.html') if not excluded.intersection(p.relative_to(root).parts)]


def region(source, name, markup):
    pattern = r'(<!-- ' + name + r':start -->)[\s\S]*?(<!-- ' + name + r':end -->)'
    result, count = re.subn(pattern, lambda match: match[1] + '\n' + markup + '\n' + match[2], source)
    if count != 1:
        raise ValueError('Missing or duplicate generated region: ' + name)
    return result


def sync(root=ROOT):
    data = validate(json.loads((root / 'data/emergency_hotlines.json').read_text()))
    changes = {}
    for path in html_files(root):
        source = path.read_text()
        edits = [(n['inner'], n['close'], bar(data)) for n in Document(source).nodes if 'hotline-items' in n['attrs'].get('class', '').split()]
        for a, b, text in sorted(edits, reverse=True):
            source = source[:a] + text + source[b:]
        if path == root / 'contact/index.html':
            source = region(source, 'emergency-directory', directory(data))
        if path == root / 'offline.html':
            source = region(source, 'emergency-offline', offline(data))
        changes[path] = source
    # JSX string expressions keep supplied labels inert.
    links = '\n'.join('        <a className="hotline-item" href={' + json.dumps(phone_href(number)) + '}><span>{' + json.dumps(name + ': ' + number) + '}</span></a>' for name, number in critical(data))
    changes[root / 'react-app/src/components/layout/HotlineBar.tsx'] = '''// Generated by scripts/sync-verified-content.py from data/emergency_hotlines.json.
export default function HotlineBar() {
  return (
    <div className="hotline-bar"><div className="container"><div className="hotline-inner">
      <div className="hotline-items">
''' + links + '''
        <a className="hotline-item" href="/contact/#emergency-hotlines"><span>All Albay hotlines</span></a>
      </div>
    </div></div></div>
  );
}
'''
    for path, source in changes.items():
        if path.read_text() != source:
            path.write_text(source)


if __name__ == '__main__':
    sync()
