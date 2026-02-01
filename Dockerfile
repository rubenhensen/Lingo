# syntax=docker/dockerfile:1
FROM php:8.3-cli

# Install system deps + composer
RUN apt-get update \
    && apt-get install -y git unzip lsof \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy source
COPY . .

# Prepare API config
RUN if [ ! -f api/config.php ]; then \
        cp api/config.example.php api/config.php; \
    fi

# Install PHP dependencies
WORKDIR /app/api
RUN composer install --no-dev --optimize-autoloader

# Back to root
WORKDIR /app

# Expose both ports
EXPOSE 8000 8001

# Start both servers (API + Website)
CMD bash -c "\
    php -S 0.0.0.0:8000 -t api api/index.php & \
    php -S 0.0.0.0:8001 -t website \
"
