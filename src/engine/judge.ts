import type { InputEvent, Step, JudgeResult, Verdict } from './types';
import { FRAME_MS, JUDGE_WINDOWS_FRAMES } from './types';

const PERFECT_MS = JUDGE_WINDOWS_FRAMES.perfect * FRAME_MS;
const GOOD_MS = JUDGE_WINDOWS_FRAMES.good * FRAME_MS;
const MISS_MS = JUDGE_WINDOWS_FRAMES.lateEarly * FRAME_MS;

export class Judge {
	private consumedSequences = new Set<number>();

	classify(
		step: Step,
		comboStartMs: number,
		candidates: InputEvent[],
	): JudgeResult {
		const targetAbsoluteMs = comboStartMs + step.targetMs;

		let best: InputEvent | null = null;
		let bestAbsDelta = Infinity;

		for (const event of candidates) {
			if (this.consumedSequences.has(event.sequence)) continue;
			if (event.input !== step.input || event.action !== step.action) continue;

			const delta = event.timestamp - targetAbsoluteMs;
			const absDelta = Math.abs(delta);

			if (absDelta > MISS_MS) continue;
			if (absDelta < bestAbsDelta) {
				bestAbsDelta = absDelta;
				best = event;
			}
		}

		if (best === null) {
			return {
				stepId: step.id,
				verdict: 'miss',
				deltaMs: 0,
				matchedInput: null,
			};
		}

		this.consumedSequences.add(best.sequence);
		const delta = best.timestamp - targetAbsoluteMs;
		const verdict = this.verdictFromDelta(delta);

		return { stepId: step.id, verdict, deltaMs: delta, matchedInput: best };
	}

	private verdictFromDelta(delta: number): Verdict {
		const absDelta = Math.abs(delta);

		if (absDelta <= PERFECT_MS) return 'perfect';
		if (absDelta <= GOOD_MS) return 'good';
		return delta < 0 ? 'early' : 'late';
	}

	reset(): void {
		this.consumedSequences.clear();
	}
}
