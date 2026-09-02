// Writes/updates an "assigned_owner" column DIRECTLY on output/leads_master.csv,
// sourced from Supabase accounts.assigned_user_id resolved to a clean human
// name via users.email. Part of the sustained batch flow: engine generates
// leads_master.csv -> this script stamps/refreshes assigned_owner on it ->
// scripts/sync-sheet.js uploads it. Every one of the CSV's rows is carried
// through, in the same order; only the assigned_owner column's values change.
//
// IDEMPOTENT: safe to run on every batch, repeatedly. If leads_master.csv
// doesn't have an "assigned_owner" column yet, it's appended at the end
// (first run). If it already does (every run after that), this OVERWRITES
// that column's values in place, at the same position -- it never appends a
// second assigned_owner column. Re-running with unchanged Supabase data
// reproduces the exact same file.
//
// SAFETY NET: since this now writes to the real leads_master.csv (no longer
// a separate preview file), every run first copies the CURRENT
// leads_master.csv to output/leads_master.backup-owner.csv (overwriting
// whatever backup was there before -- always "state just before this run").
// If a run ever produces something wrong, that backup is the one-command
// revert: copy it back over leads_master.csv.
//
// parseCSV/loadEnv reused verbatim from scripts/sync-supabase.js.
//
// Usage:
//   node scripts/add-owner-to-csv.js
// (No --apply flag -- there's no dry-run mode. The backup above is the
// safety net instead. Never writes to Supabase.)

'use strict';
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'output', 'leads_master.csv');
const OUT_PATH = CSV_PATH; // writes back to the same file -- see safety-net comment above
const BACKUP_PATH = path.join(__dirname, '..', 'output', 'leads_master.backup-owner.csv');
const ENV_PATH = path.join(__dirname, '..', '.env');

// --------------------------- CSV parsing (reused verbatim) ---------------------------
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

// ------------------------------ .env parsing (reused verbatim) ---------------------------------
function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error('.env no encontrado en la raíz del repo -- crea SUPABASE_URL y SUPABASE_SERVICE_ROLE ahí primero.');
  }
  const raw = fs.readFileSync(ENV_PATH, 'utf8').replace(/^﻿/, '');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  if (!env.SUPABASE_URL) throw new Error('.env sin SUPABASE_URL.');
  if (!env.SUPABASE_SERVICE_ROLE) throw new Error('.env sin SUPABASE_SERVICE_ROLE.');
  // Never log env.SUPABASE_SERVICE_ROLE -- not even in errors below.
  return env;
}

// Fixed, explicit email -> clean-name dictionary. Anything not listed here
// (a different team email, or assigned_user_id pointing at a user row that
// doesn't resolve) maps to "" -- never guessed from the email's local part
// or any other heuristic.
const OWNER_NAME_BY_EMAIL = {
  'aldahir.chiw@prima.ai': 'Aldahir',
  'manuel.ibarra@prima.ai': 'Manuel Ibarra',
  'gustavo.rivas@prima.ai': 'Gustavo Rivas',
  'gaby@prima.ai': 'Gaby',
};

