const fs = require('node:fs');
const path = require('node:path');

const backend = path.resolve(__dirname, '..', '..', 'backend');
const destino = path.resolve(__dirname, '..', 'runtime', 'backend');

fs.mkdirSync(destino, { recursive: true });
for (const entrada of ['app.js', 'config', 'controllers', 'migrations', 'models', 'routes', 'services']) {
    fs.cpSync(path.join(backend, entrada), path.join(destino, entrada), { recursive: true });
}
