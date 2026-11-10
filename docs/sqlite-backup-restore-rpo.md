# SQLite pilot backup / restore (RPO ≤ 15 min) + Postgres migration design

**Status:** Eng design for D05 — does **not** flip live money. Aloke still signs SQLite pilot risk **or** Postgres cutover before go-live.

**Product locks unchanged:** Ontario demo · money/PII/affiliate gates OFF · never-auto fail-closed · rent/deposits never Deskulpt.

---

## 1. Current store

| Item | Value |
| --- | --- |
| Engine | Node `node:sqlite` (`DatabaseSync`) |
| Default path | `data/deskulpt.sqlite` (override `DESKULPT_DB_PATH`) |
| Topology | Single-writer file DB — fine for synthetic demo / single instance |
| Audit | Compliance events + hash-chained `append_only_audit_ledger` (UPDATE/DELETE blocked) |

---

## 2. Backup plan (RPO ≤ 15 minutes)

### 2.1 Hot online backup (preferred)

1. Every **5–10 minutes** (cron / systemd timer / CF Cron → origin job):
   ```bash
   sqlite3 "$DESKULPT_DB_PATH" ".backup '$BACKUP_DIR/deskulpt-$(date -u +%Y%m%dT%H%M%SZ).sqlite'"
   ```
   `.backup` is consistent under concurrent readers/writers for SQLite WAL.
2. Enable WAL if not already:
   ```sql
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=NORMAL;
   ```
3. Keep **rolling 24h** of 5–10m snapshots + **daily** copy retained 30d.
4. Ship copies off-box (OCI Object Storage / S3) with server-side encryption. Audit ledger tip hash recorded in backup manifest:
   ```json
   { "takenAt": "...", "dbPath": "...", "ledgerTipHash": "sha256:…", "bytes": 123 }
   ```

### 2.2 Continuous (optional for pilot)

- Stream WAL pages via Litestream (or equivalent) to object storage → **RPO seconds**.
- Still keep periodic `.backup` for restore drills.

### 2.3 Restore drill (RTO target ≤ 60 min for pilot)

1. Stop app writers.
2. Restore latest good snapshot to `DESKULPT_DB_PATH`.
3. Run `verifyAppendOnlyLedger(getDb())` — must return `{ ok: true }`.
4. Smoke: login, compliance console read, demo checkout (demo provider).
5. Record drill in ops log (date, snapshot id, tip hash, duration).

**Acceptance:** two successful restores in 30 days before any live-money evidence gate closes.

---

## 3. What SQLite must not carry into live money

Even with ≤15m RPO:

- No multi-region active-active.
- No durable WORM / Object Lock — ledger is tamper-*resistant*, not compliance-grade WORM.
- Single instance write lock — scale-out needs Postgres (or equivalent).

Aloke decision: accept SQLite pilot limits **or** cut over before live settlement.

---

## 4. Postgres migration design (cutover sketch)

### 4.1 Target shape

| Concern | Approach |
| --- | --- |
| OLTP | Managed Postgres (OCI Postgres / Neon / RDS) in CA region for Deskulpt Inc |
| Tenancy | `tenant_id` on all landlord rows (already present in SQLite schema) |
| Audit | Same append-only hash chain; optionally logical replication → immutable object store |
| Files / media | Object storage (not DB BLOBs) — already path-based |
| Edge | Cloudflare front door; origin holds Postgres |

### 4.2 Mapping

1. Inventory tables from `lib/db.ts` bootstrap DDL.
2. Emit idempotent SQL migrations (`001_init.sql` …) — SQLite types → Postgres (`TEXT`→`uuid`/`text`, `INTEGER` money cents stay `bigint`).
3. Dual-write **not** required for pilot → **expand/contract**:
   - Phase A: stand up Postgres empty schema + migrate tooling (`pgloader` or custom script).
   - Phase B: maintenance window — dump SQLite → transform → load; freeze writes ≤ RPO window.
   - Phase C: flip `DATABASE_URL`; keep SQLite snapshot sealed for 30d.
4. Feature flags / meta keys migrate as rows; compliance ledger tip hash must match post-load verify.

### 4.3 App seam

- Introduce `lib/db/driver.ts` with `query` / `exec` / `transaction` over SQLite **or** `pg`.
- Env: `DESKULPT_DB_DRIVER=sqlite|postgres` (default sqlite until cutover).
- No live money until driver=postgres **or** Aloke SQLite pilot sign-off + backup drills green.

### 4.4 Cutover checklist (evidence, not a global switch)

- [ ] Schema parity test (row counts + checksums per table)
- [ ] Ledger chain verify on Postgres
- [ ] Backup/restore drill on Postgres (PITR ≤ 15m)
- [ ] Demo MCP still fail-closed; go-live money evidence still per-feature
- [ ] India money parked; Connect DIRECT-only invariants unchanged

---

## 5. Ops env (proposed)

```bash
# Pilot
DESKULPT_DB_PATH=./data/deskulpt.sqlite
DESKULPT_BACKUP_DIR=/var/backups/easyrental
DESKULPT_BACKUP_CRON="*/10 * * * *"

# Future
# DESKULPT_DB_DRIVER=postgres
# DATABASE_URL=postgres://…
```

---

## 6. Residual (honest)

- Object-lock / KMS WORM for audit = Aloke hosting decision (not this doc).
- Litestream vs cron `.backup` = ops preference; cron alone meets ≤15m if interval ≤10m and restore tested.
- This document is **design acceptance**, not go-live certification.
