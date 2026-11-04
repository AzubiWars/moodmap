"""Lädt die schulbezogene Unterrichtsstatistik NRW (Bildungsportal „Schule suchen“) und extrahiert die
Jahressummen. Sequentiell, mit Pause zwischen Anfragen. Ergebnis: eine JSON-Zeile pro Schule × Stufe.

Aufruf: python3 -I scripts/tools/fetch_untstat.py public/data/schools.real.json scripts/data/untstat-2024-25.jsonl
Braucht `pdftotext` (poppler). Fortsetzbar: bereits abgerufene Schulen werden übersprungen.
Danach: npm run data:facts
"""

import html
import http.cookiejar
import json
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

BASE = 'https://apps.schulministerium.nrw.de/BiPo/SchuleSuchen/pages/schulsuche/schule_information_seite.xhtml'
UA = 'MoodmapNRW-Prototyp/0.1 (Hackathon; Abruf der veröffentlichten Unterrichtsstatistik)'
PAUSE = 0.8
YEAR = '2024/25'
ROW = re.compile(r'^\s*Abschnitte 1 bis 4 insgesamt\s+(.*)$', re.M)
KEYS_SEK2 = ['planned', 'regular', 'special', 'subSame', 'subChanged', 'distance', 'eva', 'cancelled']
KEYS = [k for k in KEYS_SEK2 if k != 'eva']


def to_int(value: str) -> int:
    # „-“ = keine Stunden in dieser Kategorie
    return 0 if value in ('-', '–') else int(value.replace('.', ''))


def opener():
    jar = http.cookiejar.CookieJar()
    o = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    o.addheaders = [('User-Agent', UA)]
    return o


def parse_pdf(data: bytes):
    with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
        f.write(data)
        f.flush()
        text = subprocess.run(['pdftotext', '-layout', f.name, '-'], capture_output=True, text=True).stdout
    # Zeile: Soll-Stunden, dann je Kategorie (Stunden, Anteil); fehlende Kategorie = „- -“
    rows = [[to_int(t) for t in [line.split()[0], *line.split()[1::2]]] for line in ROW.findall(text)]
    if len(rows) < 2:
        return None

    def named(values):
        # Sek II hat eine Spalte mehr (EVA); Sek I und Primarstufe nicht
        return dict(zip(KEYS_SEK2, values)) if len(values) == len(KEYS_SEK2) else None

    # erste Summenzeile = Schule, zweite = landesweit gleiche Schulform
    school, state = named(rows[0]), named(rows[1])
    if not school or not state:
        return None
    stand = re.search(r'Stand:\s+(\d{2}\.\d{2}\.\d{4})', text)
    return {'school': school, 'stateSameForm': state, 'stand': stand.group(1) if stand else None}


def fetch_school(o, number: str):
    page = o.open(f'{BASE}?schulnummer={number}', timeout=30).read().decode('utf-8', 'ignore')
    buttons = re.findall(r'<input type="submit" name="([^"]+)" value="Untstat Auswertung ([^"]+)"', page)
    wanted = [(name, label) for name, label in buttons if label.startswith(YEAR)]
    if not wanted:
        return []
    form = re.search(r'<form id="([^"]+)" name="[^"]+" method="post" action="([^"]+)"', page)
    fields = dict(re.findall(r'<input type="hidden" name="([^"]+)"[^>]*value="([^"]*)"', page))
    out = []
    for name, label in wanted:
        time.sleep(PAUSE)
        body = {**{k: html.unescape(v) for k, v in fields.items()}, name: f'Untstat Auswertung {label}'}
        if form:
            body[form.group(1)] = form.group(1)
        action = urllib.parse.urljoin(BASE, html.unescape(form.group(2))) if form else BASE
        resp = o.open(action, data=urllib.parse.urlencode(body).encode(), timeout=60)
        data = resp.read()
        if not data.startswith(b'%PDF'):
            out.append({'id': number, 'stage': label, 'error': 'no pdf'})
            continue
        parsed = parse_pdf(data)
        stage = {'(S1)': 'sek1', '(S2)': 'sek2', '(P)': 'primar'}.get(label.split(' ')[-1], label)
        out.append({'id': number, 'year': YEAR, 'stage': stage, **(parsed or {'error': 'parse'})})
    return out


def main():
    schools = json.load(open(sys.argv[1]))
    out_path = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else None
    try:
        done = {json.loads(line)['id'] for line in open(out_path)}
    except FileNotFoundError:
        done = set()
    todo = [s['id'] for s in schools if s['id'] not in done][:limit]
    o = opener()
    with open(out_path, 'a') as f:
        for i, number in enumerate(todo):
            try:
                rows = fetch_school(o, number) or [{'id': number, 'none': True}]
            except Exception as e:  # Netzfehler: Schule beim nächsten Lauf erneut versuchen
                print(f'{number}: {e}', file=sys.stderr)
                o = opener()
                time.sleep(10)
                continue
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + '\n')
            f.flush()
            if i % 50 == 0:
                print(f'{i}/{len(todo)}', file=sys.stderr, flush=True)
            time.sleep(PAUSE)


if __name__ == '__main__':
    main()
