import { createSignal, For, Show, onCleanup } from 'solid-js';
import type { Combo, Step, InputEvent } from '../engine/types';
import { DEFAULT_MIN_HOLD_MS } from '../engine/types';
import { InputRingBuffer } from '../engine/ringBuffer';
import { InputCapture } from '../engine/inputCapture';
import { LANES as TRACKS } from '../data/laneConfig';
import type { LaneConfig } from '../data/laneConfig';

const PIXELS_PER_MS = 0.18;
const TIMELINE_DURATION_MS = 30000;
const TRACK_HEIGHT = 72;
const TAP_WIDTH_MS = 120;
const RULER_HEIGHT = 28;
const EVADE_DEBOUNCE_MS = 40;
const MAX_HISTORY = 30;

type Tool = 'pencil' | 'select';

function trackForStep(step: Step): LaneConfig {
	return (
		TRACKS.find((t) => t.inputs.some((i) => step.inputs.includes(i))) ??
		TRACKS[0]
	);
}

function stepWidthMs(step: Step): number {
	return step.actionKind === 'hold'
		? (step.minHoldMs ?? DEFAULT_MIN_HOLD_MS)
		: TAP_WIDTH_MS;
}

function dedupeEvadeEvents(events: InputEvent[]): InputEvent[] {
	const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
	const result: InputEvent[] = [];
	const suppressed = new Set<number>();

	for (const ev of sorted) {
		if (ev.action !== 'down') continue;
		if (ev.input !== 'mouse-right' && ev.input !== 'shift') continue;
		if (suppressed.has(ev.sequence)) continue;

		for (const other of sorted) {
			if (other.sequence === ev.sequence) continue;
			if (other.action !== 'down') continue;
			if (other.input !== 'mouse-right' && other.input !== 'shift') continue;
			if (Math.abs(other.timestamp - ev.timestamp) <= EVADE_DEBOUNCE_MS) {
				suppressed.add(other.sequence);
			}
		}
	}

	return events.filter((ev) => !suppressed.has(ev.sequence));
}

function buildStepsFromEvents(
	rawEvents: InputEvent[],
	baseMs: number,
	nowMs: number,
	finalize: boolean,
): Step[] {
	const events = dedupeEvadeEvents(rawEvents);
	const consumed = new Set<number>();
	const steps: Step[] = [];

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
			const targetMs = Math.round(ev.timestamp - baseMs);

			if (up) {
				consumed.add(up.sequence);
				const holdMs = Math.round(up.timestamp - ev.timestamp);
				steps.push({
					id: steps.length + 1,
					inputs: ['mouse-left'],
					actionKind: holdMs > 150 ? 'hold' : 'tap',
					targetMs,
					minHoldMs: holdMs > 150 ? holdMs : undefined,
				});
			} else if (!finalize) {
				const heldSoFar = Math.round(nowMs - ev.timestamp);
				steps.push({
					id: steps.length + 1,
					inputs: ['mouse-left'],
					actionKind: heldSoFar > 150 ? 'hold' : 'tap',
					targetMs,
					minHoldMs: heldSoFar > 150 ? heldSoFar : undefined,
				});
			}
		} else if (ev.input === 'mouse-right' || ev.input === 'shift') {
			consumed.add(ev.sequence);
			const targetMs = Math.round(ev.timestamp - baseMs);
			steps.push({
				id: steps.length + 1,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs,
			});
		}
	}

	return steps
		.sort((a, b) => a.targetMs - b.targetMs)
		.map((s, i) => ({ ...s, id: i + 1 }));
}

