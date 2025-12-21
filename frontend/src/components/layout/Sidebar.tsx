import { Link, useLocation } from 'react-router-dom';
import { 
  Home, FileText, FileType, ArrowLeftRight, 
  Layers, Split, RotateCw, Trash2, Scissors, 
  FileOutput, Lock, Unlock, Type, Image,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: '/', label: 'Home', icon: Home },
  { 
    label: 'PDF Tools', 
    icon: FileText,
    children: [
      { path: '/pdf?tool=merge', label: 'Merge PDFs', icon: Layers },
      { path: '/pdf?tool=split', label: 'Split PDF', icon: Split },
      { path: '/pdf?tool=rotate', label: 'Rotate Pages', icon: RotateCw },
      { path: '/pdf?tool=delete', label: 'Delete Pages', icon: Trash2 },
      { path: '/pdf?tool=extract', label: 'Extract Pages', icon: Scissors },
      { path: '/pdf?tool=compress', label: 'Compress PDF', icon: FileOutput },
      { path: '/pdf?tool=protect', label: 'Protect PDF', icon: Lock },
      { path: '/pdf?tool=unlock', label: 'Unlock PDF', icon: Unlock },
      { path: '/pdf?tool=watermark', label: 'Add Watermark', icon: Type },
    ]
  },
  { 
    label: 'Word Tools', 
    icon: FileType,
    children: [
      { path: '/word?tool=merge', label: 'Merge Documents', icon: Layers },
      { path: '/word?tool=split', label: 'Split Document', icon: Split },
      { path: '/word?tool=header', label: 'Add Header', icon: Type },
      { path: '/word?tool=footer', label: 'Add Footer', icon: Type },
    ]
  },
  { 
    label: 'Convert', 
    icon: ArrowLeftRight,
    children: [
      { path: '/convert?type=word-to-pdf', label: 'Word to PDF', icon: FileText },
      { path: '/convert?type=pdf-to-word', label: 'PDF to Word', icon: FileType },
      { path: '/convert?type=pdf-to-images', label: 'PDF to Images', icon: Image },
      { path: '/convert?type=images-to-pdf', label: 'Images to PDF', icon: FileText },
    ]
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 md:top-16 left-0 z-50 md:z-30
        w-64 h-screen md:h-[calc(100vh-64px)]
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        overflow-y-auto
      `}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <span className="font-semibold text-gray-800 dark:text-white">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.path ? (
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium
                    transition-all duration-200
                    ${location.pathname === item.path
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ) : (
                <div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  <div className="ml-4 space-y-1 mt-1">
                    {item.children?.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        to={child.path}
                        onClick={onClose}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                          transition-all duration-200
                          ${location.pathname + location.search === child.path
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        <child.icon className="w-4 h-4" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
