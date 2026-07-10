export type UpdateFn = (nowMs: number, tickMs: number) => void;
export type RenderFn = (nowMs: number) => void;

export class GameLoop {
	private tickMs: number;
	private accumulator = 0;
	private lastFrameTime = 0;
	private rafHandle: number | null = null;
	private running = false;

	private update: UpdateFn;
	private render: RenderFn;

	constructor(update: UpdateFn, render: RenderFn, tickHz: number = 240) {
		this.update = update;
		this.render = render;
		this.tickMs = 1000 / tickHz;
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.lastFrameTime = performance.now();
		this.rafHandle = requestAnimationFrame(this.loop);
	}

	stop(): void {
		this.running = false;
		if (this.rafHandle !== null) {
			cancelAnimationFrame(this.rafHandle);
			this.rafHandle = null;
		}
	}

	private loop = (now: number): void => {
		if (!this.running) return;

		let frameDelta = now - this.lastFrameTime;
		this.lastFrameTime = now;

		if (frameDelta > 250) {
			frameDelta = 250;
		}

		this.accumulator += frameDelta;

		while (this.accumulator >= this.tickMs) {
			this.update(now, this.tickMs);
			this.accumulator -= this.tickMs;
		}

		this.render(now);

		this.rafHandle = requestAnimationFrame(this.loop);
	};
}
