import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { JudgeResult, Verdict } from '../engine/types';

export interface HudApi {
	reportResult: (result: JudgeResult) => void;
	setCountdown: (value: number | null) => void;
	reset: () => void;
}

interface FeedbackEvent {
	verdict: Verdict;
	label: string;
	id: number;
}

export function verdictColor(v: Verdict): string {
	switch (v) {
		case 'perfect':
			return '#22d3ee';
		case 'good':
			return '#4ade80';
		case 'early':
			return '#facc15';
		case 'late':
			return '#fb923c';
		case 'released-early':
			return '#c084fc';
		case 'miss':
			return '#ef4444';
		case 'stray':
			return '#ef4444';
	}
}

export function verdictLabel(v: Verdict): string {
	switch (v) {
		case 'released-early':
			return 'Early Release';
		case 'stray':
			return 'Stray';
		default:
			return v;
	}
}

export function createHudApi(): { hudApi: HudApi; Hud: () => any } {
	const [score, setScore] = createSignal(0);
	const [streak, setStreak] = createSignal(0);
	const [lastFeedback, setLastFeedback] = createSignal<FeedbackEvent | null>(
		null,
	);
	const [countdown, setCountdown] = createSignal<number | null>(null);

	let eventId = 0;

	const VERDICT_POINTS: Record<Verdict, number> = {
		perfect: 100,
		good: 60,
		early: 20,
		late: 20,
		'released-early': 10,
		miss: 0,
		stray: 0,
	};

	const reportResult = (result: JudgeResult): void => {
		const label =
			result.phase === 'press' ? `Press: ${result.verdict}` : result.verdict;
		setLastFeedback({ verdict: result.verdict, label, id: eventId++ });

		if (!result.final) return;

		setScore((s) => s + VERDICT_POINTS[result.verdict]);

		if (
			result.verdict === 'miss' ||
			result.verdict === 'released-early' ||
			result.verdict === 'stray'
		) {
			setStreak(0);
		} else {
			setStreak((c) => c + 1);
		}
	};

	const reset = (): void => {
		setScore(0);
		setStreak(0);
		setLastFeedback(null);
		setCountdown(null);
	};

	function Hud() {
		let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;
		const [showFeedback, setShowFeedback] = createSignal(false);

		createEffect(() => {
			const event = lastFeedback();
			if (event === null) return;

			setShowFeedback(false);
			clearTimeout(feedbackTimeout);
			feedbackTimeout = setTimeout(() => setShowFeedback(false), 500);
		});

		onCleanup(() => clearTimeout(feedbackTimeout));

		const verdictColor = (v: Verdict | undefined): string => {
			switch (v) {
				case 'perfect':
					return 'text-cyan-400';
				case 'good':
					return 'text-green-400';
				case 'early':
					return 'text-yellow-400';
				case 'late':
					return 'text-orange-400';
				case 'released-early':
					return 'text-purple-400';
				case 'miss':
					return 'text-red-500';
				case 'stray':
					return 'text-red-500';
				default:
					return 'text-white';
			}
		};

		return (
			<div class="absolute inset-0 pointer-events-none select-none">
				<div class="absolute top-4 left-4 right-4 flex justify-between">
					<div class="text-white font-mono text-2xl">Score: {score()}</div>
					<div class="text-white font-mono text-2xl">Streak: {streak()}</div>
				</div>

				{showFeedback() && lastFeedback() && (
					<div
						class={`absolute bottom-12 left-1/2 -translate-x-1/2 text-4xl font-bold uppercase ${verdictColor(lastFeedback()?.verdict)}`}
					>
						{lastFeedback()?.label}
					</div>
				)}

				{countdown() !== null && (
					<div class="absolute inset-0 flex items-center justify-center">
						<div class="text-white text-9xl font-bold">
							{countdown() === 0 ? 'GO' : countdown()}
						</div>
					</div>
				)}
			</div>
		);
	}

	return { hudApi: { reportResult, setCountdown, reset }, Hud };
}
