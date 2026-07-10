import type { InputEvent, Step, JudgeResult, Verdict } from './types';
import { FRAME_MS, JUDGE_WINDOWS_FRAMES, DEFAULT_MIN_HOLD_MS } from './types';

const PERFECT_MS = JUDGE_WINDOWS_FRAMES.perfect * FRAME_MS;
const GOOD_MS = JUDGE_WINDOWS_FRAMES.good * FRAME_MS;
const MISS_MS = JUDGE_WINDOWS_FRAMES.lateEarly * FRAME_MS;
const HOLD_RELEASE_TIMEOUT_MS = 3000;

export class Judge {
	private consumedSequences = new Set<number>();
	private pendingHolds = new Map<number, InputEvent>();

	classify(
		step: Step,
		comboStartMs: number,
		now: number,
		allEvents: InputEvent[],
	): JudgeResult | null {
		const targetAbsoluteMs = comboStartMs + step.targetMs;

		const existingDown = this.pendingHolds.get(step.id);

		if (existingDown) {
			return this.resolveHoldRelease(step, existingDown, now, allEvents);
		}

		const downEvent = this.findBestMatch(
			allEvents,
			step.inputs,
			'down',
			targetAbsoluteMs,
		);

		if (downEvent === null) {
			if (now > targetAbsoluteMs + MISS_MS) {
				return this.missResult(step.id);
			}
			return null;
		}

		this.consumedSequences.add(downEvent.sequence);
		const downDelta = downEvent.timestamp - targetAbsoluteMs;

		if (step.actionKind === 'tap') {
			return {
				stepId: step.id,
				verdict: this.verdictFromDelta(downDelta),
				deltaMs: downDelta,
				matchedDownInput: downEvent,
				matchedUpInput: null,
			};
		}

		this.pendingHolds.set(step.id, downEvent);
		return this.resolveHoldRelease(step, downEvent, now, allEvents);
	}

	isConsumed(sequence: number): boolean {
		return this.consumedSequences.has(sequence);
	}

	private resolveHoldRelease(
		step: Step,
		downEvent: InputEvent,
		now: number,
		allEvents: InputEvent[],
	): JudgeResult | null {
		const upEvent = this.findUpMatchAfter(allEvents, downEvent);
		const downDelta =
			downEvent.timestamp - (downEvent.timestamp - step.targetMs);

		if (upEvent === null) {
			if (now - downEvent.timestamp > HOLD_RELEASE_TIMEOUT_MS) {
				this.pendingHolds.delete(step.id);
				return {
					stepId: step.id,
					verdict: 'miss',
					deltaMs: 0,
					matchedDownInput: downEvent,
					matchedUpInput: null,
				};
			}
			return null;
		}

		this.consumedSequences.add(upEvent.sequence);
		this.pendingHolds.delete(step.id);

		const holdDurationMs = upEvent.timestamp - downEvent.timestamp;
		const minHold = step.minHoldMs ?? DEFAULT_MIN_HOLD_MS;
		const targetDelta = downEvent.timestamp - downEvent.timestamp;

		if (holdDurationMs < minHold) {
			return {
				stepId: step.id,
				verdict: 'released-early',
				deltaMs: targetDelta,
				matchedDownInput: downEvent,
				matchedUpInput: upEvent,
				holdDurationMs,
			};
		}

		return {
			stepId: step.id,
			verdict: this.verdictFromDelta(targetDelta),
			deltaMs: targetDelta,
			matchedDownInput: downEvent,
			matchedUpInput: upEvent,
			holdDurationMs,
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

	private missResult(stepId: number): JudgeResult {
		return {
			stepId,
			verdict: 'miss',
			deltaMs: 0,
			matchedDownInput: null,
			matchedUpInput: null,
		};
	}

	reset(): void {
		this.consumedSequences.clear();
		this.pendingHolds.clear();
	}
}
