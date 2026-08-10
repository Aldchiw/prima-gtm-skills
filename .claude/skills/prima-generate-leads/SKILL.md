---
name: prima-generate-leads
description: The one-line "director de orquesta" for the Data Centers lead-gen pipeline — a salesperson types only a count and a vertical (e.g. "genera 20 leads de Power & Electrical") and this skill runs discovery → prima-icp-check → prima-signal-scan → prima-scope-score → prima-committee → prima-email-waterfall end to end with no follow-up questions, then writes a single clean row per company to leads_final.csv. Only supports Power & Electrical Distribution and Energy Storage (Aldahir's verticals — prima-scope-score's product table isn't portable to Manu's). Stops before prima-hook/prima-draft/prima-guardrail-audit — this produces a qualified, contactable lead list, not outbound copy. Use this whenever someone asks for N new leads/accounts/empresas in one of these two verticals without specifying a company list themselves.
---

# prima-generate-leads

The single entry point a non-technical vendor uses to get a batch of qualified, contactable leads
without knowing anything about the 8-skill pipeline underneath. This skill doesn't add new logic —
it sequences `prima-icp-check` → `prima-signal-scan` → `prima-scope-score` → `prima-committee` →
`prima-email-waterfall` exactly as each already defines itself, plus one discovery step that isn't
its own skill yet (see Step 0). If any of those five skills' own rules change, this orchestrator
should pick up the change by reading them, not by re-implementing their logic here.

## Invocation

Recognized forms, both equivalent:

```
genera 20 leads de Power & Electrical
genera 15 leads de Energy Storage
/prima-generate-leads 20 Power & Electrical
```

Parse **count** (N) and **vertical** from the phrase. Normalize vertical loosely (case-insensitive,
"Power and Electrical", "P&E", "Energy Storage", "storage" in context all resolve) — but only to one
of the two supported values below. Nothing else is a valid parameter; there is no flag/config surface
for a vendor to get wrong.

| Recognized vertical | Maps to |
|---|---|
| Power & Electrical (Distribution) | `vertical_owner = Aldahir`, Notion product line "Power & Electrical Distribution" |
| Energy Storage | `vertical_owner = Aldahir`, Notion product line "Energy Storage" |

**If the phrase names Cooling & Thermal Management, Test & Commissioning, or anything that isn't
clearly one of the two above:** stop and ask which vertical they meant, the same way an unrecognized
acronym gets clarified rather than guessed. Never silently run `prima-scope-score` against Manu's
verticals — its product-type weighting table is explicitly not portable to them (see that skill's
own `SKILL.md`).

**If N or vertical can't be parsed from the phrase at all:** ask once for the missing piece. Don't
default N to some number or guess the vertical from context.

## What N actually counts

**N = distinct companies that end this run with at least one actionable contact** (a `linkedin_url`
and/or a `contact_email`) — not contacts, not CSV rows, not companies merely discovered. A company
that produces a real, verified signal and passes ICP but where `prima-committee`/
`prima-email-waterfall` can't surface even a LinkedIn profile does **not** count toward N — keep
discovering until N real ones are reached, or the circuit breaker below trips.

## Step 0 — Discover candidate companies: firmographic search first, signal cascade as fallback (added 2026-07-22)

This is the one step with no dedicated skill of its own yet — it's the same generator-mode process
used in Sprint 2's 20-account discovery, applied continuously here instead of as a one-off batch.
It now has two sources, run in this order, not as alternatives to pick between per run:

1. **Tier 0 — firmographic company search** (`ai_ark_company_search` via Deepline). Cheap ($0.002/
   result) and fast — one call can return up to 100 candidates regardless of whether any of them has
   a news-worthy event right now. This is a pure ICP-fit filter (industry/size/location) — it knows
   nothing about signals or data centers, so every candidate it returns still has to clear a real
   `prima-icp-check` pass before it's treated as anything more than a raw name. See "Tier 0" below.
