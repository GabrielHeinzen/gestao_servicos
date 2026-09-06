import './App.css';
import { useState } from 'react';

const USUARIO_PADRAO = 'Gustavo Dums';
const SENHA_PADRAO = '#12345';
const OPCOES_MENU = [
    {
        id: 'servicos',
        titulo: 'Serviços',
        descricao: 'Cadastre e acompanhe os serviços que entram na empresa.',
        status: 'Cadastro e finalização serão implementados na próxima etapa.',
        icone: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h10" />
            </svg>
        ),
    },
    {
        id: 'financeiro',
        titulo: 'Financeiro',
        descricao: 'Controle entradas, saídas e visão geral do caixa da empresa.',
        status: 'O controle financeiro será conectado depois.',
        icone: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
    },
];

function App() {
    const [estaAutenticado, setEstaAutenticado] = useState(false);
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erroLogin, setErroLogin] = useState('');
    const [menuAtivo, setMenuAtivo] = useState(OPCOES_MENU[0].id);
    const opcaoAtiva = OPCOES_MENU.find((opcao) => opcao.id === menuAtivo);

    function handleLogin(event) {
        event.preventDefault();

        if (usuario.trim() !== USUARIO_PADRAO || senha !== SENHA_PADRAO) {
            setErroLogin('Usuario ou senha incorretos.');
            return;
        }

        setErroLogin('');
        setEstaAutenticado(true);
    }

    if (!estaAutenticado) {
        return (
            <main className="login-page">
                <form className="login-card" onSubmit={handleLogin}>
                    <h1>Bem vindo</h1>

                    <div className="login-field">
                        <label htmlFor="usuario">Usuario</label>
                        <input
                            id="usuario"
                            name="usuario"
                            type="text"
                            value={usuario}
                            onChange={(event) => setUsuario(event.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="senha">Senha</label>
                        <div className="password-input">
                            <input
                                id="senha"
                                name="senha"
                                type={mostrarSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={(event) => setSenha(event.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {erroLogin && <p className="login-error">{erroLogin}</p>}

                    <button className="login-button" type="submit">Entrar</button>
                </form>
            </main>
        );
    }

    return (
        <main className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-mark">GS</span>
                    <div>
                        <strong>Gestão</strong>
                        <span>Serviços</span>
                    </div>
                </div>

                <nav className="sidebar-nav" aria-label="Menu principal">
                    {OPCOES_MENU.map((opcao) => (
                        <button
                            key={opcao.id}
                            className={opcao.id === menuAtivo ? 'nav-item active' : 'nav-item'}
                            type="button"
                            onClick={() => setMenuAtivo(opcao.id)}
                        >
                            {opcao.icone}
                            <span>{opcao.titulo}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <section className="home-content">
                <header className="home-header">
                    <p>Sistema local da empresa</p>
                    <h1>{opcaoAtiva.titulo}</h1>
                </header>

                <div className="home-panel">
                    <div className="panel-icon">{opcaoAtiva.icone}</div>
                    <div>
                        <h2>{opcaoAtiva.descricao}</h2>
                        <p>{opcaoAtiva.status}</p>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default App;
