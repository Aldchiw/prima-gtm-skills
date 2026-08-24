// Overwrites the live "Prima Leads" Google Sheet (Sheet1) with the current
// contents of output/leads_master.csv. Clears the used range first so a
// refresh never leaves stale/duplicate trailing rows -- this is a full
// overwrite, never an append.
// Team-owned columns (TEAM_COLUMNS below) are appended after the CSV's own
// columns and are never sourced from the CSV: before clearing, the script
// reads the Sheet's current values and carries those cells forward, matched
// by account_name + "|" + contact_name. A key with no match (new row, or
// first run before the columns exist) gets blank cells instead of an error.
// Requires: google-key.json (service account, gitignored) in the repo root,
// and the `googleapis` package installed (npm install googleapis).
// Usage: node scripts/sync-sheet.js
'use strict';
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SPREADSHEET_ID = '1lRWfcD4wIwvmTV8nuIpbpm2J9wCI8NQUF8RrF63v69g';
const SHEET_TAB = 'Sheet1';
const CSV_PATH = path.join(__dirname, '..', 'output', 'leads_master.csv');
const KEY_PATH = path.join(__dirname, '..', 'google-key.json');
const TEAM_COLUMNS = ['team_status', 'notes'];

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

// Reads the Sheet's own current rows (before we clear anything) and returns
// a Map from "account_name|contact_name" to that row's TEAM_COLUMNS values.
// Returns an empty map for an empty sheet, or if the sheet's header doesn't
// have account_name/contact_name yet (first run) -- never throws, per the
// "create the columns empty, no error" requirement.
function buildTeamDataMap(sheetRows) {
  const map = new Map();
  if (!sheetRows || sheetRows.length === 0) return map;
  const header = sheetRows[0];
  const accIdx = header.indexOf('account_name');
  const contIdx = header.indexOf('contact_name');
  if (accIdx === -1 || contIdx === -1) {
    console.warn('Existing Sheet header has no account_name/contact_name -- treating as first run, nothing preserved.');
    return map;
  }
  const teamIdxs = TEAM_COLUMNS.map(c => header.indexOf(c));
  for (let i = 1; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    const key = (row[accIdx] || '') + '|' + (row[contIdx] || '');
    map.set(key, teamIdxs.map(idx => (idx === -1 ? '' : (row[idx] || ''))));
  }
  return map;
}

async function main() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const csvRows = parseCSV(raw);
  console.log('Local CSV rows (incl header):', csvRows.length);
  if (csvRows.length === 0) throw new Error('CSV vacío -- nada que sincronizar.');

  const csvHeader = csvRows[0];
  const accIdx = csvHeader.indexOf('account_name');
  const contIdx = csvHeader.indexOf('contact_name');
  if (accIdx === -1 || contIdx === -1) {
    throw new Error('CSV header sin account_name/contact_name -- no se pueden casar las columnas de equipo.');
  }

  // Read the Sheet's CURRENT state before clearing, so team_status/notes
  // (edited directly in the Sheet by the team) survive the overwrite.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A1:ZZ10000`,
  });
  const existingRows = existing.data.values || [];
  const teamDataByKey = buildTeamDataMap(existingRows);
  console.log('Sheet rows before:', existingRows.length);
  console.log('Team-column rows carried forward:', teamDataByKey.size);

  const newHeader = [...csvHeader, ...TEAM_COLUMNS];
  const blankTeamValues = TEAM_COLUMNS.map(() => '');
  const newRows = [newHeader];
  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rowKey = (row[accIdx] || '') + '|' + (row[contIdx] || '');
    const preserved = teamDataByKey.get(rowKey) || blankTeamValues;
    newRows.push([...row, ...preserved]);
  }

  // Clear the full used grid range first so a shrink never leaves stale rows.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A1:ZZ10000`,
  });
  console.log('Cleared existing range.');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_TAB}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: newRows },
  });
  console.log('Wrote', newRows.length, 'rows.');

  const after = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A:A`,
  });
  const afterCount = (after.data.values || []).length;
  console.log('Sheet rows after (col A, non-empty):', afterCount);
  console.log('Match local row count:', afterCount === newRows.length);
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
