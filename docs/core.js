/* AUTO-GENERATED from apps-script/Code.gs by tests/build-core.js — do not edit by hand. */
(function (root) {
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
  for (var i = 0; i < lines.length - 1; i++) if (/E-Receipt|Tax Invoice|ใบเสร็จ/i.test(lines[i]) && !/Number|เลขที่/i.test(lines[i])) { product = lines[i + 1]; break; }

  var service = '';
  var tests = [
    ['mart', /GrabMart|Grab Mart|\bMart\b/i],
    ['express', /GrabExpress|Grab Express|\bExpress\b|ส่งของ|ส่งพัสดุ/i],
    ['food', /GrabFood|Grab Food|enjoyed your (food|meal|order)|Order Summary|Your Order|Ordered from|Order from|Restaurant|ร้านอาหาร|สั่งอาหาร/i],
    ['transport', /enjoyed your ride|Your Trip|Picked up on|Dropped off|\bBike\b|GrabCar|GrabTaxi|JustGrab|\bTaxi\b|\bCar\b|การเดินทาง|เดินทาง/i]
  ];
  for (var k = 0; k < tests.length; k++) {
    if (tests[k][1].test(product) || (k >= 2 && tests[k][1].test(all))) { service = tests[k][0]; break; }
  }
  var category = {food: 'food', mart: 'groceries', express: 'transport', transport: 'transport'}[service] || '';

  var amount = null, m;
  m = /(?:Total Paid|Amount Paid|ยอดชำระ(?:ทั้งหมด)?|ยอดที่ชำระ)\s*\n?\s*(?:฿|THB|บาท)?\s*([\d,]+(?:\.\d{1,2})?)/i.exec(text);
  if (!m) m = /(?:^|\n)(?:TOTAL|Total|ยอดรวม|รวมทั้งสิ้น)\s*\n?\s*(?:฿|THB)\s*([\d,]+(?:\.\d{1,2})?)/.exec(text);
  if (m) amount = Number(m[1].replace(/,/g, ''));

  var last4 = '';
  m = /(?:Paid by|ชำระโดย|ชำระด้วย)\s*\n?[^\n\d]*?(\d{4})\b/i.exec(text) || /(?:•{2,}|\*{2,}|[xX]{4}|ending in|ลงท้ายด้วย)\s*(\d{4})\b/.exec(text);
  if (m) last4 = m[1];

  var bm = /(?:Booking ID|รหัสการจอง)\s*[:：]?\s*([A-Z0-9-]{6,})/i.exec(text);
  var bookingId = bm ? bm[1] : '';

  var date = '';
  var dm = /(?:Picked up on|Ordered on|Delivered on|Booked on)\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i.exec(text);
  if (dm && EN_MONTHS[dm[2].toUpperCase()]) date = dm[3] + '-' + String(EN_MONTHS[dm[2].toUpperCase()]).padStart(2, '0') + '-' + String(dm[1]).padStart(2, '0');

  // Ride: the trip section lists each stop followed by its time ("9:19PM").
  var merchant = '';
  var stops = [];
  for (var j = 1; j < lines.length; j++) if (/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(lines[j]) && !/^[⋮•]+$/.test(lines[j - 1])) stops.push(lines[j - 1]);
  if (service === 'transport' && stops.length >= 2) merchant = stops[0] + ' → ' + stops[stops.length - 1];
  if (!merchant) {
    var om = /(?:Ordered from|Order from|สั่งจาก)\s*[:：]?\s*\n?\s*([^\n]{2,60})/i.exec(text);
    if (om) merchant = om[1].trim();
  }
  if (!merchant) merchant = product ? 'Grab ' + product : 'Grab';

  var why = [];
  if (!service) why.push('ไม่รู้ว่าเป็น Food หรือ Transport');
  if (amount == null || !(amount > 0)) why.push('หายอดเงินไม่เจอ');
  return {ok: why.length === 0, service: service, product: product, category: category, amount: amount, last4: last4,
          merchant: merchant, date: date, bookingId: bookingId, why: why.join(', ')};
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


  root.KMCore = {TYPE_DIR: TYPE_DIR, SEED_CATEGORIES: SEED_CATEGORIES, SEED_RULES: SEED_RULES, SEED_CARDS: SEED_CARDS,
    cleanMerchant: cleanMerchant, applyRules: applyRules, daysBetween: daysBetween, KIND_TO_TYPE: KIND_TO_TYPE,
    matchStatement: matchStatement, txFromRow: txFromRow, parseGrabEmail: parseGrabEmail, htmlToText: htmlToText, checkSplits: checkSplits};
})(typeof window !== 'undefined' ? window : globalThis);
