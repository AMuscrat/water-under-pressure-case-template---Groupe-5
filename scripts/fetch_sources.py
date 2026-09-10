"""Download public source snapshots. Run from any working directory."""
import json
from pathlib import Path
from urllib.request import urlopen, Request
import ssl

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'boundaries': 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2021_4326_LEVL_2.geojson',
    'wei': 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sdg_06_60?lang=EN',
    'irrigation': 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/tai03?lang=EN',
}

def main():
    out = ROOT / 'data' / 'raw'
    out.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        with urlopen(Request(url, headers={'User-Agent': 'ESCP-water-risk-prototype/1.0'}), timeout=120, context=ssl.create_default_context()) as response:
            data = json.load(response)
        (out / (name + '.json')).write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        print(name, 'saved', data.get('size', len(data.get('features', []))))
    # Pinned dated snapshot for reproducibility; select a new official release deliberately.
    import zipfile
    import io
    url = 'https://drought.emergency.copernicus.eu/data/Drought_Observatories_datasets/EDO_Combined_Drought_Indicator/ver4-1-1/cdinx_m_edo_20260101_20260811_t.zip'
    with urlopen(url, timeout=120) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    (out / 'cdi_20260811.tif').write_bytes(archive.read('cdinx_m_edo_20260811_t_410_z01.tif'))
    print('drought saved')

if __name__ == '__main__':
    main()
