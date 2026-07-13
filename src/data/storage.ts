import type { Combo } from '../engine/types';
import type { ComboFile } from './schema';
import { isValidComboFile } from './schema';

const STORAGE_KEY = 'genshin-combo-trainer:combos';
const CURRENT_VERSION = 1;

export function loadCombos(): Combo[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw === null) return [];

	try {
		const parsed = JSON.parse(raw);
		if (!isValidComboFile(parsed)) {
			console.warn('Stored combo file failed validation, ignoring.');
			return [];
		}
		return parsed.combos;
	} catch (err) {
		console.warn('Failed to parse stored combos:', err);
		return [];
	}
}

export function saveCombos(combos: Combo[]): void {
	const file: ComboFile = { version: CURRENT_VERSION, combos };

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
	} catch (err) {
		console.error('Failed to save combos (storage may be full):', err);
	}
}

export function saveCombo(combo: Combo): void {
	const combos = loadCombos();
	const index = combos.findIndex((c) => c.id === combo.id);

	if (index >= 0) {
		combos[index] = combo;
	} else {
		combos.push(combo);
	}

	saveCombos(combos);
}

export function deleteCombo(comboId: string): void {
	const combos = loadCombos().filter((c) => c.id !== comboId);
	saveCombos(combos);
}

export function exportCombosAsJson(): string {
	const file: ComboFile = { version: CURRENT_VERSION, combos: loadCombos() };
	return JSON.stringify(file, null, 2);
}

export function exportComboAsJson(combo: Combo): string {
	const file: ComboFile = { version: CURRENT_VERSION, combos: [combo] };
	return JSON.stringify(file, null, 2);
}

export function importCombosFromJson(json: string): boolean {
	try {
		const parsed = JSON.parse(json);
		if (!isValidComboFile(parsed)) return false;
		saveCombos(parsed.combos);
		return true;
	} catch {
		return false;
	}
}
