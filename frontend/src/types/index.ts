// File Types
export interface FileInfo {
  file_id: string;
  filename: string;
  file_type: 'pdf' | 'word' | 'image' | 'unknown';
  file_size: number;
  page_count?: number;
  download_url?: string;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count?: number;
  message: string;
}

export interface MultipleUploadResponse {
  files: UploadResponse[];
  total_count: number;
}

// PDF Types
export interface PdfInfo {
  file_id: string;
  filename: string;
  page_count: number;
  file_size: number;
  is_encrypted: boolean;
  has_form_fields: boolean;
  metadata?: Record<string, string>;
}

export interface PageRange {
  start: number;
  end: number;
}

export interface ThumbnailResponse {
  file_id: string;
  thumbnails: string[];
  page_count: number;
}

// Operation Types
export interface OperationResponse {
  success: boolean;
  message: string;
  output_file_id?: string;
  output_filename?: string;
  download_url?: string;
}

export interface MultipleOutputResponse {
  success: boolean;
  message: string;
  outputs: OperationResponse[];
}

export interface WarningResponse {
  requires_confirmation: boolean;
  warning_type: string;
  warning_message: string;
  proceed_url?: string;
}

// Form Field
export interface FormField {
  page: number;
  name: string;
  type: string;
  value: string;
  rect: number[];
}

// Tool Types
export type ToolType = 
  | 'merge' 
  | 'split' 
  | 'rotate' 
  | 'delete' 
  | 'reorder' 
  | 'compress'
  | 'extract'
  | 'watermark'
  | 'annotate'
  | 'fill-form'
  | 'protect'
  | 'unlock'
  | 'convert-to-pdf'
  | 'convert-to-word'
  | 'convert-to-images'
  | 'ocr';

export interface Tool {
  id: ToolType;
  name: string;
  description: string;
  icon: string;
  category: 'pdf' | 'word' | 'convert' | 'advanced';
  acceptedTypes: string[];
}

// State Types
export interface DocumentState {
  files: FileInfo[];
  selectedFiles: string[];
  currentFile: FileInfo | null;
  thumbnails: Record<string, string[]>;
  loading: boolean;
  error: string | null;
  processingProgress: number;
}

// Toast/Notification Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
