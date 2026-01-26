-- Seed Data Migration

-- 1. PROVIDERS
INSERT INTO public.providers (name, specialty, specialties, commission_rate, avatar, phone, birth_date, pix_key, active, work_days)
VALUES
('Ana Silva', 'Manicure Clássica', ARRAY['Mão Simples', 'Pé Simples', 'Blindagem de Diamante', 'Francesinha (Adicional)'], 0.60, 'https://i.pravatar.cc/150?u=a042581f4e29026024d', '(11) 99999-1001', '1990-01-15', 'ana.silva@email.com', true, ARRAY[1, 2, 3, 4, 5, 6]),
('Carla Souza', 'Nail Art', ARRAY['Mão Simples', 'Pé Simples', 'Nail Art (por unha)', 'Alongamento Fibra de Vidro', 'Manutenção Fibra', 'Esmaltação em Gel'], 0.65, 'https://i.pravatar.cc/150?u=a042581f4e29026704d', '(11) 99999-1002', '1992-08-20', '11999991002', true, ARRAY[2, 3, 4, 5, 6]),
('Beatriz Costa', 'Podologia', ARRAY['Pé Simples', 'Spa dos Pés Completo', 'Plástica dos Pés'], 0.70, 'https://i.pravatar.cc/150?u=a04258114e29026302d', '(11) 99999-1003', '1988-01-28', 'beatriz.costa@cpf.com', true, ARRAY[1, 3, 5]),
('Fernanda Lima', 'Alongamento', ARRAY['Mão Simples', 'Alongamento Fibra de Vidro', 'Manutenção Fibra', 'Esmaltação em Gel', 'Banho de Gel', 'Remoção de Alongamento'], 0.65, 'https://i.pravatar.cc/150?u=a04258114e29026708c', '(11) 99999-1004', '1995-12-10', 'fernanda.lima@email.com', true, ARRAY[4, 5, 6]),
('Juliana Mendes', 'SPA dos Pés', ARRAY['Mão Simples', 'Pé Simples', 'Spa dos Pés Completo', 'Plástica dos Pés'], 0.60, 'https://i.pravatar.cc/150?u=a04258114e29026702d', '(11) 99999-1005', '1993-02-14', '11999991005', true, ARRAY[1, 2, 3, 4, 5, 6]);

-- 2. SERVICES
INSERT INTO public.services (name, price, duration_minutes, required_specialty, active)
VALUES
('Mão Simples', 45.00, 60, 'Manicure', true),
('Pé Simples', 50.00, 60, 'Pedicure', true),
('Spa dos Pés Completo', 90.00, 60, 'SPA dos Pés', true),
('Alongamento Fibra de Vidro', 220.00, 150, 'Alongamento', true),
('Manutenção Fibra', 140.00, 120, 'Alongamento', true),
('Banho de Gel', 120.00, 90, 'Banho de Gel', true),
('Esmaltação em Gel', 70.00, 60, 'Esmaltação em Gel', true),
('Blindagem de Diamante', 80.00, 60, 'Manicure', true),
('Plástica dos Pés', 150.00, 60, 'Podologia', true),
('Nail Art (por unha)', 15.00, 15, 'Nail Art', true),
('Francesinha (Adicional)', 20.00, 15, 'Manicure', true),
('Remoção de Alongamento', 50.00, 40, 'Alongamento', true);

-- 3. STOCK ITEMS
INSERT INTO public.stock_items (code, name, category, "group", sub_group, quantity, min_quantity, unit, cost_price, sale_price, active)
VALUES
('PROD001', 'Esmalte Vermelho Royal', 'Uso Interno', 'Cosméticos', 'Esmaltes', 12, 5, 'frasco', 8.50, NULL, true),
('MAT002', 'Algodão Premium 500g', 'Uso Interno', 'Descartáveis', 'Algodão', 4, 10, 'pacote', 15.90, NULL, true),
('MAT003', 'Acetona 1L', 'Uso Interno', 'Químicos', 'Removedores', 8, 5, 'litro', 22.00, NULL, true),
('VEND004', 'Creme Hidratante Mãos', 'Venda', 'Cosméticos', 'Cremes', 15, 5, 'unidade', 18.00, 45.90, true),
('VEND005', 'Óleo de Cutícula', 'Venda', 'Cosméticos', 'Óleos', 8, 10, 'unidade', 12.50, 29.90, true),
('ROUPA001', 'Camiseta Logo Aminna P', 'Venda', 'Roupas', 'Camisetas', 5, 2, 'unidade', 25.00, 59.90, true);

-- 4. PANTRY ITEMS
INSERT INTO public.pantry_items (name, unit, category, quantity, min_quantity, cost_price, reference_price, active)
VALUES
('Café Expresso', 'cápsula', 'Bebida', 80, 20, 2.50, 0, true),
('Água Mineral', 'garrafa', 'Bebida', 48, 12, 1.20, 0, true),
('Capuccino', 'dose', 'Bebida', 30, 10, 3.00, 0, true),
('Petit Four', 'unidade', 'Alimento', 100, 30, 0.50, 0, true),
('Espumante', 'taça', 'Bebida', 10, 5, 8.00, 0, true);

-- 5. PARTNERS
-- Need to capture IDs to link Campaigns (Using DO block for this part)
DO $$
DECLARE
    p_id UUID;
BEGIN
    INSERT INTO public.partners (name, social_media, category, phone, partnership_type, active) 
    VALUES ('Laura Digital', '@laurainfluencer', 'Influenciadora', '(11) 98888-0001', 'PERMUTA', true)
    RETURNING id INTO p_id;

    INSERT INTO public.campaigns (partner_id, name, coupon_code, discount_type, discount_value, start_date, use_count, max_uses, total_revenue_generated, active)
    VALUES (p_id, 'Lançamento Verão', 'LAURA10', 'PERCENTAGE', 10, CURRENT_DATE, 45, 100, 2500.00, true);

    INSERT INTO public.partners (name, social_media, category, phone, partnership_type, active) 
    VALUES ('Academia FitLife', '@fitlife_sp', 'Estabelecimento Local', '(11) 3333-4444', 'PAGO', true)
    RETURNING id INTO p_id;

    INSERT INTO public.campaigns (partner_id, name, coupon_code, discount_type, discount_value, start_date, use_count, max_uses, total_revenue_generated, active)
    VALUES (p_id, 'Parceria Vizinhos', 'FITLIFE15', 'FIXED', 15, CURRENT_DATE + 5, 12, 20, 980.00, true);
    
    INSERT INTO public.partners (name, social_media, category, phone, partnership_type, active) 
    VALUES ('Blog da Nails', '@blog_nails_brasil', 'Blog/Mídia', '(11) 97777-1111', 'PERMUTA', false);
END $$;
