---
name: Assignment system
description: Full DB-backed assignment tracking for BrandEx agents; table schema, API endpoints, UI layout
---

## Table

```sql
CREATE TABLE assignments (
  id           SERIAL PRIMARY KEY,
  trademark_id INTEGER NOT NULL REFERENCES trademarks(id) ON DELETE CASCADE,
  agent_name   VARCHAR(50)  NOT NULL,   -- UZMA | FASIAL | RASHID | SULMAN
  agent_city   VARCHAR(20)  NOT NULL,   -- KARACHI | LAHORE | ISLAMABAD
  assigned_at  TIMESTAMP    DEFAULT NOW(),
  completed_at TIMESTAMP,
  status       VARCHAR(20)  DEFAULT 'Pending',  -- Pending | In Progress | Complete
  notes        TEXT,
  UNIQUE(trademark_id)  -- one active assignment per trademark
);
```

## Auto-migration on startup

`autoMigrateAssignments()` in `api/db.js` parses `class_desc` on API start for patterns like "FASIAL (LHR)". City abbrevs: KHI/KAR=KARACHI, LHR=LAHORE, ISB/ISL=ISLAMABAD. Runs ON CONFLICT DO NOTHING so it's safe to re-run.

## API endpoints (api/index.js)

- `GET /api/assignments?agent=&city=&status=` — filtered list joined with trademarks
- `GET /api/assignments/unassigned` — stage=ASSIGNED but no assignment record (used for unassigned queue)
- `GET /api/assignments/stats` — totals + by_agent breakdown + unassigned count
- `POST /api/assignments` — create; body: `{trademark_id, agent_name, agent_city, notes}`; upserts on conflict
- `PATCH /api/assignments/:id` — update status/notes/agent; auto-sets completed_at on Complete
- `DELETE /api/assignments/:id` — remove

## Frontend (app.js)

- `renderAssignmentTab()` — async; fetches stats+assignments+unassigned in parallel; renders stats row, agent cards (clickable filter), filter bar (status + city), table with complete/reassign/remove actions, unassigned queue section
- `assignmentFilter` — `{agent, status, city}` state object; filtered client-side after fetch
- `openAssignModal(trademarkId, tmNo, appName, assignId?, agent?, city?, status?)` — works for both new assign and reassign
- `saveAssignment()` — POST or PATCH depending on editingAssignmentId
- `completeAssignment(id)` — PATCH status=Complete
- `removeAssignment(id)` — DELETE

**Why:** Stage hierarchy panel was removed per user request; replaced with live DB-backed tracking.
