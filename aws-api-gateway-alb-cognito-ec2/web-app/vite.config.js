import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev proxy — order matters, longer prefixes first.
 *   /api/v1/ride           → ride-service       :4003
 *   /api/v1/chat           → chat-service       :4001
 *   /socket.io             → chat-service       :4001  (WS; chat owns Socket.IO root path)
 *   /api/v1/{products,...} → ecommerce-service  :4002
 *   /api/v1                → rbac-service       :4000  (fallback)
 *
 * Production routing happens at the nginx edge (infra/nginx-config/backend)
 * or the AWS ALB ingress — same shape, different implementation.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/ride':       { target: 'http://localhost:4003', changeOrigin: true },
      '/api/v1/chat':       { target: 'http://localhost:4001', changeOrigin: true },
      '/socket.io':         { target: 'http://localhost:4001', changeOrigin: true, ws: true },
      '/api/v1/products':   { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/categories': { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/variants':   { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/cart':       { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/orders':     { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/addresses':  { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/uploads':    { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/payments':   { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1/reports':    { target: 'http://localhost:4002', changeOrigin: true },
      '/api/v1':            { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
