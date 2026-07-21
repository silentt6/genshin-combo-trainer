export function EditorToolbar(props: {
	tool: 'pencil' | 'select';
	onToolChange: (tool: 'pencil' | 'select') => void;
	isRecording: boolean;
	onRecord: () => void;
	onTest: () => void;
	onUndo: () => void;
	onRedo: () => void;
	canUndo: boolean;
	canRedo: boolean;
}) {
	return (
		<>
			<div class="flex items-center justify-end gap-2">
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30"
					onClick={props.onUndo}
					disabled={props.isRecording || !props.canUndo}
				>
					↶ Undo
				</button>
				<button
					class="cursor-pointer text-sm border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30"
					onClick={props.onRedo}
					disabled={props.isRecording || !props.canRedo}
				>
					↷ Redo
				</button>
				<button
					class={`cursor-pointer px-4 py-2 rounded-lg font-medium transition-colors ${
						props.isRecording
							? 'bg-red-600 text-white'
							: 'bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white'
					}`}
					onClick={props.onRecord}
					disabled={props.isRecording}
				>
					{props.isRecording ? '● Recording' : 'Record'}
				</button>
				<button
					class="cursor-pointer bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
					onClick={props.onTest}
					disabled={props.isRecording}
				>
					Test Combo
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button
					class={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition-colors ${
						props.tool === 'pencil'
							? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
							: 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
					}`}
					onClick={() => props.onToolChange('pencil')}
					disabled={props.isRecording}
				>
					✏️ Pencil
				</button>
				<button
					class={`cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition-colors ${
						props.tool === 'select'
							? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
							: 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
					}`}
					onClick={() => props.onToolChange('select')}
					disabled={props.isRecording}
				>
					⬚ Select
				</button>
				<span class="text-xs text-neutral-600 ml-2">
					{props.tool === 'pencil'
						? 'Left-click to add, right-click an action to delete.'
						: 'Click or drag a rectangle to select, Shift+click for multiple, drag to move, Delete to remove.'}
				</span>
			</div>
		</>
	);
}
