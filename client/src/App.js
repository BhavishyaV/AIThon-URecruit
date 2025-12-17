import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetching the message from the backend
    axios.get('/api/test')
      .then(response => {
        setMessage(response.data.message);
      })
      .catch(error => {
        console.error("Error connecting to server", error);
      });
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Message from server: {message}
        </a>
      </header>
    </div>
  );
}

export default App;
