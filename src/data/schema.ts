import type { Combo, Step, InputKind, ActionKind } from '../engine/types';

export interface ComboFile {
	version: 1;
	combos: Combo[];
}

const VALID_INPUTS: InputKind[] = [
	'mouse-left',
	'mouse-right',
	'shift',
	'q',
	'e',
	'space',
];
const VALID_ACTION_KINDS: ActionKind[] = ['tap', 'hold'];

const MAX_STEPS_PER_COMBO = 500;
const MAX_COMBOS_PER_FILE = 100;
const MAX_NAME_LENGTH = 100;
const MAX_TARGET_MS = 600_000;
const MAX_HOLD_MS = 60_000;
const MAX_JSON_LENGTH = 2_000_000;

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isSafeString(value: unknown, maxLength: number): value is string {
	return (
		typeof value === 'string' && value.length > 0 && value.length <= maxLength
	);
}

export function isValidStep(value: unknown): value is Step {
	if (typeof value !== 'object' || value === null || Array.isArray(value))
		return false;
	const s = value as Record<string, unknown>;

	if (!isFiniteNumber(s.id) || s.id < 0) return false;
	if (!Array.isArray(s.inputs) || s.inputs.length === 0 || s.inputs.length > 3)
		return false;
	if (!s.inputs.every((i) => VALID_INPUTS.includes(i as InputKind)))
		return false;
	if (!VALID_ACTION_KINDS.includes(s.actionKind as ActionKind)) return false;
	if (
		!isFiniteNumber(s.targetMs) ||
		s.targetMs < 0 ||
		s.targetMs > MAX_TARGET_MS
	)
		return false;

	if (s.minHoldMs !== undefined) {
		if (
			!isFiniteNumber(s.minHoldMs) ||
			s.minHoldMs <= 0 ||
			s.minHoldMs > MAX_HOLD_MS
		)
			return false;
	}

	return true;
}

export function isValidCombo(value: unknown): value is Combo {
	if (typeof value !== 'object' || value === null || Array.isArray(value))
		return false;
	const c = value as Record<string, unknown>;

	if (!isSafeString(c.id, 200)) return false;
	if (!isSafeString(c.name, MAX_NAME_LENGTH)) return false;
	if (c.author !== undefined) {
		if (!isSafeString(c.author, MAX_NAME_LENGTH)) return false;
	}
	if (
		!isFiniteNumber(c.scrollSpeed) ||
		c.scrollSpeed <= 0 ||
		c.scrollSpeed > 10
	)
		return false;

	if (c.loopIntervalMs !== undefined) {
		if (
			!isFiniteNumber(c.loopIntervalMs) ||
			c.loopIntervalMs < 0 ||
			c.loopIntervalMs > MAX_TARGET_MS
		)
			return false;
	}

	if (!Array.isArray(c.steps) || c.steps.length > MAX_STEPS_PER_COMBO)
		return false;
	if (!c.steps.every(isValidStep)) return false;

	const ids = (c.steps as Step[]).map((s) => s.id);
	if (new Set(ids).size !== ids.length) return false;

	if (c.scrollSpeed !== undefined) {
		if (
			!isFiniteNumber(c.scrollSpeed) ||
			c.scrollSpeed <= 0 ||
			c.scrollSpeed > 10
		)
			return false;
	}

	return true;
}

export function isValidComboFile(value: unknown): value is ComboFile {
	if (typeof value !== 'object' || value === null || Array.isArray(value))
		return false;
	const f = value as Record<string, unknown>;

	if (f.version !== 1) return false;
	if (
		!Array.isArray(f.combos) ||
		f.combos.length === 0 ||
		f.combos.length > MAX_COMBOS_PER_FILE
	)
		return false;

	return f.combos.every(isValidCombo);
}

export function safeParseComboJson(
	raw: string,
): { ok: true; file: ComboFile } | { ok: false; error: string } {
	if (raw.length > MAX_JSON_LENGTH) {
		return { ok: false, error: 'JSON is too large.' };
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { ok: false, error: 'Invalid JSON syntax.' };
	}

	if (!isValidComboFile(parsed)) {
		return {
			ok: false,
			error: 'JSON does not match the expected combo format.',
		};
	}

	return { ok: true, file: parsed };
}
