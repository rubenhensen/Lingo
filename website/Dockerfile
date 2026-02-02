FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy website files to nginx html directory
COPY . /usr/share/nginx/html/

# Create config.js if it doesn't exist
RUN if [ ! -f /usr/share/nginx/html/js/config.js ]; then \
    echo 'const API_URL = "/api/";' > /usr/share/nginx/html/js/config.js; \
    fi

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
