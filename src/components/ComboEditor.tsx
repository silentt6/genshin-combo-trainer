import { createSignal, For, Show } from 'solid-js';
import type { Combo, Step, InputKind } from '../engine/types';
import { DEFAULT_MIN_HOLD_MS } from '../engine/types';
import { InputRingBuffer } from '../engine/ringBuffer';
import { InputCapture } from '../engine/inputCapture';

const PIXELS_PER_MS = 0.18;
const TIMELINE_DURATION_MS = 10000;
const TRACK_HEIGHT = 72;
const TAP_WIDTH_MS = 120;
const RULER_HEIGHT = 28;

interface TrackDef {
	id: 'attack' | 'evade';
	label: string;
	color: string;
	defaultInputs: InputKind[];
}

const TRACKS: TrackDef[] = [
	{
		id: 'attack',
		label: 'Attack — Left Click',
		color: '#38bdf8',
		defaultInputs: ['mouse-left'],
	},
	{
		id: 'evade',
		label: 'Evade — Right Click / Shift',
		color: '#facc15',
		defaultInputs: ['mouse-right', 'shift'],
	},
];

function trackForStep(step: Step): TrackDef {
	return (
		TRACKS.find((t) => t.defaultInputs.some((i) => step.inputs.includes(i))) ??
		TRACKS[0]
	);
}

function stepWidthMs(step: Step): number {
	return step.actionKind === 'hold'
		? (step.minHoldMs ?? DEFAULT_MIN_HOLD_MS)
		: TAP_WIDTH_MS;
}

