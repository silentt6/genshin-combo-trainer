import { Route } from '@solidjs/router';
import PlayScreen from './pages/PlayScreen';
import EditorScreen from './pages/EditorScreen';
import ManageScreen from './pages/ManageScreen';
import Home from './pages/Home';

export default function App() {
	return (
		<>
			<Route path="/" component={Home} />
			<Route path="/manage" component={ManageScreen} />
			<Route path="/play/:comboId" component={PlayScreen} />
			<Route path="/editor/:comboId" component={EditorScreen} />
		</>
	);
}
