import type { Combo, Step, InputKind, ActionKind } from '../engine/types';

export interface ComboFile {
	version: 1;
	combos: Combo[];
}

const VALID_INPUTS: InputKind[] = ['mouse-left', 'mouse-right', 'shift'];
const VALID_ACTION_KINDS: ActionKind[] = ['tap', 'hold'];

export function isValidStep(value: unknown): value is Step {
	if (typeof value !== 'object' || value === null) return false;
	const s = value as Record<string, unknown>;

	if (typeof s.id !== 'number') return false;
	if (!Array.isArray(s.inputs) || s.inputs.length === 0) return false;
	if (!s.inputs.every((i) => VALID_INPUTS.includes(i as InputKind)))
		return false;
	if (!VALID_ACTION_KINDS.includes(s.actionKind as ActionKind)) return false;
	if (typeof s.targetMs !== 'number') return false;
	if (s.minHoldMs !== undefined && typeof s.minHoldMs !== 'number')
		return false;

	return true;
}

export function isValidCombo(value: unknown): value is Combo {
	if (typeof value !== 'object' || value === null) return false;
	const c = value as Record<string, unknown>;

	if (typeof c.id !== 'string') return false;
	if (typeof c.name !== 'string') return false;
	if (typeof c.scrollSpeed !== 'number') return false;
	if (!Array.isArray(c.steps)) return false;
	if (!c.steps.every(isValidStep)) return false;

	return true;
}

export function isValidComboFile(value: unknown): value is ComboFile {
	if (typeof value !== 'object' || value === null) return false;
	const f = value as Record<string, unknown>;

	if (f.version !== 1) return false;
	if (!Array.isArray(f.combos)) return false;
	return f.combos.every(isValidCombo);
}
