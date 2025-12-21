import { Menu, Sun, Moon, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({ onMenuClick, darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 
                          flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gradient-text">DocuMaster</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">File Manipulation Tool</p>
            </div>
          </Link>
        </div>
        
        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link 
            to="/pdf" 
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 
                     hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            PDF Tools
          </Link>
          <Link 
            to="/word" 
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 
                     hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Word Tools
          </Link>
          <Link 
            to="/convert" 
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 
                     hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Convert
          </Link>
        </nav>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
