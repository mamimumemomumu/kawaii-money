const P = require('../docs/parsers.js');
const fs = require('fs');
// Needs your own statements dumped with tests/dump_items.py into /tmp/claude-0/ (not stored in the repo: they hold personal data).
if (!fs.existsSync('/tmp/claude-0/tmrw.json')) { console.log('parser tests skipped (no local statement samples)'); process.exit(0); }
for (const [f, exp] of [['/tmp/claude-0/tmrw.json', 44371.72], ['/tmp/claude-0/one.json', 4171.41]]) {
  const lines = P.linesFromItems(JSON.parse(fs.readFileSync(f, 'utf8')));
  const r = P.parseStatement(lines);
  const c = r.cards[0];
  const kinds = c.rows.reduce((m, x) => (m[x.kind] = (m[x.kind] || 0) + 1, m), {});
  console.log(f.split('/').pop(), r.statementDate, r.dueDate, r.creditLine, 'cards', r.cards.length, c.last4, JSON.stringify(c.name), 'rows', c.rows.length, JSON.stringify(kinds), 'check', JSON.stringify(c.check));
  if (!c.check.ok || Math.abs(c.totalBalance - exp) > 0.001) { console.error('FAIL'); process.exit(1); }
}
console.log('parser tests passed');
