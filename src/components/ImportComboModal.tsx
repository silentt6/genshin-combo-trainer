import { createSignal } from 'solid-js';
import { Modal } from './Modal';
import { importCombosFromJson } from '../data/storage';

export function ImportComboModal(props: {
	open: boolean;
	onClose: () => void;
	onImported: () => void;
}) {
	const [text, setText] = createSignal('');
	const [error, setError] = createSignal<string | null>(null);

	const handleImport = (): void => {
		const result = importCombosFromJson(text());
		if (!result.ok) {
			setError(result.error ?? 'Invalid combo JSON.');
			return;
		}
		setError(null);
		setText('');
		props.onImported();
		props.onClose();
	};

	return (
		<Modal open={props.open} onClose={props.onClose} title="Import Combo">
			<p class="text-sm text-neutral-400 mb-3">Paste a combo JSON below.</p>
			<textarea
				class="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-sm text-neutral-200 focus:outline-none focus:border-cyan-500 resize-none"
				placeholder='{"version": 1, "combos": [...]}'
				value={text()}
				onInput={(e) => setText(e.currentTarget.value)}
			/>
			{error() && <p class="text-red-400 text-sm mt-2">{error()}</p>}
			<div class="flex gap-2 mt-4">
				<button
					class="cursor-pointer flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg transition-colors"
					onClick={handleImport}
				>
					Import
				</button>
				<button
					class="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
					onClick={props.onClose}
				>
					Cancel
				</button>
			</div>
		</Modal>
	);
}
