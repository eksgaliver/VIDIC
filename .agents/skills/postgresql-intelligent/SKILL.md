---
name: postgresql-intelligent
description: Expert PostgreSQL database design, relational modeling, index optimization, query tuning, and zero-downtime migrations. Use when designing schemas, writing SQL queries, diagnosing slow queries, or configuring database relationships.
---

# PostgreSQL Intelligent

Production-grade relational database design, indexing strategy, and query performance guidelines for PostgreSQL.

## 1. Schema Design & Data Integrity

- **Primary Keys**:
  - Prefer `UUIDv7` (time-ordered UUID) for distributed systems, public IDs, and high-throughput write tables to prevent B-tree fragmentation.
  - Or use `BIGINT GENERATED ALWAYS AS IDENTITY` for purely internal join tables and sequences.
- **Strict Foreign Key Constraints**:
  - Always declare foreign keys with explicit cascade behavior: `ON DELETE CASCADE` or `ON DELETE RESTRICT`.
  - Always add a B-tree index on foreign key columns—Postgres does NOT index foreign keys automatically, leading to full table scans on parent deletions/updates.
- **Constraints Over Application Logic**:
  - Use `CHECK` constraints for enumerated states, numerical ranges (`amount > 0`), and valid email/URL formats.
  - Use `TIMESTAMPTZ` (UTC) for all timestamps; avoid bare `TIMESTAMP`.
  - Prefer `NOT NULL` with sensible defaults. Treat `NULL` as intentional absence, not empty string.

## 2. Strategic Indexing

- **Index Types**:
  - **B-tree (default)**: For equality, range (`<`, `<=`, `>=`, `>`), `BETWEEN`, `IN`, and `ORDER BY`.
  - **GIN**: For `JSONB` columns (`jsonb_ops` or `jsonb_path_ops`), full-text search (`tsvector`), and array operations (`@>`).
  - **BRIN**: For naturally sorted, append-only append tables (e.g. audit logs, timeseries) with millions of rows.
- **Composite Index Column Order**:
  Place columns in the order:
  1. Equality filter columns (`tenant_id = ?`)
  2. Range / inequality filter columns (`created_at >= ?`)
  3. Sort / ORDER BY columns
- **Partial Indexes**:
  Index only the rows you actually query to save storage and write overhead:
  ```sql
  CREATE INDEX idx_orders_unprocessed 
  ON orders (created_at) 
  WHERE status = 'pending';
  ```
- **Index-Only Scans**:
  Use `INCLUDE (column1, column2)` to add payload columns to index leaves, satisfying queries directly from the index without table page lookups.

## 3. Query Optimization & Diagnostics

- **EXPLAIN (ANALYZE, BUFFERS)**:
  Always inspect query execution plans for slow queries:
  - Check for `Seq Scan` on tables with > 10,000 rows.
  - Watch `Rows Removed by Filter` (indicates missing index).
  - Check `Buffers: shared hit=... read=...` to assess disk I/O.
- **Anti-Patterns to Eliminate**:
  - Avoid `SELECT *`: Retrieve only required columns.
  - Avoid wrapping indexed columns in functions in WHERE clauses (e.g., `WHERE LOWER(email) = ?` defeats an index on `email` unless an expression index `CREATE INDEX ... (LOWER(email))` exists).
  - Avoid unbounded `OFFSET`: For pagination on large tables, use keyset pagination (`WHERE id > :last_id LIMIT :n`).

## 4. Concurrency & Queue Patterns

- **Job Queues with `FOR UPDATE SKIP LOCKED`**:
  ```sql
  WITH next_job AS (
    SELECT id FROM jobs
    WHERE status = 'pending'
    ORDER BY priority DESC, id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE jobs
  SET status = 'processing', started_at = NOW()
  WHERE id = (SELECT id FROM next_job)
  RETURNING *;
  ```
- Keep transactions short and focused to minimize lock contention. Never perform network I/O or external API calls inside an open database transaction.

## 5. Zero-Downtime Migrations

- Create indexes on production tables with `CREATE INDEX CONCURRENTLY`.
- When adding columns, PostgreSQL 11+ supports adding columns with constant defaults without rewriting the table.
- When renaming columns, follow the expand-and-contract pattern across releases rather than immediate renames.
