# Candlestick Chart - Static Export

This application has been configured for static export and can be deployed to any static hosting service.

## 🚀 Static Export Features

- ✅ Fully static HTML/CSS/JS files
- ✅ No server required
- ✅ localStorage persistence works in browser
- ✅ All client-side functionality preserved
- ✅ Optimized for production

## 📦 Build Commands

```bash
# Development
npm run dev

# Build for static export
npm run export

# The static files will be generated in the `out/` directory
```

## 🌐 Deployment Options

### 1. GitHub Pages
```bash
# Install gh-pages if not already installed
npm install --save-dev gh-pages

# Add to package.json scripts
"deploy": "npm run export && gh-pages -d out"

# Deploy
npm run deploy
```

### 2. Netlify
- Connect your repository to Netlify
- Set build command: `npm run export`
- Set publish directory: `out`
- Deploy automatically on push

### 3. Vercel
- Connect your repository to Vercel
- Vercel will automatically detect Next.js and handle static export
- Deploy automatically on push

### 4. Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Build and deploy
npm run export
firebase deploy
```

### 5. AWS S3 + CloudFront
- Upload contents of `out/` directory to S3 bucket
- Configure CloudFront distribution
- Set index document to `index.html`
- Configure error pages

### 6. Apache/Nginx Server
- Copy contents of `out/` directory to web root
- Ensure server serves `index.html` for directory requests
- Configure proper MIME types

## 📁 File Structure After Export

```
out/
├── index.html              # Main application
├── 404.html              # Error page
├── _next/                # Next.js static assets
│   └── static/
│       ├── chunks/        # JavaScript chunks
│       └── media/         # Fonts and media
└── _not-found/           # 404 page assets
```

## 🔧 Configuration

The static export is configured in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',           // Enable static export
  images: {
    unoptimized: true         // Disable image optimization
  },
  trailingSlash: true,       // Ensure trailing slashes
  distDir: 'out'           // Output directory
};
```

## ⚠️ Important Notes

1. **localStorage**: All data persistence uses browser localStorage and works perfectly in static build
2. **No Server**: The application runs entirely in the browser
3. **SEO**: Static pages are SEO-friendly
4. **Performance**: Fast loading with optimized chunks
5. **CORS**: No CORS issues since everything is served from same domain

## 🧪 Testing Locally

You can test the static build locally using any static server:

```bash
# Using Python
python -m http.server 8000 --directory out

# Using Node.js serve
npx serve out

# Using PHP built-in server
php -S localhost:8000 -t out
```

Then visit `http://localhost:8000` to test the static build.

## 📱 Browser Compatibility

The static build works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid and Flexbox
- localStorage API
- Fetch API

## 🔄 Data Persistence

The localStorage functionality works exactly the same in the static build:
- All trading data is saved locally
- Replay state is preserved
- Transactions and positions persist across sessions
- Settings are remembered

Simply reload the page to restore your last session!