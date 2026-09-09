import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp(config);
const server = app.listen(config.port, config.host, () => {
  console.error(JSON.stringify({
    event: 'banking_mcp_started',
    host: config.host,
    port: config.port,
    endpoint: `http://${config.host}:${config.port}/mcp`,
    bankingApiBaseUrl: config.bankingApiBaseUrl
  }));
});

function shutdown(signal: string) {
  console.error(JSON.stringify({ event: 'banking_mcp_stopping', signal }));
  server.close(error => {
    if (error) {
      console.error(JSON.stringify({ event: 'banking_mcp_shutdown_error', message: error.message }));
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
