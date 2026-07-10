import './App.css';
import { InputRingBuffer } from './engine/ringBuffer';
import { InputCapture } from './engine/inputCapture';

function App() {
	const buffer = new InputRingBuffer();
	const capture = new InputCapture(buffer);
	capture.start();

	let lastSeq = -1;
	setInterval(() => {
		const events = buffer.getUnconsumed(lastSeq);
		if (events.length > 0) {
			console.log(events);
			lastSeq = buffer.latestSequence;
		}
	}, 200);

	return <>Hello world</>;
}

export default App;
