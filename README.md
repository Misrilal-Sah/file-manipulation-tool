# PDFease - Free Online PDF Toolkit

PDFease is a modern, user-friendly web application that provides a comprehensive suite of PDF manipulation tools. All processing is done client-side in your browser, ensuring complete privacy and security.

## ✨ Features

### 📋 Organize PDF
- **Merge PDF** - Combine multiple PDF files into one
- **Split PDF** - Separate PDF pages into individual files
- **Extract Pages** - Extract specific pages from a PDF
- **Remove Pages** - Delete unwanted pages from PDFs
- **Organize PDF** - Rearrange, rotate, and manage PDF pages

### ⚡ Optimize PDF
- **Compress PDF** - Reduce PDF file size
- **Repair PDF** - Fix corrupted PDF files
- **OCR PDF** - Convert scanned documents to searchable PDFs

### 🔄 Convert to PDF
- **JPG to PDF** - Convert images to PDF
- **WORD to PDF** - Convert Word documents to PDF
- **POWERPOINT to PDF** - Convert presentations to PDF
- **EXCEL to PDF** - Convert spreadsheets to PDF
- **HTML to PDF** - Convert web pages to PDF

### ✏️ Edit PDF
- **Rotate PDF** - Rotate PDF pages
- **Rotate Pages Individually** - Rotate specific pages
- **Add Blank Page** - Insert blank pages
- **Add Page Numbers** - Number your PDF pages
- **Add Watermark** - Add text or image watermarks
- **Crop PDF** - Trim PDF pages
- **Edit PDF** - Search and replace text (Coming Soon)

### � PDF Security
- **Unlock PDF** - Remove password protection
- **Protect PDF** - Add password protection
- **Sign PDF** - Add digital signatures 
- **Redact PDF** - Black out sensitive information 
- **Compare PDF** - Compare two PDFs (Coming Soon)

### 🔄 Convert from PDF
- **PDF to JPG** - Convert PDF to images
- **PDF to WORD** - Convert PDF to Word
- **PDF to POWERPOINT** - Convert PDF to PowerPoint
- **PDF to EXCEL** - Convert PDF to Excel (Coming Soon)

## 🚀 Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **pdf-lib** for PDF manipulation
- **React Router** for navigation
- Glassmorphism UI with gradient backgrounds

### Backend
- **FastAPI** (Python)
- **PyPDF2** for PDF processing
- **PDF2Image** for PDF rendering
- **Pillow** for image processing
- CORS-enabled for secure cross-origin requests

## 🎨 Design Features

- **Modern Gradient UI** - Beautiful blue-cyan gradient branding
- **Glassmorphism Effects** - Semi-transparent cards with backdrop blur
- **Dark/Light Mode** - Toggle between themes (Light mode default)
- **Responsive Design** - Works on all devices
- **Smooth Animations** - Polished user experience
- **Accessibility** - Clear text and proper contrast

## � Deployment

### Deploy to Render (Recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

1. Click the button above or go to [Render Dashboard](https://dashboard.render.com)
2. Connect your GitHub repository
3. Render will automatically detect `render.yaml`
4. Set environment variables (see [DEPLOY.md](DEPLOY.md))
5. Deploy! Both frontend and backend will be live in minutes

**📖 Full deployment guide:** [DEPLOY.md](DEPLOY.md)

**Free Tier:** Both services can run on Render's free tier

## �🛠️ Installation

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## 📁 Project Structure

```
File Manipulation/
├── frontend/
│   ├── public/
│   │   └── logo.png
│   ├── src/
│   │   ├── main.tsx         # Main React component
│   │   ├── index.css        # Global styles
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       └── pdf.py   # PDF manipulation endpoints
│   │   ├── services/
│   │   │   └── pdf_service.py
│   │   ├── schemas/
│   │   │   └── pdf.py
│   │   └── main.py          # FastAPI application
│   └── requirements.txt
└── README.md
```

## 🌟 Key Features

### Privacy First
All PDF processing happens in your browser or on your local server. Your files never leave your device.

### No Limits
- Unlimited file conversions
- No file size restrictions (browser-dependent)
- No watermarks on output files
- Completely free to use

### High Quality
- Preserves original document quality
- Maintains formatting and layout
- Supports all major file formats

## 🎯 Usage

1. Select a tool from the category cards on the homepage
2. Upload your PDF or image file(s)
3. Configure options if needed (quality, rotation, etc.)
4. Click "Process" to perform the operation
5. Download your processed file(s)


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


##  Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

