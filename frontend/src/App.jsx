import { Routes, Route } from 'react-router-dom';

import { ChakraProvider, createLocalStorageManager } from '@chakra-ui/react';

import theme from './theme';

import DevBar from './components/DevBar';

import CreateLobby from './routes/Home';
import Lobby from './routes/Lobby';
import Game from './routes/Game';

const manager = createLocalStorageManager('color-mode');

function App() {
  return (
    <ChakraProvider colorModeManager={manager} theme={theme}>
      {process.env.NODE_ENV === 'development' &&
        <DevBar />
      }
      <Routes>
        <Route exact path='/' element={<CreateLobby />} />
        <Route exact path='/lobby' element={<Lobby />} />
        <Route exact path='/play' element={<Game />} />
      </Routes>
    </ChakraProvider>
  );
}

export default App;
