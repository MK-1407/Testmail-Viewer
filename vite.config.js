import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Shared proxy config for /tm-api -> testmail.app's real API. Wrapped in a
// function (not a shared object literal) because Vite/http-proxy attach
// internal state to the config object, and reusing one instance between the
// dev and preview servers can misbehave.
function proxyOptions() {
  return {
    target: 'https://api.testmail.app',
    changeOrigin: true,
    secure: true,
    timeout: 15000,
    proxyTimeout: 15000,
    rewrite: (path) => path.replace(/^\/tm-api/, '/api'),
    configure: (proxy) => {
      // Without this handler, a failed upstream connection (DNS, TLS,
      // timeout, connection refused, etc.) crashes the proxy request and
      // Vite responds with a bare, non-JSON "500" page. Catching it here
      // lets us log the real cause to the terminal AND return JSON so the
      // app's error banner can show something useful instead of just "500".
      proxy.on('error', (err, req, res) => {
        console.error('[tm-api proxy] failed to reach api.testmail.app:', err.message);
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        if (res && res.end) {
          res.end(
            JSON.stringify({
              result: 'fail',
              message: `Could not reach api.testmail.app (${err.code || err.message}). Check your network/firewall/VPN, then retry.`,
            })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6868,
    strictPort: true,
    proxy: {
      // Browser calls hit /tm-api/... which Vite forwards server-side to
      // testmail.app's real API. This sidesteps any CORS restrictions and
      // keeps the flow identical when you `vite preview` a production build.
      '/tm-api': proxyOptions(),
    },
  },
  preview: {
    port: 6868,
    strictPort: true,
    proxy: {
      '/tm-api': proxyOptions(),
    },
  },
});
