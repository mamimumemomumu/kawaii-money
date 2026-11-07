/**
 * Kawaii Money 🌸 — backend (Google Apps Script + Google Sheets)
 *
 * No AI anywhere: statements are parsed with fixed rules, categories come from a rules table.
 * Paste this whole file into Extensions → Apps Script of your spreadsheet, run `setup` once,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * See SETUP.md for every step.
 */

// ───────────────────────── Table layout ─────────────────────────
var TABLES = {
  Transactions: ['id', 'date', 'post_date', 'amount', 'type', 'pay', 'channel', 'merchant', 'note', 'category',
                 'owner', 'settled', 'status', 'source', 'statement_id', 'tags', 'ref', 'created_at', 'updated_at'],
  Splits:       ['id', 'tx_id', 'category', 'amount', 'item'],
  Categories:   ['id', 'name_th', 'name_en', 'emoji', 'color', 'parent', 'budget', 'order', 'hidden', 'kind'],
  Rules:        ['id', 'pattern', 'channel', 'category', 'priority', 'origin'],
  Cards:        ['id', 'name', 'bank', 'last4', 'cut_day', 'due_day', 'credit_line', 'color', 'default_for'],
  Statements:   ['id', 'card', 'statement_date', 'due_date', 'previous', 'total', 'rows', 'matched', 'created', 'imported_at'],
  Recurring:    ['id', 'name', 'amount', 'type', 'pay', 'category', 'day', 'active', 'last_run', 'note'],
  Inbox:        ['id', 'received_at', 'source', 'subject', 'raw', 'status', 'note'],
  Settings:     ['key', 'value']
};
// Columns kept as plain text so Sheets never turns them into dates or drops leading zeros.
var TEXT_COLS = ['id', 'tx_id', 'date', 'post_date', 'statement_date', 'due_date', 'created_at', 'updated_at',
                 'received_at', 'imported_at', 'last_run', 'last4', 'statement_id', 'ref', 'key', 'value', 'pattern'];
var NUM_COLS = ['amount', 'budget', 'order', 'priority', 'cut_day', 'due_day', 'credit_line', 'previous', 'total',
                'rows', 'matched', 'created', 'day'];
var BOOL_COLS = ['hidden', 'settled', 'active'];

// Transaction types. "out" = money spent, "in" = money received, "move" = not counted as spending.
var TYPE_DIR = {expense: 'out', income: 'in', refund: 'in', cashback: 'in', cash_withdraw: 'move', payment: 'move', adjust: 'out'};

// ───────────────────────── Seed data ─────────────────────────
var SEED_CATEGORIES = [
  ['food', 'อาหาร', 'Food & drink', '🍜', '#ff8a5c', '', '', 1, false, 'expense'],
  ['transport', 'เดินทาง', 'Transport', '🚕', '#93c5fd', '', '', 2, false, 'expense'],
  ['seven', '7-11', '7-11', '🏪', '#ff6fa8', '', '', 3, false, 'expense'],
  ['groceries', 'ซูเปอร์มาร์เก็ต', 'Groceries', '🥬', '#86efac', '', '', 4, false, 'expense'],
  ['shopping', 'ช้อปปิ้ง', 'Shopping', '👗', '#c084fc', '', '', 5, false, 'expense'],
  ['beauty', 'ความงาม', 'Beauty', '💄', '#f9a8d4', '', '', 6, false, 'expense'],
  ['home', 'ของใช้ในบ้าน', 'Home', '🏠', '#fcd34d', '', '', 7, false, 'expense'],
  ['pets', 'ค่าอาหารแมว', 'Cat food', '🐱', '#fdba74', '', '', 8, false, 'expense'],
  ['family', 'ครอบครัว', 'Family', '👨‍👩‍👧', '#fb7185', '', '', 9, false, 'expense'],
  ['kpop', 'ติ่งเกาหลี', 'K-pop', '💜', '#a78bfa', '', '', 10, false, 'expense'],
  ['travel', 'เที่ยว', 'Travel', '✈️', '#60a5fa', '', '', 11, false, 'expense'],
  ['health', 'สุขภาพ', 'Health', '💊', '#34d399', '', '', 12, false, 'expense'],
  ['bills', 'บิลและบริการ', 'Bills & services', '💡', '#a3a3f5', '', '', 13, false, 'expense'],
  ['subs', 'Subscription', 'Subscriptions', '🍎', '#f472b6', '', '', 14, false, 'expense'],
  ['gifts', 'ของขวัญ', 'Gifts', '🎁', '#f87171', '', '', 15, false, 'expense'],
  ['cash-misc', 'เงินสดทั่วไป', 'Cash (misc)', '💵', '#a3e635', '', '', 16, false, 'expense'],
  ['other', 'อื่นๆ', 'Other', '🏷️', '#d4d4d8', '', '', 17, false, 'expense'],
  ['salary', 'เงินเดือน', 'Salary', '💼', '#2fa36b', '', '', 30, false, 'income'],
  ['income-other', 'รายรับอื่น', 'Other income', '💰', '#4ade80', '', '', 31, false, 'income'],
  ['cashback', 'Cashback', 'Cashback', '🪙', '#22c55e', '', '', 32, false, 'income']
];
// pattern (matched against the cleaned merchant text), channel, category, priority
var SEED_RULES = [
  ['SHOPEEPAY', 'Shopee', '', 20], ['SHOPEE', 'Shopee', '', 19], ['GRAB', 'Grab', '', 19],
  ['TMN 7-11', '7-11', 'seven', 20], ['7-ELEVEN', '7-11', 'seven', 20], ['7-11', '7-11', 'seven', 18],
  ['BTS', 'BTS/MRT', 'transport', 15], ['MRT', 'BTS/MRT', 'transport', 15],
  ['LOTUS', '', 'groceries', 10], ['BIG C', '', 'groceries', 10], ['TOPS', '', 'groceries', 9], ['MAKRO', '', 'groceries', 10],
  ['GOURMET MARKET', '', 'groceries', 10],
  ['BOOKING.COM', '', 'travel', 10], ['AGODA', '', 'travel', 10], ['TRIPCOM', '', 'travel', 10], ['TRIP.COM', '', 'travel', 10],
  ['AIRASIA', '', 'travel', 10], ['THAI AIRWAYS', '', 'travel', 10], ['NOK AIR', '', 'travel', 10],
  ['APPLE.COM/BILL', '', 'subs', 12], ['NETFLIX', '', 'subs', 12], ['SPOTIFY', '', 'subs', 12], ['YOUTUBE', '', 'subs', 11],
  ['MCD', '', 'food', 8], ['KFC', '', 'food', 8], ['STARBUCKS', '', 'food', 8], ['SUSHI', '', 'food', 7], ['HOTPOT', '', 'food', 7],
  ['CAFE', '', 'food', 5], ['COFFEE', '', 'food', 5], ['RESTAURANT', '', 'food', 5],
  ['HOSPITAL', '', 'health', 8], ['MEDICAL', '', 'health', 8], ['CLINIC', '', 'health', 8], ['PHARMACY', '', 'health', 8],
  ['FACULTY OF ALLIED', '', 'health', 9], ['BOOTS', '', 'health', 6], ['WATSONS', '', 'beauty', 6],
  ['TMN ISERVICE', 'TrueMoney', 'bills', 12]
];
var SEED_CARDS = [
  ['uob-tmrw', 'UOB TMRW', 'UOB', '', 7, 30, '', '#ff6fa8', 'Shopee,7-11'],
  ['uob-one', 'UOB ONE', 'UOB', '', 7, 30, '', '#fb7185', 'Grab,BTS/MRT'],
  ['ttb', 'ttb', 'ttb', '', '', '', '', '#60a5fa', ''],
  ['scb', 'SCB', 'SCB', '', '', '', '', '#a78bfa', '']
];
var DEFAULT_GRAB_QUERY = '(from:grab.com OR subject:"Grab E-Receipt" OR subject:"GrabFood" OR subject:"Your Grab") newer_than:14d -label:km-done';

