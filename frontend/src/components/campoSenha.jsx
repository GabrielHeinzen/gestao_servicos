import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export default function CampoSenha({ id, rotulo, autoComplete, value, onChange }) {
    const [visivel, setVisivel] = useState(false);
    return (
        <div className="login-field">
            <label htmlFor={id}>{rotulo}</label>
            <div className="password-input">
                <LockKeyhole className="field-icon" size={18} aria-hidden="true" />
                <input id={id} name={id} type={visivel ? 'text' : 'password'} placeholder={rotulo}
                    autoComplete={autoComplete} maxLength={128} value={value}
                    onChange={(event) => onChange(event.target.value)} required />
                <button className="password-toggle" type="button" onClick={() => setVisivel(!visivel)}
                    aria-label={visivel ? `Ocultar ${rotulo.toLowerCase()}` : `Mostrar ${rotulo.toLowerCase()}`}>
                    {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
}
