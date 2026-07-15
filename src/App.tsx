import { Router, Route } from '@solidjs/router';
import { AppShell } from './components/AppShell';
import Home from './pages/Home';
import ManageScreen from './pages/ManageScreen';
import PlayScreen from './pages/PlayScreen';
import EditorScreen from './pages/EditorScreen';

export default function App() {
	return (
		<Router root={AppShell}>
			<Route path="/" component={Home} />
			<Route path="/manage" component={ManageScreen} />
			<Route path="/play/:comboId" component={PlayScreen} />
			<Route path="/editor/:comboId" component={EditorScreen} />
		</Router>
	);
}
