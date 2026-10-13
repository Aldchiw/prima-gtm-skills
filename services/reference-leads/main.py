import os
import json
import base64
import hashlib
import datetime
import csv
import io
import logging

import anthropic
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
SERVICE_API_KEY = os.environ["SERVICE_API_KEY"]


def check_api_key():
    key = request.headers.get("X-Api-Key", "")
    if key != SERVICE_API_KEY:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    return None
GITHUB_REPO = os.environ.get("GITHUB_REPO", "Aldchiw/prima-gtm-skills")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")
MASTER_CSV_PATH = "output/leads_master.csv"
MODEL = "claude-opus-4-5"

SKILL_DIR = os.path.join(os.path.dirname(__file__), "skills")


def load_skill(name: str) -> str:
    path = os.path.join(SKILL_DIR, name, "SKILL.md")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def github_get_file(path: str) -> tuple[str, str]:
    """Returns (content_decoded, sha)."""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    r = requests.get(url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }, params={"ref": GITHUB_BRANCH})
    r.raise_for_status()
    data = r.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    return content, data["sha"]


def github_put_file(path: str, content: str, sha: str, message: str) -> None:
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "sha": sha,
        "branch": GITHUB_BRANCH,
    }
    r = requests.put(url, headers={
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }, json=payload)
    r.raise_for_status()


def parse_csv(content: str) -> tuple[list[str], list[dict]]:
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)
    fieldnames = reader.fieldnames or []
    return list(fieldnames), rows


