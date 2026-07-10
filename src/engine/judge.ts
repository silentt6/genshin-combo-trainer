import type { InputEvent, Step, JudgeResult, Verdict } from './types';
import { FRAME_MS, JUDGE_WINDOWS_FRAMES, DEFAULT_MIN_HOLD_MS } from './types';

const PERFECT_MS = JUDGE_WINDOWS_FRAMES.perfect * FRAME_MS;
const GOOD_MS = JUDGE_WINDOWS_FRAMES.good * FRAME_MS;
const MISS_MS = JUDGE_WINDOWS_FRAMES.lateEarly * FRAME_MS;
const HOLD_RELEASE_TIMEOUT_MS = 3000;

interface PendingHold {
	downEvent: InputEvent;
	targetAbsoluteMs: number;
	minHoldMs: number;
	pressVerdict: Verdict;
	pressReported: boolean;
}

export class Judge {
	private consumedSequences = new Set<number>();
	private pendingHolds = new Map<number, PendingHold>();

	classify(
		step: Step,
		comboStartMs: number,
		now: number,
		allEvents: InputEvent[],
	): JudgeResult | null {
		const targetAbsoluteMs = comboStartMs + step.targetMs;

		const existing = this.pendingHolds.get(step.id);
		if (existing) {
			if (!existing.pressReported) {
				existing.pressReported = true;
				return {
					stepId: step.id,
					verdict: existing.pressVerdict,
					deltaMs: existing.downEvent.timestamp - existing.targetAbsoluteMs,
					matchedDownInput: existing.downEvent,
					matchedUpInput: null,
					pressVerdict: existing.pressVerdict,
					final: false,
					phase: 'press',
				};
			}
			return this.resolveHoldRelease(step, existing, now, allEvents);
		}

		const downEvent = this.findBestMatch(
			allEvents,
			step.inputs,
			'down',
			targetAbsoluteMs,
		);

		if (downEvent === null) {
			if (now > targetAbsoluteMs + MISS_MS) {
				return this.missResult(
					step.id,
					step.actionKind === 'tap' ? 'tap' : 'press',
				);
			}
			return null;
		}

		this.consumedSequences.add(downEvent.sequence);
		const downDelta = downEvent.timestamp - targetAbsoluteMs;
		const pressVerdict = this.verdictFromDelta(downDelta);

		if (step.actionKind === 'tap') {
			return {
				stepId: step.id,
				verdict: pressVerdict,
				deltaMs: downDelta,
				matchedDownInput: downEvent,
				matchedUpInput: null,
				final: true,
				phase: 'tap',
			};
		}

		const minHoldMs = step.minHoldMs ?? DEFAULT_MIN_HOLD_MS;
		this.pendingHolds.set(step.id, {
			downEvent,
			targetAbsoluteMs,
			minHoldMs,
			pressVerdict,
			pressReported: true,
		});

		return {
			stepId: step.id,
			verdict: pressVerdict,
			deltaMs: downDelta,
			matchedDownInput: downEvent,
			matchedUpInput: null,
			pressVerdict,
			final: false,
			phase: 'press',
		};
	}

	private resolveHoldRelease(
		step: Step,
		pending: PendingHold,
		now: number,
		allEvents: InputEvent[],
	): JudgeResult | null {
		const { downEvent, targetAbsoluteMs, minHoldMs, pressVerdict } = pending;

		const upEvent = this.findUpMatchAfter(allEvents, downEvent);

		if (upEvent === null) {
			if (now - downEvent.timestamp > HOLD_RELEASE_TIMEOUT_MS) {
				this.pendingHolds.delete(step.id);
				return {
					stepId: step.id,
					verdict: 'miss',
					deltaMs: downEvent.timestamp - targetAbsoluteMs,
					matchedDownInput: downEvent,
					matchedUpInput: null,
					pressVerdict,
					final: true,
					phase: 'release',
				};
			}
			return null;
		}

		this.consumedSequences.add(upEvent.sequence);
		this.pendingHolds.delete(step.id);

		const holdDurationMs = upEvent.timestamp - downEvent.timestamp;

		if (holdDurationMs < minHoldMs) {
			return {
				stepId: step.id,
				verdict: 'released-early',
				deltaMs: downEvent.timestamp - targetAbsoluteMs,
				matchedDownInput: downEvent,
				matchedUpInput: upEvent,
				holdDurationMs,
				pressVerdict,
				final: true,
				phase: 'release',
			};
		}

		const expectedReleaseAbsoluteMs = targetAbsoluteMs + minHoldMs;
		const releaseDelta = upEvent.timestamp - expectedReleaseAbsoluteMs;
		const releaseVerdict = this.verdictFromDelta(releaseDelta);

		return {
			stepId: step.id,
			verdict: releaseVerdict,
			deltaMs: downEvent.timestamp - targetAbsoluteMs,
			matchedDownInput: downEvent,
			matchedUpInput: upEvent,
			holdDurationMs,
			pressVerdict,
			releaseVerdict,
			releaseDeltaMs: releaseDelta,
			final: true,
			phase: 'release',
		};
	}

	private findBestMatch(
		candidates: InputEvent[],
		inputs: string[],
		action: 'down' | 'up',
		targetAbsoluteMs: number,
	): InputEvent | null {
		let best: InputEvent | null = null;
		let bestAbsDelta = Infinity;

		for (const event of candidates) {
			if (this.consumedSequences.has(event.sequence)) continue;
			if (event.action !== action) continue;
			if (!inputs.includes(event.input)) continue;

			const absDelta = Math.abs(event.timestamp - targetAbsoluteMs);
			if (absDelta > MISS_MS) continue;
			if (absDelta < bestAbsDelta) {
				bestAbsDelta = absDelta;
				best = event;
			}
		}

		return best;
	}

	private findUpMatchAfter(
		candidates: InputEvent[],
		downEvent: InputEvent,
	): InputEvent | null {
		let best: InputEvent | null = null;

		for (const event of candidates) {
			if (this.consumedSequences.has(event.sequence)) continue;
			if (event.action !== 'up') continue;
			if (event.input !== downEvent.input) continue;
			if (event.timestamp < downEvent.timestamp) continue;

			if (best === null || event.timestamp < best.timestamp) {
				best = event;
			}
		}

		return best;
	}

	private verdictFromDelta(delta: number): Verdict {
		const absDelta = Math.abs(delta);
		if (absDelta <= PERFECT_MS) return 'perfect';
		if (absDelta <= GOOD_MS) return 'good';
		return delta < 0 ? 'early' : 'late';
	}

	private missResult(stepId: number, phase: 'tap' | 'press'): JudgeResult {
		return {
			stepId,
			verdict: 'miss',
			deltaMs: 0,
			matchedDownInput: null,
			matchedUpInput: null,
			final: true,
			phase,
		};
	}

	isConsumed(sequence: number): boolean {
		return this.consumedSequences.has(sequence);
	}

	reset(): void {
		this.consumedSequences.clear();
		this.pendingHolds.clear();
	}
}
