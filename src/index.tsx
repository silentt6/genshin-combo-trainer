/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import App from './App.tsx';
import { Router } from '@solidjs/router';

const root = document.getElementById('root');

if (!root) {
	throw new Error(
		'Root element not found. Check index.html for a div with id="root".',
	);
}

render(
	() => (
		<Router>
			<App />
		</Router>
	),
	root!,
);
