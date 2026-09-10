import json
import unittest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_data import normalize, composite, observations

class ScoringTests(unittest.TestCase):
    def test_minmax_and_constant(self):
        self.assertEqual(normalize(15, 10, 20), 50)
        self.assertEqual(normalize(10, 10, 10), 0)
        self.assertIsNone(normalize(None, 0, 1))

    def test_weights_and_missing(self):
        self.assertEqual(composite([100, 0, 0]), 40)
        self.assertEqual(composite([0, 100, 100]), 60)
        self.assertIsNone(composite([40, None, 90]))

    def test_snapshot_join_and_scores(self):
        payload = json.loads((ROOT / 'dist/data/regions_scored.json').read_text(encoding='utf-8'))
        rows = payload['regions']
        features = json.loads((ROOT / 'dist/data/regions.geojson').read_text(encoding='utf-8'))['features']
        self.assertEqual(len(rows), len({r['code'] for r in rows}))
        self.assertEqual({r['code'] for r in rows}, {f['properties']['NUTS_ID'] for f in features})
        self.assertEqual(len({r['country_code'] for r in rows}), 27)
        for r in rows:
            values = [r[k + '_score'] for k in ['structural', 'drought', 'irrigation']]
            for v in values:
                if v is not None:
                    self.assertTrue(0 <= v <= 100)
            self.assertTrue(0 <= r['drought_coverage'] <= 1)
            if None in values:
                self.assertIsNone(r['composite_score'])
            else:
                self.assertAlmostEqual(r['composite_score'], composite(values))
        self.assertTrue(any(r['composite_score'] is None for r in rows))

    def test_country_proxy_is_not_presented_as_distinct_observations(self):
        rows=json.loads((ROOT / 'dist/data/regions_scored.json').read_text(encoding='utf-8'))['regions']
        for country in {r['country_code'] for r in rows}:
            subset=[r for r in rows if r['country_code']==country]
            self.assertEqual(len({r['structural_raw'] for r in subset}),1)
            self.assertEqual(len({r['irrigation_raw'] for r in subset}),1)

if __name__ == '__main__':
    unittest.main()
