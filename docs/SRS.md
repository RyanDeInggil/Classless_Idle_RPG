# Software Requirements Specification (SRS)
## Classless Idle RPG

**Version:** 0.5  
**Status:** Draft  
**Product type:** Single-player, browser-first idle RPG  
**Primary objective:** Develop a modular, extensible RPG prototype in which character progression emerges from skills, training, knowledge, equipment, and player choices rather than permanent character classes.

---

# 1. Introduction

## 1.1 Purpose

This document defines the functional requirements, non-functional requirements, architecture principles, implementation phases, and acceptance criteria for a classless idle RPG.

The SRS is intended to guide implementation while keeping the initial prototype manageable. It distinguishes confirmed requirements from unresolved design decisions so that development can proceed without prematurely fixing every gameplay mechanic.

## 1.2 Product Overview

The game is an idle RPG built around automatic combat, character progression, discipline training, an interconnected skill tree, equipment, mana management, and research.

Instead of choosing a permanent class, players develop their characters through accumulated abilities and specializations. A character may develop defensive, aggressive, ranged, or magical capabilities, including combinations of multiple specializations.

Combat and other activities are resolved automatically after the player selects an activity. Progression systems provide different forms of advancement, including character levels, discipline proficiency, knowledge, equipment, and mana-related resources.

## 1.3 Objectives

The system shall:

1. Provide a classless character progression system.
2. Support automatic, stage-based combat with multiple enemy waves and bosses.
3. Separate general character progression from discipline mastery and knowledge acquisition.
4. Provide interconnected skill tree that supports multiple specializations.
5. Implement a configurable mana system based on permanent mana cores and derived mana rings.
6. Support equipment with configurable requirements, attributes, and special abilities.
7. Provide basic research and knowledge-based progression.
8. Support persistent local saves.
9. Use a modular, data-driven architecture that can accommodate additional content.
10. Keep the first playable prototype small enough to implement and test incrementally.

## 1.4 Scope

### Included in the planned prototype

- Character statistics, experience, and levels.
- Automatic combat and stage progression.
- Multiple enemy waves and boss encounters.
- Combat effects and basic damage calculations.
- Discipline training and proficiency.
- Skill points and an interconnected skill tree.
- Equipment with selective requirements.
- Mana cores and rings.
- Knowledge and basic research.
- Local save/load functionality.
- A browser-based user interface.

### Deferred or excluded from the initial prototype

- Offline progression.
- A fully populated skill tree.
- Large crafting and research content libraries.
- Complex random equipment affixes.
- Trading, multiplayer, and server-side accounts.
- Multiple simultaneously active activities.
- A fully specified economy system.
- Large-scale content and balance optimization.

---

# 2. Overall Description

## 2.1 Product Perspective

The game shall be designed as a standalone single-player application.

Gameplay calculations shall be separated from presentation logic. Content such as stages, enemies, skills, equipment, training milestones, and research projects shall be defined through structured data wherever practical.

The initial version shall not require a backend server.

## 2.2 User Characteristics

The intended player is familiar with RPG progression concepts such as levels, equipment, skill trees, combat statistics, and resource management.

The interface should make the consequences of progression understandable without requiring the player to inspect internal game data.

## 2.3 Operating Environment

The initial target environment is a modern desktop web browser.

The implementation should remain portable enough to support possible desktop packaging in the future, but a desktop wrapper is not a mandatory requirement for the initial prototype.

## 2.4 Design Principles

### Classless progression

Characters shall not be permanently assigned to a class. Their effective roles shall emerge from learned skills, equipment, discipline proficiency, knowledge, and progression choices.

### Separation of progression systems

Character level, discipline proficiency, knowledge, skill-tree progression, and equipment requirements shall remain distinct concepts, even where they interact.

### Data-driven content

Configurable gameplay values shall be stored separately from core gameplay logic whenever practical.

### Deterministic and testable calculations

Core calculations should be testable without rendering the user interface or accessing browser APIs.

