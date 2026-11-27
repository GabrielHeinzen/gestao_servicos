const path = require('node:path');

module.exports = {
    outDir: process.env.GESTAO_FORGE_OUT_DIR,
    packagerConfig: {
        asar: true,
        executableName: 'GestaoServicos',
        extraResource: [
            path.join(__dirname, 'node_modules', '@embedded-postgres', 'windows-x64', 'native'),
            path.join(__dirname, 'node_modules', '@embedded-postgres', 'windows-x64', 'LICENSE.md')
        ]
    },
    makers: [{
        name: '@electron-forge/maker-squirrel',
        config: { name: 'GestaoServicos', exe: 'GestaoServicos.exe' }
    }]
};
