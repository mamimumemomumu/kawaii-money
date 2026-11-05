/* Demo data — made-up transactions so the app can be tried before connecting the Google Sheet.
 * Nothing here is real. */
(function (root) {
  function makeDemo(todayIso) {
    const C = root.KMCore;
    const pick = (cols, row) => Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    const catCols = ['id', 'name_th', 'name_en', 'emoji', 'color', 'parent', 'budget', 'order', 'hidden', 'kind'];
    const categories = C.SEED_CATEGORIES.map((r) => pick(catCols, r));
    const budgets = {food: 6000, seven: 2500, shopping: 3000, transport: 2000, pets: 1500, kpop: 2000};
    categories.forEach((c) => { if (budgets[c.id]) c.budget = budgets[c.id]; });
    const rules = C.SEED_RULES.map((r, i) => ({id: 'r' + i, pattern: r[0], channel: r[1], category: r[2], priority: r[3], origin: 'seed'}));
    const cardCols = ['id', 'name', 'bank', 'last4', 'cut_day', 'due_day', 'credit_line', 'color', 'default_for'];
    const cards = C.SEED_CARDS.map((r) => pick(cardCols, r));
    cards[0].last4 = '1111'; cards[0].credit_line = 100000;
    cards[1].last4 = '2222'; cards[1].credit_line = 100000;

    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pickOne = (a) => a[Math.floor(rnd() * a.length)];
    const money = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 4) / 4;
    const tx = [];
    let n = 0;
    const add = (o) => tx.push(Object.assign({id: 'd' + (++n), post_date: '', type: 'expense', pay: '', channel: '', merchant: '', note: '',
      category: '', owner: 'me', settled: false, status: 'ok', source: 'statement', statement_id: '', tags: '', ref: '',
      created_at: '', updated_at: ''}, o));

    const end = new Date(todayIso + 'T00:00:00Z');
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const day = d.toISOString().slice(0, 10);
      if (rnd() < 0.8) add({date: day, amount: money(15, 160), pay: 'uob-tmrw', channel: '7-11', merchant: 'TMN 7-11 BANGKOK', category: 'seven', owner: rnd() < 0.2 ? 'partner' : 'me'});
      if (rnd() < 0.55) add({date: day, amount: money(35, 260), pay: 'uob-one', channel: 'Grab', merchant: pickOne(['Matcha Corner', 'Khao Man Gai Ari', 'Pizza Mania', 'Som Tum Hut']), note: 'Grab food', category: 'food', source: 'grab_email'});
      if (rnd() < 0.45) add({date: day, amount: money(40, 180), pay: 'uob-one', channel: 'Grab', merchant: pickOne(['Condo → Office', 'Office → Condo', 'Condo → Hospital']), note: 'Grab transport', category: 'transport', source: 'grab_email'});
      if (rnd() < 0.35) add({date: day, amount: money(15, 45), pay: 'uob-one', channel: 'BTS/MRT', merchant: pickOne(['BTS SIAM BANGKOK', 'MRT-BEM Bangkok']), category: 'transport'});
      if (rnd() < 0.45) {
        const pending = rnd() < 0.5;
        add({date: day, amount: money(59, 890), pay: 'uob-tmrw', channel: 'Shopee', merchant: pickOne(['SHOPEEPAY*SHOPEE Bangkok', 'SHOPEE *SHOPEE BANGKOK']),
          category: pending ? '' : pickOne(['beauty', 'home', 'pets', 'kpop', 'shopping']), status: pending ? 'pending' : 'ok'});
      }
      if (rnd() < 0.08) add({date: day, amount: money(400, 3800), pay: pickOne(['uob-tmrw', 'ttb', 'scb']), merchant: pickOne(['KAITEN SUSHI BANGKOK', 'HOTPOTMAN BANGKOK', 'Cafe Amazon']), category: 'food'});
      if (rnd() < 0.06) add({date: day, amount: money(60, 400), pay: 'cash', merchant: pickOne(['ตลาดนัด', 'ร้านข้าวแกง', 'ค่าวิน']), category: pickOne(['food', 'transport']), source: 'manual'});
      if (day.slice(8) === '01') add({date: day, amount: 5000, pay: 'transfer', merchant: 'แม่', note: 'ค่าใช้จ่ายครอบครัว', category: 'family', source: 'recurring'});
      if (day.slice(8) === '25') add({date: day, amount: 30000, type: 'income', pay: 'transfer', merchant: 'Company Co., Ltd.', category: 'salary', source: 'manual'});
      if (day.slice(8) === '23') add({date: day, amount: 399, pay: 'uob-tmrw', merchant: 'APPLE.COM/BILL CORK', category: 'subs'});
      if (day.slice(8) === '30') add({date: day, amount: money(120, 300), type: 'cashback', pay: 'uob-one', merchant: 'UOB One Cashback', category: 'cashback'});
    }
    const splitTx = tx.find((t) => t.channel === 'Shopee' && t.status === 'ok' && t.amount > 300);
    const splits = [];
    if (splitTx) {
      const a = Math.round(splitTx.amount * 0.6 * 100) / 100;
      splitTx.category = '';
      splits.push({id: 's1', tx_id: splitTx.id, category: 'pets', amount: a, item: 'ทรายแมว'});
      splits.push({id: 's2', tx_id: splitTx.id, category: 'kpop', amount: Math.round((splitTx.amount - a) * 100) / 100, item: 'อัลบั้ม'});
    }
    const inbox = [{id: 'i1', received_at: todayIso + 'T08:15:00', source: 'grab_email', subject: 'Your Grab E-Receipt', raw: 'GrabExpress …', status: 'open', note: 'หายอดเงินไม่เจอ'}];
    const recurring = [{id: 'rc1', name: 'แม่', amount: 5000, type: 'expense', pay: 'transfer', category: 'family', day: 1, active: true, last_run: '', note: 'ค่าใช้จ่ายครอบครัว'}];
    return {transactions: tx, splits, categories, rules, cards, statements: [], recurring, inbox,
      settings: {match_days: '3', partner_name: 'แฟน', cash_start: '1000'}, today: todayIso};
  }
  root.KMDemo = {makeDemo};
})(typeof window !== 'undefined' ? window : globalThis);
