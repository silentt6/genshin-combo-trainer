import { createSignal, For, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
	loadCombos,
	saveCombo,
	deleteCombo,
	importCombosFromJson,
	exportCombosAsJson,
} from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';
import type { Combo } from '../engine/types';

export default function Lobby() {
	const navigate = useNavigate();
	const [savedCombos, setSavedCombos] = createSignal<Combo[]>([]);

	onMount(() => {
		setSavedCombos(loadCombos());
	});

	const handleImport = async (e: Event): Promise<void> => {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const text = await file.text();
		const success = importCombosFromJson(text);
		if (success) {
			setSavedCombos(loadCombos());
		} else {
			alert('Invalid combo file.');
		}
		input.value = '';
	};

	const handleExport = (): void => {
		const json = exportCombosAsJson();
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'combos.json';
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleCreateNew = (): void => {
		const newCombo: Combo = {
			id: crypto.randomUUID(),
			name: 'New Combo',
			scrollSpeed: 0.3,
			steps: [],
		};
		saveCombo(newCombo);
		navigate(`/editor/${newCombo.id}`);
	};

	return (
		<div class="min-h-screen bg-neutral-900 text-white p-8 flex flex-col gap-8">
			<h1 class="text-4xl font-bold">Combo Trainer</h1>

			<section>
				<h2 class="text-2xl mb-3">Built-in Combos</h2>
				<div class="flex flex-col gap-2">
					<For each={BUILT_IN_COMBOS}>
						{(combo) => (
							<div class="flex items-center justify-between bg-neutral-800 p-3 rounded">
								<span class="font-mono">{combo.name}</span>
								<div class="flex gap-2">
									<button
										class="bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded"
										onClick={() => navigate(`/play/${combo.id}`)}
									>
										Play
									</button>
								</div>
							</div>
						)}
					</For>
				</div>
			</section>

			<section>
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-2xl">Your Combos</h2>
					<div class="flex gap-2">
						<button
							class="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
							onClick={handleCreateNew}
						>
							+ New Combo
						</button>
						<label class="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded cursor-pointer">
							Import JSON
							<input
								type="file"
								accept="application/json"
								class="hidden"
								onChange={handleImport}
							/>
						</label>
						<button
							class="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
							onClick={handleExport}
						>
							Export All
						</button>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<For each={savedCombos()}>
						{(combo) => (
							<div class="flex items-center justify-between bg-neutral-800 p-3 rounded">
								<span class="font-mono">{combo.name}</span>
								<div class="flex gap-2">
									<button
										class="bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded"
										onClick={() => navigate(`/play/${combo.id}`)}
									>
										Play
									</button>
									<button
										class="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded"
										onClick={() => navigate(`/editor/${combo.id}`)}
									>
										Edit
									</button>
									<button
										class="bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
										onClick={() => {
											deleteCombo(combo.id);
											setSavedCombos(loadCombos());
										}}
									>
										Delete
									</button>
								</div>
							</div>
						)}
					</For>
				</div>
			</section>
		</div>
	);
}
