import { createSignal, For } from 'solid-js';
import type { Combo, Step, InputKind, ActionKind } from './engine/types';
import { DEFAULT_MIN_HOLD_MS } from './engine/types';

const PIXELS_PER_MS = 0.15;
const TIMELINE_DURATION_MS = 8000;
const LANE_HEIGHT = 80;

interface LaneDef {
	id: 'attack' | 'evade';
	label: string;
	defaultInputs: InputKind[];
	color: string;
}

const LANES: LaneDef[] = [
	{
		id: 'attack',
		label: 'Attack (Left Click)',
		defaultInputs: ['mouse-left'],
		color: '#38bdf8',
	},
	{
		id: 'evade',
		label: 'Evade (Right Click / Shift)',
		defaultInputs: ['mouse-right', 'shift'],
		color: '#facc15',
	},
];

export function ComboEditor(props: {
	combo: Combo;
	onChange: (combo: Combo) => void;
	onTest: () => void;
}) {
	const [selectedStepId, setSelectedStepId] = createSignal<number | null>(null);

	const selectedStep = (): Step | undefined =>
		props.combo.steps.find((s) => s.id === selectedStepId());

	const nextId = (): number =>
		props.combo.steps.reduce((max, s) => Math.max(max, s.id), 0) + 1;

	const handleLaneClick = (lane: LaneDef, e: MouseEvent): void => {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const targetMs = Math.round(clickX / PIXELS_PER_MS);

		const newStep: Step = {
			id: nextId(),
			inputs: lane.defaultInputs,
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

	const laneForStep = (step: Step): LaneDef =>
		LANES.find((l) => l.defaultInputs.some((i) => step.inputs.includes(i))) ??
		LANES[0];

	return (
		<div class="flex flex-col gap-4 p-4 bg-neutral-900 text-white h-full">
			<div class="flex items-center justify-between">
				<input
					class="bg-neutral-800 px-2 py-1 rounded text-lg font-mono"
					value={props.combo.name}
					onInput={(e) =>
						props.onChange({ ...props.combo, name: e.currentTarget.value })
					}
				/>
				<button
					class="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-bold"
					onClick={props.onTest}
				>
					Test Combo
				</button>
			</div>

			<div
				class="relative bg-neutral-800 rounded overflow-x-auto"
				style={{ width: '100%' }}
			>
				<div
					class="relative"
					style={{ width: `${TIMELINE_DURATION_MS * PIXELS_PER_MS}px` }}
				>
					<For each={LANES}>
						{(lane) => (
							<div
								class="relative border-b border-neutral-700 cursor-pointer"
								style={{ height: `${LANE_HEIGHT}px` }}
								onClick={(e) => handleLaneClick(lane, e)}
							>
								<div class="absolute left-2 top-1 text-xs text-neutral-400 font-mono pointer-events-none">
									{lane.label}
								</div>

								<For
									each={props.combo.steps.filter(
										(s) => laneForStep(s).id === lane.id,
									)}
								>
									{(step) => (
										<div
											class="absolute top-6 rounded cursor-pointer border-2"
											style={{
												left: `${step.targetMs * PIXELS_PER_MS}px`,
												width:
													step.actionKind === 'hold'
														? `${(step.minHoldMs ?? DEFAULT_MIN_HOLD_MS) * PIXELS_PER_MS}px`
														: '24px',
												height: '40px',
												'background-color': lane.color,
												'border-color':
													selectedStepId() === step.id
														? '#ffffff'
														: 'transparent',
											}}
											onClick={(e) => {
												e.stopPropagation();
												setSelectedStepId(step.id);
											}}
										/>
									)}
								</For>
							</div>
						)}
					</For>
				</div>
			</div>

			{selectedStep() && (
				<div class="bg-neutral-800 rounded p-4 flex flex-col gap-3">
					<div class="flex items-center gap-4">
						<label class="flex flex-col text-sm">
							Target Time (ms)
							<input
								type="number"
								class="bg-neutral-700 px-2 py-1 rounded font-mono"
								value={selectedStep()!.targetMs}
								onInput={(e) =>
									updateSelectedStep({
										targetMs: Number(e.currentTarget.value),
									})
								}
							/>
						</label>

						<label class="flex flex-col text-sm">
							Action Type
							<select
								class="bg-neutral-700 px-2 py-1 rounded"
								value={selectedStep()!.actionKind}
								onChange={(e) =>
									updateSelectedStep({
										actionKind: e.currentTarget.value as ActionKind,
									})
								}
							>
								<option value="tap">Tap</option>
								<option value="hold">Hold</option>
							</select>
						</label>

						{selectedStep()!.actionKind === 'hold' && (
							<label class="flex flex-col text-sm">
								Min Hold (ms)
								<input
									type="number"
									class="bg-neutral-700 px-2 py-1 rounded font-mono"
									value={selectedStep()!.minHoldMs ?? DEFAULT_MIN_HOLD_MS}
									onInput={(e) =>
										updateSelectedStep({
											minHoldMs: Number(e.currentTarget.value),
										})
									}
								/>
							</label>
						)}

						<button
							class="bg-red-600 hover:bg-red-500 px-3 py-1 rounded self-end"
							onClick={deleteSelectedStep}
						>
							Delete Step
						</button>
					</div>

					{laneForStep(selectedStep()!).id === 'evade' && (
						<div class="flex gap-4 text-sm">
							<label class="flex items-center gap-1">
								<input
									type="checkbox"
									checked={selectedStep()!.inputs.includes('mouse-right')}
									onChange={(e) => {
										const inputs = new Set(selectedStep()!.inputs);
										e.currentTarget.checked
											? inputs.add('mouse-right')
											: inputs.delete('mouse-right');
										updateSelectedStep({
											inputs: Array.from(inputs) as InputKind[],
										});
									}}
								/>
								Right Click
							</label>
							<label class="flex items-center gap-1">
								<input
									type="checkbox"
									checked={selectedStep()!.inputs.includes('shift')}
									onChange={(e) => {
										const inputs = new Set(selectedStep()!.inputs);
										e.currentTarget.checked
											? inputs.add('shift')
											: inputs.delete('shift');
										updateSelectedStep({
											inputs: Array.from(inputs) as InputKind[],
										});
									}}
								/>
								Shift Key
							</label>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
