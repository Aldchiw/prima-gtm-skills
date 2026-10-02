// Reads the live Google Sheet (same source sync-sheet.js writes to) and
// regenerates the CATS/USERS/LEADS block in docs/outreach-cockpit.html
// between the DATA:START / DATA:END markers. Snapshot, not live -- the board
// only reflects the Sheet's state as of the last time this script ran.
// One LEADS entry per ACCOUNT (not per contact) — contacts live inside
// entry.contacts[], sorted ALTA-first.
// Usage: node scripts/generate-cockpit.js
'use strict';
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { SPREADSHEET_ID, SHEET_TAB, KEY_PATH } = require('./sync-sheet.js');

const HTML_PATH = path.join(__dirname, '..', 'docs', 'outreach-cockpit.html');

const BASE_CATS = {
  Cat1: { name: 'Cat 1', full: 'AI Operators', color: '#0f8cff' },
  Cat2: { name: 'Cat 2', full: 'Crypto→AI', color: '#e5484d' },
  Cat3: { name: 'Cat 3', full: 'Contractors', color: '#8e4ec6' },
  Cat4: { name: 'Cat 4', full: 'Manufacturers', color: '#d98016' },
  Cat5: { name: 'Cat 5', full: 'Campus Builders', color: '#d6409f' },
};
const DEFAULT_CAT_COLOR = '#9a9a9a';

// Fixed team roster (NOT derived from vertical_owner) — on-brand palette from
// DESIGN.md: coral (ledger-red family) + azul (link) + two muted category tones
// (cat-teal, cat-plum) + stale-gray for the unassigned bucket.
const FIXED_USERS = [
  { id: 'aldahir', name: 'Aldahir', color: '#DA5551' },
  { id: 'manu', name: 'Manuel Ibarra', color: '#2E6DA4' },
  { id: 'gustavo', name: 'Gustavo Rivas', color: '#3D7A6C' },
  { id: 'gaby', name: 'Gabriela Zacarias', color: '#7A5C8A' },
  { id: 'unassigned', name: 'Sin asignar', color: '#8B8B93' },
];

