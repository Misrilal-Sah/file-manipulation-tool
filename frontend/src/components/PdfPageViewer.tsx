import React, { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import TextInputModal from './TextInputModal'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface PlacedField {
  id: string
  type: 'signature' | 'initials' | 'date' | 'name' | 'text' | 'stamp'
  page: number
  x: number
  y: number
  width: number
  height: number
  value?: string
  imageData?: string
}

interface PdfPageViewerProps {
  fileId: string
  onFieldsChange: (fields: PlacedField[]) => void
  signatureConfig: {
    fullName: string
    initials: string
    signatureImage: string
    initialsImage: string
    companyStamp: string
  }
}

export default function PdfPageViewer({ fileId, onFieldsChange, signatureConfig }: PdfPageViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedPage, setSelectedPage] = useState(1)
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([])
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([])
  const [zoom, setZoom] = useState(0.75)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Text input modal state
  const [showTextModal, setShowTextModal] = useState(false)
  const [editingField, setEditingField] = useState<PlacedField | null>(null)
  const [pendingTextCallback, setPendingTextCallback] = useState<((text: string) => void) | null>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true)
      setError(null)
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const pdfUrl = `${API_URL}/uploads/${fileId}.pdf`
        console.log('Loading PDF from:', pdfUrl)
        const loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        
        // Generate thumbnails
        const thumbs: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.2 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = viewport.width
          canvas.height = viewport.height
          
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise
            thumbs.push(canvas.toDataURL())
          }
        }
        setPageThumbnails(thumbs)
        setLoading(false)
        
        // Force page 1 to render by setting to 0 first, then 1
        // This ensures the useEffect for rendering triggers
        setSelectedPage(0)
        setTimeout(() => {
          setSelectedPage(1)
        }, 50)
      } catch (error) {
        console.error('Error loading PDF:', error)
        setError(`Failed to load PDF: ${error}`)
        setLoading(false)
      }
    }
    
    loadPdf()
  }, [fileId])

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return
      
      const page = await pdfDoc.getPage(selectedPage)
      const viewport = page.getViewport({ scale: zoom * 1.5 })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return
      
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      await page.render({ canvasContext: context, viewport }).promise
      
      // Draw placed fields on top
      drawPlacedFields(context, viewport.width, viewport.height)
    }
    
    renderPage()
  }, [pdfDoc, selectedPage, zoom, placedFields, selectedFieldId])

  // Draw placed fields
  const drawPlacedFields = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const pageFields = placedFields.filter(f => f.page === selectedPage)
    
    pageFields.forEach(field => {
      // Draw border
      ctx.strokeStyle = selectedFieldId === field.id ? '#4F46E5' : '#9CA3AF'
      ctx.lineWidth = selectedFieldId === field.id ? 3 : 2
      ctx.setLineDash(selectedFieldId === field.id ? [] : [5, 5])
      ctx.strokeRect(field.x, field.y, field.width, field.height)
      ctx.setLineDash([])
      
      // Draw preview content
      if (field.imageData) {
        const img = new Image()
        img.src = field.imageData
        img.onload = () => {
          ctx.drawImage(img, field.x, field.y, field.width, field.height)
        }
      } else if (field.value) {
        ctx.fillStyle = '#000000'
        ctx.font = '14px Arial'
        ctx.fillText(field.value, field.x + 5, field.y + field.height / 2)
      }
      
      // Draw label
      ctx.fillStyle = selectedFieldId === field.id ? '#4F46E5' : '#6B7280'
      ctx.font = 'bold 10px Arial'
      ctx.fillText(field.type.toUpperCase(), field.x, field.y - 5)
      
      // Draw resize handles for selected field
      if (selectedFieldId === field.id) {
        const handleSize = 8
        ctx.fillStyle = '#4F46E5'
        // Top-left
        ctx.fillRect(field.x - handleSize/2, field.y - handleSize/2, handleSize, handleSize)
        // Top-right
        ctx.fillRect(field.x + field.width - handleSize/2, field.y - handleSize/2, handleSize, handleSize)
        // Bottom-left
        ctx.fillRect(field.x - handleSize/2, field.y + field.height - handleSize/2, handleSize, handleSize)
        // Bottom-right
        ctx.fillRect(field.x + field.width - handleSize/2, field.y + field.height - handleSize/2, handleSize, handleSize)
        
        // Draw delete button (top-right corner)
        const delSize = 20
        ctx.fillStyle = '#EF4444'
        ctx.fillRect(field.x + field.width - delSize, field.y - delSize, delSize, delSize)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 14px Arial'
        ctx.fillText('×', field.x + field.width - delSize + 4, field.y - delSize + 15)
      }
    })
  }

  // State for dragging and resizing
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Handle canvas mouse down
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const pageFields = placedFields.filter(f => f.page === selectedPage)
    
    // FIRST: Check if clicking any delete button (they're outside field bounds)
    const delSize = 20
    for (const field of pageFields) {
      const delX = field.x + field.width - delSize
      const delY = field.y - delSize
      
      if (x >= delX && x <= delX + delSize &&
          y >= delY && y <= delY + delSize) {
        // Delete this field
        const updatedFields = placedFields.filter(f => f.id !== field.id)
        setPlacedFields(updatedFields)
        onFieldsChange(updatedFields)
        setSelectedFieldId(null)
        return
      }
    }
    
    // SECOND: Check if clicking inside any field
    const clickedField = pageFields.find(field =>
      x >= field.x && x <= field.x + field.width &&
      y >= field.y && y <= field.y + field.height
    )
    
    if (clickedField) {
      setSelectedFieldId(clickedField.id)
      
      // Check if clicking resize handle
      const handleSize = 8
      const handles = [
        { name: 'tl', x: clickedField.x, y: clickedField.y },
        { name: 'tr', x: clickedField.x + clickedField.width, y: clickedField.y },
        { name: 'bl', x: clickedField.x, y: clickedField.y + clickedField.height },
        { name: 'br', x: clickedField.x + clickedField.width, y: clickedField.y + clickedField.height }
      ]
      
      const clickedHandle = handles.find(h =>
        x >= h.x - handleSize && x <= h.x + handleSize &&
        y >= h.y - handleSize && y <= h.y + handleSize
      )
      
      if (clickedHandle) {
        setIsResizing(true)
        setResizeHandle(clickedHandle.name)
        setDragStart({ x, y })
      } else {
        setIsDragging(true)
        setDragStart({ x: x - clickedField.x, y: y - clickedField.y })
      }
    } else {
      setSelectedFieldId(null)
    }
  }

  // Handle double-click to edit text fields
  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const pageFields = placedFields.filter(f => f.page === selectedPage)
    const clickedField = pageFields.find(field =>
      x >= field.x && x <= field.x + field.width &&
      y >= field.y && y <= field.y + field.height
    )
    
    // Only allow editing text fields
    if (clickedField && clickedField.type === 'text') {
      setEditingField(clickedField)
      setShowTextModal(true)
      setPendingTextCallback(() => (text: string) => {
        const updatedFields = placedFields.map(f =>
          f.id === clickedField.id ? { ...f, value: text } : f
        )
        setPlacedFields(updatedFields)
        onFieldsChange(updatedFields)
        setShowTextModal(false)
        setPendingTextCallback(null)
        setEditingField(null)
      })
    }
  }

  // Handle canvas mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedFieldId) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (isDragging) {
      // Move field
      const updatedFields = placedFields.map(f =>
        f.id === selectedFieldId
          ? { ...f, x: x - dragStart.x, y: y - dragStart.y }
          : f
      )
      setPlacedFields(updatedFields)
      onFieldsChange(updatedFields)
    } else if (isResizing && resizeHandle) {
      // Resize field
      const field = placedFields.find(f => f.id === selectedFieldId)
      if (!field) return
      
      const updatedFields = placedFields.map(f => {
        if (f.id !== selectedFieldId) return f
        
        let newX = f.x
        let newY = f.y
        let newWidth = f.width
        let newHeight = f.height
        
        if (resizeHandle.includes('t')) {
          newY = y
          newHeight = f.height + (f.y - y)
        }
        if (resizeHandle.includes('b')) {
          newHeight = y - f.y
        }
        if (resizeHandle.includes('l')) {
          newX = x
          newWidth = f.width + (f.x - x)
        }
        if (resizeHandle.includes('r')) {
          newWidth = x - f.x
        }
        
        // Minimum size
        if (newWidth < 30) newWidth = 30
        if (newHeight < 20) newHeight = 20
        
        return { ...f, x: newX, y: newY, width: newWidth, height: newHeight }
      })
      
      setPlacedFields(updatedFields)
      onFieldsChange(updatedFields)
    }
  }

  // Handle canvas mouse up
  const handleCanvasMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }

  // Handle canvas drop
  const handleCanvasDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const fieldType = e.dataTransfer.getData('fieldType') as PlacedField['type']
    if (!fieldType) return
    
    const newField: PlacedField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      page: selectedPage,
      x,
      y,
      width: fieldType === 'signature' ? 200 : fieldType === 'initials' ? 80 : fieldType === 'stamp' ? 100 : 150,
      height: fieldType === 'signature' ? 60 : fieldType === 'initials' ? 80 : fieldType === 'stamp' ? 100 : 30,
    }
    
    // Set value or image data based on type
    if (fieldType === 'signature') newField.imageData = signatureConfig.signatureImage
    else if (fieldType === 'initials') newField.imageData = signatureConfig.initialsImage
    else if (fieldType === 'stamp') newField.imageData = signatureConfig.companyStamp
    else if (fieldType === 'name') newField.value = signatureConfig.fullName
    else if (fieldType === 'date') newField.value = new Date().toLocaleDateString('en-US')
    else if (fieldType === 'text') {
      // Show custom modal for text input
      setShowTextModal(true)
      setPendingTextCallback(() => (text: string) => {
        newField.value = text
        const updatedFields = [...placedFields, newField]
        setPlacedFields(updatedFields)
        onFieldsChange(updatedFields)
        setShowTextModal(false)
        setPendingTextCallback(null)
      })
      return // Don't add field yet, wait for modal input
    }
    
    const updatedFields = [...placedFields, newField]
    setPlacedFields(updatedFields)
    onFieldsChange(updatedFields)
  }

  const deleteSelectedField = () => {
    if (!selectedFieldId) return
    const updatedFields = placedFields.filter(f => f.id !== selectedFieldId)
    setPlacedFields(updatedFields)
    onFieldsChange(updatedFields)
    setSelectedFieldId(null)
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedFieldId) {
        deleteSelectedField()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFieldId])

  const getFieldCountForPage = (page: number) => {
    return placedFields.filter(f => f.page === page).length
  }

  return (
    <div className="flex h-full gap-4">
      {loading && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl border-2 border-indigo-200">
            <div className="text-6xl mb-4 animate-pulse">📄</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">Loading PDF...</div>
            <div className="text-base text-gray-600">Please wait, rendering pages</div>
            <div className="mt-4 flex gap-2 justify-center">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 rounded-xl border-2 border-red-200">
            <div className="text-4xl mb-4">❌</div>
            <div className="text-lg font-semibold text-red-700">Error Loading PDF</div>
            <div className="text-sm text-red-600 mt-2">{error}</div>
            <div className="text-xs text-gray-600 mt-4">Check console for details</div>
          </div>
        </div>
      )}
      
      {!loading && !error && (
        <>
          {/* Left Panel - Page Thumbnails */}
          <div className="w-32 md:w-48 bg-gray-50 rounded-xl p-2 md:p-3 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="text-xs md:text-sm font-semibold text-gray-700 mb-3">Pages ({totalPages})</div>
            <div className="space-y-2">
          {pageThumbnails.map((thumb, idx) => {
            const page = idx + 1
            const fieldCount = getFieldCountForPage(page)
            return (
              <button
                key={page}
                onClick={() => setSelectedPage(page)}
                className={`w-full p-2 rounded-lg border-2 transition-all ${
                  selectedPage === page
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <img src={thumb} alt={`Page ${page}`} className="w-full rounded border" />
                <div className="text-xs text-center mt-1 font-medium">Page {page}</div>
                {fieldCount > 0 && (
                  <div className="text-xs text-center mt-1 bg-indigo-500 text-white rounded-full px-2 py-0.5">
                    {fieldCount} field{fieldCount > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Center - PDF Canvas */}
      <div ref={containerRef} className="flex-1 bg-white rounded-xl p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold text-gray-700">
            Page {selectedPage} of {totalPages}
            {selectedFieldId && (
              <span className="ml-3 text-xs text-indigo-600">
                💡 Drag to move • Resize corners • Click × to delete{placedFields.find(f => f.id === selectedFieldId)?.type === 'text' ? ' • Double-click to edit' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
            >
              −
            </button>
            <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
            >
              +
            </button>
          </div>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg inline-block">
          <canvas
            ref={canvasRef}
            onDrop={handleCanvasDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleCanvasDoubleClick}
            className="cursor-pointer"
          />
        </div>
      </div>
        </>
      )}
      
      {/* Text Input Modal */}
      <TextInputModal
        isOpen={showTextModal}
        initialValue={editingField?.value || 'Custom Text'}
        onSave={(text) => {
          if (pendingTextCallback) {
            pendingTextCallback(text)
          }
        }}
        onCancel={() => {
          setShowTextModal(false)
          setPendingTextCallback(null)
          setEditingField(null)
        }}
      />
    </div>
  )
}
