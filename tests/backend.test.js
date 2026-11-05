// Tests the pure logic in Code.gs (no Google services needed).
const fs = require('fs');
const vm = require('vm');
const P = require('../docs/parsers.js');
const src = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx); vm.runInContext(src, ctx);
const B = ctx.module.exports;
let fails = 0;
const eq = (name, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) { fails++; console.log('✗', name, 'got', JSON.stringify(got), 'expected', JSON.stringify(exp)); } else console.log('✓', name); };

const rules = B.SEED_RULES.map((r, i) => ({id: 'r' + i, pattern: r[0], channel: r[1], category: r[2], priority: r[3]}));
eq('clean city + digits', B.cleanMerchant("LOTUS'S 5018 RAMINTRA BANGKOK"), "LOTUS'S RAMINTRA");
eq('7-11 rule', B.applyRules(rules, 'TMN 7-11 BANGKOK'), {channel: '7-11', category: 'seven'});
eq('shopeepay → Shopee, no category', B.applyRules(rules, 'SHOPEEPAY*SHOPEE Bangkok'), {channel: 'Shopee', category: ''});
eq('grab', B.applyRules(rules, 'WWW.GRAB.COM BANGKOK'), {channel: 'Grab', category: ''});
eq('agoda', B.applyRules(rules, 'AGODA.COM Internet').category, 'travel');
eq('mcd with digits', B.applyRules(rules, 'MCD-00174KANCHANAPISEK NONTHABURI').category, 'food');
eq('apple', B.applyRules(rules, 'APPLE.COM/BILL CORK').category, 'subs');
eq('iservice', B.applyRules(rules, 'TMN ISERVICECCP BANGKOK'), {channel: 'TrueMoney', category: 'bills'});

// Category coverage on the two real statements (local only)
for (const f of ['/tmp/claude-0/tmrw.json', '/tmp/claude-0/one.json'].filter((x) => fs.existsSync(x))) {
  const st = P.parseStatement(P.linesFromItems(JSON.parse(fs.readFileSync(f, 'utf8'))));
  const rows = st.cards[0].rows.filter((r) => r.kind === 'charge');
  const unknown = rows.filter((r) => { const a = B.applyRules(rules, r.description); return !a.category && !a.channel; });
  console.log('  ', f.split('/').pop(), rows.length, 'charges; no rule for:', [...new Set(unknown.map((r) => r.description))].join(' | ') || 'none');
}

// Matching: grab email (card known), partner 7-11 shortcut (no card), wrong amount, too far in date
const txs = [
  {id: 'g1', date: '2026-09-12', amount: 513, type: 'expense', pay: 'uob-one', channel: 'Grab', source: 'grab_email'},
  {id: 'p1', date: '2026-09-17', amount: 53, type: 'expense', pay: '', channel: '7-11', source: 'shortcut', owner: 'partner'},
  {id: 'x1', date: '2026-09-01', amount: 99, type: 'expense', pay: 'uob-one', channel: 'Grab', source: 'grab_email'},
  {id: 'p2', date: '2026-09-17', amount: 12, type: 'expense', pay: '', channel: '7-11', source: 'shortcut'}
];
const rows = [
  {postDate: '2026-09-14', transDate: '2026-09-12', description: 'WWW.GRAB.COM BANGKOK', amount: 513, kind: 'charge'},
  {postDate: '2026-09-21', transDate: '2026-09-17', description: 'TMN 7-11 BANGKOK', amount: 53, kind: 'charge'},
  {postDate: '2026-09-09', transDate: '2026-09-08', description: 'WWW.GRAB.COM BANGKOK', amount: 99, kind: 'charge'},
  {postDate: '2026-09-21', transDate: '2026-09-17', description: 'SHOPEEPAY*SHOPEE Bangkok', amount: 12, kind: 'charge'},
  {postDate: '2026-09-28', transDate: '2026-09-28', description: 'PAYMENT THANK YOU', amount: -100, kind: 'payment'}
];
const m1 = B.matchStatement(txs, rows, 'uob-one', rules, 3);
eq('grab matched by amount+date', m1.pairs.find((p) => p.row === 0).txId, 'g1');
eq('99 is 7 days away → not matched', m1.unmatched.includes(2), true);
eq('shopee 12 not matched to a 7-11 entry', m1.unmatched.includes(3), true);
const m2 = B.matchStatement(txs, rows, 'uob-tmrw', rules, 3);
eq('partner 7-11 matches TMRW row', m2.pairs.some((p) => p.row === 1 && p.txId === 'p1'), true);
eq('payment rows are skipped', m1.pairs.concat(m1.unmatched.map((u) => ({row: u}))).some((p) => p.row === 4), false);

