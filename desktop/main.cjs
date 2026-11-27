const { app, BrowserWindow, dialog, protocol } = require('electron');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { iniciarServidor } = require('./servidor.cjs');

const ENDERECO = 'gestao://local';

protocol.registerSchemesAsPrivileged([{
    scheme: 'gestao',
    privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

function enderecoDoAplicativo(endereco) {
    const url = new URL(endereco);
    return url.protocol === 'gestao:' && url.host === 'local';
}

function encaminharRequisicao(requisicao, servidor) {
    if (!enderecoDoAplicativo(requisicao.url)) return new Response(null, { status: 404 });

    const url = new URL(requisicao.url);
    const destino = new URL(servidor.origem);
    destino.pathname = url.pathname;
    destino.search = url.search;
    const headers = new Headers(requisicao.headers);
    headers.set('X-Gestao-Desktop', servidor.chave);
    return fetch(destino, {
        method: requisicao.method,
        headers,
        body: requisicao.body,
        duplex: requisicao.body ? 'half' : undefined,
        redirect: 'error'
    });
}

function iniciarAplicativo() {
    const pastaDados = app.commandLine.getSwitchValue('user-data-dir')
        || path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'GestaoServicosDados');
    mkdirSync(pastaDados, { recursive: true });
    app.setPath('userData', pastaDados);
    app.setAppUserModelId('com.squirrel.GestaoServicos.GestaoServicos');

    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
    }

    let janela;
    let servidor;
    let encerrando = false;

    app.on('second-instance', () => {
        if (janela?.isMinimized()) janela.restore();
        janela?.focus();
    });

    app.on('window-all-closed', () => app.quit());
    app.on('before-quit', (evento) => {
        if (encerrando || !servidor) return;
        evento.preventDefault();
        encerrando = true;
        servidor.encerrar().catch((erro) => console.error(erro.message)).finally(() => app.quit());
    });

    app.whenReady().then(async () => {
        const binarios = app.isPackaged
            ? path.join(process.resourcesPath, 'native')
            : path.join(__dirname, 'node_modules', '@embedded-postgres', 'windows-x64', 'native');
        servidor = await iniciarServidor(pastaDados, binarios);
        janela = new BrowserWindow({
            width: 1280,
            height: 800,
            minWidth: 760,
            minHeight: 520,
            show: false,
            autoHideMenuBar: true,
            webPreferences: {
                partition: 'persist:gestao-servicos-local',
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            }
        });

        const { webContents } = janela;
        webContents.session.protocol.handle('gestao', (requisicao) => encaminharRequisicao(requisicao, servidor));
        webContents.session.setPermissionRequestHandler((_conteudo, _permissao, responder) => responder(false));
        webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        webContents.on('will-navigate', (evento, url) => {
            if (!enderecoDoAplicativo(url)) evento.preventDefault();
        });

        janela.once('ready-to-show', () => janela.show());
        janela.on('closed', () => { janela = null; });
        await janela.loadURL(ENDERECO);
    }).catch((erro) => {
        dialog.showErrorBox('Não foi possível iniciar o Gestão de Serviços', erro.message);
        app.quit();
    });
}

if (require('electron-squirrel-startup')) {
    app.quit();
} else {
    try {
        iniciarAplicativo();
    } catch (erro) {
        dialog.showErrorBox('Não foi possível iniciar o Gestão de Serviços', erro.message);
        app.quit();
    }
}
