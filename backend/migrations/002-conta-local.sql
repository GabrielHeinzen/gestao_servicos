CREATE TABLE conta_local (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    senha_hash TEXT NOT NULL,
    trocar_senha BOOLEAN NOT NULL DEFAULT TRUE
);
