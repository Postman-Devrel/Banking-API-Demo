const { spawn } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
  spawn(npm, ['run', 'dev:api'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev:mcp'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev:fraud'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev:support'], { stdio: 'inherit' }),
  spawn(npm, ['run', 'dev:support-mcp'], { stdio: 'inherit' })
];

let stopping = false;
function stop(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

for (const child of children) {
  child.on('exit', code => {
    if (!stopping && code !== 0) {
      process.exitCode = code || 1;
      stop();
    }
  });
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));
