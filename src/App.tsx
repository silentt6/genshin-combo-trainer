import { onMount, onCleanup } from 'solid-js';
import { loadCombos, saveCombo } from './data/storage';
import { InputRingBuffer } from './engine/ringBuffer';
import { InputCapture } from './engine/inputCapture';
import { Judge } from './engine/judge';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { createHudApi } from './Hud';
import type { Combo } from './engine/types';

const COUNTDOWN_MS = 3000;

const testCombo: Combo = {
	id: 'test-1',
	name: 'Test Combo',
	scrollSpeed: 0.3,
	steps: [
		{ id: 1, inputs: ['mouse-left'], actionKind: 'tap', targetMs: 1000 },
		{
			id: 2,
			inputs: ['mouse-left'],
			actionKind: 'hold',
			targetMs: 2000,
			minHoldMs: 400,
		},
		{
			id: 3,
			inputs: ['mouse-right', 'shift'],
			actionKind: 'tap',
			targetMs: 3500,
		},
		{ id: 4, inputs: ['mouse-left'], actionKind: 'tap', targetMs: 4200 },
	],
};

export default function App() {
	let canvasRef: HTMLCanvasElement | undefined;
	const { hudApi, Hud } = createHudApi();

	onMount(() => {
		let combos = loadCombos();
		if (combos.length === 0) {
			saveCombo(testCombo);
			combos = loadCombos();
		}
		const activeCombo = combos[0];

		if (!canvasRef) return;

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, canvasRef);
		const judge = new Judge();
		const renderer = new Renderer(canvasRef);

		capture.start();

		const comboStartMs = performance.now() + COUNTDOWN_MS;
		const pendingSteps = [...testCombo.steps];
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
						if (result.final) {
							pendingSteps.splice(i, 1);
						}
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

	return (
		<div class="w-screen h-screen bg-neutral-900 relative overflow-hidden">
			<canvas ref={canvasRef} class="w-full h-full block" />
			<Hud />
		</div>
	);
}
