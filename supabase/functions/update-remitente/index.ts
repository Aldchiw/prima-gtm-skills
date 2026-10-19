import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5";

const SHEET_ID = "1rH-KprLuxAZydwqyRX4lU_lLKX09154F9Nyj6VDG8is";
const SHEET_TAB = "SDR Outreach";

const USER_EMAILS: Record<string, string> = {
  aldahir: "aldahir.chiw@manufacturing-prima.ai",
  manu:    "manuel.ibarra@manufacturing-prima.ai",
  gustavo: "gustavo.rivas@manufacturing-prima.ai",
  gaby:    "gabriela.zacarias@manufacturing-prima.ai",
};

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
  if (!j.access_token) throw new Error("Google token error: " + JSON.stringify(j));
  return j.access_token as string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { empresa, new_user_id } = await req.json();
    if (!empresa || !new_user_id) throw new Error("empresa y new_user_id requeridos");

    const newEmail = USER_EMAILS[new_user_id];
    if (!newEmail) throw new Error("user_id desconocido: " + new_user_id);

    const token = await getGoogleToken();

    // Read columns B (empresa) and G (remitente)
    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB)}!B:G`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { values } = await valRes.json() as { values: string[][] };

    // Find rows matching empresa AND already using @manufacturing-prima.ai
    const updates: { range: string; values: string[][] }[] = [];
    for (let i = 1; i < (values || []).length; i++) {
      const row = values[i];
      const rowEmpresa = (row[0] || "").trim();   // col B
      const rowRemitente = (row[5] || "").trim(); // col G (B=0, C=1, D=2, E=3, F=4, G=5)
      if (
        rowEmpresa.toLowerCase() === empresa.toLowerCase() &&
        rowRemitente.includes("@manufacturing-prima.ai")
      ) {
        const sheetRow = i + 1; // 1-indexed
        updates.push({ range: `${SHEET_TAB}!G${sheetRow}`, values: [[newEmail]] });
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ ok: true, updated: 0, msg: "No hay filas con @manufacturing-prima.ai para esta empresa" }), { headers: CORS });
    }

    // Batch update
    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ valueInputOption: "RAW", data: updates }),
      }
    );
    const batchJson = await batchRes.json();
    if (!batchRes.ok) throw new Error("Sheets batchUpdate error: " + JSON.stringify(batchJson));

    return new Response(JSON.stringify({ ok: true, updated: updates.length }), { headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: CORS });
  }
});
