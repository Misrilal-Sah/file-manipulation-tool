import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import HomePage from './pages/HomePage';
import PdfToolsPage from './pages/PdfToolsPage';
import WordToolsPage from './pages/WordToolsPage';
import ConvertPage from './pages/ConvertPage';
import ToastContainer from './components/common/ToastContainer';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true' || (!savedMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!darkMode).toString());
  };

  return (
    <Router>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300`}>
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
        
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <main className="flex-1 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-64px)]">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pdf" element={<PdfToolsPage />} />
              <Route path="/word" element={<WordToolsPage />} />
              <Route path="/convert" element={<ConvertPage />} />
            </Routes>
          </main>
        </div>
        
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;
