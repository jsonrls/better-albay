import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('hotlines', ROOT / 'scripts/sync-verified-content.py')
hotlines = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hotlines)
DATA = json.loads((ROOT / 'data/emergency_hotlines.json').read_text())


class EmergencyHotlines(unittest.TestCase):
    def test_complete_ordered_directory(self):
        source = (ROOT / 'contact/index.html').read_text()
        doc = hotlines.Document(source)
        cards = [n for n in doc.nodes if n['attrs'].get('class') == 'emergency-card']
        phones = [n for n in doc.nodes if n['attrs'].get('class') == 'emergency-phone']
        groups = [n for n in doc.nodes if n['attrs'].get('class') == 'emergency-category']
        self.assertEqual(len(cards), 115)
        self.assertEqual(len(phones), 156)
        self.assertEqual(len(groups), 11)
        expected = []
        for entries in DATA['hotlines'].values():
            for entry in entries:
                expected.extend(entry.get('numbers', []))
                expected.extend(detail['number'] for detail in entry.get('details', []))
        self.assertEqual([n['attrs']['href'] for n in phones], [hotlines.phone_href(n) for n in expected])
        self.assertEqual([n['attrs']['data-category'] for n in groups], [hotlines.CATEGORIES[k][0] for k in DATA['hotlines']])
        for note in DATA['notes']:
            self.assertIn(hotlines.escape(note), source)
        self.assertIn(DATA['updated_as_of'], source)
        self.assertIn('Notes supplied with the directory dated 8 November 2025:', source)
        self.assertIn('Centro', source)
        self.assertIn('Upland', source)

    def test_all_bars_use_authoritative_critical_contacts(self):
        total = 0
        for path in hotlines.html_files():
            source = path.read_text()
            for node in hotlines.Document(source).nodes:
                if node['attrs'].get('class') == 'hotline-items':
                    total += 1
                    self.assertEqual(source[node['inner']:node['close']], hotlines.bar(DATA), str(path))
        self.assertGreaterEqual(total, 52)
        offline = (ROOT / 'offline.html').read_text()
        for _, number in hotlines.critical(DATA):
            self.assertIn(hotlines.phone_href(number), offline)

    def test_safe_escaping_and_phone_formatting(self):
        data = copy.deepcopy(DATA)
        data['hotlines']['Hospitals'][0]['name'] = '<script>"Office" & clinic</script>'
        output = hotlines.directory(hotlines.validate(data))
        self.assertNotIn('<script>', output)
        self.assertIn('&lt;script&gt;&quot;Office&quot; &amp; clinic&lt;/script&gt;', output)
        self.assertEqual(hotlines.phone_href('+63 (52) 437-8150'), 'tel:+63524378150')
        self.assertEqual(hotlines.phone_href('0917-850-3047'), 'tel:09178503047')
        with self.assertRaises(ValueError):
            hotlines.phone_href('911" onclick="bad()')

    def test_validation_prevents_writes_and_generation_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            files = ['data/emergency_hotlines.json', 'contact/index.html', 'offline.html', 'index.html', 'react-app/src/components/layout/HotlineBar.tsx']
            for file in files:
                path = root / file
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text((ROOT / file).read_text())
            hotlines.sync(root)
            before = {file: (root / file).read_bytes() for file in files}
            hotlines.sync(root)
            self.assertEqual(before, {file: (root / file).read_bytes() for file in files})
            invalid = copy.deepcopy(DATA)
            invalid['hotlines']['PDRRMC'][0]['numbers'] = []
            (root / files[0]).write_text(json.dumps(invalid))
            with self.assertRaises(ValueError):
                hotlines.sync(root)
            for file in files[1:]:
                self.assertEqual(before[file], (root / file).read_bytes())


if __name__ == '__main__':
    unittest.main()
