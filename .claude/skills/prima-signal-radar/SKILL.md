---
name: prima-signal-radar
description: v0.1 — watches a caller-supplied list of already-classified accounts for fresh procurement/supply-chain job-opening signals via predictleads_company_job_openings, and appends verified hits to a unified output/signal_radar_feed.csv. Cat3/Cat4 only in v0.1 — Cat1/Cat2 accounts are logged as "watched via news" (v0.2, not built yet) because the job-category tag this skill filters on was validated 2026-08-10 to miss Cat1-style titles. Never fabricates a signal; a job opening without a source URL is discarded, never invented. Runs on a sample of 3-5 accounts first and confirms cost before a full sweep — same standing rule as every other paid-provider call in this repo. Use this when the user wants recurring/radar-style monitoring of a tracked account list, as opposed to `prima-signal-scan`'s one-time WebSearch scan of a single freshly-classified account.
---

# prima-signal-radar

**Codename "Vigilar."** The recurring watch layer on top of the one-shot pipeline: `prima-signal-scan`
scans a single account once, right after `prima-icp-check` classifies it, using WebSearch across 5
sources. This skill instead re-scans a **standing list** of accounts, repeatedly, using a paid
Deepline provider instead of WebSearch, looking for exactly one thing in v0.1 — fresh procurement
job-opening signals — and writes hits to a single accumulating feed file instead of a per-run report.
The two don't compete: `prima-signal-scan` is still what runs inside `prima-generate-leads`'s pipeline
for a newly-discovered account; this skill is what watches accounts *after* that, for buying-window
signals that show up later.

**v0.1 scope: job openings only.** Capacity-expansion news is v0.2 — not built here. Don't extend this
skill to news sources without a separate design pass; the validated source for that (`predictleads_company_news_events`)
has a real gap (no `url` field in its schema — confirmed 2026-08-10) that needs its own resolution
before it can honor this skill's `source_url`-mandatory rule.

## Why the account list is a parameter, not a file this skill reads on its own