### Incremental implementation

The project shall begin with a small playable loop and expand only after the preceding phase satisfies its acceptance criteria.

---

# 3. Functional Requirements

## 3.1 Character Management and Progression

**FR-001: Character State.** The system shall maintain the character's current gameplay state, including applicable statistics, level, experience, skill points, resources, equipment, and progression records.

**FR-002: Character Statistics.** The system shall support configurable combat statistics, including maximum HP, current HP, attack damage, attack rate, critical chance, critical damage, defensive attributes, and other statistics required by implemented mechanics.

**FR-003: Experience.** The system shall support character experience gained from eligible activities.

**FR-004: Character Level.** The system shall increase character level when the configured experience requirement is met.

**FR-005: Level Rewards.** Character levels shall award skill points according to configurable progression rules.

**FR-006: Configurable Progression.** Experience requirements, level rewards, and relevant progression values shall be defined as data rather than embedded throughout gameplay logic.

**FR-007: Derived Statistics.** Final character statistics shall be calculated from base attributes, progression bonuses, skill-tree effects, and equipped items.

**FR-008: Persistent Progression.** Earned progression, including character levels and permanent rewards, shall persist through save/load operations.

## 3.2 Activity System

**FR-009: Activity Selection.** The player shall be able to select an available activity, such as combat, discipline training, research, or crafting when implemented.

**FR-010: Single Active Activity.** The player shall have at most one primary activity active at a time.

**FR-011: Activity Resolution.** Each activity shall define its inputs, processing rules, duration or progression behavior, and outputs.

**FR-012: Multiple Outputs.** An activity may award multiple types of progress or resources. For example, discipline training may grant character experience and discipline proficiency.

**FR-013: Activity Requirements.** Activities may require specific resources, proficiency levels, knowledge, equipment, or other configured conditions.

**FR-014: Activity Availability.** The system shall determine whether an activity is available based on its configured requirements.

**FR-015: Resource Shortages.** The behavior when an activity cannot continue because resources are insufficient shall be configurable or explicitly defined before resource-consuming activities are implemented.

**FR-016: Activity Interruption.** The system shall support stopping or switching activities according to the applicable activity rules.

**FR-017: Activity Results.** The system shall record and present relevant activity results, including rewards and progression changes.

## 3.3 Automatic Combat and Stage Progression

**FR-018: Combat Selection.** The player shall be able to select an unlocked combat stage or other configured combat activity.

**FR-019: Automatic Combat.** Combat shall resolve automatically after the player starts the selected activity.

**FR-020: Enemy Waves.** A stage shall support multiple waves of enemies.

**FR-021: Enemy Composition.** Waves may contain different enemy types and combinations.

**FR-022: Stage Bosses.** Each configured stage shall contain a boss encounter.

**FR-023: Boss Characteristics.** Bosses shall have configurable statistics and may possess special combat behavior, such as burst attacks, stun effects, or other mechanics.

**FR-024: Stage Unlocking.** Defeating a stage boss shall unlock the next configured stage.

**FR-025: Enemy Statistics.** Enemies shall support configurable HP, damage, attack rate, defenses, and other required combat statistics.

**FR-026: Combat Statistics.** Combat calculations shall account for applicable damage, attack rate, HP, critical attacks, bonus damage, defensive effects, and status effects.

**FR-027: Area Damage.** The combat system shall support effects that damage multiple enemies when configured.

**FR-028: Damage over Time.** The system shall support damage-over-time effects, such as burning.

**FR-029: Temporary Effects.** The system shall support timed combat effects, including stun, invulnerability, attack-speed reduction, regeneration reduction, and other configured effects.

**FR-030: Effect Timing.** Combat effects shall define their applicable duration, activation conditions, and stacking or refreshing behavior.

**FR-031: Combat Resolution.** The combat system shall determine damage, defeats, wave completion, boss completion, and applicable rewards.

**FR-032: Player Defeat.** The system shall detect player defeat and apply a configurable defeat-handling rule. The precise rule remains an open design question.

