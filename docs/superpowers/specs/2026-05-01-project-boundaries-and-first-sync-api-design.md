# Project Boundaries And First Sync API Design

## Summary

This design covers two tightly related decisions:

1. Define project-level instruction boundaries so product context lives at the repository root instead of being mixed into backend-only guidance.
2. Define the first external sync API that the future frontend will call to fetch recent forum changes and request targeted backfill when its local processing state falls behind.

This design does not cover the full forum implementation, robot posting behavior, notification product flows, user-claim features, or historical data migration. Those remain important project context, but they are out of scope for this first spec.

## Product Context

The project is a forum sandbox built around mirrored data from the BYR BBS. The eventual frontend is intended to feel like a complete forum, including posting, replying, display, notifications, and login-related experiences. However, the most important participants in the sandbox are not ordinary users. They are robot identities created from backend-collected BYR data.

Real users and robot actors coexist in the sandbox:

- The frontend periodically requests data from the backend.
- The frontend transforms backend data into forum content and automatically posts on behalf of robot actors.
- Robot activity can trigger in-forum notifications.
- A real user may receive notifications by binding to a robot inbox for the current day.
- Future features may allow users to claim a mirrored post or reply without binding to a robot inbox.

This product context should be visible to all future modules, not only the backend.

## Repository Instruction Boundaries

### Root `AGENTS.md`

Add a repository-root `AGENTS.md` to hold facts and collaboration rules that apply across the entire project.

It should include:

- The project is a sandbox forum built around mirrored BYR forum activity.
- Robot actors are first-class participants, not implementation detail.
- Anonymous notification is one of the main product motivations.
- The frontend is responsible for organizing backend data and creating robot-authored forum activity.
- Real-user posting permissions are undecided and should not be assumed by downstream modules.
- BYR source content may disappear over time because old threads can be deleted by the source forum.
- Historical data migration from an older PostgreSQL and Prisma pipeline is expected before launch, but not part of the current implementation scope.

It should avoid low-level backend specifics such as request endpoints, parsing details, DOM structure, or crawler-only recovery rules.

### `backend/AGENTS.md`

Keep `backend/AGENTS.md`, but narrow it to backend concerns.

It should include:

- Backend responsibilities: authentication, collection, short-term cache management, and external sync APIs.
- The backend is not the place to define forum product policy, robot-user social behavior, or notification UX.
- The backend may assume source threads can disappear and should avoid hard assumptions that previously seen content remains fetchable forever.
- The backend should optimize for stable collection and reproducible sync semantics.

It should remove or move upward:

- Full product vision for the sandbox forum.
- Rules about how real users and robots interact at the product level.
- Notification binding product ideas.
- Future claim/ownership feature ideas.

### Subdirectory Guidance

As the codebase grows, module-local `AGENTS.md` files should contain only module-specific facts:

- `backend/src/byr_auth/AGENTS.md`: login, cookies, session assumptions.
- `backend/src/byr_boards/AGENTS.md`: board listing rules and parsing facts.
- `backend/src/byr_threads/AGENTS.md`: thread parsing rules, pagination, reply extraction.
- Future `frontend/AGENTS.md`: rendering, posting, notification, and client-side sync behavior.

The rule is simple: global context belongs at the root, implementation-local context belongs beside the implementation.

## First External API Goal

The first external API is for the future frontend, not for arbitrary third parties.

Its purpose is to let the frontend:

- Poll for recent mirrored changes from one high-priority board.
- Receive enough reply data to immediately continue robot posting and notification handling.
- Request targeted backfill for a specific thread when the frontend discovers its own processing cursor is behind the backend's incremental result.

This API is intentionally designed around a single-board first release so the end-to-end path can be validated before expanding scope.

## First External API Shape

The first release should expose a minimal pair of sync endpoints rather than a single all-purpose endpoint.

### 1. Main Pull Endpoint

This endpoint is the normal polling path used by the frontend on a fixed cadence.

Behavior:

- Protected by lightweight server-side token authentication.
- Defaults to one supported board for the first release.
- Uses a backend-owned default time window `y`.
- Returns threads with recent changes plus the newly observed replies needed by the frontend to continue processing.
- Supports a small set of narrowing parameters such as `limit`.

Important semantic choices:

- The frontend should be able to call this endpoint without providing a time cursor.
- The backend, not the client, owns the default incremental window.
- The response is not a full board snapshot.
- The response is also not only thread metadata, because the frontend needs reply content immediately to drive robot posting.

### 2. Targeted Backfill Endpoint

This endpoint is only for repair and resynchronization when the frontend detects that its local processing state is behind.

Example:

- The backend cache indicates that a thread already has at least 23 known replies.
- The backend optimizes collection accordingly and returns only replies after that point in the normal incremental result.
- The frontend discovers it has only safely processed through reply 21.
- The frontend sends a targeted backfill request for that thread starting from reply 22.

