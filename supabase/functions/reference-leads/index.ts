const CLOUD_RUN_URL = "https://reference-leads-n2stfzku3q-uc.a.run.app";

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Forward to Cloud Run
  const body = await req.json();
  const apiKey = Deno.env.get("REFERENCE_LEADS_API_KEY")!;

  const upstream = await fetch(`${CLOUD_RUN_URL}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
