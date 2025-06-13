import { useState } from 'react';
import './App.css';
import Game from './Game';

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
        </ul>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setPage('home')}>Back to Home</button>
      <Game />
    </div>
  );
}

export default App;
