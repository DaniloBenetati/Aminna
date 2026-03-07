-- Add "Repasse Comissão" to expense_categories if it doesn't exist
INSERT INTO expense_categories (name, dre_class, is_system)
SELECT 'Repasse Comissão', 'EXPENSE_ADM', true
WHERE NOT EXISTS (
    SELECT 1 FROM expense_categories WHERE name = 'Repasse Comissão'
);