**FR-033: Combat Rewards.** Combat may award character experience, materials, equipment, or other configured rewards.

**FR-034: Combat Continuation.** Combat continuation within a cleared or unlocked stage shall follow a defined rule. Whether combat repeats indefinitely or ends after a particular encounter remains unresolved.

**FR-035: Combat Stopping.** The system shall support stopping combat according to the defined activity rules.

## 3.4 Discipline Training and Proficiency

**FR-036: Disciplines.** The system shall support configurable disciplines representing areas of training or mastery.

**FR-037: Discipline Proficiency.** Each applicable discipline shall maintain a proficiency value or level independent of general character level.

**FR-038: Training Activities.** The player shall be able to perform dedicated training activities that increase the associated discipline proficiency.

**FR-039: Training Rewards.** Training activities may award multiple outputs, including character experience, discipline proficiency, and configured knowledge or techniques.

**FR-040: Proficiency Requirements.** Equipment and skill-tree nodes may require specified discipline proficiency.

**FR-041: Training Milestones.** Configured proficiency milestones may grant rewards, including mana cores.

**FR-042: Milestone Integrity.** A milestone reward shall not be granted repeatedly for the same milestone unless the content explicitly defines it as repeatable.

Whether combat also grants discipline proficiency, and the relationship between disciplines and skill-tree branches, remain open design questions.

## 3.5 Skill Tree

**FR-043: Skill Tree Structure.** The system shall support a large, interconnected skill tree consisting of nodes, prerequisites, and progression paths.

**FR-044: Skill Points.** Skill points awarded through general character progression shall be available for eligible skill-tree nodes.

**FR-045: Node Requirements.** A node may require skill points, character level, discipline proficiency, knowledge, or other configured conditions.

**FR-046: General Passives.** The tree shall support general passive nodes, such as increased maximum HP or resistance, that do not necessarily require discipline proficiency.

**FR-047: Specialization Branches.** The initial conceptual specializations shall include:

- **Paladin:** defensive and protective capabilities.
- **Berserker:** aggressive combat and burst damage.
- **Archery:** ranged combat and precision.
- **Wizard:** magical and elemental capabilities.

These branches represent specializations, not permanent character classes.

**FR-048: Cross-Specialization.** Players shall be able to progress through multiple specializations when their requirements are satisfied.

**FR-049: Progression Trade-offs.** Progressing through several specializations may take longer because available skill points and other progression requirements must be distributed across them.

**FR-050: Configurable Nodes.** Node effects, prerequisites, costs, and rewards shall be data-driven.

**FR-051: Discipline-to-Branch Mapping.** The system shall support configurable relationships between disciplines and skill-tree branches. The precise mapping remains unresolved.

## 3.6 Skills and Combat Effects

**FR-052: Configurable Skills.** The system shall support skills that modify combat behavior through defined effects.

**FR-053: Damage Skills.** Skills may increase direct damage or add bonus damage under configured conditions.

**FR-054: Area Skills.** Skills may damage multiple enemies.

**FR-055: Elemental Effects.** Skills may apply elemental effects, including burning or other configured damage-over-time effects.

**FR-056: Control and Suppression.** Skills may stun enemies or reduce their attack speed, regeneration, or other configured capabilities.

**FR-057: Defensive Skills.** Skills may provide defensive effects, including temporary invulnerability or regeneration.

**FR-058: Skill Costs and Timing.** Skills may define mana costs, cooldowns, activation conditions, targets, and durations.

**FR-059: Effect Resolution.** Skill effects shall be resolved through the core combat system rather than being implemented exclusively in the user interface.

**FR-060: Effect Configuration.** Skill values and effect parameters shall be configurable without requiring changes to unrelated gameplay systems.

The initial prototype shall implement only a small number of representative effects. It shall not require every possible skill or effect to be implemented immediately.

## 3.7 Mana System

**FR-061: Mana Cores.** Each earned mana core shall contribute 100 units of maximum mana.

