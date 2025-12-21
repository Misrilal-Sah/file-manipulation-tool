# PDFease - Render Deployment Guide

## Quick Deploy

1. **Fork/Push to GitHub** ✅ (Already done)
   - Repository: https://github.com/Misrilal-Sah/file-manipulation-tool

2. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub (recommended)

3. **Deploy from Dashboard**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select `file-manipulation-tool`
   - Render will automatically detect `render.yaml`

4. **Set Environment Variables**
   
   **For Backend Service (`pdfease-backend`):**
   ```
   FRONTEND_URL = https://pdfease-frontend.onrender.com
   ```
   
   **For Frontend Service (`pdfease-frontend`):**
   ```
   VITE_API_URL = https://pdfease-backend.onrender.com
   ```
   
   ⚠️ **Note:** Update these URLs after services are created!

5. **Deploy**
   - Click "Apply"
   - Wait 5-10 minutes for initial deployment
   - Both services will be live!

## Service Details

### Backend Service
- **Name:** pdfease-backend
- **Type:** Web Service
- **Plan:** Free
- **URL:** https://pdfease-backend.onrender.com
- **Auto-deploys:** On push to main branch

### Frontend Service
- **Name:** pdfease-frontend  
- **Type:** Static Site
- **Plan:** Free
- **URL:** https://pdfease-frontend.onrender.com
- **Auto-deploys:** On push to main branch

## After Deployment

1. **Update Backend CORS**
   - Backend automatically allows frontend URL
   - Configured in `backend/app/main.py`

2. **Test Your App**
   - Visit https://pdfease-frontend.onrender.com
   - All PDF tools should work!

3. **Custom Domain (Optional)**
   - Go to Settings → Custom Domain
   - Add your domain (e.g., pdfease.com)

## Free Tier Limitations

- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month of runtime (enough for most use cases)
- Upgrade to paid plan ($7/month) for always-on services

## Troubleshooting

**Backend won't start?**
- Check logs in Render dashboard
- Verify `requirements.txt` is complete

**Frontend shows API errors?**
- Confirm `VITE_API_URL` environment variable is set
- Check backend service is running

**CORS errors?**
- Update `FRONTEND_URL` in backend environment variables
- Redeploy backend after changing CORS settings

## Manual Deployment Commands

If you prefer manual deployment:

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT

# Frontend
cd frontend
npm install
npm run build
# Deploy dist/ folder
```

## Environment Variables Reference

| Service | Variable | Value |
|---------|----------|-------|
| Backend | `PYTHON_VERSION` | 3.11.0 |
| Backend | `FRONTEND_URL` | Your frontend URL |
| Frontend | `VITE_API_URL` | Your backend URL |

---

**Your app is now live on Render.com! 🎉**
