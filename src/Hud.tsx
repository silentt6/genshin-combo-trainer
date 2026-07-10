import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { Verdict } from './engine/types';

export interface HudApi {
	reportVerdict: (verdict: Verdict) => void;
	setCountdown: (value: number | null) => void;
	reset: () => void;
}

interface VerdictEvent {
	verdict: Verdict;
	id: number;
}

export function createHudApi(): { hudApi: HudApi; Hud: () => any } {
	const [score, setScore] = createSignal(0);
	const [streak, setStreak] = createSignal(0);
	const [lastEvent, setLastEvent] = createSignal<VerdictEvent | null>(null);
	const [countdown, setCountdown] = createSignal<number | null>(null);

	let verdictId = 0;

	const VERDICT_POINTS: Record<Verdict, number> = {
		perfect: 100,
		good: 60,
		early: 20,
		late: 20,
		'released-early': 10,
		miss: 0,
		stray: 0,
	};

	const reportVerdict = (verdict: Verdict): void => {
		setLastEvent({ verdict, id: verdictId++ });
		setScore((s) => s + VERDICT_POINTS[verdict]);

		if (
			verdict === 'miss' ||
			verdict === 'released-early' ||
			verdict === 'stray'
		) {
			setStreak(0);
		} else {
			setStreak((c) => c + 1);
		}
	};

	const reset = (): void => {
		setScore(0);
		setStreak(0);
		setLastEvent(null);
		setCountdown(null);
	};

	function Hud() {
		let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;
		const [showFeedback, setShowFeedback] = createSignal(false);

		createEffect(() => {
			const event = lastEvent();
			if (event === null) return;

			setShowFeedback(true);
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

				{showFeedback() && lastEvent() && (
					<div
						class={`absolute top-16 left-1/2 -translate-x-1/2 text-4xl font-bold uppercase ${verdictColor(lastEvent()?.verdict)}`}
					>
						{lastEvent()?.verdict}
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

	return { hudApi: { reportVerdict, setCountdown, reset }, Hud };
}
