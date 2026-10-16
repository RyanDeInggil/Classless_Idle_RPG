# Design Decisions (Phase 1)

Status: RESOLVED = implement as written. OPEN = needs owner input; do not guess.

| # | Topic | Decision | Status |
|---|---|---|---|
| D1 | Player defeat | Retreat one wave (min wave 1), full heal, 3 s recovery pause. Values in config (`defeat.retreatWaves`, `defeat.pauseSeconds`). Boss defeat sends player to the stage's last wave. | RESOLVED |
| D2 | Combat continuation | After clearing the boss, the next stage unlocks and the player stays on the current stage, looping from wave 1 (farming). `autoProgress` toggle (default off) moves to the next stage on boss kill. | RESOLVED |
| D3 | Combat grants proficiency | Deferred to Phase 2 (no disciplines exist in Phase 1). Plan: small trickle, training 3-5x faster. | DEFERRED |
| D4 | Big numbers | Native numbers. All arithmetic through `core/num.ts`. | RESOLVED |
| D5 | UI framework | Svelte. | RESOLVED |
| D6 | Simulation step | Fixed internal step of 0.1 s. `advance(state, seconds)` loops whole steps and carries the remainder. Max 10 s processed per call (guards background-tab bursts). | RESOLVED |
| D7 | Effect model | Effects are explicit timed objects (duration, tick interval, stacking rule). No average-DPS shortcuts. Offline later will be limited to training activities first. | RESOLVED |
| D8 | Stacking default | Burn refreshes duration and does not stack intensity. Configurable per effect (`stacking: "refresh" | "stack" | "ignore"`). | RESOLVED |
| D9 | Offline progression | Not implemented. Save `savedAt` timestamp only. | RESOLVED |
| D10 | Save export/import | Optional polish, last task. | RESOLVED |
| D11 | Phase 1 content size | 1 stage, 3 waves, 1 boss, 3 enemy types, 1 player-side effect (Burn), 1 enemy effect (Stun on boss). | RESOLVED |
| D12 | Level curve | `xpToNext(level) = round(50 * 1.35^(level-1))`. Tunable in data. Skill points are granted but unspent until Phase 2. | RESOLVED |
| D13 | Mana spending | Phase 3 must include at least one mana-costed skill, otherwise mana does nothing. | OPEN (carry to Phase 3) |
| D14 | Simultaneous deaths | If the player and the last enemy would both die in the same step, the player wins. Apply this consistently to both DoT deaths and direct attacks. The player who wins a tie is left at 1 HP. | RESOLVED |
| D15 | Level-up mid-fight | On level-up mid-fight, max HP increases and current HP is unchanged. | RESOLVED |
| D16 | Wave effect persistence | Player effects persist across wave transitions until they expire. Enemy effects are removed when the enemy dies. | RESOLVED |
| D17 | Level stat growth | Levels raise combat stats: `stat(level) = base * growthPerLevel^(level - 1)`. Base stats, growth factors and `STARTING_LEVEL` live in `src/data/character.ts` (Zod-validated) and are **not** saved — `CharacterState` stores only `level`, `xp`, `skillPoints`, `currentHp`. `deriveStats(state)` is recalculated on read (rule 5, FR-007/FR-100). Critical chance is clamped to 1 and critical damage to >= 1x. Numbers are tuned in M1-15. | RESOLVED |

