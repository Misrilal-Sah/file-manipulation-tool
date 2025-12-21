import React from 'react'

interface RedactionArea {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  text?: string
}

interface RedactionPanelProps {
  areas: RedactionArea[]
  onDeleteArea: (id: string) => void
  onClearAll: () => void
}

export default function RedactionPanel({ areas, onDeleteArea, onClearAll }: RedactionPanelProps) {
  return (
    <div className="w-80 bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          📋 Marked for Redaction
        </h3>
        {areas.length > 0 && (
          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {areas.length}
          </span>
        )}
      </div>

      {areas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <div className="text-sm text-gray-500">
            Select and search text or pages to start redacting sensitive content.
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500 mb-4">
            Click and drag on the PDF to mark areas for permanent redaction.
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {areas.map((area) => (
              <div
                key={area.id}
                className="p-3 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">
                      Page {area.page}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Position: ({Math.round(area.x)}, {Math.round(area.y)})
                    </div>
                    <div className="text-xs text-gray-600">
                      Size: {Math.round(area.width)} × {Math.round(area.height)}px
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteArea(area.id)}
                    className="flex-shrink-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center text-lg font-bold"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onClearAll}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  )
}
