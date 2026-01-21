-- Updating passwords for seeded users to ensure they are hashed correctly
UPDATE professional 
SET password_hash = '$2b$06$U/thE5qJqy5D68w7/LPdCuDzPvV.XGnfamjZCXt3XMUwSGHVZqjl.' 
WHERE email IN ('joao.silva@exemplo.gov.br', 'maria.santos@exemplo.gov.br', 'pedro.ramos@modelo.gov.br');
