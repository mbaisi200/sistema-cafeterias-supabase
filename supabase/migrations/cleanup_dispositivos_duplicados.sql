-- Limpa dispositivos duplicados: mantém apenas o mais recente
-- por combinação de empresa_id + device_name + usuario_nome
-- (user_agent varia entre sessões, device_name é estável)

DELETE FROM dispositivos_usuario
WHERE id NOT IN (
  SELECT MIN(id)
  FROM dispositivos_usuario
  WHERE usuario_nome IS NOT NULL
    AND device_name IS NOT NULL
  GROUP BY empresa_id, device_name, usuario_nome
);

-- Remove dispositivos órfãos (sem usuario_nome) com mais de 7 dias
DELETE FROM dispositivos_usuario
WHERE usuario_nome IS NULL
AND criado_em < NOW() - INTERVAL '7 days';
