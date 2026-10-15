import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5";

const SHEET_ID = "1rH-KprLuxAZydwqyRX4lU_lLKX09154F9Nyj6VDG8is";
const TARGET_GID = 1226985717;
const PRIMA_LEADS_SHEET_ID = "1lRWfcD4wIwvmTV8nuIpbpm2J9wCI8NQUF8RrF63v69g";

function buildPem() {
  let raw = Deno.env.get("GOOGLE_SA_PRIVATE_KEY") ?? "";
  raw = raw.replace(/\\n/g, "\n").trim();
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1).replace(/\\n/g, "\n");
  const body = raw
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const chunked = (body.match(/.{1,64}/g) || []).join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${chunked}\n-----END PRIVATE KEY-----\n`;
}

async function getGoogleToken(scope = "https://www.googleapis.com/auth/spreadsheets") {
  const email = Deno.env.get("GOOGLE_SA_EMAIL")!;
  const key = await importPKCS8(buildPem(), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(email).setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("Google token: " + JSON.stringify(j));
  return j.access_token as string;
}

async function readSheet(token: string) {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets(properties(sheetId,title))`,
    { headers: { Authorization: `Bearer ${token}` } });
  const meta = await metaRes.json();
  const sheet = (meta.sheets || []).find((s: any) => s.properties?.sheetId === TARGET_GID);
  if (!sheet) throw new Error("No se encontro el tab gid " + TARGET_GID);
  const title = sheet.properties.title as string;
  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}`,
    { headers: { Authorization: `Bearer ${token}` } });
  const val = await valRes.json();
  return { values: (val.values || []) as string[][], sheetTitle: title };
}

async function readPrimaLeads(token: string): Promise<string[][]> {
  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${PRIMA_LEADS_SHEET_ID}/values/Sheet1`,
    { headers: { Authorization: `Bearer ${token}` } });
  const val = await valRes.json();
  return (val.values || []) as string[][];
}

function parsePrimaLeads(values: string[][]) {
  if (values.length < 2) return { accounts: [], contacts: [] };
  const h = values[0].map((x) => x.trim());
  const iName     = h.indexOf("account_name");
  const iDomain   = h.indexOf("domain");
  const iCat      = h.indexOf("company_category");
  const iPrio     = h.indexOf("priority");
  const iSigD     = h.indexOf("signal_detail");
  const iSigU     = h.indexOf("signal_url");
  const iSigDate  = h.indexOf("signal_date");
  const iCName    = h.indexOf("contact_name");
  const iCTitle   = h.indexOf("contact_title");
  const iPTier    = h.indexOf("priority_tier");
  const iLinked   = h.indexOf("linkedin_url");
  const iEmail    = h.indexOf("contact_email");
  const iEStatus  = h.indexOf("email_status");
  const iStage    = h.indexOf("stage");
  const iTStatus  = h.indexOf("team_status");
  const iNotes    = h.indexOf("notes");
  const iExcluded = h.indexOf("excluded");

  const accountMap: Record<string, any> = {};
  const contactRows: any[] = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = (row[iName] || "").trim();
    if (!name) continue;

    const excluded = iExcluded >= 0 ? (row[iExcluded] || "").trim().toLowerCase() : "";
    if (excluded === "yes" || excluded === "true" || excluded === "sí") continue;

    if (!accountMap[name]) {
      accountMap[name] = {
        account_name:     name,
        domain:           iDomain  >= 0 ? (row[iDomain]  || "").trim() || null : null,
        company_category: iCat     >= 0 ? (row[iCat]     || "").trim() || null : null,
        priority:         iPrio    >= 0 ? (row[iPrio]     || "").trim() || null : null,
        signal_detail:    iSigD    >= 0 ? (row[iSigD]    || "").trim() || null : null,
        signal_url:       iSigU    >= 0 ? (row[iSigU]    || "").trim() || null : null,
        signal_date:      iSigDate >= 0 ? (row[iSigDate] || "").trim().slice(0, 10) || null : null,
      };
    }

    const email = iEmail >= 0 ? (row[iEmail] || "").trim().toLowerCase() : "";
    const contactName = iCName >= 0 ? (row[iCName] || "").trim() : "";
    if (!contactName && !email) continue;

    contactRows.push({
      account_name:  name,
      contact_name:  contactName || null,
      contact_title: iCTitle  >= 0 ? (row[iCTitle]  || "").trim() || null : null,
      contact_email: email || null,
      email_status:  iEStatus >= 0 ? (row[iEStatus] || "").trim() || null : null,
      linkedin_url:  iLinked  >= 0 ? (row[iLinked]  || "").trim() || null : null,
      priority_tier: iPTier   >= 0 ? (row[iPTier]   || "").trim() || null : null,
      stage:         "Not Contacted",
      team_status:   iTStatus >= 0 ? (row[iTStatus] || "").trim() || null : null,
      notes:         iNotes   >= 0 ? (row[iNotes]   || "").trim() || null : null,
    });
  }

  return { accounts: Object.values(accountMap), contacts: contactRows };
}

