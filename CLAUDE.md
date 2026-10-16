# Project Guide: Classless Idle RPG

Read `docs/SRS.md` (v0.5) for requirements, `docs/decisions.md` for resolved design choices, and `docs/milestone-1.md` for the current work. When they conflict, `decisions.md` wins over the SRS for Phase 1.

## Stack
TypeScript, Vite, Svelte, Vitest, Zod, localStorage. No backend, no game engine, no big-number library (wrap math in `core/num.ts` helpers).

## Layout
```
src/core/         pure logic. NO imports from ui/, persistence/, DOM, window, localStorage, Date.now
src/data/         content definitions (stages, enemies, effects, activities, level curve)
src/persistence/  save, load, validate (Zod), migrate
src/ui/           Svelte components. Reads state, dispatches actions. No game rules.
tests/            Vitest, mirrors src/core
```

## Hard rules
1. Core is a pure function: `advance(state, seconds) -> state` and `dispatch(state, action) -> state`. Never mutate the input state.
2. Time-driven, never frame-driven. Core uses a fixed internal step (see decisions.md) so results do not depend on render rate.
3. Randomness comes from a seeded PRNG stored in state. Never call `Math.random()` in core.
4. All content is data, validated with Zod at load. Adding an enemy or stage must not touch core code.
5. Derived values (e.g. final stats) are recalculated, never saved.
6. One-time rewards (boss first-kill unlock) must be idempotent.
7. Every save has `version`. Invalid saves are rejected, never half-applied.
8. UI contains zero combat or progression math.
9. Raw arithmetic: game values go through `core/num.ts`; integer-millisecond time-step bookkeeping in `core/engine.ts` is exempt.

## Commands
`npm run dev` / `npm test` / `npm run typecheck` / `npm run build`

## Definition of done (any task)
Typecheck passes, tests for new core logic pass, no rule above violated, task checked off in `docs/milestone-1.md`.

## Working style
Do one task at a time, in order. Stop and ask when a task needs a decision not covered in `decisions.md`; add it to that file as OPEN.
