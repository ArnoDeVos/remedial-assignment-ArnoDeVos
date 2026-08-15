/**
 * Container health probe.
 */

import http from 'node:http';

const port = process.env.API_PORT || 4000;

const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
  res.resume();
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.setTimeout(3000, () => {
  req.destroy();
  process.exit(1);
});

req.on('error', () => {
  process.exit(1);
});
