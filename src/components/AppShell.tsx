import { createContext, useContext, createSignal, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';

interface ShellConfig {
	title: string;
	backTo?: string;
	backLabel?: string;
	action?: { label: string; onClick: () => void };
	fullscreen?: boolean;
}

const ShellContext = createContext<(config: ShellConfig) => void>();

export function useShellConfig(config: ShellConfig) {
	const setConfig = useContext(ShellContext);
	setConfig?.(config);
}

export function AppShell(props: { children: JSX.Element }) {
	const navigate = useNavigate();
	const [config, setConfig] = createSignal<ShellConfig>({
		title: 'Combo Trainer',
	});

	return (
		<ShellContext.Provider value={setConfig}>
			<div
				class={
					config().fullscreen
						? 'h-screen w-screen overflow-hidden'
						: 'min-h-screen bg-neutral-950 text-neutral-100'
				}
			>
				{!config().fullscreen && (
					<header class="border-b border-neutral-900 px-8 py-5 flex items-center justify-between">
						<h1 class="text-xl font-genshin font-bold tracking-tight">
							{config().title}
						</h1>
						<div class="flex items-center gap-2">
							{config().action && (
								<button
									class="text-sm text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-colors"
									onClick={config().action?.onClick}
								>
									{config().action?.label}
								</button>
							)}
							{config().backTo && (
								<button
									class="text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg px-3 py-1.5 transition-colors"
									onClick={() => navigate(config().backTo!)}
								>
									{config().backLabel ?? '← Back'}
								</button>
							)}
						</div>
					</header>
				)}
				{props.children}
			</div>
		</ShellContext.Provider>
	);
}
