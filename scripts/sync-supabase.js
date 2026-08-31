// Syncs output/leads_master.csv -> Supabase tables "accounts" and "contacts".
//
// ============================== REGLA DE ORO ==============================
// This sync engine owns a fixed set of columns (ENGINE-OWNED, listed below)
// and is FORBIDDEN from ever writing to a fixed set of PROTECTED columns,
// which belong to the team/cockpit, not the CSV pipeline:
//   - contacts.stage         (cockpit-owned pipeline stage)
//   - contacts.last_touch_at (cockpit-owned)
//   - contacts.team_status   (cockpit-owned)
//   - contacts.notes         (cockpit-owned)
//   - accounts.assigned_user_id (team ownership assignment)
//   - the entire "touches" table (never touched by this script at all)
//   - any *.id uuid (primary keys are never engine-set on update)
// The ONE exception: contacts.stage may be set on INSERT of a brand-new
// contact row (from the CSV value, or "Not Contacted" if blank) -- because
// there is no existing cockpit-owned value to clobber yet. Once a contact
// row exists, stage is never touched by this script again, no matter what
// the CSV says on later runs.
//
// This file enforces the rule in code, not just in comments: buildAccountUpdatePayload()
// and buildContactUpdatePayload() only ever read from the ENGINE-OWNED column
// lists below, and assertNoProtectedColumns() throws if that ever regresses.
// ============================================================================
//
// DESIGN NOTE on the "no contact_name" guard (see spec's GUARD bullet):
// A CSV row with an empty contact_name produces a match key ending in "|",
// which is NOT safe to match against any real contact -- doing so risks
// silently colliding two unrelated blank-contact rows onto one contact.
// So this script skips CONTACT processing for such rows (logged under
// skipped_no_contact_name) and never inserts/updates a contacts row for them.
// It still processes the ACCOUNT side of that row normally: many accounts
// in leads_master.csv (e.g. excluded accounts, or accounts with no verified
// contact yet) have no contact_name at all, and account-level fields
// (company_category, scope_tier, signals, etc.) don't depend on having a
// contact. Skipping the account too would mean those accounts never sync.
// Flagging this interpretation explicitly since the spec's "sáltala" could
// also be read as "skip the whole row" -- happy to change if that's wrong.
//
// Usage:
//   node scripts/sync-supabase.js            (DRY RUN -- default, no writes)
//   node scripts/sync-supabase.js --apply    (performs the real writes)
//
// Requires: .env in repo root with SUPABASE_URL and SUPABASE_SERVICE_ROLE,
// and the @supabase/supabase-js package installed (npm install @supabase/supabase-js).
// The service_role key bypasses RLS -- required so the engine can write
// across every account/contact regardless of who's assigned to it.

'use strict';
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'output', 'leads_master.csv');
const ENV_PATH = path.join(__dirname, '..', '.env');
const APPLY = process.argv.includes('--apply');
const SELECT_CHUNK_SIZE = 200; // keep .in() filter lists well under URL length limits

// Columns this engine is allowed to write. Anything not listed here (and
// anything in the protected sets below) is never included in a payload.
const ACCOUNT_ENGINE_COLUMNS = [
  'domain', 'company_category', 'sub_segment', 'priority', 'vertical_owner',
  'excluded', 'exclusion_reason', 'scope_tier', 'needs_manual_scope_confirmation',
  'signal_source', 'signal_detail', 'signal_url', 'signal_date',
];
const CONTACT_ENGINE_COLUMNS = [
  'contact_title', 'priority_tier', 'linkedin_url', 'contact_email',
  'email_status', 'contact_count', 'source_files',
];

// Boolean-typed columns in accounts. Postgres rejects '' for a boolean
// column (the --apply failure this fix addresses), so these need explicit
// coercion instead of passing the raw CSV string through like the text columns.
const ACCOUNT_BOOLEAN_COLUMNS = ['excluded', 'needs_manual_scope_confirmation'];

// Never written by this script, under any circumstance (see REGLA DE ORO above).
const PROTECTED_ACCOUNT_COLUMNS = ['id', 'assigned_user_id', 'created_at'];
const PROTECTED_CONTACT_COLUMNS = ['id', 'account_id', 'stage', 'last_touch_at', 'team_status', 'notes', 'created_at'];

// --------------------------- CSV parsing (reused) ---------------------------
// Copied verbatim from scripts/sync-sheet.js so both scripts stay in sync on
// quote/BOM handling without a shared-module refactor neither script needs.
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

// ------------------------------ .env parsing ---------------------------------
// Deliberately hand-rolled (no dotenv dependency) per spec. Only reads
// SUPABASE_URL / SUPABASE_SERVICE_ROLE -- ignores every other line/comment.
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

// Splits CSV rows into { header, records } where each record is an object
// keyed by header name. Rows shorter/longer than the header are padded/
// truncated defensively (a boundary: CSV is external, hand-edited data).
function toRecords(csvRows) {
  const header = csvRows[0];
  const records = [];
  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rec = {};
    header.forEach((col, idx) => { rec[col] = (row[idx] !== undefined ? row[idx] : '').trim(); });
    records.push(rec);
  }
  return { header, records };
}

function toContactCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// '' or anything unrecognized -> false (never '' -- Postgres boolean columns
// reject empty string, and false is the safer default for an exclusion/
// confirmation flag than silently nulling it).
function toBoolean(value) {
  const v = (value || '').trim().toLowerCase();
  return ['true', 't', '1', 'yes', 'y'].includes(v);
}

function buildAccountPayload(rec) {
  const payload = {};
  for (const col of ACCOUNT_ENGINE_COLUMNS) {
    const raw = rec[col] !== undefined ? rec[col] : '';
    payload[col] = ACCOUNT_BOOLEAN_COLUMNS.includes(col) ? toBoolean(raw) : raw;
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}

function buildContactPayload(rec) {
  const payload = {};
  for (const col of CONTACT_ENGINE_COLUMNS) {
    payload[col] = col === 'contact_count' ? toContactCount(rec[col]) : (rec[col] !== undefined ? rec[col] : '');
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}

// Hard runtime guard for the REGLA DE ORO: throws if a payload we're about
// to send anywhere near an update ever contains a protected key. This is
// the "confirma explícitamente" requirement enforced in code, not just print.
function assertNoProtectedColumns(payload, protectedCols, context) {
  const hit = Object.keys(payload).filter(k => protectedCols.includes(k));
  if (hit.length > 0) {
    throw new Error(`REGLA DE ORO violada en ${context}: columnas protegidas en payload: ${hit.join(', ')}`);
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const env = loadEnv();
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const csvRows = parseCSV(raw);
  if (csvRows.length === 0) throw new Error('CSV vacío -- nada que sincronizar.');
  const { header, records } = toRecords(csvRows);

  const requiredCols = ['account_name', 'contact_name', ...ACCOUNT_ENGINE_COLUMNS, ...CONTACT_ENGINE_COLUMNS, 'stage'];
  const missingCols = requiredCols.filter(c => !header.includes(c));
  if (missingCols.length > 0) {
    throw new Error(`CSV header le faltan columnas esperadas: ${missingCols.join(', ')}`);
  }

  // ---- Split rows: valid vs skipped (missing account_name / contact_name) ----
  const skippedNoAccountName = [];
  const skippedNoContactName = [];
  const validRows = [];
  records.forEach((rec, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
    if (!rec.account_name) {
      skippedNoAccountName.push({ row: rowNum, contact_name: rec.contact_name || '' });
      return;
    }
    if (!rec.contact_name) {
      skippedNoContactName.push({ row: rowNum, account_name: rec.account_name });
      // Still keep it for account-side processing (see DESIGN NOTE above).
      validRows.push({ rec, hasContact: false });
      return;
    }
    validRows.push({ rec, hasContact: true });
  });

  // ---------------------------- Group accounts ----------------------------
  // Last row for a given account_name wins for engine-owned account fields
  // (later CSV rows reflect more recent scans/scoring for the same account).
  const accountsByName = new Map();
  for (const { rec } of validRows) {
    accountsByName.set(rec.account_name, buildAccountPayload(rec));
  }
  const accountNames = [...accountsByName.keys()];

  // ------------------------- Fetch existing accounts -------------------------
  const existingAccountIdByName = new Map();
  for (const namesChunk of chunk(accountNames, SELECT_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, account_name')
      .in('account_name', namesChunk);
    if (error) throw new Error(`Error leyendo accounts existentes: ${error.message}`);
    for (const row of data || []) existingAccountIdByName.set(row.account_name, row.id);
  }

  const accountsToInsert = []; // [{ account_name, ...engineFields }]
  const accountsToUpdate = []; // [{ id, account_name, payload }]
  for (const [account_name, payload] of accountsByName) {
    assertNoProtectedColumns(payload, PROTECTED_ACCOUNT_COLUMNS, `accounts payload for "${account_name}"`);
    const existingId = existingAccountIdByName.get(account_name);
    if (existingId) {
      accountsToUpdate.push({ id: existingId, account_name, payload });
    } else {
      accountsToInsert.push({ account_name, ...payload });
    }
  }

  // ----------------------------- Apply accounts (if --apply) -----------------------------
  const newAccountIdByName = new Map();
  if (APPLY) {
    if (accountsToInsert.length > 0) {
      const { data, error } = await supabase.from('accounts').insert(accountsToInsert).select('id, account_name');
      if (error) throw new Error(`Error insertando accounts: ${error.message}`);
      for (const row of data || []) newAccountIdByName.set(row.account_name, row.id);
    }
    for (const { id, payload, account_name } of accountsToUpdate) {
      const { error } = await supabase.from('accounts').update(payload).eq('id', id);
      if (error) throw new Error(`Error actualizando account "${account_name}": ${error.message}`);
    }
  }

  // account_id resolver used by the contacts pass below, valid in both modes:
  // existing accounts already have a real id; brand-new accounts get a real
  // id only in --apply mode (from the insert above) -- in dry-run they get a
  // placeholder marker since nothing was actually written yet.
  function resolveAccountId(account_name) {
    if (existingAccountIdByName.has(account_name)) return existingAccountIdByName.get(account_name);
    if (newAccountIdByName.has(account_name)) return newAccountIdByName.get(account_name);
    return APPLY ? null : '(DRY_RUN_NEW_ACCOUNT)';
  }

  // ------------------------- Fetch existing contacts -------------------------
  // Only need to check contacts for accounts that already existed going in --
  // contacts under a brand-new account can never already exist.
  const existingAccountIds = [...existingAccountIdByName.values()];
  const existingContactIdByKey = new Map(); // `${account_id}|${contact_name}` -> id
  for (const idsChunk of chunk(existingAccountIds, SELECT_CHUNK_SIZE)) {
    if (idsChunk.length === 0) continue;
    const { data, error } = await supabase
      .from('contacts')
      .select('id, account_id, contact_name')
      .in('account_id', idsChunk);
    if (error) throw new Error(`Error leyendo contacts existentes: ${error.message}`);
    for (const row of data || []) existingContactIdByKey.set(`${row.account_id}|${row.contact_name}`, row.id);
  }

  const contactsToInsert = []; // [{ account_id, contact_name, stage, ...engineFields }]
  const contactsToUpdate = []; // [{ id, key, payload }]
  for (const { rec, hasContact } of validRows) {
    if (!hasContact) continue;
    const accountId = resolveAccountId(rec.account_name);
    const payload = buildContactPayload(rec);
    assertNoProtectedColumns(payload, PROTECTED_CONTACT_COLUMNS, `contacts payload for "${rec.account_name}|${rec.contact_name}"`);

    const isNewAccount = accountId === '(DRY_RUN_NEW_ACCOUNT)' || (APPLY && !existingAccountIdByName.has(rec.account_name));
    if (isNewAccount) {
      contactsToInsert.push({
        account_id: accountId,
        contact_name: rec.contact_name,
        stage: rec.stage || 'Not Contacted',
        ...payload,
      });
      continue;
    }

    const key = `${accountId}|${rec.contact_name}`;
    const existingContactId = existingContactIdByKey.get(key);
    if (existingContactId) {
      contactsToUpdate.push({ id: existingContactId, key, payload });
    } else {
      contactsToInsert.push({
        account_id: accountId,
        contact_name: rec.contact_name,
        stage: rec.stage || 'Not Contacted',
        ...payload,
      });
    }
  }

  // ----------------------------- Apply contacts (if --apply) -----------------------------
  if (APPLY) {
    if (contactsToInsert.length > 0) {
      const { error } = await supabase.from('contacts').insert(contactsToInsert);
      if (error) throw new Error(`Error insertando contacts: ${error.message}`);
    }
    for (const { id, payload, key } of contactsToUpdate) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', id);
      if (error) throw new Error(`Error actualizando contact "${key}": ${error.message}`);
    }
  }

  // --------------------------------- Report ---------------------------------
  console.log(APPLY ? '=== MODO APPLY (writes reales ejecutados) ===' : '=== MODO DRY-RUN (nada escrito) ===');
  console.log('CSV rows (sin header):', records.length);
  console.log('');
  console.log('Accounts a insertar:', accountsToInsert.length);
  console.log('Accounts a actualizar:', accountsToUpdate.length);
  console.log('Contacts a insertar:', contactsToInsert.length);
  console.log('Contacts a actualizar:', contactsToUpdate.length);
  console.log('');
  console.log('Filas saltadas por account_name vacío:', skippedNoAccountName.length);
  if (skippedNoAccountName.length > 0) console.log(JSON.stringify(skippedNoAccountName, null, 2));
  console.log('Filas saltadas (solo lado contacts) por contact_name vacío:', skippedNoContactName.length);
  if (skippedNoContactName.length > 0) console.log(JSON.stringify(skippedNoContactName, null, 2));
  console.log('');
  console.log('Columnas protegidas -- NUNCA en ningún payload de update de este run:');
  console.log('  accounts:', PROTECTED_ACCOUNT_COLUMNS.join(', '));
  console.log('  contacts:', PROTECTED_CONTACT_COLUMNS.join(', '));
  console.log('CONFIRMADO por assertNoProtectedColumns() en cada payload construido arriba -- si alguna hubiera aparecido, el script ya habría lanzado un error antes de llegar aquí.');
  if (!APPLY) {
    console.log('');
    console.log('Este fue un DRY RUN. Nada se escribió en Supabase. Corre con --apply para ejecutar los writes de verdad.');
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => {
    // Never include env values in error output -- e.message from supabase-js
    // errors doesn't carry the service_role key, only request/response info.
    console.error('ERROR:', e.message);
    process.exit(1);
  });
}

module.exports = { parseCSV, loadEnv, ACCOUNT_ENGINE_COLUMNS, CONTACT_ENGINE_COLUMNS, PROTECTED_ACCOUNT_COLUMNS, PROTECTED_CONTACT_COLUMNS };
