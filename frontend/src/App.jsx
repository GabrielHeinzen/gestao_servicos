import './App.css';
import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, Factory, LogOut, Receipt, UserRound, UsersRound, Wallet } from 'lucide-react';
import Producao from './pages/producao';
import Lancamentos from './pages/lancamentos';
import Relatorios from './pages/relatorios';
import Clientes from './pages/clientes';
import CampoSenha from './components/campoSenha';
import { descartarSessao, entrar, sair } from './services/api';

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
        id: 'clientes',
        titulo: 'Clientes',
        icone: UsersRound,
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
    const [sessao, setSessao] = useState(null);
    const [usuario, setUsuario] = useState(() => localStorage.getItem('gestao_servicos_usuario') || '');
    const [senha, setSenha] = useState('');
    const [erroLogin, setErroLogin] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [lembrar, setLembrar] = useState(() => Boolean(localStorage.getItem('gestao_servicos_usuario')));
    const [menuAtivo, setMenuAtivo] = useState(OPCOES_MENU[0].id);
    const [tipoFinanceiro, setTipoFinanceiro] = useState('romaneio');

    useEffect(() => {
        function aoExpirar() {
            descartarSessao();
            setSessao(null);
            setErroLogin('Sua sessão terminou. Entre novamente.');
        }
        window.addEventListener('gestao:sessao-expirada', aoExpirar);
        const prazo = sessao ? window.setTimeout(aoExpirar, Math.max(0, sessao.expiraEm - Date.now())) : undefined;
        return () => {
            window.clearTimeout(prazo);
            window.removeEventListener('gestao:sessao-expirada', aoExpirar);
        };
    }, [sessao]);

    async function handleLogin(event) {
        event.preventDefault();
        if (ocupado) return;
        setOcupado(true);
        setErroLogin('');
        try {
            const autenticado = await entrar(usuario.trim(), senha);
            if (lembrar) localStorage.setItem('gestao_servicos_usuario', autenticado.usuario);
            else localStorage.removeItem('gestao_servicos_usuario');
            setSenha('');
            setSessao(autenticado);
        } catch (erro) {
            setErroLogin(erro.message);
        } finally {
            setOcupado(false);
        }
    }

    async function handleLogout() {
        if (ocupado) return;
        setOcupado(true);
        try {
            await sair();
        } catch {
            // O cliente descarta o token mesmo se a API estiver indisponível.
        } finally {
            setSessao(null);
            setMenuAtivo('servicos');
            setErroLogin('');
            setOcupado(false);
        }
    }

    if (!sessao) {
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

                    <CampoSenha id="senha" rotulo="Senha" autoComplete="current-password" value={senha} onChange={setSenha} />

                    <label className="remember-option">
                        <input type="checkbox" checked={lembrar} onChange={(event) => setLembrar(event.target.checked)} />
                        <span>Lembrar usuário</span>
                    </label>

                    {erroLogin && <p className="login-error" role="alert">{erroLogin}</p>}

                    <button className="login-button" type="submit" disabled={ocupado}>{ocupado ? 'Entrando...' : 'Entrar'}</button>
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
                    <div className="sidebar-user"><span className="sidebar-user-avatar">GD</span><span>{sessao.usuario}</span></div>
                    <button type="button" className="logout-button" onClick={handleLogout} disabled={ocupado} title="Sair" aria-label="Sair"><LogOut size={18} /></button>
                </div>
            </aside>

            <section className="home-content">
                {menuAtivo === 'servicos' && <Producao onAbrirClientes={() => setMenuAtivo('clientes')} />}
                {menuAtivo === 'financeiro' && <Lancamentos tipo={tipoFinanceiro} onTipoChange={setTipoFinanceiro} onAbrirClientes={() => setMenuAtivo('clientes')} />}
                {menuAtivo === 'clientes' && <Clientes />}
                {menuAtivo === 'despesas' && <Lancamentos tipo="despesa" />}
                {menuAtivo === 'relatorios' && <Relatorios />}
            </section>
        </main>
    );
}

export default App;
