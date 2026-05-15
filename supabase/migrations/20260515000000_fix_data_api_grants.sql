-- Garante acesso ao schema public para as roles da API
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Configura permissões padrão para objetos FUTUROS criados pelo role postgres 
-- Isso garante que novas tabelas funcionem com a API sem necessidade de GRANT manual
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Garante permissões em todos os objetos ATUAIS para garantir que nada ficou para trás
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
