import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const { app } = createApp(config);
const server = app.listen(config.port, config.host, () => {
  console.log(JSON.stringify({ event: 'fraud_api_started', host: config.host, port: config.port }));
});

function shutdown(signal: string) {
  console.log(JSON.stringify({ event: 'fraud_api_stopping', signal }));
  server.close(error => { if (error) process.exitCode = 1; });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
