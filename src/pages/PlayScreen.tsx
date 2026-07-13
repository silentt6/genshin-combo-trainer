import { onMount, onCleanup } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { InputRingBuffer } from '../engine/ringBuffer';
import { InputCapture } from '../engine/inputCapture';
import { Judge } from '../engine/judge';
import { GameLoop } from '../engine/gameLoop';
import { Renderer } from '../engine/renderer';
import { createHudApi } from '../Hud';
import { loadCombos } from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';

const COUNTDOWN_MS = 3000;

export default function PlayScreen() {
	const params = useParams();
	const navigate = useNavigate();
	let canvasRef: HTMLCanvasElement | undefined;
	const { hudApi, Hud } = createHudApi();

	const findCombo = () => {
		const all = [...BUILT_IN_COMBOS, ...loadCombos()];
		return all.find((c) => c.id === params.comboId);
	};

	const activeCombo = findCombo();

	onMount(() => {
		if (!canvasRef || !activeCombo) return;

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, canvasRef);
		const judge = new Judge();
		const renderer = new Renderer(canvasRef);

		capture.start();

		const comboStartMs = performance.now() + COUNTDOWN_MS;
		const pendingSteps = [...activeCombo.steps];
		const handledStray = new Set<number>();

		const loop = new GameLoop(
			(now) => {
				if (now < comboStartMs) return;

				const allEvents = buffer.getUnconsumed(-1);

				for (let i = pendingSteps.length - 1; i >= 0; i--) {
					const step = pendingSteps[i];
					const result = judge.classify(step, comboStartMs, now, allEvents);
					if (result !== null) {
						hudApi.reportResult(result);
						if (result.final) pendingSteps.splice(i, 1);
					}
				}

				for (const event of allEvents) {
					if (event.action !== 'down') continue;
					if (judge.isConsumed(event.sequence)) continue;
					if (handledStray.has(event.sequence)) continue;

					handledStray.add(event.sequence);
					hudApi.reportResult({
						stepId: -1,
						verdict: 'stray',
						deltaMs: 0,
						matchedDownInput: null,
						matchedUpInput: null,
						final: true,
						phase: 'tap',
					});
				}
			},
			(now) => {
				renderer.render(now, activeCombo, comboStartMs);
				if (now < comboStartMs) {
					hudApi.setCountdown(Math.ceil((comboStartMs - now) / 1000));
				} else if (now < comboStartMs + 500) {
					hudApi.setCountdown(0);
				} else {
					hudApi.setCountdown(null);
				}
			},
		);

		loop.start();
		onCleanup(() => {
			loop.stop();
			capture.stop();
		});
	});

	if (!activeCombo) {
		return (
			<div class="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4">
				<p>Combo not found.</p>
				<button
					class="bg-cyan-600 px-4 py-2 rounded"
					onClick={() => navigate('/')}
				>
					Back to Lobby
				</button>
			</div>
		);
	}

	return (
		<div class="w-screen h-screen bg-neutral-900 relative overflow-hidden">
			<button
				class="absolute top-4 left-4 z-10 bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded text-white"
				onClick={() => navigate('/')}
			>
				← Back
			</button>
			<canvas ref={canvasRef} class="w-full h-full block" />
			<Hud />
		</div>
	);
}
