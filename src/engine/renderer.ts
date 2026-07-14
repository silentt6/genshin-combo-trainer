import type { Step, Combo, InputKind } from './types';
import { DEFAULT_MIN_HOLD_MS } from './types';

export interface LaneConfig {
	id: 'attack' | 'evade';
	inputs: InputKind[];
	x: number;
	color: string;
}

const LANES: LaneConfig[] = [
	{ id: 'attack', inputs: ['mouse-left'], x: 0.35, color: '#38bdf8' },
	{ id: 'evade', inputs: ['mouse-right', 'shift'], x: 0.65, color: '#facc15' },
];

const HIT_LINE_Y_RATIO = 0.85;
const TAP_RADIUS = 20;
const HOLD_BAR_WIDTH = 24;

export class Renderer {
	private ctx: CanvasRenderingContext2D;
	private canvas: HTMLCanvasElement;
	private dpr: number;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas 2D context not available');
		this.ctx = ctx;
		this.dpr = window.devicePixelRatio || 1;
		this.resize();
		window.addEventListener('resize', this.resize);
	}

	private resize = (): void => {
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = Math.floor(rect.width * this.dpr);
		this.canvas.height = Math.floor(rect.height * this.dpr);
		this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
	};

	private get cssWidth(): number {
		return this.canvas.width / this.dpr;
	}

	private get cssHeight(): number {
		return this.canvas.height / this.dpr;
	}

	render(
		nowMs: number,
		combo: Combo,
		initialStartMs: number,
		cycleDurationMs: number,
	): void {
		const { ctx } = this;
		const width = this.cssWidth;
		const height = this.cssHeight;

		ctx.clearRect(0, 0, width, height);

		const hitLineY = height * HIT_LINE_Y_RATIO;
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, hitLineY);
		ctx.lineTo(width, hitLineY);
		ctx.stroke();

		for (const lane of LANES) {
			ctx.fillStyle = 'rgba(255,255,255,0.05)';
			ctx.fillRect(lane.x * width - 40, 0, 80, height);
		}

		const currentCycleIndex =
			nowMs < initialStartMs
				? 0
				: Math.floor((nowMs - initialStartMs) / cycleDurationMs);

		for (const cycleIndex of [currentCycleIndex, currentCycleIndex + 1]) {
			const cycleStartMs = initialStartMs + cycleIndex * cycleDurationMs;

			for (const step of combo.steps) {
				const lane = LANES.find((l) =>
					l.inputs.some((i) => step.inputs.includes(i)),
				);
				if (!lane) continue;

				const targetAbsoluteMs = cycleStartMs + step.targetMs;
				const msUntilHit = targetAbsoluteMs - nowMs;
				const y = hitLineY - msUntilHit * combo.scrollSpeed;

				if (step.actionKind === 'tap') {
					if (y < -TAP_RADIUS || y > height + TAP_RADIUS) continue;
					const x = lane.x * width;
					ctx.beginPath();
					ctx.arc(x, y, TAP_RADIUS, 0, Math.PI * 2);
					ctx.fillStyle = lane.color;
					ctx.fill();
				} else {
					const minHold = step.minHoldMs ?? DEFAULT_MIN_HOLD_MS;
					const barHeight = minHold * combo.scrollSpeed;
					const barTopY = y - barHeight;
					if (barTopY > height + TAP_RADIUS || y < -TAP_RADIUS) continue;

					const x = lane.x * width;
					ctx.fillStyle = lane.color;
					ctx.globalAlpha = 0.4;
					ctx.fillRect(
						x - HOLD_BAR_WIDTH / 2,
						barTopY,
						HOLD_BAR_WIDTH,
						barHeight,
					);
					ctx.globalAlpha = 1;

					ctx.beginPath();
					ctx.arc(x, y, TAP_RADIUS, 0, Math.PI * 2);
					ctx.fillStyle = lane.color;
					ctx.fill();

					ctx.beginPath();
					ctx.arc(x, barTopY, TAP_RADIUS * 0.6, 0, Math.PI * 2);
					ctx.strokeStyle = '#ffffff';
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			}
		}
	}
}
