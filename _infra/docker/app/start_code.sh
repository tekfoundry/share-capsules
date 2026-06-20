#!/usr/bin/env bash

set -euo pipefail

mode="${1:-app}"

cd /workspace/code

if [[ ! -f vendor/autoload.php ]]; then
    composer install --no-interaction
fi

case "$mode" in
    app)
        package_lock_hash="$(sha256sum package-lock.json | awk '{print $1}')"
        package_lock_stamp="node_modules/.sharecapsules-package-lock.sha256"

        if [[ ! -f "$package_lock_stamp" ]] || [[ "$(cat "$package_lock_stamp")" != "$package_lock_hash" ]]; then
            npm ci
            printf '%s\n' "$package_lock_hash" >"$package_lock_stamp"
        fi

        php_upload_max_filesize="${PHP_UPLOAD_MAX_FILESIZE:-32M}"
        php_post_max_size="${PHP_POST_MAX_SIZE:-32M}"
        php_memory_limit="${PHP_MEMORY_LIMIT:-512M}"

        exec npx concurrently \
            -c "#93c5fd,#fb7185,#fdba74" \
            "php -d upload_max_filesize=${php_upload_max_filesize} -d post_max_size=${php_post_max_size} -d memory_limit=${php_memory_limit} artisan serve --host=0.0.0.0 --port=3000" \
            "php artisan pail --timeout=0" \
            "npm run dev -- --host=0.0.0.0 --port=5173" \
            --names=server,logs,vite \
            --kill-others
        ;;
    workers)
        exec php artisan queue:work --tries=3 --timeout=90
        ;;
    scheduler)
        exec php artisan schedule:work
        ;;
    *)
        echo "Unknown start mode: $mode" >&2
        exit 1
        ;;
esac
