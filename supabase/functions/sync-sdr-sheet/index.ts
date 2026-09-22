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
  const iFResp   = col(header, "fecha_resp");
  const iFup1C   = col(header, "followup_1_cuerpo");
  const iFup1F   = col(header, "followup_1");
  const iFup2C   = col(header, "followup_2_cuerpo");
  const iFup2F   = col(header, "followup_2");
  const iFup3C   = col(header, "followup_3_cuerpo");
  const iFup3F   = col(header, "followup_3");
  const iFup4C   = col(header, "followup_4_cuerpo");
  const iFup4F   = col(header, "followup_4");

  if (iEmail < 0 || iStatus < 0) throw new Error("Faltan columnas esperadas: correo_destino, status");

  const touchRows: { correo: string; fecha: string }[] = [];
  const draftRows: {
    correo: string; asunto: string; cuerpo: string; status: string;
    thread_id: string; respondio: boolean; fecha_resp: string;
    followup_1_cuerpo: string; followup_1_fecha: string;
    followup_2_cuerpo: string; followup_2_fecha: string;
    followup_3_cuerpo: string; followup_3_fecha: string;
    followup_4_cuerpo: string; followup_4_fecha: string;
    sheet_row_index: number;
  }[] = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const correo = (row[iEmail] || "").trim().toLowerCase();
    const status = (row[iStatus] || "").trim();
    if (!correo.includes("@")) continue;

    // Touch sync (existing — only SENT rows)
    const fecha = iFecha >= 0 ? (row[iFecha] || "").trim().slice(0, 10) : "";
    if (status === "SENT" && fecha) touchRows.push({ correo, fecha });

    // Draft sync — all rows that have asunto (even PENDING)
    const asunto = iAsunto >= 0 ? (row[iAsunto] || "").trim() : "";
    if (!asunto) continue;
    draftRows.push({
      correo,
      asunto,
      cuerpo:            iCuerpo >= 0 ? (row[iCuerpo] || "").trim()  : "",
      status,
      thread_id:         iThread >= 0 ? (row[iThread] || "").trim()  : "",
      respondio:         iResp   >= 0 ? (row[iResp]   || "").trim().toUpperCase() === "TRUE" : false,
      fecha_resp:        iFResp  >= 0 ? (row[iFResp]  || "").trim()  : "",
      followup_1_cuerpo: iFup1C  >= 0 ? (row[iFup1C]  || "").trim()  : "",
      followup_1_fecha:  iFup1F  >= 0 ? (row[iFup1F]  || "").trim()  : "",
      followup_2_cuerpo: iFup2C  >= 0 ? (row[iFup2C]  || "").trim()  : "",
      followup_2_fecha:  iFup2F  >= 0 ? (row[iFup2F]  || "").trim()  : "",
      followup_3_cuerpo: iFup3C  >= 0 ? (row[iFup3C]  || "").trim()  : "",
      followup_3_fecha:  iFup3F  >= 0 ? (row[iFup3F]  || "").trim()  : "",
      followup_4_cuerpo: iFup4C  >= 0 ? (row[iFup4C]  || "").trim()  : "",
      followup_4_fecha:  iFup4F  >= 0 ? (row[iFup4F]  || "").trim()  : "",
      sheet_row_index: r + 1, // 1-indexed for Sheets API
    });
  }

  return { touchRows, draftRows };
}

Deno.serve(async () => {
  try {
    const token = await getGoogleToken();
    const { values } = await readSheet(token);
    const { touchRows, draftRows } = parseRows(values);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Existing touch sync
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
        .filter((d) => emailToId[d.correo])
        .map((d) => ({
          contact_id:        emailToId[d.correo],
          contact_email:     d.correo,
          asunto:            d.asunto,
          cuerpo:            d.cuerpo,
          status:            d.status,
          thread_id:         d.thread_id || null,
          respondio:         d.respondio,
          fecha_resp:        d.fecha_resp || null,
          followup_1_cuerpo: d.followup_1_cuerpo || null,
          followup_1_fecha:  d.followup_1_fecha  || null,
          followup_2_cuerpo: d.followup_2_cuerpo || null,
          followup_2_fecha:  d.followup_2_fecha  || null,
          followup_3_cuerpo: d.followup_3_cuerpo || null,
          followup_3_fecha:  d.followup_3_fecha  || null,
          followup_4_cuerpo: d.followup_4_cuerpo || null,
          followup_4_fecha:  d.followup_4_fecha  || null,
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
    }

    return new Response(
      JSON.stringify({ ok: true, touch_rows: touchRows.length, draft_upserted: draftUpserted, result: touchData }),
      { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
