import fs from 'fs';
const p = 'tools/gen_input.py';
const raw = fs.readFileSync(p, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

// L623 の直前に、検出器位置の事前収集と警告リストを置く
const i = lines.findIndex(l => /materials, sources, detectors = \{\}, \[\], \[\]/.test(l));
if (i < 0) { console.log('NOT FOUND'); process.exit(1); }
const indent = lines[i].match(/^(\s*)/)[1];

lines.splice(i, 0, ...[
  indent + '# 散布線源のピッチを決めるのに検出器の位置が要るので、先に集める。',
  indent + '#   点線源近似では線源片の大きさが検出器までの距離に対して十分',
  indent + '#   小さい必要があり、既定ピッチはその距離から決まる。',
  indent + 'det_positions = []',
  indent + 'for o in doc.Objects:',
  indent + "    if (getattr(o, 'PokerRole', None) or '').strip().lower() != 'detector':",
  indent + '        continue',
  indent + "    sh = getattr(o, 'Shape', None)",
  indent + '    if sh is None or sh.isNull():',
  indent + '        continue',
  indent + '    c = sh.CenterOfMass',
  indent + '    det_positions.append((c.x, c.y, c.z))',
  indent + '',
  indent + 'warnings = []',
]);

fs.writeFileSync(p, lines.join(nl), 'utf8');
console.log('ok: det_positions と warnings を追加 (L' + (i + 1) + ')');
