import { createSignal, For, Show, onCleanup } from 'solid-js';
import type { Combo, Step } from '../engine/types';
import { InputRingBuffer } from '../engine/ringBuffer';
import { InputCapture } from '../engine/inputCapture';
import { LANES as TRACKS } from '../data/laneConfig';
import type { LaneConfig } from '../data/laneConfig';
import {
	trackForStep,
	stepWidthMs,
	hasOverlap,
	buildStepsFromEvents,
} from '../data/editorHelpers';
import {
	PIXELS_PER_MS,
	TIMELINE_DURATION_MS,
	TRACK_HEIGHT,
	RULER_HEIGHT,
	MAX_HISTORY,
} from '../data/editorConstants';
import { EditorToolbar } from './editor/EditorToolbar';
import { ComboSettings } from './editor/ComboSettings';
import { TimelineRuler } from './editor/TimelineRuler';
import { Track } from './editor/Track';
import { StepInspector } from './editor/StepInspector';
import { MultiSelectBar } from './editor/MultiSelectBar';

type Tool = 'pencil' | 'select';

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
	const [undoCount, setUndoCount] = createSignal(0);
	const [redoCount, setRedoCount] = createSignal(0);

	let timelineRef: HTMLDivElement | undefined;
	let outerRef: HTMLDivElement | undefined;

	const undoStack: Combo[] = [];
	const redoStack: Combo[] = [];

	const pushHistory = (): void => {
		undoStack.push(JSON.parse(JSON.stringify(props.combo)));
		if (undoStack.length > MAX_HISTORY) undoStack.shift();
		redoStack.length = 0;
		setUndoCount(undoStack.length);
		setRedoCount(0);
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
		setUndoCount(undoStack.length);
		setRedoCount(redoStack.length);
	};

	const redo = (): void => {
		if (redoStack.length === 0) return;
		undoStack.push(JSON.parse(JSON.stringify(props.combo)));
		const next = redoStack.pop()!;
		props.onChange(next);
		setUndoCount(undoStack.length);
		setRedoCount(redoStack.length);
	};

	const selectedStep = (): Step | undefined => {
		const ids = selectedIds();
		if (ids.size !== 1) return undefined;
		return props.combo.steps.find((s) => s.id === Array.from(ids)[0]);
	};

	const nextId = (): number =>
		props.combo.steps.reduce((max, s) => Math.max(max, s.id), 0) + 1;

	const stepsInTrack = (
		track: LaneConfig,
		steps: Step[] = props.combo.steps,
	): Step[] => steps.filter((s) => trackForStep(s).id === track.id);

	const msFromClientX = (clientX: number): number => {
		if (!timelineRef) return 0;
		const rect = timelineRef.getBoundingClientRect();
		return Math.max(
			0,
			Math.round(
				(clientX - rect.left + timelineRef.scrollLeft) / PIXELS_PER_MS,
			),
		);
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
		if (hasOverlap(props.combo.steps, track, targetMs, 120)) return;

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
		commit({
			...props.combo,
			steps: props.combo.steps.map((s) =>
				s.id === id ? { ...s, ...patch } : s,
			),
		});
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
			startWidth: step.minHoldMs ?? 400,
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
					props.combo.steps,
					track,
					target.targetMs,
					newWidth,
					new Set([target.id]),
				)
			) {
				props.onChange({
					...props.combo,
					steps: props.combo.steps.map((s) =>
						s.id === target.id ? { ...s, minHoldMs: newWidth } : s,
					),
				});
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
		for (const s of props.combo.steps)
			if (ids.has(s.id)) originalTargets.set(s.id, s.targetMs);
		setDragging({ startX: e.clientX, originalTargets });

		const handleMove = (moveEvent: MouseEvent): void => {
			const d = dragging();
			if (!d) return;
			const deltaMs = Math.round(
				(moveEvent.clientX - d.startX) / PIXELS_PER_MS,
			);

			const proposed = props.combo.steps.map((s) =>
				d.originalTargets.has(s.id)
					? {
							...s,
							targetMs: Math.max(0, d.originalTargets.get(s.id)! + deltaMs),
						}
					: s,
			);

			const isValid = proposed.every((s) => {
				if (!d.originalTargets.has(s.id)) return true;
				return !hasOverlap(
					proposed,
					trackForStep(s),
					s.targetMs,
					stepWidthMs(s),
					new Set(d.originalTargets.keys()),
				);
			});

			if (isValid) props.onChange({ ...props.combo, steps: proposed });
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
			setMarquee((m) =>
				m
					? {
							...m,
							x: moveEvent.clientX - r.left + (timelineRef?.scrollLeft ?? 0),
							y: moveEvent.clientY - r.top,
						}
					: null,
			);
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
						const stepEnd = step.targetMs + stepWidthMs(step);
						if (stepEnd >= left && step.targetMs <= right) matched.add(step.id);
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
		if (
			hasOverlap(
				props.combo.steps,
				track,
				step.targetMs,
				400,
				new Set([step.id]),
			)
		)
			return;
		updateStep(step.id, { actionKind: 'hold', minHoldMs: 400 });
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
				setRecordStatus('Recording inputs... press ENTER to stop.');
			}
			if (startTime !== null)
				setLiveSteps(
					buildStepsFromEvents(events, startTime, performance.now(), false),
				);
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
			<ComboSettings
				combo={props.combo}
				onChange={props.onChange}
				disabled={isRecording()}
			/>

			<EditorToolbar
				tool={tool()}
				onToolChange={(t) => {
					setTool(t);
					setSelectedIds(new Set<number>());
				}}
				isRecording={isRecording()}
				onRecord={startRecording}
				onTest={props.onTest}
				onUndo={undo}
				onRedo={redo}
				canUndo={undoCount() > 0}
				canRedo={redoCount() > 0}
			/>

			<Show when={recordStatus()}>
				<p class="text-sm text-yellow-400">{recordStatus()}</p>
			</Show>

			<div
				ref={outerRef}
				class={`rounded-lg border border-neutral-900 overflow-x-auto relative ${isRecording() ? 'opacity-50 pointer-events-none' : ''}`}
				onMouseDown={startMarquee}
			>
				<div style={{ width: `${TIMELINE_DURATION_MS * PIXELS_PER_MS}px` }}>
					<TimelineRuler />
					<div ref={timelineRef}>
						<For each={TRACKS}>
							{(track) => (
								<Track
									track={track}
									steps={stepsInTrack(track, displayedSteps())}
									tool={tool()}
									hoverMs={hover()?.track.id === track.id ? hover()!.ms : null}
									selectedIds={selectedIds()}
									liveMode={liveSteps() !== null}
									onTrackMouseMove={(e) => handleTrackMouseMove(track, e)}
									onTrackMouseLeave={() => setHover(null)}
									onTrackClick={(e) => handleTrackClick(track, e)}
									onStepClick={handleStepClick}
									onStepContextMenu={handleStepContextMenu}
									onStepMouseDown={(step, e) => {
										if (tool() === 'select' && selectedIds().has(step.id))
											startDrag(e);
									}}
									onResizeMouseDown={(step, e) => {
										setSelectedIds(new Set<number>([step.id]));
										startResize(step, e);
									}}
								/>
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
				<MultiSelectBar
					count={selectedIds().size}
					onDeleteAll={deleteSelected}
				/>
			</Show>

			<Show when={selectedStep()}>
				<StepInspector
					step={selectedStep()!}
					onUpdate={(patch) => updateStep(selectedStep()!.id, patch)}
					onConvertToHold={convertToHold}
					onDelete={deleteSelected}
				/>
			</Show>
		</div>
	);
}
