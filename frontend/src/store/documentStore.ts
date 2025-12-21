import { create } from 'zustand';
import type { FileInfo, Toast } from '../types';

interface DocumentStore {
  // Files
  files: FileInfo[];
  selectedFileIds: string[];
  currentFile: FileInfo | null;
  
  // Thumbnails cache
  thumbnails: Record<string, string[]>;
  
  // UI State
  loading: boolean;
  error: string | null;
  processingProgress: number;
  
  // Toasts
  toasts: Toast[];
  
  // Actions
  addFile: (file: FileInfo) => void;
  addFiles: (files: FileInfo[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  
  selectFile: (fileId: string) => void;
  deselectFile: (fileId: string) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  
  setCurrentFile: (file: FileInfo | null) => void;
  
  setThumbnails: (fileId: string, thumbnails: string[]) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state
  files: [],
  selectedFileIds: [],
  currentFile: null,
  thumbnails: {},
  loading: false,
  error: null,
  processingProgress: 0,
  toasts: [],
  
  // File actions
  addFile: (file) => set((state) => ({
    files: [...state.files, file]
  })),
  
  addFiles: (files) => set((state) => ({
    files: [...state.files, ...files]
  })),
  
  removeFile: (fileId) => set((state) => ({
    files: state.files.filter(f => f.file_id !== fileId),
    selectedFileIds: state.selectedFileIds.filter(id => id !== fileId),
    currentFile: state.currentFile?.file_id === fileId ? null : state.currentFile
  })),
  
  clearFiles: () => set({
    files: [],
    selectedFileIds: [],
    currentFile: null,
    thumbnails: {}
  }),
  
  // Selection actions
  selectFile: (fileId) => set((state) => ({
    selectedFileIds: state.selectedFileIds.includes(fileId) 
      ? state.selectedFileIds 
      : [...state.selectedFileIds, fileId]
  })),
  
  deselectFile: (fileId) => set((state) => ({
    selectedFileIds: state.selectedFileIds.filter(id => id !== fileId)
  })),
  
  toggleFileSelection: (fileId) => set((state) => ({
    selectedFileIds: state.selectedFileIds.includes(fileId)
      ? state.selectedFileIds.filter(id => id !== fileId)
      : [...state.selectedFileIds, fileId]
  })),
  
  selectAllFiles: () => set((state) => ({
    selectedFileIds: state.files.map(f => f.file_id)
  })),
  
  deselectAllFiles: () => set({
    selectedFileIds: []
  }),
  
  setCurrentFile: (file) => set({ currentFile: file }),
  
  // Thumbnails
  setThumbnails: (fileId, thumbnails) => set((state) => ({
    thumbnails: { ...state.thumbnails, [fileId]: thumbnails }
  })),
  
  // UI state
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setProgress: (progress) => set({ processingProgress: progress }),
  
  // Toast notifications
  addToast: (toast) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
    
    // Auto remove after duration
    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration || 5000);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
}));
