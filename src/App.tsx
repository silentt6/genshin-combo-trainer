import './App.css';
import { InputRingBuffer } from './engine/ringBuffer';
import { InputCapture } from './engine/inputCapture';
import { Judge } from './engine/judge';
import type { Step } from './engine/types';
import { GameLoop } from './engine/gameLoop';

function App() {
	const buffer = new InputRingBuffer();
	const capture = new InputCapture(buffer);
	capture.start();
	const judge = new Judge();
	const comboStart = performance.now();

	const fakeStep: Step = {
		id: 1,
		input: 'mouse-left',
		action: 'down',
		targetMs: 1000,
	};
	let lastSeq = -1;

	const loop = new GameLoop(
		(now) => {
			const events = buffer.getUnconsumed(lastSeq);
			if (events.length > 0) {
				lastSeq = buffer.latestSequence;
				const result = judge.classify(fakeStep, comboStart, events);
				if (
					result.verdict !== 'miss' ||
					now - comboStart > fakeStep.targetMs + 200
				) {
					console.log(result);
				}
			}
		},
		(now) => {
			// renderer will go here next step
		},
	);

	loop.start();

	return <>Hello world</>;
}

export default App;
