import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileType, Layers, Split, Type, Download, RefreshCw
} from 'lucide-react';
import FileUploader, { FileList } from '../components/upload/FileUploader';
import { useDocumentStore } from '../store/documentStore';
import * as api from '../services/api';

const tools = [
  { id: 'merge', name: 'Merge Documents', icon: Layers, description: 'Combine multiple Word documents into one' },
  { id: 'split', name: 'Split Document', icon: Split, description: 'Split Word document by sections' },
  { id: 'header', name: 'Add Header', icon: Type, description: 'Add header text to all pages' },
  { id: 'footer', name: 'Add Footer', icon: Type, description: 'Add footer text to all pages' },
  { id: 'replace', name: 'Find & Replace', icon: Type, description: 'Find and replace text in document' },
];

export default function WordToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState(searchParams.get('tool') || 'merge');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  
  // Tool-specific state
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [textAlign, setTextAlign] = useState('center');
  
  const { files, selectedFileIds, addToast } = useDocumentStore();

  useEffect(() => {
    const tool = searchParams.get('tool');
    if (tool) setActiveTool(tool);
  }, [searchParams]);

  const handleToolChange = (toolId: string) => {
    setActiveTool(toolId);
    setSearchParams({ tool: toolId });
    setResult(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      addToast({ type: 'warning', message: 'Please upload at least one Word document' });
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      let response: api.OperationResponse | api.MultipleOutputResponse;
      const fileIds = selectedFileIds.length > 0 ? selectedFileIds : files.map(f => f.file_id);

      switch (activeTool) {
        case 'merge':
          if (fileIds.length < 2) {
            addToast({ type: 'warning', message: 'Select at least 2 documents to merge' });
            setProcessing(false);
            return;
          }
          response = await api.mergeWordDocuments(fileIds);
          break;

        case 'split':
          response = await api.splitWordDocument(fileIds[0]);
          break;

        case 'header':
          if (!headerText) {
            addToast({ type: 'warning', message: 'Please enter header text' });
            setProcessing(false);
            return;
          }
          response = await api.addWordHeader(fileIds[0], headerText, textAlign);
          break;

        case 'footer':
          if (!footerText) {
            addToast({ type: 'warning', message: 'Please enter footer text' });
            setProcessing(false);
            return;
          }
          response = await api.addWordFooter(fileIds[0], footerText);
          break;

        case 'replace':
          if (!findText) {
            addToast({ type: 'warning', message: 'Please enter text to find' });
            setProcessing(false);
            return;
          }
          response = await api.replaceWordText(fileIds[0], findText, replaceText);
          break;

        default:
          throw new Error('Unknown tool');
      }

      if ('download_url' in response && response.download_url) {
        setResult({
          url: response.download_url,
          filename: response.output_filename || 'output.docx'
        });
        addToast({ type: 'success', message: response.message });
      } else if ('outputs' in response) {
        addToast({ type: 'success', message: response.message });
      }
    } catch (error: any) {
      console.error('Processing error:', error);
      addToast({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Processing failed. Please try again.' 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      api.downloadFile(result.url, result.filename);
    }
  };

  const renderToolOptions = () => {
    switch (activeTool) {
      case 'header':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Header Text
              </label>
              <input
                type="text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Enter header text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alignment
              </label>
              <div className="flex gap-2">
                {['left', 'center', 'right'].map((align) => (
                  <button
                    key={align}
                    onClick={() => setTextAlign(align)}
                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                      textAlign === align
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'footer':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Footer Text
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Enter footer text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        );

      case 'replace':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Find Text
              </label>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Text to find"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Replace With
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replacement text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentTool = tools.find(t => t.id === activeTool);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileType className="w-8 h-8 text-blue-500" />
          Word Tools
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Edit and manage Word documents
        </p>
      </div>

      {/* Tool Selection */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolChange(tool.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200
              ${activeTool === tool.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            <tool.icon className="w-5 h-5" />
            <span className="font-medium">{tool.name}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Upload & Options */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {currentTool?.name}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {currentTool?.description}
            </p>
            
            <FileUploader 
              acceptedTypes={['.doc', '.docx']}
              multiple={activeTool === 'merge'}
            />
            <FileList />
          </div>

          {/* Tool Options */}
          {renderToolOptions() && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Options
              </h3>
              {renderToolOptions()}
            </div>
          )}

          {/* Process Button */}
          <div className="flex gap-4">
            <button
              onClick={handleProcess}
              disabled={processing || files.length === 0}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {currentTool && <currentTool.icon className="w-5 h-5" />}
                  {currentTool?.name}
                </>
              )}
            </button>
            
            {result && (
              <button
                onClick={handleDownload}
                className="btn btn-success flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
          </div>
        </div>

        {/* Right: Result */}
        <div className="card p-6 min-h-[400px] flex items-center justify-center">
          {result ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 
                            flex items-center justify-center">
                <FileType className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Ready to Download
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {result.filename}
              </p>
              <button
                onClick={handleDownload}
                className="btn btn-primary flex items-center gap-2 mx-auto"
              >
                <Download className="w-5 h-5" />
                Download File
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">
              <FileType className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Upload files and process to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