export function ComboEditor(props: {
	combo: Combo;
	onChange: (combo: Combo) => void;
	onTest: () => void;
}) {
	const [selectedStepId, setSelectedStepId] = createSignal<number | null>(null);
	const [hover, setHover] = createSignal<{
		track: TrackDef;
		ms: number;
	} | null>(null);
	const [isRecording, setIsRecording] = createSignal(false);
	const [recordStatus, setRecordStatus] = createSignal('');
	const [resizing, setResizing] = createSignal<{
		stepId: number;
		startX: number;
		startWidth: number;
	} | null>(null);

	let timelineRef: HTMLDivElement | undefined;

	const selectedStep = (): Step | undefined =>
		props.combo.steps.find((s) => s.id === selectedStepId());

	const nextId = (): number =>
		props.combo.steps.reduce((max, s) => Math.max(max, s.id), 0) + 1;

	const stepsInTrack = (track: TrackDef): Step[] =>
		props.combo.steps.filter((s) => trackForStep(s).id === track.id);

	const hasOverlap = (
		track: TrackDef,
		startMs: number,
		widthMs: number,
		excludeId?: number,
	): boolean => {
		const endMs = startMs + widthMs;
		return stepsInTrack(track).some((s) => {
			if (s.id === excludeId) return false;
			const sStart = s.targetMs;
			const sEnd = sStart + stepWidthMs(s);
			return startMs < sEnd && endMs > sStart;
		});
	};

	const msFromClientX = (clientX: number): number => {
		if (!timelineRef) return 0;
		const rect = timelineRef.getBoundingClientRect();
		const x = clientX - rect.left + timelineRef.scrollLeft;
		return Math.max(0, Math.round(x / PIXELS_PER_MS));
	};

	const handleTrackMouseMove = (track: TrackDef, e: MouseEvent): void => {
		if (resizing()) return;
		setHover({ track, ms: msFromClientX(e.clientX) });
	};

	const handleTrackClick = (track: TrackDef, e: MouseEvent): void => {
		if ((e.target as HTMLElement).closest('[data-step]')) return;

		const targetMs = msFromClientX(e.clientX);
		if (hasOverlap(track, targetMs, TAP_WIDTH_MS)) return;

		const newStep: Step = {
			id: nextId(),
			inputs: track.defaultInputs,
			actionKind: 'tap',
			targetMs,
		};

		props.onChange({ ...props.combo, steps: [...props.combo.steps, newStep] });
		setSelectedStepId(newStep.id);
	};

	const updateSelectedStep = (patch: Partial<Step>): void => {
		const id = selectedStepId();
		if (id === null) return;
		const steps = props.combo.steps.map((s) =>
			s.id === id ? { ...s, ...patch } : s,
		);
		props.onChange({ ...props.combo, steps });
	};

	const deleteSelectedStep = (): void => {
		const id = selectedStepId();
		if (id === null) return;
		props.onChange({
			...props.combo,
			steps: props.combo.steps.filter((s) => s.id !== id),
		});
		setSelectedStepId(null);
	};

	const startResize = (step: Step, e: MouseEvent): void => {
		e.stopPropagation();
		setResizing({
			stepId: step.id,
			startX: e.clientX,
			startWidth: step.minHoldMs ?? DEFAULT_MIN_HOLD_MS,
		});

		const handleMove = (moveEvent: MouseEvent): void => {
			const r = resizing();
			if (!r) return;
			const deltaMs = (moveEvent.clientX - r.startX) / PIXELS_PER_MS;
			const newWidth = Math.max(100, Math.round(r.startWidth + deltaMs));

			const target = props.combo.steps.find((s) => s.id === r.stepId);
			if (!target) return;
			const track = trackForStep(target);

			if (!hasOverlap(track, target.targetMs, newWidth, target.id)) {
				updateSelectedStep({ minHoldMs: newWidth });
			}
		};

		const handleUp = (): void => {
			setResizing(null);
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
		};

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	};

	const convertToHold = (): void => {
		const step = selectedStep();
		if (!step) return;
		const track = trackForStep(step);
		const newWidth = DEFAULT_MIN_HOLD_MS;
		if (hasOverlap(track, step.targetMs, newWidth, step.id)) return;
		updateSelectedStep({ actionKind: 'hold', minHoldMs: newWidth });
	};

	const startRecording = (): void => {
		setIsRecording(true);
		setRecordStatus('Waiting for first input...');

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, document.body);
		let startTime: number | null = null;
		let recordedSteps: Step[] = [];

		capture.start();

		const checkFirstInput = setInterval(() => {
			const events = buffer.getUnconsumed(-1);
			if (events.length > 0 && startTime === null) {
				startTime = events[0].timestamp;
				setRecordStatus('Recording... press Enter to stop.');
			}
		}, 16);

		const handleKeyDown = (e: KeyboardEvent): void => {
			if (e.key !== 'Enter') return;

			clearInterval(checkFirstInput);
			capture.stop();
			window.removeEventListener('keydown', handleKeyDown);

			const events = buffer
				.getUnconsumed(-1)
				.filter((ev) => ev.input !== 'shift' || true);
			const base = startTime ?? events[0]?.timestamp ?? performance.now();
			const consumed = new Set<number>();

			for (const ev of events) {
				if (ev.action !== 'down' || consumed.has(ev.sequence)) continue;
				if (ev.input === 'mouse-left') {
					const up = events.find(
						(u) =>
							u.action === 'up' &&
							u.input === 'mouse-left' &&
							u.timestamp > ev.timestamp &&
							!consumed.has(u.sequence),
					);
					consumed.add(ev.sequence);
					const targetMs = Math.round(ev.timestamp - base);
					if (up) {
						consumed.add(up.sequence);
						const holdMs = Math.round(up.timestamp - ev.timestamp);
						recordedSteps.push({
							id: recordedSteps.length + 1,
							inputs: ['mouse-left'],
							actionKind: holdMs > 150 ? 'hold' : 'tap',
							targetMs,
							minHoldMs: holdMs > 150 ? holdMs : undefined,
						});
					} else {
						recordedSteps.push({
							id: recordedSteps.length + 1,
							inputs: ['mouse-left'],
							actionKind: 'tap',
							targetMs,
						});
					}
				} else if (ev.input === 'mouse-right' || ev.input === 'shift') {
					consumed.add(ev.sequence);
					const targetMs = Math.round(ev.timestamp - base);
					recordedSteps.push({
						id: recordedSteps.length + 1,
						inputs: ['mouse-right', 'shift'],
						actionKind: 'tap',
						targetMs,
					});
				}
			}

			recordedSteps = recordedSteps
				.map((s, i) => ({ ...s, id: i + 1 }))
				.sort((a, b) => a.targetMs - b.targetMs);
			props.onChange({ ...props.combo, steps: recordedSteps });
			setIsRecording(false);
			setRecordStatus('');
		};

		window.addEventListener('keydown', handleKeyDown);
	};

	return (
		<div class="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-6">
			<div class="flex items-center justify-between gap-4">
				<input
					class="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-lg font-mono flex-1 focus:outline-none focus:border-neutral-600"
					value={props.combo.name}
					onInput={(e) =>
						props.onChange({ ...props.combo, name: e.currentTarget.value })
					}
				/>
				<label class="flex flex-col text-xs text-neutral-500">
					Loop Interval (ms)
					<input
						type="number"
						class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-28"
						value={props.combo.loopIntervalMs ?? 1000}
						onInput={(e) =>
							props.onChange({
								...props.combo,
								loopIntervalMs: Number(e.currentTarget.value),
							})
						}
					/>
				</label>
				<button
					class={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
						isRecording()
							? 'bg-red-600 text-white'
							: 'bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white'
					}`}
					onClick={startRecording}
					disabled={isRecording()}
				>
					{isRecording() ? '● Recording' : 'Record'}
				</button>
				<button
					class="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
					onClick={props.onTest}
				>
					Test Combo
				</button>
			</div>

			<Show when={recordStatus()}>
				<p class="text-sm text-yellow-400">{recordStatus()}</p>
			</Show>

			<div class="rounded-lg border border-neutral-900 overflow-x-auto">
				<div style={{ width: `${TIMELINE_DURATION_MS * PIXELS_PER_MS}px` }}>
					<div
						class="relative border-b border-neutral-900"
						style={{ height: `${RULER_HEIGHT}px` }}
					>
						<For
							each={Array.from({
								length: Math.floor(TIMELINE_DURATION_MS / 500) + 1,
							})}
						>
							{(_, i) => (
								<div
									class="absolute top-0 text-[10px] text-neutral-600 font-mono"
									style={{ left: `${i() * 500 * PIXELS_PER_MS}px` }}
								>
									{i() % 2 === 0 ? `${(i() * 0.5).toFixed(1)}s` : ''}
									<div class="w-px h-2 bg-neutral-800" />
								</div>
							)}
						</For>
					</div>

					<div ref={timelineRef}>
						<For each={TRACKS}>
							{(track) => (
								<div
									class="relative border-b border-neutral-900 cursor-pointer"
									style={{
										height: `${TRACK_HEIGHT}px`,
										'background-color': 'rgba(255,255,255,0.02)',
									}}
									onMouseMove={(e) => handleTrackMouseMove(track, e)}
									onMouseLeave={() => setHover(null)}
									onClick={(e) => handleTrackClick(track, e)}
								>
									<div class="absolute left-2 top-1 text-[11px] text-neutral-500 font-mono pointer-events-none z-10">
										{track.label}
									</div>

									<Show when={hover()?.track.id === track.id && !resizing()}>
										<div
											class="absolute top-6 h-10 rounded border border-dashed flex items-center justify-center text-xs pointer-events-none"
											style={{
												left: `${(hover()?.ms ?? 0) * PIXELS_PER_MS}px`,
												width: `${TAP_WIDTH_MS * PIXELS_PER_MS}px`,
												'border-color': track.color,
												color: track.color,
												opacity: 0.5,
											}}
										>
											+
										</div>
									</Show>

									<For each={stepsInTrack(track)}>
										{(step) => (
											<div
												data-step
												class="absolute top-6 h-10 rounded flex items-center border-2"
												style={{
													left: `${step.targetMs * PIXELS_PER_MS}px`,
													width: `${stepWidthMs(step) * PIXELS_PER_MS}px`,
													'background-color': track.color,
													opacity: step.actionKind === 'hold' ? 0.5 : 0.85,
													'border-color':
														selectedStepId() === step.id
															? '#ffffff'
															: 'transparent',
												}}
												onClick={(e) => {
													e.stopPropagation();
													setSelectedStepId(step.id);
												}}
											>
												<Show when={step.actionKind === 'hold'}>
													<div
														class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 rounded-r"
														onMouseDown={(e) => {
															setSelectedStepId(step.id);
															startResize(step, e);
														}}
													/>
												</Show>
											</div>
										)}
									</For>
								</div>
							)}
						</For>
					</div>
				</div>
			</div>

			<Show when={selectedStep()}>
				<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4">
					<label class="flex flex-col text-xs text-neutral-500">
						Target (ms)
						<input
							type="number"
							class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-24"
							value={selectedStep()!.targetMs}
							onInput={(e) =>
								updateSelectedStep({ targetMs: Number(e.currentTarget.value) })
							}
						/>
					</label>

					<Show when={selectedStep()!.actionKind === 'tap'}>
						<button
							class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
							onClick={convertToHold}
						>
							Convert to Hold
						</button>
					</Show>

					<Show when={selectedStep()!.actionKind === 'hold'}>
						<label class="flex flex-col text-xs text-neutral-500">
							Hold Duration (ms)
							<input
								type="number"
								class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-24"
								value={selectedStep()!.minHoldMs ?? DEFAULT_MIN_HOLD_MS}
								onInput={(e) =>
									updateSelectedStep({
										minHoldMs: Number(e.currentTarget.value),
									})
								}
							/>
						</label>
						<button
							class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
							onClick={() =>
								updateSelectedStep({ actionKind: 'tap', minHoldMs: undefined })
							}
						>
							Convert to Tap
						</button>
					</Show>

					<button
						class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors ml-auto"
						onClick={deleteSelectedStep}
					>
						Delete Step
					</button>
				</div>
			</Show>
		</div>
	);
}