`Maximum Mana = Total Earned Cores × 100`

Cores are permanent progression rewards and shall not be removed when equipment is changed.

**FR-062: Mana Rings.** Each active mana ring shall contribute 5 mana regeneration units per configured regeneration interval.

`Mana Regeneration = Total Active Rings × 5`

The exact regeneration interval shall be configurable and specified before detailed mana balancing.

**FR-063: Current and Maximum Mana.** The system shall maintain current mana and calculate maximum mana and mana regeneration from their contributing values.

**FR-064: Mana Usage.** Mana may be consumed by configured magical skills, learning activities, and research activities, subject to their respective costs and requirements.

**FR-065: Mana Core Sources.** Mana cores shall be obtainable through:

1. Completion of eligible research projects.
2. Completion of configured training milestones.

Cores shall not be obtained from equipment.

**FR-066: Core-Derived Rings.** Each earned core shall contribute a configurable number of rings through `ringsPerCore`. The initial default shall be 1.

**FR-067: Equipment-Granted Rings.** Equipment may grant additional rings while equipped. These rings shall be removed from the active total when the item is unequipped.

**FR-068: Ring Derivation.** Total active rings shall be derived from earned cores and currently equipped items. The ring total shall not be maintained as an independent saved progression value.

`Total Active Rings = (Total Earned Cores × ringsPerCore) + Rings from Equipped Items`

**FR-069: Core and Ring Configuration.** Core sources, research rewards, training thresholds, `ringsPerCore`, and relevant caps shall be data-driven.

**FR-070: Core Award Integrity.** Each eligible research completion or training milestone shall award its configured core no more than once, unless repeatability is explicitly configured.

**FR-071: Mana UI.** The interface shall represent mana capacity through cores and regeneration through rings. Displayed values shall remain consistent with the underlying state.

**FR-072: Equipment Changes and Mana.** Equipping or removing equipment shall recalculate the derived ring count and mana regeneration. If maximum mana decreases, current mana shall not remain above the new maximum.

Equipment-granted rings shall affect regeneration but shall not increase maximum mana unless a future requirement explicitly introduces such an effect.

## 3.8 Knowledge and Research

**FR-073: Knowledge Acquisition.** The system shall support acquiring knowledge through configured activities, such as research.

**FR-074: Persistent Knowledge.** Earned knowledge or completed knowledge unlocks shall persist through save/load operations.

**FR-075: Research Activities.** Research shall be represented as an activity with configurable requirements, costs, completion conditions, and rewards.

**FR-076: Knowledge Requirements.** Knowledge may be required to unlock skill-tree nodes, equipment, research projects, or other configured capabilities.

**FR-077: Research Rewards.** Research may award knowledge, unlock capabilities, or grant configured progression rewards, including mana cores.

**FR-078: Research Completion Integrity.** One-time research rewards shall not be granted repeatedly because of save loading or repeated completion processing.

The initial implementation shall include a minimal research example rather than a large research catalogue.

## 3.9 Equipment

**FR-079: Equipment System.** The system shall support configurable equipment items that provide attributes, special abilities, or other defined effects.

**FR-080: Selective Requirements.** Each equipment item may define any applicable combination of requirements, including:

- Character level.
- Maximum mana or other mana-related requirements.
- Discipline proficiency.
- Knowledge.
- Other configured progression conditions.

Items shall not be required to use every requirement category.

**FR-081: Equipment Eligibility.** An item may be equipped only when all requirements configured for that item are satisfied.

**FR-082: Equipment Bonuses.** Equipment shall contribute its configured bonuses to the character's derived statistics or abilities.

**FR-083: Equipment Abilities.** Equipment may grant special effects. For example, a Cloak of Invincibility could grant 1.5 seconds of invulnerability under its configured activation conditions.

**FR-084: Equipment Drops.** Bosses may rarely award equipment according to configured drop rules.

**FR-085: Equipment State.** The system shall track equipped items and calculate their effects consistently during gameplay and after save loading.

