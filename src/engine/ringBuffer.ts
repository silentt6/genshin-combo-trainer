import type { InputEvent, InputKind, InputAction } from './types';

export class InputRingBuffer {
	private buffer: InputEvent[];
	private capacity: number;
	private writeIndex = 0;
	private count = 0;
	private sequenceCounter = 0;

	constructor(capacity: number = 256) {
		this.capacity = capacity;
		this.buffer = new Array(capacity);
		for (let i = 0; i < capacity; i++) {
			this.buffer[i] = {
				input: 'mouse-left',
				action: 'down',
				timestamp: 0,
				sequence: -1,
			};
		}
	}

	push(input: InputKind, action: InputAction, timestamp: number): void {
		const slot = this.buffer[this.writeIndex];
		slot.input = input;
		slot.action = action;
		slot.timestamp = timestamp;
		slot.sequence = this.sequenceCounter++;

		this.writeIndex = (this.writeIndex + 1) % this.capacity;
		if (this.count < this.capacity) {
			this.count++;
		}
	}

	getUnconsumed(lastSeenSequence: number): InputEvent[] {
		const result: InputEvent[] = [];
		const oldestIndex =
			(this.writeIndex - this.count + this.capacity) % this.capacity;

		for (let i = 0; i < this.count; i++) {
			const idx = (oldestIndex + i) % this.capacity;
			const slot = this.buffer[idx];
			if (slot.sequence > lastSeenSequence) {
				result.push(slot);
			}
		}
		return result;
	}

	get size(): number {
		return this.count;
	}

	get latestSequence(): number {
		return this.sequenceCounter - 1;
	}

	clear(): void {
		this.writeIndex = 0;
		this.count = 0;
		this.sequenceCounter = 0;
	}
}
