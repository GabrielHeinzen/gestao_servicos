import './App.css';
import { useState } from 'react';
import { ChartNoAxesCombined, Eye, EyeOff, Factory, LockKeyhole, LogOut, Receipt, UserRound, Wallet } from 'lucide-react';
import Producao from './pages/producao';
import Lancamentos from './pages/lancamentos';
import Relatorios from './pages/relatorios';

const USUARIO_PADRAO = 'Gustavo Dums';
const SENHA_PADRAO = '#12345';
const OPCOES_MENU = [
    {
        id: 'servicos',
        titulo: 'Produção',
        icone: Factory,
    },
    {
        id: 'financeiro',
        titulo: 'Financeiro / Vendas',
        icone: Wallet,
    },
    {
        id: 'despesas',
        titulo: 'Gastos / Despesas',
        icone: Receipt,
    },
    {
        id: 'relatorios',
        titulo: 'Relatórios',
        icone: ChartNoAxesCombined,
    },
];

function App() {
    const [estaAutenticado, setEstaAutenticado] = useState(false);
    const [usuario, setUsuario] = useState(() => localStorage.getItem('gestao_servicos_usuario') || '');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erroLogin, setErroLogin] = useState('');
    const [lembrar, setLembrar] = useState(() => Boolean(localStorage.getItem('gestao_servicos_usuario')));
    const [menuAtivo, setMenuAtivo] = useState(OPCOES_MENU[0].id);
    const [tipoFinanceiro, setTipoFinanceiro] = useState('romaneio');

    function handleLogin(event) {
        event.preventDefault();

        if (usuario.trim() !== USUARIO_PADRAO || senha !== SENHA_PADRAO) {
            setErroLogin('Usuario ou senha incorretos.');
            return;
        }

        setErroLogin('');
        if (lembrar) localStorage.setItem('gestao_servicos_usuario', usuario.trim());
        else localStorage.removeItem('gestao_servicos_usuario');
        setEstaAutenticado(true);
    }

    if (!estaAutenticado) {
        return (
            <main className="login-page">
                <form className="login-card" onSubmit={handleLogin}>
                    <div className="login-avatar" aria-hidden="true">
                        <UserRound size={48} strokeWidth={1.5} />
                    </div>

                    <div className="login-heading">
                        <h1>Bem-vindo</h1>
                        <p>Acesse o sistema de gestao</p>
                    </div>

                    <div className="login-field">
                        <label htmlFor="usuario">Usuario</label>
                        <UserRound className="field-icon" size={18} aria-hidden="true" />
                        <input
                            id="usuario"
                            name="usuario"
                            type="text"
                            placeholder="Usuario"
                            value={usuario}
                            onChange={(event) => setUsuario(event.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="senha">Senha</label>
                        <div className="password-input">
                            <LockKeyhole className="field-icon" size={18} aria-hidden="true" />
                            <input
                                id="senha"
                                name="senha"
                                type={mostrarSenha ? 'text' : 'password'}
                                placeholder="Senha"
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
                                {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    <label className="remember-option">
                        <input type="checkbox" checked={lembrar} onChange={(event) => setLembrar(event.target.checked)} />
                        <span>Lembrar usuário</span>
                    </label>

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
                    <span className="brand-mark">
                        <img src="/logo-gestao.png" alt="Logo Gestão Serviços" />
                    </span>
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
                            <opcao.icone size={19} strokeWidth={1.9} aria-hidden="true" />
                            <span>{opcao.titulo}</span>
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-user"><span className="sidebar-user-avatar">GD</span><span>Gustavo Dums</span></div>
                    <button type="button" className="logout-button" onClick={() => { setEstaAutenticado(false); setSenha(''); setMenuAtivo('servicos'); }} title="Sair" aria-label="Sair"><LogOut size={18} /></button>
                </div>
            </aside>

            <section className="home-content">
                {menuAtivo === 'servicos' && <Producao />}
                {menuAtivo === 'financeiro' && <Lancamentos tipo={tipoFinanceiro} onTipoChange={setTipoFinanceiro} />}
                {menuAtivo === 'despesas' && <Lancamentos tipo="despesa" />}
                {menuAtivo === 'relatorios' && <Relatorios />}
            </section>
        </main>
    );
}

export default App;
