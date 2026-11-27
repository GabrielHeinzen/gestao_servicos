const { spawnSync } = require('node:child_process');
const { cpSync, mkdtempSync, realpathSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projeto = path.resolve(__dirname, '..');
const destino = path.join(projeto, 'out');
const forge = path.join(projeto, 'node_modules', '@electron-forge', 'cli', 'dist', 'electron-forge.js');
let temporario;

try {
    // O instalador Squirrel usa um editor de recursos que exige um caminho ASCII.
    const pastaTemp = realpathSync(os.tmpdir());
    if (!/^[\x20-\x7E]+$/.test(pastaTemp)) {
        throw new Error('Configure uma pasta temporária do Windows sem acentos para gerar o instalador.');
    }
    const pastaBuild = realpathSync(mkdtempSync(path.join(pastaTemp, 'gestao-forge-')));
    if (path.dirname(pastaBuild) !== pastaTemp) throw new Error('Caminho temporário de build inválido.');
    temporario = pastaBuild;
    const build = spawnSync(process.execPath, [forge, 'make', '--platform', 'win32', '--arch', 'x64'], {
        cwd: projeto,
        env: { ...process.env, GESTAO_FORGE_OUT_DIR: temporario },
        stdio: 'inherit'
    });
    if (build.error) throw build.error;
    if (build.status !== 0) throw new Error('O Electron Forge não concluiu o instalador.');

    cpSync(temporario, destino, { recursive: true });
    console.log(`Instalador disponível em ${path.join(destino, 'make')}.`);
} catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
} finally {
    if (temporario) rmSync(temporario, { recursive: true, force: true });
}