Behavior:

- The frontend names the thread explicitly.
- The frontend requests a rewind point explicitly.
- The backend returns replies from the requested point forward, subject to a maximum rewind window.
- The endpoint is not a general-purpose thread export. It is a controlled repair path.

This keeps the main loop simple while still giving the frontend a clean escape hatch when its local state drifts.

## Why Not Add A General Consumption-Ack API Yet

A generic "processed" or "consumed" callback API is intentionally out of scope for the first release.

Reasons:

- It would force the first release to define a broader sync state machine than is currently necessary.
- The main pull plus targeted backfill pair is enough to get the loop running.
- The frontend is the primary orchestrator in this design and can decide when it needs backfill.
- Acknowledgement semantics can be added later after real failure patterns are observed.

This is a deliberate simplification, not an omission.

## Cache Strategy

The backend should use Redis as a short-lived sync cache. It is not the final product database.

Goals:

- Avoid repeatedly crawling from the first page for active threads.
- Preserve short-term thread progress so incremental sync can start from a later point.
- Support targeted backfill for threads that are still within the active cache window.

The intended cache window is about three days.

That three-day value is a cache-retention policy, not a business anomaly rule.

Implications:

- Active-thread cache entries expire automatically after about three days.
- If a thread becomes active again after its cache entry expires, the backend crawls it normally.
- In that case the backend may return a wider range of replies than usual because the old short-term baseline is gone.
- This wider return is acceptable behavior, not an exceptional error.
- The frontend must handle duplicate or wider-than-usual reply ranges idempotently.

## Suggested Redis State Model

The first implementation only needs enough Redis structure to support incremental sync and controlled backfill.

Suggested categories:

- Active thread index for the single supported board.
- Per-thread progress summary, such as last known reply count or equivalent cursor.
- Per-thread short-lived reply summary needed to assemble backfill payloads without fully re-deriving everything every time.
- Optional short-lived lock or dedup keys if concurrent pulls must be controlled.

The exact key names are implementation detail and should be chosen later, but the cache model should stay intentionally small.

## Backend Collection Semantics

The backend remains responsible for normal authenticated crawling.

Collection flow:

1. Fetch recent board changes using existing collection capabilities.
2. Use Redis progress to avoid starting from the earliest possible thread page when enough recent state is known.
3. Produce incremental reply payloads for the main pull endpoint.
4. Answer targeted backfill requests by reusing cached progress plus normal thread crawling.

The backend should treat its crawler as the source of truth for current thread contents. The cache only helps narrow work and stabilize sync behavior.

## Frontend And Backend Responsibility Split

The frontend is the primary orchestrator.

Frontend responsibilities:

- Poll the main endpoint on a fixed schedule.
- Transform returned data into robot-authored forum activity.
- Detect when local processing state is behind.
- Request targeted backfill for a specific thread when needed.
- Handle duplicate or wider-than-usual payloads safely.

Backend responsibilities:

- Authenticate against BYR.
- Crawl boards and threads.
- Maintain a short-lived Redis sync cache.
- Provide the main incremental pull response.
- Provide controlled per-thread backfill.
- Enforce lightweight token authentication and rewind safety limits.

This split keeps the backend focused on stable data delivery rather than turning it into a workflow engine too early.

## Errors And Recovery

The first API design should distinguish a few clear failure categories.

Main pull endpoint:

- Invalid or missing token.
- Invalid request parameters.
- Source crawl failure.
- Cache unavailable or inconsistent.

Targeted backfill endpoint:

- Invalid or missing token.
- Unknown thread identifier.
- Requested rewind point exceeds allowed backfill limits.
- Requested rewind point predates recoverable cached context.
- Source crawl failure during repair.

Errors that can be retried should be recognizable by the frontend. Errors that require operator attention should be explicit rather than hidden behind empty success responses.

## Testing Focus

The first implementation should emphasize sync semantics over UI behavior.

Minimum coverage:

1. Main pull returns recent changed threads and their new replies using the backend default window.
2. Redis-backed progress allows the backend to avoid always starting from the earliest available thread page.
3. Targeted backfill returns replies beginning from a client-requested rewind point.
4. Overly deep rewind requests are rejected clearly.
5. Expired cache entries cause wider normal responses rather than protocol failure.
6. Duplicate reply delivery can be handled safely by the contract expected of the frontend.

## Non-Goals

This design does not define:

- Full frontend information architecture.
- Whether real users are allowed to post directly.
- Notification product UX.
- Robot identity lifecycle.
- Historical PostgreSQL migration mechanics.
- Final persistent data model for the whole forum product.

Those items should be handled in later specs after this narrower boundary is implemented and proven.
