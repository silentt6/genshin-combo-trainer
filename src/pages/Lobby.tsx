import { createSignal, For, Show, createMemo, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { loadCombos } from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';
import { ImportComboModal } from '../components/ImportComboModal';
import type { Combo } from '../engine/types';

export default function Lobby() {
	const navigate = useNavigate();
	const [savedCombos, setSavedCombos] = createSignal<Combo[]>([]);
	const [selectedId, setSelectedId] = createSignal<string | null>(null);
	const [filter, setFilter] = createSignal('');
	const [importOpen, setImportOpen] = createSignal(false);

	const refreshSaved = (): void => {
		setSavedCombos(loadCombos());
	};
	onMount(refreshSaved);

	const allCombos = createMemo(() => [
		...BUILT_IN_COMBOS.map((c) => ({ ...c, source: 'built-in' as const })),
		...savedCombos().map((c) => ({ ...c, source: 'saved' as const })),
	]);

	const filteredCombos = createMemo(() => {
		const query = filter().trim().toLowerCase();
		if (!query) return allCombos();
		return allCombos().filter((c) => c.name.toLowerCase().includes(query));
	});

	const selectedCombo = createMemo(() =>
		allCombos().find((c) => c.id === selectedId()),
	);

	const handleStart = (): void => {
		const id = selectedId();
		if (id) navigate(`/play/${id}`);
	};

	return (
		<div class="min-h-screen bg-neutral-950 text-neutral-100">
			<header class="border-b border-neutral-900 px-8 py-5 flex items-center justify-between">
				<h1 class="text-xl font-semibold tracking-tight">Combo Trainer</h1>
				<button
					class="cursor-pointer text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-colors"
					onClick={() => navigate('/manage')}
				>
					Manage Combos
				</button>
			</header>

			<div class="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-8">
				<div class="flex flex-col min-h-0">
					<input
						type="text"
						placeholder="Filter by name..."
						class="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 mb-3 text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
						value={filter()}
						onInput={(e) => setFilter(e.currentTarget.value)}
					/>

					<div class="flex flex-col gap-1 max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-900">
						<For each={filteredCombos()}>
							{(combo) => (
								<button
									class={`cursor-pointer text-left px-4 py-3 border-b border-neutral-900 last:border-b-0 transition-colors ${
										selectedId() === combo.id
											? 'bg-neutral-900'
											: 'hover:bg-neutral-900/50'
									}`}
									onClick={() => setSelectedId(combo.id)}
								>
									<div class="flex items-center justify-between">
										<span class="font-medium">{combo.name}</span>
										<span
											class={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
												combo.source === 'built-in'
													? 'text-neutral-500 bg-neutral-800'
													: 'text-cyan-400 bg-cyan-950'
											}`}
										>
											{combo.source === 'built-in' ? 'Built-in' : 'Saved'}
										</span>
									</div>
									<span class="text-xs text-neutral-500">
										{combo.steps.length} steps
									</span>
								</button>
							)}
						</For>

						<Show when={filteredCombos().length === 0}>
							<p class="text-sm text-neutral-600 text-center py-8">
								No combos match your search.
							</p>
						</Show>
					</div>
				</div>

				<div class="flex flex-col gap-3">
					<div class="border border-neutral-900 rounded-lg p-4 min-h-[100px]">
						<Show
							when={selectedCombo()}
							fallback={
								<p class="text-sm text-neutral-600">No combo selected.</p>
							}
						>
							<p class="text-xs text-neutral-500 uppercase tracking-wide mb-1">
								Selected
							</p>
							<p class="font-medium">{selectedCombo()?.name}</p>
							<p class="text-sm text-neutral-500">
								{selectedCombo()?.steps.length} steps
							</p>
						</Show>
					</div>

					<button
						class="cursor-pointer w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-500 text-white"
						disabled={!selectedCombo()}
						onClick={handleStart}
					>
						Start Training
					</button>

					<button
						class="cursor-pointer w-full py-3 rounded-lg font-medium border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors"
						onClick={() => setImportOpen(true)}
					>
						Import Combo
					</button>
				</div>
			</div>

			<ImportComboModal
				open={importOpen()}
				onClose={() => setImportOpen(false)}
				onImported={refreshSaved}
			/>
		</div>
	);
}
