import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  ArrowLeftRight, FileText, FileType, Image, Scan, Download, RefreshCw
} from 'lucide-react';
import FileUploader, { FileList } from '../components/upload/FileUploader';
import { useDocumentStore } from '../store/documentStore';
import * as api from '../services/api';

const conversions = [
  { id: 'word-to-pdf', name: 'Word to PDF', icon: FileText, from: 'DOCX', to: 'PDF', color: 'from-red-500 to-pink-500' },
  { id: 'pdf-to-word', name: 'PDF to Word', icon: FileType, from: 'PDF', to: 'DOCX', color: 'from-blue-500 to-cyan-500' },
  { id: 'pdf-to-images', name: 'PDF to Images', icon: Image, from: 'PDF', to: 'PNG', color: 'from-green-500 to-emerald-500' },
  { id: 'images-to-pdf', name: 'Images to PDF', icon: FileText, from: 'Images', to: 'PDF', color: 'from-purple-500 to-violet-500' },
  { id: 'ocr', name: 'OCR Extract', icon: Scan, from: 'Scanned PDF', to: 'Text', color: 'from-amber-500 to-orange-500' },
];

export default function ConvertPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeConversion, setActiveConversion] = useState(searchParams.get('type') || 'word-to-pdf');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  
  // OCR options
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [imageFormat, setImageFormat] = useState('png');
  const [imageDpi, setImageDpi] = useState(200);
  
  const { files, selectedFileIds, addToast, clearFiles } = useDocumentStore();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type) setActiveConversion(type);
  }, [searchParams]);

  const handleConversionChange = (conversionId: string) => {
    setActiveConversion(conversionId);
    setSearchParams({ type: conversionId });
    setResult(null);
    setExtractedText(null);
    clearFiles();
  };

  const getAcceptedTypes = () => {
    switch (activeConversion) {
      case 'word-to-pdf':
        return ['.doc', '.docx'];
      case 'pdf-to-word':
      case 'pdf-to-images':
      case 'ocr':
        return ['.pdf'];
      case 'images-to-pdf':
        return ['.png', '.jpg', '.jpeg'];
      default:
        return ['.pdf', '.doc', '.docx'];
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      addToast({ type: 'warning', message: 'Please upload a file first' });
      return;
    }

    setProcessing(true);
    setResult(null);
    setExtractedText(null);

    try {
      const fileIds = selectedFileIds.length > 0 ? selectedFileIds : files.map(f => f.file_id);

      switch (activeConversion) {
        case 'word-to-pdf': {
          const response = await api.convertWordToPdf(fileIds[0]);
          if (response.download_url) {
            setResult({ url: response.download_url, filename: response.output_filename || 'converted.pdf' });
          }
          addToast({ type: 'success', message: response.message });
          break;
        }

        case 'pdf-to-word': {
          const response = await api.convertPdfToWord(fileIds[0]);
          if (response.download_url) {
            setResult({ url: response.download_url, filename: response.output_filename || 'converted.docx' });
          }
          addToast({ type: 'success', message: response.message });
          break;
        }

        case 'pdf-to-images': {
          const response = await api.convertPdfToImages(fileIds[0], imageDpi, imageFormat);
          addToast({ type: 'success', message: response.message });
          // Multiple outputs - show first one
          if (response.outputs.length > 0 && response.outputs[0].download_url) {
            setResult({ 
              url: response.outputs[0].download_url, 
              filename: response.outputs[0].output_filename || 'page.png' 
            });
          }
          break;
        }

        case 'images-to-pdf': {
          const response = await api.convertImagesToPdf(fileIds);
          if (response.download_url) {
            setResult({ url: response.download_url, filename: response.output_filename || 'combined.pdf' });
          }
          addToast({ type: 'success', message: response.message });
          break;
        }

        case 'ocr': {
          const response = await api.extractTextWithOcr(fileIds[0], ocrLanguage);
          setExtractedText(response.text);
          addToast({ type: 'success', message: `Extracted ${response.length} characters` });
          break;
        }
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      addToast({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Conversion failed. Please try again.' 
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

  const handleCopyText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      addToast({ type: 'success', message: 'Text copied to clipboard' });
    }
  };

  const currentConversion = conversions.find(c => c.id === activeConversion);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ArrowLeftRight className="w-8 h-8 text-green-500" />
          Convert Files
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Convert between PDF, Word, and image formats
        </p>
      </div>

      {/* Conversion Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {conversions.map((conv) => (
          <button
            key={conv.id}
            onClick={() => handleConversionChange(conv.id)}
            className={`
              p-4 rounded-xl transition-all duration-200
              ${activeConversion === conv.id
                ? 'ring-2 ring-primary-500 scale-105'
                : ''
              }
            `}
          >
            <div className={`
              w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3
              bg-gradient-to-br ${conv.color}
            `}>
              <conv.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-white text-center">
              {conv.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              {conv.from} → {conv.to}
            </p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Upload & Options */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              {currentConversion?.name}
            </h2>
            
            <FileUploader 
              acceptedTypes={getAcceptedTypes()}
              multiple={activeConversion === 'images-to-pdf'}
            />
            <FileList />
          </div>

          {/* Options */}
          {activeConversion === 'pdf-to-images' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image Format
                  </label>
                  <div className="flex gap-2">
                    {['png', 'jpg'].map((format) => (
                      <button
                        key={format}
                        onClick={() => setImageFormat(format)}
                        className={`px-4 py-2 rounded-lg font-medium uppercase ${
                          imageFormat === format
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    DPI: {imageDpi}
                  </label>
                  <input
                    type="range"
                    min="72"
                    max="300"
                    step="50"
                    value={imageDpi}
                    onChange={(e) => setImageDpi(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {activeConversion === 'ocr' && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">OCR Options</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={ocrLanguage}
                  onChange={(e) => setOcrLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="eng">English</option>
                  <option value="deu">German</option>
                  <option value="fra">French</option>
                  <option value="spa">Spanish</option>
                  <option value="hin">Hindi</option>
                </select>
              </div>
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={processing || files.length === 0}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-5 h-5" />
                Convert
              </>
            )}
          </button>
        </div>

        {/* Right: Result */}
        <div className="card p-6 min-h-[400px]">
          {extractedText ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Extracted Text
                </h3>
                <button
                  onClick={handleCopyText}
                  className="btn btn-secondary text-sm"
                >
                  Copy Text
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 rounded-lg bg-gray-50 dark:bg-gray-900 
                            border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {extractedText}
                </pre>
              </div>
            </div>
          ) : result ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 
                              flex items-center justify-center">
                  <currentConversion.icon className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Conversion Complete
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {result.filename}
                </p>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary flex items-center gap-2 mx-auto"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-500">
                <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Upload a file and convert to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
