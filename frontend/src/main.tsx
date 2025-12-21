import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import SignatureSetupModal from './components/SignatureSetupModal'
import PdfPageViewer from './components/PdfPageViewer'
import FieldsPanel from './components/FieldsPanel'
import RedactionViewer from './components/RedactionViewer'
import RedactionPanel from './components/RedactionPanel'

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Types
interface UploadedFile {
  file_id: string
  filename: string
  size: number
  page_count?: number
}

interface MergeFile extends UploadedFile {
  thumbnail?: string
  rotation: number
}

interface OutputFile {
  filename: string
  download_url: string
  file_id?: string
}

interface ToolResult {
  success: boolean
  message: string
  outputs: OutputFile[]
}

interface Tool {
  id: string
  name: string
  icon: string
  color: string
  desc: string
  category: 'organize' | 'optimize' | 'convert-to' | 'convert-from' | 'edit' | 'security'
  acceptedTypes: string
}

interface PageRange {
  start: number
  end: number
}

// Tool categories
type ToolCategory = 'organize' | 'optimize' | 'convert-to' | 'convert-from' | 'edit' | 'security'

// Category metadata
const categories: { id: ToolCategory; name: string; icon: string; color: string }[] = [
  { id: 'organize', name: 'ORGANIZE PDF', icon: '📁', color: 'from-rose-500 to-red-500' },
  { id: 'optimize', name: 'OPTIMIZE PDF', icon: '⚡', color: 'from-green-500 to-emerald-500' },
  { id: 'convert-to', name: 'CONVERT TO PDF', icon: '📥', color: 'from-amber-500 to-orange-500' },
  { id: 'convert-from', name: 'CONVERT FROM PDF', icon: '📤', color: 'from-green-500 to-teal-500' },
  { id: 'edit', name: 'EDIT PDF', icon: '✏️', color: 'from-pink-500 to-rose-500' },
  { id: 'security', name: 'PDF SECURITY', icon: '🔒', color: 'from-gray-600 to-gray-700' },
]

// All available tools
const allTools: Tool[] = [
  // ORGANIZE PDF
  { id: 'merge', name: 'Merge PDF', icon: '/icons/organize_tools/merge_pdf_icon.svg', color: 'from-rose-500 to-red-600', desc: 'Combine multiple PDFs', category: 'organize', acceptedTypes: '.pdf' },
  { id: 'split', name: 'Split PDF', icon: '/icons/organize_tools/split_pdf_icon.svg', color: 'from-rose-500 to-red-600', desc: 'Separate PDF pages', category: 'organize', acceptedTypes: '.pdf' },
  { id: 'extract', name: 'Extract Pages', icon: '/icons/organize_tools/extract_pdf_icon.svg', color: 'from-rose-500 to-red-600', desc: 'Get specific pages', category: 'organize', acceptedTypes: '.pdf' },
  { id: 'remove-pages', name: 'Remove Pages', icon: '/icons/organize_tools/remove_pdf_icon.svg', color: 'from-rose-500 to-red-600', desc: 'Delete PDF pages', category: 'organize', acceptedTypes: '.pdf' },
  { id: 'organize-pages', name: 'Organize PDF', icon: '/icons/organize_tools/organize_pdf_icon.svg', color: 'from-rose-500 to-red-600', desc: 'Reorder PDF pages', category: 'organize', acceptedTypes: '.pdf' },
  
  // OPTIMIZE PDF
  { id: 'compress', name: 'Compress PDF', icon: '/icons/optimize_tools/compress_pdf_icon.svg', color: 'from-green-500 to-emerald-600', desc: 'Reduce PDF file size', category: 'optimize', acceptedTypes: '.pdf' },
  { id: 'repair', name: 'Repair PDF', icon: '/icons/optimize_tools/repair_pdf_icon.svg', color: 'from-green-500 to-emerald-600', desc: 'Fix corrupted PDF', category: 'optimize', acceptedTypes: '.pdf' },
  { id: 'ocr', name: 'OCR PDF', icon: '/icons/convert_tools/ocr_pdf_icon.svg', color: 'from-green-500 to-emerald-600', desc: 'Make scanned PDF searchable', category: 'optimize', acceptedTypes: '.pdf,.png,.jpg,.jpeg' },
  
  // CONVERT TO PDF
  { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: '/icons/convert_tools/jpg_pdf_icon.svg', color: 'from-amber-500 to-orange-600', desc: 'Convert images to PDF', category: 'convert-to', acceptedTypes: '.jpg,.jpeg,.png,.gif,.bmp' },
  { id: 'word-to-pdf', name: 'WORD to PDF', icon: '/icons/convert_tools/word_pdf_icon.svg', color: 'from-amber-500 to-orange-600', desc: 'Convert Word to PDF', category: 'convert-to', acceptedTypes: '.doc,.docx' },
  { id: 'ppt-to-pdf', name: 'POWERPOINT to PDF', icon: '/icons/convert_tools/ppt_pdf_icon.svg', color: 'from-amber-500 to-orange-600', desc: 'Convert PowerPoint to PDF', category: 'convert-to', acceptedTypes: '.ppt,.pptx' },
  { id: 'excel-to-pdf', name: 'EXCEL to PDF', icon: '/icons/convert_tools/excel_pdf_icon.svg', color: 'from-amber-500 to-orange-600', desc: 'Convert Excel to PDF', category: 'convert-to', acceptedTypes: '.xls,.xlsx' },
  { id: 'html-to-pdf', name: 'HTML to PDF', icon: '/icons/convert_tools/html_pdf_icon.svg', color: 'from-amber-500 to-orange-600', desc: 'Convert webpage to PDF', category: 'convert-to', acceptedTypes: '.html,.htm' },
  
  // CONVERT FROM PDF
  { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: '/icons/convert_from/pdf_jpg_icon.svg', color: 'from-teal-500 to-green-600', desc: 'Convert PDF to images', category: 'convert-from', acceptedTypes: '.pdf' },
  { id: 'pdf-to-word', name: 'PDF to WORD', icon: '/icons/convert_from/pdf_word_icon.svg', color: 'from-teal-500 to-green-600', desc: 'Convert PDF to DOCX', category: 'convert-from', acceptedTypes: '.pdf' },
  { id: 'pdf-to-ppt', name: 'PDF to POWERPOINT', icon: '/icons/convert_from/pdf_ppt_icon.svg', color: 'from-teal-500 to-green-600', desc: 'Convert PDF to PPTX', category: 'convert-from', acceptedTypes: '.pdf' },
  { id: 'pdf-to-excel', name: 'PDF to EXCEL', icon: '/icons/convert_from/pdf_excel_icon.svg', color: 'from-teal-500 to-green-600', desc: 'Convert PDF to XLSX', category: 'convert-from', acceptedTypes: '.pdf' },
  
  // EDIT PDF
  { id: 'rotate', name: 'Rotate PDF', icon: '/icons/edit_tools/rotate_icon.svg', color: 'from-pink-500 to-rose-600', desc: 'Rotate all pages', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'rotate-individual', name: 'Rotate Pages Individually', icon: '/icons/edit_tools/rotate_individual_icon.svg', color: 'from-pink-500 to-rose-600', desc: 'Rotate specific pages', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'add-blank-page', name: 'Add Blank Page', icon: '/icons/edit_tools/add_blank_page.svg', color: 'from-pink-500 to-rose-600', desc: 'Insert blank pages', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'page-numbers', name: 'Add Page Numbers', icon: '/icons/edit_tools/page_numbers_icon.svg', color: 'from-pink-500 to-rose-600', desc: 'Number your pages', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'watermark', name: 'Add Watermark', icon: '/icons/edit_tools/watermark.svg', color: 'from-pink-500 to-rose-600', desc: 'Stamp text or image', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'crop', name: 'Crop PDF', icon: '/icons/edit_tools/crop_pdf.svg', color: 'from-pink-500 to-rose-600', desc: 'Crop page margins', category: 'edit', acceptedTypes: '.pdf' },
  { id: 'edit-pdf', name: 'Edit PDF', icon: '/icons/edit_tools/edit_pdf_icon.svg', color: 'from-pink-500 to-rose-600', desc: 'Edit text and images', category: 'edit', acceptedTypes: '.pdf' },
  
  // PDF SECURITY
  { id: 'unlock', name: 'Unlock PDF', icon: '/icons/security_tools/unlock_pdf.svg', color: 'from-gray-600 to-gray-700', desc: 'Remove password', category: 'security', acceptedTypes: '.pdf' },
  { id: 'protect', name: 'Protect PDF', icon: '/icons/security_tools/protect_pdf_icon.svg', color: 'from-gray-600 to-gray-700', desc: 'Add password', category: 'security', acceptedTypes: '.pdf' },
  { id: 'sign', name: 'Sign PDF', icon: '/icons/security_tools/sign_pdf_icon.svg', color: 'from-gray-600 to-gray-700', desc: 'Add signature', category: 'security', acceptedTypes: '.pdf' },
  { id: 'redact', name: 'Redact PDF', icon: '/icons/security_tools/redact_pdf_icon.svg', color: 'from-gray-600 to-gray-700', desc: 'Black out text', category: 'security', acceptedTypes: '.pdf' },
  { id: 'compare', name: 'Compare PDF', icon: '/icons/security_tools/compare_pdf_icon.svg', color: 'from-gray-600 to-gray-700', desc: 'Compare two PDFs', category: 'security', acceptedTypes: '.pdf' },
]