// ───────────────────────── Pure helpers (no Google services; tested in Node) ─────────────────────────
var CITY_WORDS = ['BANGKOK', 'BKK', 'NONTHABURI', 'PATHUMTHANI', 'PATHUM THANI', 'SAMUTPRAKAN', 'SAMUT PRAKAN', 'CHIANGMAI',
                  'CHIANG MAI', 'PHUKET', 'THAILAND', 'TH', 'INTERNET'];

/** Clean a merchant line so rules match: upper case, no long digit runs, no trailing city. */
function cleanMerchant(s) {
  var t = String(s || '').toUpperCase().replace(/\d{3,}/g, ' ').replace(/\s+/g, ' ').trim();
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i < CITY_WORDS.length; i++) {
      var w = ' ' + CITY_WORDS[i];
      if (t.length > w.length && t.slice(-w.length) === w) { t = t.slice(0, -w.length).trim(); changed = true; }
    }
  }
  return t;
}

/** Pick channel and category for a merchant from the rules (highest priority wins, each field separately). */
function applyRules(rules, merchant) {
  var text = cleanMerchant(merchant);
  var sorted = rules.slice().sort(function (a, b) { return Number(b.priority || 0) - Number(a.priority || 0); });
  var res = {channel: '', category: ''};
  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i], p = String(r.pattern || '').toUpperCase().trim();
    if (!p || text.indexOf(cleanMerchant(p) || p) === -1) continue;
    if (!res.channel && r.channel) res.channel = r.channel;
    if (!res.category && r.category) res.category = r.category;
    if (res.channel && res.category) break;
  }
  return res;
}

function daysBetween(a, b) {
  var da = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  var db = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round(Math.abs(da - db) / 86400000);
}

var KIND_TO_TYPE = {charge: 'expense', refund: 'refund', cashback: 'cashback', payment: 'payment'};

/**
 * Match statement rows to transactions already recorded during the month.
 * A row matches an unmatched transaction with the same amount, same type direction, a date within
 * `windowDays`, and the same card (or no card yet, e.g. a "ของแฟน" shortcut entry). Closest date wins.
 * Returns {pairs: [{row, txId}], unmatched: [rowIndex]}.
 */
function matchStatement(txs, rows, cardId, rules, windowDays) {
  var win = windowDays == null ? 3 : Number(windowDays);
  var used = {}, pairs = [], unmatched = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.kind === 'payment') continue;
    var type = KIND_TO_TYPE[row.kind] || 'expense';
    var amount = Math.abs(Number(row.amount));
    var rowChannel = applyRules(rules, row.description).channel;
    var best = null, bestD = 1e9;
    for (var j = 0; j < txs.length; j++) {
      var t = txs[j];
      if (used[t.id] || t.statement_id || t.source === 'statement') continue;
      if (TYPE_DIR[t.type] !== TYPE_DIR[type]) continue;
      if (Math.abs(Number(t.amount) - amount) > 0.005) continue;
      if (t.pay && t.pay !== cardId) continue;
      if (!t.pay && t.channel && rowChannel && t.channel !== rowChannel) continue;
      var d = daysBetween(String(t.date), row.transDate);
      if (d > win) continue;
      if (d < bestD) { best = t; bestD = d; }
    }
    if (best) { used[best.id] = true; pairs.push({row: i, txId: best.id}); } else unmatched.push(i);
  }
  return {pairs: pairs, unmatched: unmatched};
}

