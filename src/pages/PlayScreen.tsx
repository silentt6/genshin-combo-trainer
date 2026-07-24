import { onMount, onCleanup, createSignal } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { InputRingBuffer } from '../engine/ringBuffer';
import { InputCapture } from '../engine/inputCapture';
import { Judge } from '../engine/judge';
import { GameLoop } from '../engine/gameLoop';
import { HIT_LINE_Y_RATIO, Renderer } from '../engine/renderer';
import { createHudApi } from '../components/Hud';
import { loadCombos } from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';
import { useShellConfig } from '../components/AppShell';
import {
	getScrollSpeed,
	setScrollSpeed,
	MIN_SCROLL_SPEED,
	MAX_SCROLL_SPEED,
} from '../data/settings';
import { getActiveLanes } from '../engine/renderer';
import type { PositionedLane } from '../engine/renderer';
import { laneForInputs } from '../data/laneConfig';
import type { InputKind, Verdict } from '../engine/types';
import { LaneHud, type JudgmentPopup } from '../components/LaneHud';

const COUNTDOWN_MS = 3000;
const START_DELAY_MS = 1000;

export default function PlayScreen() {
	const params = useParams();
	const navigate = useNavigate();
	let canvasRef: HTMLCanvasElement | undefined;
	const { hudApi, Hud } = createHudApi();
	const [isPlaying] = createSignal(true);
	const [scrollSpeed, setScrollSpeedSignal] = createSignal(getScrollSpeed());
	const [pressedLanes, setPressedLanes] = createSignal<Set<string>>(new Set());
	const [glowByLane, setGlowByLane] = createSignal<Map<string, Verdict>>(
		new Map(),
	);
	const [popups, setPopups] = createSignal<JudgmentPopup[]>([]);
	const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 });
	let popupKey = 0;

	const activeLanes = (): PositionedLane[] =>
		activeCombo ? getActiveLanes(activeCombo) : [];

	const triggerLaneFeedback = (laneId: string, verdict: Verdict): void => {
		setGlowByLane((m) => new Map(m).set(laneId, verdict));
		setTimeout(() => {
			setGlowByLane((m) => {
				const next = new Map(m);
				next.delete(laneId);
				return next;
			});
		}, 300);

		popupKey += 1;
		const key = popupKey;
		const jitterX = (Math.random() - 0.5) * 80; // ±40px
		const jitterY = (Math.random() - 0.5) * 40; // ±20px
		setPopups((p) => [...p, { key, laneId, verdict, jitterX, jitterY }]);
	};

	const removePopup = (key: number): void => {
		setPopups((p) => p.filter((entry) => entry.key !== key));
	};

	const handleSpeedChange = (value: number): void => {
		setScrollSpeedSignal(value);
		setScrollSpeed(value);
	};

	const findCombo = () => {
		const saved = loadCombos();
		const savedMatch = saved.find((c) => c.id === params.comboId);
		if (savedMatch) return savedMatch;
		return BUILT_IN_COMBOS.find((c) => c.id === params.comboId);
	};

	const activeCombo = findCombo();

	useShellConfig({ title: '', fullscreen: true });

	onMount(() => {
		if (!canvasRef || !activeCombo) return;

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, canvasRef);
		const renderer = new Renderer(canvasRef);
		capture.start();

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width, height } = entry.contentRect;
			setCanvasSize({ width, height });
		});
		resizeObserver.observe(canvasRef);
		onCleanup(() => resizeObserver.disconnect());

		const mapKey = (key: string): InputKind | null => {
			if (key === 'Shift') return 'shift';
			if (key === 'q' || key === 'Q') return 'q';
			if (key === 'e' || key === 'E') return 'e';
			if (key === ' ') return 'space';
			return null;
		};

		const setPressed = (input: InputKind, isDown: boolean): void => {
			const lane = laneForInputs([input]);
			if (!lane) return;
			setPressedLanes((s) => {
				const next = new Set(s);
				isDown ? next.add(lane.id) : next.delete(lane.id);
				return next;
			});
		};

		const handleVisualMouseDown = (e: MouseEvent): void => {
			if (e.button === 0) setPressed('mouse-left', true);
			if (e.button === 2) setPressed('mouse-right', true);
		};
		const handleVisualMouseUp = (e: MouseEvent): void => {
			if (e.button === 0) setPressed('mouse-left', false);
			if (e.button === 2) setPressed('mouse-right', false);
		};
		const handleVisualKeyDown = (e: KeyboardEvent): void => {
			const input = mapKey(e.key);
			if (input) setPressed(input, true);
		};
		const handleVisualKeyUp = (e: KeyboardEvent): void => {
			const input = mapKey(e.key);
			if (input) setPressed(input, false);
		};

		canvasRef.addEventListener('mousedown', handleVisualMouseDown);
		canvasRef.addEventListener('mouseup', handleVisualMouseUp);
		window.addEventListener('keydown', handleVisualKeyDown);
		window.addEventListener('keyup', handleVisualKeyUp);

		onCleanup(() => {
			canvasRef?.removeEventListener('mousedown', handleVisualMouseDown);
			canvasRef?.removeEventListener('mouseup', handleVisualMouseUp);
			window.removeEventListener('keydown', handleVisualKeyDown);
			window.removeEventListener('keyup', handleVisualKeyUp);
		});

		const initialStartMs = performance.now() + COUNTDOWN_MS;
		const gameplayStartMs = initialStartMs + START_DELAY_MS;

		const loopIntervalMs = activeCombo.loopIntervalMs ?? 1000;
		const lastStepEndMs = Math.max(
			0,
			...activeCombo.steps.map(
				(s) => s.targetMs + (s.actionKind === 'hold' ? (s.minHoldMs ?? 0) : 0),
			),
		);
		const cycleDurationMs = lastStepEndMs + loopIntervalMs;

		const judge = new Judge();
		let pendingSteps = [...activeCombo.steps];
		const handledStray = new Set<number>();
		let lastCycleIndex = -1;

		const loop = new GameLoop(
			(now) => {
				if (!isPlaying()) return;
				if (now < gameplayStartMs) return;

				const elapsed = now - gameplayStartMs;
				const cycleIndex = Math.floor(elapsed / cycleDurationMs);

				if (cycleIndex !== lastCycleIndex) {
					pendingSteps = [...activeCombo.steps];
					lastCycleIndex = cycleIndex;
				}

				const cycleStartMs = gameplayStartMs + cycleIndex * cycleDurationMs;
				const allEvents = buffer.getUnconsumed(-1);
				const gameplayEvents = allEvents.filter(
					(e) => e.timestamp > gameplayStartMs - START_DELAY_MS / 4,
				);

				for (let i = pendingSteps.length - 1; i >= 0; i--) {
					const step = pendingSteps[i];
					const result = judge.classify(
						step,
						cycleStartMs,
						now,
						gameplayEvents,
					);
					if (result !== null) {
						hudApi.reportResult(result);
						const laneForThisStep = laneForInputs(step.inputs);
						if (laneForThisStep)
							triggerLaneFeedback(laneForThisStep.id, result.verdict);
						if (result.final) pendingSteps.splice(i, 1);
					}
				}

				for (const event of gameplayEvents) {
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
					const strayLane = laneForInputs([event.input]);
					if (strayLane) triggerLaneFeedback(strayLane.id, 'stray');
				}
			},
			(now) => {
				renderer.render(
					now,
					activeCombo,
					gameplayStartMs,
					cycleDurationMs,
					scrollSpeed(),
				);

				if (now < initialStartMs) {
					hudApi.setCountdown(Math.ceil((initialStartMs - now) / 1000));
				} else if (now < initialStartMs + 500) {
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
					class="cursor-pointer bg-cyan-600 px-4 py-2 rounded"
					onClick={() => navigate('/')}
				>
					Back to Lobby
				</button>
			</div>
		);
	}

	return (
		<div class="w-screen h-screen bg-neutral-900 relative overflow-hidden">
			<div class="absolute top-4 left-4 z-10 flex flex-col items-center gap-2">
				<button
					class="cursor-pointer bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded text-white"
					onClick={() => navigate('/')}
				>
					← Back
				</button>

				<div class="flex flex-col items-center gap-1 bg-neutral-800/80 border border-neutral-700 rounded-lg px-2 py-3">
					<span class="text-[10px] text-neutral-400 font-mono">
						{scrollSpeed().toFixed(2)}x
					</span>
					<input
						type="range"
						min={MIN_SCROLL_SPEED}
						max={MAX_SCROLL_SPEED}
						step={0.05}
						value={scrollSpeed()}
						class="h-32 cursor-pointer"
						style={{ 'writing-mode': 'vertical-lr', direction: 'rtl' }}
						onInput={(e) => handleSpeedChange(Number(e.currentTarget.value))}
					/>
					<span class="text-[10px] text-neutral-500">Speed</span>
				</div>
			</div>

			<canvas ref={canvasRef} class="w-full h-full block" />
			<LaneHud
				lanes={activeLanes()}
				width={canvasSize().width}
				hitLineY={canvasSize().height * HIT_LINE_Y_RATIO}
				pressedLanes={pressedLanes()}
				glowByLane={glowByLane()}
				popups={popups()}
				onPopupDone={removePopup}
			/>
			<Hud />
		</div>
	);
}
