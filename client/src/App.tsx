import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateHiringDrive from './pages/CreateHiringDrive';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/create-hiring-drive" replace />} />
          <Route path="/create-hiring-drive" element={<CreateHiringDrive />} />
          <Route path="/:driveId" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
