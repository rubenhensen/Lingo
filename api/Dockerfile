FROM php:8.1-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Increase PHP memory limit for loading word database
RUN echo "memory_limit = 512M" > /usr/local/etc/php/conf.d/memory-limit.ini

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Create config.php if it doesn't exist
RUN if [ ! -f config.php ]; then cp config.example.php config.php; fi

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Configure Apache to use /var/www/html as document root
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Set entrypoint and command
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