const t = B.txFromRow({postDate: '2026-09-21', transDate: '2026-09-17', description: 'SHOPEEPAY*SHOPEE Bangkok', amount: 352, kind: 'charge'}, 'uob-tmrw', 'st1', rules, () => 'id1', 'now');
eq('new shopee tx is pending with channel', [t.status, t.channel, t.category], ['pending', 'Shopee', '']);
const cb = B.txFromRow({postDate: '2026-10-01', transDate: '2026-10-01', description: 'TMRW CASHBACK', amount: -740, kind: 'cashback'}, 'uob-tmrw', 'st1', rules, () => 'id2', 'now');
eq('cashback tx', [cb.type, cb.amount, cb.category, cb.status], ['cashback', 740, 'cashback', 'ok']);

eq('split ok', B.checkSplits(352, [{category: 'pets', amount: 200}, {category: 'kpop', amount: 152}]), '');
eq('split wrong sum', B.checkSplits(352, [{category: 'pets', amount: 200}]).startsWith('ยอดรวม'), true);

// Grab: real ride receipt (anonymised), plus the HTML → text step on a small sample
const ride = B.parseGrabEmail('Your Grab E-Receipt', fs.readFileSync(__dirname + '/fixtures/grab-ride.txt', 'utf8'));
eq('real ride receipt', [ride.ok, ride.service, ride.product, ride.category, ride.amount, ride.last4, ride.date, ride.bookingId],
   [true, 'transport', 'Saver Bike', 'transport', 39, '1234', '2026-11-04', 'A-TESTBOOKING01']);
eq('ride route', ride.merchant, '7-Eleven Test Branch → Condo Test');
const html = '<html><head><style>.x{color:red}</style></head><body><table><tr><td>Total Paid</td></tr><tr><td>&#3647;1,250.50</td></tr><tr><td>Paid by</td></tr><tr><td><img src=x> 1234</td></tr></table></body></html>';
eq('html → text', B.htmlToText(html).split('\n'), ['Total Paid', '฿1,250.50', 'Paid by', '1234']);
const food = B.parseGrabEmail('Your Grab E-Receipt', 'E-Receipt/Abbreviated Tax Invoice\nGrabFood\nHope you enjoyed your food!\nOrder from\nMatcha Corner\nSubtotal\n฿35\nDelivery fee\n฿10\nTotal Paid\n฿41\nPaid by\n1234');
eq('food (guessed layout)', [food.ok, food.service, food.amount, food.last4, food.merchant], [true, 'food', 41, '1234', 'Matcha Corner']);
const bad = B.parseGrabEmail('Hello from Grab', 'Promo of the week');
eq('unreadable → inbox', bad.ok, false);

eq('verification email is not a receipt', B.isGrabReceipt('Grab: Verify Your Grab Account', 'Verify Your Email Address. To make your Grab account more secure and to receive important messages and transaction history from Grab'), false);
eq('ride receipt is a receipt', B.isGrabReceipt('Your Grab E-Receipt', ''), true);

if (fails) { console.log(fails + ' failed'); process.exit(1); } else console.log('backend tests passed');
