// Copies the pure logic from apps-script/Code.gs into docs/core.js so the app's demo mode
// behaves exactly like the real backend. Run: node tests/build-core.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8');
const a = src.indexOf('// Transaction types.');
const b = src.indexOf('// ───────────────────────── Sheet access');
if (a < 0 || b < 0) throw new Error('markers not found');
const body = src.slice(a, b);
const out = `/* AUTO-GENERATED from apps-script/Code.gs by tests/build-core.js — do not edit by hand. */
(function (root) {
${body}
  root.KMCore = {TYPE_DIR: TYPE_DIR, SEED_CATEGORIES: SEED_CATEGORIES, SEED_RULES: SEED_RULES, SEED_CARDS: SEED_CARDS,
    cleanMerchant: cleanMerchant, applyRules: applyRules, daysBetween: daysBetween, KIND_TO_TYPE: KIND_TO_TYPE,
    matchStatement: matchStatement, txFromRow: txFromRow, parseGrabEmail: parseGrabEmail, htmlToText: htmlToText, checkSplits: checkSplits};
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(__dirname + '/../docs/core.js', out);
console.log('docs/core.js written', out.length, 'bytes');
