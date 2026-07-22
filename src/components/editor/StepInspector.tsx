import { Show } from 'solid-js';
import type { Step } from '../../engine/types';
import { DEFAULT_MIN_HOLD_MS } from '../../engine/types';

export function StepInspector(props: {
	step: Step;
	allowHold: boolean;
	onUpdate: (patch: Partial<Step>) => void;
	onConvertToHold: () => void;
	onDelete: () => void;
}) {
	return (
		<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center gap-4">
			<label class="flex flex-col text-xs text-neutral-500">
				Target (ms)
				<input
					type="number"
					class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-24"
					value={props.step.targetMs}
					onInput={(e) =>
						props.onUpdate({ targetMs: Number(e.currentTarget.value) })
					}
				/>
			</label>

			<Show when={props.step.actionKind === 'tap' && props.allowHold}>
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
					onClick={props.onConvertToHold}
				>
					Convert to Hold
				</button>
			</Show>

			<Show when={props.step.actionKind === 'hold'}>
				<label class="flex flex-col text-xs text-neutral-500">
					Hold Duration (ms)
					<input
						type="number"
						class="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 mt-1 font-mono text-sm w-24"
						value={props.step.minHoldMs ?? DEFAULT_MIN_HOLD_MS}
						onInput={(e) =>
							props.onUpdate({ minHoldMs: Number(e.currentTarget.value) })
						}
					/>
				</label>
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 text-neutral-300 hover:text-white transition-colors"
					onClick={() =>
						props.onUpdate({ actionKind: 'tap', minHoldMs: undefined })
					}
				>
					Convert to Tap
				</button>
			</Show>

			<button
				class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors ml-auto"
				onClick={props.onDelete}
			>
				Delete Step
			</button>
		</div>
	);
}
