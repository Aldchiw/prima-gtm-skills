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
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets.readonly" })
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
  return (val.values || []) as string[][];
}

function parseRows(values: string[][]) {
  if (!values.length) return [];
  const header = values[0].map((h) => h.trim());
  const iEmail = header.indexOf("correo_destino");
  const iStatus = header.indexOf("status");
  const iFecha = header.indexOf("fecha_enviado");
  if (iEmail < 0 || iStatus < 0 || iFecha < 0) throw new Error("Faltan columnas esperadas");
  const rows: { correo: string; fecha: string }[] = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const correo = (row[iEmail] || "").trim().toLowerCase();
    const status = (row[iStatus] || "").trim();
    const fecha = (row[iFecha] || "").trim().slice(0, 10);
    if (status === "SENT" && correo.includes("@") && fecha) rows.push({ correo, fecha });
  }
  return rows;
}

Deno.serve(async () => {
  try {
    const token = await getGoogleToken();
    const values = await readSheet(token);
    const rows = parseRows(values);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("sync_sheet_touches", { p_rows: rows, p_max_changes: 50 });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, sent_rows: rows.length, result: data }),
      { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