**FR-086: Equipment Removal.** Removing equipment shall remove its applicable bonuses and temporary or conditional contributions without deleting permanent progression rewards.

## 3.10 Crafting

**FR-087: Crafting Activity.** The system may support crafting as an activity that converts configured inputs into outputs.

**FR-088: Recipe Requirements.** A recipe may define required materials, knowledge, proficiency, or other prerequisites.

**FR-089: Recipe Outputs.** Crafting shall award the configured outputs when the recipe's requirements are satisfied.

**FR-090: Initial Scope.** Crafting shall remain minimal or deferred until the economy and material-consumption rules have been specified.

## 3.11 Offline Progression

**FR-091: Deferred Feature.** Offline progression shall not be implemented in the initial prototype.

**FR-092: Save Timestamp.** Saved state shall include a timestamp that can support future offline progression.

**FR-093: Future Compatibility.** Core gameplay calculations and activity rules should remain sufficiently separated from rendering so that offline progression can be introduced later.

**FR-094: Future Offline Rules.** Before offline progression is implemented, the system shall define how elapsed time, activity continuation, resource consumption, player defeat, status effects, rewards, and clock discrepancies are handled.

## 3.12 Persistence and Save Management

**FR-095: Local Persistence.** The initial prototype shall save gameplay state locally in the browser.

**FR-096: Save Loading.** The system shall restore saved progression and gameplay state when the application is reopened.

**FR-097: Save Versioning.** Saved data shall include a schema version to support future changes.

**FR-098: Save Validation.** Loaded data shall be validated before being applied to gameplay state.

**FR-099: Save Migration.** The system shall provide a migration strategy for supported changes to the save schema.

**FR-100: Derived State.** Values that can be derived reliably from saved state, such as total active rings, shall be recalculated rather than independently persisted.

**FR-101: Save Timestamp.** The save shall record the time at which it was written.

**FR-102: Optional Save Export.** Exporting and importing save data may be implemented as a convenience feature, but it is not required for the initial playable prototype.

## 3.13 User Interface

**FR-103: Character Overview.** The interface shall display relevant character statistics, level, experience, and progression information.

**FR-104: Activity Interface.** The player shall be able to view available activities, select one, and inspect its relevant requirements and outputs.

**FR-105: Combat Interface.** The interface shall display the current stage, wave, enemies, combat progress, and applicable combat results.

**FR-106: Progression Interface.** The interface shall provide access to the skill tree, discipline training, equipment, mana, and knowledge systems as they become available.

**FR-107: Requirement Feedback.** When an action is unavailable, the interface should communicate the unmet requirements.

**FR-108: Resource Feedback.** The interface shall display relevant resources and update them when gameplay state changes.

**FR-109: Mana Visualization.** The interface shall show the number of earned cores, derived active rings, maximum mana, current mana, and regeneration.

**FR-110: Responsive Updates.** The interface shall reflect authoritative gameplay state without implementing independent versions of core combat or progression calculations.

## 3.14 Economy

**FR-111: Pending Economy Design.** The economy system is not fully specified and shall remain pending.

**FR-112: No Premature Economic Requirements.** The implementation shall not introduce a mandatory currency model, trading system, or extensive economic progression without an explicit design decision.

**FR-113: Future Integration.** Materials, crafting costs, equipment acquisition, and other economic mechanics shall be specified before the crafting system or broader equipment economy is expanded.

---

# 4. Non-Functional Requirements

## 4.1 Maintainability

**NFR-001:** Gameplay systems shall be organized into modules with clear responsibilities.

**NFR-002:** Stages, enemies, skills, equipment, activities, research projects, and milestone rewards shall be data-driven wherever practical.

**NFR-003:** Adding content should not require modifying unrelated systems or duplicating core gameplay calculations.

## 4.2 Testability

**NFR-004:** Core gameplay calculations shall be testable without rendering the UI.

