-- Migration to add catalog reservations and handle stock automatically

CREATE TABLE catalog_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Aprovada, Rejeitada, Concluída
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE catalog_reservation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID REFERENCES catalog_reservations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE catalog_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_reservation_items ENABLE ROW LEVEL SECURITY;

-- O Admin autenticado tem pleno acesso
CREATE POLICY "Enable all for authenticated catalog_reservations" ON catalog_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated catalog_reservation_items" ON catalog_reservation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Clientes públicos (anon) podem inserir (fazer a reserva)
CREATE POLICY "Enable insert for anon catalog_reservations" ON catalog_reservations FOR INSERT TO anon WITH CHECK (status = 'Pendente');
CREATE POLICY "Enable insert for anon catalog_reservation_items" ON catalog_reservation_items FOR INSERT TO anon WITH CHECK (true);

-- Permitir leitura de stock_items para anonimos verem o catálogo virtual público
-- O banco atual já pode ter uma política no stock items, mas adicionaremos uma explícita caso não haja
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'stock_items' AND policyname = 'Enable select for anon stock_items'
    ) THEN
        CREATE POLICY "Enable select for anon stock_items" ON stock_items 
        FOR SELECT TO anon 
        USING (active = true AND category = 'Venda' AND quantity > 0);
    END IF;
END $$;


-- Function & Trigger: Deduzir estoque quando um item de reserva é INSERIDO (logo no fechamento do carrinho)
CREATE OR REPLACE FUNCTION deduct_stock_on_reservation_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE stock_items
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_stock_on_reservation
AFTER INSERT ON catalog_reservation_items
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_reservation_insert();


-- Function & Trigger: Devolver estoque se a reserva foi REJEITADA e estava pendente ou aprovada (ou apenas pendente pra simplificar)
CREATE OR REPLACE FUNCTION restore_stock_on_reservation_reject()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF NEW.status = 'Rejeitada' AND OLD.status != 'Rejeitada' THEN
        FOR item IN SELECT product_id, quantity FROM catalog_reservation_items WHERE reservation_id = NEW.id LOOP
            UPDATE stock_items
            SET quantity = quantity + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restore_stock_on_reject
AFTER UPDATE OF status ON catalog_reservations
FOR EACH ROW
EXECUTE FUNCTION restore_stock_on_reservation_reject();
