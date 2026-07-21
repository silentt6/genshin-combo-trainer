import { For, Show } from 'solid-js';
import type { Step } from '../../engine/types';
import type { LaneConfig } from '../../data/laneConfig';
import { StepBlock } from './StepBlock';
import {
	TAP_WIDTH_MS,
	TRACK_HEIGHT,
	PIXELS_PER_MS,
} from '../../data/editorConstants';

export function Track(props: {
	track: LaneConfig;
	steps: Step[];
	tool: 'pencil' | 'select';
	hoverMs: number | null;
	selectedIds: Set<number>;
	liveMode: boolean;
	onTrackMouseMove: (e: MouseEvent) => void;
	onTrackMouseLeave: () => void;
	onTrackClick: (e: MouseEvent) => void;
	onStepClick: (step: Step, e: MouseEvent) => void;
	onStepContextMenu: (step: Step, e: MouseEvent) => void;
	onStepMouseDown: (step: Step, e: MouseEvent) => void;
	onResizeMouseDown: (step: Step, e: MouseEvent) => void;
}) {
	return (
		<div
			class="relative border-b border-neutral-900"
			classList={{
				'cursor-crosshair': props.tool === 'pencil',
				'cursor-default': props.tool === 'select',
			}}
			style={{
				height: `${TRACK_HEIGHT}px`,
				'background-color': 'rgba(255,255,255,0.02)',
			}}
			onMouseMove={props.onTrackMouseMove}
			onMouseLeave={props.onTrackMouseLeave}
			onClick={props.onTrackClick}
		>
			<div class="absolute left-2 top-1 text-[11px] text-neutral-500 font-mono pointer-events-none z-10">
				{props.track.label}
			</div>

			<Show when={props.hoverMs !== null && props.tool === 'pencil'}>
				<div
					class="absolute top-6 h-10 rounded border border-dashed flex items-center justify-center text-xs pointer-events-none"
					style={{
						left: `${(props.hoverMs ?? 0) * PIXELS_PER_MS}px`,
						width: `${TAP_WIDTH_MS * PIXELS_PER_MS}px`,
						'border-color': props.track.color,
						color: props.track.color,
						opacity: 0.5,
					}}
				>
					+
				</div>
			</Show>

			<For each={props.steps}>
				{(step) => (
					<StepBlock
						step={step}
						track={props.track}
						selected={props.selectedIds.has(step.id)}
						tool={props.tool}
						liveMode={props.liveMode}
						onClick={(e) => props.onStepClick(step, e)}
						onContextMenu={(e) => props.onStepContextMenu(step, e)}
						onMouseDown={(e) => props.onStepMouseDown(step, e)}
						onResizeMouseDown={(e) => props.onResizeMouseDown(step, e)}
					/>
				)}
			</For>
		</div>
	);
}