**NFR-005:** Tests shall cover important progression rules, combat outcomes, resource calculations, reward integrity, and save/load behavior.

**NFR-006:** Randomized mechanics shall support controlled randomness or deterministic test inputs where practical.

## 4.3 Performance

**NFR-007:** The initial prototype shall support its intended combat and progression workload without requiring unnecessary per-frame calculations.

**NFR-008:** Time-dependent gameplay logic shall be separated from rendering and should use elapsed-time or scheduled-tick calculations rather than relying on a particular frame rate.

**NFR-009:** The system shall avoid unbounded growth of combat logs, event queues, or other runtime data during extended play sessions.

## 4.4 Reliability and Data Integrity

**NFR-010:** Invalid saved data shall not be applied directly to gameplay state.

**NFR-011:** One-time rewards shall be protected against duplicate processing.

**NFR-012:** Derived values shall be calculated consistently from their authoritative inputs.

**NFR-013:** Save schema changes shall be handled through explicit versioning and migration rules where required.

## 4.5 Usability

**NFR-014:** The interface shall communicate progression requirements and resource costs clearly.

**NFR-015:** The player shall be able to distinguish general character progression, discipline mastery, and knowledge-based progression.

**NFR-016:** The interface shall remain usable as additional progression systems are introduced.

---

# 5. Technical Design and Architecture

## 5.1 Proposed Technology Stack

The following choices are proposals, not finalized requirements:

| Component | Proposed approach |
|---|---|
| Language | TypeScript |
| Build tooling | Vite |
| UI framework | Svelte or React, to be decided |
| Rendering | HTML and CSS, with SVG where useful |
| Testing | Vitest |
| Local persistence | Browser `localStorage` initially |
| Data validation | Zod or an equivalent validation library |
| Backend | None required for the initial prototype |

The initial prototype should not introduce a backend unless a later requirement makes one necessary.

## 5.2 Architectural Separation

The application should be divided into the following conceptual modules:

### Core gameplay

Responsible for:

- Character state and statistics.
- Combat calculations.
- Stage and wave progression.
- Skill and status-effect resolution.
- Discipline proficiency.
- Skill-tree requirements.
- Mana calculations.
- Equipment effects.
- Activity resolution.
- Reward processing.

The core should accept explicit state and inputs and produce updated state and results without depending on the UI or browser APIs.

### Content data

Contains configurable definitions for:

- Enemies and stages.
- Skills and combat effects.
- Disciplines and training milestones.
- Skill-tree nodes.
- Equipment.
- Mana core and ring rewards.
- Research projects.
- Crafting recipes when implemented.

### Persistence

Responsible for:

- Saving and loading state.
- Save validation.
- Schema versioning.
- Migration.
- Save timestamps.
- Optional export/import functionality.

### User interface

Responsible for:

- Displaying gameplay state.
- Collecting player inputs.
- Presenting available activities and requirements.
- Displaying combat and progression results.
- Sending player actions to the core gameplay layer.

The UI shall not independently calculate authoritative combat outcomes or progression rewards.

### Tests

Tests shall validate core calculations, system integration, persistence, and important acceptance criteria.

## 5.3 Time and Simulation

Combat and activities shall not depend on the UI rendering frame rate.

The implementation should use a consistent simulation or tick model for time-dependent effects, attack intervals, cooldowns, and activity progression.

Status effects shall have explicit timing and stacking rules. They shall not all be approximated as average damage per second when their timing or behavior materially changes combat outcomes.

## 5.4 Large Numbers

The initial prototype may use native JavaScript numbers, provided calculations are wrapped in suitable helpers and tested for expected ranges.

A dedicated large-number library is not required until the intended progression scale demonstrates a need for one.

## 5.5 Data-Driven Mana Rules

The following values shall be configurable:

- `ringsPerCore`, initially defaulting to 1.
- Mana regeneration interval.
- Training proficiency milestones that award cores.
- Research projects that award cores.
- Core reward quantities.
- Equipment-granted ring quantities.
- Any future core or ring caps.

