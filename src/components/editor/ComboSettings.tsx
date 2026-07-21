import type { Combo } from '../../engine/types';

export function ComboSettings(props: {
	combo: Combo;
	onChange: (combo: Combo) => void;
	disabled: boolean;
}) {
	return (
		<div class="flex items-center gap-4">
			<input
				class="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-lg font-mono flex-1 focus:outline-none focus:border-neutral-600"
				value={props.combo.name}
				onInput={(e) =>
					props.onChange({ ...props.combo, name: e.currentTarget.value })
				}
				disabled={props.disabled}
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
					disabled={props.disabled}
				/>
			</label>
		</div>
	);
}
