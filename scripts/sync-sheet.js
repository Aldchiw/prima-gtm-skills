// Overwrites the live "Prima Leads" Google Sheet (Sheet1) with the current
// contents of output/leads_master.csv. Clears the used range first so a
// refresh never leaves stale/duplicate trailing rows -- this is a full
// overwrite, never an append.
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

async function main() {
  const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const raw = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const rows = parseCSV(raw);
  console.log('Local CSV rows (incl header):', rows.length);

  const before = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A:A`,
  });
  const beforeCount = (before.data.values || []).length;
  console.log('Sheet rows before (col A, non-empty):', beforeCount);

  // Clear the full used grid range first so a shrink never leaves stale rows.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A1:Z1000`,
  });
  console.log('Cleared existing range.');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_TAB}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
  console.log('Wrote', rows.length, 'rows.');

  const after = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TAB}'!A:A`,
  });
  const afterCount = (after.data.values || []).length;
  console.log('Sheet rows after (col A, non-empty):', afterCount);
  console.log('Match local row count:', afterCount === rows.length);
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
