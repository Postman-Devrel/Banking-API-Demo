import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig(); const { app } = createApp(config);
app.listen(config.port, config.host, () => console.log(JSON.stringify({ event: 'support_api_started', host: config.host, port: config.port })));