Phase 1 scoping (2026-08-10) found that neither existing account file cleanly covers every category:
`output/accounts_processed.csv` has **zero** Cat1 or Cat3 rows (it only ever gets populated by
`prima-generate-leads`, which only runs Aldahir's two Cat4 verticals) — the only place Cat1/Cat3
accounts exist today is `output/account_roster.csv`, and that file has no `domain` column at all.
Rather than guess which file is "the" universe, this skill takes its account list as an explicit
**input parameter** — the caller assembles it from whatever combination of `account_roster.csv`,
`accounts_processed.csv`, Notion, or a hand-typed list makes sense for that run. This skill only
consumes the list; it never sources it.

## Input

A list of accounts, each with:

| Field | Required | Notes |
|---|---|---|
| `account_name` | yes | for the feed and for human-readable output |
| `domain` | yes | passed straight to `predictleads_company_job_openings` as `company_id_or_domain` — never guessed; if the caller doesn't have a confirmed domain for an account, that account is left out of the run, not filled with a guess |
| `company_category` | yes | `Cat1` \| `Cat2` \| `Cat3` \| `Cat4` — decides which branch below applies |
| `vertical` | no | carried through to the feed if the caller has it (e.g. from `prima-icp-check`'s output); left blank in the feed if not provided — never inferred |
| `sub_segment` | no | same as `vertical` — carried through if known, blank otherwise |

**Test list for this version (v0.1 validation run):**

| account_name | domain | company_category | vertical | sub_segment |
|---|---|---|---|---|
| Pennsylvania Transformer Technology (PTT) | patransformer.com | Cat4 | Power & Electrical Distribution | 4B |
| Rosendin Electric | rosendin.com | Cat3 | — | N/A-Cat3 |

## Logic, per account

### 1. Category branch

- **`Cat3` or `Cat4`** → run the job-opening collector (below).
- **`Cat1` or `Cat2`** → **do not call the collector.** Log the account in the run summary as
  `watched via news (v0.2, not implemented)` — never silently drop it from the output with no
  mention. **Why:** validated live 2026-08-10 against CoreWeave (Cat1) — `predictleads`'s own
  `purchasing` category tag returned zero hits even though CoreWeave had open "Supply Chain"-titled
  roles in the same batch; neither of those two roles was tagged `purchasing` by the provider itself.
  Cat1/Cat2's real target titles (VP Infrastructure, Director of Supply Chain, Head of Deployment —
  `prima-committee`'s `PRINCIPAL` tier) don't reliably carry the word "purchasing," and this skill has
  no function-match layer yet to catch them the way `prima-committee` does for people. Building that
  is v0.2 work, not a silent gap.

### 2. Call the provider (Cat3/Cat4 only)

`predictleads_company_job_openings` with `company_id_or_domain = domain`. No `page`/`limit` override
in v0.1 — uses the provider default (**100 results**). **Known limitation:** a company with more than
100 open reqs will have older postings invisible to this skill in v0.1; not paginating past the
default is a real coverage gap, not a decision that it doesn't matter.

### 3. Filter — a job survives only if ALL of these hold

- **Category or title match, and record which one:** `categories` array includes `"purchasing"` →
  `match_reason = "category"`; else the job title matches (case-insensitive)
  `procurement|supply chain|sourcing|purchas|buyer|commodity` → `match_reason = "title_keyword"`. If
  a job qualifies both ways, record `"category"` (the stronger, provider-native signal). The title
  fallback exists because the category tag alone is not fully reliable even inside its validated
  scope — confirmed 2026-08-10 (see "Learning" below). **`match_reason` is written to the feed
  (see Output) specifically so the keyword list can be audited with real data** — if `title_keyword`
  rows turn out to be mostly noise once we have a few real sweeps, trim the keyword list then; don't
  guess now which keywords pull their weight.
- **Not closed:** `status != "closed"`.
- **Fresh:** the resolved `signal_date` (see below) is within `FRESHNESS_DAYS = 45` of the run date.

**Learning (2026-08-10, PTT/Rosendin/CoreWeave validation run):** category-tag-only filtering worked
cleanly for Rosendin (Cat3) — both `purchasing`-tagged jobs were genuinely procurement roles and
fresh — but PTT's (Cat4) single `purchasing`-tagged hit was closed since Dec 2025, and would have
been silently treated as current without the `status`/freshness checks above. Both checks are load
-bearing, not belt-and-suspenders.

### 4. Resolve `signal_date` — `posted_at` is not reliable, use a fallback chain

Use, in order: `posted_at` → `first_seen_at` → `last_seen_at`. **Confirmed 2026-08-10:** `posted_at`
was populated in only 30/100 (PTT), 79/100 (Rosendin), and 9/100 (CoreWeave) of returned jobs across
the validation sample — treating it as always-present would silently drop real, fresh signal. Every
job in the sample had `last_seen_at` populated, so the chain always resolves to something real; never
leave `signal_date` blank if any of the three fields has a value.

### 5. Require `source_url` — hard gate, never invent

Every job in the validated sample (300/300 across the three test accounts) had a populated `url`, so
this should rarely trigger — but if a surviving job has no `url`, **discard it, do not write a row,
and do not invent one.** Note the discard in the run summary count, don't just drop it silently.

### 6. Dedup against the existing feed

Unique key: **(`account_name`, `source_url`)**. Before writing a candidate, check whether that exact
pair already exists as a row in `output/signal_radar_feed.csv`. If it does, skip it — don't duplicate,
and don't update the existing row's `status` (that column is for a human/downstream process to
change, this skill only ever writes new rows with `status = new`).

## v0.2 — News collector (Cat1/Cat2)

Runs only on `Cat1`/`Cat2` accounts that have a `domain` — this is what "watched via news" (see
"Category branch" above) resolves to now, instead of a no-op log line. It exists specifically
because the v0.1 job-opening collector doesn't work for these categories (see the "Why" note in
"Category branch") — Cat1/Cat2 accounts buy infrastructure directly and self-fund/self-build, so the
signal that actually indicates a buying window is a capacity/expansion or financing announcement, not
a procurement job posting.

### 1. Search — 2 WebSearch queries per account, free

- **Capacity/expansion query:** `"{account_name}" data center capacity expansion OR new facility OR
  new campus`
- **New plant / funding query:** `"{account_name}" groundbreaking OR "new site" OR financing OR
  funding data center construction`

No paid provider here — `predictleads_company_news_events` was already ruled out (no `url` field in
its schema, confirmed 2026-08-10, see the note near the top of this file) and nothing has replaced it
yet. WebSearch is free, so there's no cost gate on this step itself — the cost gate that matters for
this skill is still the v0.1 provider call, unaffected by this section.

### 2. Keep a result only if ALL THREE hold

- **(a) Real article URL.** No URL → discard, never invent one. Same hard rule as v0.1's `source_url`
  gate, same reasoning.
- **(b) BUILDOUT signal, not demand-side.** Counts: new capacity announced, a named plant/site,
  self-build, or financing **explicitly earmarked for the physical facility** — land, civil works,
  power/substation, construction. Does **not** count: cloud contracts, ARR/revenue figures, stock
  moves, GPU counts/inventory, or any other demand-side news that doesn't describe the account
  building or funding physical infrastructure. **Financing needs the same test — what is the money
  actually for, not just that money changed hands.** A GPU-backed loan (or any equipment/working-capital/
  capital-markets financing) finances compute, not the electrical/civil work — it is **not** a buy
  window for Prima, even when the headline number is large and the source is primary. Confirmed
  2026-08-11: CoreWeave's $3.1B GPU-backed DDTL loan facility was initially miscounted as BUILDOUT —
  it funds GPU acquisition/balance-sheet capacity, not a facility, and was corrected to a drop. Use
  this as the standing example of what financing does **not** qualify.
- **(c) Fresh.** Event/article date within `FRESHNESS_DAYS_NEWS = 180` of the run date — a separate
  constant from v0.1's `FRESHNESS_DAYS = 45` for job postings, deliberately much wider. **Why:** a
  vacancy expires fast — once it's filled or pulled, the buying window it implied is gone. A buildout
  doesn't work that way: an announced campus expansion (e.g. a 1.5GW build) leaves the electrical
  buy-window open for many months while the project moves through land/power/construction, not 90
  days. Confirmed 2026-08-11: at `90`, Core Scientific's Pecos (1.5GW, ~2026-04-27, ~106 days old) and
  Muskogee (1.5GW, ~2026-05-06, ~97 days old) expansions were both dropped for being 7-16 days over the
  line — while still being live, multi-hundred-million-dollar buy-windows. `180` was chosen to cover
  that gap without being unbounded; still excludes genuinely old news (e.g. a Denton, TX announcement
  from Feb 2025 stays correctly dropped at either window).

### 3. Drop list — explicit exclusions, not just "low quality"

Social media (X, Reddit), directory listings (e.g. Baxtel), the company's own product/marketing
pages (not a news event), SEO/opinion blogs with no primary event cited, and anything stale or
demand-side per (b)/(c) above.

### 4. Dedup by EVENT, not by URL

Unlike v0.1's exact-match `(account_name, source_url)` key, the same real-world announcement
routinely gets covered by multiple outlets with different URLs — deduping by URL alone would write
the same event to the feed several times. Group candidate results that describe the same
announcement (same account, same facility/round, same approximate date) and keep **one** row,
priority order when more than one source covers it:

1. Primary source (company's own IR page, official press release, SEC filing)
2. Specialized trade press (DataCenterDynamics, Bloomberg, Reuters, CoinDesk)
3. Aggregator (anything else)

This is a judgment call, not a strict key match like v0.1's — say so in the run output when a dedup
decision was non-obvious, don't silently pick one.

### 5. Classify self_build vs colo — the test is "does THIS account buy the physical infrastructure?"

Not "does the article say lease" — **`lease` is directionally ambiguous on its own** and will
misclassify if read literally. The account leasing space *from* a landlord is the tenant, not the
buyer — that's `colo`. The account building the facility and leasing capacity *out* to a customer is
the one buying the infrastructure — that's `self_build`, and a strong signal, regardless of the word
"lease" appearing in the article. Concretely: Core Scientific signing "529MW lease agreements" with
AMD is Core Scientific **building and leasing outward** — Core Scientific is the buyer of the
infrastructure → `self_build`. CoreWeave leasing space *inward* at an EdgeConneX campus is CoreWeave
as the tenant — EdgeConneX is the buyer → `colo`, lessor = EdgeConneX.

Mark in `signal_detail` whether the buildout is `self_build` or `colo` for **the account this row is
about**. **If `colo`: note `"colo — comprador probable: <lessor>"` in `signal_detail`, and do not add
the lessor as a new account anywhere** — the lessor isn't the buyer, it's the landlord; conflating the
two would misattribute the buying signal.

### 6. Output — same `output/signal_radar_feed.csv`, `signal_type = "news"`

Same 13-column schema as v0.1 (see "Output" below) — no new columns, no separate file:

- `signal_type` = `"news"`
- `signal_detail` = one factual line describing the event, including the `self_build`/`colo` marker
  **and always a geo tag** — e.g. `"geo: TX, US"` or `"geo: South Australia (offshore)"`. Mandatory,
  every row, not just offshore ones. **Why:** a `baja` from being offshore and a `baja` from being a
  garbage/aggregator-only source look identical without it — confirmed 2026-08-11 when reviewing the
  first sample, where an offshore `baja` (IREN, real primary-source self-build signal, just not NA)
  was indistinguishable at a glance from a low-quality `baja`. The geo tag is what lets a human
  re-sort those two cases apart later without re-reading every source.
- **`signal_detail` must be a faithful transcription of what the cited `source_url` actually says —
  nothing enriched, no inferred construction status, no detail added that isn't in that specific
  source.** If a fact (construction progress, dollar amount, date) isn't in the source you're citing,
  it doesn't go in the row — full stop, even if it's true and you found it somewhere else; cite that
  other source separately instead of blending it in. **Standard example of what NOT to do (caught
  2026-08-11):** a Core Scientific Pecos row cited `investors.corescientific.com/.../detail/134`
  (2026-04-27, which only announces the *plan* to scale to 1.5GW) but the `signal_detail` also claimed
  "foundational footings set, precast concrete walls arriving on site" — a live-construction detail
  that isn't in that press release and wasn't verified in any other cited source. It came from a
  WebSearch summary blending multiple results together, not from the specific URL in the row. Caught
  on operator review, not caught before writing — a reminder that WebSearch's synthesized answer text
  is not itself a verified source; only what the cited URL actually says is.
- `source_url` = the chosen (post-dedup) article's URL
- `signal_date` = the event/article date
- `match_reason` = blank for news rows — that column exists specifically to audit v0.1's job-title
  keyword fallback; it doesn't apply here
- `relevance_conf` = `"alta"` \| `"media"` \| `"baja"`, per this rule:
  - **`alta`** — primary source AND (`self_build` or a named plant) AND North America (NA)
  - **`media`** — specialized press AND funding/pipeline-stage (not yet confirmed under construction)
  - **`baja`** — offshore (outside NA) OR sourced only from an aggregator. **Offshore still gets kept
    in the feed at `baja` for now — this rule only sets the confidence tier, it doesn't drop the row.**
    Whether offshore signal should be dropped outright instead of just down-weighted is a separate,
    open decision — not resolved here.

## Safeguards (hard rules)

These are non-negotiable — each is elaborated where cross-referenced, this is the consolidated list:

- **`source_url` is mandatory.** A job opening with no `url` is discarded — never written to the feed,
  never invented. See step 5 above.
- **Dedup against the existing feed, always.** Unique key `(account_name, source_url)` — never
  re-add a pair already in `output/signal_radar_feed.csv`, and never rewrite an existing row's
  `status`. See step 6 above.
- **Never invent or fill in missing data.** A field this skill can't resolve from the provider's real
  response (e.g. no `vertical` was given in the input, or none of `posted_at`/`first_seen_at`/
  `last_seen_at` were present) is left blank in the output — never guessed, never defaulted to a
  plausible-looking value.
- **Sample-first, every time, no standing approval.** Never run more than 5 accounts against
  `predictleads_company_job_openings` without first running a 3-5 account sample, reporting the exact
  cost, and getting explicit approval — see "Sample-first / cost protocol" below. A prior approval
  from an earlier session or an earlier sweep never carries over to a new one.

## Output — append to `output/signal_radar_feed.csv`

Accumulative, never regenerated — same convention as `output/account_roster.csv`. Create with headers
only if the file doesn't exist yet.

| Column | Value |
|---|---|
| `account_name` | from input |
| `company_category` | from input |
| `vertical` | from input, blank if not provided |
| `sub_segment` | from input, blank if not provided |
| `signal_type` | always `job_posting` in v0.1 |
| `signal_detail` | the job title, verbatim from the provider — never a paraphrase or an added claim |
| `source_url` | the job's `url` — mandatory, see hard gate above |
| `signal_date` | resolved per the fallback chain above, ISO date |
| `detected_date` | the date this run executed |
| `freshness_days` | `detected_date - signal_date`, in days |
| `relevance_conf` | always `1.0` in v0.1 — job-opening hits aren't scored/weighted yet |
| `match_reason` | `"category"` (matched `categories` includes `"purchasing"`) or `"title_keyword"` (only matched the title fallback) — added 2026-08-10 so the keyword list can be tuned against real sweep data instead of guessed upfront |
| `status` | always `new` on write — this is a lifecycle column a human/downstream process updates afterward (e.g. to `reviewed`, `actioned`, `dismissed`); this skill never sets anything but `new` and never touches it on an existing row |

One row per surviving, deduped job opening. An account that returns zero surviving jobs (after
filtering and dedup) gets **no row at all** in this file — `prima-signal-radar` isn't `prima-signal-scan`,
it doesn't emit an explicit `NO_SIGNAL` placeholder row; the account simply isn't mentioned in the
feed for this run, and the run summary (below) is where "zero signal this run" actually gets reported
to a human.

## Coverage — append to `output/signal_radar_sweeplog.csv`

The feed only records signals; it says nothing about which accounts were actually checked, which
breaks down the moment this runs continuously/recurring (a future mode this skill is being built
toward) — silence in the feed is ambiguous between "checked, nothing found" and "never checked this
sweep." This second file exists purely for coverage, separate from signal content.

Accumulative, append-only — never regenerated and never deduped against itself, unlike the feed: a
re-run of the same account produces a new row, so the file builds a timeline of every sweep over
time. Create with headers only if the file doesn't exist yet.

| Column | Value |
|---|---|
| `account_name` | from input — every account in the input list gets a row every run, `Cat1`/`Cat2`
included (they were still looked at by this sweep, just routed to "watched via news" instead of the
collector) |
| `checked_at` | the date/time this run checked the account |
| `signals_found` | count of new rows this account contributed to `signal_radar_feed.csv` this run
(post-filter, post-dedup) — `0` for `Cat1`/`Cat2` accounts (collector never ran), `0` for `Cat3`/`Cat4`
accounts where nothing survived the filter or everything was already in the feed |

## Sample-first / cost protocol — no standing approval, same rule as every other paid call here

Never run the full account list against `predictleads_company_job_openings` on the first pass in a
session. Before any run larger than 5 accounts:

1. Run a sample of **3-5 accounts** first.
2. Report: how many accounts, at **0.56 Deepline credits ($0.056) per account**, and the total
   (e.g. "5 cuentas × $0.056 = $0.28").
3. Wait for explicit approval before running the rest of the list.

This mirrors `prima-committee`'s Tier 2 gate and `prima-generate-leads`'s standing rule — no
exceptions, not even for a short list, and a prior approval in an earlier session never carries over.

## Run summary — what a human sees at the end

Plain per-account breakdown, not a raw CSV dump:

```
{account_name} ({company_category}): {n_fetched} vacantes traídas, {n_filtered} pasaron el filtro,
{n_new} nuevas escritas al feed ({n_deduped} ya estaban), {n_discarded_no_url} descartadas sin URL.
```

For every `Cat1`/`Cat2` account in the input list: `{account_name} (Cat1/Cat2): watched via news
(v0.2, not implemented) — vacantes no corridas.`

## What this skill does NOT do (v0.1)

- Does not check capacity-expansion news, funding, target-title presence, or customs — those stay
  `prima-signal-scan`'s job for now; this is job-openings-only.
- Does not run the job-opening collector for `Cat1`/`Cat2` — see "Category branch" above.
- Does not paginate past the provider's default 100 results per account.
- Does not decide who gets contacted or drafted — this only populates a signal feed; `prima-committee`/
  `prima-hook`/`prima-draft` are separate, downstream steps a human still triggers.
- Does not read `account_roster.csv`/`accounts_processed.csv`/Notion itself to build its own account
  list — see "Why the account list is a parameter" above.
