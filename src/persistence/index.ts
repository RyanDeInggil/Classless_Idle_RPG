/**
 * src/persistence — Save, load, validate, migrate.
 *
 * All saves carry a `version` field. Invalid saves are rejected,
 * never half-applied. Migration functions convert between versions.
 */
