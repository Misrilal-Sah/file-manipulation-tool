import axios from 'axios';
import type { 
  UploadResponse, 
  MultipleUploadResponse, 
  PdfInfo, 
  ThumbnailResponse,
  OperationResponse,
  MultipleOutputResponse,
  WarningResponse,
  FormField
} from '../types';

// Re-export types so they can be used as api.OperationResponse etc.
export type { OperationResponse, MultipleOutputResponse, WarningResponse };

const API_BASE = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for large file operations
});

// ============ Upload API ============

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<UploadResponse>('/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadMultipleFiles = async (files: File[]): Promise<MultipleUploadResponse> => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  const response = await api.post<MultipleUploadResponse>('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getFileInfo = async (fileId: string): Promise<UploadResponse> => {
  const response = await api.get<UploadResponse>(`/upload/info/${fileId}`);
  return response.data;
};

export const deleteFile = async (fileId: string): Promise<void> => {
  await api.delete(`/upload/${fileId}`);
};

// ============ PDF API ============

export const getPdfInfo = async (fileId: string): Promise<PdfInfo> => {
  const response = await api.get<PdfInfo>(`/pdf/info/${fileId}`);
  return response.data;
};

export const getPdfThumbnails = async (fileId: string): Promise<ThumbnailResponse> => {
  const response = await api.get<ThumbnailResponse>(`/pdf/thumbnails/${fileId}`);
  return response.data;
};

export const getPagePreview = async (fileId: string, page: number): Promise<string> => {
  const response = await api.get<{ page: number; preview: string }>(`/pdf/preview/${fileId}/${page}`);
  return response.data.preview;
};

export const mergePdfs = async (fileIds: string[], outputFilename?: string): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/merge', {
    file_ids: fileIds,
    output_filename: outputFilename || 'merged.pdf',
  });
  return response.data;
};

export const splitPdf = async (
  fileId: string, 
  ranges: { start: number; end: number }[],
  outputPrefix?: string
): Promise<MultipleOutputResponse> => {
  const response = await api.post<MultipleOutputResponse>('/pdf/split', {
    file_id: fileId,
    ranges,
    output_prefix: outputPrefix || 'split',
  });
  return response.data;
};

export const rotatePdfPages = async (
  fileId: string, 
  pages: number[], 
  angle: 90 | 180 | 270
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/rotate', {
    file_id: fileId,
    pages,
    angle,
  });
  return response.data;
};

export const deletePdfPages = async (fileId: string, pages: number[]): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/delete', {
    file_id: fileId,
    pages,
  });
  return response.data;
};

export const reorderPdfPages = async (fileId: string, newOrder: number[]): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/reorder', {
    file_id: fileId,
    new_order: newOrder,
  });
  return response.data;
};

export const compressPdf = async (fileId: string, quality?: number): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/compress', {
    file_id: fileId,
    quality: quality || 80,
  });
  return response.data;
};

export const extractPdfPages = async (fileId: string, pages: number[]): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/extract', {
    file_id: fileId,
    pages,
  });
  return response.data;
};

export const addWatermark = async (
  fileId: string, 
  text: string,
  opacity?: number,
  position?: 'center' | 'top' | 'bottom'
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/watermark', {
    file_id: fileId,
    text,
    opacity: opacity || 0.3,
    position: position || 'center',
  });
  return response.data;
};

export const removeWatermark = async (
  fileId: string, 
  confirm: boolean = false
): Promise<OperationResponse | WarningResponse> => {
  const response = await api.post('/pdf/remove-watermark', {
    file_id: fileId,
    confirm,
  });
  return response.data;
};

export const getFormFields = async (fileId: string): Promise<{ fields: FormField[]; count: number }> => {
  const response = await api.get(`/pdf/form-fields/${fileId}`);
  return response.data;
};

export const fillFormFields = async (
  fileId: string, 
  fields: Record<string, string>
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/fill-form', {
    file_id: fileId,
    fields,
  });
  return response.data;
};

