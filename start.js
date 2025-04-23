// Simple entry point that uses require() instead of import
const { exec } = require('child_process');

console.log('Starting application in development mode...');

// Use child_process to execute the application
const child = exec('NODE_ENV=development USE_DATABASE=false node --loader tsx server/index.ts');

// Log output
child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('exit', (code) => {
  console.log(`Child process exited with code ${code}`);
});