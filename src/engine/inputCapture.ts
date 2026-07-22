import { InputRingBuffer } from './ringBuffer';
import type { InputKind } from './types';

export class InputCapture {
	private buffer: InputRingBuffer;
	private target: HTMLElement;

	constructor(buffer: InputRingBuffer, target: HTMLElement = document.body) {
		this.buffer = buffer;
		this.target = target;
	}

	start(): void {
		this.target.addEventListener('mousedown', this.handleMouseDown);
		this.target.addEventListener('mouseup', this.handleMouseUp);
		this.target.addEventListener('contextmenu', this.handleContextMenu);
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
	}

	stop(): void {
		this.target.removeEventListener('mousedown', this.handleMouseDown);
		this.target.removeEventListener('mouseup', this.handleMouseUp);
		this.target.removeEventListener('contextmenu', this.handleContextMenu);
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
	}

	private handleContextMenu = (e: MouseEvent): void => {
		e.preventDefault();
	};

	private handleMouseDown = (e: MouseEvent): void => {
		const input = this.mapMouseButton(e.button);
		if (input === null) return;
		this.buffer.push(input, 'down', performance.now());
	};

	private handleMouseUp = (e: MouseEvent): void => {
		const input = this.mapMouseButton(e.button);
		if (input === null) return;
		this.buffer.push(input, 'up', performance.now());
	};

	private handleKeyDown = (e: KeyboardEvent): void => {
		const input = this.mapKey(e.key);
		if (input === null) return;
		if (input === 'space') e.preventDefault();
		if (e.repeat) return;
		this.buffer.push(input, 'down', performance.now());
	};

	private handleKeyUp = (e: KeyboardEvent): void => {
		const input = this.mapKey(e.key);
		if (input === null) return;
		if (input === 'space') e.preventDefault();
		this.buffer.push(input, 'up', performance.now());
	};

	private mapKey(key: string): InputKind | null {
		switch (key) {
			case 'Shift':
				return 'shift';
			case 'q':
			case 'Q':
				return 'q';
			case 'e':
			case 'E':
				return 'e';
			case ' ':
				return 'space';
			default:
				return null;
		}
	}

	private mapMouseButton(button: number): InputKind | null {
		if (button === 0) return 'mouse-left';
		if (button === 2) return 'mouse-right';
		return null;
	}
}
