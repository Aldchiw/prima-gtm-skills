import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5";

const SHEET_ID = "1rH-KprLuxAZydwqyRX4lU_lLKX09154F9Nyj6VDG8is";
const TARGET_GID = 1226985717;

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

async function getGoogleToken() {
  const email = Deno.env.get("GOOGLE_SA_EMAIL")!;
  const key = await importPKCS8(buildPem(), "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
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

async function getSheetTitle(token: string): Promise<string> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets(properties(sheetId,title))`,
    { headers: { Authorization: `Bearer ${token}` } });
  const meta = await res.json();
  const sheet = (meta.sheets || []).find((s: any) => s.properties?.sheetId === TARGET_GID);
  if (!sheet) throw new Error("Tab no encontrado gid " + TARGET_GID);
  return sheet.properties.title as string;
}

async function getStatusColIndex(token: string, title: string): Promise<number> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}!1:1`,
    { headers: { Authorization: `Bearer ${token}` } });
  const val = await res.json();
  const header: string[] = (val.values?.[0] || []).map((h: string) => h.trim());
  const idx = header.indexOf("status");
  if (idx < 0) throw new Error("Columna 'status' no encontrada en el header");
  return idx;
}

// Column index (0-based) → A1 notation letter
function colLetter(idx: number): string {
  let letter = "";
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { contact_id, asunto, cuerpo, fup_index } = await req.json();
    if (!contact_id) throw new Error("contact_id requerido");
    const fupNum = fup_index ? parseInt(fup_index, 10) : 0; // 0 = email principal, 1-4 = followup

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get draft record
    const { data: draft, error: draftErr } = await supabase
      .from("email_drafts")
      .select("id, sheet_row_index, status")
      .eq("contact_id", contact_id)
      .single();

    if (draftErr || !draft) throw new Error("Draft no encontrado para contact_id " + contact_id);
    if (draft.status === "SENT") throw new Error("Este correo ya fue enviado");
    if (!draft.sheet_row_index) throw new Error("sheet_row_index no disponible — re-sync primero");

    const token = await getGoogleToken();
    const title = await getSheetTitle(token);

    // Read header once — used for asunto/cuerpo edits and status column lookup
    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}!1:1`,
      { headers: { Authorization: `Bearer ${token}` } });
    const headerVal = await headerRes.json();
    const header: string[] = (headerVal.values?.[0] || []).map((h: string) => h.trim());

    // If edited asunto/cuerpo provided, write them to Sheet first
    if (asunto || cuerpo) {
      const updates: { range: string; values: string[][] }[] = [];
      if (asunto) {
        const col = header.indexOf("asunto");
        if (col >= 0) updates.push({ range: `${title}!${colLetter(col)}${draft.sheet_row_index}`, values: [[asunto]] });
      }
      if (cuerpo) {
        const col = header.indexOf("cuerpo");
        if (col >= 0) updates.push({ range: `${title}!${colLetter(col)}${draft.sheet_row_index}`, values: [[cuerpo]] });
      }
      if (updates.length) {
        const batchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
          });
        const batchData = await batchRes.json();
        if (batchData.error) throw new Error("Sheets batch write error: " + JSON.stringify(batchData.error));
      }
    }

    // Determine which Sheet column to write SEND to
    const statusColName = fupNum > 0 ? `followup_${fupNum}_status` : "status";
    const statusColIdx = header.indexOf(statusColName);
    if (statusColIdx < 0) throw new Error(`Columna '${statusColName}' no encontrada en el header`);
    const cell = `${title}!${colLetter(statusColIdx)}${draft.sheet_row_index}`;

    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(cell)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ range: cell, majorDimension: "ROWS", values: [["SEND"]] }),
      });
    const writeData = await writeRes.json();
    if (writeData.error) throw new Error("Sheets write error: " + JSON.stringify(writeData.error));

    // Update Supabase
    const supabaseUpdate: Record<string, string> = { status: "SEND", updated_at: new Date().toISOString() };
    if (asunto) supabaseUpdate.asunto = asunto;
    if (cuerpo) supabaseUpdate.cuerpo = cuerpo;
    const { error: updateErr } = await supabase
      .from("email_drafts")
      .update(supabaseUpdate)
      .eq("id", draft.id);
    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ ok: true, cell, sheet_row_index: draft.sheet_row_index }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
});
