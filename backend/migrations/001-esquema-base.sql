-- Também adota bases criadas pelas versões anteriores do aplicativo.
CREATE TABLE IF NOT EXISTS clientes_empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS clientes_empresas_nome_unico
    ON clientes_empresas (LOWER(TRIM(nome)));

CREATE TABLE IF NOT EXISTS producao (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(120) NOT NULL,
    tipo_lamina VARCHAR(120) NOT NULL,
    data DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Em produção',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE producao
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER,
    ADD COLUMN IF NOT EXISTS observacao TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('romaneio', 'nf', 'despesa')),
    numero_nf VARCHAR(80),
    documento VARCHAR(120),
    empresa VARCHAR(120) NOT NULL,
    data DATE NOT NULL,
    valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT campos_por_tipo CHECK (
        (tipo = 'romaneio' AND numero_nf IS NULL AND documento IS NULL) OR
        (tipo = 'nf' AND numero_nf IS NOT NULL AND documento IS NULL) OR
        (tipo = 'despesa' AND numero_nf IS NULL AND documento IS NOT NULL)
    )
);
ALTER TABLE lancamentos_financeiros
    ADD COLUMN IF NOT EXISTS cliente_id INTEGER,
    ADD COLUMN IF NOT EXISTS producao_id INTEGER,
    ADD COLUMN IF NOT EXISTS romaneio_id INTEGER,
    ADD COLUMN IF NOT EXISTS descricao VARCHAR(200),
    ADD COLUMN IF NOT EXISTS conciliacao_legada BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE lancamentos_financeiros ALTER COLUMN conciliacao_legada SET DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_producao_unica ON lancamentos_financeiros (producao_id);
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_romaneio_unico ON lancamentos_financeiros (romaneio_id);
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_romaneio_referencia ON lancamentos_financeiros (id, cliente_id, valor);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'producao_cliente_fk' AND conrelid = 'producao'::regclass
    ) THEN
        ALTER TABLE producao ADD CONSTRAINT producao_cliente_fk
            FOREIGN KEY (cliente_id) REFERENCES clientes_empresas(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_cliente_fk' AND conrelid = 'lancamentos_financeiros'::regclass
    ) THEN
        ALTER TABLE lancamentos_financeiros ADD CONSTRAINT lancamentos_cliente_fk
            FOREIGN KEY (cliente_id) REFERENCES clientes_empresas(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_romaneio_fk' AND conrelid = 'lancamentos_financeiros'::regclass
    ) THEN
        ALTER TABLE lancamentos_financeiros ADD CONSTRAINT lancamentos_romaneio_fk
            FOREIGN KEY (romaneio_id, cliente_id, valor)
            REFERENCES lancamentos_financeiros (id, cliente_id, valor) ON DELETE SET NULL (romaneio_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_romaneio_somente_nf' AND conrelid = 'lancamentos_financeiros'::regclass
    ) THEN
        ALTER TABLE lancamentos_financeiros ADD CONSTRAINT lancamentos_romaneio_somente_nf
            CHECK (romaneio_id IS NULL OR (tipo = 'nf' AND cliente_id IS NOT NULL AND romaneio_id <> id));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_producao_fk' AND conrelid = 'lancamentos_financeiros'::regclass
    ) THEN
        ALTER TABLE lancamentos_financeiros ADD CONSTRAINT lancamentos_producao_fk
            FOREIGN KEY (producao_id) REFERENCES producao(id) ON DELETE CASCADE;
    END IF;
END $$;
