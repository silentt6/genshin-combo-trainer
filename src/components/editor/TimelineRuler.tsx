import { For } from 'solid-js';
import {
	TIMELINE_DURATION_MS,
	RULER_HEIGHT,
	PIXELS_PER_MS,
} from '../../data/editorConstants';

export function TimelineRuler() {
	return (
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
	);
}
