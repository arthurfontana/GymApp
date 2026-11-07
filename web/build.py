"""Monta web/index.html (CSS + JS inline) e web/test.html. Rode de qualquer pasta: python3 web/build.py"""
from pathlib import Path
W = Path(__file__).resolve().parent
rd = lambda n: (W / n).read_text()
src = rd('index.html')
js = rd('app.js') + '\n' + rd('treino.js').replace('/*@@PONTOS@@*/', rd('pontos.js'))
pre = src.split('<script>\n', 1)[0]
M = '/* ================= Jornada de treino ================= */'
a = pre.index(M); b = pre.index('</style>', a)
pre = pre[:a].rstrip('\n') + '\n' + rd('treino.css').strip() + '\n' + pre[b:]
(W / 'index.html').write_text(pre + '<script>\n' + js + '\n</script>\n')
head = pre.split('<script src=')[0]
cdn = pre[len(head):]
test = (head.replace('<link rel="stylesheet" href="https://fonts', '<link rel="x" href="https://fonts')
        + cdn.replace('https://cdn.jsdelivr.net/npm/three@0.128.0', 'node_modules/three')
        + '<script>window.__TEST__=1</script>\n<script>\n' + js + '\n</script>\n')
(W / 'test.html').write_text('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body>' + test + '</body></html>')
print('ok')
