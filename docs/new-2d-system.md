# New 2D System Design

## Goals
- Build a new 2D planner that can evolve independently from the existing viewer.
- Keep the 2D layer in sync with the 3D world while allowing lighter interactions.
- Reuse proven utilities and state management to reduce duplication.

## Coordinate System
- Application uses a right‑handed world with **Y up**.
- The planner lies on the **XZ** plane:
  - planner **X** → world **X**
  - planner **Y** → world **Z** (grows downward)
- Conversion helpers from `src/utils/coordinateSystem.ts` and `src/utils/planner.ts` must be used.

## Architecture
- New code lives under `src/new2d/`.
- A small adapter translates planner points to world coordinates (`projectPlannerPoint`).
- A feature flag decides whether the legacy 2D mode is available so both systems can coexist.

## Integration Points
- `SceneViewer` will instantiate either the legacy or the new 2D layer based on flags.
- Shared state (store, undo/redo) remains unchanged.
- Rendering and input handling are isolated to simplify replacement.

## Iterative Plan
1. Establish feature flag and scaffolding (this commit).
2. Implement rendering primitives and hit testing.
3. Port existing editing tools using the new abstractions.
4. Remove legacy mode after tests and documentation are complete.

## Open Questions
- Should measurements switch to millimetres or remain unitless?
- How will mobile room‑scan imports map into the new planner?
