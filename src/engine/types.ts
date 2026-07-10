export type InputKind = 'mouse-left' | 'mouse-right' | 'shift';

export type InputAction = 'down' | 'up';

export type ActionKind = 'tap' | 'hold';

export type Verdict =
	| 'perfect'
	| 'good'
	| 'early'
	| 'late'
	| 'miss'
	| 'released-early';

export interface Step {
	id: number;
	inputs: InputKind[];
	actionKind: ActionKind;
	targetMs: number;
	minHoldMs?: number;
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
	matchedDownInput: InputEvent | null;
	matchedUpInput: InputEvent | null;
	holdDurationMs?: number;
}

export const FRAME_MS = 1000 / 60;

export const JUDGE_WINDOWS_FRAMES = {
	perfect: 4,
	good: 8,
	lateEarly: 10,
} as const;

export const DEFAULT_MIN_HOLD_MS = 200;