/** Build a new transaction from a statement row. */
function txFromRow(row, cardId, statementId, rules, idFn, now) {
  var type = KIND_TO_TYPE[row.kind] || 'expense';
  var r = applyRules(rules, row.description);
  var category = r.category;
  if (type === 'cashback') category = 'cashback';
  return {
    id: idFn(), date: row.transDate, post_date: row.postDate, amount: Math.abs(Number(row.amount)), type: type,
    pay: cardId, channel: r.channel, merchant: row.description, note: '', category: category,
    owner: 'me', settled: false, status: category || type === 'refund' ? 'ok' : 'pending', source: 'statement',
    statement_id: statementId, tags: '', ref: '', created_at: now, updated_at: now
  };
}

/** Turn an HTML email into plain lines of text (Grab sends HTML only; its text part is empty). */
function htmlToText(htmlStr) {
  var t = String(htmlStr || '');
  t = t.replace(/<(style|head|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  t = t.replace(/<br\s*\/?>|<\/(div|tr|p|td|th|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
       .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); });
  return t.split('\n').map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); }).filter(Boolean).join('\n');
}

var EN_MONTHS = {JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6, JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12};

/**
 * Read a Grab e-receipt (text from htmlToText). Built from a real ride receipt (Nov 2026):
 *   "E-Receipt/Abbreviated Tax Invoice" · product ("Saver Bike") · "Hope you enjoyed your ride!" · "Picked up on 04 November 2026"
 *   "Booking ID: A-…" · "Total Paid" / "฿39" · "Paid by" / "1234" · "Your Trip" · pickup / time / drop-off / time
 * Food receipts are not confirmed yet, so food detection uses common words. Anything unreadable goes to the Inbox.
 * Returns {ok, service, product, category, amount, last4, merchant, date, bookingId, why}.
 */
function parseGrabEmail(subject, body) {
  var text = String(body || '').replace(/ /g, ' ');
  var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  var all = String(subject || '') + '\n' + text;

  var product = '';
  for (var p0 = 0; p0 < Math.min(lines.length, 30); p0++) {
    if (lines[p0].length < 30 && /^(Grab[A-Za-z]+|.*\b(Bike|Car|Taxi|Saver|Mart|Express)\b.*)$/.test(lines[p0])) { product = lines[p0]; break; }
  }
  if (!product) for (var i = 0; i < lines.length - 1; i++) {
    if (/E-Receipt|Tax Invoice|ใบเสร็จ/i.test(lines[i]) && !/Number|เลขที่|\[image/i.test(lines[i])) { product = lines[i + 1]; break; }
  }

  var service = '';
  var tests = [
    ['mart', /GrabMart|Grab Mart|\bMart\b/i],
    ['express', /GrabExpress|Grab Express|\bExpress\b|ส่งของ|ส่งพัสดุ/i],
    ['food', /GrabFood|Grab Food|enjoyed your (food|meal|order)|Order Summary|Your Order|Ordered from|Order from|Restaurant|ร้านอาหาร|สั่งอาหาร|ทานอาหารให้อร่อย|ค่าอาหาร/i],
    ['transport', /enjoyed your ride|Your Trip|Picked up on|Dropped off|\bBike\b|GrabCar|GrabTaxi|JustGrab|\bTaxi\b|\bCar\b|การเดินทาง|เดินทาง/i]
  ];
  for (var k = 0; k < tests.length; k++) {
    if (tests[k][1].test(product) || (k >= 2 && tests[k][1].test(all))) { service = tests[k][0]; break; }
  }
  var category = {food: 'food', mart: 'groceries', express: 'transport', transport: 'transport'}[service] || '';

  var amount = null, m;
  m = /(?:Total Paid|Amount Paid|ยอดชำระ(?:ทั้งหมด)?|ยอดที่ชำระ)\s*\n?\s*(?:฿|THB|บาท)?\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  if (!m) m = /(?:^|\n)[ \t]*(?:TOTAL|Total|ยอดรวม|รวมทั้งสิ้น|รวม)[ \t]*\n?[ \t]*(?:฿|THB)\s*([\d,]+(?:\.\d{1,2})?)/.exec(text);
  if (m) amount = Number(m[1].replace(/,/g, ''));

  var last4 = '';
  m = /(?:Paid by|Payment method|ชำระโดย|ชำระด้วย|รูปแบบการชำระเงิน)\s*[:：]?\s*\n?[^\n\d]*?(\d{4})\b/i.exec(text) || /(?:•{2,}|\*{2,}|[xX]{4}|ending in|ลงท้ายด้วย)\s*(\d{4})\b/.exec(text);
  if (m) last4 = m[1];

  var bm = /(?:Booking ID|รหัสการจอง)\s*[:：]?\s*([A-Z0-9-]{6,})/i.exec(text);
  var bookingId = bm ? bm[1] : '';

  var date = '';
  var dm = /(?:Picked up on|Ordered on|Delivered on|Booked on)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i.exec(text);
  if (dm && EN_MONTHS[dm[2].toUpperCase()]) date = dm[3] + '-' + String(EN_MONTHS[dm[2].toUpperCase()]).padStart(2, '0') + '-' + String(dm[1]).padStart(2, '0');
  if (!date) {
    var d2 = /\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{2}|\d{4})\s+\d{1,2}:\d{2}/.exec(text);
    var mon = d2 && Object.keys(EN_MONTHS).filter(function (k) { return k.slice(0, 3) === d2[2].toUpperCase(); })[0];
    if (mon) date = (d2[3].length === 2 ? '20' + d2[3] : d2[3]) + '-' + String(EN_MONTHS[mon]).padStart(2, '0') + '-' + String(d2[1]).padStart(2, '0');
  }

  // Thai template: "สถานที่เริ่มต้นการเดินทาง:" (the restaurant, for food) and "สถานที่ปลายทาง:"
  var from = /สถานที่เริ่มต้นการเดินทาง\s*[:：]?\s*\n\s*([^\n]+)/.exec(text), to = /สถานที่ปลายทาง\s*[:：]?\s*\n\s*([^\n]+)/.exec(text);
  var items = [];
  var ir = /(?:^|\n)[ \t]*\d+\s*x\s+(.+?)\s+฿\s*[\d,.]+[ \t]*(?=\n|$)/g, im;
  while ((im = ir.exec(text)) !== null) items.push(im[1].trim());

  // Ride: the trip section lists each stop followed by its time ("9:19PM").
  var merchant = '';
  var stops = [];
  for (var j = 1; j < lines.length; j++) if (/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(lines[j]) && !/^[⋮•]+$/.test(lines[j - 1])) stops.push(lines[j - 1]);
  if (service === 'transport' && stops.length >= 2) merchant = stops[0] + ' → ' + stops[stops.length - 1];
  if (!merchant && from && service === 'transport') merchant = from[1].trim() + (to ? ' → ' + to[1].trim() : '');
  if (!merchant && from && service !== 'transport') merchant = from[1].trim();
  if (!merchant) {
    var om = /(?:Ordered from|Order from|สั่งจาก)\s*[:：]?\s*\n?\s*([^\n]{2,60})/i.exec(text);
    if (om) merchant = om[1].trim();
  }
  if (!merchant) merchant = product ? 'Grab ' + product : 'Grab';

  var why = [];
  if (!service) why.push('ไม่รู้ว่าเป็น Food หรือ Transport');
  if (amount == null || !(amount > 0)) why.push('หายอดเงินไม่เจอ');
  return {ok: why.length === 0, service: service, product: product, category: category, amount: amount, last4: last4,
          merchant: merchant, date: date, bookingId: bookingId, items: items, why: why.join(', ')};
}

