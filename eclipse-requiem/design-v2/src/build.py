"""Build the self-contained Visual Design Bible page and the palette exports.

  python3 src/build.py            (run from eclipse-requiem/design-v2, needs: pip install fonttools brotli)

Inputs : src/bible.html, src/blockout.js, src/page.js, palette/eclipse-requiem-v2.json, prompts.md, src/asis/*.jpg,
         Galmuri fonts (npm package `galmuri`, fetched with `npm pack` into src/.cache if missing; SIL OFL 1.1)
Outputs: visual-bible-v2.html, palette/eclipse-requiem-v2.gpl, palette/eclipse-requiem-v2.hex
"""
import base64, io, json, re, subprocess, tarfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
CACHE = SRC / '.cache'
GALMURI = '2.40.3'


def galmuri_dir():
    d = CACHE / f'galmuri-{GALMURI}'
    if not (d / 'package/dist/Galmuri11.woff2').exists():
        CACHE.mkdir(exist_ok=True)
        subprocess.run(['npm', 'pack', f'galmuri@{GALMURI}', '--silent'], cwd=CACHE, check=True, capture_output=True)
        with tarfile.open(CACHE / f'galmuri-{GALMURI}.tgz') as t:
            t.extractall(d, filter='data')
    return d / 'package/dist'


def subset_woff2(path, text):
    font = TTFont(path)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def parse_prompts(md):
    items = []
    for block in re.split(r'^## ', md, flags=re.M)[1:]:
        head, _, body = block.partition('\n')
        if '·' not in head:
            continue
        pid, title = [x.strip() for x in head.split('·', 1)]
        meta = [[m.group(1).strip(), m.group(2).strip()] for m in re.finditer(r'^- ([^:]+):\s*(.+)$', body, flags=re.M)]
        item = {'id': pid, 'title': title, 'meta': meta}
        for kind in ('prompt', 'negative'):
            m = re.search(r'```' + kind + r'\n(.*?)\n```', body, flags=re.S)
            if m:
                item[kind] = m.group(1).strip()
        items.append(item)
    return {'items': items}


def safe_json(obj):
    return json.dumps(obj, ensure_ascii=False).replace('</', '<\\/')


def main():
    html = (SRC / 'bible.html').read_text()
    blockout = (SRC / 'blockout.js').read_text()
    page = (SRC / 'page.js').read_text()
    palette = json.loads((ROOT / 'palette/eclipse-requiem-v2.json').read_text())
    prompts = parse_prompts((ROOT / 'prompts.md').read_text())
    asis = {p.stem: 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode() for p in sorted((SRC / 'asis').glob('*.jpg'))}

    text = ''.join(sorted(set(html + blockout + page + json.dumps(palette, ensure_ascii=False)))) + ''.join(chr(c) for c in range(32, 127))
    fd = galmuri_dir()
    faces = []
    for family, file in (('Galmuri11', 'Galmuri11.woff2'), ('Galmuri11B', 'Galmuri11-Bold.woff2'), ('Galmuri9', 'Galmuri9.woff2')):
        b64 = subset_woff2(fd / file, text)
        faces.append(f'@font-face{{font-family:"{family}";src:url(data:font/woff2;base64,{b64}) format("woff2");font-display:block}}')

    out = (html.replace('/*@FONTFACE@*/', '\n'.join(faces))
           .replace('/*@PALETTE@*/', safe_json(palette))
           .replace('/*@PROMPTS@*/', safe_json(prompts))
           .replace('/*@ASIS@*/', safe_json(asis))
           .replace('/*@BLOCKOUT_JS@*/', blockout.replace('</script', '<\\/script'))
           .replace('/*@PAGE_JS@*/', page.replace('</script', '<\\/script')))
    assert '/*@' not in out, 'unfilled placeholder'
    (ROOT / 'visual-bible-v2.html').write_text(out)

    rows = []
    for r in palette['ramps']:
        for i, h in enumerate(r['colors']):
            rows.append((r['id'] + str(i), h))
    gpl = ['GIMP Palette', f"Name: {palette['name']}", 'Columns: 12', '#']
    gpl += [f'{int(h[1:3], 16):3d} {int(h[3:5], 16):3d} {int(h[5:7], 16):3d}\t{tok}' for tok, h in rows]
    (ROOT / 'palette/eclipse-requiem-v2.gpl').write_text('\n'.join(gpl) + '\n')
    (ROOT / 'palette/eclipse-requiem-v2.hex').write_text('\n'.join(h[1:].lower() for _, h in rows) + '\n')
    print(f"visual-bible-v2.html {len(out) / 1024:.0f} KiB · {len(prompts['items'])} prompts · {len(rows)} colours")


if __name__ == '__main__':
    main()
