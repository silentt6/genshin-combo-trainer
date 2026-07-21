import { Show } from 'solid-js';
import type { Step } from '../../engine/types';
import type { LaneConfig } from '../../data/laneConfig';
import { stepWidthMs } from '../../data/editorHelpers';
import { PIXELS_PER_MS } from '../../data/editorConstants';

export function StepBlock(props: {
	step: Step;
	track: LaneConfig;
	selected: boolean;
	tool: 'pencil' | 'select';
	liveMode: boolean;
	onClick: (e: MouseEvent) => void;
	onContextMenu: (e: MouseEvent) => void;
	onMouseDown: (e: MouseEvent) => void;
	onResizeMouseDown: (e: MouseEvent) => void;
}) {
	return (
		<div
			data-step
			class="absolute top-6 h-10 rounded flex items-center border-2"
			classList={{ 'cursor-grab': props.tool === 'select' }}
			style={{
				left: `${props.step.targetMs * PIXELS_PER_MS}px`,
				width: `${stepWidthMs(props.step) * PIXELS_PER_MS}px`,
				'background-color': props.track.color,
				opacity: props.liveMode
					? 0.55
					: props.step.actionKind === 'hold'
						? 0.5
						: 0.85,
				'border-color': props.selected ? '#ffffff' : 'transparent',
				'border-style': props.liveMode ? 'dashed' : 'solid',
			}}
			onClick={props.onClick}
			onContextMenu={props.onContextMenu}
			onMouseDown={props.onMouseDown}
		>
			<Show
				when={
					props.step.actionKind === 'hold' &&
					props.tool === 'select' &&
					!props.liveMode
				}
			>
				<div
					class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/40 rounded-r"
					onMouseDown={props.onResizeMouseDown}
				/>
			</Show>
		</div>
	);
}