/** True for a real Grab receipt. Account, promo and verification emails from Grab are skipped quietly. */
function isGrabReceipt(subject, body) {
  return /E-?Receipt|Tax Invoice|ใบเสร็จ|ใบกำกับภาษี|Total Paid|ยอดชำระ/i.test(String(subject || '') + '\n' + String(body || ''));
}

/** Validate a split: lines must add up to the transaction amount. */
function checkSplits(txAmount, splits) {
  var sum = 0;
  for (var i = 0; i < splits.length; i++) {
    var a = Number(splits[i].amount);
    if (!(a > 0)) return 'ยอดในแต่ละบรรทัดต้องมากกว่า 0';
    if (!splits[i].category) return 'ทุกบรรทัดต้องมีหมวด';
    sum += a;
  }
  if (Math.abs(sum - Number(txAmount)) > 0.01) return 'ยอดรวมของการแบ่ง (' + sum.toFixed(2) + ') ไม่เท่ากับยอดรายการ (' + Number(txAmount).toFixed(2) + ')';
  return '';
}

// ───────────────────────── Sheet access ─────────────────────────
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function nowIso_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ss"); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'); }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('ไม่พบแท็บ ' + name + ' — ลองรัน setup อีกครั้ง');
  return sh;
}

function coerce_(col, v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', col.indexOf('_at') > -1 ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
  if (NUM_COLS.indexOf(col) > -1) return v === '' || v === null ? '' : Number(v);
  if (BOOL_COLS.indexOf(col) > -1) return v === true || String(v).toUpperCase() === 'TRUE';
  return v === null ? '' : String(v);
}

function readTable_(name) {
  var sh = sheet_(name), cols = TABLES[name];
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, cols.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    if (vals[i].join('') === '') continue;
    var o = {};
    for (var c = 0; c < cols.length; c++) o[cols[c]] = coerce_(cols[c], vals[i][c]);
    out.push(o);
  }
  return out;
}

function toRow_(name, o) {
  return TABLES[name].map(function (c) {
    var v = o[c];
    if (v === undefined || v === null) return '';
    if (BOOL_COLS.indexOf(c) > -1) return v === true || String(v).toUpperCase() === 'TRUE';
    return v;
  });
}

function appendRows_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name);
  sh.getRange(sh.getLastRow() + 1, 1, objs.length, TABLES[name].length).setValues(objs.map(function (o) { return toRow_(name, o); }));
}

/** Insert or update rows by their first column (id or key). */
function upsertRows_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name), cols = TABLES[name], key = cols[0];
  var n = Math.max(0, sh.getLastRow() - 1);
  var ids = n ? sh.getRange(2, 1, n, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var adds = [];
  objs.forEach(function (o) {
    var idx = ids.indexOf(String(o[key]));
    if (idx === -1) { adds.push(o); return; }
    var cur = {}, row = sh.getRange(idx + 2, 1, 1, cols.length).getValues()[0];
    cols.forEach(function (c, i) { cur[c] = row[i]; });
    Object.keys(o).forEach(function (k) { if (cols.indexOf(k) > -1) cur[k] = o[k]; });
    sh.getRange(idx + 2, 1, 1, cols.length).setValues([toRow_(name, cur)]);
  });
  appendRows_(name, adds);
}

