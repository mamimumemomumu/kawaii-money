/* Kawaii Money — statement parsers (no AI, plain rules).
 * Works in the browser (window.KMParsers) and in Node (module.exports) so it can be tested.
 *
 * Input: text items from a PDF, each {str, x, y, page} where y grows downward.
 * In the browser, pdf.js gives these via page.getTextContent() (see app.js → readPdfItems).
 */
(function (root) {
  const MONTHS = {JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12};

  /** Group text items into lines (same page, similar y), left to right. */
  function linesFromItems(items, tolerance) {
    const tol = tolerance == null ? 3 : tolerance;
    const sorted = items.filter((i) => i.str && i.str.trim()).slice()
      .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
    const lines = [];
    let cur = null;
    for (const it of sorted) {
      if (!cur || it.page !== cur.page || Math.abs(it.y - cur.y) > tol) {
        cur = {page: it.page, y: it.y, items: []};
        lines.push(cur);
      }
      cur.items.push(it);
    }
    return lines.map((l) => l.items.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ').trim());
  }

  const amt = (s) => Number(s.replace(/,/g, ''));
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  function parseDateWord(s) {
    const m = /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/.exec(s.toUpperCase());
    if (!m || !MONTHS[m[2]]) return null;
    return iso(Number(m[3]), MONTHS[m[2]], Number(m[1]));
  }

  /**
   * Parse a UOB Thailand credit card e-statement.
   * Returns {bank, statementDate, dueDate, creditLine, cards:[{last4, name, previousBalance, totalBalance, rows, check}]}.
   * rows: {postDate, transDate, description, amount, kind}; amount > 0 is a charge, < 0 a credit (CR).
   * kind: 'charge' | 'refund' | 'cashback' | 'payment'.
   */
  function parseUOB(lines) {
    const out = {bank: 'UOB', statementDate: null, dueDate: null, creditLine: null, cards: []};
    for (const l of lines) {
      const u = l.toUpperCase();
      if (!out.statementDate && u.includes('STATEMENT DATE')) out.statementDate = parseDateWord(u);
      if (!out.dueDate && u.includes('PAYMENT DUE DATE')) out.dueDate = parseDateWord(u);
      if (out.creditLine == null && u.includes('TOTAL CREDIT LINE')) {
        const m = /([\d,]+(?:\.\d{2})?)\s*$/.exec(u); if (m) out.creditLine = amt(m[1]);
      }
    }
    if (!out.statementDate) throw new Error('ไม่พบวันสรุปยอด (STATEMENT DATE) — ไฟล์นี้อาจไม่ใช่ใบแจ้งยอด UOB');
    const sY = Number(out.statementDate.slice(0, 4)), sM = Number(out.statementDate.slice(5, 7));
    const yearFor = (mon) => (mon > sM ? sY - 1 : sY);

    const txRe = /^(\d{2})\s+([A-Z]{3})\s+(\d{2})\s+([A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})(\s*CR)?$/;
    const cardRe = /(\d{4})\s+(\d{2})XX\s+XXXX\s+(\d{4})/;
    let inTx = false, card = null, prev = '';
    for (const raw of lines) {
      const l = raw.trim();
      const u = l.toUpperCase();
      const before = prev; prev = l;
      if (u.includes('POST DATE') || u.includes('DESCRIPTION')) { inTx = true; continue; }
      if (!inTx) continue;
      const cm = cardRe.exec(u);
      if (cm && !txRe.test(u)) {
        const last4 = cm[3];
        card = out.cards.find((c) => c.last4 === last4);
        const name = /^[A-Za-z][A-Za-z \-]+$/.test(before) && !/DESCRIPTION|AMOUNT/i.test(before) ? before : '';
        if (!card) { card = {last4, name, previousBalance: 0, totalBalance: null, rows: []}; out.cards.push(card); }
        continue;
      }
      if (!card) continue;
      let m = /^PREVIOUS BALANCE\s+([\d,]+\.\d{2})(\s*CR)?$/.exec(u);
      if (m) { card.previousBalance = amt(m[1]) * (m[2] ? -1 : 1); continue; }
      m = /^TOTAL BALANCE\b.*?([\d,]+\.\d{2})(\s*CR)?$/.exec(u);
      if (m) { card.totalBalance = amt(m[1]) * (m[2] ? -1 : 1); continue; }
      m = txRe.exec(l.replace(/\s+/g, ' '));
      if (!m) continue;
      const pm = MONTHS[m[2].toUpperCase()], tm = MONTHS[m[4].toUpperCase()];
      if (!pm || !tm) continue;
      const desc = m[5].trim();
      const credit = !!m[7];
      const value = amt(m[6]) * (credit ? -1 : 1);
      const D = desc.toUpperCase();
      let kind = credit ? 'refund' : 'charge';
      if (D.startsWith('PAYMENT')) kind = 'payment';
      else if (D.includes('CASHBACK')) kind = 'cashback';
      card.rows.push({postDate: iso(yearFor(pm), pm, Number(m[1])), transDate: iso(yearFor(tm), tm, Number(m[3])), description: desc, amount: value, kind});
    }
    for (const c of out.cards) {
      const sum = c.rows.reduce((s, r) => s + r.amount, 0);
      const expected = c.totalBalance;
      const got = Math.round((c.previousBalance + sum) * 100) / 100;
      c.check = {ok: expected != null && Math.abs(got - expected) < 0.01, computed: got, expected};
    }
    if (!out.cards.length) throw new Error('ไม่พบรายการบัตรในไฟล์นี้');
    return out;
  }

  /** Try each known bank parser. Today: UOB. Add ttb / SCB here later. */
  function parseStatement(lines) {
    const all = lines.join('\n').toUpperCase();
    if (all.includes('UOB')) return parseUOB(lines);
    throw new Error('ยังไม่รองรับใบแจ้งยอดของธนาคารนี้ (รองรับ UOB)');
  }

  const api = {linesFromItems, parseUOB, parseStatement, parseDateWord};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KMParsers = api;
})(typeof window !== 'undefined' ? window : globalThis);
