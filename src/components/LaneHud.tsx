import { For, Show, createSignal, onCleanup } from 'solid-js';
import type { PositionedLane } from '../engine/renderer';
import type { Verdict } from '../engine/types';
import { verdictColor, verdictLabel } from './Hud';

export interface JudgmentPopup {
	key: number;
	laneId: string;
	verdict: Verdict;
}

export function LaneHud(props: {
	lanes: PositionedLane[];
	width: number;
	hitLineY: number;
	pressedLanes: Set<string>;
	glowByLane: Map<string, Verdict>;
	popups: JudgmentPopup[];
	onPopupDone: (key: number) => void;
}) {
	return (
		<div class="absolute inset-0 pointer-events-none select-none">
			<For each={props.lanes}>
				{(lane) => {
					const isPressed = () => props.pressedLanes.has(lane.id);
					const glowVerdict = () => props.glowByLane.get(lane.id);

					return (
						<>
							<div
								class="absolute flex items-center justify-center rounded-full border-2 font-bold transition-all duration-75"
								style={{
									left: `${lane.x * props.width - 26}px`,
									top: `${props.hitLineY - 26}px`,
									width: '52px',
									height: '52px',
									'background-color': isPressed()
										? `${lane.color}8c`
										: 'rgba(0,0,0,0.6)',
									'border-color': lane.color,
									color: lane.color,
									transform: isPressed() ? 'scale(0.82)' : 'scale(1)',
									'box-shadow': glowVerdict()
										? `0 0 18px 6px ${verdictColor(glowVerdict()!)}, 0 0 4px 1px ${verdictColor(glowVerdict()!)}`
										: 'none',
									'font-size': lane.label.includes('Space') ? '11px' : '18px',
								}}
							>
								<LaneGlyph lane={lane} />
							</div>

							<Show when={props.glowByLane.get(lane.id)}>
								{(verdict) => (
									<div
										class="absolute rounded-full pointer-events-none"
										style={{
											left: `${lane.x * props.width - 26}px`,
											top: `${props.hitLineY - 26}px`,
											width: '52px',
											height: '52px',
											border: `2px solid ${verdictColor(verdict())}`,
											animation: 'lane-ripple 400ms ease-out forwards',
										}}
									/>
								)}
							</Show>
						</>
					);
				}}
			</For>

			<For each={props.popups}>
				{(popup) => {
					const lane = props.lanes.find((l) => l.id === popup.laneId);
					if (!lane) return null;

					return (
						<PopupText
							x={lane.x * props.width}
							y={props.hitLineY - 50}
							verdict={popup.verdict}
							onDone={() => props.onPopupDone(popup.key)}
						/>
					);
				}}
			</For>
		</div>
	);
}

function LaneGlyph(props: { lane: PositionedLane }) {
	switch (props.lane.id) {
		case 'burst':
			return <span>Q</span>;
		case 'skill':
			return <span>E</span>;
		case 'jump':
			return <span style={{ 'font-size': '11px' }}>Space</span>;
		case 'attack':
			return <MouseGlyph side="left" />;
		case 'evade':
			return <MouseGlyph side="right" />;
		default:
			return null;
	}
}

function MouseGlyph(props: { side: 'left' | 'right' }) {
	return (
		<div class="relative w-4 h-6 rounded-full border-2 border-current">
			<div
				class="absolute w-1.5 h-2 rounded-full bg-current"
				style={{
					top: '3px',
					left: props.side === 'left' ? '2px' : undefined,
					right: props.side === 'right' ? '2px' : undefined,
				}}
			/>
		</div>
	);
}

function PopupText(props: {
	x: number;
	y: number;
	verdict: Verdict;
	onDone: () => void;
}) {
	const [mounted, setMounted] = createSignal(false);

	requestAnimationFrame(() => setMounted(true));
	const timeout = setTimeout(props.onDone, 900);
	onCleanup(() => clearTimeout(timeout));

	return (
		<div
			class="absolute font-bold text-sm uppercase tracking-wide transition-all ease-out"
			style={{
				left: `${props.x}px`,
				top: `${props.y}px`,
				transform: `translate(-50%, ${mounted() ? '-32px' : '0px'})`,
				opacity: mounted() ? 0 : 1,
				color: verdictColor(props.verdict),
				'transition-duration': '850ms',
			}}
		>
			{verdictLabel(props.verdict)}
		</div>
	);
}
