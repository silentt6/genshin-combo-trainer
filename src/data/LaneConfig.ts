export interface LaneConfig {
	id: 'attack' | 'evade';
	label: string;
	inputs: import('../engine/types').InputKind[];
	color: string;
	x: number;
}

export const LANES: LaneConfig[] = [
	{
		id: 'attack',
		label: 'Attack — Left Click',
		inputs: ['mouse-left'],
		color: '#38bdf8',
		x: 0.35,
	},
	{
		id: 'evade',
		label: 'Evade — Right Click / Shift',
		inputs: ['mouse-right', 'shift'],
		color: '#facc15',
		x: 0.65,
	},
];
