// src/data/laneConfig.ts
import type { InputKind } from '../engine/types';

export type LaneId = 'burst' | 'skill' | 'jump' | 'attack' | 'evade';

export interface LaneConfig {
	id: LaneId;
	label: string;
	inputs: InputKind[];
	color: string;
}

export const LANES: LaneConfig[] = [
	{ id: 'burst', label: 'Burst — Q', inputs: ['q'], color: '#a78bfa' },
	{ id: 'skill', label: 'Skill — E', inputs: ['e'], color: '#34d399' },
	{ id: 'jump', label: 'Jump — Space', inputs: ['space'], color: '#f97316' },
	{
		id: 'attack',
		label: 'Attack — Left Click',
		inputs: ['mouse-left'],
		color: '#38bdf8',
	},
	{
		id: 'evade',
		label: 'Evade — Right Click / Shift',
		inputs: ['mouse-right', 'shift'],
		color: '#facc15',
	},
];

export function laneForInputs(inputs: InputKind[]): LaneConfig | undefined {
	return LANES.find((l) => l.inputs.some((i) => inputs.includes(i)));
}
