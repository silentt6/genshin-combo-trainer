export function MultiSelectBar(props: {
	count: number;
	onDeleteAll: () => void;
}) {
	return (
		<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
			<span class="text-sm text-neutral-400">
				{props.count} inputs selected
			</span>
			<button
				class="cursor-pointer text-sm text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900 rounded-lg px-3 py-1.5 transition-colors"
				onClick={props.onDeleteAll}
			>
				Delete Selected
			</button>
		</div>
	);
}
