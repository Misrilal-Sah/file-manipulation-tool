import React from 'react'

interface FieldsPanelProps {
  signatureConfig: {
    fullName: string
    signatureImage: string
    initialsImage: string
    companyStamp: string
  }
}

const AVAILABLE_FIELDS = [
  { 
    type: 'signature', 
    icon: '📝', 
    label: 'Signature', 
    description: 'Your signature',
    required: true 
  },
  { 
    type: 'initials', 
    icon: '✍️', 
    label: 'Initials', 
    description: 'Your initials',
    required: true 
  },
  { 
    type: 'date', 
    icon: '📅', 
    label: 'Date', 
    description: 'Current date',
    required: true 
  },
  { 
    type: 'name', 
    icon: '👤', 
    label: 'Name',  
    description: 'Full name text',
    required: false 
  },
  { 
    type: 'text', 
    icon: '✏️', 
    label: 'Text', 
    description: 'Custom text',
    required: false 
  },
  { 
    type: 'stamp', 
    icon: '🏢', 
    label: 'Company Stamp', 
    description: 'Company seal',
    required: false 
  },
]

export default function FieldsPanel({ signatureConfig }: FieldsPanelProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fieldType: string) => {
    e.dataTransfer.setData('fieldType', fieldType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const getFieldPreview = (fieldType: string) => {
    switch (fieldType) {
      case 'signature':
        return signatureConfig.signatureImage ? (
          <img src={signatureConfig.signatureImage} alt="Signature" className="max-h-12 max-w-full" />
        ) : (
          <div className="text-xs text-gray-400 italic">Not configured</div>
        )
      case 'initials':
        return signatureConfig.initialsImage ? (
          <img src={signatureConfig.initialsImage} alt="Initials" className="max-h-10 max-w-full" />
        ) : (
          <div className="text-xs text-gray-400 italic">Not configured</div>
        )
      case 'stamp':
        return signatureConfig.companyStamp ? (
          <img src={signatureConfig.companyStamp} alt="Stamp" className="max-h-12 max-w-full" />
        ) : (
          <div className="text-xs text-gray-400 italic">Optional</div>
        )
      case 'date':
        return <div className="text-sm">{new Date().toLocaleDateString('en-US')}</div>
      case 'name':
        return <div className="text-sm">{signatureConfig.fullName || 'Your Name'}</div>
      case 'text':
        return <div className="text-sm text-gray-500">Custom Text</div>
      default:
        return null
    }
  }

  const isFieldAvailable = (fieldType: string) => {
    if (fieldType === 'signature') return !!signatureConfig.signatureImage
    if (fieldType === 'initials') return !!signatureConfig.initialsImage
    if (fieldType === 'stamp') return !!signatureConfig.companyStamp
    return true
  }

  return (
    <div className="w-72 bg-gray-50 rounded-xl p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">📋 Available Fields</h3>
        <p className="text-xs text-gray-500 mt-1">Drag and drop onto the PDF pages</p>
      </div>

      <div className="space-y-3">
        {/* Required Fields */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Required Fields</div>
          {AVAILABLE_FIELDS.filter(f => f.required).map(field => {
            const available = isFieldAvailable(field.type)
            return (
              <div
                key={field.type}
                draggable={available}
                onDragStart={(e) => handleDragStart(e, field.type)}
                className={`p-3 mb-2 rounded-lg border-2 transition-all ${
                  available
                    ? 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-grab active:cursor-grabbing'
                    : 'border-gray-100 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{field.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{field.label}</div>
                    <div className="text-xs text-gray-500">{field.description}</div>
                  </div>
                </div>
                <div className="pl-7 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  {getFieldPreview(field.type)}
                </div>
                {!available && (
                  <div className="mt-2 text-xs text-red-500 font-medium">⚠️ Configure in setup</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Optional Fields */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase mb-2 mt-4">Optional Fields</div>
          {AVAILABLE_FIELDS.filter(f => !f.required).map(field => {
            const available = isFieldAvailable(field.type)
            return (
              <div
                key={field.type}
                draggable={available}
                onDragStart={(e) => handleDragStart(e, field.type)}
                className={`p-3 mb-2 rounded-lg border-2 transition-all ${
                  available
                    ? 'border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-grab active:cursor-grabbing'
                    : 'border-gray-100 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{field.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{field.label}</div>
                    <div className="text-xs text-gray-500">{field.description}</div>
                  </div>
                </div>
                {available && (
                  <div className="pl-7 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                    {getFieldPreview(field.type)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <div className="text-xs font-semibold text-indigo-800 mb-2">💡 Tips</div>
        <ul className="text-xs text-indigo-700 space-y-1">
          <li>• Drag fields onto any page</li>
          <li>• Click a field to select it</li>
          <li>• Press Delete to remove selected field</li>
          <li>• Use zoom controls for precision</li>
        </ul>
      </div>
    </div>
  )
}
