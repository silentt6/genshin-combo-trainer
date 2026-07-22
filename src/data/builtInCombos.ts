import type { Combo } from '../engine/types';

export const BUILT_IN_COMBOS: Combo[] = [
	{
		id: 'mav-cdcdccf-2-dcdccf',
		name: 'Mav CDCDCCF 2(DCDCCF)',
		scrollSpeed: 0.5,
		steps: [
			{
				id: 1,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 0,
				minHoldMs: 310,
			},
			{
				id: 2,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 421,
				minHoldMs: 372,
			},
			{
				id: 4,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 557,
			},
			{
				id: 5,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 923,
				minHoldMs: 1585,
			},
			{
				id: 6,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 1080,
			},
			{
				id: 7,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 3565,
				minHoldMs: 378,
			},
			{
				id: 9,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 3734,
			},
			{
				id: 10,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 4067,
				minHoldMs: 1585,
			},
			{
				id: 11,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 4230,
			},
			{
				id: 12,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 6709,
				minHoldMs: 389,
			},
			{
				id: 14,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 6879,
			},
			{
				id: 15,
				inputs: ['mouse-left'],
				actionKind: 'hold',
				targetMs: 7212,
				minHoldMs: 1585,
			},
			{
				id: 16,
				inputs: ['mouse-right', 'shift'],
				actionKind: 'tap',
				targetMs: 7363,
			},
		],
		author: '@Speify<3',
		loopIntervalMs: 1500,
	},
];
