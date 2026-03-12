# ADR 001: Hexagonal Isolation via Bridge Adapters

## Status: Accepted
## Context
Alistair Cockburn's Bowling Alley Challenge requires 4 applications to connect via hexagons without any hexagon importing another hexagon's code.

## Decision
We will use **Bridge Adapters** in the `front-desk` app. The `front-desk` defines driven ports that match the *shape* of the other apps, and `bridges.ts` implements these ports by delegating to the actual driving ports of the `player-registry`, `lane-manager`, and `scoring-engine`.

## Consequences
- **Pros**: Complete decoupling of hexagons. We can change the `scoring-engine` implementation (Phase 2) without touching the `front-desk` domain logic.
- **Cons**: Requires boilerplate translation code in `bridges.ts`.

---

# ADR 002: In-Memory Storage for Walking Skeleton

## Status: Accepted
## Context
Phase 1 requires a "walking skeleton" that runs end-to-end on first try.

## Decision
All hexagons will use `InMemoryStorage` adapters.

## Consequences
- **Pros**: Zero infrastructure overhead, fast tests, guaranteed portability.
- **Cons**: Data is lost on restart. Porting to a real DB will require new adapters but NO domain changes.

---

# ADR 003: Pure Domain Logic (No Dependencies)

## Status: Accepted
## Context
Architectural rule: Domain files must have zero external dependencies.

## Decision
All domain logic (e.g., `scoring.ts`) is implemented as pure functions or dependency-free classes. They only import from `src/shared/types.ts`.

## Consequences
- **Pros**: High testability, zero risk of framework lock-in.

---

# UNVALIDATED DECISIONS

| Decision | Risk | Validation Strategy |
|----------|------|---------------------|
| **Single Composition Root** | If `main.ts` becomes too complex, wiring 4+ hexagons will be hard to maintain. | Monitor `main.ts` size as we add HTTP and more features. |
| **No Persistence Bridge** | Shared types (IDs) are strings. If we move to GUIDs or DB-specific IDs, will it break the bridge? | Verify that `shared/types.ts` is sufficient for cross-hexagon identity. |
| **Synchronous Bridges** | Current bridges are `async` but the underlying implementation is in-memory. Will latency/failure handling in real microservices break the Front Desk? | Stress test with simulated latency in a mock bridge. |
 

# ADR 004: Scoreboard Type Moved to Shared Types

## Status: Accepted

## Context

Audit found that front-desk/ports/ports.ts imported Scoreboard directly from scoring-engine/ports/ports.ts, violating the zero cross-hexagon import rule.

## Decision

Moved Scoreboard to shared/types.ts. All hexagons now reference it from the shared boundary.

## Consequences

- Pros: Restores true hexagonal isolation. Front Desk no longer has a compile-time dependency on Scoring Engine internals.

- Cons: shared/types.ts grows slightly. Acceptable for cross-cutting data contracts.
