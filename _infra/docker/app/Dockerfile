FROM composer:2 AS composer

FROM node:24-bookworm AS node

FROM php:8.4-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        curl \
        default-mysql-client \
        git \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
        procps \
        redis-tools \
        unzip \
        zip \
    && docker-php-ext-install \
        bcmath \
        mbstring \
        pcntl \
        pdo_mysql \
        sockets \
        xml \
        zip \
    && pecl install pcov redis \
    && docker-php-ext-enable pcov redis \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/bin/composer
COPY --from=node /usr/local/ /usr/local/

WORKDIR /workspace/code
