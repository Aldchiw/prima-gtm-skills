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
    const { contact_name, title, company, signal, signal_url } = await req.json();
    if (!contact_name || !company) throw new Error("contact_name y company son requeridos");

    const hasSignal = signal && signal.trim().length > 0;
    const signalCtx = hasSignal
      ? `Signal verificado de la empresa: "${signal.trim()}"${signal_url ? ` (fuente: ${signal_url})` : ""}`
      : "No hay signal verificado disponible para esta empresa.";

    const prompt = `Eres SDR de Prima, fabricante certificado AISC/AWS de acero estructural y ensambles para data centers en EE.UU.: modular enclosures, power skids, cooling assemblies, structural steel. +10,000 ton/mes de capacidad, seller of record en EE.UU.

Genera DOS mensajes de LinkedIn para este contacto:
- Nombre: ${contact_name}
- Título: ${title || "—"}
- Empresa: ${company}
- ${signalCtx}

MENSAJE 1 — Nota de connection request:
- MÁXIMO 300 caracteres (cuenta TODO: letras, espacios, puntuación)
- Preséntate brevemente como Gustavo de Prima
- Si hay signal, úsalo como gancho natural (sin exagerar)
- Razón concisa para conectar
- Tono directo, profesional, no robótico

MENSAJE 2 — DM post-conexión (una vez aceptado):
- Saludo por nombre
- 3-4 líneas: cómo Prima ayuda a resolver constraints reales de su mercado (disponibilidad de acero + capacidad de fabricación calificada)
- Si hay signal, referenciarlo naturalmente
- CTA suave para explorar si tiene sentido hablar
- Conciso, máximo 6 líneas

Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown:
{"connect_note": "...", "dm_msg": "..."}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    const raw = (json.choices?.[0]?.message?.content || "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify({ ok: true, connect_note: result.connect_note, dm_msg: result.dm_msg }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
