import { spawn } from 'node:child_process';
const procs = [];
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function launch(name, script) {
  const child = spawn(command, ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' });
  procs.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`${name} ended with exit code ${code}`);
    if (!closing) shutdown();
  });
}
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  procs.forEach(p => { try { p.kill('SIGTERM'); } catch {} });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
launch('api', 'dev:api');
launch('web', 'dev:web');
