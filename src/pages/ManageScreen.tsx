import { createSignal, For, onMount, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
	loadCombos,
	saveCombo,
	deleteCombo,
	exportCombosAsJson,
	exportComboAsJson,
} from '../data/storage';
import { BUILT_IN_COMBOS } from '../data/builtInCombos';
import { ImportComboModal } from '../components/ImportComboModal';
import type { Combo } from '../engine/types';
import { useShellConfig } from '../components/AppShell';
import { ComboRow } from '../components/ComboRow';

export default function ManageScreen() {
	const navigate = useNavigate();
	const [savedCombos, setSavedCombos] = createSignal<Combo[]>([]);
	const [importOpen, setImportOpen] = createSignal(false);
	const [copiedId, setCopiedId] = createSignal<string | null>(null);

	const refreshSaved = (): void => {
		setSavedCombos(loadCombos());
	};
	onMount(refreshSaved);

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

	const handleCopy = async (combo: Combo): Promise<void> => {
		const json = exportComboAsJson(combo);
		try {
			await navigator.clipboard.writeText(json);
			setCopiedId(combo.id);
			setTimeout(() => setCopiedId(null), 1500);
		} catch (err) {
			alert('Failed to copy to clipboard.');
		}
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

	useShellConfig({
		title: 'Manage Combos',
		backTo: '/',
		backLabel: '← Back to Homepage',
	});

	return (
		<>
			<div class="max-w-5xl mx-auto px-8 py-10">
				<section class="mb-10">
					<p
						class="text-xs text-neutral-500 uppercase tracking-wide mb-3"
						title="Combos that are built into the app and cannot be modified."
					>
						Built-in Combos
					</p>
					<div class="flex flex-col gap-1 rounded-lg border border-neutral-900">
						<For each={BUILT_IN_COMBOS}>
							{(combo) => (
								<ComboRow combo={combo}>
									<button
										class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
										onClick={() => navigate(`/editor/${combo.id}`)}
									>
										Duplicate (Edit)
									</button>
									<button
										class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
										onClick={() => handleCopy(combo)}
									>
										{copiedId() === combo.id ? 'Copied!' : 'Copy JSON'}
									</button>
								</ComboRow>
							)}
						</For>
					</div>
				</section>

				<section>
					<div class="flex items-center justify-between mb-3">
						<p
							class="text-xs text-neutral-500 uppercase tracking-wide"
							title="Combos you have saved in your browser's local storage."
						>
							Your Saved Combos
						</p>
						<div class="flex gap-2">
							<button
								class="cursor-pointer text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 py-1.5 transition-colors"
								onClick={handleCreateNew}
							>
								+ New
							</button>
							<button
								class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
								onClick={() => setImportOpen(true)}
							>
								Import
							</button>
							<button
								class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
								onClick={handleExport}
							>
								Export
							</button>
						</div>
					</div>

					<Show
						when={savedCombos().length > 0}
						fallback={
							<p class="text-sm text-neutral-600 py-8 text-center border border-neutral-900 rounded-lg">
								No saved combos yet.
							</p>
						}
					>
						<div class="flex flex-col gap-1 rounded-lg border border-neutral-900">
							<For each={savedCombos()}>
								{(combo) => (
									<div class="flex items-center justify-between px-4 py-3 border-b border-neutral-900 last:border-b-0">
										<div>
											<p class="font-medium">{combo.name}</p>
											<p class="text-xs text-neutral-500">
												{combo.steps.length} steps
											</p>
										</div>
										<div class="flex gap-2">
											<button
												class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
												onClick={() => handleCopy(combo)}
											>
												{copiedId() === combo.id ? 'Copied!' : 'Copy JSON'}
											</button>
											<button
												class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
												onClick={() => navigate(`/editor/${combo.id}`)}
											>
												Edit
											</button>
											<button
												class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors"
												onClick={() => {
													deleteCombo(combo.id);
													refreshSaved();
												}}
											>
												Delete
											</button>
										</div>
									</div>
								)}
							</For>
						</div>
					</Show>
				</section>
			</div>

			<ImportComboModal
				open={importOpen()}
				onClose={() => setImportOpen(false)}
				onImported={refreshSaved}
			/>
		</>
	);
}
