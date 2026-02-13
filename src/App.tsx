import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './style.css';
import HomePage from './pages/HomePage';
import PreviewPage from './pages/PreviewPage';
import IdentityPage from './pages/IdentityPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/identity" element={<IdentityPage />} />
        <Route path="/:id" element={<PreviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
