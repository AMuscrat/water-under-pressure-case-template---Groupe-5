"""Join EU27 NUTS2 geometry, country proxies and region-aggregated CDI.

No fabricated observations. Missing components yield a null composite.
"""
import json
import math
from pathlib import Path
import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.features import geometry_mask

ROOT = Path(__file__).resolve().parents[1]
EU = set('AT BE BG HR CY CZ DK EE FI FR DE EL HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split())

def observations(data, filters):
    result = {}
    for flat, value in data['value'].items():
        pos = int(flat)
        keys = {}
        for dim, size in reversed(list(zip(data['id'], data['size']))):
            idx = pos % size
            pos //= size
            keys[dim] = next(k for k, v in data['dimension'][dim]['category']['index'].items() if v == idx)
        if any(keys.get(k) != v for k, v in filters.items()) or keys['geo'] not in EU:
            continue
        geo = keys['geo']
        if geo not in result or keys['time'] > result[geo]['year']:
            result[geo] = {'value': value, 'year': keys['time'], 'flag': data.get('status', {}).get(flat)}
    return result

def normalize(value, low, high):
    if value is None:
        return None
    return 0.0 if high == low else 100 * (value - low) / (high - low)

def composite(values):
    return None if any(v is None for v in values) else sum(v * w for v, w in zip(values, [.4, .3, .3]))

def main():
    raw = ROOT / 'data/raw'
    wei_data = json.loads((raw / 'wei.json').read_text(encoding='utf-8-sig'))
    irr_data = json.loads((raw / 'irrigation.json').read_text(encoding='utf-8-sig'))
    wei = observations(wei_data, {'statinfo': 'AVG_4Y', 'unit': 'PC'})
    irr = observations(irr_data, {'irr_area': 'UAA_IT', 'unit': 'PC'})
    geo = json.loads((raw / 'boundaries.json').read_text(encoding='utf-8'))
    features = [f for f in geo['features'] if f['properties']['CNTR_CODE'] in EU]
    rows = []
    raster = raw / 'cdi_20260811.tif'
    if not raster.exists():
        raster = raw / 'drought/cdinx_m_edo_20260811_t_410_z01.tif'
    with rasterio.open(raster) as src:
        tags = src.tags()
        for f in features:
            p = f['properties']
            country = p['CNTR_CODE']
            drought, coverage = None, 0
            try:
                data, transform = mask(src, [f['geometry']], crop=True, filled=False)
                band = data[0]
                inside = geometry_mask([f['geometry']], out_shape=band.shape, transform=transform, invert=True)
                valid = inside & ~np.ma.getmaskarray(band) & (band.data <= 6)
                # Latitude weighting approximates equal-area contributions on this geographic grid.
                lat = transform.f + (np.arange(band.shape[0]) + .5) * transform.e
                weight = np.broadcast_to(np.cos(np.radians(lat))[:, None], band.shape)
                # 0/4 normal/recovered; 1 watch; 2/5 warning/recovering SM; 3/6 alert/recovering vegetation.
                severity = np.array([0, 1, 2, 3, 0, 2, 3, 0, 0])[np.minimum(band.data, 8)]
                if valid.any():
                    drought = float(np.sum(severity[valid] * weight[valid]) / np.sum(weight[valid]))
                    coverage = float(np.sum(weight[valid]) / np.sum(weight[inside]))
            except ValueError:  # Region outside drought raster (e.g. overseas France).
                pass
            rows.append({'code': p['NUTS_ID'], 'name': p['NUTS_NAME'], 'country_code': country,
                         'country': wei_data['dimension']['geo']['category']['label'][country],
                         'structural_raw': wei.get(country, {}).get('value'),
                         'structural_year': wei.get(country, {}).get('year'),
                         'structural_flag': wei.get(country, {}).get('flag'),
                         'irrigation_raw': irr.get(country, {}).get('value'),
                         'irrigation_year': irr.get(country, {}).get('year'),
                         'irrigation_flag': irr.get(country, {}).get('flag'),
                         'drought_raw': drought, 'drought_coverage': round(coverage, 4),
                         'drought_date': tags['time'], 'input_geography': 'Country WEI+/irrigation proxies; regional CDI'})
    ranges = {}
    for key in ['structural', 'drought', 'irrigation']:
        values = [r[key + '_raw'] for r in rows if r[key + '_raw'] is not None]
        low, high = min(values), max(values)
        ranges[key] = {'min': low, 'max': high}
        for r in rows:
            r[key + '_score'] = normalize(r[key + '_raw'], low, high)
    for r in rows:
        r['composite_score'] = composite([r[k + '_score'] for k in ['structural', 'drought', 'irrigation']])
    out = ROOT / 'dist/data'
    out.mkdir(parents=True, exist_ok=True)
    (out / 'regions.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    payload = {'metadata': {'retrieved': '2026-09-10', 'drought_date': tags['time'], 'drought_version': tags['28_PRODUCT_VERSION'],
                           'nuts_version': '2021', 'normalization': ranges, 'weights': [.4, .3, .3],
                           'limitations': 'WEI+ and irrigation are national proxies; CDI is a dated regional raster aggregate, not a forecast.'}, 'regions': rows}
    (out / 'regions_scored.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    # Keep only the used drought raster, its attribution, and metadata as the reproducible snapshot.
    import shutil
    if raster != raw / 'cdi_20260811.tif':
        shutil.copyfile(raster, raw / 'cdi_20260811.tif')
    (raw / 'cdi_metadata.json').write_text(json.dumps(tags, ensure_ascii=True, indent=2), encoding='utf-8')
    print(f'{len(rows)} regions; {sum(r["composite_score"] is not None for r in rows)} complete scores')

if __name__ == '__main__':
    main()
