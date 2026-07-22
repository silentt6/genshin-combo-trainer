import type { Combo } from '../engine/types';

export const BUILT_IN_COMBOS: Combo[] = [
	{
		id: 'how-to-mav-cd',
		name: 'How to Mav CD',
		scrollSpeed: 0.3,
		steps: [
			{
				id: 1,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 0,
				minHoldMs: 380,
			},
			{
				id: 2,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 550,
				minHoldMs: 1100,
			},
			{
				id: 3,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 660,
			},
		],
		loopIntervalMs: 1200,
	},
];
