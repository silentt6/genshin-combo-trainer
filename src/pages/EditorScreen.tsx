import { createSignal, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { ComboEditor } from '../ComboEditor';
import { loadCombos, saveCombo } from '../data/storage';
import type { Combo } from '../engine/types';

export default function EditorScreen() {
	const params = useParams();
	const navigate = useNavigate();
	const [combo, setCombo] = createSignal<Combo | null>(null);

	onMount(() => {
		const found = loadCombos().find((c) => c.id === params.comboId);
		setCombo(found ?? null);
	});

	const handleChange = (updated: Combo): void => {
		setCombo(updated);
		saveCombo(updated);
	};

	const current = combo();
	if (!current) {
		return (
			<div class="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4">
				<p>Combo not found.</p>
				<button
					class="bg-cyan-600 px-4 py-2 rounded"
					onClick={() => navigate('/')}
				>
					Back to Lobby
				</button>
			</div>
		);
	}

	return (
		<div class="min-h-screen bg-neutral-900">
			<button
				class="m-4 bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded text-white"
				onClick={() => navigate('/')}
			>
				← Back
			</button>
			<ComboEditor
				combo={current}
				onChange={handleChange}
				onTest={() => navigate(`/play/${current.id}`)}
			/>
		</div>
	);
}
