// Reads output/leads_master.csv and regenerates the CATS/USERS/LEADS block in
// docs/outreach-cockpit.html between the DATA:START / DATA:END markers.
// Usage: node scripts/generate-cockpit.js
'use strict';
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'output', 'leads_master.csv');
const HTML_PATH = path.join(__dirname, '..', 'docs', 'outreach-cockpit.html');

const BASE_CATS = {
  Cat1: { name: 'Cat 1', full: 'AI Operators', color: '#0f8cff' },
  Cat2: { name: 'Cat 2', full: 'Crypto→AI', color: '#e5484d' },
  Cat3: { name: 'Cat 3', full: 'Contractors', color: '#8e4ec6' },
  Cat4: { name: 'Cat 4', full: 'Manufacturers', color: '#d98016' },
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

// RFC4180-ish CSV parser: honors quoted fields (with embedded commas/semicolons/
// newlines) and "" as an escaped quote. Deliberately not split(',').
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
      i++; continue;
    }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

function loadRows() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const table = parseCSV(raw);
  const header = table[0];
  return table.slice(1).map(cols => {
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

// Deterministic account-level owner assignment by category rule (ignores
// vertical_owner entirely). Same account => same owner across all its contacts.
// Accounts sorted by account_name before splitting by position — no randomness.
function assignAccountOwners(kept) {
  const accountCat = new Map();
  const accountOrder = [];
  for (const r of kept) {
    const acc = (r.account_name || '').trim();
    if (!acc || accountCat.has(acc)) continue;
    accountCat.set(acc, (r.company_category || '').trim());
    accountOrder.push(acc);
  }

  const core = accountOrder.filter(a => ['Cat1', 'Cat2'].includes(accountCat.get(a))).sort();
  const cat3 = accountOrder.filter(a => accountCat.get(a) === 'Cat3').sort();
  const cat4 = accountOrder.filter(a => accountCat.get(a) === 'Cat4').sort();
  const other = accountOrder.filter(a => !['Cat1', 'Cat2', 'Cat3', 'Cat4'].includes(accountCat.get(a)));

  const owner = new Map();
  core.forEach((acc, idx) => owner.set(acc, idx % 5 === 4 ? 'gaby' : 'gustavo'));
  cat3.forEach((acc, idx) => owner.set(acc, idx % 2 === 0 ? 'aldahir' : 'manu'));
  cat4.forEach(acc => owner.set(acc, 'aldahir'));
  other.forEach(acc => owner.set(acc, 'unassigned'));

  return { owner, buckets: { core, cat3, cat4, other } };
}

function build() {
  const rows = loadRows();
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
  const { owner: accountOwner, buckets } = assignAccountOwners(kept);

  let noContact = 0;
  const leads = kept.map(r => {
    const contact = (r.contact_name || '').trim();
    if (!contact) noContact++;
    const acc = (r.account_name || '').trim();
    const sigDate = (r.signal_date || '').trim();
    const type = sigDate ? signalType(r.signal_source) : 'none';
    return {
      co: r.account_name || '',
      cat: (r.company_category || '').trim(),
      contact,
      title: cleanTitle(r.contact_title),
      signal: {
        type,
        text: r.signal_detail || '',
        age: sigDate ? daysBetween(sigDate, today) : null,
        url: r.signal_url || '',
      },
      stage: 0,
      warm: null,
      user: accountOwner.get(acc) || 'unassigned',
    };
  });

  // Per-user leads/accounts tally for the run report.
  const perUser = {};
  users.forEach(u => { perUser[u.id] = { leads: 0, accounts: new Set() }; });
  leads.forEach(l => {
    if (!perUser[l.user]) perUser[l.user] = { leads: 0, accounts: new Set() };
    perUser[l.user].leads++;
    perUser[l.user].accounts.add(l.co);
  });
  const perUserReport = users.map(u => ({
    id: u.id,
    name: u.name,
    leads: perUser[u.id].leads,
    accounts: perUser[u.id].accounts.size,
  }));

  return {
    cats, users, leads, excludedCount, newCats, noContact,
    totalRows: rows.length, keptCount: kept.length,
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

function leadsToJS(leads) {
  const lines = leads.map(l => {
    const sig = `{type:${jsStringLiteral(l.signal.type)}, text:${jsStringLiteral(l.signal.text)}, age:${l.signal.age === null ? 'null' : l.signal.age}, url:${jsStringLiteral(l.signal.url)}}`;
    return `  {co:${jsStringLiteral(l.co)}, cat:${jsStringLiteral(l.cat)}, contact:${jsStringLiteral(l.contact)}, title:${jsStringLiteral(l.title)},\n   signal:${sig}, stage:${l.stage},\n   warm:null, user:${jsStringLiteral(l.user)}}`;
  });
  return `const LEADS = [\n${lines.join(',\n')}\n];`;
}

function main() {
  const { cats, users, leads, excludedCount, newCats, noContact, totalRows, keptCount, perUserReport, bucketSizes } = build();

  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const startMarker = '/* DATA:START — generado por scripts/generate-cockpit.js, no editar a mano */';
  const endMarker = '/* DATA:END */';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('DATA:START/DATA:END markers not found in ' + HTML_PATH);
  }

  const block = [startMarker, catsToJS(cats), usersToJS(users), leadsToJS(leads), endMarker].join('\n');
  const before = html.slice(0, startIdx);
  const after = html.slice(endIdx + endMarker.length);
  const newHtml = before + block + after;
  fs.writeFileSync(HTML_PATH, newHtml, 'utf8');

  console.log(JSON.stringify({
    totalRows,
    excludedCount,
    keptCount,
    noContact,
    bucketSizes,
    perUserReport,
    categoriesDetected: Object.keys(cats),
    newCategories: newCats,
  }, null, 2));
}

main();
