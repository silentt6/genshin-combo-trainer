import { Route } from '@solidjs/router';
import Lobby from './pages/Lobby';
import PlayScreen from './pages/PlayScreen';
import EditorScreen from './pages/EditorScreen';

export default function App() {
	return (
		<>
			<Route path="/" component={Lobby} />
			<Route path="/play/:comboId" component={PlayScreen} />
			<Route path="/editor/:comboId" component={EditorScreen} />
		</>
	);
}
