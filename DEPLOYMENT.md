# Deployment Guide

## Overview

The Lingo application consists of two Docker containers:
1. **API Container** - PHP/Apache REST API
2. **Frontend Container** - Nginx static website

## Local Development

```bash
# Clone the repository
git clone https://github.com/rubenhensen/lingo.git
cd lingo

# Start both containers
docker-compose up -d

# Access the application
open http://localhost:8001
```

The API will be available at `http://localhost:8000` and the frontend at `http://localhost:8001`.

## Production Deployment on lingo.hensen.io

### Option 1: Using Reverse Proxy (Recommended)

Configure your web server (nginx/Apache) to proxy both services:

**Nginx Configuration Example:**
```nginx
server {
    listen 443 ssl;
    server_name lingo.hensen.io;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # CORS headers
        add_header Access-Control-Allow-Origin "https://lingo.hensen.io" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

**Then update the frontend config:**
```bash
# In website/js/config.js
const API_URL = "/api/";
```

**Update API CORS settings:**
```php
// In api/index.php, update allowed origins:
$allowedOrigins = [
    'https://lingo.hensen.io',
    'http://localhost:8001'  // for local dev
];
```

### Option 2: Using Subdomains

**Setup:**
- Frontend: `https://lingo.hensen.io` → Port 8001
- API: `https://api.lingo.hensen.io` → Port 8000

**Frontend config.js:**
```javascript
const API_URL = "https://api.lingo.hensen.io/";
```

**API CORS settings:**
```php
$allowedOrigins = [
    'https://lingo.hensen.io',
    'http://localhost:8001'
];
```

### Docker Deployment Commands

```bash
# Pull latest images
docker pull ghcr.io/rubenhensen/lingo-api:latest
docker pull ghcr.io/rubenhensen/lingo-frontend:latest

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Or run manually
docker run -d -p 8000:80 --name lingo-api ghcr.io/rubenhensen/lingo-api:latest
docker run -d -p 8001:80 --name lingo-frontend ghcr.io/rubenhensen/lingo-frontend:latest
```

## Environment Variables

### API Container
- `PHP_DISPLAY_ERRORS` - Set to `0` for production

### Frontend Container
You can override the API URL by mounting a custom config.js:
```bash
docker run -d -p 8001:80 \
  -v ./custom-config.js:/usr/share/nginx/html/js/config.js \
  ghcr.io/rubenhensen/lingo-frontend:latest
```

## Security Considerations

1. **HTTPS Required**: For production, always use HTTPS for both frontend and API
2. **CORS Configuration**: Update `api/index.php` to only allow your production domain
3. **Session Security**: The API uses `SameSite=None; Secure` cookies, which require HTTPS
4. **API Endpoint**: Never expose the API directly to the internet without HTTPS

## Troubleshooting

### CORS Errors
- Ensure your domain is in the `$allowedOrigins` array in `api/index.php`
- Check that you're using HTTPS (required for cross-site cookies)
- Verify `API_URL` in `website/js/config.js` points to the correct endpoint

### Session Issues
- Sessions require HTTPS when using `SameSite=None`
- Check browser console for cookie warnings
- Ensure cookies are being sent with credentials: `withCredentials: true`

### Container Not Starting
```bash
# Check logs
docker logs lingo-api
docker logs lingo-frontend

# Verify containers are running
docker ps
```

## Updates

To update to the latest version:

```bash
# Pull new images
docker-compose -f docker-compose.prod.yml pull

# Restart containers
docker-compose -f docker-compose.prod.yml up -d
```

## GitHub Actions

Containers are automatically built and published when code is pushed to the `master` branch:

- **API**: Changes to `api/` trigger `.github/workflows/build-api.yml`
- **Frontend**: Changes to `website/` trigger `.github/workflows/build-frontend.yml`

Images are published to:
- `ghcr.io/rubenhensen/lingo-api:latest`
- `ghcr.io/rubenhensen/lingo-frontend:latest`
