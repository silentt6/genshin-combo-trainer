import { createEffect, createSignal } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { ComboEditor } from '../components/ComboEditor';
import { loadCombos, saveCombo } from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';
import type { Combo } from '../engine/types';
import { useShellConfig } from '../components/AppShell';

export default function EditorScreen() {
	const params = useParams();
	const navigate = useNavigate();
	const [combo, setCombo] = createSignal<Combo | null | undefined>(undefined);

	createEffect(() => {
		const id = params.comboId;
		const saved = loadCombos().find((c) => c.id === id);
		if (saved) {
			setCombo(saved);
			return;
		}
		const builtIn = BUILT_IN_COMBOS.find((c) => c.id === id);
		setCombo(builtIn ?? null);
	});

	const handleChange = (updated: Combo): void => {
		setCombo(updated);
		saveCombo(updated);
	};

	useShellConfig({
		title: 'Combo Editor',
		backTo: '/manage',
		backLabel: '← Back to Manage Combos',
	});

	return (
		<>
			{combo() === undefined && (
				<div class="flex items-center justify-center h-screen text-neutral-500">
					Loading...
				</div>
			)}

			{combo() === null && (
				<div class="flex flex-col items-center justify-center h-screen gap-4">
					<p class="text-neutral-400">Combo not found.</p>
					<button
						class="cursor-pointer bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-white transition-colors"
						onClick={() => navigate('/manage')}
					>
						Back to Manage
					</button>
				</div>
			)}

			{combo() && (
				<>
					<ComboEditor
						combo={combo() as Combo}
						onChange={handleChange}
						onTest={() => navigate(`/play/${(combo() as Combo).id}`)}
					/>
				</>
			)}
		</>
	);
}
