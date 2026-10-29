"""Один архив, чтобы продолжить ролик «ИИ Бизнес сигналы» v2 в другой сессии или передать человеку.

  python3 scripts/signals-v2-handoff.py   → out/kontur-signals-v2-handoff.zip

Внутри: README и docs (handoff/*.md, плюс out/handoff-docs/*.md, если есть), скиллы, итоговые видео, сценарии .docx,
пакет ассетов (с раскадровкой), исходники проекта (файлы git + src/fontData.ts, без node_modules и out).
Перед запуском: signals-v2-finish.py, signals-v2-storyboard.py, signals-v2-pack.py.
"""
import glob, os, shutil, subprocess, zipfile

NAME = 'kontur-signals-v2-handoff'
STAGE = f'out/handoff/{NAME}'
ZIP = f'out/{NAME}.zip'
REPO = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, check=True).stdout.strip()
HERE = os.path.relpath(os.getcwd(), REPO)  # kontur-market-video
STORED = ('.mp4', '.jpg', '.png', '.pdf', '.zip', '.docx')  # уже сжатые — без повторного сжатия


def put(src, dst):
    dst = os.path.join(STAGE, dst)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    (shutil.copytree if os.path.isdir(src) else shutil.copy2)(src, dst)


shutil.rmtree(STAGE, ignore_errors=True)
os.makedirs(STAGE)

put('handoff/README.md', 'README.md')
for f in ['REVIEW.md', 'PROCESS.md', 'FIGMA.md', *[os.path.basename(p) for p in sorted(glob.glob('out/handoff-docs/*.md'))]]:
    put(f'handoff/{f}' if os.path.exists(f'handoff/{f}') else f'out/handoff-docs/{f}', f'docs/{f}')

for d in sorted(glob.glob(f'{REPO}/.claude/skills/*')):
    put(d, f'skill/{os.path.basename(d)}')

for f in sorted(glob.glob('out/signals-v2/*')):
    if '-raw.' not in f:
        put(f, f'video/{os.path.basename(f)}')

for f in sorted(glob.glob('*.docx')):
    put(f, f'texts/{f}')

put('out/signals-v2-assets', 'assets')

# исходники: всё, что в git (и новое, не игнорируемое), в структуре репозитория + встроенный шрифт
files = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '--', HERE, '.claude/skills'],
                       cwd=REPO, capture_output=True, text=True, check=True).stdout.split('\n')
for f in [*filter(None, files), f'{HERE}/src/fontData.ts']:
    if os.path.isfile(os.path.join(REPO, f)):
        put(os.path.join(REPO, f), f'project/{f}')

if os.path.exists(ZIP):
    os.remove(ZIP)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for root, _, names in os.walk(STAGE):
        for n in sorted(names):
            p = os.path.join(root, n)
            z.write(p, os.path.relpath(p, os.path.dirname(STAGE)), compress_type=zipfile.ZIP_STORED if n.lower().endswith(STORED) else None)

for d in sorted(os.listdir(STAGE)):
    p = os.path.join(STAGE, d)
    size = sum(os.path.getsize(os.path.join(r, n)) for r, _, ns in os.walk(p) for n in ns) if os.path.isdir(p) else os.path.getsize(p)
    print(f'{d:12s} {size / 1e6:7.1f} MB')
print(f'{ZIP}: {os.path.getsize(ZIP) / 1e6:.1f} MB')
