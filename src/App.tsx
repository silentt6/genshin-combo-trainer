import { onMount, onCleanup } from 'solid-js';
import { InputRingBuffer } from './engine/ringBuffer';
import { InputCapture } from './engine/inputCapture';
import { Judge } from './engine/judge';
import { GameLoop } from './engine/gameLoop';
import { Renderer } from './engine/renderer';
import { FRAME_MS, JUDGE_WINDOWS_FRAMES, type Combo } from './engine/types';

const MISS_WINDOW_MS = JUDGE_WINDOWS_FRAMES.lateEarly * FRAME_MS;

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

	onMount(() => {
		if (!canvasRef) return;

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, canvasRef);
		const judge = new Judge();
		const renderer = new Renderer(canvasRef);

		capture.start();

		const comboStartMs = performance.now();
		let lastSeq = -1;
		const pendingSteps = [...testCombo.steps];

		const loop = new GameLoop(
			(now) => {
				const allEvents = buffer.getUnconsumed(-1);

				for (let i = pendingSteps.length - 1; i >= 0; i--) {
					const step = pendingSteps[i];
					const result = judge.classify(step, comboStartMs, now, allEvents);
					if (result !== null) {
						console.log(result);
						pendingSteps.splice(i, 1);
					}
				}
			},
			(now) => {
				renderer.render(now, testCombo, comboStartMs);
			},
		);

		loop.start();

		onCleanup(() => {
			loop.stop();
			capture.stop();
		});
	});

	return (
		<div class="w-screen h-screen bg-neutral-900 flex items-center justify-center">
			<canvas ref={canvasRef} class="w-full h-full block" />
		</div>
	);
}
