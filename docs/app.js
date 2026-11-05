/* Kawaii Money 🌸 — the app (no build step, no framework). */
(() => {
  'use strict';
  const C = window.KMCore, P = window.KMParsers;
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

  // ───── tiny helpers ─────
  const $ = (s, el = document) => el.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (k) => { if (k == null || k === false) return; if (Array.isArray(k)) k.forEach(add); else el.append(k.nodeType ? k : String(k)); };
    kids.forEach(add);
    return el;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem('km:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('km:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('km:' + k); } catch (e) { /* ignore */ } }
  };

  // ───── state ─────
  const S = {
    cfg: Object.assign({api: '', token: '', lang: 'th', demo: !!window.KM_PREVIEW}, store.get('cfg', {})),
    data: null,
    ui: {page: 'home', sub: '', month: '', tag: '', cat: '', q: '', view: 'donut'}
  };
  const saveCfg = () => store.set('cfg', S.cfg);

  // ───── words ─────
  const W = {
    th: {
      home: 'หน้าแรก', overview: 'ภาพรวม', inbox: 'รอเลือก', budgets: 'งบ', more: 'เพิ่มเติม', search: '🔍 ค้นหาร้าน หมวด หรือป้าย',
      cashflow: 'กระแสเงินเดือนนี้', expenses: 'รายจ่ายเดือนนี้', all: '✨ ทั้งหมด', pending: 'รอเลือกหมวด', noTx: 'ไม่มีรายการ 🌷',
      tapCat: 'แตะหมวดเพื่อดูรายการ', items: 'รายการ', setBudget: 'ตั้งงบ', of: 'จาก', left: 'เหลือ', over: 'เกินงบ',
      spent: 'ใช้ไป', cards: 'บัตรของฉัน', importSt: 'นำเข้าใบแจ้งยอด PDF', cash: 'นับเงินสด', recurring: 'รายการประจำ', categories: 'หมวดหมู่',
      rules: 'กฎจัดหมวด', settings: 'ตั้งค่า', back: '‹ กลับ', save: 'บันทึก', cancel: 'ยกเลิก', del: 'ลบ', add: 'เพิ่ม',
      expense: 'รายจ่าย', income: 'รายรับ', withdraw: 'ถอนเงินสด', amount: 'ยอดเงิน (บาท)', date: 'วันที่', payWith: 'จ่ายด้วย',
      merchant: 'ร้าน / ผู้รับโอน', note: 'โน้ต', category: 'หมวด', cashW: '💵 เงินสด', transfer: '🏦 โอน', split: '✂️ แบ่งยอด',
      partner: '💕 ของแฟน', mine: '🙋 ของฉัน', edit: '✏️ แก้ไข', saved: 'บันทึกแล้ว 🌸', scopeQ: 'ใช้หมวดนี้กับ…', scopeOne: 'เฉพาะรายการนี้',
      scopeFuture: 'ร้านนี้ครั้งต่อไปด้วย', scopeAll: 'ร้านนี้ทั้งหมด รวมย้อนหลัง', remaining: 'ยังไม่ได้แบ่ง', fillRest: 'ใส่ยอดที่เหลือ',
      fit: 'ปรับให้ตรงยอดบัตร', addLine: '+ เพิ่มบรรทัด', item: 'ชื่อของ (ไม่บังคับ)', demoBanner: 'โหมดตัวอย่าง · ข้อมูลไม่ได้บันทึกจริง',
      connect: 'เชื่อมต่อ', tryDemo: '🌷 ลองเล่นด้วยข้อมูลตัวอย่าง', apiUrl: 'Web app URL จาก Apps Script', token: 'รหัสลับ (token)',
      welcome: 'สวัสดี! เชื่อมแอปกับ Google Sheet ของคุณ', welcomeSub: 'ทำตามคู่มือ SETUP แล้วนำ URL กับรหัสลับมาใส่ที่นี่',
      nothing: 'ไม่มีรายการ', choosePdf: 'เลือกไฟล์ PDF ใบแจ้งยอด', doImport: 'นำเข้า', reading: 'กำลังอ่านไฟล์…',
      matched: 'จับคู่กับที่บันทึกไว้', created: 'รายการใหม่', toCategorize: 'รอเลือกหมวด', cycle: 'รอบบัตรนี้', due: 'ครบกำหนดชำระ',
      cutIn: 'ตัดรอบอีก', days: 'วัน', lastSt: 'ใบแจ้งยอดล่าสุด', expected: 'เงินสดที่ควรมี', counted: 'นับได้จริง', emailInbox: 'อีเมลที่อ่านไม่ออก',
      close: 'ปิด', addManual: 'เพิ่มเอง', merge: 'รวมเข้ากับหมวด…', hide: 'ซ่อนหมวดนี้', unhide: 'แสดงหมวดนี้', parent: 'หมวดแม่ (ไม่บังคับ)',
      nameTh: 'ชื่อภาษาไทย', nameEn: 'ชื่อภาษาอังกฤษ', emoji: 'อิโมจิ', budget: 'งบต่อเดือน (บาท)', color: 'สี', kind: 'ประเภท',
      pattern: 'คำในชื่อร้านที่ใช้จับ', channel: 'ช่องทาง (ป้าย)', noneOpt: '— ไม่ระบุ —', dayOfMonth: 'วันที่ของทุกเดือน', active: 'เปิดใช้',
      testConn: 'ทดสอบการเชื่อมต่อ', matchDays: 'จับคู่รายการที่วันที่ห่างกันไม่เกิน (วัน)', partnerName: 'ชื่อเรียกแฟน', cashStart: 'เงินสดตั้งต้น (บาท)',
      useDemo: 'โหมดตัวอย่าง', clearLocal: 'ล้างข้อมูลที่เก็บในเครื่องนี้', confirmDel: 'ลบรายการนี้ใช่ไหม', lang: '🌐 English',
      onlyMine: 'นับเฉพาะของคุณ ไม่รวมของแฟน', fromStatement: 'ยืนยันจากใบแจ้งยอดแล้ว', cardName: 'ชื่อบัตร', last4: 'เลข 4 ตัวท้าย',
      cutDay: 'วันตัดรอบ', dueDay: 'วันครบกำหนด', creditLine: 'วงเงิน (บาท)', defaultFor: 'ช่องทางที่ใช้บัตรนี้ (คั่นด้วย ,)', more_: 'อื่นๆ…',
      totalBudget: 'งบรวม', noBudget: 'ยังไม่ได้ตั้งงบ', pdfPassword: 'ไฟล์นี้มีรหัสผ่าน กรอกรหัสผ่าน PDF', checkOk: 'ยอดตรงกับใบแจ้งยอด ✓',
      checkBad: 'ยอดไม่ตรง ลองเช็กไฟล์อีกครั้ง', newCat: '+ หมวดใหม่', newRule: '+ กฎใหม่', newItem: '+ รายการประจำ', income_: 'รายรับ', expense_: 'รายจ่าย'
    },
    en: {
      home: 'Home', overview: 'Overview', inbox: 'To sort', budgets: 'Budgets', more: 'More', search: '🔍 Search merchant, category or tag',
      cashflow: 'Cash flow this month', expenses: 'Expenses this month', all: '✨ All', pending: 'To categorize', noTx: 'No transactions 🌷',
      tapCat: 'Tap a category to see its items', items: 'items', setBudget: 'Set', of: 'of', left: 'left', over: 'over',
      spent: 'Spent', cards: 'My cards', importSt: 'Import PDF statement', cash: 'Count cash', recurring: 'Recurring', categories: 'Categories',
      rules: 'Rules', settings: 'Settings', back: '‹ Back', save: 'Save', cancel: 'Cancel', del: 'Delete', add: 'Add',
      expense: 'Expense', income: 'Income', withdraw: 'Cash withdrawal', amount: 'Amount (THB)', date: 'Date', payWith: 'Paid with',
      merchant: 'Merchant / recipient', note: 'Note', category: 'Category', cashW: '💵 Cash', transfer: '🏦 Transfer', split: '✂️ Split',
      partner: '💕 Partner\'s', mine: '🙋 Mine', edit: '✏️ Edit', saved: 'Saved 🌸', scopeQ: 'Use this category for…', scopeOne: 'Just this one',
      scopeFuture: 'This merchant from now on', scopeAll: 'This merchant, including the past', remaining: 'Not split yet', fillRest: 'Fill the rest',
      fit: 'Fit to card amount', addLine: '+ Add line', item: 'Item (optional)', demoBanner: 'Demo mode · nothing is saved',
      connect: 'Connect', tryDemo: '🌷 Try with sample data', apiUrl: 'Apps Script web app URL', token: 'Secret token',
      welcome: 'Hi! Connect the app to your Google Sheet', welcomeSub: 'Follow SETUP, then paste the URL and token here',
      nothing: 'Nothing here', choosePdf: 'Choose the statement PDF', doImport: 'Import', reading: 'Reading the file…',
      matched: 'Matched to what you logged', created: 'New items', toCategorize: 'To categorize', cycle: 'This cycle', due: 'Payment due',
      cutIn: 'Cycle closes in', days: 'days', lastSt: 'Last statement', expected: 'Cash you should have', counted: 'Cash you counted', emailInbox: 'Emails I could not read',
      close: 'Dismiss', addManual: 'Add by hand', merge: 'Merge into…', hide: 'Hide this category', unhide: 'Show this category', parent: 'Parent (optional)',
      nameTh: 'Thai name', nameEn: 'English name', emoji: 'Emoji', budget: 'Monthly budget (THB)', color: 'Color', kind: 'Kind',
      pattern: 'Text to match in the merchant', channel: 'Channel (tag)', noneOpt: '— none —', dayOfMonth: 'Day of month', active: 'Active',
      testConn: 'Test connection', matchDays: 'Match items up to this many days apart', partnerName: 'Partner\'s name', cashStart: 'Starting cash (THB)',
      useDemo: 'Demo mode', clearLocal: 'Clear data saved on this device', confirmDel: 'Delete this item?', lang: '🌐 ภาษาไทย',
      onlyMine: 'Only yours, partner\'s items left out', fromStatement: 'Confirmed by statement', cardName: 'Card name', last4: 'Last 4 digits',
      cutDay: 'Statement day', dueDay: 'Due day', creditLine: 'Credit line (THB)', defaultFor: 'Channels this card is used for (comma separated)', more_: 'More…',
      totalBudget: 'Total budget', noBudget: 'No budget yet', pdfPassword: 'This PDF has a password. Enter it', checkOk: 'Totals match the statement ✓',
      checkBad: 'Totals do not match, check the file', newCat: '+ New category', newRule: '+ New rule', newItem: '+ Recurring item', income_: 'Income', expense_: 'Expense'
    }
  };
  const t = (k) => (W[S.cfg.lang] || W.th)[k] || W.th[k] || k;
  const EN = () => S.cfg.lang === 'en';
  const MON = {th: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
               en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']};
  const WD = {th: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']};
  const monthName = (k) => MON[S.cfg.lang][+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4);
  const dayName = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${WD[S.cfg.lang][d.getUTCDay()]} ${d.getUTCDate()} ${MON[S.cfg.lang][d.getUTCMonth()]}`; };
  const nf2 = new Intl.NumberFormat('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const nf0 = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
  const baht = (v) => '฿' + nf2.format(v);
  const baht0 = (v) => '฿' + nf0.format(v);
  const pct = (v) => (v * 100).toFixed(1) + '%';
  const todayIso = () => (S.data && S.data.today) || new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const round2 = (v) => Math.round(v * 100) / 100;

  // ───── data helpers ─────
  const D = () => S.data;
  const cat = (id) => D().categories.find((c) => c.id === id);
  const catEmoji = (id) => (id ? (cat(id) || {}).emoji || '🏷️' : '🛍️');
  const catName = (id) => { if (!id) return t('pending'); const c = cat(id); return c ? (EN() && c.name_en ? c.name_en : c.name_th) : id; };
  const catColor = (id) => (id ? (cat(id) || {}).color || '#ff8fbf' : '#ffad5c');
  const card = (id) => D().cards.find((c) => c.id === id);
  const payLabel = (p) => { if (!p) return ''; if (p === 'cash') return t('cashW'); if (p.startsWith('transfer')) return t('transfer'); const c = card(p); return '💳 ' + (c ? c.name.replace(/^UOB\s+/, '') : p); };
  const dir = (tx) => C.TYPE_DIR[tx.type] || 'out';
  const splitsOf = (id) => D().splits.filter((s) => s.tx_id === id);
  const isPending = (tx) => tx.type === 'expense' && !tx.category && !splitsOf(tx.id).length;
  const CH = {Shopee: '🛒 Shopee', Grab: '🛵 Grab', '7-11': '🏪 7-11', 'BTS/MRT': '🚇 BTS/MRT', TrueMoney: '💜 TrueMoney'};
  const chLabel = (c) => CH[c] || (c ? '🏷️ ' + c : '');
  const visibleCats = (kind) => D().categories.filter((c) => !c.hidden && (!kind || (c.kind || 'expense') === kind)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const monthOf = (tx) => String(tx.date).slice(0, 7);

  /** Lines that count toward category spending (yours only). Refunds reduce their category. */
  function spendLines(month) {
    const out = [];
    for (const tx of D().transactions) {
      if (monthOf(tx) !== month || tx.owner === 'partner') continue;
      const d = dir(tx);
      if (d !== 'out' && tx.type !== 'refund') continue;
      const sign = d === 'out' ? 1 : -1;
      const sp = splitsOf(tx.id);
      if (sp.length) sp.forEach((s) => out.push({category: s.category, amount: sign * Number(s.amount), tx}));
      else out.push({category: tx.category || '', amount: sign * Number(tx.amount), tx});
    }
    return out;
  }
  function catTotals(month) {
    const m = new Map();
    for (const l of spendLines(month)) {
      const o = m.get(l.category) || {id: l.category, total: 0, count: 0};
      o.total += l.amount; if (l.amount > 0) o.count++; m.set(l.category, o);
    }
    const rows = [...m.values()].filter((r) => Math.abs(r.total) > 0.004);
    const sum = rows.reduce((s, r) => s + Math.max(0, r.total), 0);
    rows.forEach((r) => { r.share = sum ? Math.max(0, r.total) / sum : 0; });
    return rows.sort((a, b) => b.total - a.total);
  }
  function flow(month) {
    let inn = 0, out = 0;
    for (const tx of D().transactions) {
      if (monthOf(tx) !== month) continue;
      const d = dir(tx);
      if (d === 'in') inn += Number(tx.amount); else if (d === 'out') out += Number(tx.amount);
    }
    return {in: inn, out, net: inn - out};
  }
  function monthsList() {
    const set = new Set(D().transactions.map(monthOf));
    set.add(todayIso().slice(0, 7));
    return [...set].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  }
  function curMonth() {
    const ms = monthsList();
    if (!S.ui.month || !ms.includes(S.ui.month)) S.ui.month = todayIso().slice(0, 7);
    return S.ui.month;
  }
  const pendingTx = () => D().transactions.filter(isPending).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const openInbox = () => (D().inbox || []).filter((i) => i.status !== 'done');

  // ───── API ─────
  let loadingEl = null;
  const busy = (on) => {
    if (on && !loadingEl) { loadingEl = h('div', {class: 'loading'}, h('span', null, '🌸')); document.body.append(loadingEl); }
    if (!on && loadingEl) { loadingEl.remove(); loadingEl = null; }
  };
  function toast(msg) {
    const el = h('div', {class: 'toast', role: 'status'}, msg);
    document.body.append(el); setTimeout(() => el.remove(), 2600);
  }
  function setData(d) { S.data = d; if (!S.cfg.demo) store.set('data', d); }

  async function load() {
    if (S.cfg.demo) { setData(window.KMDemo.makeDemo(new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10))); render(); return; }
    const cached = store.get('data', null);
    if (cached) { S.data = cached; render(); }
    busy(!cached);
    try {
      const r = await fetch(S.cfg.api + (S.cfg.api.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(S.cfg.token));
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setData(j.data); render(); lastLoad = Date.now();
    } catch (e) {
      toast('⚠️ ' + (e.message || e));
      if (!cached) { S.data = null; render(); }
    } finally { busy(false); }
  }

  // Coming back to the app (switching from Gmail, Grab, etc.) quietly fetches the latest data.
  let lastLoad = Date.now(), refreshing = false;
  async function refresh() {
    if (S.cfg.demo || !S.cfg.api || !S.data || refreshing || loadingEl || Date.now() - lastLoad < 20000) return;
    refreshing = true;
    try {
      const r = await fetch(S.cfg.api + (S.cfg.api.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(S.cfg.token));
      const j = await r.json();
      if (j.ok && JSON.stringify(j.data) !== JSON.stringify(S.data)) {
        const typing = document.activeElement && document.activeElement.matches('input, select, textarea');
        setData(j.data);
        if (!typing) render();
      }
      lastLoad = Date.now();
    } catch (e) { /* offline: keep what is on screen */ } finally { refreshing = false; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) refresh(); });

  async function api(action, payload) {
    if (S.cfg.demo) { const r = demoAction(action, payload || {}); render(); return r; }
    busy(true);
    try {
      const r = await fetch(S.cfg.api, {method: 'POST', body: JSON.stringify(Object.assign({action, token: S.cfg.token}, payload || {}))});
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      if (j.data) setData(j.data);
      render();
      return j.result;
    } catch (e) { toast('⚠️ ' + (e.message || e)); throw e; } finally { busy(false); }
  }

  // Demo mode runs the same rules as the real backend, in memory.
  const nid = () => Math.random().toString(36).slice(2, 12);
  function upsert(list, obj, key = 'id') { const i = list.findIndex((x) => x[key] === obj[key]); if (i > -1) list[i] = Object.assign({}, list[i], obj); else list.push(obj); }
  function demoAction(a, b) {
    const d = D(), now = new Date().toISOString();
    switch (a) {
      case 'saveTx': {
        const x = Object.assign({}, b.tx); if (!x.id) { x.id = nid(); x.created_at = now; x.source = x.source || 'manual'; x.owner = x.owner || 'me'; }
        if (!x.status || (x.category && x.status === 'pending')) x.status = x.category || x.type !== 'expense' ? 'ok' : 'pending';
        upsert(d.transactions, x); return {id: x.id};
      }
      case 'deleteTx': d.splits = d.splits.filter((s) => s.tx_id !== b.id); d.transactions = d.transactions.filter((x) => x.id !== b.id); return {};
      case 'setSplits': {
        const tx = d.transactions.find((x) => x.id === b.tx_id); const err = C.checkSplits(tx.amount, b.splits); if (err) { toast('⚠️ ' + err); throw new Error(err); }
        d.splits = d.splits.filter((s) => s.tx_id !== tx.id);
        if (b.splits.length === 1) Object.assign(tx, {category: b.splits[0].category, status: 'ok'});
        else { b.splits.forEach((l) => d.splits.push({id: nid(), tx_id: tx.id, category: l.category, amount: Number(l.amount), item: l.item || ''})); Object.assign(tx, {category: '', status: 'ok'}); }
        return {};
      }
      case 'setCategory': {
        const tx = d.transactions.find((x) => x.id === b.id); const key = C.cleanMerchant(tx.merchant); let n = 1;
        Object.assign(tx, {category: b.category, status: 'ok'});
        if ((b.scope === 'future' || b.scope === 'all') && key) {
          const ex = d.rules.find((r) => String(r.pattern).toUpperCase() === key && r.origin === 'user');
          upsert(d.rules, {id: ex ? ex.id : nid(), pattern: key, channel: ex ? ex.channel : '', category: b.category, priority: 50, origin: 'user'});
        }
        if (b.scope === 'all' && key) d.transactions.forEach((x) => { if (x.id !== tx.id && !splitsOf(x.id).length && C.cleanMerchant(x.merchant) === key) { x.category = b.category; x.status = 'ok'; n++; } });
        return {changed: n};
      }
      case 'setOwner': Object.assign(d.transactions.find((x) => x.id === b.id), {owner: b.owner}); return {};
      case 'saveCategory': { const c = Object.assign({}, b.category); if (!c.id) { c.id = 'c' + nid().slice(0, 8); c.order = d.categories.length + 1; } upsert(d.categories, c); return {id: c.id}; }
      case 'mergeCategory':
        d.transactions.forEach((x) => { if (x.category === b.from) x.category = b.to; });
        d.splits.forEach((x) => { if (x.category === b.from) x.category = b.to; });
        d.rules.forEach((x) => { if (x.category === b.from) x.category = b.to; });
        upsert(d.categories, {id: b.from, hidden: true}); return {};
      case 'reorderCategories': b.ids.forEach((id, i) => upsert(d.categories, {id, order: i + 1})); return {};
      case 'saveRule': { const r = Object.assign({priority: 50, origin: 'user'}, b.rule); if (!r.id) r.id = nid(); upsert(d.rules, r); return {}; }
      case 'deleteRule': d.rules = d.rules.filter((r) => r.id !== b.id); return {};
      case 'saveCard': { const c = Object.assign({}, b.card); if (!c.id) c.id = 'card-' + nid().slice(0, 6); upsert(d.cards, c); return {}; }
      case 'saveRecurring': { const r = Object.assign({active: true}, b.item); if (!r.id) r.id = nid(); upsert(d.recurring, r); return {}; }
      case 'deleteRecurring': d.recurring = d.recurring.filter((r) => r.id !== b.id); return {};
      case 'saveSetting': d.settings[b.key] = String(b.value); return {};
      case 'resolveInbox': upsert(d.inbox, {id: b.id, status: 'done'}); return {};
      case 'cashCount': {
        const diff = round2(cashBalance() - Number(b.amount));
        if (Math.abs(diff) >= 0.01) d.transactions.push({id: nid(), date: todayIso(), amount: Math.abs(diff), type: diff > 0 ? 'adjust' : 'income', pay: 'cash', channel: '', merchant: 'นับเงินสด', note: '', category: diff > 0 ? 'cash-misc' : 'income-other', owner: 'me', settled: false, status: 'ok', source: 'manual', statement_id: '', tags: '', ref: ''});
        return {diff};
      }
      case 'importStatement': {
        const summary = [];
        b.statement.cards.forEach((c) => {
          let cd = d.cards.find((x) => String(x.last4) === String(c.last4));
          if (!cd) {
            cd = d.cards.find((x) => !x.last4 && x.bank === b.statement.bank && String(c.name).toUpperCase().includes(String(x.name).replace(/^UOB\s*/i, '').toUpperCase()))
              || {id: 'card-' + nid().slice(0, 6), name: (b.statement.bank + ' ' + c.name).trim(), bank: b.statement.bank, cut_day: +b.statement.statementDate.slice(8), due_day: b.statement.dueDate ? +b.statement.dueDate.slice(8) : '', color: '#ff8fbf'};
            cd.last4 = c.last4; upsert(d.cards, cd);
          }
          if (d.statements.some((s) => s.card === cd.id && s.statement_date === b.statement.statementDate)) { summary.push({card: cd.name, skipped: true}); return; }
          const sid = 'st-' + nid().slice(0, 8);
          const res = C.matchStatement(d.transactions, c.rows, cd.id, d.rules, d.settings.match_days);
          res.pairs.forEach((p) => Object.assign(d.transactions.find((x) => x.id === p.txId), {statement_id: sid, post_date: c.rows[p.row].postDate, pay: cd.id}));
          const adds = res.unmatched.map((i) => C.txFromRow(c.rows[i], cd.id, sid, d.rules, nid, now));
          d.transactions.push(...adds);
          d.statements.push({id: sid, card: cd.id, statement_date: b.statement.statementDate, due_date: b.statement.dueDate, previous: c.previousBalance, total: c.totalBalance, rows: c.rows.length, matched: res.pairs.length, created: adds.length});
          summary.push({card: cd.name, matched: res.pairs.length, created: adds.length, pending: adds.filter((x) => x.status === 'pending').length, total: c.totalBalance});
        });
        return {summary};
      }
      default: return {};
    }
  }
  function cashBalance() {
    let bal = Number(D().settings.cash_start || 0);
    for (const x of D().transactions) {
      if (x.type === 'cash_withdraw') bal += Number(x.amount);
      else if (x.pay === 'cash') bal += dir(x) === 'in' ? Number(x.amount) : -Number(x.amount);
    }
    return bal;
  }

  /** In-page confirm / text prompt (native dialogs are blocked in some app views). Resolves to true/false or the typed text (null if cancelled). */
  function ask(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const inp = opts.input ? h('input', {class: 'input', type: opts.type || 'text', id: 'km-ask-input'}) : null;
      const done = (v) => { wrap.remove(); resolve(v); };
      const wrap = h('div', {class: 'dialog-wrap', role: 'dialog', 'aria-modal': 'true'},
        h('div', {class: 'dialog'}, h('p', null, message), inp,
          h('div', {class: 'actions', style: {justifyContent: 'flex-end'}},
            h('button', {type: 'button', class: 'btn', onclick: () => done(inp ? null : false)}, t('cancel')),
            h('button', {type: 'button', class: 'btn primary' + (opts.danger ? ' dangerfill' : ''), onclick: () => done(inp ? inp.value : true)}, opts.ok || 'OK'))));
      document.body.append(wrap);
      if (inp) setTimeout(() => inp.focus(), 50);
    });
  }

  // ───── sheet (bottom drawer) ─────
  let sheetStack = [];
  function openSheet(title, body) {
    closeSheet(true);
    const bd = h('div', {class: 'backdrop', onclick: () => closeSheet()});
    const head = h('div', {class: 'sheet-head'}, h('div', {class: 'grab'}),
      h('button', {type: 'button', class: 'sheet-x', 'aria-label': t('close'), onclick: () => closeSheet()}, '✕'),
      title ? h('h3', null, title) : null);
    const sh = h('div', {class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || ''}, head, body);
    document.body.append(bd, sh);
    document.documentElement.classList.add('sheet-open');
    requestAnimationFrame(() => { bd.classList.add('show'); sh.classList.add('show'); });
    sheetStack = [bd, sh];
    swipeToClose(sh, bd);
    return sh;
  }
  /** Drag the sheet down to close it: from its top bar any time, or from anywhere when its content is scrolled to the top. */
  function swipeToClose(sh, bd) {
    let y0 = null, dy = 0, fromHead = false, active = false;
    sh.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      fromHead = !!e.target.closest('.sheet-head');
      if (!fromHead && (sh.scrollTop > 0 || e.target.closest('input, select, textarea'))) { y0 = null; return; }
      y0 = e.touches[0].clientY; dy = 0; active = false;
    }, {passive: true});
    sh.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (!active && dy > 6 && (fromHead || sh.scrollTop <= 0)) { active = true; sh.classList.add('dragging'); }
      if (!active) return;
      if (e.cancelable) e.preventDefault();
      sh.style.transform = `translate(-50%, ${Math.max(0, dy)}px)`;
      bd.style.opacity = String(Math.max(0, 1 - dy / 400));
    }, {passive: false});
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      if (!active) return;
      active = false; sh.classList.remove('dragging');
      sh.style.transform = ''; bd.style.opacity = '';
      if (dy > 90) closeSheet();
    };
    sh.addEventListener('touchend', end);
    sh.addEventListener('touchcancel', end);
  }
  function closeSheet(instant) {
    const [bd, sh] = sheetStack; sheetStack = [];
    document.documentElement.classList.remove('sheet-open');
    if (!sh) return;
    if (instant) { bd.remove(); sh.remove(); return; }
    bd.classList.remove('show'); sh.classList.remove('show');
    setTimeout(() => { bd.remove(); sh.remove(); }, 230);
  }
  const field = (label, input) => h('label', {class: 'field'}, h('span', null, label), input);

  // ───── rendering ─────
  const app = $('#app');
  function render() {
    app.replaceChildren();
    const nav = $('#nav'), fab = $('#fab');
    if (!S.data) { nav.classList.add('hidden'); fab.classList.add('hidden'); app.append(viewSetup()); return; }
    nav.classList.remove('hidden'); fab.classList.remove('hidden');
    if (S.cfg.demo) app.append(h('div', {class: 'chip alert', style: {display: 'inline-block', marginBottom: '8px'}}, '🧪 ' + t('demoBanner')));
    app.append(topbar());
    const v = {home: viewHome, overview: viewOverview, inbox: viewInbox, budgets: viewBudgets, more: viewMore}[S.ui.page] || viewHome;
    app.append(v());
    renderNav();
    document.documentElement.lang = S.cfg.lang;
  }

  function renderNav() {
    const nav = $('#nav'), n = pendingTx().length + openInbox().length;
    const items = [['home', '🏠'], ['overview', '🍩'], ['inbox', '✨'], ['budgets', '🎯'], ['more', '🌷']];
    nav.replaceChildren(...items.map(([k, e]) => h('button', {type: 'button', class: S.ui.page === k ? 'on' : '', onclick: () => go(k)},
      h('b', null, e), t(k), k === 'inbox' && n ? h('span', {class: 'badge'}, n > 99 ? '99+' : n) : null)));
  }
  function go(page, sub) { S.ui.page = page; S.ui.sub = sub || ''; render(); window.scrollTo(0, 0); }

  function topbar() {
    const q = h('input', {class: 'search', type: 'search', placeholder: t('search'), value: S.ui.q, 'aria-label': t('search')});
    q.addEventListener('input', () => { S.ui.q = q.value.trim().toLowerCase(); if (S.ui.page !== 'home') { S.ui.page = 'home'; render(); $('.search').focus(); } else renderList(); });
    return h('div', {class: 'topbar'}, h('span', {class: 'round', 'aria-hidden': 'true'}, '🌸'), q,
      h('button', {class: 'pill-btn', type: 'button', onclick: () => { S.cfg.lang = EN() ? 'th' : 'en'; saveCfg(); render(); }}, EN() ? 'ไทย' : 'EN'));
  }

  function monthChips(onPick) {
    const cur = curMonth();
    const el = h('div', {class: 'months'}, monthsList().map((m) => h('button', {type: 'button', class: 'month' + (m === cur ? ' on' : ''), onclick: () => { S.ui.month = m; (onPick || render)(); }}, monthName(m))));
    requestAnimationFrame(() => { const on = el.querySelector('.on'); if (on) on.scrollIntoView({inline: 'center', block: 'nearest'}); });
    return el;
  }

  // ───── Home ─────
  function viewHome() {
    const m = curMonth(), f = flow(m);
    const ms = monthsList().slice(-6), max = Math.max(1, ...ms.map((k) => flow(k).out));
    const bars = h('div', {class: 'mbars'}, ms.map((k) => h('button', {type: 'button', class: 'mbar' + (k === m ? ' on' : ''), onclick: () => { S.ui.month = k; render(); }, 'aria-label': monthName(k)},
      h('i', {style: {height: Math.max(3, (flow(k).out / max) * 100) + 'px'}}), h('span', null, MON[S.cfg.lang][+k.slice(5) - 1]))));
    const top = h('div', {class: 'card'},
      h('div', {class: 'between'},
        h('div', null, h('div', {class: 'big num'}, (f.net < 0 ? '-' : '+') + baht0(Math.abs(f.net))), h('div', {class: 'small muted'}, t('cashflow') + ' · ' + monthName(m))),
        h('div', {class: 'io num'}, h('span', {class: 'in'}, '➕ ' + nf0.format(f.in)), h('span', {class: 'out'}, '➖ ' + nf0.format(f.out)))),
      bars);
    const pend = pendingTx().length;
    const quick = h('div', {class: 'chips'},
      h('button', {type: 'button', class: 'chip alert', onclick: () => go('inbox')}, `🛍️ ${t('pending')} ${pend}`));
    return h('div', null, monthChips(), top, pend ? quick : null, filterChips(), h('div', {id: 'txlist'}, txListNodes()));
  }

  function filterChips() {
    const chs = [...new Set(D().transactions.filter((x) => monthOf(x) === curMonth()).map((x) => x.channel).filter(Boolean))];
    const kids = [h('button', {type: 'button', class: 'chip' + (!S.ui.tag && !S.ui.cat ? ' on' : ''), onclick: () => { S.ui.tag = ''; S.ui.cat = ''; render(); }}, t('all'))];
    if (S.ui.cat !== '') kids.push(h('button', {type: 'button', class: 'chip on', onclick: () => { S.ui.cat = ''; render(); }}, catEmoji(S.ui.cat === '__p' ? '' : S.ui.cat) + ' ' + catName(S.ui.cat === '__p' ? '' : S.ui.cat) + ' ✕'));
    chs.forEach((c) => kids.push(h('button', {type: 'button', class: 'chip' + (S.ui.tag === c ? ' on' : ''), onclick: () => { S.ui.tag = S.ui.tag === c ? '' : c; render(); }}, chLabel(c))));
    if (D().transactions.some((x) => x.owner === 'partner' && monthOf(x) === curMonth()))
      kids.push(h('button', {type: 'button', class: 'chip' + (S.ui.tag === '__partner' ? ' on' : ''), onclick: () => { S.ui.tag = S.ui.tag === '__partner' ? '' : '__partner'; render(); }}, t('partner')));
    return h('div', {class: 'chips'}, kids);
  }

  function renderList() { const el = $('#txlist'); if (el) el.replaceChildren(...txListNodes()); }

  function txListNodes() {
    const q = S.ui.q, m = curMonth();
    let rows = D().transactions.filter((x) => q || monthOf(x) === m);
    if (S.ui.tag) rows = rows.filter((x) => (S.ui.tag === '__partner' ? x.owner === 'partner' : x.channel === S.ui.tag));
    if (S.ui.cat) rows = rows.filter((x) => { const want = S.ui.cat === '__p' ? '' : S.ui.cat; const sp = splitsOf(x.id); return sp.length ? sp.some((s) => s.category === want) : (x.category || '') === want && dir(x) !== 'move'; });
    if (q) rows = rows.filter((x) => [x.merchant, x.note, catName(x.category), x.channel, payLabel(x.pay), splitsOf(x.id).map((s) => s.item + ' ' + catName(s.category)).join(' ')].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at).localeCompare(String(a.created_at)));
    if (!rows.length) return [h('div', {class: 'empty'}, t('noTx'))];
    const groups = new Map();
    rows.forEach((x) => { if (!groups.has(x.date)) groups.set(x.date, []); groups.get(x.date).push(x); });
    const out = [];
    for (const [date, items] of groups) {
      const dayOut = items.filter((x) => dir(x) === 'out').reduce((s, x) => s + Number(x.amount), 0);
      out.push(h('div', {class: 'dayhead'}, h('span', null, dayName(date)), h('span', {class: 'num'}, dayOut ? '-' + baht(dayOut) : '')));
      out.push(h('div', {class: 'daycard'}, items.map(txRow)));
    }
    return out;
  }

  function txRow(x) {
    const sp = splitsOf(x.id), d = dir(x);
    const mainCat = sp.length ? sp[0].category : x.category;
    const title = x.type === 'cash_withdraw' ? '🏧 ' + t('withdraw') : sp.length ? sp.map((s) => catName(s.category)).join(' + ') : catName(x.category);
    return h('button', {type: 'button', class: 'tx', onclick: () => openTx(x)},
      h('span', {class: 'ico', style: {background: `color-mix(in srgb, ${catColor(mainCat)} 28%, var(--panel))`}}, x.type === 'cash_withdraw' ? '🏧' : sp.length ? '✂️' : catEmoji(x.category)),
      h('span', {class: 'txm'},
        h('div', {class: 'txn'}, title),
        h('div', null,
          isPending(x) ? h('span', {class: 'tag pend'}, '✨ ' + t('pending')) : null,
          x.channel ? h('span', {class: 'tag'}, chLabel(x.channel)) : null,
          x.pay ? h('span', {class: 'tag'}, payLabel(x.pay)) : null,
          x.owner === 'partner' ? h('span', {class: 'tag partner'}, t('partner')) : null),
        h('div', {class: 'txnote'}, [x.merchant, x.note].filter(Boolean).join(' · '))),
      h('span', {class: 'amt' + (d === 'in' ? ' in' : '')}, (d === 'in' ? '+' : d === 'move' ? '' : '-') + baht(Number(x.amount))));
  }

  // ───── Transaction sheet ─────
  function openTx(x) {
    const sp = splitsOf(x.id), d = dir(x);
    const kind = d === 'in' ? 'income' : 'expense';
    const grid = h('div', {class: 'catgrid'}, visibleCats(kind).map((c) => h('button', {type: 'button', class: 'catbtn' + (x.category === c.id ? ' on' : ''), onclick: () => pickCategory(x, c.id)}, h('b', null, c.emoji), EN() && c.name_en ? c.name_en : c.name_th)));
    const note = h('input', {class: 'input', value: x.note || '', placeholder: t('note')});
    const body = h('div', null,
      h('div', {class: 'row', style: {marginBottom: '10px'}},
        h('span', {class: 'ico', style: {background: `color-mix(in srgb, ${catColor(x.category)} 28%, var(--panel))`}}, sp.length ? '✂️' : catEmoji(x.category)),
        h('div', {style: {flex: 1}}, h('div', {class: 'big num', style: {fontSize: '1.7rem'}}, (d === 'in' ? '+' : '-') + baht(Number(x.amount))),
          h('div', {class: 'small muted'}, dayName(x.date) + ' · ' + (x.merchant || '—')))),
      h('div', {style: {marginBottom: '12px'}},
        x.channel ? h('span', {class: 'tag'}, chLabel(x.channel)) : null, x.pay ? h('span', {class: 'tag'}, payLabel(x.pay)) : null,
        x.owner === 'partner' ? h('span', {class: 'tag partner'}, t('partner')) : null,
        x.statement_id ? h('span', {class: 'tag'}, '✅ ' + t('fromStatement')) : null),
      sp.length ? h('div', {class: 'card soft'}, sp.map((s) => h('div', {class: 'between', style: {padding: '4px 0'}}, h('span', null, catEmoji(s.category) + ' ' + catName(s.category) + (s.item ? ' · ' + s.item : '')), h('span', {class: 'num'}, baht(Number(s.amount)))))) : null,
      x.type === 'cash_withdraw' ? null : field(t('category'), grid),
      field(t('note'), note),
      h('div', {class: 'actions'},
        h('button', {type: 'button', class: 'btn primary', onclick: async () => { await api('saveTx', {tx: Object.assign({}, x, {note: note.value})}); closeSheet(); toast(t('saved')); }}, t('save')),
        d === 'out' ? h('button', {type: 'button', class: 'btn', onclick: () => openSplit(x)}, t('split')) : null,
        (x.channel === '7-11' || x.category === 'seven') ? h('button', {type: 'button', class: 'btn', onclick: async () => { await api('setOwner', {id: x.id, owner: x.owner === 'partner' ? 'me' : 'partner'}); closeSheet(); }}, x.owner === 'partner' ? t('mine') : t('partner')) : null,
        !x.statement_id ? h('button', {type: 'button', class: 'btn', onclick: () => openAdd(x)}, t('edit')) : null,
        h('button', {type: 'button', class: 'btn danger', onclick: async () => { if (await ask(t('confirmDel'), {ok: t('del'), danger: true})) { await api('deleteTx', {id: x.id}); closeSheet(); } }}, '🗑️ ' + t('del'))));
    openSheet(null, body);
  }

  function pickCategory(x, catId) {
    const key = C.cleanMerchant(x.merchant);
    const doIt = async (scope) => { const r = await api('setCategory', {id: x.id, category: catId, scope}); closeSheet(); toast(t('saved') + (r && r.changed > 1 ? ` (${r.changed})` : '')); };
    if (!key || (x.source !== 'statement' && x.source !== 'grab_email' && x.pay !== 'transfer')) return doIt('one');
    openSheet(t('scopeQ') + ' ' + catEmoji(catId) + ' ' + catName(catId), h('div', null,
      h('p', {class: 'small muted'}, key),
      h('div', {style: {display: 'grid', gap: '8px'}},
        h('button', {type: 'button', class: 'btn block', onclick: () => doIt('one')}, t('scopeOne')),
        h('button', {type: 'button', class: 'btn block', onclick: () => doIt('future')}, t('scopeFuture')),
        h('button', {type: 'button', class: 'btn block primary', onclick: () => doIt('all')}, t('scopeAll')))));
  }

  // ───── Split editor ─────
  function openSplit(x) {
    const total = Number(x.amount);
    let lines = splitsOf(x.id).map((s) => ({category: s.category, amount: Number(s.amount), item: s.item || ''}));
    if (!lines.length) lines = [{category: x.category || '', amount: total, item: ''}];
    const box = h('div');
    const rem = h('div', {class: 'small', style: {margin: '6px 0 10px'}});
    const cats = visibleCats('expense');
    function draw() {
      box.replaceChildren(...lines.map((l, i) => {
        const sel = h('select', {class: 'input', onchange: (e) => { l.category = e.target.value; }},
          h('option', {value: ''}, '— ' + t('category') + ' —'), cats.map((c) => h('option', {value: c.id, selected: l.category === c.id}, c.emoji + ' ' + (EN() && c.name_en ? c.name_en : c.name_th))));
        const am = h('input', {class: 'input num', inputmode: 'decimal', value: l.amount || '', oninput: (e) => { l.amount = Number(e.target.value) || 0; upd(); }});
        const it = h('input', {class: 'input', placeholder: t('item'), value: l.item, oninput: (e) => { l.item = e.target.value; }});
        return h('div', {style: {marginBottom: '10px'}}, h('div', {class: 'splitline'}, sel, am, h('button', {type: 'button', class: 'x', 'aria-label': t('del'), onclick: () => { lines.splice(i, 1); if (!lines.length) lines.push({category: '', amount: 0, item: ''}); draw(); }}, '✕')), it);
      }));
      upd();
    }
    function upd() {
      const r = round2(total - lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));
      rem.textContent = `${t('remaining')}: ${baht(r)} / ${baht(total)}`;
      rem.style.color = Math.abs(r) < 0.01 ? 'var(--good)' : 'var(--warn)';
    }
    draw();
    openSheet(t('split') + ' · ' + baht(total), h('div', null, box, rem,
      h('div', {class: 'actions'},
        h('button', {type: 'button', class: 'btn', onclick: () => { lines.push({category: '', amount: 0, item: ''}); draw(); }}, t('addLine')),
        h('button', {type: 'button', class: 'btn', onclick: () => { const others = lines.slice(0, -1).reduce((s, l) => s + (Number(l.amount) || 0), 0); lines[lines.length - 1].amount = round2(total - others); draw(); }}, t('fillRest')),
        h('button', {type: 'button', class: 'btn', onclick: () => {
          const sum = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0); if (!sum) return;
          let acc = 0; lines.forEach((l, i) => { if (i < lines.length - 1) { l.amount = round2(l.amount * total / sum); acc += l.amount; } else l.amount = round2(total - acc); }); draw();
        }}, t('fit'))),
      h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn primary block', onclick: async () => {
        const clean = lines.filter((l) => l.category || Number(l.amount));
        await api('setSplits', {tx_id: x.id, splits: clean}); closeSheet(); toast(t('saved'));
      }}, t('save')))));
  }

  // ───── Add / edit sheet ─────
  function openAdd(existing) {
    const x = Object.assign({type: 'expense', date: todayIso(), pay: '', category: '', merchant: '', note: '', owner: 'me', amount: ''}, existing || {});
    const body = h('div');
    function draw() {
      const kind = x.type === 'income' ? 'income' : 'expense';
      const amount = h('input', {class: 'input big num', inputmode: 'decimal', placeholder: '0.00', value: x.amount || '', oninput: (e) => { x.amount = e.target.value; }});
      const seg = h('div', {class: 'seg', style: {marginBottom: '12px'}}, [['expense', t('expense')], ['income', t('income')], ['cash_withdraw', t('withdraw')]].map(([k, l]) =>
        h('button', {type: 'button', class: x.type === k ? 'on' : '', onclick: () => { x.type = k; if (k === 'cash_withdraw') x.pay = 'cash'; draw(); }}, l)));
      const pays = [...D().cards.filter((c) => c.name).map((c) => [c.id, '💳 ' + c.name.replace(/^UOB\s+/, '')]), ['cash', t('cashW')], ['transfer', t('transfer')]];
      const payChips = h('div', {class: 'chips', style: {flexWrap: 'wrap'}}, pays.map(([k, l]) => h('button', {type: 'button', class: 'chip' + (x.pay === k ? ' on' : ''), onclick: () => { x.pay = k; draw(); }}, l)));
      const merchant = h('input', {class: 'input', value: x.merchant, placeholder: t('merchant'), oninput: (e) => {
        x.merchant = e.target.value;
        if (!x.category && x.merchant.length > 2) { const g = C.applyRules(D().rules, x.merchant).category; if (g) { x.category = g; draw(); setTimeout(() => { const el = body.querySelector('[data-k=merchant]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0); } }
      }});
      merchant.dataset.k = 'merchant';
      const grid = h('div', {class: 'catgrid'}, visibleCats(kind).map((c) => h('button', {type: 'button', class: 'catbtn' + (x.category === c.id ? ' on' : ''), onclick: () => { x.category = x.category === c.id ? '' : c.id; draw(); }}, h('b', null, c.emoji), EN() && c.name_en ? c.name_en : c.name_th)));
      const date = h('input', {class: 'input', type: 'date', value: x.date, onchange: (e) => { x.date = e.target.value; }});
      const note = h('input', {class: 'input', value: x.note || '', placeholder: t('note'), oninput: (e) => { x.note = e.target.value; }});
      body.replaceChildren(...[seg, field(t('amount'), amount), x.type !== 'cash_withdraw' ? field(t('category'), grid) : null,
        x.category === 'seven' ? h('div', {class: 'chips'}, h('button', {type: 'button', class: 'chip' + (x.owner === 'me' ? ' on' : ''), onclick: () => { x.owner = 'me'; draw(); }}, t('mine')), h('button', {type: 'button', class: 'chip' + (x.owner === 'partner' ? ' on' : ''), onclick: () => { x.owner = 'partner'; draw(); }}, t('partner'))) : null,
        x.type !== 'cash_withdraw' ? field(t('payWith'), payChips) : null, field(t('merchant'), merchant), field(t('date'), date), field(t('note'), note),
        h('button', {type: 'button', class: 'btn primary block', onclick: async () => {
          const amt = Number(String(x.amount).replace(/,/g, ''));
          if (!(amt > 0)) { toast('⚠️ ' + t('amount')); return; }
          const tx = Object.assign({}, x, {amount: amt});
          if (tx.type === 'cash_withdraw') tx.category = '';
          await api('saveTx', {tx});
          const key = C.cleanMerchant(tx.merchant);
          if (tx.pay === 'transfer' && key && tx.category && C.applyRules(D().rules, tx.merchant).category !== tx.category) await api('saveRule', {rule: {pattern: key, category: tx.category, channel: '', priority: 50}});
          closeSheet(); toast(t('saved'));
        }}, t('save'))].filter(Boolean));
    }
    draw();
    openSheet(existing ? t('edit') : '🌸 ' + t('add'), body);
  }

  // ───── Overview ─────
  function viewOverview() {
    const m = curMonth(), rows = catTotals(m), spend = rows.reduce((s, r) => s + Math.max(0, r.total), 0);
    const chart = h('div');
    const draw = () => chart.replaceChildren(S.ui.view === 'bar' ? barChart(rows) : donutChart(rows, spend));
    draw();
    const seg = h('div', {class: 'seg'}, [['donut', '🍩'], ['bar', '📊']].map(([k, e]) => h('button', {type: 'button', class: S.ui.view === k ? 'on' : '', 'aria-label': k, onclick: () => { S.ui.view = k; render(); }}, e)));
    return h('div', null, h('h1', {class: 'title'}, t('overview') + ' 🍩'), monthChips(),
      h('div', {class: 'card'}, h('div', {class: 'between'}, h('div', null, h('div', {class: 'small muted'}, t('expenses')), h('div', {class: 'big num'}, baht0(spend)), h('div', {class: 'small muted'}, t('onlyMine'))), seg), rows.length ? chart : h('div', {class: 'empty'}, t('noTx'))),
      rows.length ? h('div', {class: 'card'}, h('p', {class: 'small muted', style: {margin: '0 0 4px'}}, t('tapCat')),
        h('ul', {class: 'list'}, rows.map((r) => h('li', {onclick: () => openCat(r.id), style: {cursor: 'pointer'}},
          h('span', {class: 'ico', style: {background: `color-mix(in srgb, ${catColor(r.id)} 28%, var(--panel))`}}, catEmoji(r.id)),
          h('div', {class: 'txm'}, h('div', {class: 'txn'}, catName(r.id)), h('div', {class: 'txnote'}, `${r.count} ${t('items')}`)),
          h('div', {class: 'r'}, h('div', null, baht(r.total)), h('div', {class: 'small muted'}, pct(r.share))))))) : null);
  }
  function openCat(id) { S.ui.cat = id === '' ? '__p' : id; S.ui.tag = ''; go('home'); }

  function donutChart(rows, sum) {
    const pos = rows.filter((r) => r.total > 0);
    const size = Math.min(window.innerWidth - 64, 330), r = size * 0.27, rin = r * 0.66, ring = r + size * 0.135, cx = size / 2;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
    let a0 = 0;
    const pt = (rad, ang) => [cx + rad * Math.sin(ang), cx - rad * Math.cos(ang)];
    pos.forEach((row) => {
      const a1 = a0 + row.share * Math.PI * 2, pad = pos.length > 1 ? 0.012 : 0;
      const s = a0 + pad, e = Math.max(s + 0.001, a1 - pad), large = e - s > Math.PI ? 1 : 0;
      const [x1, y1] = pt(r, s), [x2, y2] = pt(r, e), [x3, y3] = pt(rin, e), [x4, y4] = pt(rin, s);
      const path = pos.length === 1
        ? `M ${cx} ${cx - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cx - r} L ${cx - 0.01} ${cx - rin} A ${rin} ${rin} 0 1 0 ${cx} ${cx - rin} Z`
        : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rin} ${rin} 0 ${large} 0 ${x4} ${y4} Z`;
      const p = mk('path', {d: path, fill: catColor(row.id), style: 'cursor:pointer'});
      p.addEventListener('click', () => openCat(row.id));
      p.append(mk('title', {})); p.lastChild.textContent = `${catName(row.id)} ${baht(row.total)} · ${pct(row.share)}`;
      svg.append(p);
      if (row.share >= 0.04) {
        const mid = (a0 + a1) / 2, [bx, by] = pt(ring, mid), br = Math.max(14, size * 0.055);
        const g = mk('g', {style: 'cursor:pointer'}); g.addEventListener('click', () => openCat(row.id));
        g.append(mk('circle', {cx: bx, cy: by, r: br, fill: `color-mix(in srgb, ${catColor(row.id)} 32%, var(--panel))`}));
        const em = mk('text', {x: bx, y: by, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': br * 0.95}); em.textContent = catEmoji(row.id); g.append(em);
        const below = -Math.cos(mid) < 0 ? false : true;
        const lb = mk('text', {x: bx, y: below ? by + br + 13 : by - br - 6, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'currentColor'}); lb.textContent = pct(row.share); g.append(lb);
        svg.append(g);
      }
      a0 = a1;
    });
    const t1 = mk('text', {x: cx, y: cx - 6, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)'}); t1.textContent = EN() ? '💖 Spent' : '💖 ใช้ไป';
    const t2 = mk('text', {x: cx, y: cx + 16, 'text-anchor': 'middle', 'font-size': Math.max(15, r * 0.24), 'font-weight': 700, fill: 'var(--pk)'}); t2.textContent = baht0(sum);
    svg.append(t1, t2);
    return h('div', {class: 'donut'}, svg);
  }
  function barChart(rows) {
    const max = Math.max(1, ...rows.map((r) => r.total));
    return h('div', {style: {marginTop: '12px', display: 'grid', gap: '8px'}}, rows.filter((r) => r.total > 0).map((r) => h('button', {type: 'button', onclick: () => openCat(r.id), style: {display: 'grid', gridTemplateColumns: '7.5rem 1fr auto', alignItems: 'center', gap: '8px', background: 'none', border: 0, padding: 0, textAlign: 'left'}},
      h('span', {class: 'small', style: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}, catEmoji(r.id) + ' ' + catName(r.id)),
      h('span', {class: 'hbar', style: {width: Math.max(2, r.total / max * 100) + '%', background: catColor(r.id)}}),
      h('span', {class: 'small num muted'}, baht0(r.total)))));
  }

  // ───── Inbox (to categorize) ─────
  function viewInbox() {
    const list = pendingTx(), mails = openInbox();
    // Quick picks: the categories you use most for the same channel (e.g. what you usually buy on Shopee).
    const topFor = (channel) => {
      const freq = new Map(), bump = (c, w) => { if (c) freq.set(c, (freq.get(c) || 0) + w); };
      D().transactions.forEach((x) => { if (dir(x) !== 'out') return; const w = channel && x.channel === channel ? 5 : 1; bump(x.category, w); splitsOf(x.id).forEach((s) => bump(s.category, w)); });
      const auto = new Set(['seven', 'transport', 'cash-misc']);
      return visibleCats('expense').filter((c) => !channel || channel === '7-11' || !auto.has(c.id)).sort((a, b) => (freq.get(b.id) || 0) - (freq.get(a.id) || 0)).slice(0, 6);
    };
    return h('div', null, h('h1', {class: 'title'}, '✨ ' + t('pending')),
      !list.length && !mails.length ? h('div', {class: 'card empty'}, '🎉 ' + t('nothing')) : null,
      list.map((x) => h('div', {class: 'card'},
        h('div', {class: 'between'}, h('div', null, h('div', {class: 'txn'}, x.merchant || '—'), h('div', {class: 'small muted'}, dayName(x.date) + ' · ' + payLabel(x.pay) + (x.channel ? ' · ' + chLabel(x.channel) : ''))), h('div', {class: 'amt'}, baht(Number(x.amount)))),
        h('div', {class: 'chips', style: {flexWrap: 'wrap', marginTop: '8px'}},
          topFor(x.channel).map((c) => h('button', {type: 'button', class: 'chip', onclick: () => pickCategory(x, c.id)}, c.emoji + ' ' + (EN() && c.name_en ? c.name_en : c.name_th))),
          h('button', {type: 'button', class: 'chip', onclick: () => openTx(x)}, t('more_')),
          h('button', {type: 'button', class: 'chip', onclick: () => openSplit(x)}, t('split'))))),
      mails.length ? h('h2', {style: {margin: '18px 4px 8px'}}, '📧 ' + t('emailInbox')) : null,
      mails.map((i) => h('div', {class: 'card'}, h('div', {class: 'txn'}, i.subject || i.source), h('div', {class: 'small muted'}, (i.received_at || '').replace('T', ' ') + ' · ' + (i.note || '')),
        h('pre', {class: 'raw'}, String(i.raw || '').slice(0, 800)),
        h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn', onclick: () => openAdd({channel: 'Grab', merchant: 'Grab', date: (i.received_at || todayIso()).slice(0, 10)})}, t('addManual')),
          h('button', {type: 'button', class: 'btn', onclick: () => api('resolveInbox', {id: i.id})}, t('close'))))));
  }

  // ───── Budgets ─────
  function viewBudgets() {
    const m = curMonth(), tot = new Map(catTotals(m).map((r) => [r.id, r.total]));
    const cats = visibleCats('expense');
    const withB = cats.filter((c) => Number(c.budget) > 0), noB = cats.filter((c) => !(Number(c.budget) > 0));
    const sumB = withB.reduce((s, c) => s + Number(c.budget), 0), sumS = withB.reduce((s, c) => s + Math.max(0, tot.get(c.id) || 0), 0);
    const bar = (spent, budget) => { const p = budget ? spent / budget : 0; return h('div', {class: 'prog' + (p > 1 ? ' over' : p > 0.8 ? ' warn' : '')}, h('i', {style: {width: Math.min(100, p * 100) + '%'}})); };
    return h('div', null, h('h1', {class: 'title'}, t('budgets') + ' 🎯'), monthChips(),
      withB.length ? h('div', {class: 'card'}, h('div', {class: 'between'}, h('b', null, t('totalBudget')), h('span', {class: 'num'}, baht0(sumS) + ' / ' + baht0(sumB))), bar(sumS, sumB),
        h('div', {class: 'small muted', style: {marginTop: '6px'}}, sumB - sumS >= 0 ? `${t('left')} ${baht0(sumB - sumS)}` : `${t('over')} ${baht0(sumS - sumB)}`)) : null,
      withB.length ? h('div', {class: 'card'}, withB.map((c) => { const sp = Math.max(0, tot.get(c.id) || 0), b = Number(c.budget);
        return h('button', {type: 'button', class: 'linkrow', onclick: () => openBudget(c), style: {display: 'block'}},
          h('div', {class: 'between'}, h('span', null, c.emoji + ' ' + catName(c.id)), h('span', {class: 'num small'}, baht0(sp) + ' ' + t('of') + ' ' + baht0(b))), bar(sp, b)); })) : null,
      h('div', {class: 'card'}, h('h2', {style: {marginBottom: '6px'}}, t('noBudget')), noB.map((c) => h('div', {class: 'linkrow'}, h('span', {class: 'e'}, c.emoji), h('span', {class: 't'}, catName(c.id), h('div', {class: 'small muted num'}, baht0(Math.max(0, tot.get(c.id) || 0)))),
        h('button', {type: 'button', class: 'btn', onclick: () => openBudget(c)}, t('setBudget'))))));
  }
  function openBudget(c) {
    const inp = h('input', {class: 'input big num', inputmode: 'decimal', value: c.budget || '', placeholder: '0'});
    openSheet(c.emoji + ' ' + catName(c.id), h('div', null, field(t('budget'), inp), h('button', {type: 'button', class: 'btn primary block', onclick: async () => { await api('saveCategory', {category: Object.assign({}, c, {budget: Number(inp.value) || ''})}); closeSheet(); toast(t('saved')); }}, t('save'))));
    setTimeout(() => inp.focus(), 250);
  }

  // ───── More ─────
  function viewMore() {
    if (S.ui.sub) return ({cards: viewCards, categories: viewCategories, rules: viewRules, recurring: viewRecurring, settings: viewSettings}[S.ui.sub] || viewCards)();
    const row = (e, label, fn, right) => h('button', {type: 'button', class: 'linkrow', onclick: fn}, h('span', {class: 'e'}, e), h('span', {class: 't'}, label), right ? h('span', {class: 'small muted num'}, right) : null, h('span', {class: 'muted'}, '›'));
    return h('div', null, h('h1', {class: 'title'}, t('more') + ' 🌷'),
      h('div', {class: 'card'},
        row('💳', t('cards'), () => go('more', 'cards')),
        row('📄', t('importSt'), openImport),
        row('💵', t('cash'), openCash, baht0(cashBalance()))),
      h('div', {class: 'card'},
        row('🏷️', t('categories'), () => go('more', 'categories')),
        row('🧩', t('rules'), () => go('more', 'rules')),
        row('🔁', t('recurring'), () => go('more', 'recurring')),
        row('⚙️', t('settings'), () => go('more', 'settings')),
        row('🌐', t('lang'), () => { S.cfg.lang = EN() ? 'th' : 'en'; saveCfg(); render(); })));
  }
  const backBtn = () => h('button', {type: 'button', class: 'btn', style: {marginBottom: '10px'}, onclick: () => go('more')}, t('back'));

  function cycleOf(c) {
    const today = todayIso(), cut = Number(c.cut_day);
    if (!cut) return null;
    const y = +today.slice(0, 4), mo = +today.slice(5, 7), d = +today.slice(8, 10);
    const mk = (yy, mm, dd) => { const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate(); return new Date(Date.UTC(yy, mm - 1, Math.min(dd, last))); };
    let end = mk(y, mo, cut); if (d > cut) end = mk(y, mo + 1, cut);
    const prevEnd = mk(end.getUTCFullYear(), end.getUTCMonth(), cut);
    const start = new Date(prevEnd.getTime() + 86400e3);
    const due = Number(c.due_day) ? (Number(c.due_day) > cut ? mk(end.getUTCFullYear(), end.getUTCMonth() + 1, Number(c.due_day)) : mk(end.getUTCFullYear(), end.getUTCMonth() + 2, Number(c.due_day))) : null;
    const iso = (x) => x.toISOString().slice(0, 10);
    return {start: iso(start), end: iso(end), due: due ? iso(due) : '', daysLeft: Math.round((end - new Date(today + 'T00:00:00Z')) / 86400e3)};
  }
  function viewCards() {
    return h('div', null, backBtn(), h('h1', {class: 'title'}, t('cards') + ' 💳'),
      D().cards.map((c) => {
        const cy = cycleOf(c);
        const inCycle = cy ? D().transactions.filter((x) => x.pay === c.id && x.date >= cy.start && x.date <= cy.end) : [];
        const spent = inCycle.reduce((s, x) => s + (dir(x) === 'out' ? 1 : dir(x) === 'in' ? -1 : 0) * Number(x.amount), 0);
        const cb = inCycle.filter((x) => x.type === 'cashback').reduce((s, x) => s + Number(x.amount), 0);
        const last = D().statements.filter((s) => s.card === c.id).sort((a, b) => String(b.statement_date).localeCompare(String(a.statement_date)))[0];
        return h('div', {class: 'card'},
          h('div', {class: 'row'}, h('span', {class: 'plastic', style: {background: `linear-gradient(135deg, ${c.color || '#ff6fa8'}, #c084fc)`}}, (c.name || '').replace(/^UOB\s+/, '').slice(0, 6)),
            h('div', {style: {flex: 1}}, h('h2', null, c.name + (c.last4 ? ' …' + c.last4 : '')), h('div', {class: 'small muted'}, String(c.default_for || '').split(',').map((s) => s.trim()).filter(Boolean).join(' · '))),
            h('button', {type: 'button', class: 'btn', onclick: () => openCard(c)}, '✏️')),
          cy ? h('dl', {class: 'kv'},
            h('dt', null, `${t('cycle')} (${dayName(cy.start)} – ${dayName(cy.end)})`), h('dd', null, baht(spent)),
            h('dt', null, t('cutIn')), h('dd', null, `${cy.daysLeft} ${t('days')}`),
            cy.due ? h('dt', null, t('due')) : null, cy.due ? h('dd', null, dayName(cy.due)) : null,
            cb ? h('dt', null, '🪙 Cashback') : null, cb ? h('dd', {class: 'in'}, baht(cb)) : null,
            last ? h('dt', null, `${t('lastSt')} (${dayName(last.statement_date)})`) : null, last ? h('dd', null, baht(Number(last.total))) : null) : null);
      }),
      h('button', {type: 'button', class: 'btn block', onclick: () => openCard({})}, '+ ' + t('cardName')));
  }
  function openCard(c) {
    const f = Object.assign({name: '', bank: '', last4: '', cut_day: '', due_day: '', credit_line: '', color: '#ff6fa8', default_for: ''}, c);
    const inp = (k, attrs) => h('input', Object.assign({class: 'input', value: f[k] == null ? '' : f[k], oninput: (e) => { f[k] = e.target.value; }}, attrs || {}));
    openSheet('💳 ' + (c.name || t('cardName')), h('div', null, field(t('cardName'), inp('name')), field(t('last4'), inp('last4', {inputmode: 'numeric', maxlength: 4})),
      field(t('cutDay'), inp('cut_day', {inputmode: 'numeric'})), field(t('dueDay'), inp('due_day', {inputmode: 'numeric'})), field(t('creditLine'), inp('credit_line', {inputmode: 'numeric'})),
      field(t('defaultFor'), inp('default_for')), field(t('color'), inp('color', {type: 'color'})),
      h('button', {type: 'button', class: 'btn primary block', onclick: async () => {
        await api('saveCard', {card: Object.assign({}, f, {cut_day: Number(f.cut_day) || '', due_day: Number(f.due_day) || '', credit_line: Number(f.credit_line) || ''})});
        closeSheet();
        // Grab receipts that arrived before this card had its digits: give them this card if it is the one used for Grab.
        const chans = String(f.default_for || '').split(',').map((x) => x.trim()).filter(Boolean);
        const fix = f.last4 && c.id ? D().transactions.filter((x) => !x.pay && x.source === 'grab_email' && chans.includes(x.channel)) : [];
        for (const x of fix) await api('saveTx', {tx: Object.assign({}, x, {pay: c.id})});
        toast(t('saved') + (fix.length ? ` · 💳 ${fix.length}` : ''));
      }}, t('save'))));
  }

  function openCash() {
    const inp = h('input', {class: 'input big num', inputmode: 'decimal', placeholder: '0'});
    openSheet('💵 ' + t('cash'), h('div', null, h('div', {class: 'between', style: {marginBottom: '12px'}}, h('span', {class: 'muted'}, t('expected')), h('b', {class: 'num'}, baht(cashBalance()))),
      field(t('counted'), inp), h('button', {type: 'button', class: 'btn primary block', onclick: async () => { if (inp.value === '') return; await api('cashCount', {amount: Number(inp.value)}); closeSheet(); toast(t('saved')); }}, t('save'))));
  }

  // ───── Statement import (pdf.js loads only when needed) ─────
  async function readPdfItems(file) {
    const pdfjs = await import(PDFJS);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const task = pdfjs.getDocument({data: new Uint8Array(await file.arrayBuffer())});
    task.onPassword = (cb) => { ask(t('pdfPassword'), {input: true, type: 'password'}).then((pw) => { if (pw == null) task.destroy(); else cb(pw); }); };
    const doc = await task.promise;
    const items = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p), vp = page.getViewport({scale: 1}), tc = await page.getTextContent();
      tc.items.forEach((it) => { if (it.str) items.push({str: it.str, x: it.transform[4], y: vp.height - it.transform[5], page: p}); });
    }
    return items;
  }
  function openImport() {
    const out = h('div');
    const file = h('input', {type: 'file', accept: 'application/pdf', class: 'input', onchange: async () => {
      const f = file.files[0]; if (!f) return;
      out.replaceChildren(h('p', {class: 'muted'}, '🌸 ' + t('reading')));
      try {
        const st = P.parseStatement(P.linesFromItems(await readPdfItems(f)));
        out.replaceChildren(
          h('div', {class: 'card soft'}, h('div', null, `${st.bank} · ${dayName(st.statementDate)}` + (st.dueDate ? ` · ${t('due')} ${dayName(st.dueDate)}` : '')),
            st.cards.map((c) => h('div', {style: {marginTop: '8px'}}, h('b', null, `${c.name || st.bank} …${c.last4}`), h('div', {class: 'small'}, `${c.rows.length} ${t('items')} · ${baht(c.totalBalance)}`),
              h('div', {class: 'small', style: {color: c.check.ok ? 'var(--good)' : 'var(--bad)'}}, c.check.ok ? t('checkOk') : `${t('checkBad')} (${baht(c.check.computed)} ≠ ${baht(c.check.expected)})`)))),
          h('button', {type: 'button', class: 'btn primary block', onclick: async () => {
            const r = await api('importStatement', {statement: st});
            out.replaceChildren(...(r.summary || []).map((s) => h('div', {class: 'card soft'}, h('b', null, s.card), s.skipped ? h('div', {class: 'small'}, s.reason || 'ซ้ำ') :
              h('div', {class: 'small'}, `✅ ${t('matched')}: ${s.matched} · 🆕 ${t('created')}: ${s.created} · ✨ ${t('toCategorize')}: ${s.pending}`))),
            h('button', {type: 'button', class: 'btn block', onclick: () => { closeSheet(); go('inbox'); }}, '✨ ' + t('pending')));
          }}, t('doImport')));
      } catch (e) { out.replaceChildren(h('p', {style: {color: 'var(--bad)'}}, '⚠️ ' + (e.message || e))); }
    }});
    openSheet('📄 ' + t('importSt'), h('div', null, field(t('choosePdf'), file), out));
  }

  // ───── Categories ─────
  function viewCategories() {
    const all = D().categories.slice().sort((a, b) => (a.kind === 'income') - (b.kind === 'income') || (a.order || 0) - (b.order || 0));
    const move = async (i, d) => { const ids = all.map((c) => c.id); const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; await api('reorderCategories', {ids}); };
    return h('div', null, backBtn(), h('h1', {class: 'title'}, t('categories') + ' 🏷️'),
      h('div', {class: 'card'}, all.map((c, i) => h('div', {class: 'linkrow', style: {opacity: c.hidden ? 0.45 : 1}},
        h('span', {class: 'e'}, c.emoji), h('span', {class: 't', onclick: () => openCategory(c), style: {cursor: 'pointer'}}, catName(c.id), h('div', {class: 'small muted'}, (c.kind === 'income' ? t('income_') : t('expense_')) + (c.budget ? ' · ' + baht0(c.budget) : '') + (c.parent ? ' · ↳ ' + catName(c.parent) : ''))),
        h('button', {type: 'button', class: 'x', 'aria-label': 'up', onclick: () => move(i, -1)}, '▲'), h('button', {type: 'button', class: 'x', 'aria-label': 'down', onclick: () => move(i, 1)}, '▼')))),
      h('button', {type: 'button', class: 'btn block', onclick: () => openCategory({})}, t('newCat')));
  }
  function openCategory(c) {
    const f = Object.assign({name_th: '', name_en: '', emoji: '🌸', color: '#ff8fbf', parent: '', budget: '', kind: 'expense', hidden: false}, c);
    const inp = (k, attrs) => h('input', Object.assign({class: 'input', value: f[k] == null ? '' : f[k], oninput: (e) => { f[k] = e.target.value; }}, attrs || {}));
    const parent = h('select', {class: 'input', onchange: (e) => { f.parent = e.target.value; }}, h('option', {value: ''}, t('noneOpt')), visibleCats().filter((x) => x.id !== c.id && !x.parent).map((x) => h('option', {value: x.id, selected: f.parent === x.id}, x.emoji + ' ' + catName(x.id))));
    const kind = h('select', {class: 'input', onchange: (e) => { f.kind = e.target.value; }}, h('option', {value: 'expense', selected: f.kind !== 'income'}, t('expense_')), h('option', {value: 'income', selected: f.kind === 'income'}, t('income_')));
    const merge = c.id ? h('select', {class: 'input', onchange: async (e) => { if (!e.target.value) return; if (!(await ask(`${catName(c.id)} → ${catName(e.target.value)}?`, {ok: 'OK'}))) { e.target.value = ''; return; } await api('mergeCategory', {from: c.id, to: e.target.value}); closeSheet(); toast(t('saved')); }},
      h('option', {value: ''}, t('merge')), visibleCats(f.kind).filter((x) => x.id !== c.id).map((x) => h('option', {value: x.id}, x.emoji + ' ' + catName(x.id)))) : null;
    openSheet((f.emoji || '🌸') + ' ' + (c.id ? catName(c.id) : t('newCat')), h('div', null,
      field(t('emoji'), inp('emoji', {maxlength: 8})), field(t('nameTh'), inp('name_th')), field(t('nameEn'), inp('name_en')), field(t('kind'), kind), field(t('parent'), parent),
      field(t('budget'), inp('budget', {inputmode: 'decimal'})), field(t('color'), inp('color', {type: 'color'})),
      h('button', {type: 'button', class: 'btn primary block', onclick: async () => { if (!f.name_th) { toast('⚠️ ' + t('nameTh')); return; } await api('saveCategory', {category: Object.assign({}, f, {budget: Number(f.budget) || ''})}); closeSheet(); toast(t('saved')); }}, t('save')),
      c.id ? h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn', onclick: async () => { await api('saveCategory', {category: Object.assign({}, c, {hidden: !c.hidden})}); closeSheet(); }}, c.hidden ? t('unhide') : t('hide'))) : null,
      merge ? field('', merge) : null));
  }

  // ───── Rules ─────
  function viewRules() {
    const rules = D().rules.slice().sort((a, b) => Number(b.priority) - Number(a.priority));
    return h('div', null, backBtn(), h('h1', {class: 'title'}, t('rules') + ' 🧩'),
      h('button', {type: 'button', class: 'btn block', style: {marginBottom: '10px'}, onclick: () => openRule({})}, t('newRule')),
      h('div', {class: 'card'}, rules.map((r) => h('div', {class: 'linkrow'},
        h('span', {class: 't', onclick: () => openRule(r), style: {cursor: 'pointer'}}, h('code', null, r.pattern), h('div', {class: 'small muted'}, [r.channel ? chLabel(r.channel) : '', r.category ? catEmoji(r.category) + ' ' + catName(r.category) : '', r.origin === 'user' ? '👤' : ''].filter(Boolean).join(' · '))),
        h('button', {type: 'button', class: 'x', 'aria-label': t('del'), onclick: async () => { if (await ask(t('confirmDel'), {ok: t('del'), danger: true})) await api('deleteRule', {id: r.id}); }}, '✕')))));
  }
  function openRule(r) {
    const f = Object.assign({pattern: '', channel: '', category: '', priority: 50}, r);
    const pat = h('input', {class: 'input', value: f.pattern, oninput: (e) => { f.pattern = e.target.value.toUpperCase(); }});
    const ch = h('input', {class: 'input', value: f.channel, placeholder: 'Shopee / Grab / 7-11', oninput: (e) => { f.channel = e.target.value; }});
    const sel = h('select', {class: 'input', onchange: (e) => { f.category = e.target.value; }}, h('option', {value: ''}, t('noneOpt')), visibleCats().map((c) => h('option', {value: c.id, selected: f.category === c.id}, c.emoji + ' ' + catName(c.id))));
    openSheet('🧩 ' + t('rules'), h('div', null, field(t('pattern'), pat), field(t('channel'), ch), field(t('category'), sel),
      h('button', {type: 'button', class: 'btn primary block', onclick: async () => { if (!f.pattern) return; await api('saveRule', {rule: f}); closeSheet(); toast(t('saved')); }}, t('save'))));
  }

  // ───── Recurring ─────
  function viewRecurring() {
    return h('div', null, backBtn(), h('h1', {class: 'title'}, t('recurring') + ' 🔁'),
      h('div', {class: 'card'}, (D().recurring || []).length ? D().recurring.map((r) => h('div', {class: 'linkrow', onclick: () => openRecurring(r), style: {cursor: 'pointer', opacity: r.active ? 1 : 0.5}},
        h('span', {class: 'e'}, catEmoji(r.category)), h('span', {class: 't'}, r.name, h('div', {class: 'small muted'}, `${baht(Number(r.amount))} · ${payLabel(r.pay)} · ${t('dayOfMonth')} ${r.day}`)), h('span', {class: 'muted'}, '›'))) : h('div', {class: 'empty'}, t('nothing'))),
      h('button', {type: 'button', class: 'btn block', onclick: () => openRecurring({})}, t('newItem')));
  }
  function openRecurring(r) {
    const f = Object.assign({name: '', amount: '', type: 'expense', pay: 'transfer', category: '', day: 1, active: true, note: ''}, r);
    const inp = (k, attrs) => h('input', Object.assign({class: 'input', value: f[k] == null ? '' : f[k], oninput: (e) => { f[k] = e.target.value; }}, attrs || {}));
    const sel = h('select', {class: 'input', onchange: (e) => { f.category = e.target.value; }}, h('option', {value: ''}, t('noneOpt')), visibleCats().map((c) => h('option', {value: c.id, selected: f.category === c.id}, c.emoji + ' ' + catName(c.id))));
    const type = h('select', {class: 'input', onchange: (e) => { f.type = e.target.value; }}, h('option', {value: 'expense', selected: f.type === 'expense'}, t('expense_')), h('option', {value: 'income', selected: f.type === 'income'}, t('income_')));
    const pay = h('select', {class: 'input', onchange: (e) => { f.pay = e.target.value; }}, [['transfer', t('transfer')], ['cash', t('cashW')], ...D().cards.map((c) => [c.id, '💳 ' + c.name])].map(([k, l]) => h('option', {value: k, selected: f.pay === k}, l)));
    const act = h('input', {type: 'checkbox', checked: !!f.active, onchange: (e) => { f.active = e.target.checked; }});
    openSheet('🔁 ' + (r.name || t('recurring')), h('div', null, field(t('merchant'), inp('name')), field(t('amount'), inp('amount', {inputmode: 'decimal'})), field(t('kind'), type), field(t('payWith'), pay),
      field(t('category'), sel), field(t('dayOfMonth'), inp('day', {inputmode: 'numeric'})), h('label', {class: 'row', style: {marginBottom: '12px'}}, act, t('active')),
      h('button', {type: 'button', class: 'btn primary block', onclick: async () => { await api('saveRecurring', {item: Object.assign({}, f, {amount: Number(f.amount), day: Number(f.day) || 1})}); closeSheet(); toast(t('saved')); }}, t('save')),
      r.id ? h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn danger', onclick: async () => { if (await ask(t('confirmDel'), {ok: t('del'), danger: true})) { await api('deleteRecurring', {id: r.id}); closeSheet(); } }}, t('del'))) : null));
  }

  // ───── Settings ─────
  function viewSettings() {
    const s = D().settings || {};
    const api_ = h('input', {class: 'input', value: S.cfg.api, placeholder: 'https://script.google.com/macros/s/…/exec'});
    const tok = h('input', {class: 'input', type: 'password', value: S.cfg.token});
    const setRow = (k, label) => { const i = h('input', {class: 'input', value: s[k] || ''}); return field(label, h('div', {class: 'row'}, i, h('button', {type: 'button', class: 'btn', onclick: () => api('saveSetting', {key: k, value: i.value}).then(() => toast(t('saved')))}, t('save')))); };
    return h('div', null, backBtn(), h('h1', {class: 'title'}, t('settings') + ' ⚙️'),
      h('div', {class: 'card'}, field(t('apiUrl'), api_), field(t('token'), tok),
        h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn primary', onclick: () => { S.cfg.api = api_.value.trim(); S.cfg.token = tok.value.trim(); S.cfg.demo = false; saveCfg(); store.del('data'); load(); }}, t('connect')),
          h('button', {type: 'button', class: 'btn', onclick: async () => { try { const r = await fetch(api_.value.trim(), {method: 'POST', body: JSON.stringify({action: 'ping', token: tok.value.trim()})}); const j = await r.json(); toast(j.ok ? '✅ OK ' + j.result.today : '⚠️ ' + j.error); } catch (e) { toast('⚠️ ' + e.message); } }}, t('testConn')))),
      !S.cfg.demo ? h('div', {class: 'card'}, setRow('match_days', t('matchDays')), setRow('partner_name', t('partnerName')), setRow('cash_start', t('cashStart'))) : null,
      h('div', {class: 'card'},
        h('label', {class: 'row'}, h('input', {type: 'checkbox', checked: S.cfg.demo, onchange: (e) => { S.cfg.demo = e.target.checked; saveCfg(); S.data = null; load(); }}), t('useDemo')),
        h('div', {class: 'actions'}, h('button', {type: 'button', class: 'btn danger', onclick: async () => { if (await ask(t('clearLocal') + '?', {ok: t('del'), danger: true})) { store.del('data'); store.del('cfg'); location.reload(); } }}, t('clearLocal')))));
  }

  // ───── Setup screen ─────
  function viewSetup() {
    const api_ = h('input', {class: 'input', value: S.cfg.api, placeholder: 'https://script.google.com/macros/s/…/exec'});
    const tok = h('input', {class: 'input', type: 'password', value: S.cfg.token});
    return h('div', {style: {paddingTop: '8vh'}},
      h('div', {style: {fontSize: '3.2rem', textAlign: 'center'}}, '🌸'),
      h('h1', {class: 'title', style: {textAlign: 'center'}}, 'Kawaii Money'),
      h('div', {class: 'card'}, h('h2', null, t('welcome')), h('p', {class: 'small muted'}, t('welcomeSub')),
        field(t('apiUrl'), api_), field(t('token'), tok),
        h('button', {type: 'button', class: 'btn primary block', onclick: () => { S.cfg.api = api_.value.trim(); S.cfg.token = tok.value.trim(); S.cfg.demo = false; saveCfg(); load(); }}, t('connect'))),
      h('button', {type: 'button', class: 'btn block', onclick: () => { S.cfg.demo = true; saveCfg(); load(); }}, t('tryDemo')),
      h('p', {style: {textAlign: 'center', marginTop: '16px'}}, h('button', {type: 'button', class: 'pill-btn', onclick: () => { S.cfg.lang = EN() ? 'th' : 'en'; saveCfg(); render(); }}, t('lang'))));
  }

  // ───── start ─────
  window.KMApp = {state: S, api, render}; // handy for debugging in the browser console
  $('#fab').addEventListener('click', () => openAdd());
  // Shortcut deep links: index.html#add opens the add sheet, #partner711 opens it as a partner 7-11 item.
  function handleHash() {
    if (!S.data) return;
    if (location.hash === '#add') openAdd();
    if (location.hash === '#partner711') openAdd({category: 'seven', owner: 'partner', channel: '7-11', merchant: '7-11'});
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  window.addEventListener('hashchange', handleHash);
  if (S.cfg.api || S.cfg.demo) load().then(handleHash); else render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
