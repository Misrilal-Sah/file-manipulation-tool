import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileText, FileType, Image as ImageIcon } from 'lucide-react';
import { uploadFile, uploadMultipleFiles, formatFileSize } from '../../services/api';
import { useDocumentStore } from '../../store/documentStore';
import type { FileInfo } from '../../types';

interface FileUploaderProps {
  acceptedTypes?: string[];
  multiple?: boolean;
  onUploadComplete?: (files: FileInfo[]) => void;
}

export default function FileUploader({ 
  acceptedTypes = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
  multiple = true,
  onUploadComplete 
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { addFile, addFiles, addToast } = useDocumentStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: FileInfo[] = [];
      
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const response = await uploadFile(file);
        
        const fileInfo: FileInfo = {
          file_id: response.file_id,
          filename: response.filename,
          file_type: response.file_type as FileInfo['file_type'],
          file_size: response.file_size,
          page_count: response.page_count,
        };
        
        uploadedFiles.push(fileInfo);
        addFile(fileInfo);
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
      }

      addToast({
        type: 'success',
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
      });

      onUploadComplete?.(uploadedFiles);
    } catch (error) {
      console.error('Upload error:', error);
      addToast({
        type: 'error',
        message: 'Failed to upload file(s). Please try again.',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [addFile, addToast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple,
    disabled: uploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          dropzone relative
          ${isDragActive ? 'active' : ''}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center py-8">
          <div className={`
            w-16 h-16 rounded-full mb-4 flex items-center justify-center
            transition-all duration-300
            ${isDragActive 
              ? 'bg-primary-100 dark:bg-primary-900/50 scale-110' 
              : 'bg-gray-100 dark:bg-gray-800'
            }
          `}>
            <Upload className={`
              w-8 h-8 transition-colors
              ${isDragActive 
                ? 'text-primary-500' 
                : 'text-gray-400 dark:text-gray-500'
              }
            `} />
          </div>
          
          {uploading ? (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                Uploading...
              </p>
              <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                or click to browse
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="file-badge file-badge-pdf">PDF</span>
                <span className="file-badge file-badge-word">DOCX</span>
                <span className="file-badge file-badge-image">Images</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// File List Component
interface FileListProps {
  onRemove?: (fileId: string) => void;
}

export function FileList({ onRemove }: FileListProps) {
  const { files, selectedFileIds, toggleFileSelection, removeFile } = useDocumentStore();

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'word':
        return <FileType className="w-5 h-5 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleRemove = (fileId: string) => {
    removeFile(fileId);
    onRemove?.(fileId);
  };

  if (files.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Uploaded Files ({files.length})
      </p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.file_id}
            className={`
              flex items-center gap-3 p-3 rounded-lg border
              cursor-pointer transition-all duration-200
              ${selectedFileIds.includes(file.file_id)
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            onClick={() => toggleFileSelection(file.file_id)}
          >
            <div className="flex-shrink-0">
              {getFileIcon(file.file_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {file.filename}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.file_size)}
                {file.page_count && ` • ${file.page_count} pages`}
              </p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(file.file_id);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
