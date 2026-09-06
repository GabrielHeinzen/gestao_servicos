import Clientes from './pages/clientes';
import './App.css';
import { useState } from 'react';

const USUARIO_PADRAO = 'Gustavo Dums';
const SENHA_PADRAO = '#12345';

function App() {
    const [estaAutenticado, setEstaAutenticado] = useState(false);
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erroLogin, setErroLogin] = useState('');

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
        <Clientes />
    );
}

export default App;
