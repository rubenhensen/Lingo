#!/bin/bash
set -e

# Install composer dependencies if vendor folder doesn't exist (dev mode with volume mount)
if [ ! -d "vendor" ]; then
    echo "Installing Composer dependencies..."
    composer install
fi

# Create config.php if it doesn't exist
if [ ! -f config.php ]; then
    cp config.example.php config.php
fi

# Execute the CMD from Dockerfile
exec "$@"
