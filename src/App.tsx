import './App.css';
import { InputRingBuffer } from './engine/ringBuffer';
import { InputCapture } from './engine/inputCapture';
import { Judge } from './engine/judge';
import type { Step } from './engine/types';

function App() {
	const buffer = new InputRingBuffer();
	const capture = new InputCapture(buffer);
	capture.start();
	const judge = new Judge();
	const comboStart = performance.now();

	let lastSeq = -1;
	setInterval(() => {
		const events = buffer.getUnconsumed(lastSeq);
		if (events.length > 0) {
			console.log(events);
			lastSeq = buffer.latestSequence;
		}
	}, 200);

	const fakeStep: Step = {
		id: 1,
		input: 'mouse-left',
		action: 'down',
		targetMs: 1000,
	};
	setTimeout(() => {
		const events = buffer.getUnconsumed(-1);
		const result = judge.classify(fakeStep, comboStart, events);
		console.log('Judge result:', result);
	}, 1500);

	return <>Hello world</>;
}

export default App;