export function ComboEditor(props: {
	combo: Combo;
	onChange: (combo: Combo) => void;
	onTest: () => void;
}) {
	const [tool, setTool] = createSignal<Tool>('pencil');
	const [selectedIds, setSelectedIds] = createSignal<Set<number>>(
		new Set<number>(),
	);
	const [hover, setHover] = createSignal<{
		track: LaneConfig;
		ms: number;
	} | null>(null);
	const [isRecording, setIsRecording] = createSignal(false);
	const [recordStatus, setRecordStatus] = createSignal('');
	const [liveSteps, setLiveSteps] = createSignal<Step[] | null>(null);
	const [resizing, setResizing] = createSignal<{
		stepId: number;
		startX: number;
		startWidth: number;
	} | null>(null);
	const [dragging, setDragging] = createSignal<{
		startX: number;
		originalTargets: Map<number, number>;
	} | null>(null);
	const [marquee, setMarquee] = createSignal<{
		startX: number;
		startY: number;
		x: number;
		y: number;
	} | null>(null);

	let timelineRef: HTMLDivElement | undefined;
	let outerRef: HTMLDivElement | undefined;

	const undoStack: Combo[] = [];
	const redoStack: Combo[] = [];

	const pushHistory = (): void => {
		undoStack.push(JSON.parse(JSON.stringify(props.combo)));
		if (undoStack.length > MAX_HISTORY) undoStack.shift();
		redoStack.length = 0;
	};

	const commit = (updated: Combo): void => {
		pushHistory();
		props.onChange(updated);
	};

	const undo = (): void => {
		if (undoStack.length === 0) return;
		redoStack.push(JSON.parse(JSON.stringify(props.combo)));
		const prev = undoStack.pop()!;
		props.onChange(prev);
	};

	const redo = (): void => {
		if (redoStack.length === 0) return;
		undoStack.push(JSON.parse(JSON.stringify(props.combo)));
		const next = redoStack.pop()!;
		props.onChange(next);
	};

	const selectedStep = (): Step | undefined => {
		const ids = selectedIds();
		if (ids.size !== 1) return undefined;
		const id = Array.from(ids)[0];
		return props.combo.steps.find((s) => s.id === id);
	};

	const nextId = (): number =>
		props.combo.steps.reduce((max, s) => Math.max(max, s.id), 0) + 1;

	const stepsInTrack = (
		track: LaneConfig,
		steps: Step[] = props.combo.steps,
	): Step[] => steps.filter((s) => trackForStep(s).id === track.id);

	const hasOverlap = (
		track: LaneConfig,
		startMs: number,
		widthMs: number,
		excludeIds: Set<number> = new Set<number>(),
	): boolean => {
		const endMs = startMs + widthMs;
		return stepsInTrack(track).some((s) => {
			if (excludeIds.has(s.id)) return false;
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

	const handleTrackMouseMove = (track: LaneConfig, e: MouseEvent): void => {
		if (isRecording() || resizing() || dragging() || marquee()) return;
		if (tool() !== 'pencil') return;
		setHover({ track, ms: msFromClientX(e.clientX) });
	};

	const handleTrackClick = (track: LaneConfig, e: MouseEvent): void => {
		if (isRecording()) return;
		if ((e.target as HTMLElement).closest('[data-step]')) return;
		if (tool() !== 'pencil') return;

		const targetMs = msFromClientX(e.clientX);
		if (hasOverlap(track, targetMs, TAP_WIDTH_MS)) return;

		const newStep: Step = {
			id: nextId(),
			inputs: track.inputs,
			actionKind: 'tap',
			targetMs,
		};
		commit({ ...props.combo, steps: [...props.combo.steps, newStep] });
		setSelectedIds(new Set<number>([newStep.id]));
	};

	const handleStepContextMenu = (step: Step, e: MouseEvent): void => {
		e.preventDefault();
		if (isRecording() || tool() !== 'pencil') return;
		commit({
			...props.combo,
			steps: props.combo.steps.filter((s) => s.id !== step.id),
		});
		setSelectedIds((ids) => {
			const next = new Set<number>(ids);
			next.delete(step.id);
			return next;
		});
	};

	const handleStepClick = (step: Step, e: MouseEvent): void => {
		e.stopPropagation();
		if (isRecording() || tool() !== 'select') return;

		setSelectedIds((ids) => {
			const next = new Set<number>(ids);
			if (e.shiftKey) {
				next.has(step.id) ? next.delete(step.id) : next.add(step.id);
			} else {
				next.clear();
				next.add(step.id);
			}
			return next;
		});
	};

	const updateStep = (id: number, patch: Partial<Step>): void => {
		const steps = props.combo.steps.map((s) =>
			s.id === id ? { ...s, ...patch } : s,
		);
		commit({ ...props.combo, steps });
	};

	const deleteSelected = (): void => {
		const ids = selectedIds();
		if (ids.size === 0) return;
		commit({
			...props.combo,
			steps: props.combo.steps.filter((s) => !ids.has(s.id)),
		});
		setSelectedIds(new Set<number>());
	};

	const startResize = (step: Step, e: MouseEvent): void => {
		e.stopPropagation();
		pushHistory();
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

			if (
				!hasOverlap(
					track,
					target.targetMs,
					newWidth,
					new Set<number>([target.id]),
				)
			) {
				const steps = props.combo.steps.map((s) =>
					s.id === target.id ? { ...s, minHoldMs: newWidth } : s,
				);
				props.onChange({ ...props.combo, steps });
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

	const startDrag = (e: MouseEvent): void => {
		if (isRecording() || tool() !== 'select') return;
		const ids = selectedIds();
		if (ids.size === 0) return;

		e.stopPropagation();
		pushHistory();
		const originalTargets = new Map<number, number>();
		for (const s of props.combo.steps) {
			if (ids.has(s.id)) originalTargets.set(s.id, s.targetMs);
		}
		setDragging({ startX: e.clientX, originalTargets });

		const handleMove = (moveEvent: MouseEvent): void => {
			const d = dragging();
			if (!d) return;
			const deltaMs = Math.round(
				(moveEvent.clientX - d.startX) / PIXELS_PER_MS,
			);

			const proposed = props.combo.steps.map((s) => {
				if (!d.originalTargets.has(s.id)) return s;
				const newTarget = Math.max(0, d.originalTargets.get(s.id)! + deltaMs);
				return { ...s, targetMs: newTarget };
			});

			const isValid = proposed.every((s) => {
				if (!d.originalTargets.has(s.id)) return true;
				const track = trackForStep(s);
				return !hasOverlap(
					track,
					s.targetMs,
					stepWidthMs(s),
					new Set<number>(d.originalTargets.keys()),
				);
			});

			if (isValid) {
				props.onChange({ ...props.combo, steps: proposed });
			}
		};

		const handleUp = (): void => {
			setDragging(null);
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
		};

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	};

	const startMarquee = (e: MouseEvent): void => {
		if (isRecording() || tool() !== 'select') return;
		if ((e.target as HTMLElement).closest('[data-step]')) return;
		if (!outerRef) return;

		const rect = outerRef.getBoundingClientRect();
		const startX = e.clientX - rect.left + (timelineRef?.scrollLeft ?? 0);
		const startY = e.clientY - rect.top;
		setMarquee({ startX, startY, x: startX, y: startY });

		const handleMove = (moveEvent: MouseEvent): void => {
			if (!outerRef) return;
			const r = outerRef.getBoundingClientRect();
			const x = moveEvent.clientX - r.left + (timelineRef?.scrollLeft ?? 0);
			const y = moveEvent.clientY - r.top;
			setMarquee((m) => (m ? { ...m, x, y } : null));
		};

		const handleUp = (): void => {
			const m = marquee();
			if (m) {
				const left = Math.min(m.startX, m.x) / PIXELS_PER_MS;
				const right = Math.max(m.startX, m.x) / PIXELS_PER_MS;
				const top = Math.min(m.startY, m.y);
				const bottom = Math.max(m.startY, m.y);

				const matched = new Set<number>();
				TRACKS.forEach((track, trackIndex) => {
					const trackTop = RULER_HEIGHT + trackIndex * TRACK_HEIGHT;
					const trackBottom = trackTop + TRACK_HEIGHT;
					if (trackBottom < top || trackTop > bottom) return;

					for (const step of stepsInTrack(track)) {
						const stepStart = step.targetMs;
						const stepEnd = stepStart + stepWidthMs(step);
						if (stepEnd >= left && stepStart <= right) matched.add(step.id);
					}
				});

				setSelectedIds(matched);
			}
			setMarquee(null);
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
		if (hasOverlap(track, step.targetMs, newWidth, new Set<number>([step.id])))
			return;
		updateStep(step.id, { actionKind: 'hold', minHoldMs: newWidth });
	};

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (isRecording()) return;
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

		if ((e.key === 'Delete' || e.key === 'Backspace') && tool() === 'select') {
			deleteSelected();
		} else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			undo();
		} else if (
			(e.ctrlKey || e.metaKey) &&
			(e.key === 'y' || (e.key === 'z' && e.shiftKey))
		) {
			e.preventDefault();
			redo();
		}
	};

	window.addEventListener('keydown', handleKeyDown);
	onCleanup(() => window.removeEventListener('keydown', handleKeyDown));

	const startRecording = (): void => {
		pushHistory();
		setIsRecording(true);
		setSelectedIds(new Set<number>());
		setRecordStatus('Waiting for first input...');
		setLiveSteps([]);

		const buffer = new InputRingBuffer();
		const capture = new InputCapture(buffer, document.body);
		let startTime: number | null = null;

		capture.start();

		const previewInterval = setInterval(() => {
			const events = buffer.getUnconsumed(-1);
			if (events.length > 0 && startTime === null) {
				startTime = events[0].timestamp;
				setRecordStatus('Recording... press Enter to stop.');
			}
			if (startTime !== null) {
				setLiveSteps(
					buildStepsFromEvents(events, startTime, performance.now(), false),
				);
			}
		}, 50);

		const handleKeyDownRecord = (e: KeyboardEvent): void => {
			if (e.key !== 'Enter') return;

			clearInterval(previewInterval);
			capture.stop();
			window.removeEventListener('keydown', handleKeyDownRecord);

			const events = buffer.getUnconsumed(-1);
			const base = startTime ?? events[0]?.timestamp ?? performance.now();
			const finalSteps = buildStepsFromEvents(
				events,
				base,
				performance.now(),
				true,
			);

			props.onChange({ ...props.combo, steps: finalSteps });
			setLiveSteps(null);
			setIsRecording(false);
			setRecordStatus('');
		};

		window.addEventListener('keydown', handleKeyDownRecord);
	};

	const displayedSteps = (): Step[] => liveSteps() ?? props.combo.steps;

	return (
		<div class="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-6">
			<div class="flex items-center justify-between gap-4">
				<input
					class="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-lg font-mono flex-1 focus:outline-none focus:border-neutral-600"
					value={props.combo.name}
					onInput={(e) =>
						props.onChange({ ...props.combo, name: e.currentTarget.value })
					}
					disabled={isRecording()}
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
						disabled={isRecording()}
					/>
				</label>
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30"
					onClick={undo}
					disabled={isRecording() || undoStack.length === 0}
				>
					↶ Undo
				</button>
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30"
					onClick={redo}
					disabled={isRecording() || redoStack.length === 0}
				>
					↷ Redo
				</button>
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
					disabled={isRecording()}
				>
					Test Combo
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button
					class={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition-colors ${
						tool() === 'pencil'
							? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
							: 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
					}`}
					onClick={() => {
						setTool('pencil');
						setSelectedIds(new Set<number>());
					}}
					disabled={isRecording()}
				>
					✏️ Pencil
				</button>
				<button
					class={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition-colors ${
						tool() === 'select'
							? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
							: 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
					}`}
					onClick={() => setTool('select')}
					disabled={isRecording()}
				>
					⬚ Select
				</button>
				<span class="text-xs text-neutral-600 ml-2">
					{tool() === 'pencil'
						? 'Left-click to add, right-click an input to delete.'
						: 'Click or drag a rectangle to select, Shift+click for multiple, drag to move, Delete to remove.'}
				</span>
			</div>

			<Show when={recordStatus()}>
				<p class="text-sm text-yellow-400">{recordStatus()}</p>
			</Show>

			<div
				ref={outerRef}
				class={`rounded-lg border border-neutral-900 overflow-x-auto relative ${isRecording() ? 'opacity-50 pointer-events-none' : ''}`}
				onMouseDown={startMarquee}
			>
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
							{(_, i: () => number) => (
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
									class="relative border-b border-neutral-900"
									classList={{
										'cursor-crosshair': tool() === 'pencil',
										'cursor-default': tool() === 'select',
									}}
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

									<Show
										when={hover()?.track.id === track.id && tool() === 'pencil'}
									>
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

									<For each={stepsInTrack(track, displayedSteps())}>
										{(step) => (
											<div
												data-step
												class="absolute top-6 h-10 rounded flex items-center border-2"
												classList={{ 'cursor-grab': tool() === 'select' }}
												style={{
													left: `${step.targetMs * PIXELS_PER_MS}px`,
													width: `${stepWidthMs(step) * PIXELS_PER_MS}px`,
													'background-color': track.color,
													opacity: liveSteps()
														? 0.55
														: step.actionKind === 'hold'
															? 0.5
															: 0.85,
													'border-color': selectedIds().has(step.id)
														? '#ffffff'
														: 'transparent',
													'border-style': liveSteps() ? 'dashed' : 'solid',
												}}
												onClick={(e) => handleStepClick(step, e)}
												onContextMenu={(e) => handleStepContextMenu(step, e)}
												onMouseDown={(e) => {
													if (tool() === 'select' && selectedIds().has(step.id))
														startDrag(e);
												}}
											>
												<Show
													when={
														step.actionKind === 'hold' &&
														tool() === 'select' &&
														!liveSteps()
													}
												>
													<div
														class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 rounded-r"
														onMouseDown={(e) => {
															setSelectedIds(new Set<number>([step.id]));
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

				<Show when={marquee()}>
					<div
						class="absolute border border-cyan-400 bg-cyan-400/10 pointer-events-none"
						style={{
							left: `${Math.min(marquee()!.startX, marquee()!.x)}px`,
							top: `${Math.min(marquee()!.startY, marquee()!.y)}px`,
							width: `${Math.abs(marquee()!.x - marquee()!.startX)}px`,
							height: `${Math.abs(marquee()!.y - marquee()!.startY)}px`,
						}}
					/>
				</Show>
			</div>

			<Show when={selectedIds().size > 1}>
				<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
					<span class="text-sm text-neutral-400">
						{selectedIds().size} user inputs selected
					</span>
					<button
						class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors"
						onClick={deleteSelected}
					>
						Delete Selected
					</button>
				</div>
			</Show>

			<Show when={selectedStep()}>
				<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4">
					<label class="flex flex-col text-xs text-neutral-500">
						Target (ms)
						<input
							type="number"
							class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-24"
							value={selectedStep()!.targetMs}
							onInput={(e) =>
								updateStep(selectedStep()!.id, {
									targetMs: Number(e.currentTarget.value),
								})
							}
						/>
					</label>

					<Show when={selectedStep()!.actionKind === 'tap'}>
						<button
							class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
							onClick={convertToHold}
						>
							Convert Click to Hold
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
									updateStep(selectedStep()!.id, {
										minHoldMs: Number(e.currentTarget.value),
									})
								}
							/>
						</label>
						<button
							class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
							onClick={() =>
								updateStep(selectedStep()!.id, {
									actionKind: 'tap',
									minHoldMs: undefined,
								})
							}
						>
							Convert to Tap
						</button>
					</Show>

					<button
						class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors ml-auto"
						onClick={deleteSelected}
					>
						Delete Step
					</button>
				</div>
			</Show>
		</div>
	);
}
