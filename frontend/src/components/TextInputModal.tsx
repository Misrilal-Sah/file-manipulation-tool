import React, { useState } from 'react'

interface TextInputModalProps {
  isOpen: boolean
  initialValue?: string
  onSave: (text: string) => void
  onCancel: () => void
}

export default function TextInputModal({ isOpen, initialValue = '', onSave, onCancel }: TextInputModalProps) {
  const [text, setText] = useState(initialValue)

  if (!isOpen) return null

  const handleSave = () => {
    if (text.trim()) {
      onSave(text)
      setText('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Enter Custom Text</h3>
        
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your text here..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
          autoFocus
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-white ${
              text.trim()
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
