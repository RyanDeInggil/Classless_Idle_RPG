# Milestone 1: Core Gameplay Loop

Goal: prove that watching automatic combat and leveling is engaging. Nothing else matters yet.

Scope reference: SRS section 6, Phase 1. Decisions: `docs/decisions.md`.

## Tasks (do in order)

### Foundation
- [x] **M1-01 Scaffold.** Vite + TypeScript + Svelte + Vitest + Zod. Folders per `CLAUDE.md`. Scripts: dev, test, typecheck, build.
- [x] **M1-02 Core primitives.** `core/num.ts` (add, mul, cmp, clamp), `core/rng.ts` (seeded PRNG, serializable state), `core/types.ts` (GameState, Action).
- [x] **M1-03 Game state + step runner.** `createInitialState(seed)`, `advance(state, seconds)` with 0.1 s fixed step, remainder carry, 10 s cap. Tests: same input gives same output; splitting seconds (1x10 vs 100x0.1) gives identical results.

### Character
- [x] **M1-04 Stats.** Base stats (maxHp, attack, attackRate, critChance, critDamage). `deriveStats(state)` recalculated, not saved. Tests.
- [x] **M1-05 XP and levels.** `awardXp`, level-up loop (multiple levels per award), skill points granted (stored, unspendable). Level curve from data. Tests including multi-level jumps.

### Combat
- [x] **M1-06 Content schemas.** Zod schemas + data for enemies, waves, stage, effects. Cross-reference validation (wave references existing enemy ids). Tests for a broken reference failing load.
- [x] **M1-07 Combat engine.** Attack timers for player and enemies, damage, crits (seeded RNG), kill, wave advance. Tests for each.
- [x] **M1-08 Effect system.** Timed effects with duration, tick interval, stacking rule. Implement Burn (player skill, auto-applied on hit) and Stun (boss). Tests: refresh behavior, expiry, stun blocks attacks.
- [ ] **M1-09 Boss + stage unlock.** Boss wave, first-kill unlock is idempotent, farming loop and `autoProgress` per D2.
- [ ] **M1-10 Defeat handling.** Per D1. Tests: retreat from wave 1 stays on wave 1; pause blocks combat; full heal.
- [ ] **M1-11 Rewards.** XP per enemy, boss bonus XP, results log capped at N entries (NFR-009).

### Activities and persistence
- [ ] **M1-12 Activity framework.** `Activity` interface (`id`, `requirements`, `advance`, outputs). Combat is the first implementation. `dispatch({type:'startActivity'|'stopActivity'})`. Single active activity.
- [ ] **M1-13 Persistence.** Zod save schema with `version: 1`, `savedAt`. Autosave every 10 s and on tab hide. Load validates first; on failure show an error and offer reset without overwriting the bad save. Migration function scaffold (v1 identity). Tests: round trip, malformed, wrong version.

### UI
- [ ] **M1-14 Minimal UI.** Character panel (level, XP bar, HP, stats), combat panel (stage, wave, enemy HP bars, active effects, log), controls (start/stop, autoProgress). Fixed UI loop calls `advance` with real elapsed time. UI holds no rules.
- [ ] **M1-15 Balance pass.** Tune data so a new player clears the boss in roughly 10-15 minutes with at least one defeat on the way. Data changes only.

### Polish (optional)
- [ ] **M1-16 Save export/import** as a text string.

## Acceptance (maps to SRS Phase 1 exit criteria)
- [ ] Start combat, it resolves automatically through 3 waves and a boss.
- [ ] Boss kill unlocks the next stage (once).
- [ ] XP and levels apply correctly, including multi-level.
- [ ] Defeat follows D1.
- [ ] Reload preserves progress; corrupt save is rejected safely.
- [ ] `npm test` passes with core running without any DOM.
- [ ] No `Math.random`, `Date.now`, or DOM access under `src/core`.

## Fun check (the real exit test)
Play it for 15 minutes without touching code. Write three lines in `docs/playtest.md`:
1. Did I want to keep watching?
2. What felt slow or pointless?
3. What did I want to do that I could not?

If the answers are bad, fix the loop before starting Phase 2.
