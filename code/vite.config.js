import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        origin: process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5174',
        cors: {
            origin: process.env.APP_URL ?? 'http://localhost:3003',
        },
        hmr: {
            host: process.env.VITE_HMR_HOST ?? 'localhost',
            clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? 5174),
        },
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
