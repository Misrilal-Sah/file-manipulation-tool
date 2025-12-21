import { Link } from 'react-router-dom';
import { 
  FileText, FileType, ArrowLeftRight, Layers, Split, 
  RotateCw, Minimize2, Lock, Unlock, Type, Image, Scan,
  Sparkles, Zap, Shield, ArrowRight
} from 'lucide-react';

const pdfTools = [
  { id: 'merge', name: 'Merge PDFs', icon: Layers, color: 'from-blue-500 to-blue-600' },
  { id: 'split', name: 'Split PDF', icon: Split, color: 'from-purple-500 to-purple-600' },
  { id: 'rotate', name: 'Rotate Pages', icon: RotateCw, color: 'from-teal-500 to-teal-600' },
  { id: 'compress', name: 'Compress PDF', icon: Minimize2, color: 'from-green-500 to-green-600' },
  { id: 'protect', name: 'Protect PDF', icon: Lock, color: 'from-red-500 to-red-600' },
  { id: 'unlock', name: 'Unlock PDF', icon: Unlock, color: 'from-orange-500 to-orange-600' },
];

const wordTools = [
  { id: 'merge', name: 'Merge Documents', icon: Layers, color: 'from-blue-600 to-indigo-600' },
  { id: 'split', name: 'Split Document', icon: Split, color: 'from-indigo-500 to-purple-600' },
  { id: 'header', name: 'Add Header', icon: Type, color: 'from-cyan-500 to-blue-600' },
];

const convertTools = [
  { id: 'word-to-pdf', name: 'Word to PDF', icon: FileText, color: 'from-red-500 to-pink-500' },
  { id: 'pdf-to-word', name: 'PDF to Word', icon: FileType, color: 'from-blue-500 to-cyan-500' },
  { id: 'pdf-to-images', name: 'PDF to Images', icon: Image, color: 'from-green-500 to-emerald-500' },
  { id: 'ocr', name: 'OCR Extract', icon: Scan, color: 'from-amber-500 to-orange-500' },
];

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Process files in seconds' },
  { icon: Shield, title: 'Secure', desc: 'Files are processed locally' },
  { icon: Sparkles, title: 'High Quality', desc: 'Preserve document quality' },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                      bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400
                      text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          All-in-One Document Solution
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Document File 
          <span className="gradient-text"> Manipulation</span>
          <br />& Editing Tool
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Merge, split, edit, and convert PDF & Word files with ease. 
          Professional document management at your fingertips.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/pdf" className="btn btn-primary flex items-center gap-2 text-lg px-6 py-3">
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/convert" className="btn btn-secondary flex items-center gap-2 text-lg px-6 py-3">
            <ArrowLeftRight className="w-5 h-5" />
            Convert Files
          </Link>
        </div>
      </section>
      
      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 
                          flex items-center justify-center">
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
            </div>
          </div>
        ))}
      </section>
      
      {/* PDF Tools */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-red-500" />
              PDF Tools
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Powerful PDF manipulation tools</p>
          </div>
          <Link to="/pdf" className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {pdfTools.map((tool) => (
            <Link
              key={tool.id}
              to={`/pdf?tool=${tool.id}`}
              className="tool-card group"
            >
              <div className={`tool-card-icon bg-gradient-to-br ${tool.color}`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                {tool.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Word Tools */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileType className="w-7 h-7 text-blue-500" />
              Word Tools
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Edit and manage Word documents</p>
          </div>
          <Link to="/word" className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {wordTools.map((tool) => (
            <Link
              key={tool.id}
              to={`/word?tool=${tool.id}`}
              className="tool-card group"
            >
              <div className={`tool-card-icon bg-gradient-to-br ${tool.color}`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                {tool.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Convert Tools */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ArrowLeftRight className="w-7 h-7 text-green-500" />
              Convert & OCR
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Convert between formats</p>
          </div>
          <Link to="/convert" className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {convertTools.map((tool) => (
            <Link
              key={tool.id}
              to={`/convert?type=${tool.id}`}
              className="tool-card group"
            >
              <div className={`tool-card-icon bg-gradient-to-br ${tool.color}`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
                {tool.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Footer Info */}
      <section className="text-center py-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          🔒 Your files are processed securely and never stored on our servers.
        </p>
      </section>
    </div>
  );
}
