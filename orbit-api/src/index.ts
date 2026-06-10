import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { ensureUploadDirs } from './lib/upload';
import { initSocket } from './lib/socket';

ensureUploadDirs();

const app = createApp();
const server = createServer(app);
initSocket(server);

server.listen(env.API_PORT, () => {
  console.log(`Orbit API running on http://localhost:${env.API_PORT}`);
});
