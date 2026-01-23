const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting debug process...');
const child = spawn('node', ['dist/src/main'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

const logStream = fs.createWriteStream('debug_log.txt');

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
  logStream.end();
});

setTimeout(() => {
  console.log('Timeout reached, killing process...');
  child.kill();
}, 15000);