def rows_to_csv(fieldnames: list[str], rows: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue()


SYSTEM_PROMPT = """Eres el agente de Prima que corre el pipeline prima-reference-leads.

Tu tarea: dado un lote de empresas solicitadas explícitamente por un usuario del equipo,
correr signal-scan → committee → email-waterfall para cada una y devolver las filas
listas para escribir en leads_master.csv.

Reglas estrictas:
- Nunca inventes un contacto, email, dominio o señal.
- Si no puedes resolver una empresa, márcala NO_ENCONTRADA.
- Si no hay contacto localizable, márcala NO_CONTACTO.
- company_category siempre = "Reference".
- priority siempre = "P3".
- vertical_owner siempre = "UNKNOWN".
- sub_segment siempre = "UNKNOWN".
- needs_manual_scope_confirmation = "yes".
- stage = "Not Contacted", contact_count = "0".

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta:
{
  "rows": [
    {
      "account_name": "...",
      "domain": "...",
      "company_category": "Reference",
      "sub_segment": "UNKNOWN",
      "priority": "P3",
      "vertical_owner": "UNKNOWN",
      "excluded": "",
      "exclusion_reason": "",
      "scope_tier": "",
      "needs_manual_scope_confirmation": "yes",
      "signal_source": "...",
      "signal_detail": "...",
      "signal_url": "",
      "signal_date": "...",
      "contact_name": "...",
      "contact_title": "...",
      "priority_tier": "...",
      "linkedin_url": "...",
      "contact_email": "",
      "email_status": "NOT_FOUND",
      "stage": "Not Contacted",
      "contact_count": "0",
      "source_files": "...",
      "assigned_owner": "..."
    }
  ],
  "skipped": [
    {"account_name": "...", "reason": "NO_ENCONTRADA | NO_CONTACTO | DUPLICADO | EMPRESA_EN_PIPELINE"}
  ],
  "cost_usd": 0.0
}

No incluyas texto, markdown ni explicaciones fuera del JSON.
"""


def build_user_message(empresas: list[str], requested_by: str, context: str, master_csv: str) -> str:
    empresa_list = "\n".join(f"- {e}" for e in empresas)
    today = datetime.date.today().isoformat()
    return f"""Procesa este lote de Reference leads.

SOLICITADO POR: {requested_by}
CONTEXTO: {context}
FECHA: {today}

EMPRESAS A PROCESAR:
{empresa_list}

LEADS_MASTER.CSV ACTUAL (para dedup):
```csv
{master_csv[:8000]}
```

Sigue el pipeline: resuelve dominio → signal-scan → committee → email-waterfall.
Devuelve solo el JSON con las filas listas para escribir.
"""


def merge_rows(
    fieldnames: list[str],
    existing_rows: list[dict],
    new_rows: list[dict],
    requested_by: str,
) -> tuple[list[dict], list[dict], list[dict]]:
    """Returns (to_write, duplicates, pipeline_conflicts)."""
    existing_keys = {
        (r.get("account_name", "").strip().lower(), r.get("contact_name", "").strip().lower())
        for r in existing_rows
    }
    existing_companies = {
        r.get("account_name", "").strip().lower(): r.get("company_category", "")
        for r in existing_rows
    }

    to_write, duplicates, conflicts = [], [], []
    for row in new_rows:
        an = row.get("account_name", "").strip().lower()
        cn = row.get("contact_name", "").strip().lower()
        key = (an, cn)
        if key in existing_keys:
            duplicates.append(row)
            continue
        cat = existing_companies.get(an, "")
        if cat and cat not in ("Reference", ""):
            conflicts.append(row)
            continue
        # ensure all fieldnames present
        full_row = {f: row.get(f, "") for f in fieldnames}
        to_write.append(full_row)

    return to_write, duplicates, conflicts


@app.route("/health", methods=["GET"])
def health():
    err = check_api_key()
    if err: return err
    return jsonify({"ok": True})


@app.route("/run", methods=["POST"])
def run():
    err = check_api_key()
    if err: return err
    body = request.get_json(silent=True) or {}
    empresas: list[str] = body.get("empresas", [])
    requested_by: str = body.get("requested_by", "")
    context: str = body.get("context", f"pedido de {requested_by}")

    if not empresas:
        return jsonify({"ok": False, "error": "empresas is required"}), 400
    if not requested_by:
        return jsonify({"ok": False, "error": "requested_by is required"}), 400

    # 1. Read current master CSV from GitHub
    try:
        master_content, master_sha = github_get_file(MASTER_CSV_PATH)
    except requests.HTTPError as e:
        if e.response.status_code == 404:
            master_content, master_sha = "", None
        else:
            return jsonify({"ok": False, "error": f"GitHub read error: {e}"}), 500

    fieldnames, existing_rows = parse_csv(master_content) if master_content.strip() else ([], [])

    # 2. Call Claude to process empresas
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_msg = build_user_message(empresas, requested_by, context, master_content)

    log.info("Calling Claude for %d empresas", len(empresas))
    response = client.messages.create(
        model=MODEL,
        max_tokens=8096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = response.content[0].text.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error("Claude returned non-JSON: %s", raw[:500])
        return jsonify({"ok": False, "error": f"Claude returned non-JSON: {e}"}), 500

    new_rows: list[dict] = result.get("rows", [])
    skipped: list[dict] = result.get("skipped", [])
    cost_usd: float = result.get("cost_usd", 0.0)

    if not fieldnames and new_rows:
        fieldnames = list(new_rows[0].keys())

    # 3. Merge — dedup against existing master
    to_write, duplicates, conflicts = merge_rows(fieldnames, existing_rows, new_rows, requested_by)

    if not to_write:
        return jsonify({
            "ok": True,
            "escritas": 0,
            "duplicadas": len(duplicates),
            "conflictos_pipeline": len(conflicts),
            "skipped": skipped,
            "cost_usd": cost_usd,
            "message": "No hay filas nuevas para escribir.",
        })

    # 4. Write back to GitHub
    updated_rows = existing_rows + to_write
    new_csv = rows_to_csv(fieldnames, updated_rows)
    today_str = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M")
    commit_msg = (
        f"feat(reference-leads): add {len(to_write)} Reference rows "
        f"for {requested_by} [{today_str}]"
    )

    if master_sha:
        github_put_file(MASTER_CSV_PATH, new_csv, master_sha, commit_msg)
    else:
        # First-time write — no sha needed? Actually GitHub requires sha for updates.
        # If file doesn't exist, we create it (sha not required for creation).
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{MASTER_CSV_PATH}"
        payload = {
            "message": commit_msg,
            "content": base64.b64encode(new_csv.encode("utf-8")).decode("ascii"),
            "branch": GITHUB_BRANCH,
        }
        r = requests.put(url, headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }, json=payload)
        r.raise_for_status()

    log.info("Wrote %d rows to leads_master.csv", len(to_write))

    return jsonify({
        "ok": True,
        "escritas": len(to_write),
        "duplicadas": len(duplicates),
        "conflictos_pipeline": len(conflicts),
        "skipped": skipped,
        "cost_usd": cost_usd,
        "rows_written": to_write,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
