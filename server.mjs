import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createStore } from './src/store.mjs';
import { createHttpServer } from './src/http.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3100);
const store = createStore(process.env.DB_PATH || join(root, 'data', 'zhongtian.db'));
const server = createHttpServer({ store, staticDir: join(root, 'public') });

server.listen(port, host, () => {
  console.log(`《伟大的战争 2：中天争霸》运行于 http://${host}:${port}`);
});

function shutdown() {
  server.close(() => { store.close(); process.exit(0); });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
