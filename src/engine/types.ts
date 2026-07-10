export type InputKind = 'mouse-left' | 'mouse-right' | 'shift';

export type InputAction = 'down' | 'up';

export type Verdict = 'perfect' | 'good' | 'early' | 'late' | 'miss';

export interface Step {
	id: number;
	input: InputKind;
	action: InputAction;
	targetMs: number;
	holdDurationMs?: number;
}

export interface Combo {
	id: string;
	name: string;
	bpm?: number;
	scrollSpeed: number;
	steps: Step[];
}

export interface InputEvent {
	input: InputKind;
	action: InputAction;
	timestamp: number;
	sequence: number;
}

export interface JudgeResult {
	stepId: number;
	verdict: Verdict;
	deltaMs: number;
	matchedInput: InputEvent | null;
}

export const FRAME_MS = 1000 / 60;

export const JUDGE_WINDOWS_FRAMES = {
	perfect: 1,
	good: 3,
	lateEarly: 6,
} as const;
