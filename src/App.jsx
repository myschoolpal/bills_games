import { useState } from 'react';
import './App.css';
import Game from './Game';
import CastleDefence from './CastleDefence.jsx';

function App() {
  const [page, setPage] = useState('home');

  if (page === 'home') {
    return (
      <div className="home">
        <h1>Bill's Games</h1>
        <ul>
          <li>
            <a
              href="#space-shooter"
              onClick={(e) => {
                e.preventDefault();
                setPage('space-shooter');
              }}
            >
              Space Shooter Game
            </a>
          </li>
          <li>
            <a
              href="#castle-defence"
              onClick={(e) => {
                e.preventDefault();
                setPage('castle-defence');
              }}
            >
              Castle Defence Game
            </a>
          </li>
        </ul>
      </div>
    );
  }
  if (page === 'space-shooter') {
    return (
      <div>
        <button onClick={() => setPage('home')}>Back to Home</button>
        <Game />
      </div>
    );
  }

  if (page === 'castle-defence') {
    return (
      <div>
        <button onClick={() => setPage('home')}>Back to Home</button>
        <CastleDefence />
      </div>
    );
  }

  return null;
}

export default App;