Equipment ring contributions shall be derived from the currently equipped items. They shall not be added permanently to the earned core count.

---

# 6. Prototype Development Plan

## Phase 1: Core Gameplay Loop

### Scope

- Character state, statistics, experience, and levels.
- One active activity at a time.
- Automatic combat.
- One stage containing multiple enemy waves and a boss.
- Basic damage, attack rate, HP, and critical attacks.
- At least one representative combat effect.
- Defeat handling.
- Stage unlocking.
- Local save/load with versioning and validation.
- Minimal combat and character interface.

### Exit criteria

- The player can start a combat activity.
- Combat resolves automatically.
- Enemies and waves progress according to configured rules.
- Boss defeat unlocks the next stage.
- Experience and configured rewards are applied correctly.
- Player defeat follows the selected rule.
- Saving and loading preserve supported gameplay state.

## Phase 2: Skill Tree and Discipline Progression

### Scope

- Skill points.
- A small interconnected skill tree.
- General passive nodes.
- At least two specialization branches.
- Discipline training and proficiency.
- Configurable node prerequisites.
- Discipline-related node requirements.
- Initial discipline-to-branch relationships.

### Exit criteria

- Character progression grants skill points according to configured rules.
- The player can purchase eligible nodes.
- Nodes with unmet requirements cannot be purchased.
- Discipline training increases the appropriate proficiency.
- General passive nodes can function without unnecessary discipline requirements.
- Cross-specialization is supported where the configured prerequisites permit it.

## Phase 3: Gear and Magic

### Scope

- A small equipment selection.
- Equipment bonuses and selective requirements.
- At least one equipment ability that affects combat.
- Mana cores and rings using the defined formulas.
- At least one training milestone that awards a permanent core.
- Core-derived rings using `ringsPerCore`.
- At least one equipment item that grants additional rings.
- Derived ring counts and mana recalculation.
- Configurable core and ring values.

### Exit criteria

1. Maximum mana follows the core formula.
2. Mana regeneration follows the active ring formula.
3. Completing a configured training milestone awards the specified core exactly once.
4. Awarding a core increases maximum mana and applies the configured core-derived ring contribution.
5. Equipping an item that grants rings increases the derived ring count and regeneration.
6. Unequipping the item removes its ring contribution without removing earned cores.
7. Ring totals are derived from earned cores and currently equipped items.
8. Equipment requirements are evaluated correctly.
9. At least one equipment ability modifies combat behavior.
10. If maximum mana decreases, current mana does not exceed the new maximum.
11. Save/load preserves earned cores and correctly reconstructs active ring totals.

## Phase 4: Knowledge and Research

### Scope

- Basic knowledge acquisition.
- A minimal research activity.
- At least one knowledge-gated node or equipment item.
- At least one eligible research project that awards a permanent core.
- Protection against duplicate research rewards.

### Exit criteria

1. Knowledge can be acquired and used to satisfy a configured requirement.
2. Completing eligible research awards the specified core exactly once.
3. Reloading the game does not duplicate a research reward.
4. Save/load preserves knowledge and core progression.

## Optional Phase 5: Crafting and Content Expansion

This phase shall begin only after the economy and material-consumption rules are sufficiently defined.

Possible scope:

- One minimal crafting recipe.
- Additional stages, enemies, and equipment.
- Additional combat effects and specialization branches.
- More training milestones and research projects.
- Balance tooling and save export/import polish.

This phase is optional and should not delay the initial playable prototype.

---

# 7. Acceptance Criteria Summary

The prototype shall be considered ready for its initial milestone when:

- Character experience and levels function correctly.
- Automatic combat resolves correctly through waves and a boss.
- Stage unlocking works.
- Player defeat follows an explicitly selected rule.
- Combat and activity rewards are applied correctly.
- Skill points and configured skill-tree prerequisites work.
- Discipline proficiency is distinct from character level.
- Equipment requirements and effects are evaluated correctly.
- Mana capacity and regeneration follow their defined formulas.
- Training milestones can grant permanent cores without duplicate rewards.
- Equipment-granted rings are added and removed correctly.
- Research can grant a permanent core without duplicate rewards.
- Knowledge can satisfy at least one configured progression requirement.
- Local saving and loading preserve supported progression.
- Derived values are reconstructed consistently.
- Core gameplay calculations can be tested independently of the UI.

