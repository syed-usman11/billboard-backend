-- Migrate legacy CUSTOMER role to USER
UPDATE "User" SET role = 'USER' WHERE role = 'CUSTOMER';
