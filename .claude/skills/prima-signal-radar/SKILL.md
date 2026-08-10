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
