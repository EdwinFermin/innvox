-- Add ACCOUNTANT user type
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_type_check;
ALTER TABLE users ADD CONSTRAINT users_type_check CHECK (type IN ('ADMIN', 'USER', 'ACCOUNTANT'));
