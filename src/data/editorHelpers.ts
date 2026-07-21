import type { Step, InputEvent } from '../engine/types';
import { DEFAULT_MIN_HOLD_MS } from '../engine/types';
import { LANES as TRACKS } from './laneConfig';
import type { LaneConfig } from './laneConfig';
import { TAP_WIDTH_MS, EVADE_DEBOUNCE_MS } from './editorConstants';

export function trackForStep(step: Step): LaneConfig {
	return (
		TRACKS.find((t) => t.inputs.some((i) => step.inputs.includes(i))) ??
		TRACKS[0]
	);
}

export function stepWidthMs(step: Step): number {
	return step.actionKind === 'hold'
		? (step.minHoldMs ?? DEFAULT_MIN_HOLD_MS)
		: TAP_WIDTH_MS;
}

export function hasOverlap(
	steps: Step[],
	track: LaneConfig,
	startMs: number,
	widthMs: number,
	excludeIds: Set<number> = new Set<number>(),
): boolean {
	const endMs = startMs + widthMs;
	return steps
		.filter((s) => trackForStep(s).id === track.id)
		.some((s) => {
			if (excludeIds.has(s.id)) return false;
			const sStart = s.targetMs;
			const sEnd = sStart + stepWidthMs(s);
			return startMs < sEnd && endMs > sStart;
		});
}

function dedupeEvadeEvents(events: InputEvent[]): InputEvent[] {
	const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
	const suppressed = new Set<number>();

	for (const ev of sorted) {
		if (ev.action !== 'down') continue;
		if (ev.input !== 'mouse-right' && ev.input !== 'shift') continue;
		if (suppressed.has(ev.sequence)) continue;

		for (const other of sorted) {
			if (other.sequence === ev.sequence) continue;
			if (other.action !== 'down') continue;
			if (other.input !== 'mouse-right' && other.input !== 'shift') continue;
			if (Math.abs(other.timestamp - ev.timestamp) <= EVADE_DEBOUNCE_MS) {
				suppressed.add(other.sequence);
			}
		}
	}

	return events.filter((ev) => !suppressed.has(ev.sequence));
}

export function buildStepsFromEvents(
	rawEvents: InputEvent[],
	baseMs: number,
	nowMs: number,
	finalize: boolean,
): Step[] {
	const events = dedupeEvadeEvents(rawEvents);
	const consumed = new Set<number>();
	const steps: Step[] = [];

	for (const ev of events) {
		if (ev.action !== 'down' || consumed.has(ev.sequence)) continue;

		if (ev.input === 'mouse-left') {
			const up = events.find(
				(u) =>
					u.action === 'up' &&
					u.input === 'mouse-left' &&
					u.timestamp > ev.timestamp &&
					!consumed.has(u.sequence),
			);
			consumed.add(ev.sequence);
			const targetMs = Math.round(ev.timestamp - baseMs);

			if (up) {
				consumed.add(up.sequence);
				const holdMs = Math.round(up.timestamp - ev.timestamp);
				steps.push({
					id: steps.length + 1,
					inputs: ['mouse-left'],
					actionKind: holdMs > 150 ? 'hold' : 'tap',
					targetMs,
					minHoldMs: holdMs > 150 ? holdMs : undefined,
				});
			} else if (!finalize) {
				const heldSoFar = Math.round(nowMs - ev.timestamp);
				steps.push({
					id: steps.length + 1,
					inputs: ['mouse-left'],
					actionKind: heldSoFar > 150 ? 'hold' : 'tap',
					targetMs,
					minHoldMs: heldSoFar > 150 ? heldSoFar : undefined,
				});
			}
		} else if (ev.input === 'mouse-right' || ev.input === 'shift') {
			consumed.add(ev.sequence);
			const targetMs = Math.round(ev.timestamp - baseMs);
			steps.push({
				id: steps.length + 1,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs,
			});
		}
	}

	return steps
		.sort((a, b) => a.targetMs - b.targetMs)
		.map((s, i) => ({ ...s, id: i + 1 }));
}
