"""Read-only size inventory. Writes the requested JSON report, never edits assets."""
import collections
import hashlib
import json
import pathlib
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
assets = root / 'src/assets'
folders = collections.Counter()
extensions = collections.Counter()
hashes = collections.defaultdict(list)
entries = []
for file in sorted(assets.rglob('*')):
    if not file.is_file():
        continue
    data = file.read_bytes()
    name = str(file.relative_to(assets))
    entries.append({'path': name, 'bytes': len(data)})
    folders['/'.join(file.relative_to(assets).parts[:2])] += len(data)
    extensions[file.suffix.lower()] += len(data)
    hashes[hashlib.sha256(data).hexdigest()].append({'path': name, 'bytes': len(data)})
duplicates = sorted((group for group in hashes.values() if len(group) > 1),
                    key=lambda group: -group[0]['bytes'] * (len(group) - 1))
report = {
    'sourceBytes': sum(e['bytes'] for e in entries),
    'largestFolders': folders.most_common(),
    'extensions': extensions.most_common(),
    'largestAssets': sorted(entries, key=lambda e: -e['bytes'])[:50],
    'duplicates': duplicates,
    'duplicateBytes': sum(group[0]['bytes'] * (len(group) - 1) for group in duplicates),
    'packages': []
}
for filename in sys.argv[2:]:
    package = pathlib.Path(filename)
    groups = collections.Counter()
    with zipfile.ZipFile(package) as archive:
        infos = archive.infolist()
        for item in infos:
            name = item.filename.removeprefix('base/')
            group = ('web-media' if name.startswith('assets/public/assets/') else
                     'web-code-and-other' if name.startswith('assets/public/') else
                     '/'.join(name.split('/')[:2]) if name.startswith(('lib/', 'assets/')) else
                     'dex' if name.endswith('.dex') else 'other')
            groups[group] += item.compress_size
        report['packages'].append({
            'path': str(package), 'bytes': package.stat().st_size,
            'compressedGroups': groups.most_common(),
            'largestEntries': [{'path': i.filename, 'bytes': i.file_size, 'compressedBytes': i.compress_size}
                               for i in sorted(infos, key=lambda i: -i.compress_size)[:30]],
            'sourceMaps': [i.filename for i in infos if i.filename.endswith('.map')]
        })
output = pathlib.Path(sys.argv[1])
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2))
print(json.dumps({'sourceBytes': report['sourceBytes'], 'duplicateBytes': report['duplicateBytes'],
                  'packages': [{'path': p['path'], 'bytes': p['bytes']} for p in report['packages']]}, indent=2))
