import React, { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface RedactionArea {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface RedactionViewerProps {
  fileId: string
  onAreasChange: (areas: RedactionArea[]) => void
}

export default function RedactionViewer({ fileId, onAreasChange }: RedactionViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedPage, setSelectedPage] = useState(1)
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([])
  const [markedAreas, setMarkedAreas] = useState<RedactionArea[]>([])
  const [zoom, setZoom] = useState(1.25)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [currentSelection, setCurrentSelection] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true)
      setError(null)
      try {
        const pdfUrl = `http://127.0.0.1:8000/uploads/${fileId}.pdf`
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
      
      // Draw marked areas
      drawMarkedAreas(context, viewport.width, viewport.height)
      
      // Draw current selection
      if (currentSelection) {
        drawSelection(context, currentSelection)
      }
    }
    
    renderPage()
  }, [pdfDoc, selectedPage, zoom, markedAreas, selectedAreaId, currentSelection])

  // Draw marked redaction areas
  const drawMarkedAreas = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const pageAreas = markedAreas.filter(a => a.page === selectedPage)
    
    pageAreas.forEach(area => {
      // Draw red semi-transparent overlay
      ctx.fillStyle = selectedAreaId === area.id ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)'
      ctx.fillRect(area.x, area.y, area.width, area.height)
      
      // Draw border
      ctx.strokeStyle = selectedAreaId === area.id ? '#DC2626' : '#EF4444'
      ctx.lineWidth = selectedAreaId === area.id ? 3 : 2
      ctx.strokeRect(area.x, area.y, area.width, area.height)
      
      // Draw label
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 12px Arial'
      const label = 'REDACTED'
      const textWidth = ctx.measureText(label).width
      ctx.fillText(label, area.x + (area.width - textWidth) / 2, area.y + area.height / 2)
      
      // Draw delete button for selected area
      if (selectedAreaId === area.id) {
        const delSize = 24
        const delX = area.x + area.width - delSize
        const delY = area.y - delSize
        
        ctx.fillStyle = '#DC2626'
        ctx.fillRect(delX, delY, delSize, delSize)
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 18px Arial'
        ctx.fillText('×', delX + 6, delY + 18)
      }
    })
  }

  // Draw current selection being made
  const drawSelection = (ctx: CanvasRenderingContext2D, selection: { x: number, y: number, width: number, height: number }) => {
    ctx.strokeStyle = '#DC2626'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 2
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
    
    ctx.fillStyle = 'rgba(220, 38, 38, 0.1)'
    ctx.fillRect(selection.x, selection.y, selection.width, selection.height)
    
    ctx.setLineDash([])
  }

  // Handle mouse down - start selection
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const pageAreas = markedAreas.filter(a => a.page === selectedPage)
    
    // Check if clicking delete button
    for (const area of pageAreas) {
      const delSize = 24
      const delX = area.x + area.width - delSize
      const delY = area.y - delSize
      
      if (x >= delX && x <= delX + delSize &&
          y >= delY && y <= delY + delSize) {
        // Delete area
        const updated = markedAreas.filter(a => a.id !== area.id)
        setMarkedAreas(updated)
        onAreasChange(updated)
        setSelectedAreaId(null)
        return
      }
    }
    
    // Check if clicking existing area
    const clickedArea = pageAreas.find(area =>
      x >= area.x && x <= area.x + area.width &&
      y >= area.y && y <= area.y + area.height
    )
    
    if (clickedArea) {
      setSelectedAreaId(clickedArea.id)
    } else {
      // Start new selection
      setIsSelecting(true)
      setSelectionStart({ x, y })
      setCurrentSelection({ x, y, width: 0, height: 0 })
      setSelectedAreaId(null)
    }
  }

  // Handle mouse move - update selection
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isSelecting) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const width = x - selectionStart.x
    const height = y - selectionStart.y
    
    setCurrentSelection({
      x: width < 0 ? x : selectionStart.x,
      y: height < 0 ? y : selectionStart.y,
      width: Math.abs(width),
      height: Math.abs(height)
    })
  }

  // Handle mouse up - finish selection
  const handleCanvasMouseUp = () => {
    if (!isSelecting || !currentSelection) return
    
    // Only add if selection has reasonable size
    if (currentSelection.width > 10 && currentSelection.height > 10) {
      const newArea: RedactionArea = {
        id: `redact-${Date.now()}`,
        page: selectedPage,
        x: currentSelection.x,
        y: currentSelection.y,
        width: currentSelection.width,
        height: currentSelection.height
      }
      
      const updated = [...markedAreas, newArea]
      setMarkedAreas(updated)
      onAreasChange(updated)
    }
    
    setIsSelecting(false)
    setCurrentSelection(null)
  }

  const getAreaCountForPage = (page: number) => {
    return markedAreas.filter(a => a.page === page).length
  }

  return (
    <div className="flex h-full gap-4">
      {loading && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200">
            <div className="text-6xl mb-4 animate-pulse">📄</div>
            <div className="text-2xl font-bold text-gray-800 mb-2">Loading PDF...</div>
            <div className="text-base text-gray-600">Please wait, rendering pages</div>
            <div className="mt-4 flex gap-2 justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '300ms' }}></div>
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
                const areaCount = getAreaCountForPage(page)
                return (
                  <button
                    key={page}
                    onClick={() => setSelectedPage(page)}
                    className={`w-full p-2 rounded-lg border-2 transition-all ${
                      selectedPage === page
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <img src={thumb} alt={`Page ${page}`} className="w-full rounded border" />
                    <div className="text-xs text-center mt-1 font-medium">Page {page}</div>
                    {areaCount > 0 && (
                      <div className="text-xs text-center mt-1 bg-red-500 text-white rounded-full px-2 py-0.5">
                        {areaCount} area{areaCount > 1 ? 's' : ''}
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
                <span className="ml-3 text-xs text-red-600">
                  💡 Click and drag to select areas to redact
                </span>
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
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="cursor-crosshair"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