// Reads the whole used range of the Sheet and returns the same shape
// loadRows() used to build from the CSV: an array of row objects keyed by
// the header. A cell trimmed by the Sheets API (short row) or genuinely
// blank both come back as '' -- never undefined, never invented.
async function loadRows() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A1:ZZ10000`,
  });
  const values = res.data.values || [];
  if (values.length === 0) return [];
  const header = values[0];
  return values.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cols[idx] !== undefined ? cols[idx] : ''; });
    return obj;
  });
}

function isExcluded(v) {
  return ['yes', 'true'].includes((v || '').trim().toLowerCase());
}

function cleanTitle(t) {
  if (!t) return '';
  const cut = t.indexOf(' -- [');
  return cut === -1 ? t.trim() : t.slice(0, cut).trim();
}

function signalType(source) {
  const s = (source || '').trim().toLowerCase();
  if (!s) return 'none';
  if (s.includes('job')) return 'job';
  return 'news';
}

function daysBetween(dateStr, today) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  const ms = today.getTime() - d.getTime();
  return Math.round(ms / 86400000);
}

// ALTA/Principal first, SECUNDARIA/Secundario next, unknown non-empty after
// that, empty last. Source data mixes casing (ALTA vs Principal vs PRINCIPAL).
function tierRank(tier) {
  const s = (tier || '').trim().toUpperCase();
  if (!s) return 3;
  if (s === 'ALTA' || s === 'PRINCIPAL') return 0;
  if (s === 'SECUNDARIA' || s === 'SECUNDARIO') return 1;
  return 2;
}

// Groups kept rows by account_name, preserving first-seen (CSV) order.
function groupByAccount(kept) {
  const order = [];
  const data = new Map();
  for (const r of kept) {
    const acc = (r.account_name || '').trim();
    if (!acc) continue;
    if (!data.has(acc)) {
      data.set(acc, {
        category: (r.company_category || '').trim(),
        priority: (r.priority || '').trim(),
        signalSource: r.signal_source || '',
        signalDetail: r.signal_detail || '',
        signalUrl: r.signal_url || '',
        signalDate: (r.signal_date || '').trim(),
        rows: [],
      });
      order.push(acc);
    }
    data.get(acc).rows.push(r);
  }
  return { order, data };
}

// Deterministic account-level owner assignment by category rule (ignores
// vertical_owner entirely). Same account => same owner across all its contacts.
// Accounts sorted by account_name before splitting by position — no randomness.
function assignAccountOwners(order, data) {
  const catOf = acc => data.get(acc).category;
  const core = order.filter(a => ['Cat1', 'Cat2'].includes(catOf(a))).sort();
  const cat3 = order.filter(a => catOf(a) === 'Cat3').sort();
  const cat4 = order.filter(a => catOf(a) === 'Cat4').sort();
  const other = order.filter(a => !['Cat1', 'Cat2', 'Cat3', 'Cat4'].includes(catOf(a)));

  const owner = new Map();
  core.forEach((acc, idx) => owner.set(acc, idx % 5 === 4 ? 'gaby' : 'gustavo'));
  cat3.forEach((acc, idx) => owner.set(acc, idx % 2 === 0 ? 'aldahir' : 'manu'));
  cat4.forEach(acc => owner.set(acc, 'aldahir'));
  other.forEach(acc => owner.set(acc, 'unassigned'));

  return { owner, buckets: { core, cat3, cat4, other } };
}

async function build() {
  const rows = await loadRows();
  const today = new Date();

  let excludedCount = 0;
  const kept = [];
  for (const r of rows) {
    if (isExcluded(r.excluded)) { excludedCount++; continue; }
    kept.push(r);
  }

  const cats = JSON.parse(JSON.stringify(BASE_CATS));
  const newCats = [];
  for (const r of kept) {
    const cat = (r.company_category || '').trim();
    if (cat && !cats[cat]) {
      cats[cat] = { name: cat, full: cat, color: DEFAULT_CAT_COLOR };
      newCats.push(cat);
    }
  }

  const users = FIXED_USERS;
  const { order, data } = groupByAccount(kept);
  const { owner: accountOwner, buckets } = assignAccountOwners(order, data);

  let noContactAccounts = 0;
  const accounts = order.map(acc => {
    const d = data.get(acc);
    const contacts = d.rows
      .filter(r => (r.contact_name || '').trim())
      .map(r => ({
        name: r.contact_name.trim(),
        title: cleanTitle(r.contact_title),
        email: (r.contact_email || '').trim(),
        email_status: (r.email_status || '').trim(),
        linkedin: (r.linkedin_url || '').trim(),
        priority_tier: (r.priority_tier || '').trim(),
        team_status: (r.team_status || '').trim(),
        notes: (r.notes || '').trim(),
        stage: 0,
      }))
      .sort((a, b) => tierRank(a.priority_tier) - tierRank(b.priority_tier));
    if (!contacts.length) noContactAccounts++;

    const sigDate = d.signalDate;
    const type = sigDate ? signalType(d.signalSource) : 'none';
    return {
      co: acc,
      cat: d.category,
      priority: d.priority,
      signal: {
        type,
        text: d.signalDetail,
        age: sigDate ? daysBetween(sigDate, today) : null,
        url: d.signalUrl,
      },
      contacts,
      warm: null,
      user: accountOwner.get(acc) || 'unassigned',
    };
  });

  const perUser = {};
  users.forEach(u => { perUser[u.id] = { accounts: 0, contacts: 0 }; });
  accounts.forEach(a => {
    if (!perUser[a.user]) perUser[a.user] = { accounts: 0, contacts: 0 };
    perUser[a.user].accounts++;
    perUser[a.user].contacts += a.contacts.length;
  });
  const perUserReport = users.map(u => ({
    id: u.id,
    name: u.name,
    accounts: perUser[u.id].accounts,
    contacts: perUser[u.id].contacts,
  }));

  return {
    cats, users, accounts, excludedCount, newCats,
    noContactAccounts, totalRows: rows.length, keptRows: kept.length,
    accountCount: accounts.length,
    perUserReport,
    bucketSizes: { core: buckets.core.length, cat3: buckets.cat3.length, cat4: buckets.cat4.length, other: buckets.other.length },
  };
}

function jsStringLiteral(s) {
  return JSON.stringify(s == null ? '' : s);
}

function catsToJS(cats) {
  const lines = Object.keys(cats).map(k => {
    const c = cats[k];
    return `  ${k}:{name:${jsStringLiteral(c.name)}, full:${jsStringLiteral(c.full)}, color:${jsStringLiteral(c.color)}}`;
  });
  return `const CATS = {\n${lines.join(',\n')}\n};`;
}

function usersToJS(users) {
  const lines = users.map(u => `  {id:${jsStringLiteral(u.id)}, name:${jsStringLiteral(u.name)}, color:${jsStringLiteral(u.color)}}`);
  return `const USERS = [\n${lines.join(',\n')}\n];`;
}

function contactsToJS(contacts) {
  const items = contacts.map(c => `{name:${jsStringLiteral(c.name)}, title:${jsStringLiteral(c.title)}, email:${jsStringLiteral(c.email)}, email_status:${jsStringLiteral(c.email_status)}, linkedin:${jsStringLiteral(c.linkedin)}, priority_tier:${jsStringLiteral(c.priority_tier)}, team_status:${jsStringLiteral(c.team_status)}, notes:${jsStringLiteral(c.notes)}, stage:${c.stage}}`);
  return `[${items.join(', ')}]`;
}

function accountsToJS(accounts) {
  const lines = accounts.map(a => {
    const sig = `{type:${jsStringLiteral(a.signal.type)}, text:${jsStringLiteral(a.signal.text)}, age:${a.signal.age === null ? 'null' : a.signal.age}, url:${jsStringLiteral(a.signal.url)}}`;
    return `  {co:${jsStringLiteral(a.co)}, cat:${jsStringLiteral(a.cat)}, priority:${jsStringLiteral(a.priority)},\n   signal:${sig},\n   contacts:${contactsToJS(a.contacts)},\n   warm:null, user:${jsStringLiteral(a.user)}}`;
  });
  return `const LEADS = [\n${lines.join(',\n')}\n];`;
}

async function main() {
  const {
    cats, users, accounts, excludedCount, newCats, noContactAccounts,
    totalRows, keptRows, accountCount, perUserReport, bucketSizes,
  } = await build();

  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const startMarker = '/* DATA:START — generado por scripts/generate-cockpit.js, no editar a mano */';
  const endMarker = '/* DATA:END */';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('DATA:START/DATA:END markers not found in ' + HTML_PATH);
  }

  const block = [startMarker, catsToJS(cats), usersToJS(users), accountsToJS(accounts), endMarker].join('\n');
  const before = html.slice(0, startIdx);
  const after = html.slice(endIdx + endMarker.length);
  const newHtml = before + block + after;
  fs.writeFileSync(HTML_PATH, newHtml, 'utf8');

  console.log(JSON.stringify({
    totalRows,
    excludedCount,
    keptRows,
    accountCount,
    noContactAccounts,
    bucketSizes,
    perUserReport,
    categoriesDetected: Object.keys(cats),
    newCategories: newCats,
  }, null, 2));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
