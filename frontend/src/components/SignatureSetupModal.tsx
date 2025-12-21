import React, { useState, useRef, useEffect } from 'react'

interface SignatureConfig {
  fullName: string
  initials: string
  signatureType: 'type' | 'draw' | 'upload'
  signatureImage: string // base64
  initialsImage: string // base64
  companyStamp: string // base64
  color: string
}

interface SignatureSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: SignatureConfig) => void
}

const SIGNATURE_FONTS = [
  { name: 'Elegant', style: 'font-family: "Brush Script MT", cursive; font-size: 32px;' },
  { name: 'Formal', style: 'font-family: "Times New Roman", serif; font-style: italic; font-size: 28px;' },
  { name: 'Modern', style: 'font-family: "Arial", sans-serif; font-weight: 300; font-size: 28px; letter-spacing: 2px;' },
  { name: 'Cursive', style: 'font-family: "Lucida Handwriting", cursive; font-size: 26px;' },
  { name: 'Bold', style: 'font-family: "Impact", sans-serif; font-size: 30px;' },
]

export default function SignatureSetupModal({ isOpen, onClose, onSave }: SignatureSetupModalProps) {
  const [fullName, setFullName] = useState('')
  const [initials, setInitials] = useState('')
  const [signatureType, setSignatureType] = useState<'type' | 'draw' | 'upload'>('type')
  const [selectedFont, setSelectedFont] = useState(0)
  const [color, setColor] = useState('#000000')
  const [signatureImage, setSignatureImage] = useState('')
  const [initialsImage, setInitialsImage] = useState('')
  const [companyStamp, setCompanyStamp] = useState('')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const initialsCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingInitials, setDrawingInitials] = useState(false)

  // Auto-generate initials from full name
  useEffect(() => {
    if (fullName) {
      const parts = fullName.trim().split(' ')
      const generated = parts.map(p => p[0]).join('').toUpperCase().slice(0, 3)
      setInitials(generated)
    }
  }, [fullName])

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, isInitialsCanvas: boolean) => {
    const canvas = isInitialsCanvas ? initialsCanvasRef.current : canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Calculate position with proper scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    
    if (isInitialsCanvas) setDrawingInitials(true)
    else setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, isInitialsCanvas: boolean) => {
    const canvas = isInitialsCanvas ? initialsCanvasRef.current : canvasRef.current
    const drawing = isInitialsCanvas ? drawingInitials : isDrawing
    
    if (!canvas || !drawing) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Calculate position with proper scaling
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (isInitialsCanvas: boolean) => {
    if (isInitialsCanvas) {
      setDrawingInitials(false)
      if (initialsCanvasRef.current) {
        setInitialsImage(initialsCanvasRef.current.toDataURL())
      }
    } else {
      setIsDrawing(false)
      if (canvasRef.current) {
        setSignatureImage(canvasRef.current.toDataURL())
      }
    }
  }

  const clearCanvas = (isInitialsCanvas: boolean) => {
    const canvas = isInitialsCanvas ? initialsCanvasRef.current : canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (isInitialsCanvas) setInitialsImage('')
    else setSignatureImage('')
  }

  // Generate typed signature
  const generateTypedSignature = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    const font = SIGNATURE_FONTS[selectedFont]
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Apply font
    const fontMatch = font.style.match(/font-family:\s*([^;]+)/)
    const sizeMatch = font.style.match(/font-size:\s*(\d+)px/)
    const weightMatch = font.style.match(/font-weight:\s*([^;]+)/)
    const styleMatch = font.style.match(/font-style:\s*([^;]+)/)
    
    let fontString = ''
    if (styleMatch) fontString += styleMatch[1] + ' '
    if (weightMatch) fontString += weightMatch[1] + ' '
    if (sizeMatch) fontString += sizeMatch[1] + 'px '
    if (fontMatch) fontString += fontMatch[1]
    
    ctx.font = fontString || '32px Arial'
    ctx.fillText(fullName, 200, 50)
    
    return canvas.toDataURL()
  }

  // Generate typed initials
  const generateTypedInitials = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    const font = SIGNATURE_FONTS[selectedFont]
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const fontMatch = font.style.match(/font-family:\s*([^;]+)/)
    const sizeMatch = font.style.match(/font-size:\s*(\d+)px/)
    ctx.font = `${sizeMatch ? parseInt(sizeMatch[1]) - 4 : 28}px ${fontMatch ? fontMatch[1].replace(/"/g, '') : 'Arial'}`
    ctx.fillText(initials, 50, 50)
    
    return canvas.toDataURL()
  }

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'signature' | 'stamp') => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (type === 'signature') setSignatureImage(result)
      else setCompanyStamp(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    let finalSignature = signatureImage
    let finalInitials = initialsImage
    
    if (signatureType === 'type') {
      finalSignature = generateTypedSignature()
      finalInitials = generateTypedInitials()
    }
    
    if (!finalSignature) {
      alert('Please create or upload a signature')
      return
    }
    
    onSave({
      fullName,
      initials,
      signatureType,
      signatureImage: finalSignature,
      initialsImage: finalInitials || finalSignature,
      companyStamp,
      color
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col animate-popup">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white rounded-t-2xl flex-shrink-0">
          <h2 className="text-2xl font-bold">✍️ Configure Your Signature</h2>
          <p className="text-indigo-100 mt-1">Set up your signature, initials, and company stamp</p>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Full Name & Initials */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Initials</label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                placeholder="JD"
              />
            </div>
          </div>

          {/* Signature Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Signature Type</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSignatureType('type')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  signatureType === 'type'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="text-3xl mb-2">✍️</div>
                <div className="font-semibold">Type</div>
                <div className="text-xs text-gray-500">Choose a font</div>
              </button>
              <button
                onClick={() => setSignatureType('draw')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  signatureType === 'draw'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="text-3xl mb-2">✏️</div>
                <div className="font-semibold">Draw</div>
                <div className="text-xs text-gray-500">Freehand</div>
              </button>
              <button
                onClick={() => setSignatureType('upload')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  signatureType === 'upload'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="text-3xl mb-2">📤</div>
                <div className="font-semibold">Upload</div>
                <div className="text-xs text-gray-500">Image file</div>
              </button>
            </div>
          </div>

          {/* Type Signature */}
          {signatureType === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Font Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNATURE_FONTS.map((font, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFont(idx)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedFont === idx
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-xs text-gray-500 mb-1">{font.name}</div>
                      <div style={{ 
                        fontFamily: font.name === 'Elegant' ? '"Brush Script MT", cursive' :
                                   font.name === 'Formal' ? '"Times New Roman", serif' :
                                   font.name === 'Modern' ? '"Arial", sans-serif' :
                                   font.name === 'Cursive' ? '"Lucida Handwriting", cursive' :
                                   '"Impact", sans-serif',
                        fontSize: font.name === 'Elegant' ? '32px' :
                                font.name === 'Formal' ? '28px' :
                                font.name === 'Modern' ? '28px' :
                                font.name === 'Cursive' ? '26px' : '30px',
                        fontStyle: font.name === 'Formal' ? 'italic' : 'normal',
                        fontWeight: font.name === 'Modern' ? '300' : font.name === 'Bold' ? 'bold' : 'normal',
                        letterSpacing: font.name === 'Modern' ? '2px' : 'normal',
                        color
                      }}>
                        {fullName || 'Your Name'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Signature Color</label>
                <div className="flex gap-2">
                  {['#000000', '#0000FF', '#1E40AF', '#7C3AED'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-lg border-2 ${color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Draw Signature */}
          {signatureType === 'draw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Draw Your Signature</label>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={(e) => startDrawing(e, false)}
                  onMouseMove={(e) => draw(e, false)}
                  onMouseUp={() => stopDrawing(false)}
                  onMouseLeave={() => stopDrawing(false)}
                  className="w-full border-2 border-gray-300 rounded-xl cursor-crosshair bg-white"
                />
                <button
                  onClick={() => clearCanvas(false)}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  Clear
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Draw Your Initials</label>
                <canvas
                  ref={initialsCanvasRef}
                  width={150}
                  height={150}
                  onMouseDown={(e) => startDrawing(e, true)}
                  onMouseMove={(e) => draw(e, true)}
                  onMouseUp={() => stopDrawing(true)}
                  onMouseLeave={() => stopDrawing(true)}
                  className="border-2 border-gray-300 rounded-xl cursor-crosshair bg-white"
                />
                <button
                  onClick={() => clearCanvas(true)}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Upload Signature */}
          {signatureType === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Signature Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'signature')}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl"
                />
                {signatureImage && (
                  <img src={signatureImage} alt="Signature" className="mt-3 max-h-32 border rounded-lg" />
                )}
              </div>
            </div>
          )}

          {/* Company Stamp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Company Stamp (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'stamp')}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl"
            />
            {companyStamp && (
              <img src={companyStamp} alt="Company Stamp" className="mt-3 max-h-24 border rounded-lg" />
            )}
          </div>

          {/* Preview */}
          {fullName && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-3">Preview</div>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                {signatureType === 'type' ? (
                  <div>
                    <div style={{ 
                      fontFamily: SIGNATURE_FONTS[selectedFont].name === 'Elegant' ? '"Brush Script MT", cursive' :
                                 SIGNATURE_FONTS[selectedFont].name === 'Formal' ? '"Times New Roman", serif' :
                                 SIGNATURE_FONTS[selectedFont].name === 'Modern' ? '"Arial", sans-serif' :
                                 SIGNATURE_FONTS[selectedFont].name === 'Cursive' ? '"Lucida Handwriting", cursive' :
                                 '"Impact", sans-serif',
                      fontSize: SIGNATURE_FONTS[selectedFont].name === 'Elegant' ? '32px' :
                              SIGNATURE_FONTS[selectedFont].name === 'Formal' ? '28px' :
                              SIGNATURE_FONTS[selectedFont].name === 'Modern' ? '28px' :
                              SIGNATURE_FONTS[selectedFont].name === 'Cursive' ? '26px' : '30px',
                      fontStyle: SIGNATURE_FONTS[selectedFont].name === 'Formal' ? 'italic' : 'normal',
                      fontWeight: SIGNATURE_FONTS[selectedFont].name === 'Modern' ? '300' : SIGNATURE_FONTS[selectedFont].name === 'Bold' ? 'bold' : 'normal',
                      letterSpacing: SIGNATURE_FONTS[selectedFont].name === 'Modern' ? '2px' : 'normal',
                      color
                    }}>
                      {fullName}
                    </div>
                    <div className="text-sm text-gray-500 mt-2">Initials: <span style={{ color }}>{initials}</span></div>
                  </div>
                ) : signatureImage ? (
                  <img src={signatureImage} alt="Signature Preview" className="max-h-32" />
                ) : (
                  <div className="text-gray-400 italic">Signature will appear here</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