export const unlockPdf = async (fileId: string, password: string): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/unlock', {
    file_id: fileId,
    password,
  });
  return response.data;
};

export const protectPdf = async (fileId: string, password: string): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/pdf/protect', {
    file_id: fileId,
    password,
  });
  return response.data;
};

// ============ Word API ============

export const getWordInfo = async (fileId: string): Promise<any> => {
  const response = await api.get(`/word/info/${fileId}`);
  return response.data;
};

export const mergeWordDocuments = async (
  fileIds: string[], 
  outputFilename?: string
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/word/merge', {
    file_ids: fileIds,
    output_filename: outputFilename || 'merged.docx',
  });
  return response.data;
};

export const splitWordDocument = async (
  fileId: string, 
  splitBy?: string
): Promise<MultipleOutputResponse> => {
  const response = await api.post<MultipleOutputResponse>('/word/split', {
    file_id: fileId,
    split_by: splitBy || 'sections',
  });
  return response.data;
};

export const extractWordText = async (fileId: string): Promise<{ text: string; length: number }> => {
  const response = await api.post('/word/extract-text', { file_id: fileId });
  return response.data;
};

export const addWordHeader = async (
  fileId: string, 
  text: string, 
  align?: string
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/word/add-header', {
    file_id: fileId,
    text,
    align: align || 'center',
  });
  return response.data;
};

export const addWordFooter = async (
  fileId: string, 
  text: string,
  includePageNumber?: boolean
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/word/add-footer', {
    file_id: fileId,
    text,
    include_page_number: includePageNumber || false,
  });
  return response.data;
};

export const replaceWordText = async (
  fileId: string, 
  findText: string, 
  replaceText: string
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/word/replace-text', {
    file_id: fileId,
    find_text: findText,
    replace_text: replaceText,
  });
  return response.data;
};

// ============ Conversion API ============

export const getConversionCapabilities = async (): Promise<Record<string, boolean>> => {
  const response = await api.get('/convert/capabilities');
  return response.data;
};

export const convertWordToPdf = async (fileId: string): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/convert/word-to-pdf', {
    file_id: fileId,
  });
  return response.data;
};

export const convertPdfToWord = async (fileId: string): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/convert/pdf-to-word', {
    file_id: fileId,
  });
  return response.data;
};

export const convertPdfToImages = async (
  fileId: string, 
  dpi?: number, 
  format?: string
): Promise<MultipleOutputResponse> => {
  const response = await api.post<MultipleOutputResponse>('/convert/pdf-to-images', {
    file_id: fileId,
    dpi: dpi || 200,
    image_format: format || 'png',
  });
  return response.data;
};

export const convertImagesToPdf = async (fileIds: string[]): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/convert/images-to-pdf', fileIds);
  return response.data;
};

// ============ OCR API ============

export const getOcrStatus = async (): Promise<{ available: boolean; languages: string[] }> => {
  const response = await api.get('/convert/ocr/status');
  return response.data;
};

export const extractTextWithOcr = async (
  fileId: string, 
  language?: string
): Promise<{ text: string; length: number }> => {
  const response = await api.post('/convert/ocr/extract', {
    file_id: fileId,
    language: language || 'eng',
  });
  return response.data;
};

export const createSearchablePdf = async (
  fileId: string, 
  language?: string
): Promise<OperationResponse> => {
  const response = await api.post<OperationResponse>('/convert/ocr/searchable-pdf', {
    file_id: fileId,
    language: language || 'eng',
  });
  return response.data;
};

// ============ Utility Functions ============

export const downloadFile = (url: string, filename: string): void => {
  // Get the API URL from environment or default to localhost:8000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // Prepend API_URL if the URL is a relative path
  const absoluteUrl = url.startsWith('/') ? `${API_URL}${url}` : url;
  const link = document.createElement('a');
  link.href = absoluteUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default api;