// Tools that are implemented
const implementedTools = ['merge', 'split', 'extract', 'remove-pages', 'organize-pages', 'compress', 'repair', 'jpg-to-pdf', 'word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf', 'html-to-pdf', 'pdf-to-jpg', 'pdf-to-word', 'pdf-to-ppt', 'rotate', 'rotate-individual', 'add-blank-page', 'page-numbers', 'watermark', 'crop', 'unlock', 'protect', 'sign', 'redact']

// Success Popup Modal
function SuccessModal({ isOpen, onClose, outputs, message, toolIcon }: { 
  isOpen: boolean; onClose: () => void; outputs: OutputFile[]; message: string; toolIcon: string 
}) {
  if (!isOpen) return null
  
  const downloadFile = (url: string, filename: string) => {
    // Prepend API_URL if the URL is a relative path
    const absoluteUrl = url.startsWith('/') ? `${API_URL}${url}` : url
    const link = document.createElement('a')
    link.href = absoluteUrl; link.download = filename; link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }
  
  const downloadAll = () => outputs.forEach((o, i) => setTimeout(() => downloadFile(o.download_url, o.filename), i * 300))
  
  const downloadAsZip = async () => {
    const fileIds = outputs.map(o => o.file_id).filter(Boolean)
    if (fileIds.length === 0) {
      // Fallback to downloadAll if no file_ids available
      downloadAll()
      return
    }
    
    try {
      // Get base name from first file for zip name
      const zipName = outputs[0]?.filename?.replace(/\.[^.]+$/, '').replace(/\(\d+\)$/, '').trim() || 'files'
      
      const response = await fetch(`${API_URL}/api/upload/download-zip?zip_name=${encodeURIComponent(zipName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileIds)
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${zipName}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('ZIP download failed:', error)
      downloadAll()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-6 text-white text-center">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-xl font-bold">Success!</h2>
          <p className="text-green-100 mt-1">{message}</p>
        </div>
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-3">{outputs.length} file{outputs.length > 1 ? 's' : ''} ready:</h3>
          <div className="space-y-2">
            {outputs.map((output, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={toolIcon} alt="Icon" className="w-8 h-8 object-contain" />
                  <span className="text-gray-700 font-medium truncate">{output.filename}</span>
                </div>
                <button onClick={() => downloadFile(output.download_url, output.filename)} className="btn btn-primary text-sm px-4 py-2">⬇️ Download</button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-2">
          {outputs.length > 1 && (
            <>
              <button onClick={downloadAll} className="flex-1 btn bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl text-sm">⬇️ Download All</button>
              <button onClick={downloadAsZip} className="flex-1 btn bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl text-sm">📦 Download ZIP</button>
            </>
          )}
          <button onClick={onClose} className={`${outputs.length > 1 ? 'w-full mt-2' : 'flex-1'} btn btn-secondary py-3 rounded-xl`}>Process Another File</button>
        </div>
      </div>
    </div>
  )
}

// Coming Soon Modal
function ComingSoonModal({ isOpen, onClose, toolName, toolIcon }: { 
  isOpen: boolean; onClose: () => void; toolName: string; toolIcon: string 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-3 backdrop-blur-sm">
            <img src={toolIcon} alt={toolName} className="w-10 h-10 object-contain brightness-0 invert" />
          </div>
          <h2 className="text-xl font-bold">Coming Soon!</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-6">
            <span className="font-semibold text-gray-800">{toolName}</span> is currently under development. 
            We're working hard to bring this feature to you! 🚀
          </p>
          <button 
            onClick={onClose} 
            className="btn bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-all w-full"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  )
}

// Validation/Warning Popup Modal
function ValidationModal({ isOpen, onClose, message }: { 
  isOpen: boolean; onClose: () => void; message: string
}) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 text-white text-center">
          <div className="text-5xl mb-2">⚠️</div>
          <h2 className="text-xl font-bold">Oops!</h2>
          <p className="text-orange-100 mt-1">{message}</p>
        </div>
        <div className="p-6 text-center">
          <button onClick={onClose} className="btn bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all">
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

// Processing Popup Modal
function ProcessingModal({ isOpen, toolName }: { 
  isOpen: boolean; toolName: string
}) {
  if (!isOpen) return null
  
  const messages = [
    "Hold tight! We're working on it... 🚀",
    "Processing your files... ✨",
    "Almost there, hang on! ⏳",
    "Making magic happen... 🪄",
    "Working hard for you... 💪"
  ]
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white text-center">
          {/* Animated Spinner */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white border-opacity-30 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Processing...</h2>
          <p className="text-blue-100">{toolName}</p>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-600 text-lg">{randomMessage}</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Uploading Popup Modal
function UploadingModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null
  
  const messages = [
    "Preparing your file...",
    "Analyzing document...",
    "Loading page thumbnails...",
    "Almost ready...",
    "Just a moment..."
  ]
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="w-16 h-16 border-4 border-white border-opacity-30 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center text-2xl">📄</div>
          </div>
          <h2 className="text-xl font-bold">Uploading...</h2>
        </div>
        <div className="p-5 text-center">
          <p className="text-gray-600">{randomMessage}</p>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error Popup Modal
function ErrorModal({ isOpen, onClose, message }: { 
  isOpen: boolean; onClose: () => void; message: string
}) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-popup">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white text-center">
          <div className="text-5xl mb-2">❌</div>
          <h2 className="text-xl font-bold">Error!</h2>
          <p className="text-red-100 mt-2">{message}</p>
        </div>
        <div className="p-6 text-center">
          <button onClick={onClose} className="btn bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}



// Main App Component
function App() {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [mergeFiles, setMergeFiles] = useState<MergeFile[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ToolResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [showError, setShowError] = useState(false)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showUploading, setShowUploading] = useState(false)
  const [comingSoonTool, setComingSoonTool] = useState<Tool | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Ref for file input to reset it
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Theme state - default to light
  const [darkMode, setDarkMode] = useState(false)
  
  // Toggle theme and update body class
  const toggleTheme = () => {
    setDarkMode(!darkMode)
    document.body.classList.toggle('dark')
  }
  
  // Tool options
  const [password, setPassword] = useState('password123')
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [rotateAngle, setRotateAngle] = useState(90)
  const [compressQuality, setCompressQuality] = useState(80)
  const [headerText, setHeaderText] = useState('Document Header')
  const [footerText, setFooterText] = useState('Document Footer')
  const [splitMode, setSplitMode] = useState<'ranges' | 'each'>('ranges')
  const [pageRanges, setPageRanges] = useState<PageRange[]>([{ start: 1, end: 1 }])
  const [mergeRanges, setMergeRanges] = useState(false)
  const [extractPages, setExtractPages] = useState<string>('1,2,3')
  const [removePages, setRemovePages] = useState<string>('')
  const [pagesToRemove, setPagesToRemove] = useState<Set<number>>(new Set())
  const [allPageThumbnails, setAllPageThumbnails] = useState<string[]>([])
  // Organize pages state: array of { thumb, originalPage, rotation }
  const [organizePages, setOrganizePages] = useState<{ thumb: string; originalPage: number; rotation: number; isBlank?: boolean }[]>([])
  const [organizeDragIndex, setOrganizeDragIndex] = useState<number | null>(null)
  const [organizeDragOver, setOrganizeDragOver] = useState<number | null>(null)
  const [pageOrder, setPageOrder] = useState<string>('')
  const [pageNumPosition, setPageNumPosition] = useState<string>('bottom-center')
  const [pageNumFormat, setPageNumFormat] = useState<string>('Page {n}')
  const [cropMargins, setCropMargins] = useState({ left: 20, top: 20, right: 20, bottom: 20 })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'custom'>('custom')
  const [mergeOutputName, setMergeOutputName] = useState('merged')
  const [pageRotations, setPageRotations] = useState<{[page: number]: number}>({})
  const [blankPagePositions, setBlankPagePositions] = useState<Set<number>>(new Set())
  
  // Edit PDF state
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [replaceAll, setReplaceAll] = useState(true)
  
  // Redact PDF state
  const [redactions, setRedactions] = useState<Array<{page: number, x: number, y: number, width: number, height: number}>>([])
  const [showRedactionView, setShowRedactionView] = useState(false)
  const [redactionDownloadUrl, setRedactionDownloadUrl] = useState<string | null>(null)
  const [redactionFileName, setRedactionFileName] = useState<string>('')
  
  // Sign PDF state - New Comprehensive System
  const [showSignatureSetup, setShowSignatureSetup] = useState(false)
  const [showPdfSigningView, setShowPdfSigningView] = useState(false)
  const [signatureConfig, setSignatureConfig] = useState<{
    fullName: string
    initials: string
    signatureType: 'type' | 'draw' | 'upload'
    signatureImage: string
    initialsImage: string  
    companyStamp: string
    color: string
  } | null>(null)
  const [placedFields, setPlacedFields] = useState<Array<{
    id: string
    type: 'signature' | 'initials' | 'date' | 'name' | 'text' | 'stamp'
    page: number
    x: number
    y: number
    width: number
    height: number
    value?: string
    imageData?: string
  }>>([])
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // File upload with thumbnail for merge
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== UPLOAD START ===')
    const uploadedFiles = e.target.files
    console.log('Files selected:', uploadedFiles?.length)
    if (!uploadedFiles?.length) return
    
    // Limit to 1 file for sign and redact tools
    if ((selectedTool?.id === 'sign' || selectedTool?.id === 'redact') && uploadedFiles.length > 1) {
      setValidationMessage('⚠️ Only 1 PDF can be uploaded for signing and redaction.')
      setShowValidation(true)
      return
    }
    
    setLoading(true); setError(null); setShowUploading(true)

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        console.log(`Uploading file ${i + 1}/${uploadedFiles.length}:`, uploadedFiles[i].name)
        const formData = new FormData()
        formData.append('file', uploadedFiles[i])
        console.log('FormData created, sending to:', `${API_URL}/api/upload/`)
        console.log('About to fetch...')
        const response = await fetch(`${API_URL}/api/upload/`, { method: 'POST', body: formData })
        console.log('Response received:', response.status)
        if (!response.ok) throw new Error('Upload failed')
        const data = await response.json()
        console.log('Upload successful:', data)
        
        const newFile: MergeFile = {
          file_id: data.file_id,
          filename: data.filename,
          size: data.file_size || data.size,
          page_count: data.page_count,
          rotation: 0
        }
        
        // Get thumbnail for PDF (for all PDF tools with preview)
        const pdfPreviewTools = ['merge', 'rotate', 'rotate-individual', 'add-blank-page', 'extract', 'remove-pages', 'organize-pages', 'split', 'compress', 'repair', 'page-numbers', 'crop', 'watermark', 'protect', 'unlock', 'ocr', 'pdf-to-jpg', 'pdf-to-word', 'pdf-to-ppt', 'sign', 'redact']
        if (pdfPreviewTools.includes(selectedTool?.id || '') && data.filename.endsWith('.pdf')) {
          try {
            const thumbRes = await fetch(`${API_URL}/api/pdf/thumbnails/${data.file_id}`)
            if (thumbRes.ok) {
              const thumbData = await thumbRes.json()
              if (thumbData.thumbnails?.length > 0) {
                newFile.thumbnail = thumbData.thumbnails[0]
                
                // For remove-pages, store ALL thumbnails for grid preview
                if (selectedTool?.id === 'remove-pages') {
                  setAllPageThumbnails(thumbData.thumbnails)
                  setPagesToRemove(new Set())
                  setRemovePages('')
                }
                
                // For organize-pages, initialize with all pages in original order
                if (selectedTool?.id === 'organize-pages') {
                  const pages = thumbData.thumbnails.map((thumb: string, idx: number) => ({
                    thumb,
                    originalPage: idx + 1,
                    rotation: 0,
                    isBlank: false
                  }))
                  setOrganizePages(pages)
                }
                
                // For rotate-individual, store all thumbnails and reset rotations
                if (selectedTool?.id === 'rotate-individual') {
                  setAllPageThumbnails(thumbData.thumbnails)
                  setPageRotations({})
                }
                
                // For add-blank-page, store all thumbnails
                if (selectedTool?.id === 'add-blank-page') {
                  setAllPageThumbnails(thumbData.thumbnails)
                  setBlankPagePositions(new Set())
                }
              }
            }
          } catch { }
        }
        
        // For image-to-pdf tool, use the uploaded image as preview
        if (selectedTool?.id === 'jpg-to-pdf') {
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
          const isImage = imageExtensions.some(ext => data.filename.toLowerCase().endsWith(ext))
          if (isImage) {
            // Use the upload URL as thumbnail
            newFile.thumbnail = `${API_URL}/uploads/${data.file_id}.${data.filename.split('.').pop()}`
          }
        }
        
        // Merge allows multiple files, single-file tools replace the existing file
        const singleFileTools = ['remove-pages', 'organize-pages', 'extract', 'rotate', 'rotate-individual', 'add-blank-page', 'compress', 'repair', 'page-numbers', 'crop', 'watermark', 'protect', 'unlock', 'split', 'sign', 'redact']
        
        if (selectedTool?.id === 'merge') {
          setMergeFiles(prev => [...prev, newFile])
        } else if (singleFileTools.includes(selectedTool?.id || '')) {
          // Single-file tools: replace existing file
          setFiles([newFile])
        } else {
          setFiles(prev => [...prev, newFile])
        }
        
        if (data.page_count) setPageRanges([{ start: 1, end: data.page_count }])
      }
    } catch (err) {
      setError('Upload failed. Check if backend is running.')
    } finally { setLoading(false); setShowUploading(false) }
  }

  // Drag handlers for merge reorder
  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null) }
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return
    const newFiles = [...mergeFiles]
    const [dragged] = newFiles.splice(draggedIndex, 1)
    newFiles.splice(dropIndex, 0, dragged)
    setMergeFiles(newFiles)
    setDraggedIndex(null); setDragOverIndex(null)
  }

  // Sort merge files
  const sortFiles = (order: 'asc' | 'desc') => {
    const sorted = [...mergeFiles].sort((a, b) => {
      if (order === 'asc') return a.filename.localeCompare(b.filename)
      return b.filename.localeCompare(a.filename)
    })
    setMergeFiles(sorted)
    setSortOrder(order)
  }

  // Rotate a merge file
  const rotateMergeFile = (index: number) => {
    const newFiles = [...mergeFiles]
    newFiles[index].rotation = (newFiles[index].rotation + 90) % 360
    setMergeFiles(newFiles)
  }

  // Remove a merge file
  const removeMergeFile = (index: number) => setMergeFiles(prev => prev.filter((_, i) => i !== index))

  // Toggle page for removal (for remove-pages tool)
  const togglePageRemoval = (pageNum: number) => {
    const newSet = new Set(pagesToRemove)
    if (newSet.has(pageNum)) {
      newSet.delete(pageNum)
    } else {
      newSet.add(pageNum)
    }
    setPagesToRemove(newSet)
    // Sync with removePages string
    setRemovePages(Array.from(newSet).sort((a, b) => a - b).join(', '))
  }

  // Organize pages handlers
  const handleOrganizeDragStart = (index: number) => setOrganizeDragIndex(index)
  const handleOrganizeDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setOrganizeDragOver(index) }
  const handleOrganizeDragEnd = () => { setOrganizeDragIndex(null); setOrganizeDragOver(null) }
  const handleOrganizeDrop = (dropIndex: number) => {
    if (organizeDragIndex === null || organizeDragIndex === dropIndex) return
    const newPages = [...organizePages]
    const [dragged] = newPages.splice(organizeDragIndex, 1)
    newPages.splice(dropIndex, 0, dragged)
    setOrganizePages(newPages)
    setOrganizeDragIndex(null)
    setOrganizeDragOver(null)
  }
  const rotateOrganizePage = (index: number) => {
    const newPages = [...organizePages]
    newPages[index].rotation = (newPages[index].rotation + 90) % 360
    setOrganizePages(newPages)
  }
  const removeOrganizePage = (index: number) => {
    if (organizePages.length <= 1) {
      setValidationMessage('PDF must have at least 1 page!')
      setShowValidation(true)
      return
    }
    setOrganizePages(prev => prev.filter((_, i) => i !== index))
  }
  const addBlankPage = (afterIndex: number) => {
    const blankPage = { thumb: '', originalPage: 0, rotation: 0, isBlank: true }
    const newPages = [...organizePages]
    newPages.splice(afterIndex + 1, 0, blankPage)
    setOrganizePages(newPages)
  }

  // Add/Update page range
  const addPageRange = () => {
    const lastRange = pageRanges[pageRanges.length - 1]
    setPageRanges([...pageRanges, { start: lastRange.end + 1, end: lastRange.end + 1 }])
  }
  const removePageRange = (index: number) => { if (pageRanges.length > 1) setPageRanges(pageRanges.filter((_, i) => i !== index)) }
  const updatePageRange = (index: number, field: 'start' | 'end', value: number) => {
    const newRanges = [...pageRanges]; newRanges[index][field] = value; setPageRanges(newRanges)
  }

  // Execute tool
  const executeTool = async () => {
    const fileList = selectedTool?.id === 'merge' ? mergeFiles : files
    if (!selectedTool || fileList.length === 0) return
    setLoading(true); setError(null); setResult(null); setShowProcessing(true)

    try {
      let endpoint = '', body: any = {}

      switch (selectedTool.id) {
        case 'merge':
          endpoint = '/api/pdf/merge'
          // Use user's output filename
          const outputName = mergeOutputName || 'merged'
          body = { 
            file_ids: mergeFiles.map(f => f.file_id), 
            output_filename: `${outputName}.pdf`,
            rotations: mergeFiles.map(f => f.rotation)
          }
          break
        case 'split':
          endpoint = '/api/pdf/split'
          if (splitMode === 'each') {
            const totalPages = files[0].page_count || 10
            const eachPageRanges = Array.from({ length: totalPages }, (_, i) => ({ start: i + 1, end: i + 1 }))
            body = { file_id: files[0].file_id, ranges: eachPageRanges, merge_all: mergeRanges, original_filename: files[0].filename }
          } else {
            body = { file_id: files[0].file_id, ranges: pageRanges, merge_all: mergeRanges, original_filename: files[0].filename }
          }
          break
        case 'rotate': endpoint = '/api/pdf/rotate'; body = { file_id: files[0].file_id, pages: [], angle: rotateAngle, original_filename: files[0].filename }; break
        case 'compress': endpoint = '/api/pdf/compress'; body = { file_id: files[0].file_id, quality: compressQuality }; break
        case 'protect': endpoint = '/api/pdf/protect'; body = { file_id: files[0].file_id, password }; break
        case 'unlock': endpoint = '/api/pdf/unlock'; body = { file_id: files[0].file_id, password }; break
        case 'watermark': endpoint = '/api/pdf/watermark'; body = { file_id: files[0].file_id, text: watermarkText, opacity: 0.3, position: 'center' }; break
        case 'extract': endpoint = '/api/pdf/extract'; body = { file_id: files[0].file_id, pages: extractPages.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p)), original_filename: files[0].filename }; break
        case 'remove-pages': 
          // Validate: cannot remove all pages
          if (pagesToRemove.size >= allPageThumbnails.length && allPageThumbnails.length > 0) {
            setShowProcessing(false)
            setValidationMessage('Cannot remove all pages! PDF must have at least 1 page remaining.')
            setShowValidation(true)
            setLoading(false)
            return
          }
          if (pagesToRemove.size === 0) {
            setValidationMessage('Please select at least one page to remove.')
            setShowValidation(true)
            setLoading(false)
            return
          }
          endpoint = '/api/pdf/delete'
          body = { file_id: files[0].file_id, pages: Array.from(pagesToRemove), original_filename: files[0].filename }
          break
        case 'organize-pages': 
          // Build new order from organizePages (excluding blank pages for now, originalPage values)
          const newOrder = organizePages.filter(p => !p.isBlank).map(p => p.originalPage)
          if (newOrder.length === 0) {
            setShowProcessing(false)
            setValidationMessage('Cannot create empty PDF!')
            setShowValidation(true)
            setLoading(false)
            return
          }
          endpoint = '/api/pdf/reorder'
          body = { file_id: files[0].file_id, new_order: newOrder, original_filename: files[0].filename }
          break
        case 'word-merge': endpoint = '/api/word/merge'; body = { file_ids: files.map(f => f.file_id) }; break
        case 'word-header': endpoint = '/api/word/add-header'; body = { file_id: files[0].file_id, text: headerText, align: 'center' }; break
        case 'word-footer': endpoint = '/api/word/add-footer'; body = { file_id: files[0].file_id, text: footerText, align: 'center' }; break
        case 'word-to-pdf': endpoint = '/api/convert/word-to-pdf'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'pdf-to-word': endpoint = '/api/convert/pdf-to-word'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'pdf-to-images': endpoint = '/api/convert/pdf-to-images'; body = { file_id: files[0].file_id, dpi: 150, image_format: 'png', original_filename: files[0].filename }; break
        case 'pdf-to-jpg': endpoint = '/api/convert/pdf-to-images'; body = { file_id: files[0].file_id, dpi: 150, image_format: 'jpg', original_filename: files[0].filename }; break
        case 'jpg-to-pdf': 
          const baseName = files[0].filename.replace(/\.[^.]+$/, '')  // Remove extension
          endpoint = '/api/pdf/images-to-pdf'
          body = { file_ids: files.map(f => f.file_id), output_filename: `${baseName}.pdf` }
          break
        case 'repair': endpoint = '/api/pdf/repair'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'page-numbers': endpoint = '/api/pdf/page-numbers'; body = { file_id: files[0].file_id, position: pageNumPosition, format_str: pageNumFormat, original_filename: files[0].filename }; break
        case 'crop': endpoint = '/api/pdf/crop'; body = { file_id: files[0].file_id, left: cropMargins.left, top: cropMargins.top, right: cropMargins.right, bottom: cropMargins.bottom, original_filename: files[0].filename }; break
        case 'ocr': endpoint = '/api/convert/ocr'; body = { file_id: files[0].file_id, original_filename: files[0].filename, language: 'eng' }; break
        case 'ppt-to-pdf': endpoint = '/api/convert/ppt-to-pdf'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'excel-to-pdf': endpoint = '/api/convert/excel-to-pdf'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'html-to-pdf': endpoint = '/api/convert/html-to-pdf'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'pdf-to-ppt': endpoint = '/api/convert/pdf-to-ppt'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'pdf-to-excel': endpoint = '/api/convert/pdf-to-excel'; body = { file_id: files[0].file_id, original_filename: files[0].filename }; break
        case 'rotate-individual': endpoint = '/api/pdf/rotate-individual'; body = { file_id: files[0].file_id, rotations: pageRotations, original_filename: files[0].filename }; break
        case 'add-blank-page': endpoint = '/api/pdf/add-blank-page'; body = { file_id: files[0].file_id, positions: Array.from(blankPagePositions), original_filename: files[0].filename }; break
        case 'edit-pdf':
          if (!searchText) {
            setValidationMessage('Please enter text to search for.')
            setShowValidation(true)
            setLoading(false)
            return
          }
          endpoint = '/api/pdf/edit-text'
          body = { file_id:  files[0].file_id, search_text: searchText, replace_text: replaceText, all_occurrences: replaceAll, original_filename: files[0].filename }
          break
        case 'redact':
          if (redactions.length === 0) {
            setValidationMessage('Please select at least one area to redact.')
            setShowValidation(true)
            setLoading(false)
            return
          }
          endpoint = '/api/pdf/redact'
          body = { file_id: files[0].file_id, redaction_areas: redactions, original_filename: files[0].filename }
          break
        case 'sign':
          if (!signatureConfig || placedFields.length === 0) {
            setValidationMessage('Please configure signatures and place at least one field on the PDF.')
            setShowValidation(true)
            setLoading(false)
            return
          }
          
          endpoint = '/api/pdf/sign'
          body = { 
            file_id: files[0].file_id, 
            placed_fields: placedFields.map(field => ({
              field_type: field.type,
              page: field.page,
              x: field.x,
              y: field.y,
              width: field.width,
              height: field.height,
              value: field.value,
              image_data: field.imageData
            })),
            original_filename: files[0].filename 
          }
          break
        default: throw new Error('Unknown tool')
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })

      if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'Operation failed') }
      const data = await response.json()
      
      let outputs: OutputFile[] = []
      if (data.outputs && Array.isArray(data.outputs)) {
        outputs = data.outputs.map((o: any) => ({ 
          filename: o.output_filename || o.filename, 
          download_url: o.download_url || `${API_URL}/outputs/${o.output_filename || o.filename}`,
          file_id: o.output_file_id || o.file_id
        }))
      } else if (data.output_filename) {
        outputs = [{ 
          filename: data.output_filename, 
          download_url: data.download_url || `${API_URL}/outputs/${data.output_filename}`,
          file_id: data.output_file_id
        }]
      }
      
      setResult({ success: true, message: data.message || 'Success!', outputs })
      setShowProcessing(false)
      setShowModal(true)
    } catch (err: any) { 
      setShowProcessing(false)
      setError(err.message || 'Operation failed')
      setShowError(true)
    }
    finally { setLoading(false) }
  }

  const goBack = () => { setSelectedTool(null); setFiles([]); setMergeFiles([]); setResult(null); setError(null); setShowModal(false); setShowProcessing(false); setShowError(false); setPageRanges([{ start: 1, end: 1 }]); setSortOrder('custom') }
  const closeModal = () => { setShowModal(false); setShowProcessing(false); setShowError(false); setFiles([]); setMergeFiles([]); setResult(null); setPageRanges([{ start: 1, end: 1 }]) }
  const closeError = () => { setShowError(false); setError(null) }
  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))

  // Check if tool is implemented
  const isImplemented = (toolId: string) => implementedTools.includes(toolId)

  // Handle tool selection
  const handleToolSelect = (tool: Tool) => {
    if (isImplemented(tool.id)) {
      setSelectedTool(tool)
    } else {
      setComingSoonTool(tool)
      setShowComingSoon(true)
    }
  }

  if (!selectedTool) {
    return (
      <div className="min-h-screen">
        <ComingSoonModal 
          isOpen={showComingSoon} 
          onClose={() => setShowComingSoon(false)} 
          toolName={comingSoonTool?.name || ''} 
          toolIcon={comingSoonTool?.icon || ''} 
        />
        {/* Header */}
        <header className="glass sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-center gap-1">
                <img src="/logo.png" alt="PDFease Logo" className="w-16 h-16" />
                <h1 className="text-4xl font-bold" style={{marginLeft: '-10px'}}>
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                    PDFease
                  </span>
                </h1>
              </div>
              <p className="text-center text-black mt-2 text-lg font-semibold">All the PDF tools you need, in one place. 100% Free!</p>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="ml-4 p-3 rounded-full glass hover:bg-white/20 transition-all duration-300"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div className="p-4 bg-amber-100 border border-amber-300 rounded-xl text-amber-800 flex justify-between items-center">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} className="text-amber-800 hover:text-amber-900">✕</button>
            </div>
          </div>
        )}

        {/* Main Content - 6 Category Grid */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => {
              const toolsInCategory = allTools.filter(t => t.category === cat.id)
              return (
                <div key={cat.id} className="glass rounded-2xl shadow-lg overflow-hidden" style={{background: 'var(--card-bg)'}}>
                  {/* Category Header */}
                  <div className={`bg-gradient-to-r ${cat.color} px-4 py-3`}>
                    <h2 className="text-white font-bold flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      {cat.name}
                    </h2>
                  </div>
                  
                  {/* Tools List */}
                  <div className="p-4 space-y-1">
                    {toolsInCategory.map(tool => {
                      const implemented = isImplemented(tool.id)
                      return (
                          <button
                          key={tool.id}
                          onClick={() => handleToolSelect(tool)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all group ${
                            implemented 
                              ? 'hover:bg-white/10 hover:shadow-sm cursor-pointer' 
                              : 'opacity-60 cursor-not-allowed hover:bg-white/5'
                          }`}
                        >
                          <img 
                            src={tool.icon} 
                            alt={tool.name}
                            className="w-6 h-6 object-contain group-hover:scale-110 transition-transform"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }}
                          />
                          <span className="hidden text-xl">📄</span>
                          <span className={`font-medium ${!implemented ? 'opacity-50' : ''}`} style={{color: 'var(--text-primary)'}}>
                            {tool.name}
                          </span>
                          {!implemented && <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full ml-auto" style={{color: 'var(--text-secondary)'}}>Soon</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Features Section - Beautiful Glassmorphism Cards */}
          <div className="mt-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-white">Why Choose Us?</h2>
              <p className="text-white/80 text-lg">Experience the best PDF manipulation tool with premium features</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1: Secure */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>Your Data is Secure</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  We prioritize your document security. All your files are locally processed and never leave your device for maximum privacy protection.
                </p>
              </div>

              {/* Feature 2: Free & No Limit */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>Free & No Limit</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  Enjoy unlimited online conversions without downloading software or signing up. No watermarks inserted. Save time with our free online tool.
                </p>
              </div>

              {/* Feature 3: Quality */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>Without Quality Loss</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  Don't worry about quality loss during conversion. All images and texts are preserved in high quality, ensuring they appear clear and sharp in your exported documents.
                </p>
              </div>

              {/* Feature 4: Simple */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>Simple to Use</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  The conversion process is quick and easy, taking only a few simple steps. Preview and rearrange your uploaded files to ensure they're in the correct order for merging.
                </p>
              </div>

              {/* Feature 5: All Formats */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>All-Format Converter</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  Stop worrying about file types. We support all major formats including JPG, JPEG, PNG, HEIC, WebP, SVG, BMP, Word, Excel, PowerPoint, and more.
                </p>
              </div>

              {/* Feature 6: Anywhere */}
              <div className="feature-card">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>Convert Anywhere, Anytime</h3>
                <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                  Our online tool supports all platforms across Linux, Windows, Mac, and mobile browsers. Convert your files on any device, anytime, anywhere.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center py-8 mt-8 border-t border-white/20">
            <p className="text-black text-xs font-semibold">© 2025 PDF Tools Online. All rights reserved.</p>
          </footer>
        </main>
      </div>
    )
  }

  // ============== MERGE TOOL WORKSPACE ==============
  if (selectedTool.id === 'merge') {
    return (
      <div className="min-h-screen">
        <SuccessModal isOpen={showModal} onClose={closeModal} outputs={result?.outputs || []} message={result?.message || ''} toolIcon={selectedTool.icon} />
        <ProcessingModal isOpen={showProcessing} toolName={selectedTool.name} />
        <UploadingModal isOpen={showUploading} />
        <ErrorModal isOpen={showError} onClose={closeError} message={error || ''} />
        
        <header className="bg-white shadow-md border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button onClick={goBack} className="btn btn-secondary px-3 py-2">← Back</button>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedTool.color} flex items-center justify-center`}>
                  <img src={selectedTool.icon} alt={selectedTool.name} className="w-8 h-8 object-contain brightness-0 invert" />
                </div>
                <div><h1 className="text-xl font-bold text-gray-800">{selectedTool.name}</h1><p className="text-sm text-gray-500">{selectedTool.desc}</p></div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">

          {/* Upload Area */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📁 Upload PDF files</h2>
            <div className="dropzone text-center">
              <input type="file" id="fileInput" accept=".pdf" onChange={handleFileUpload} className="hidden" multiple />
              <label htmlFor="fileInput" className="cursor-pointer block py-8">
                <img src={selectedTool.icon} alt="Merge PDF" className="w-16 h-16 mx-auto mb-3 opacity-80" />
                <p className="text-gray-700 font-medium">{loading ? '⏳ Uploading...' : 'Click to upload or drag PDF files here'}</p>
                <p className="text-sm text-gray-500 mt-1">Upload multiple PDFs to merge them</p>
              </label>
            </div>
          </div>

          {/* PDF Grid with Drag & Drop */}
          {mergeFiles.length > 0 && (
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-800">{mergeFiles.length} PDF{mergeFiles.length > 1 ? 's' : ''} selected</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">🖐️ Drag and drop to change order</span>
                  {mergeFiles.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => sortFiles('asc')} className={`px-3 py-1 rounded-lg text-sm border transition-colors ${sortOrder === 'asc' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white hover:bg-gray-50'}`}>A→Z</button>
                      <button onClick={() => sortFiles('desc')} className={`px-3 py-1 rounded-lg text-sm border transition-colors ${sortOrder === 'desc' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white hover:bg-gray-50'}`}>Z→A</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mergeFiles.map((file, index) => (
                  <div
                    key={file.file_id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={() => handleDrop(index)}
                    className={`relative group bg-white rounded-xl border-2 p-3 cursor-move transition-all
                      ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                      ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 border-dashed' : 'border-gray-200'}
                      hover:shadow-lg hover:border-blue-300`}
                  >
                    {/* Thumbnail with actual rotation - scaled to fit container */}
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2 flex items-center justify-center relative">
                      {file.thumbnail ? (
                        <img 
                          src={file.thumbnail} 
                          alt={file.filename} 
                          className="max-w-full max-h-full object-contain transition-transform duration-300"
                          style={{ 
                            transform: `rotate(${file.rotation}deg) scale(${file.rotation === 90 || file.rotation === 270 ? 0.75 : 1})` 
                          }}
                        />
                      ) : (
                        <div 
                          className="text-4xl text-gray-400 transition-transform duration-300"
                          style={{ transform: `rotate(${file.rotation}deg)` }}
                        >📄</div>
                      )}
                      {file.rotation > 0 && (
                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium shadow">
                          ↻ {file.rotation}°
                        </div>
                      )}
                    </div>

                    {/* File name */}
                    <p className="text-xs text-gray-700 font-medium truncate text-center" title={file.filename}>
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-400 text-center">{file.page_count || '?'} pages</p>

                    {/* Action buttons - show on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => rotateMergeFile(index)}
                        className="w-7 h-7 bg-white rounded-full shadow border flex items-center justify-center text-sm hover:bg-blue-50"
                        title="Rotate 90°"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => removeMergeFile(index)}
                        className="w-7 h-7 bg-white rounded-full shadow border flex items-center justify-center text-sm hover:bg-red-50"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Order number */}
                    <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                  </div>
                ))}

                {/* Add more button */}
                <label htmlFor="fileInput" className="aspect-[3/4] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <div className="text-3xl text-gray-400 mb-2">➕</div>
                  <p className="text-sm text-gray-500">Add more</p>
                </label>
              </div>
            </div>
          )}

          {/* Options & Merge Button */}
          {mergeFiles.length >= 2 && (
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-gray-700 font-medium">Output filename:</label>
                <input
                  type="text"
                  value={mergeOutputName}
                  onChange={(e) => setMergeOutputName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="merged"
                />
                <span className="text-gray-500">.pdf</span>
              </div>
              <button
                onClick={executeTool}
                disabled={loading}
                className={`w-full btn btn-primary py-4 text-lg ${loading ? 'opacity-50' : ''}`}
              >
                {loading ? '⏳ Merging...' : `📑 Merge ${mergeFiles.length} PDFs`}
              </button>
            </div>
          )}

          {mergeFiles.length === 1 && (
            <div className="text-center text-gray-500 py-4">
              ☝️ Upload at least 2 PDFs to merge
            </div>
          )}
        </main>

        <style>{`
          @keyframes popup { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .animate-popup { animation: popup 0.3s ease-out; }
        `}</style>
      </div>
    )
  }

  // ============== OTHER TOOLS WORKSPACE ==============
  return (
    <div className="min-h-screen">
      <SuccessModal isOpen={showModal} onClose={closeModal} outputs={result?.outputs || []} message={result?.message || ''} toolIcon={selectedTool.icon} />
      <ValidationModal isOpen={showValidation} onClose={() => setShowValidation(false)} message={validationMessage} />
      <ProcessingModal isOpen={showProcessing} toolName={selectedTool.name} />
      <UploadingModal isOpen={showUploading} />
      <ErrorModal isOpen={showError} onClose={closeError} message={error || ''} />
      
      <header className="bg-white shadow-md border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="btn btn-secondary px-3 py-2">← Back</button>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedTool.color} flex items-center justify-center`}>
                <img src={selectedTool.icon} alt={selectedTool.name} className="w-8 h-8 object-contain brightness-0 invert" />
              </div>
              <div><h1 className="text-xl font-bold text-gray-800">{selectedTool.name}</h1><p className="text-sm text-gray-500">{selectedTool.desc}</p></div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">

        <div className="grid md:grid-cols-3 gap-6">
          {/* File Upload */}
          <div className="md:col-span-2 card p-6">
            <h2 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>📁 Upload your file</h2>
            <div className="dropzone text-center mb-4">
              <input type="file" id="fileInput" accept={selectedTool.acceptedTypes} onChange={handleFileUpload} className="hidden" multiple={selectedTool.id === 'word-merge'} />
              <label htmlFor="fileInput" className="cursor-pointer block py-8">
                <img src={selectedTool.icon} alt={selectedTool.name} className="w-16 h-16 mx-auto mb-3 opacity-80" />
                <p className="font-medium" style={{color: 'var(--text-primary)'}}>{loading ? '⏳ Uploading...' : 'Click to upload'}</p>
                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>Accepts: {selectedTool.acceptedTypes}</p>
              </label>
            </div>
            
            {/* For remove-pages: Show page grid in the preview area */}
            {selectedTool.id === 'remove-pages' && files.length > 0 && allPageThumbnails.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">Click pages to mark for removal:</p>
                  <span className="text-sm font-semibold text-red-600">
                    {pagesToRemove.size > 0 ? `${pagesToRemove.size} pages selected` : 'None selected'}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[450px] overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {allPageThumbnails.map((thumb, idx) => {
                    const pageNum = idx + 1
                    const isMarked = pagesToRemove.has(pageNum)
                    return (
                      <div
                        key={idx}
                        onClick={() => togglePageRemoval(pageNum)}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 shadow-sm ${
                          isMarked 
                            ? 'border-red-500 ring-2 ring-red-300' 
                            : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <img 
                          src={thumb} 
                          alt={`Page ${pageNum}`}
                          className={`w-full aspect-[3/4] object-contain bg-white ${isMarked ? 'opacity-40' : ''}`}
                        />
                        {/* Page number */}
                        <div className={`text-center py-1.5 text-sm font-bold ${isMarked ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          {pageNum}
                        </div>
                        {/* Cross overlay for marked pages */}
                        {isMarked && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                              ✕
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* For organize-pages: Show draggable page grid */}
            {selectedTool.id === 'organize-pages' && files.length > 0 && organizePages.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">Drag pages to reorder:</p>
                  <span className="text-sm font-semibold text-purple-600">
                    {organizePages.length} pages
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-6 max-h-[450px] overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {organizePages.map((page, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleOrganizeDragStart(idx)}
                      onDragOver={(e) => handleOrganizeDragOver(e, idx)}
                      onDragEnd={handleOrganizeDragEnd}
                      onDrop={() => handleOrganizeDrop(idx)}
                      className={`relative cursor-grab active:cursor-grabbing rounded-lg overflow-hidden border-2 transition-all shadow-sm group ${
                        organizeDragIndex === idx ? 'opacity-50 scale-95' : ''
                      } ${
                        organizeDragOver === idx ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-200 hover:border-purple-400 hover:shadow-md'
                      }`}
                    >
                      {/* Page thumbnail or blank indicator */}
                      <div 
                        className={`w-full aspect-[3/4] bg-white flex items-center justify-center ${page.isBlank ? 'bg-gray-100' : ''}`}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      >
                        {page.isBlank ? (
                          <div className="text-gray-400 text-center">
                            <div className="text-2xl">📄</div>
                            <div className="text-xs">Blank</div>
                          </div>
                        ) : (
                          <img 
                            src={page.thumb} 
                            alt={`Page ${page.originalPage}`}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      
                      {/* Page number */}
                      <div className="text-center py-1.5 text-sm font-bold bg-purple-100 text-purple-700">
                        {idx + 1}
                      </div>
                      
                      {/* Action buttons - show on hover */}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); rotateOrganizePage(idx) }}
                          className="w-6 h-6 bg-white rounded-full shadow border flex items-center justify-center text-xs hover:bg-purple-50"
                          title="Rotate"
                        >
                          🔄
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeOrganizePage(idx) }}
                          className="w-6 h-6 bg-white rounded-full shadow border flex items-center justify-center text-xs hover:bg-red-50"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Add blank page button - right edge on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); addBlankPage(idx) }}
                        className="absolute top-1/2 -right-4 transform -translate-y-1/2 w-10 h-10 bg-purple-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xl font-bold z-20 hover:bg-purple-600 hover:scale-110"
                        title="Add blank page after"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* For rotate-individual: Show page grid with rotation controls */}
            {selectedTool.id === 'rotate-individual' && files.length > 0 && allPageThumbnails.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">Click pages to rotate (90° each click):</p>
                  <span className="text-sm font-semibold text-blue-600">
                    {Object.keys(pageRotations).length > 0 ? `${Object.keys(pageRotations).length} pages rotated` : 'Click a page to rotate'}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[450px] overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {allPageThumbnails.map((thumb, idx) => {
                    const pageNum = idx + 1
                    const rotation = pageRotations[pageNum] || 0
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const newRotation = ((rotation + 90) % 360)
                          setPageRotations(prev => {
                            const updated = { ...prev }
                            if (newRotation === 0) {
                              delete updated[pageNum]
                            } else {
                              updated[pageNum] = newRotation
                            }
                            return updated
                          })
                        }}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 shadow-sm ${
                          rotation > 0 
                            ? 'border-blue-500 ring-2 ring-blue-300' 
                            : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <img 
                          src={thumb} 
                          alt={`Page ${pageNum}`}
                          className="w-full aspect-[3/4] object-contain bg-white"
                          style={{ transform: `rotate(${rotation}deg)` }}
                        />
                        {/* Page number with rotation indicator */}
                        <div className={`text-center py-1.5 text-sm font-bold ${rotation > 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                          {pageNum} {rotation > 0 ? `(${rotation}°)` : ''}
                        </div>
                        {/* Rotation overlay */}
                        {rotation > 0 && (
                          <div className="absolute top-1 right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                            🔃
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* For add-blank-page: Show unified preview grid with toggle buttons */}
            {selectedTool.id === 'add-blank-page' && files.length > 0 && allPageThumbnails.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-600">Click + on pages to add blank pages after them:</p>
                  <span className="text-sm font-semibold text-green-600">
                    {blankPagePositions.size === 0 ? 'No blank pages selected' : `${blankPagePositions.size} blank page${blankPagePositions.size > 1 ? 's' : ''} to insert`}
                  </span>
                </div>
                
                {/* Beginning button */}
                <div className="mb-3">
                  <button
                    onClick={() => {
                      const newSet = new Set(blankPagePositions);
                      if (newSet.has(0)) {
                        newSet.delete(0);
                      } else {
                        newSet.add(0);
                      }
                      setBlankPagePositions(newSet);
                    }}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      blankPagePositions.has(0) ? 'bg-green-500 text-white' : 'bg-white border-2 border-dashed border-green-400 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    ➕ Insert blank page at BEGINNING
                  </button>
                </div>
                
                {/* Unified preview grid showing pages + blank pages with toggle buttons */}
                <p className="text-xs text-gray-500 mb-2">Preview (blank pages shown in green, click + to toggle):</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-6 max-h-[500px] overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200">
                  {/* Generate preview array with blank pages */}
                  {(() => {
                    const items: Array<{type: 'original' | 'blank', pageNum?: number, thumb?: string, insertPosition?: number}> = [];
                    
                    // Add beginning blank if selected
                    if (blankPagePositions.has(0)) {
                      items.push({type: 'blank'});
                    }
                    
                    // Add each original page and its following blank page if selected
                    allPageThumbnails.forEach((thumb, idx) => {
                      const pageNum = idx + 1;
                      items.push({type: 'original', pageNum, thumb, insertPosition: pageNum});
                      if (blankPagePositions.has(pageNum)) {
                        items.push({type: 'blank'});
                      }
                    });
                    
                    return items.map((item, idx) => {
                      if (item.type === 'blank') {
                        // Render blank page preview
                        return (
                          <div key={`blank-${idx}`} className="rounded-lg overflow-hidden border-2 border-green-500 bg-green-50">
                            <div className="w-full aspect-[3/4] bg-white flex items-center justify-center">
                              <div className="text-green-500 text-center">
                                <div className="text-2xl">📄</div>
                                <div className="text-xs">Blank</div>
                              </div>
                            </div>
                            <div className="text-center py-1.5 text-sm font-bold bg-green-500 text-white">
                              Blank
                            </div>
                          </div>
                        );
                      } else {
                        // Render original page with toggle button
                        const pageNum = item.pageNum!;
                        const willInsertAfter = blankPagePositions.has(pageNum);
                        
                        return (
                          <div key={`page-${pageNum}`} className="relative group">
                            <div className="rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 hover:shadow-md transition-all">
                              <img 
                                src={item.thumb} 
                                alt={`Page ${pageNum}`}
                                className="w-full aspect-[3/4] object-contain bg-white"
                              />
                              <div className="text-center py-1.5 text-sm font-bold bg-gray-100 text-gray-700">
                                {pageNum}
                              </div>
                            </div>
                            
                            {/* Right edge + button on hover - toggles blank page after this page */}
                            <button
                              onClick={() => {
                                const newSet = new Set(blankPagePositions);
                                if (newSet.has(pageNum)) {
                                  newSet.delete(pageNum);
                                } else {
                                  newSet.add(pageNum);
                                }
                                setBlankPagePositions(newSet);
                              }}
                              className={`absolute top-1/2 -right-4 transform -translate-y-1/2 w-10 h-10 rounded-full shadow-lg transition-all flex items-center justify-center text-xl font-bold z-20 ${
                                willInsertAfter 
                                  ? 'bg-green-500 text-white opacity-100 scale-110' 
                                  : 'bg-green-500 text-white opacity-0 group-hover:opacity-100 hover:bg-green-600 hover:scale-110'
                              }`}
                              title={willInsertAfter ? `Remove blank page after page ${pageNum}` : `Insert blank page after page ${pageNum}`}
                            >
                              {willInsertAfter ? '✓' : '+'}
                            </button>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            )}
            
            {/* For other tools: Show uploaded files normally */}
            {!['remove-pages', 'organize-pages', 'rotate-individual', 'add-blank-page'].includes(selectedTool.id) && files.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="relative group bg-white rounded-xl border-2 border-gray-200 p-3 hover:shadow-lg hover:border-blue-300 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-2 flex items-center justify-center relative">
                      {(file as MergeFile).thumbnail ? (
                        <img 
                          src={(file as MergeFile).thumbnail} 
                          alt={file.filename} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-4xl text-gray-400">📄</div>
                      )}
                    </div>

                    {/* File name */}
                    <p className="text-xs text-gray-700 font-medium truncate text-center" title={file.filename}>
                      {file.filename}
                    </p>
                    {file.page_count && <p className="text-xs text-gray-400 text-center">{file.page_count} pages</p>}

                    {/* Action buttons - show on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => removeFile(i)}
                        className="w-7 h-7 bg-white rounded-full shadow border flex items-center justify-center text-sm hover:bg-red-50"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>⚙️ Options</h2>

            {selectedTool.id === 'split' && (
              <div className="space-y-4">
                <div><label className="block font-medium mb-2" style={{color: 'var(--text-primary)'}}>Split Mode:</label>
                  <div className="flex gap-2">
                    <button onClick={() => setSplitMode('ranges')} className={`flex-1 py-2 px-3 rounded-lg border text-sm ${splitMode === 'ranges' ? 'bg-purple-500 text-white' : 'border-gray-300'}`}>Custom Ranges</button>
                    <button onClick={() => setSplitMode('each')} className={`flex-1 py-2 px-3 rounded-lg border text-sm ${splitMode === 'each' ? 'bg-purple-500 text-white' : 'border-gray-300'}`}>Each Page</button>
                  </div>
                </div>
                {splitMode === 'ranges' && (
                  <div><label className="block font-medium mb-2" style={{color: 'var(--text-primary)'}}>Page Ranges:</label>
                    {pageRanges.map((range, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500 w-14">Range {i + 1}:</span>
                        <input type="number" value={range.start} onChange={(e) => updatePageRange(i, 'start', parseInt(e.target.value) || 1)} className="w-14 px-2 py-1 border rounded text-center text-sm" min={1} />
                        <span>to</span>
                        <input type="number" value={range.end} onChange={(e) => updatePageRange(i, 'end', parseInt(e.target.value) || 1)} className="w-14 px-2 py-1 border rounded text-center text-sm" />
                        {pageRanges.length > 1 && <button onClick={() => removePageRange(i)} className="text-red-500">✕</button>}
                      </div>
                    ))}
                    <button onClick={addPageRange} className="text-purple-600 text-sm hover:underline">+ Add Range</button>
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={mergeRanges} onChange={(e) => setMergeRanges(e.target.checked)} className="w-4 h-4" />
                  <span className="text-gray-700 text-sm">Also create merged PDF</span>
                </label>
              </div>
            )}

            {selectedTool.id === 'rotate' && (
              <div><label className="block text-gray-700 font-medium mb-2">Rotation:</label>
                <div className="flex gap-2">{[90, 180, 270].map(angle => (
                  <button key={angle} onClick={() => setRotateAngle(angle)} className={`flex-1 py-2 rounded-lg border ${rotateAngle === angle ? 'bg-teal-500 text-white' : ''}`}>{angle}°</button>
                ))}</div>
              </div>
            )}

            {selectedTool.id === 'compress' && (
              <div><label className="block text-gray-700 font-medium mb-2">Quality: {compressQuality}%</label>
                <input type="range" min={20} max={100} value={compressQuality} onChange={(e) => setCompressQuality(parseInt(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Smaller</span><span>Better</span></div>
              </div>
            )}

            {(selectedTool.id === 'protect' || selectedTool.id === 'unlock') && (
              <div><label className="block text-gray-700 font-medium mb-2">Password:</label>
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            )}

            {selectedTool.id === 'watermark' && (
              <div><label className="block text-gray-700 font-medium mb-2">Watermark Text:</label>
                <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            )}

            {selectedTool.id === 'word-header' && (<div><label className="block text-gray-700 font-medium mb-2">Header:</label><input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>)}
            {selectedTool.id === 'word-footer' && (<div><label className="block text-gray-700 font-medium mb-2">Footer:</label><input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>)}

            {selectedTool.id === 'extract' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Pages:</label>
                  <input type="text" value={extractPages} onChange={(e) => setExtractPages(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="1, 3, 5" />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">💡 How to use:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Enter page numbers separated by commas</li>
                    <li>• Example: <code className="bg-blue-100 px-1 rounded">1, 3, 5</code> extracts pages 1, 3, and 5</li>
                    <li>• Pages will be extracted in the order you specify</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedTool.id === 'remove-pages' && (
              <div className="space-y-4">
                {/* Selected pages summary */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800">
                    {pagesToRemove.size > 0 
                      ? `🗑️ ${pagesToRemove.size} page(s) selected for removal` 
                      : '👆 Click pages in the preview to select'}
                  </p>
                  {pagesToRemove.size > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Pages: {Array.from(pagesToRemove).sort((a,b) => a-b).join(', ')}
                    </p>
                  )}
                </div>

                {/* Manual input fallback */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1">Or enter manually:</label>
                  <input 
                    type="text" 
                    value={removePages} 
                    onChange={(e) => {
                      setRemovePages(e.target.value)
                      const pages = e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p > 0)
                      setPagesToRemove(new Set(pages))
                    }} 
                    className="w-full px-3 py-2 border rounded-lg text-sm" 
                    placeholder="1, 3, 5" 
                  />
                </div>
              </div>
            )}

            {selectedTool.id === 'organize-pages' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-semibold text-purple-800">
                    🔀 {organizePages.length} pages in current order
                  </p>
                  {organizePages.some(p => p.isBlank) && (
                    <p className="text-xs text-purple-600 mt-1">
                      Includes {organizePages.filter(p => p.isBlank).length} blank page(s)
                    </p>
                  )}
                </div>
                
                {/* Tips */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-800 mb-2">💡 Tips:</p>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• <strong>Drag</strong> pages to reorder</li>
                    <li>• <strong>🔄</strong> Rotate a page (hover to see)</li>
                    <li>• <strong>✕</strong> Remove a page (hover to see)</li>
                    <li>• <strong>+</strong> Add blank page after (hover right edge)</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedTool.id === 'page-numbers' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Position:</label>
                  <select value={pageNumPosition} onChange={(e) => setPageNumPosition(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Format:</label>
                  <input type="text" value={pageNumFormat} onChange={(e) => setPageNumFormat(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Page {n}" />
                  <p className="text-xs text-gray-500 mt-1">Use {'{n}'} for page number</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">🔢 Examples:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• <code className="bg-blue-100 px-1 rounded">Page {'{n}'}</code> → Page 1, Page 2...</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">{'{n}'}</code> → 1, 2, 3...</li>
                    <li>• <code className="bg-blue-100 px-1 rounded">- {'{n}'} -</code> → - 1 -, - 2 -...</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedTool.id === 'crop' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Left (pt):</label>
                    <input type="number" value={cropMargins.left} onChange={(e) => setCropMargins({...cropMargins, left: parseInt(e.target.value) || 0})} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Right (pt):</label>
                    <input type="number" value={cropMargins.right} onChange={(e) => setCropMargins({...cropMargins, right: parseInt(e.target.value) || 0})} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Top (pt):</label>
                    <input type="number" value={cropMargins.top} onChange={(e) => setCropMargins({...cropMargins, top: parseInt(e.target.value) || 0})} className="w-full px-2 py-1 border rounded" />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Bottom (pt):</label>
                    <input type="number" value={cropMargins.bottom} onChange={(e) => setCropMargins({...cropMargins, bottom: parseInt(e.target.value) || 0})} className="w-full px-2 py-1 border rounded" />
                  </div>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-pink-800 mb-1">✂️ How to use:</p>
                  <ul className="text-xs text-pink-700 space-y-1">
                    <li>• Enter margin to remove from each side (in points)</li>
                    <li>• 72 points = 1 inch, 28 points ≈ 1 cm</li>
                    <li>• Higher values = more cropped</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedTool.id === 'edit-pdf' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Search Text:</label>
                  <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Text to find" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Replace With:</label>
                  <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="New text" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={replaceAll} onChange={(e) => setReplaceAll(e.target.checked)} className="w-4 h-4" />
                  <span className="text-gray-700 text-sm">Replace all occurrences</span>
                </label>
              </div>
            )}

            {selectedTool.id === 'redact' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔒</span>
                    <span className="font-semibold text-red-800">Redact Sensitive Content</span>
                  </div>
                  <div className="text-sm text-red-700 space-y-1">
                    <p>• Click and drag to select areas to black out</p>
                    <p>• Permanent redaction - removes underlying text</p>
                    <p>• Review marked areas before applying</p>
                  </div>
                </div>

                {redactions.length > 0 && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-800">
                      📝 {redactions.length} area(s) marked for redaction
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (files.length === 0) {
                      setValidationMessage('Please upload a PDF file first.')
                      setShowValidation(true)
                      return
                    }
                    setShowRedactionView(true)
                  }}
                  className="w-full btn bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-700"
                >
                  🔐 Proceed to Redact PDF →
                </button>
              </div>
            )}

            {selectedTool.id === 'sign' && (
              <div className="space-y-4">
                {!signatureConfig ? (
                  // Step 1: Show Configure Signature Button
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">✍️</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Configure Your Signature</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Set up your signature, initials, and company stamp before signing the PDF
                    </p>
                    <button
                      onClick={() => setShowSignatureSetup(true)}
                      className="btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700"
                    >
                      Configure Signatures
                    </button>
                  </div>
                ) : !showPdfSigningView ? (
                  // Step 2: Show configured signature summary and proceed button
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">✅</span>
                        <span className="font-semibold text-green-800">Signature Configured</span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>• Full Name: {signatureConfig.fullName}</p>
                        <p>• Initials: {signatureConfig.initials}</p>
                        <p>• Type: {signatureConfig.signatureType === 'type' ? 'Typed' : signatureConfig.signatureType === 'draw' ? 'Hand-drawn' : 'Uploaded'}</p>
                        {signatureConfig.companyStamp && <p>• Company Stamp: Configured</p>}
                      </div>
                      <button
                        onClick={() => setShowSignatureSetup(true)}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        📝 Edit Configuration
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (files.length === 0) {
                          setValidationMessage('Please upload a PDF file first.')
                          setShowValidation(true)
                          return
                        }
                        setShowPdfSigningView(true)
                      }}
                      className="w-full btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700"
                    >
                      Proceed to Sign PDF →
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {!['split', 'rotate', 'compress', 'protect', 'unlock', 'watermark', 'extract', 'remove-pages', 'organize-pages', 'page-numbers', 'crop', 'word-header', 'word-footer', 'edit-pdf', 'redact', 'sign'].includes(selectedTool.id) && (
              <p className="text-gray-500 text-sm">No options needed. Just upload and process!</p>
            )}

            {files.length > 0 && selectedTool.id !== 'sign' && selectedTool.id !== 'redact' && (
              <div className="mt-6">
                <button onClick={executeTool} disabled={loading} className={`w-full btn btn-primary py-3 text-lg ${loading ? 'opacity-50' : ''} flex items-center justify-center gap-2`}>
                  {loading ? '⏳ Processing...' : (
                    <>
                      <img src={selectedTool.icon} alt="" className="w-6 h-6 object-contain brightness-0 invert" />
                      {selectedTool.name}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Signature Setup Modal */}
        {selectedTool.id === 'sign' && (
          <SignatureSetupModal
            isOpen={showSignatureSetup}
            onClose={() => setShowSignatureSetup(false)}
            onSave={(config) => {
              setSignatureConfig(config)
              setShowSignatureSetup(false)
            }}
          />
        )}

        {/* PDF Signing View - Full Screen Overlay */}
        {selectedTool.id === 'sign' && showPdfSigningView && signatureConfig && files.length > 0 && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">Sign PDF - Place Your Fields</h2>
                <p className="text-xs md:text-sm text-gray-500">Drag fields from the right panel onto the PDF pages</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowPdfSigningView(false)
                    setPlacedFields([])
                  }}
                  className="px-3 md:px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPdfSigningView(false)
                    executeTool()
                  }}
                  disabled={placedFields.length === 0}
                  className={`px-4 md:px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-sm md:text-base whitespace-nowrap ${
                    placedFields.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-600 hover:to-purple-700'
                  }`}
                >
                  ✍️ Apply ({placedFields.length})
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-2 md:p-4 lg:p-6">
              <div className="h-full flex flex-col lg:flex-row gap-2 md:gap-4 overflow-auto">
                <div className="flex-1 min-w-0">
                  <PdfPageViewer
                    fileId={files[0].file_id}
                    onFieldsChange={setPlacedFields}
                    signatureConfig={signatureConfig}
                  />
                </div>
                <div className="lg:flex-shrink-0">
                  <FieldsPanel 
                    signatureConfig={signatureConfig}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Redaction View - Full Screen Interface */}
        {showRedactionView && files.length > 0 && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-3 md:px-6 md:py-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setShowRedactionView(false)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium"
                >
                  ← Back
                </button>
                <h2 className="text-lg md:text-xl font-bold">🔐 Redact PDF - Mark Sensitive Areas</h2>
              </div>
              <button
                onClick={async () => {
                  if (redactions.length === 0) {
                    setValidationMessage('Please mark at least one area for redaction.')
                    setShowValidation(true)
                    return
                  }
                  
                  setShowUploading(true)
                  
                  try {
                    const response = await fetch(`${API_URL}/api/pdf/redact`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        file_id: files[0].file_id,
                        redaction_areas: redactions,
                        original_filename: files[0].filename
                      })
                    })
                    
                    if (!response.ok) throw new Error('Redaction failed')
                    
                    const data = await response.json()
                    console.log('Redaction result:', data)
                    
                    setRedactionDownloadUrl(data.download_url)
                    setRedactionFileName(data.output_filename)
                    setShowRedactionView(false)
                    setRedactions([])
                    // Don't show validation, we'll show custom download modal below
                  } catch (error) {
                    console.error('Redaction error:', error)
                    setShowValidation(true)
                    setValidationMessage('❌ Failed to redact PDF. Please try again.')
                    setRedactionDownloadUrl(null)
                  } finally {
                    setShowUploading(false)
                  }
                }}
                className="px-4 py-2 md:px-6 md:py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors"
              >
                🔒 Apply Redactions ({redactions.length})
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden p-2 md:p-4 lg:p-6">
              <div className="h-full flex flex-col lg:flex-row gap-2 md:gap-4 overflow-auto">
                <div className="flex-1 min-w-0">
                  <RedactionViewer
                    fileId={files[0].file_id}
                    onAreasChange={(areas) => {
                      setRedactions(areas.map(a => ({
                        page: a.page,
                        x: a.x,
                        y: a.y,
                        width: a.width,
                        height: a.height
                      })))
                    }}
                  />
                </div>
                <div className="lg:flex-shrink-0">
                  <RedactionPanel
                    areas={redactions.map((r, idx) => ({
                      id: `redact-${idx}`,
                      ...r
                    }))}
                    onDeleteArea={(id) => {
                      const idx = parseInt(id.split('-')[1])
                      setRedactions(redactions.filter((_, i) => i !== idx))
                    }}
                    onClearAll={() => setRedactions([])}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Redaction Success Modal - Consistent Design */}
        {redactionDownloadUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Green Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">Success!</h3>
                <p className="text-green-100 mt-1">Redacted PDF</p>
              </div>

              {/* White Body */}
              <div className="p-8">
                <p className="text-gray-700 font-semibold mb-4">1 file ready:</p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-3xl">📄</div>
                    <p className="text-sm text-gray-700 font-medium truncate">{redactionFileName}</p>
                  </div>
                  <a
                    href={redactionDownloadUrl}
                    download={redactionFileName}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2 flex-shrink-0"
                  >
                    📥 Download
                  </a>
                </div>

                <button
                  onClick={() => {
                    setRedactionDownloadUrl(null)
                    setRedactionFileName('')
                    setFiles([]) // Clear uploaded files
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '' // Reset file input
                    }
                  }}
                  className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Process Another File
                </button>
              </div>
            </div>
          </div>
        )}


      </main>

      <style>{`
        @keyframes popup { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-popup { animation: popup 0.3s ease-out; }
      `}</style>
    </div>
  )
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>)
}
