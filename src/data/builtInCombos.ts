import type { Combo } from '../engine/types';

export const BUILT_IN_COMBOS: Combo[] = [
	{
		id: 'test-1',
		name: 'Test Combo',
		scrollSpeed: 0.3,
		steps: [
			{ id: 1, inputs: ['mouse-left'], actionKind: 'tap', targetMs: 1000 },
			{
				id: 2,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 2000,
				minHoldMs: 400,
			},
			{
				id: 3,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 3500,
			},
			{ id: 4, inputs: ['mouse-left'], actionKind: 'tap', targetMs: 4200 },
		],
	},
];