// leads_master.csv's own header is fully-quoted ("account_name","domain",...)
// -- match that style exactly (always quote, double-up internal quotes)
// rather than the conditional-quote style used elsewhere in this repo's
// scripts, per spec's explicit "mismo estilo de escritura que produce el
// engine" requirement.
function quoteAlways(value) {
  const s = value == null ? '' : String(value);
  return '"' + s.replace(/"/g, '""') + '"';
}

async function main() {
  const env = loadEnv();
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // ---------------------------- Supabase: accounts + users ----------------------------
  // No source filter: some engine accounts (Eos, Peak Energy, Heron Power,
  // Bloom Energy, Amperesand, FuelCell Energy, Form Energy, Exowatt,
  // Mitsubishi Electric Power Products, Hitachi Energy, DG Matrix, Redwood
  // Materials) got MERGED into value_chain_map -- their source column now
  // reads "value_chain_map" even though they're the same engine account with
  // a real assigned_user_id. Filtering to source='engine' here would silently
  // drop those 12 accounts' owner. Read every account regardless of source;
  // leads_master.csv only has engine's own account_name values anyway, so
  // this can't pull in an unrelated value_chain_map-only account by mistake.
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('account_name, assigned_user_id');
  if (accErr) throw new Error(`Error leyendo accounts: ${accErr.message}`);

  const { data: users, error: usersErr } = await supabase.from('users').select('id, email');
  if (usersErr) throw new Error(`Error leyendo users: ${usersErr.message}`);

  const ownerNameByUserId = new Map();
  for (const u of users || []) {
    const email = (u.email || '').trim().toLowerCase();
    ownerNameByUserId.set(u.id, OWNER_NAME_BY_EMAIL[email] || '');
  }

  const ownerNameByAccountName = new Map();
  for (const a of accounts || []) {
    if (!a.account_name) continue;
    const ownerName = a.assigned_user_id ? (ownerNameByUserId.get(a.assigned_user_id) || '') : '';
    ownerNameByAccountName.set(a.account_name, ownerName);
  }

  // ---------------------------- Read leads_master.csv ----------------------------
  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const csvRows = parseCSV(raw);
  if (csvRows.length === 0) throw new Error('leads_master.csv vacío -- nada que hacer.');
  const header = csvRows[0];
  const accIdx = header.indexOf('account_name');
  if (accIdx === -1) throw new Error('leads_master.csv no tiene columna account_name.');

  // Idempotent header handling: if assigned_owner already exists (every run
  // after the first), keep it at its existing position and overwrite its
  // values -- never append a second one. Only a brand-new run (no column
  // yet) appends it at the end.
  const ownerIdx = header.indexOf('assigned_owner');
  const isUpdate = ownerIdx !== -1;
  const newHeader = isUpdate ? header.slice() : [...header, 'assigned_owner'];
  const targetIdx = isUpdate ? ownerIdx : newHeader.length - 1;

  // ---------------------------- SAFETY NET: backup before writing ----------------------------
  // Plain file copy of whatever's on disk right now -- byte-for-byte, not a
  // re-serialization -- so the backup is exactly "leads_master.csv the
  // instant before this run touched it," overwriting last run's backup.
  fs.copyFileSync(CSV_PATH, BACKUP_PATH);

  // ---------------------------- Build the updated rows ----------------------------
  const outRows = [newHeader];
  let withOwner = 0;
  let withoutOwner = 0;
  const byOwner = {};
  const notFoundAccounts = new Set();

  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    const accountName = (row[accIdx] || '').trim();
    const hasMatch = ownerNameByAccountName.has(accountName);
    const ownerName = hasMatch ? ownerNameByAccountName.get(accountName) : '';
    if (!hasMatch && accountName) notFoundAccounts.add(accountName);

    if (ownerName) { withOwner++; byOwner[ownerName] = (byOwner[ownerName] || 0) + 1; }
    else { withoutOwner++; byOwner['(vacío)'] = (byOwner['(vacío)'] || 0) + 1; }

    // Rebuild the row at newHeader's width regardless of update-vs-append --
    // copies every existing value (a stale old assigned_owner value included,
    // on an update run) and then stamps the freshly computed owner at
    // targetIdx, overwriting whatever was there.
    const out = [];
    for (let c = 0; c < newHeader.length; c++) out.push(row[c] !== undefined ? row[c] : '');
    out[targetIdx] = ownerName;
    outRows.push(out);
  }

  // ---------------------------- Write leads_master.csv ----------------------------
  const lines = outRows.map(r => r.map(quoteAlways).join(','));
  fs.writeFileSync(OUT_PATH, lines.join('\r\n') + '\r\n', 'utf8');

  // --------------------------------- Report ---------------------------------
  console.log(`=== add-owner-to-csv.js -- ${isUpdate ? 'UPDATE' : 'FIRST RUN (columna nueva)'} ===`);
  console.log('Backup del estado anterior:', BACKUP_PATH);
  console.log('Filas leídas de leads_master.csv (sin header):', csvRows.length - 1);
  console.log('Filas escritas de vuelta a', OUT_PATH, ':', outRows.length - 1);
  console.log('');
  console.log('Con assigned_owner lleno:', withOwner);
  console.log('Con assigned_owner vacío:', withoutOwner);
  console.log('');
  console.log('Conteo por dueño:');
  for (const [name, count] of Object.entries(byOwner).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count} | ${name}`);
  }
  console.log('');
  console.log('account_name en el CSV que NO se encontraron en accounts:', notFoundAccounts.size);
  if (notFoundAccounts.size > 0 && notFoundAccounts.size <= 30) {
    console.log(JSON.stringify([...notFoundAccounts]));
  } else if (notFoundAccounts.size > 30) {
    console.log('(lista larga, omitida del log -- ' + notFoundAccounts.size + ' cuentas)');
  }
  console.log('');
  console.log('leads_master.csv actualizado en su lugar. Si algo salió mal, revierte con:');
  console.log(`  copy "${BACKUP_PATH}" "${CSV_PATH}"`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => {
    // Never include env values in error output.
    console.error('ERROR:', e.message);
    process.exit(1);
  });
}

module.exports = { parseCSV, loadEnv, OWNER_NAME_BY_EMAIL, quoteAlways };
