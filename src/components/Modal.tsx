import { createEffect, onCleanup } from 'solid-js';
import type { JSX } from 'solid-js';

export function Modal(props: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: JSX.Element;
}) {
	let dialogRef: HTMLDialogElement | undefined;

	createEffect(() => {
		if (!dialogRef) return;
		if (props.open && !dialogRef.open) {
			dialogRef.showModal();
		} else if (!props.open && dialogRef.open) {
			dialogRef.close();
		}
	});

	const handleNativeClose = (): void => {
		if (props.open) props.onClose();
	};

	onCleanup(() => {
		dialogRef?.removeEventListener('close', handleNativeClose);
	});

	return (
		<dialog
			ref={(el) => {
				dialogRef = el;
				el.addEventListener('close', handleNativeClose);
			}}
			class="backdrop:bg-black/60 rounded-2xl border border-neutral-800 bg-neutral-900 text-white p-0 w-full max-w-lg m-auto"
			onClick={(e) => {
				if (e.target === dialogRef) props.onClose();
			}}
		>
			<div class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">{props.title}</h2>
					<button
						class="cursor-pointer text-neutral-500 hover:text-white transition-colors"
						onClick={props.onClose}
					>
						✕
					</button>
				</div>
				{props.children}
			</div>
		</dialog>
	);
}