function deleteRowsWhere_(name, fn) {
  var sh = sheet_(name), rows = readTable_(name);
  var n = Math.max(0, sh.getLastRow() - 1);
  if (!n) return 0;
  var vals = sh.getRange(2, 1, n, TABLES[name].length).getValues(), count = 0;
  for (var i = vals.length - 1; i >= 0; i--) {
    var o = {};
    TABLES[name].forEach(function (c, k) { o[c] = coerce_(c, vals[i][k]); });
    if (vals[i].join('') !== '' && fn(o)) { sh.deleteRow(i + 2); count++; }
  }
  return count;
}

function settings_() {
  var o = {};
  readTable_('Settings').forEach(function (r) { o[r.key] = r.value; });
  return o;
}
function setSetting_(k, v) { upsertRows_('Settings', [{key: k, value: String(v)}]); }

// ───────────────────────── Setup ─────────────────────────
/** Run once from the Apps Script editor. Safe to run again: it only adds what is missing. */
function setup() {
  var ss = ss_();
  Object.keys(TABLES).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = TABLES[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#ffe4ef');
    sh.setFrozenRows(1);
    cols.forEach(function (c, i) { if (TEXT_COLS.indexOf(c) > -1) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
  });
  var first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' || first.getName() === 'แผ่น1') { if (first.getLastRow() === 0) ss.deleteSheet(first); }

  if (!readTable_('Categories').length) appendRows_('Categories', SEED_CATEGORIES.map(function (r) {
    var o = {}; TABLES.Categories.forEach(function (c, i) { o[c] = r[i]; }); return o;
  }));
  if (!readTable_('Rules').length) appendRows_('Rules', SEED_RULES.map(function (r) {
    return {id: newId_(), pattern: r[0], channel: r[1], category: r[2], priority: r[3], origin: 'seed'};
  }));
  if (!readTable_('Cards').length) appendRows_('Cards', SEED_CARDS.map(function (r) {
    var o = {}; TABLES.Cards.forEach(function (c, i) { o[c] = r[i]; }); return o;
  }));
  var s = settings_();
  if (!s.token) setSetting_('token', Utilities.getUuid().replace(/-/g, ''));
  if (!s.match_days) setSetting_('match_days', '3');
  if (!s.partner_name) setSetting_('partner_name', 'แฟน');
  if (!s.grab_query) setSetting_('grab_query', DEFAULT_GRAB_QUERY);
  if (!s.cash_start) setSetting_('cash_start', '0');

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['fetchGrabEmails', 'runRecurring'].indexOf(t.getHandlerFunction()) > -1) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('fetchGrabEmails').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('runRecurring').timeBased().everyDays(1).atHour(6).create();

  Logger.log('✅ ตั้งค่าเสร็จแล้ว รหัสลับ (token) ของคุณคือ: ' + settings_().token);
  Logger.log('ขั้นต่อไป: Deploy → New deployment → Web app แล้วคัดลอก URL ไปใส่ในแอป');
}