async function syncPrimaLeads(supabase: any, token: string) {
  const values = await readPrimaLeads(token);
  const { accounts, contacts } = parsePrimaLeads(values);

  // Fetch existing accounts and contacts to avoid duplicate inserts
  const { data: existingAccounts } = await supabase
    .from("accounts").select("id, account_name");
  const nameToId: Record<string, string> = {};
  const existingNames = new Set<string>();
  for (const a of (existingAccounts || [])) {
    nameToId[a.account_name] = a.id;
    existingNames.add(a.account_name);
  }

  // Insert only new accounts
  const newAccounts = accounts.filter((a) => !existingNames.has(a.account_name));
  let accountsInserted = 0;
  if (newAccounts.length) {
    const { error } = await supabase.from("accounts").insert(newAccounts);
    if (error) throw new Error("accounts insert: " + error.message);
    accountsInserted = newAccounts.length;

    // Refresh nameToId with newly inserted accounts
    const { data: fresh } = await supabase
      .from("accounts").select("id, account_name").in("account_name", newAccounts.map((a: any) => a.account_name));
    for (const a of (fresh || [])) nameToId[a.account_name] = a.id;
  }

  // Fetch existing contact emails
  const { data: existingContacts } = await supabase
    .from("contacts").select("contact_email");
  const existingEmails = new Set<string>(
    (existingContacts || []).map((c: any) => (c.contact_email || "").toLowerCase())
  );

  // Insert only new contacts that have an email and don't already exist
  const newContacts = contacts
    .filter((c) => c.contact_email && !existingEmails.has(c.contact_email.toLowerCase()))
    .map((c) => ({
      account_id:    nameToId[c.account_name] || null,
      contact_name:  c.contact_name,
      contact_title: c.contact_title,
      contact_email: c.contact_email,
      email_status:  c.email_status,
      linkedin_url:  c.linkedin_url,
      priority_tier: c.priority_tier,
      stage:         c.stage,
      team_status:   c.team_status,
      notes:         c.notes,
    }));

  let contactsInserted = 0;
  if (newContacts.length) {
    // Insert in batches of 100 to avoid payload limits
    for (let i = 0; i < newContacts.length; i += 100) {
      const batch = newContacts.slice(i, i + 100);
      const { error } = await supabase.from("contacts").insert(batch);
      if (error) throw new Error("contacts insert batch: " + error.message);
      contactsInserted += batch.length;
    }
  }

  return { accountsInserted, contactsInserted };
}

function col(header: string[], name: string) {
  return header.indexOf(name);
}