The initial prototype does not require offline progression, a complete skill tree, a large crafting library, multiplayer, or a fully specified economy.

---

# 8. Future Considerations

The following features may be considered after the core prototype is validated:

- Offline progression.
- Additional specializations and disciplines.
- Expanded research and knowledge trees.
- More equipment abilities and rare boss drops.
- More elaborate crafting and resource systems.
- Additional status effects and enemy behaviors.
- Large-number support if progression reaches native-number limitations.
- Desktop packaging.
- Save export/import.
- Additional balancing and simulation tools.

These are future possibilities rather than current implementation commitments.

---

# 9. Open Design Questions

The following decisions remain unresolved. Recommendations are proposals and are not binding requirements until accepted.

| # | Question | Recommendation or consideration | Needed by |
|---|---|---|---|
| 1 | What happens when the player is defeated? | Consider retreating one wave, pausing briefly, and making the rule configurable. | Phase 1 |
| 2 | Does combat grant discipline proficiency? | Consider a small proficiency gain from combat, with dedicated training approximately 3–5 times faster. | Phase 1 |
| 3 | How do disciplines map to skill-tree branches? | Use configurable many-to-many relationships where appropriate. | Phase 2 |
| 4 | Should the prototype use a large-number library? | Begin with native numbers and calculation helpers unless the expected scale requires more. | Before implementation |
| 5 | Should the UI use Svelte or React? | Decide before building the main UI. | Before UI implementation |
| 6 | What distinct purposes do the progression resources serve? | Define what each resource unlocks or restricts so the systems do not become redundant. | Phase 2 |
| 7 | When should the economy be specified? | Before crafting and before substantial expansion of equipment and material progression. | Before economic features |
| 8 | What should `ringsPerCore` be, and what is the base regeneration interval? | Start with one ring per core as a configurable default; determine the interval through balancing. | Phase 3 |
| 9 | Which proficiency milestones grant cores, and how many cores can training award? | Define milestone thresholds and reward quantities as data. | Phase 3 |
| 10 | Should there be a maximum number of cores or rings? | Start without a hard cap unless balancing or progression design demonstrates a need. | Phase 3 |
| 11 | How should current mana behave when equipment changes maximum mana? | Clamp current mana to the new maximum when capacity decreases. | Phase 3 |
| 12 | Should combat repeat indefinitely within an unlocked stage? | Define the continuation rule and what happens when the player stops combat. | Phase 1 |
| 13 | What happens when an activity cannot continue because resources are insufficient? | Define whether the activity pauses, stops, or follows another configured rule. | Before resource-consuming activities |
| 14 | How should future offline progression handle elapsed time, defeat, resource costs, and effects? | Defer the decision until offline progression is scheduled for implementation. | Before offline progression |

---

# 10. Summary

The game is a classless idle RPG in which characters develop through general levels, discipline proficiency, knowledge, skill-tree choices, equipment, and mana progression.

Its initial playable loop focuses on automatic stage-based combat, enemy waves, bosses, rewards, and persistent character progression. Subsequent phases introduce interconnected specializations, training, equipment, mana cores and rings, and knowledge-based research.

Mana cores are permanent rewards obtained from configured training milestones and research completions. Each core increases maximum mana by 100 and contributes a configurable number of rings. Equipment may provide additional rings while equipped. Active ring totals are derived from earned cores and equipped items, ensuring that equipment changes and save loading cannot permanently desynchronize regeneration.

The architecture should remain modular, testable, and data-driven. Offline progression and the economy remain deferred, while unresolved gameplay decisions are documented explicitly rather than assumed.
