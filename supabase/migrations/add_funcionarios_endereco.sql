-- Add address columns to funcionarios (optional CEP search)
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
