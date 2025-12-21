import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, Layers, Split, RotateCw, Trash2, Scissors, 
  Minimize2, Lock, Unlock, Type, Download, RefreshCw
} from 'lucide-react';
import FileUploader, { FileList } from '../components/upload/FileUploader';
import { useDocumentStore } from '../store/documentStore';
import * as api from '../services/api';

const tools = [
  { id: 'merge', name: 'Merge PDFs', icon: Layers, description: 'Combine multiple PDFs into one' },
  { id: 'split', name: 'Split PDF', icon: Split, description: 'Split PDF into multiple files' },
  { id: 'rotate', name: 'Rotate Pages', icon: RotateCw, description: 'Rotate pages 90°, 180°, or 270°' },
  { id: 'delete', name: 'Delete Pages', icon: Trash2, description: 'Remove pages from PDF' },
  { id: 'extract', name: 'Extract Pages', icon: Scissors, description: 'Extract specific pages' },
  { id: 'compress', name: 'Compress', icon: Minimize2, description: 'Reduce PDF file size' },
  { id: 'protect', name: 'Protect', icon: Lock, description: 'Add password protection' },
  { id: 'unlock', name: 'Unlock', icon: Unlock, description: 'Remove password protection' },
  { id: 'watermark', name: 'Watermark', icon: Type, description: 'Add text watermark' },
];

export default function PdfToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState(searchParams.get('tool') || 'merge');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  
  // Tool-specific state
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [selectedPages, setSelectedPages] = useState<string>('');
  const [splitRanges, setSplitRanges] = useState<string>('1-3, 4-6');
  const [compressionQuality, setCompressionQuality] = useState(80);
  const [password, setPassword] = useState('');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  
  const { files, selectedFileIds, addToast, clearFiles } = useDocumentStore();

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
      addToast({ type: 'warning', message: 'Please upload at least one PDF file' });
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
            addToast({ type: 'warning', message: 'Select at least 2 PDFs to merge' });
            setProcessing(false);
            return;
          }
          response = await api.mergePdfs(fileIds);
          break;

        case 'split':
          const ranges = splitRanges.split(',').map(r => {
            const [start, end] = r.trim().split('-').map(Number);
            return { start, end: end || start };
          });
          response = await api.splitPdf(fileIds[0], ranges);
          break;

        case 'rotate':
          const pagesToRotate = selectedPages 
            ? selectedPages.split(',').map(p => parseInt(p.trim()))
            : [1]; // Default to first page
          response = await api.rotatePdfPages(fileIds[0], pagesToRotate, rotateAngle);
          break;

        case 'delete':
          const pagesToDelete = selectedPages.split(',').map(p => parseInt(p.trim()));
          response = await api.deletePdfPages(fileIds[0], pagesToDelete);
          break;

        case 'extract':
          const pagesToExtract = selectedPages.split(',').map(p => parseInt(p.trim()));
          response = await api.extractPdfPages(fileIds[0], pagesToExtract);
          break;

        case 'compress':
          response = await api.compressPdf(fileIds[0], compressionQuality);
          break;

        case 'protect':
          if (!password) {
            addToast({ type: 'warning', message: 'Please enter a password' });
            setProcessing(false);
            return;
          }
          response = await api.protectPdf(fileIds[0], password);
          break;

        case 'unlock':
          if (!password) {
            addToast({ type: 'warning', message: 'Please enter the PDF password' });
            setProcessing(false);
            return;
          }
          response = await api.unlockPdf(fileIds[0], password);
          break;

        case 'watermark':
          response = await api.addWatermark(fileIds[0], watermarkText);
          break;

        default:
          throw new Error('Unknown tool');
      }

      if ('download_url' in response && response.download_url) {
        setResult({
          url: response.download_url,
          filename: response.output_filename || 'output.pdf'
        });
        addToast({ type: 'success', message: response.message });
      } else if ('outputs' in response) {
        // Multiple outputs
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
      case 'rotate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rotation Angle
              </label>
              <div className="flex gap-2">
                {[90, 180, 270].map((angle) => (
                  <button
                    key={angle}
                    onClick={() => setRotateAngle(angle as 90 | 180 | 270)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      rotateAngle === angle
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {angle}°
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pages to Rotate (e.g., 1, 3, 5)
              </label>
              <input
                type="text"
                value={selectedPages}
                onChange={(e) => setSelectedPages(e.target.value)}
                placeholder="Leave empty for all pages"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        );

      case 'split':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page Ranges (e.g., 1-3, 4-6, 7-10)
            </label>
            <input
              type="text"
              value={splitRanges}
              onChange={(e) => setSplitRanges(e.target.value)}
              placeholder="1-3, 4-6"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        );

      case 'delete':
      case 'extract':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pages (e.g., 1, 3, 5-7)
            </label>
            <input
              type="text"
              value={selectedPages}
              onChange={(e) => setSelectedPages(e.target.value)}
              placeholder="1, 2, 5"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        );

      case 'compress':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Compression Quality: {compressionQuality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={compressionQuality}
              onChange={(e) => setCompressionQuality(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Smaller file</span>
              <span>Better quality</span>
            </div>
          </div>
        );

      case 'protect':
      case 'unlock':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={activeTool === 'protect' ? 'Enter new password' : 'Enter PDF password'}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        );

      case 'watermark':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Watermark Text
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="CONFIDENTIAL"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
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
          <FileText className="w-8 h-8 text-red-500" />
          PDF Tools
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          All the tools you need to work with PDF files
        </p>
      </div>

      {/* Tool Selection */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 mb-8">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolChange(tool.id)}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200
              ${activeTool === tool.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center">{tool.name}</span>
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
              acceptedTypes={['.pdf']}
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

        {/* Right: Preview/Result */}
        <div className="card p-6 min-h-[400px] flex items-center justify-center">
          {result ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 
                            flex items-center justify-center">
                <FileText className="w-8 h-8 text-green-500" />
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
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Upload files and process to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