2. **Tiers 1-4 — the WebSearch signal cascade** (unchanged from 2026-07-22's design) — the fallback
   when Tier 0's pool is exhausted (deduped out) or doesn't reach N. See "The cascade" below.

Both sources feed the exact same downstream pipeline (Steps 1-5) and the exact same circuit breaker —
Tier 0 isn't a separate track with its own rules, it's just a faster way to produce the same kind of
candidate name the cascade already produces.

## Tier 0 — firmographic company search (`ai_ark_company_search`)

Run this first, before touching WebSearch. One call, ranked by cheapest/fastest-to-exhaust-first:

1. Build the `ai_ark_company_search` call with the **validated payload shapes**
   (confirmed against the real inputSchema, live-tested 2026-08-10 — do NOT revert
   to the pre-2026-08-10 shapes, which returned nothing):

   - **`account.employeeSize`** — RANGE wrapper:
     `{ "type": "RANGE", "range": { "start": 50, "end": 1000 } }` (`end` may be
     `null`). 50–1000 is the Cat4 default (skips pre-revenue shells and Fortune 500
     in-house incumbents).
   - **Terms → `account.keyword`, never `account.industries`** (its sub-form is
     undeclared). Terms go in `account.keyword.any.include.content`, and **`source`
     depends on the TERM TYPE — load-bearing rule, live-tested 2026-08-10:**
     - Industry-label term (e.g. "electrical construction") → `source: "INDUSTRY"`.
     - Product term (e.g. "switchgear", "power transformer") → `source: "KEYWORD"`.
       Products are NOT industry labels: the 3 Cat4 product terms under `INDUSTRY`
       returned 3 companies total (all <50 staff) — the weeks-long bug; the same
       products under `KEYWORD` returned 455 real manufacturers.
   - **`account.keyword.any.exclude`** — sibling of `include`, same shape; drops a
     category's dominant noise bucket by industry. **Exclude is per-category — the
     noise bucket differs by category and never crosses:** Cat4/Power&Electrical
     excludes `"wholesale"` (distributors); Cat4/Energy Storage excludes
     `"renewable energy semiconductor manufacturing"` (solar/wind developers, not
     makers); Cat3 excludes `"utilities"` (grid operators). Cat4 must NOT exclude
     `"utilities"` — real Cat4 makers like Giga Energy are mis-tagged there. Never
     a global exclude.
   - **No `location`** — undeclared/untested, deferred like `naics`. Cat4 is global;
     a US lock drops half the real pool.

   Canonical payload (Cat4 / Power & Electrical — validated 2026-08-10; `page`/`size`
   for paging during full enumeration):
   ```json
   {
     "page": 0,
     "size": 20,
     "account": {
       "employeeSize": { "type": "RANGE", "range": { "start": 50, "end": 1000 } },
       "keyword": {
         "any": {
           "include": {
             "content": ["switchgear", "circuit breaker", "industrial transformer", "power transformer"],
             "sources": [{ "source": "KEYWORD", "mode": "SMART" }]
           },
           "exclude": {
             "content": ["wholesale"],
             "sources": [{ "source": "INDUSTRY", "mode": "SMART" }]
           }
         }
       }
     }
   }
   ```
   Redirect stderr per the standing Deepline noise rule (`2>/dev/null`).
2. **Search config by vertical** (both Cat4 OEM) — terms, their `source`, and any
   `exclude`:

   | Vertical | include `content` | `source` | exclude (INDUSTRY) |
   |---|---|---|---|
   | Power & Electrical | "switchgear", "circuit breaker", "industrial transformer", "power transformer" | KEYWORD | "wholesale" |
   | Energy Storage | "battery manufacturing", "energy storage" | INDUSTRY | "renewable energy semiconductor manufacturing" |

   **NAICS caveat, confirmed 2026-07-22, don't re-litigate this without re-testing first:** the
   `naics` field is real and populated on individual company profiles (seen on Giga Energy's and
   Pennsylvania Transformer Technology's own records), but filtering *search* by `naics` returned
   **zero** results for both `335911` and the broader `335` in direct testing, while `industries`
   text search against the same companies worked fine. Treat `naics` as a format bug to revisit later,
   not a working filter today — always use the `keyword` field (source per term type — see step 1)
   unless a future session re-tests `naics` and finds the correct format.
3. **Dedup exactly like the cascade does** — check every returned candidate against Notion's tracked
   list and `output/accounts_processed.csv` before spending any more effort on it (same rule, same
   command-shape convention, as the cascade's own dedup step below).
4. **Feed every surviving candidate into `prima-icp-check` — the real one, no shortcut (hard rule,
   added 2026-07-22, corrects a real mistake made the same day).** the firmographic search has no
   idea what a data center is or what counts as Category 4 — `prima-icp-check`'s formal criteria (Notion's
   categories/segments, existing-customer exclusion, disqualification signals) is what actually does
   that filtering for Tier 0, so it matters more here than for cascade-sourced candidates, not less.
   **Do not replace this with an eyeballed "obviously wrong category" pass** — a real run on 2026-07-22
   filtered 12 of 30 raw candidates that way (skipped anything that looked like a distributor/developer/
   consumer-electronics/research-org name at a glance) instead of running them through
   `prima-icp-check` itself, and that's exactly the shortcut this rule exists to stop. Batching many
   candidates through `prima-icp-check` at once for efficiency is fine; skipping the check itself for
   any of them is not — a candidate dropped without a real ICP pass doesn't count as "evaluated" for
   the circuit breaker, it's a process gap to go back and close.
5. **The signal branch — informational only, does not gate anything downstream (revised 2026-07-22,
   Aldahir's second pass).** For every candidate that passes ICP *and* clears `prima-scope-score`
   (unchanged — `disqualified_inhouse` still excludes here exactly like it does for the cascade), run
   `prima-signal-scan` to tag it, then **always continue to `prima-committee` → `prima-email-waterfall`
   regardless of the result:**
   - **Found a real, current signal** → tag `signal_status = VERIFIED`, `prima-scope-score` runs in
     full (signal-freshness weighted in as usual).
   - **No real signal found** → tag `signal_status = NO_SIGNAL`, `prima-scope-score` runs in
     **partial** mode (product-type + sourcing-team-evidence weights only — no freshness weight to
     compute without a dated signal). **This no longer stops the candidate.** Fit is fit — if ICP and
     scope-score both say yes, find its contact the same as any other candidate.

   Both outcomes count toward N and land in `leads_final.csv` once a contact is found — `signal_status`
   is a column you can see, not a gate you have to clear. The only things that still stop a candidate
   before committee/waterfall are the ones that already stopped it before this change: failing
   `prima-icp-check`, or `prima-scope-score` returning `disqualified_inhouse`. **Never blur `VERIFIED`
   and `NO_SIGNAL` into one unlabeled bucket in the data or the final message** — the distinction is
   still worth showing, it just isn't a filter anymore. The P1 anti-burn gate
   (`needs_manual_scope_confirmation`) is completely unaffected by any of this — it only ever blocked
   `prima-draft`, which this skill never reaches, signal or no signal.

## The cascade — tiers 1-4, unchanged, now the fallback behind Tier 0

Try signal categories strongest-first. Only drop to the next tier when the current one stops
producing enough *new* (non-duplicate) candidates to plausibly reach N — not the instant it hits
zero, and not as one blanket pass across every category at once.

1. **`capacity_expansion`** (news of a new/expanded plant) — strongest signal, tried first.
2. **`funding`** (Series B/C, PE recapitalization/roll-up) — validated as productive in real runs
   (Ayr Energy, CORE Transformers, DG Matrix, Nostromo Energy, EnerVenue, Exowatt, ARC Clean
   Technology, Amperesand all came from this tier).
3. **`job_opening`** (active postings for plant purchasing / sourcing / supply chain roles at
   electrical or storage equipment manufacturers) — the mechanism (WebSearch) works, but as of
   2026-07-22 it has never once produced a discovery (0 of 41 tracked accounts) — attempt it anyway
   per the drop rule below, don't skip it outright, but expect it to drop through most runs.
4. **`customs`** (Mexico→US import records, per `prima-signal-scan`'s own source list) — **skip this
   tier entirely, don't spend any search attempts on it**, unless an actual Import Genius (or
   equivalent trade-data) tool is connected in the session. Confirmed 2026-07-22 via
   `deepline tools search`: no atomic tool matches import/customs/trade in this environment. This is a
   different failure mode than `job_opening`'s — `job_opening` has a working search mechanism that
   just hasn't paid off yet; `customs` currently has no mechanism to try at all. Re-check tool
   availability each run rather than assuming this stays permanently unavailable — the day an
   Import Genius tool is connected, this tier becomes real and should be attempted like the others.

**Drop-to-next-tier rule:** within a tier, after **3 consecutive WebSearch queries produce zero new
(non-duplicate) candidates**, drop to the next tier. Don't wait for a larger cumulative count of empty
searches, and don't drop after just one empty search either — 3 is the threshold, applied per tier,
resetting when a tier change happens.

1. WebSearch for Data Centers-relevant signals in the requested vertical, within the current cascade
   tier's signal category — surfacing **candidate company names** worth running through the full
   pipeline, same as `prima-signal-scan` formally verifies in Step 2.
2. **Dedup before spending any more effort on a candidate:** check it isn't already on Notion's
   "Data Centers GTM" tracked-account list and isn't already a row in `output/accounts_processed.csv`
   from a prior run. A company that's already tracked/processed doesn't count as a new discovery,
   even if it would otherwise qualify — and doesn't count as a "new candidate" for the drop-to-next-tier
   rule above either.
3. Feed every surviving candidate into Step 1.

**How to actually run the dedup check — command shape matters, not just logic (added 2026-07-22).**
This project's `.claude/settings.local.json` pre-approves specific literal command prefixes (`grep`,
`wc`, `cat`, `head`, `tail`, `cut`, `deepline`, etc.) so a live run doesn't stop for permission prompts.
That pre-approval matches on how the command **starts** — a command that starts with a variable
assignment (`F="path"; grep ...`) or command substitution (`off=$(grep ... | head ...)`) does not match
any of those prefixes, no matter how broad the allowlist gets, because the command as a whole doesn't
begin with the allowed word. Confirmed the hard way, 2026-07-22 — this is what caused the mid-demo
approval prompts during dedup checks that day.

**Always check dedup with a direct, single-purpose command — the literal path written inline, no
intermediate variable, no `$(...)` wrapping the whole check:**

```
grep -ci "Company Name" "output/accounts_processed.csv"
```

not

```
F="output/accounts_processed.csv"
grep -ci "Company Name" "$F"
```

Same result, same logic, same file — only the shape changes. This applies to every dedup check in
Step 0 (against `accounts_processed.csv` and against the cached Notion tracked-list content) and to
any other read-only inspection during a run (`wc -l`, `cat`, `head`, `tail` on output files) — never
introduce a variable or subshell just to save a few characters of typing. If a check genuinely needs
byte-offset slicing or multi-step piping that can't be written as one direct command, do it with
`Read`/`Grep` (the dedicated tools, not `Bash`) instead of a Bash one-liner with variables.

### Circuit breaker — one, across Tier 0 and the whole cascade together

Stop discovery and report honestly (see "If N isn't reached" below) once **either**:
- N companies with an actionable contact are reached — `signal_status` (`VERIFIED` or `NO_SIGNAL`)
  makes no difference to this count as of 2026-07-22 (revised — see Tier 0's signal-branch rule
  above); fit is fit, either status counts the same toward N, **or**
- 3×N distinct candidates have been evaluated through the full pipeline, **summed across Tier 0 and
  all 4 cascade tiers together** — not a separate 3×N per tier and not a separate one for Tier 0. A
  candidate only counts toward this evaluated-count once it's actually cleared a real
  `prima-icp-check` pass (see the hard rule against eyeballed filtering above) — one that never got a
  real ICP pass doesn't count as evaluated, it's a gap to close, not a data point. A run that exhausts
  Tier 0 and drops through all 4 cascade tiers without reaching either threshold reports one shortfall
  covering everything, not one message per tier.

Never pad past this ceiling by loosening ICP/exclusion criteria to manufacture a hit, and never pad it
by skipping a real `prima-icp-check` pass to wave a candidate through faster either — a shortfall is a
valid, expected outcome some runs, not a bug to hide.

## Steps 1-5 — run each existing skill exactly as it defines itself

| Step | Skill | Notes for this orchestrator |
|---|---|---|
| 1 | [`prima-icp-check`](../prima-icp-check/SKILL.md) | Classifies + excludes (existing customer, out-of-scope, ICP disqualify). A candidate excluded here stops right there — it goes toward the "excluded" bucket in the shortfall accounting, not toward N. |
| 2 | [`prima-signal-scan`](../prima-signal-scan/SKILL.md) | Formally re-verifies the signal that got the candidate discovered in Step 0 (own URL, own date) — don't just carry the Step 0 finding forward uncited. |
| 3 | [`prima-scope-score`](../prima-scope-score/SKILL.md) | **Cat4-only — check `company_category` before calling it.** `prima-icp-check` itself documents that `prima-scope-score` doesn't support `Cat3` yet (its weighted table is Cat4-only). So: **`company_category = Cat4`** → run this step normally — tier + `needs_manual_scope_confirmation`; a `disqualified_inhouse` result stops the candidate here (excluded bucket); a P1 with `needs_manual_scope_confirmation = TRUE` **keeps going** through Steps 4-5 (only `prima-draft`, never reached by this skill, is blocked by that flag) but gets flagged in the final summary (see below). **`company_category = Cat3`** → **skip this step entirely**, same as `prima-icp-check` already recommends — go straight from Step 2 to Step 4, carrying `notion_scope` (the Cat3 "Fabrication Outsourcing Scope" text `prima-icp-check` already read from Notion) forward as-is instead of a computed `outsourcing_score`/`scope_tier`. There's no in-house override to check and no anti-burn flag for these rows — `needs_manual_scope_confirmation` stays blank, same convention `prima-scope-score` itself uses for a status it never computed. |
| 4 | [`prima-committee`](../prima-committee/SKILL.md) | Sources 2-3 real contacts per company — ALTA/SECUNDARIA/FALLBACK for `Cat4` (`4B`/`4C`), or Principal/Secundario for `Cat3`, per that skill's own dictionary. **Always the path to a contact — see "Precedence" note right below.** |
| 5 | [`prima-email-waterfall`](../prima-email-waterfall/SKILL.md) | See "Contact selection" below for which contact this orchestrator actually sends through this step. |

### Precedence: `prima-committee` is always the path, never bypassed (added 2026-08-06)

This file used to describe two ways to land a contact for Step 4/5 — routing through
`prima-committee` proper, and a Deepline shortcut (`company_titles` → `ai_ark_people_search`)
described right below — without ever saying which one actually governs. That's not two equally
valid options; it's an ambiguity, and an ambiguous spec means the actual result of a run depends on
which path whoever's driving it happens to reach for. Fixed here: **`prima-committee` is always the
path.** Every candidate that reaches Step 4 goes through that skill's real process — its tiers
(ALTA/SECUNDARIA/FALLBACK or Principal/Secundario), its function-match rule, its seniority
tie-break within a tier, and its write to `output/account_roster.csv` — full stop, no exceptions for
Tier 0/cascade-sourced candidates or any other kind.

The Deepline calls described in "Known deviation" below are not a parallel shortcut that skips
committee — they are committee's own **Tier 2**, used exactly the way that skill already defines
Tier 2: only after Tier 1 (Wiza's free `wiza_search_prospects`, then WebSearch) comes up with no
verifiable name for a role, and gated by the same cost-approval step committee's Tier 2 already
requires before any paid provider call. Never call `ai_ark_people_search` (or `company_titles`) as a
first move, and never call it outside of committee's own process.

**Why:** skipping straight to a Deepline lookup throws away everything that makes a contact usable —
the tier ranking, the function-match rule (a title that doesn't say "purchasing" verbatim but
clearly buys fabrication supply), the seniority tie-break (so a junior "Buyer 1" doesn't land in the
`active` slot ahead of a real Director), and the roster write that makes the contact visible and
promotable later. All of that targeting logic lives in `prima-committee` — a shortcut that reaches
a name without going through it produces a name, not a *validated* committee contact, and this
orchestrator has no way to tell the difference downstream if both paths are allowed to produce rows.

**Known deviation, deliberate:** `prima-committee`'s Tier 2 and `prima-email-waterfall`'s provider
list still name placeholder providers (ContactOut/Lusha/RocketReach.../the findymail-first waterfall)
that were never validated against Deepline's real catalog — this is already logged as an open item in
`SPRINT2_GABY_REVIEW.md`. This orchestrator uses the **actual validated Deepline calls** confirmed
during Sprint 2 batch runs instead of those placeholder names, called *as* committee's Tier 2 (per
"Precedence" above — after Wiza and WebSearch have both come up short, and after the usual Tier 2
cost-approval step: report how many roles need this lookup and the estimated cost, wait for
explicit approval, same as committee's own Tier 2 gate):
- Committee sourcing (Tier 2 only): `company_titles` (free precheck — skip the paid call entirely if
  no relevant titles are registered for the domain) → `ai_ark_people_search` with
  `contact.function.any.include: ["purchasing"]`, size 2-3.
- Email: `hunter_email_finder` with `first_name`+`last_name`+`domain` (not `linkedin_handle` — it
  doesn't reliably match AI Ark's index). `verification.status = "valid"` → `VERIFIED`.
  `verification.status = "accept_all"` → `FOUND_UNVERIFIED`, never sendable, even though Hunter
  still returns a candidate address.
This doesn't change `prima-committee`/`prima-email-waterfall`'s own files — reconciling those is
still a separate, standing to-do — it just means this orchestrator doesn't blindly follow a provider
list nobody actually validated.

**Known limitation, not yet fixed:** `contact.function.any.include: ["purchasing"]` is narrower than
`prima-committee`'s own ALTA/PRINCIPAL function-match rule, which counts a much wider function
surface — sourcing, supply chain, commodity management, materials management, not just literal
"purchasing" (see committee's "Title matching: function, not exact string" section, and its worked
examples like "Head of Global Sourcing" or "Commodity Manager," neither of which is guaranteed to
carry AI Ark's `purchasing` function tag). This means a Tier 2 lookup run this way can silently miss
a real, valid ALTA contact that committee's own broader Tier 1 (WebSearch, phrased around the actual
function) would have caught — the gap is in this filter being narrower than the rule it's standing
in for, not in committee's rule itself. Documented here as a known gap rather than silently accepted;
widening the filter (or falling back to committee's own broader Tier 1 phrasing when this narrower
call comes up empty) is still an open to-do, not yet implemented.

## Contact selection — one contact per company reaches the deliverable

`prima-committee` may surface 2-3 real names per company; only **one** goes through
`prima-email-waterfall` and into `leads_final.csv`. Ranking is whatever `prima-committee` itself
already assigned via `priority_tier` — never re-ranked here by title string. Take the top-ranked
`active` contact off `output/account_roster.csv` for the company: the highest `priority_tier`
(`ALTA` before `SECUNDARIA` before `FALLBACK` for `Cat4`; `PRINCIPAL` before `SECUNDARIO` for `Cat3`),
using committee's own function-match rule to decide which real-world title landed in which tier —
see [`prima-committee`'s "Title matching: function, not exact string"](../prima-committee/SKILL.md#title-matching-function-not-exact-string).
Don't maintain a second, title-string-based seniority list here; if committee's tiering ever needs
refining, that's committee's file to change, not this one's. If the top-ranked contact doesn't
produce a `VERIFIED` email, try the next-ranked contact at the **same company** (cap: 2-3 attempts
per company, same as the contact cap already in `prima-committee`) before settling for its best
available result (`FOUND_UNVERIFIED` or `linkedin_url`-only).

The other 1-2 contacts `prima-committee` found are never discarded — they're written to
`accounts_processed.csv` as backup (multiple rows per company there, same as every prior batch), just
not carried into `leads_final.csv`.

## Rules that apply automatically — the vendor never has to know these exist

- Sample-first / cost-gate protocol from `prima-email-waterfall` and `prima-committee`'s Tier 2
  gate — **no standing approval, no exceptions (revised 2026-08-05, reversing the prior rule below).**
  This orchestrator always stops before spending on any paid provider: it shows how many lookups it
  needs to run and the estimated cost, then waits for the operator's explicit approval before making
  the call. This applies every time Step 4/5 would otherwise reach committee's Tier 2 or
  `prima-email-waterfall`'s paid path — not just on the first batch of a session.
  **Decision (Aldahir, 2026-08-05):** this replaces an earlier standing approval that let the
  orchestrator run Deepline calls directly without pausing, granted for a validated method over a
  narrower scope. That scope has since grown — Cat3 is now open, and the target-title dictionary is
  bigger — so the orchestrator can now reach more accounts than the original approval was scoped to
  cover. Separately, the pause has already paid for itself twice in practice: both times a run
  actually stopped to review Deepline cost, the free `wiza_search_prospects` (Tier 1, inside
  committee) turned up the name before any paid call was needed — the pause is a real checkpoint that
  catches free wins, not just friction to route around.
- Never fabricate a signal, a contact, or an email — every "no data" case is a real, correctly empty
  result, not a gap to fill with a plausible guess.
- Existing-customer exclusion, ICP disqualification, out-of-scope exclusion (`prima-icp-check`).
- The P1 anti-burn gate (`needs_manual_scope_confirmation`) — doesn't block this orchestrator's work,
  but is surfaced in the final summary so nobody drafts to one of these accounts on tier alone later.
- Corporate-email-only rule — a personal email is never written to `contact_email`/promoted to
  `VERIFIED`.
- Placeholder discipline — a company with no named contact gets no fabricated placeholder row; it
  simply doesn't count toward N (see "If N isn't reached" below).

## Output

Two files, same as every other batch, **not** a third format:

- **`output/accounts_processed.csv`** — full backup, appended (all 2-3 contacts per company, every
  column the pipeline produces). Unchanged convention.
- **`output/leads_final.csv`** — regenerated (not appended), but with a stricter shape for this
  orchestrator's runs: **exactly one row per company** (the single contact selected above), not one
  row per contact. This differs from a hand-run batch where multiple contacts per company might all
  make it into `leads_final.csv` — for `prima-generate-leads`, N companies always means N rows.
  Same 14 columns, same order, as already defined in `output/README.md` (the last 2, `stage` and
  `contact_count`, are manual sales-tracking fields — see the hard rule right below, never skip it):
  `account_name`, `company_category`, `scope_tier`, `notion_scope`, `signal_summary`,
  `signal_source_url`, `contact_name`, `contact_title`, `linkedin_url`, `contact_email`,
  `email_status`, `best_channel`, `stage`, `contact_count`.
  `company_category` and `notion_scope` (added 2026-08-06) come straight from `prima-icp-check`'s
  output — carry them through unchanged, don't recompute or reinterpret either. **`notion_scope`
  is Cat3-only in practice**: for a `Cat3` row it's the curated "Fabrication Outsourcing Scope" text
  `prima-icp-check` already read from Notion — the same value Step 3 uses in place of a computed
  score (see the table above) — so this is where that scope actually surfaces to the vendor-facing
  file instead of dead-ending after Step 3. For a `Cat4` row it's normally blank, since `scope_tier`
  (from `prima-scope-score`) is already the Cat4 answer to the same question. `scope_tier` itself is
  unchanged — still the computed tier, still Cat4-only, blank for `Cat3` rows exactly as before.

### Hard rule: merge `stage`/`contact_count`, never reset them (added 2026-07-21)

`leads_final.csv` is regenerated from scratch every run — but `stage` and `contact_count` are
**manual fields a human fills in by hand in Sheets** between runs (see `output/README.md`). A naive
full rewrite would blow that away every time this skill runs. **Before writing the new file, always**:

1. Read whatever `output/leads_final.csv` currently contains (if it exists) and build a map of
   `account_name -> {stage, contact_count}` from it.
2. Compute the fresh one-row-per-company list as normal (discovery + pipeline + contact selection).
3. For each row in the fresh list, look it up by `account_name` in that old map:
   - **Found (an account that already existed):** carry its `stage` and `contact_count` forward
     unchanged. Never overwrite real sales progress with `Not Contacted`/`0`, no exceptions.
   - **Not found (a genuinely new account this run discovered):** only then default to
     `Not Contacted` / `0`.
4. Write the merged result.

**Known limitation, not fully solved:** the match key is `account_name` (exact string), since
`leads_final.csv` doesn't carry `domain`. If an account's `account_name` string changes between runs
for the same underlying company (e.g. a rename), the merge won't recognize it as the same row and will
incorrectly default it — treat that as a real bug to catch by eye (compare row counts before/after: a
sudden jump in "new" accounts that weren't actually new is the tell), not a silently-accepted risk.

## Presentation mode — default, silent execution

This is the intended way a non-technical vendor experiences this skill — the one-line invocation
("genera 5 leads de Power & Electrical") is the whole interaction; everything else in this section
is about what does **not** get shown, not new logic. This doesn't change Steps 0-5 or the merge rule
above — it changes what surfaces to the screen while they run.

### Exception: the cost-approval pause (added 2026-08-06)

**Silence in this section means silence in the technical noise, not silence on decisions the
operator has to make.** Those are different things, and the rule below only ever covered the
first one: internal step-by-step narration, provider names, raw CSV dumps, raw verification
strings, per-account skip codes — all *detail*, none of it something the operator needs to act on in
the moment. The cost-approval pause (see "Rules that apply automatically" above — no standing
approval, ever, before a paid provider call) is not detail. It's the one point in a run where the
orchestrator genuinely cannot proceed without the operator deciding something, so it always
interrupts silent mode — it is the **only** interruption silent mode allows, and it is never
suppressed by the "run every internal step silently" rule below.

When the pause fires, show only what's needed to decide, nothing else: how many lookups it needs to
run, which provider, and the estimated cost. No raw provider payloads, no per-account breakdown, no
technical framing around it — the same restraint the rest of this section applies to everything
else, just not applied to the decision itself. Once the operator approves or declines, execution
returns to silent mode exactly as described below for the rest of the run.

**Run every internal step silently.** While discovery and Steps 1-5 execute, do not narrate or print:
- Which company is currently being processed, or the running list of candidates evaluated.
- Which Deepline provider was called for a given step (`ai_ark_people_search`, `hunter_email_finder`,
  `company_titles`, etc.) or its raw response.
- Any CSV dump, `Format-List`/table printout, or raw row-by-row view of `accounts_processed.csv`
  or `leads_final.csv` while building them.
- Raw verification strings from a provider (e.g. "Hunter source_type=generated,
  verification.status=valid...") — that detail lives in the file, not on screen.
- Per-account skip/no-match rows from `prima-committee` (`SUB_SEGMENT_NOT_SUPPORTED`,
  `ROLE_NOT_FOUND`, `SKIPPED_EXCLUDED`, `SKIPPED_UNKNOWN`) or from any other step's own status
  vocabulary. These are real, correct outcomes — they just aren't vendor-facing; they stay in the
  CSV and in the shortfall/P1 blocks of the final message where they're already accounted for.

**The only output during the run is a minimal progress indicator** — short, plain-language, no
technical nouns:

```
Buscando empresas...
Verificando contactos...
Listo.
```

Three lines like this (or similarly minimal phrasing) is the ceiling — not a per-company tick, not a
per-step breakdown, not a percentage. Its only job is confirming the run is alive, not reporting on
it.

**The only real output is the final vendor-facing block**, defined in the next section, shown once,
in full, isolated — nothing printed before it lingers on screen mixed in with it, and nothing prints
after it. The one exception is the cost-approval pause above, when a run actually reaches it — that's
not a violation of this rule, it's the interruption "Exception: the cost-approval pause" explicitly
carves out; everything else in this section still holds.

**Known technical noise — silence it at the call site, every time.** Every `deepline` CLI invocation
on Windows currently prints a startup block to **stderr** — "Deepline skills changed; syncing agent
skills...", a Node `DEP0190` deprecation warning, and `SDK skills sync failed: failed to start npx:
spawn npx ENOENT` followed by a 300+ character suggested manual command. Confirmed root cause
(2026-07-21/22): `deepline` decides whether to re-sync by checking its own internal state file
(`~/.local/deepline/code-deepline-com/sdk-cli/compat-cache.json`, field `skills.local.version`) against
the remote skills hash — that local marker can only be written by `deepline`'s own internal sync path,
which is the same path broken by the Windows `npx` spawn bug. Manually running the equivalent
`npx skills add ...` command from outside `deepline` installs the skill files correctly but does
**not** update that marker, so `deepline` keeps declaring the skills changed and keeps retrying (and
failing) the same broken internal sync on every single call — installing the skills yourself does not
fix this. It is confirmed cosmetic — stdout carries the real response cleanly every time, verified by
capturing the two streams separately; no output has ever been affected — but it prints in red to
whatever terminal is running the command, so anyone driving `prima-generate-leads` (this repo's
assistant, or a human typing `deepline` directly) must append a stderr redirect:

- Bash tool / Git Bash: `2>/dev/null`
- PowerShell tool: `2>$null`

**This applies to every `deepline` call this skill makes, automatically, with no exception** — not just
during a demo. The assistant running this skill appends the redirect itself on every `deepline`
invocation; the user never has to type anything for calls the assistant makes on their behalf. The one
case this doesn't cover: a human typing a `deepline` command directly into their own terminal (not
through this skill) has to add the redirect themselves, or they'll see the noise. Drop this rule the
day Deepline ships a fix for the Windows sync bug (tracked as a pending report — see below) — don't
carry a stale workaround once the root cause is gone.

**Pending, not yet done:** report this bug to Deepline via `deepline feedback` (or the
`deepline-feedback` skill) — the local-workaround above unblocks this repo's own use, but the actual
fix has to happen in Deepline's CLI.

**Exception — real failures.** If something genuinely fails in a way that blocks completion
(a required tool is unreachable, a file can't be read/written, etc.), surface that — but in plain
language a vendor can act on, not a stack trace or a raw error string. E.g. "No pude leer el archivo
de leads anterior — avísame antes de que siga" rather than a dumped exception. A partial/expected
outcome (shortfall in N, a P1 needing manual confirmation) is **not** a failure — that's already
handled by the normal final-message blocks below and never triggers this exception path.

## What the vendor sees at the end — plain language, not a data dump

This is the only thing most users of this skill will ever read. No column names, no jargon, no wall
of CSV.

```
Listo — batch de {N_solicitado} leads de {vertical} {cerrado u OJO}

RESULTADO
- {N_logrado} de {N_solicitado} empresas con contacto accionable
- {n_verified} con email verificado — listas para escribir directo
- {n_linkedin_only} solo con LinkedIn (sin email confirmado) — contáctalas por ahí primero
- Por señal: {desglose_por_tier}
- {n_con_senal} con señal vigente, {n_sin_senal} fit-only sin señal — ambas accionables

Archivo: output/leads_final.csv (impórtalo a tu Sheet — pasos en output/README.md)

COSTO
Esta corrida: ${costo_real} · Saldo Deepline: {saldo_creditos} créditos

{bloque de déficit, solo si N_logrado < N_solicitado — ver abajo}

{bloque de P1 pendiente de confirmación, solo si aplica — ver abajo}
```

`{cerrado u OJO}` is literally "— cerrado" when `N_logrado = N_solicitado`, or
"— no se completó el número pedido, ver abajo" when it isn't. No emoji, no tables, no technical
column names — this message is for someone who has never opened `accounts_processed.csv` and never
will.

`{desglose_por_tier}` is a plain count per cascade tier that actually produced a counted lead, e.g.
"2 por funding, 1 por capacity_expansion" — only list tiers with at least one, in the order the
cascade tried them, and skip this line entirely if every lead came from the first tier (no cascade
behavior to show, don't clutter the message for a normal run). Never mention `job_opening` or
`customs` in this line unless one of them actually produced a counted lead — dropping through a tier
empty is cascade *mechanics*, not a result the vendor needs in their face. `Tier 0` counts as its own
entry here too when it contributed a lead, e.g. "1 por Tier 0 (firmográfico), 1 por funding".

`{n_con_senal}` / `{n_sin_senal}` is the `signal_status` breakdown — **revised 2026-07-22, no longer a
separate non-counting bucket** (that was the original Option C design; Aldahir's follow-up removed the
gate: fit-only leads are now full leads, just labeled). Both numbers must sum to `{N_logrado}` exactly.
Skip this line only if every lead in the batch has the same `signal_status` (no distinction to show).

## If N isn't reached — say so, honestly, with reasons

**Never pad the output to hit the requested number.** If the circuit breaker trips before N is
reached, the deliverable has fewer than N rows and the summary says exactly that, plus why:

```
NO SE ALCANZARON LAS {N_solicitado} — se quedó en {N_logrado} empresas reales. Por qué:
- {n} ya estaban en el tracker o en corridas anteriores (no cuentan como nuevas)
- {n} se excluyeron (cliente existente / fuera de Categoría 4 / confirmado 100% in-house)
- {n} pasaron ICP y scope-score, pero ni Deepline ni WebSearch encontraron un contacto de sourcing
  localizable — ni LinkedIn ni email (esto aplica igual con o sin señal — la señal ya no decide esto)
Ninguna de las {N_logrado} de arriba se rellenó para completar el número — son las reales.
```

Every bucket in that breakdown must sum to the number of candidates actually evaluated (the
Step-0 circuit-breaker count) — if the arithmetic doesn't add up, something was miscounted, not
just under-reported.

## If any P1 needs manual scope confirmation

Add this block whenever at least one company in the batch has `priority = P1` and
`needs_manual_scope_confirmation = TRUE`:

```
OJO: {n} cuenta(s) de alto valor (P1) necesitan que confirmes tú a mano que sí subcontratan
fabricación antes de que alguien les escriba — quedaron con contacto listo, pero no se les debe
armar un draft todavía. Están marcadas en accounts_processed.csv; pregúntame si quieres la lista.
```

## What this skill does NOT do

- Does not run `prima-hook`, `prima-draft`, or `prima-guardrail-audit` — this produces a qualified,
  contactable lead list, stopping right where a human decides what to actually say to each contact.
- Does not commit or push to git on its own — same standing convention as every other batch in this
  repo; the user asks for that separately when they're ready.
- Does not run for Manu's verticals (Cooling & Thermal Management, Test & Commissioning) — asks for
  clarification instead of guessing if the request is ambiguous.
