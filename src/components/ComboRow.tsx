import type { JSX } from 'solid-js';
import type { Combo } from '../engine/types';

export function ComboRow(props: { combo: Combo; children: JSX.Element }) {
	return (
		<div class="flex items-center justify-between px-4 py-3 border-b border-neutral-900 last:border-b-0">
			<div>
				<p class="font-medium">{props.combo.name}</p>
				<p class="text-xs text-neutral-500">{props.combo.steps.length} steps</p>
			</div>
			<div class="flex gap-2">{props.children}</div>
		</div>
	);
}