// ───────────────────────── Web API ─────────────────────────
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  try {
    auth_(e.parameter.token);
    return json_({ok: true, data: bootstrap_()});
  } catch (err) { return json_({ok: false, error: String(err.message || err)}); }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData && e.postData.contents || '{}'); } catch (x) { return json_({ok: false, error: 'อ่านข้อมูลที่ส่งมาไม่ได้'}); }
  var lock = LockService.getScriptLock();
  try {
    auth_(body.token || (e.parameter && e.parameter.token));
    lock.waitLock(20000);
    var fn = ACTIONS[body.action];
    if (!fn) throw new Error('ไม่รู้จักคำสั่ง ' + body.action);
    var result = fn(body) || {};
    var out = {ok: true, result: result};
    if (body.action !== 'quick' && body.action !== 'ping') out.data = bootstrap_();
    return json_(out);
  } catch (err) {
    return json_({ok: false, error: String(err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function auth_(token) {
  var s = settings_();
  if (!s.token || String(token || '') !== String(s.token)) throw new Error('รหัสลับไม่ถูกต้อง');
}

function bootstrap_() {
  var s = settings_();
  delete s.token;
  return {
    transactions: readTable_('Transactions'), splits: readTable_('Splits'), categories: readTable_('Categories'),
    rules: readTable_('Rules'), cards: readTable_('Cards'), statements: readTable_('Statements'),
    recurring: readTable_('Recurring'), inbox: readTable_('Inbox').filter(function (r) { return r.status !== 'done'; }),
    settings: s, today: today_()
  };
}

var ACTIONS = {
  ping: function () { return {pong: true, today: today_()}; },
  bootstrap: function () { return {}; },

  /** Create or update one transaction. */
  saveTx: function (b) {
    var t = b.tx || {}, now = nowIso_();
    if (!(Number(t.amount) > 0)) throw new Error('ยอดเงินต้องมากกว่า 0');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))) throw new Error('วันที่ไม่ถูกต้อง');
    if (!t.id) {
      t.id = newId_(); t.created_at = now; t.source = t.source || 'manual';
      t.owner = t.owner || 'me'; t.type = t.type || 'expense';
    }
    t.updated_at = now;
    if (t.category && t.status === 'pending') t.status = 'ok';
    if (!t.status) t.status = t.category || t.type !== 'expense' ? 'ok' : 'pending';
    upsertRows_('Transactions', [t]);
    return {id: t.id};
  },

  deleteTx: function (b) {
    deleteRowsWhere_('Splits', function (s) { return s.tx_id === b.id; });
    deleteRowsWhere_('Transactions', function (t) { return t.id === b.id; });
    return {};
  },

  /** Replace a transaction's split lines. One line = plain category. */
  setSplits: function (b) {
    var tx = readTable_('Transactions').filter(function (t) { return t.id === b.tx_id; })[0];
    if (!tx) throw new Error('ไม่พบรายการ');
    var lines = b.splits || [];
    var err = checkSplits(tx.amount, lines);
    if (err) throw new Error(err);
    deleteRowsWhere_('Splits', function (s) { return s.tx_id === tx.id; });
    if (lines.length === 1) {
      upsertRows_('Transactions', [{id: tx.id, category: lines[0].category, status: 'ok', updated_at: nowIso_()}]);
    } else {
      appendRows_('Splits', lines.map(function (l) { return {id: newId_(), tx_id: tx.id, category: l.category, amount: Number(l.amount), item: l.item || ''}; }));
      upsertRows_('Transactions', [{id: tx.id, category: '', status: 'ok', updated_at: nowIso_()}]);
    }
    return {};
  },

  /**
   * Change a transaction's category. scope: 'one' (just this), 'future' (also add a rule for this merchant),
   * 'all' (rule + every past transaction from this merchant that has no split).
   */
  setCategory: function (b) {
    var txs = readTable_('Transactions'), tx = txs.filter(function (t) { return t.id === b.id; })[0];
    if (!tx) throw new Error('ไม่พบรายการ');
    var now = nowIso_(), changes = [{id: tx.id, category: b.category, status: 'ok', updated_at: now}];
    var key = cleanMerchant(tx.merchant);
    if ((b.scope === 'future' || b.scope === 'all') && key) {
      var rules = readTable_('Rules'), existing = rules.filter(function (r) { return String(r.pattern).toUpperCase() === key && r.origin === 'user'; })[0];
      upsertRows_('Rules', [{id: existing ? existing.id : newId_(), pattern: key, channel: existing ? existing.channel : '', category: b.category, priority: 50, origin: 'user'}]);
    }
    if (b.scope === 'all' && key) {
      var split = {};
      readTable_('Splits').forEach(function (s) { split[s.tx_id] = true; });
      txs.forEach(function (t) {
        if (t.id !== tx.id && !split[t.id] && cleanMerchant(t.merchant) === key) changes.push({id: t.id, category: b.category, status: 'ok', updated_at: now});
      });
    }
    upsertRows_('Transactions', changes);
    return {changed: changes.length};
  },

  /** Tag a transaction as the partner's (owner = 'partner') or yours again. */
  setOwner: function (b) {
    upsertRows_('Transactions', [{id: b.id, owner: b.owner === 'partner' ? 'partner' : 'me', updated_at: nowIso_()}]);
    return {};
  },

  saveCategory: function (b) {
    var c = b.category || {};
    if (!c.name_th) throw new Error('ต้องมีชื่อหมวด');
    if (!c.id) c.id = 'c' + newId_().slice(0, 8);
    if (c.order === undefined || c.order === '') c.order = readTable_('Categories').length + 1;
    upsertRows_('Categories', [c]);
    return {id: c.id};
  },

  /** Move everything from one category into another, then hide the old one. */
  mergeCategory: function (b) {
    if (!b.from || !b.to || b.from === b.to) throw new Error('เลือกหมวดให้ถูกต้อง');
    var now = nowIso_();
    upsertRows_('Transactions', readTable_('Transactions').filter(function (t) { return t.category === b.from; })
      .map(function (t) { return {id: t.id, category: b.to, updated_at: now}; }));
    upsertRows_('Splits', readTable_('Splits').filter(function (s) { return s.category === b.from; })
      .map(function (s) { return {id: s.id, category: b.to}; }));
    upsertRows_('Rules', readTable_('Rules').filter(function (r) { return r.category === b.from; })
      .map(function (r) { return {id: r.id, category: b.to}; }));
    upsertRows_('Recurring', readTable_('Recurring').filter(function (r) { return r.category === b.from; })
      .map(function (r) { return {id: r.id, category: b.to}; }));
    upsertRows_('Categories', [{id: b.from, hidden: true}]);
    return {};
  },

  reorderCategories: function (b) {
    upsertRows_('Categories', (b.ids || []).map(function (id, i) { return {id: id, order: i + 1}; }));
    return {};
  },

  saveRule: function (b) {
    var r = b.rule || {};
    if (!r.pattern) throw new Error('ต้องมีคำที่ใช้จับ');
    if (!r.id) { r.id = newId_(); r.origin = r.origin || 'user'; }
    if (r.priority === undefined || r.priority === '') r.priority = 50;
    upsertRows_('Rules', [r]);
    return {id: r.id};
  },
  deleteRule: function (b) { deleteRowsWhere_('Rules', function (r) { return r.id === b.id; }); return {}; },

  saveCard: function (b) {
    var c = b.card || {};
    if (!c.name) throw new Error('ต้องมีชื่อบัตร');
    if (!c.id) c.id = 'card-' + newId_().slice(0, 6);
    upsertRows_('Cards', [c]);
    return {id: c.id};
  },

  saveRecurring: function (b) {
    var r = b.item || {};
    if (!r.name || !(Number(r.amount) > 0)) throw new Error('ต้องมีชื่อและยอดเงิน');
    if (!r.id) r.id = newId_();
    if (r.active === undefined) r.active = true;
    upsertRows_('Recurring', [r]);
    return {id: r.id};
  },
  deleteRecurring: function (b) { deleteRowsWhere_('Recurring', function (r) { return r.id === b.id; }); return {}; },

  saveSetting: function (b) {
    if (b.key === 'token') throw new Error('เปลี่ยนรหัสลับได้จากในชีตเท่านั้น');
    setSetting_(b.key, b.value); return {};
  },

  /** Statement parsed in the app (web/parsers.js). Matches what was recorded during the month. */
  importStatement: function (b) {
    var st = b.statement;
    if (!st || !st.cards || !st.cards.length) throw new Error('ไม่มีข้อมูลใบแจ้งยอด');
    var cards = readTable_('Cards'), rules = readTable_('Rules'), s = settings_();
    var statements = readTable_('Statements'), now = nowIso_(), summary = [];
    st.cards.forEach(function (c) {
      var card = cards.filter(function (x) { return String(x.last4) === String(c.last4); })[0];
      if (!card) {
        var guess = cards.filter(function (x) { return !x.last4 && x.bank === st.bank && c.name && String(c.name).toUpperCase().indexOf(String(x.name).replace(/^UOB\s*/i, '').toUpperCase()) > -1; })[0];
        card = guess || {id: 'card-' + newId_().slice(0, 6), name: (st.bank + ' ' + (c.name || '')).trim(), bank: st.bank, cut_day: Number(st.statementDate.slice(8, 10)), due_day: st.dueDate ? Number(st.dueDate.slice(8, 10)) : '', color: '#ff8fbf', default_for: ''};
        card.last4 = String(c.last4);
        if (st.creditLine && !card.credit_line) card.credit_line = st.creditLine;
        upsertRows_('Cards', [card]);
        cards = readTable_('Cards');
      }
      var dup = statements.filter(function (x) { return x.card === card.id && x.statement_date === st.statementDate; })[0];
      if (dup) { summary.push({card: card.name, skipped: true, reason: 'นำเข้าใบแจ้งยอดรอบนี้ไปแล้ว'}); return; }
      var statementId = 'st-' + newId_().slice(0, 8);
      var txs = readTable_('Transactions');
      var res = matchStatement(txs, c.rows, card.id, rules, s.match_days);
      var updates = res.pairs.map(function (p) {
        var row = c.rows[p.row], t = txs.filter(function (x) { return x.id === p.txId; })[0];
        return {id: p.txId, statement_id: statementId, post_date: row.postDate, pay: card.id, merchant: t.merchant || row.description, updated_at: now};
      });
      var adds = res.unmatched.map(function (i) { return txFromRow(c.rows[i], card.id, statementId, rules, newId_, now); });
      upsertRows_('Transactions', updates);
      appendRows_('Transactions', adds);
      appendRows_('Statements', [{id: statementId, card: card.id, statement_date: st.statementDate, due_date: st.dueDate || '',
        previous: c.previousBalance, total: c.totalBalance, rows: c.rows.length, matched: updates.length, created: adds.length, imported_at: now}]);
      summary.push({card: card.name, matched: updates.length, created: adds.length,
        pending: adds.filter(function (t) { return t.status === 'pending'; }).length, total: c.totalBalance});
    });
    return {summary: summary};
  },

  /**
   * From iPhone Shortcuts. kind:
   *  'partner711' → a 7-11 purchase that belongs to the partner (matched to the statement later)
   *  'expense' | 'income' | 'cash_withdraw' → quick entry (category id, pay = card id / cash / transfer, note)
   */
  quick: function (b) {
    var amount = Number(String(b.amount || '').replace(/[^\d.]/g, ''));
    if (!(amount > 0)) throw new Error('ยอดเงินไม่ถูกต้อง');
    var now = nowIso_(), date = b.date && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : today_();
    var t = {id: newId_(), date: date, amount: amount, type: 'expense', pay: '', channel: '', merchant: '', note: b.note || '',
             category: '', owner: 'me', settled: false, status: 'ok', source: 'shortcut', tags: '', created_at: now, updated_at: now};
    if (b.kind === 'partner711') {
      t.channel = '7-11'; t.category = 'seven'; t.owner = 'partner'; t.merchant = '7-11'; t.note = t.note || 'ของแฟน';
    } else {
      t.type = ['expense', 'income', 'cash_withdraw'].indexOf(b.kind) > -1 ? b.kind : 'expense';
      t.category = b.category || (t.type === 'income' ? 'income-other' : '');
      t.pay = b.pay || (t.type === 'cash_withdraw' ? 'cash' : '');
      t.merchant = b.merchant || b.note || '';
      if (t.type === 'expense' && !t.category && t.merchant) t.category = applyRules(readTable_('Rules'), t.merchant).category;
      t.status = t.category || t.type !== 'expense' ? 'ok' : 'pending';
    }
    appendRows_('Transactions', [t]);
    return {id: t.id, message: '✅ บันทึกแล้ว ' + amount.toFixed(2) + ' บาท'};
  },

  /** Count the cash in your wallet; the difference from what the app expects becomes "เงินสดทั่วไป". */
  cashCount: function (b) {
    var actual = Number(b.amount);
    if (!(actual >= 0)) throw new Error('ยอดเงินสดไม่ถูกต้อง');
    var expected = cashBalance_();
    var diff = Math.round((expected - actual) * 100) / 100;
    if (Math.abs(diff) < 0.01) return {diff: 0};
    var now = nowIso_();
    appendRows_('Transactions', [{id: newId_(), date: today_(), amount: Math.abs(diff), type: diff > 0 ? 'adjust' : 'income', pay: 'cash',
      channel: '', merchant: 'นับเงินสด', note: 'ส่วนต่างจากการนับเงินสด', category: diff > 0 ? 'cash-misc' : 'income-other', owner: 'me',
      settled: false, status: 'ok', source: 'manual', tags: '', created_at: now, updated_at: now}]);
    return {diff: diff};
  },

  resolveInbox: function (b) { upsertRows_('Inbox', [{id: b.id, status: 'done'}]); return {}; },

  runGrab: function () { return fetchGrabEmails(); }
};

function cashBalance_() {
  var bal = Number(settings_().cash_start || 0);
  readTable_('Transactions').forEach(function (t) {
    var a = Number(t.amount) || 0;
    if (t.type === 'cash_withdraw') bal += a;
    else if (t.pay === 'cash') bal += TYPE_DIR[t.type] === 'in' ? a : -a;
  });
  return bal;
}

// ───────────────────────── Grab e-receipts (time trigger, every 15 minutes) ─────────────────────────
function grabTx_(p, date, ref, cards, now) {
  var card = cards.filter(function (c) { return p.last4 && String(c.last4) === p.last4; })[0];
  var note = (p.items && p.items.length ? p.items.join(', ') : 'Grab ' + (p.product || p.service)).slice(0, 120);
  return {id: newId_(), date: date, amount: p.amount, type: 'expense', pay: card ? card.id : '', channel: 'Grab',
    merchant: p.merchant, note: note, category: p.category, owner: 'me', settled: false, status: 'ok',
    source: 'grab_email', tags: '', ref: ref, created_at: now, updated_at: now};
}

function fetchGrabEmails() {
  var s = settings_();
  var label = GmailApp.getUserLabelByName('km-done') || GmailApp.createLabel('km-done');
  var cards = readTable_('Cards'), txs = readTable_('Transactions'), now = nowIso_();
  var seen = {};
  txs.forEach(function (t) { if (t.ref) seen[t.ref] = true; });
  var adds = [], inbox = [];
  // Receipts that could not be read before get another try with the current reader.
  var retried = [];
  readTable_('Inbox').forEach(function (r) {
    if (r.status !== 'open' || r.source !== 'grab_email' || !isGrabReceipt(r.subject, r.raw)) return;
    var p = parseGrabEmail(r.subject, r.raw);
    if (!p.ok) return;
    var ref = p.bookingId ? 'grab:' + p.bookingId : 'inbox:' + r.id;
    if (!seen[ref]) { adds.push(grabTx_(p, p.date || String(r.received_at).slice(0, 10), ref, cards, now)); seen[ref] = true; }
    retried.push({id: r.id, status: 'done', note: 'อ่านได้แล้ว'});
  });
  upsertRows_('Inbox', retried);
  var threads = GmailApp.search(s.grab_query || DEFAULT_GRAB_QUERY, 0, 30);
  if (!threads.length) { appendRows_('Transactions', adds); return {added: adds.length, inbox: 0}; }
  threads.forEach(function (th) {
    th.getMessages().forEach(function (msg) {
      var ref = 'gmail:' + msg.getId();
      if (seen[ref]) return;
      var plain = msg.getPlainBody();
      var body = plain && plain.trim() ? plain : htmlToText(msg.getBody());
      if (!isGrabReceipt(msg.getSubject(), body)) { seen[ref] = true; return; }
      var p = parseGrabEmail(msg.getSubject(), body);
      if (p.bookingId) { if (seen['grab:' + p.bookingId]) { seen[ref] = true; return; } ref = 'grab:' + p.bookingId; }
      var date = p.date || Utilities.formatDate(msg.getDate(), 'Asia/Bangkok', 'yyyy-MM-dd');
      if (p.ok) {
        adds.push(grabTx_(p, date, ref, cards, now));
      } else {
        inbox.push({id: newId_(), received_at: Utilities.formatDate(msg.getDate(), 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ss"), source: 'grab_email', subject: msg.getSubject(),
          raw: body.slice(0, 4000), status: 'open', note: p.why});
      }
      seen[ref] = true;
    });
    th.addLabel(label);
  });
  appendRows_('Transactions', adds);
  appendRows_('Inbox', inbox);
  return {added: adds.length, inbox: inbox.length};
}

// ───────────────────────── Recurring (daily trigger) ─────────────────────────
function runRecurring() {
  var today = today_(), day = Number(today.slice(8, 10)), month = today.slice(0, 7), now = nowIso_();
  var lastDay = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  var items = readTable_('Recurring').filter(function (r) {
    var d = Math.min(Number(r.day) || 1, lastDay);
    return r.active && d <= day && String(r.last_run).slice(0, 7) !== month;
  });
  if (!items.length) return;
  appendRows_('Transactions', items.map(function (r) {
    return {id: newId_(), date: month + '-' + String(Math.min(Number(r.day) || 1, lastDay)).padStart(2, '0'), amount: Number(r.amount),
      type: r.type || 'expense', pay: r.pay || 'transfer', channel: '', merchant: r.name, note: r.note || 'รายการประจำ',
      category: r.category || '', owner: 'me', settled: false, status: r.category ? 'ok' : 'pending', source: 'recurring',
      tags: '', ref: 'rec:' + r.id + ':' + month, created_at: now, updated_at: now};
  }));
  upsertRows_('Recurring', items.map(function (r) { return {id: r.id, last_run: today}; }));
}

// For Node tests (ignored by Apps Script).
if (typeof module !== 'undefined') module.exports = {cleanMerchant: cleanMerchant, applyRules: applyRules, matchStatement: matchStatement,
  txFromRow: txFromRow, parseGrabEmail: parseGrabEmail, isGrabReceipt: isGrabReceipt, htmlToText: htmlToText, checkSplits: checkSplits, daysBetween: daysBetween, SEED_RULES: SEED_RULES, SEED_CATEGORIES: SEED_CATEGORIES};