function parseRows(values: string[][]) {
  if (!values.length) return { touchRows: [], draftRows: [] };
  const header = values[0].map((h) => h.trim());

  const iEmail   = col(header, "correo_destino");
  const iStatus  = col(header, "status");
  const iFecha   = col(header, "fecha_enviado");
  const iAsunto  = col(header, "asunto");
  const iCuerpo  = col(header, "cuerpo");
  const iThread  = col(header, "thread_id");
  const iResp    = col(header, "respondio");
  const iFResp   = col(header, "fecha_respuesta");
  const iTipoR   = col(header, "tipo_respuesta");
  const iEstado  = col(header, "estado");
  const iFup1C   = col(header, "followup_1_cuerpo");
  const iFup1F   = col(header, "followup_1_enviado");
  const iFup1S   = col(header, "followup_1_status");
  const iFup2C   = col(header, "followup_2_cuerpo");
  const iFup2F   = col(header, "followup_2_enviado");
  const iFup2S   = col(header, "followup_2_status");
  const iFup3C   = col(header, "followup_3_cuerpo");
  const iFup3F   = col(header, "followup_3_enviado");
  const iFup3S   = col(header, "followup_3_status");
  const iFup4C   = col(header, "followup_4_cuerpo");
  const iFup4F   = col(header, "followup_4_enviado");
  const iFup4S   = col(header, "followup_4_status");

  if (iEmail < 0 || iStatus < 0) throw new Error("Faltan columnas esperadas: correo_destino, status");

  const touchRows: { correo: string; fecha: string }[] = [];
  const draftRows: {
    correo: string; asunto: string; cuerpo: string; status: string;
    thread_id: string; respondio: boolean; fecha_resp: string;
    tipo_respuesta: string; estado: string;
    followup_1_cuerpo: string; followup_1_fecha: string; followup_1_status: string;
    followup_2_cuerpo: string; followup_2_fecha: string; followup_2_status: string;
    followup_3_cuerpo: string; followup_3_fecha: string; followup_3_status: string;
    followup_4_cuerpo: string; followup_4_fecha: string; followup_4_status: string;
    sheet_row_index: number;
    inferred_stage: string;
  }[] = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const correo = (row[iEmail] || "").trim().toLowerCase();
    const status = (row[iStatus] || "").trim().toUpperCase();
    if (!correo.includes("@")) continue;

    // Touch sync (existing — only SENT/MANUAL rows)
    const fecha = iFecha >= 0 ? (row[iFecha] || "").trim().slice(0, 10) : "";
    if ((status === "SENT" || status === "MANUAL") && fecha) touchRows.push({ correo, fecha });

    // Infer stage from Sheet columns (highest wins)
    const respondio  = iResp  >= 0 ? (row[iResp]  || "").trim().toUpperCase() === "TRUE" : false;
    const fup4fecha  = iFup4F >= 0 ? (row[iFup4F] || "").trim() : "";
    const fup3fecha  = iFup3F >= 0 ? (row[iFup3F] || "").trim() : "";
    const fup2fecha  = iFup2F >= 0 ? (row[iFup2F] || "").trim() : "";
    const fup1fecha  = iFup1F >= 0 ? (row[iFup1F] || "").trim() : "";
    let inferred_stage = "";
    if (respondio)                                    inferred_stage = "Replied";
    else if (fup4fecha)                               inferred_stage = "FUP 4";
    else if (fup3fecha)                               inferred_stage = "FUP 3";
    else if (fup2fecha)                               inferred_stage = "FUP 2";
    else if (fup1fecha)                               inferred_stage = "FUP 1";
    else if (status === "SENT" || status === "MANUAL") inferred_stage = "First Touch (Email)";

    // Draft sync — all rows that have asunto (even PENDING)
    const asunto = iAsunto >= 0 ? (row[iAsunto] || "").trim() : "";
    if (!asunto) continue;
    draftRows.push({
      correo,
      asunto,
      cuerpo:            iCuerpo >= 0 ? (row[iCuerpo] || "").trim()  : "",
      status: (row[iStatus] || "").trim(),
      thread_id:         iThread >= 0 ? (row[iThread] || "").trim()  : "",
      respondio:         iResp   >= 0 ? (["TRUE","SÍ","SI","YES","1"].includes((row[iResp] || "").trim().toUpperCase())) : false,
      fecha_resp:        iFResp  >= 0 ? (row[iFResp]  || "").trim()  : "",
      tipo_respuesta:    iTipoR  >= 0 ? (row[iTipoR]  || "").trim()  : "",
      estado:            iEstado >= 0 ? (row[iEstado] || "").trim()  : "",
      followup_1_cuerpo:  iFup1C >= 0 ? (row[iFup1C] || "").trim() : "",
      followup_1_fecha:   iFup1F >= 0 ? (row[iFup1F] || "").trim() : "",
      followup_1_status:  iFup1S >= 0 ? (row[iFup1S] || "").trim() : "",
      followup_2_cuerpo:  iFup2C >= 0 ? (row[iFup2C] || "").trim() : "",
      followup_2_fecha:   iFup2F >= 0 ? (row[iFup2F] || "").trim() : "",
      followup_2_status:  iFup2S >= 0 ? (row[iFup2S] || "").trim() : "",
      followup_3_cuerpo:  iFup3C >= 0 ? (row[iFup3C] || "").trim() : "",
      followup_3_fecha:   iFup3F >= 0 ? (row[iFup3F] || "").trim() : "",
      followup_3_status:  iFup3S >= 0 ? (row[iFup3S] || "").trim() : "",
      followup_4_cuerpo:  iFup4C >= 0 ? (row[iFup4C] || "").trim() : "",
      followup_4_fecha:   iFup4F >= 0 ? (row[iFup4F] || "").trim() : "",
      followup_4_status:  iFup4S >= 0 ? (row[iFup4S] || "").trim() : "",
      sheet_row_index: r + 1, // 1-indexed for Sheets API
      inferred_stage,
    });
  }

  return { touchRows, draftRows };
}

