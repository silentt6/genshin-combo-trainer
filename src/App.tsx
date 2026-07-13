import { Route } from '@solidjs/router';
import Lobby from './pages/Lobby';
import PlayScreen from './pages/PlayScreen';
import EditorScreen from './pages/EditorScreen';
import ManageScreen from './pages/ManageScreen';

export default function App() {
	return (
		<>
			<Route path="/" component={Lobby} />
			<Route path="/manage" component={ManageScreen} />
			<Route path="/play/:comboId" component={PlayScreen} />
			<Route path="/editor/:comboId" component={EditorScreen} />
		</>
	);
}
