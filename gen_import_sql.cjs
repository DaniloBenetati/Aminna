const fs = require('fs');
const path = require('path');

const rawData = fs.readFileSync(path.join(__dirname, '..', 'itens_data.json'), 'utf8').trim().replace(/^\uFEFF/, '');
const items = JSON.parse(rawData);

let sql = "DO $$\nDECLARE\n  v_item_id uuid;\nBEGIN\n";

for (const item of items) {
  const code = item.code;
  const name = item.name.replace(/'/g, "''");
  const cat = item.category || 'Venda';
  const group = (item.group || '').replace(/'/g, "''");
  const subGroup = (item.sub_group || '').replace(/'/g, "''");
  const qty = parseInt(item.Qtde) || 0;
  const cost = parseFloat(item.cost_price) || 0;
  const sale = parseFloat(item.sale_price) || 0;

  sql += `  -- Item ${code}\n`;
  sql += `  INSERT INTO public.stock_items (code, name, category, "group", sub_group, quantity, min_quantity, unit, cost_price, sale_price, active)\n`;
  sql += `  VALUES ('${code}', '${name}', '${cat}', '${group}', '${subGroup}', 0, 1, 'unidade', ${cost}, ${sale}, true)\n`;
  sql += `  ON CONFLICT (code) DO UPDATE SET active = true, name = EXCLUDED.name, cost_price = EXCLUDED.cost_price, sale_price = EXCLUDED.sale_price\n`;
  sql += `  RETURNING id INTO v_item_id;\n\n`;

  sql += `  INSERT INTO public.usage_logs (date, stock_item_id, quantity, type, note)\n`;
  sql += `  VALUES (now(), v_item_id, ${qty}, 'AJUSTE_ENTRADA', 'Carga de estoque inicial via planilha Excel');\n\n`;

  sql += `  UPDATE public.stock_items SET quantity = quantity + ${qty} WHERE id = v_item_id;\n\n`;
}

sql += "END $$;";

fs.writeFileSync(path.join(__dirname, '..', 'import_query.sql'), sql);
console.log("SQL generated: import_query.sql");