Deno.serve(async () => {
  try {
    const token = await getGoogleToken();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Step 1: sync Prima Leads → accounts + contacts
    const primaResult = await syncPrimaLeads(supabase, token);

    const { values } = await readSheet(token);
    const { touchRows, draftRows } = parseRows(values);

    // Step 2: existing touch sync
    const { data: touchData, error: touchError } =
      await supabase.rpc("sync_sheet_touches", { p_rows: touchRows, p_max_changes: 50 });
    if (touchError) throw touchError;

    // Draft upsert
    let draftUpserted = 0;
    if (draftRows.length) {
      // Resolve contact_id by email
      const emails = draftRows.map((d) => d.correo);
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, contact_email")
        .in("contact_email", emails);
      const emailToId: Record<string, string> = {};
      for (const c of contacts || []) emailToId[c.contact_email?.toLowerCase()] = c.id;

      const upserts = draftRows
        .filter((d) => emailToId[d.correo?.toLowerCase()])
        .map((d) => ({
          contact_id:        emailToId[d.correo?.toLowerCase()],
          contact_email:     d.correo,
          asunto:            d.asunto,
          cuerpo:            d.cuerpo,
          status:            d.status,
          thread_id:         d.thread_id || null,
          respondio:         d.respondio,
          fecha_resp:        d.fecha_resp || null,
          tipo_respuesta:    d.tipo_respuesta || null,
          estado:            d.estado || null,
          followup_1_cuerpo:  d.followup_1_cuerpo  || null,
          followup_1_fecha:   d.followup_1_fecha   || null,
          followup_1_status:  d.followup_1_status  || null,
          followup_2_cuerpo:  d.followup_2_cuerpo  || null,
          followup_2_fecha:   d.followup_2_fecha   || null,
          followup_2_status:  d.followup_2_status  || null,
          followup_3_cuerpo:  d.followup_3_cuerpo  || null,
          followup_3_fecha:   d.followup_3_fecha   || null,
          followup_3_status:  d.followup_3_status  || null,
          followup_4_cuerpo:  d.followup_4_cuerpo  || null,
          followup_4_fecha:   d.followup_4_fecha   || null,
          followup_4_status:  d.followup_4_status  || null,
          sheet_row_index:   d.sheet_row_index,
          synced_at:         new Date().toISOString(),
        }));

      if (upserts.length) {
        const { error: draftError } = await supabase
          .from("email_drafts")
          .upsert(upserts, { onConflict: "contact_email" });
        if (draftError) throw draftError;
        draftUpserted = upserts.length;
      }

      // Stage sync: update contacts.stage based on Sheet data
      const stageUpdates = draftRows
        .filter((d) => d.inferred_stage && emailToId[d.correo?.toLowerCase()])
        .map((d) => ({ id: emailToId[d.correo?.toLowerCase()], stage: d.inferred_stage }));

      for (const u of stageUpdates) {
        await supabase
          .from("contacts")
          .update({ stage: u.stage, updated_at: new Date().toISOString() })
          .eq("id", u.id)
          .neq("stage", u.stage); // only update if stage changed
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        prima_leads: primaResult,
        touch_rows: touchRows.length,
        draft_upserted: draftUpserted,
        result: touchData,
      }),
      { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
