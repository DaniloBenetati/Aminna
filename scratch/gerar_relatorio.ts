import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url!, key!);

    // Fetch all transactions for May 2026
    const { data: txs, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .gte('date', '2026-05-01')
        .lte('date', '2026-05-31')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    let balance = 52334.84; // Saldo Inicial
    const reportRows: string[] = [];
    const countMap: Record<string, number> = {};
    const dupMap: Record<string, any[]> = {};

    txs.forEach(t => {
        const amt = parseFloat(t.amount as any);
        const signed = t.type === 'DESPESA' ? -amt : amt;
        balance += signed;

        const key = `${t.date}_${t.description}_${t.amount}_${t.type}`;
        countMap[key] = (countMap[key] || 0) + 1;
        if (!dupMap[key]) {
            dupMap[key] = [];
        }
        dupMap[key].push(t);

        reportRows.push(`| ${t.date} | ${t.description.substring(0, 40)} | ${t.type} | R$ ${signed.toFixed(2)} | R$ ${balance.toFixed(2)} | ${countMap[key] > 1 ? '**DUPLICADO**' : ''} |`);
    });

    // Find duplicates details
    const dupDetails: string[] = [];
    Object.keys(dupMap).forEach(key => {
        const list = dupMap[key];
        if (list.length > 1) {
            dupDetails.push(`### Lançamento: ${key}`);
            dupDetails.push(`- **Quantidade:** ${list.length} vezes no banco`);
            dupDetails.push(`- **Total acumulado:** R$ ${(parseFloat(list[0].amount) * list.length).toFixed(2)}`);
            dupDetails.push(`- **IDs dos registros no banco:**`);
            list.forEach((t, i) => {
                dupDetails.push(`  1. \`${t.id}\` (Criado em: ${t.created_at})`);
            });
            dupDetails.push('');
        }
    });

    // Check transactions at the end of May that might not be in the PDF
    const lateMayTxs = txs.filter(t => t.date === '2026-05-29');
    const lateMayDetails: string[] = [];
    lateMayTxs.forEach(t => {
        lateMayDetails.push(`- **${t.description}** | R$ ${t.amount} (${t.type}) | ID: \`${t.id}\``);
    });

    const reportContent = `# Relatório de Auditoria - Lançamentos de Maio/2026

Este relatório apresenta o resultado da auditoria realizada nos lançamentos bancários registrados na tabela \`bank_transactions\` para o mês de **Maio de 2026**.

## Resumo dos Saldos
- **Saldo Inicial (01/05/2026):** R$ 52.334,84 (Confere com o extrato)
- **Saldo Final no Banco de Dados (com duplicados):** R$ ${balance.toFixed(2)} (Diferença de R$ ${(balance - 46807.31).toFixed(2)} em relação ao esperado)
- **Saldo Final Esperado no Extrato:** R$ 46.807,31

---

## 1. Identificação de Lançamentos Duplicados

Foi encontrada uma duplicidade massiva no dia **20/05/2026**:

${dupDetails.join('\n')}

Se removermos as **10 cópias extras** deste lançamento de R$ 86,05 (totalizando R$ 860,50 a mais de despesa no banco), o saldo recalculado seria:
- **Saldo com Deduplicação do PIX Receita Federal:** R$ ${(balance + 860.50).toFixed(2)}

Isso significa que a duplicidade de R$ 86,05 explica **R$ 860,50** da diferença, mas ainda resta uma discrepância de **R$ ${(balance + 860.50 - 46807.31).toFixed(2)}**.

---

## 2. Divergências no Fim do Mês (29/05/2026)

Comparando os lançamentos gravados no banco no dia **29/05/2026** com a imagem do extrato fornecida, identificamos os seguintes registros:

### Lançamentos no Banco no dia 29/05/2026:
${lateMayDetails.join('\n')}

### Confronto com a Imagem do Extrato (PDF):
Na imagem do extrato fornecida, as transações exibidas no dia **29/05/2026** são:
1. \`SICREDI ANTEC ELO\` | R$ 265,06 (Consta no banco)
2. \`SICREDI ANTEC MASTER\` | R$ 6.220,85 (Consta no banco)
3. \`RECEBIMENTO PIX MILENA DE AGUIAR LOP\` | R$ 120,00 (Consta no banco)
4. \`RECEBIMENTO PIX KEILA JULIANA VIANNA\` | R$ 496,00 (Consta no banco)
5. \`RECEBIMENTO PIX PRISCILA NOGUEIRA\` | R$ 179,00 (Consta no banco)
6. \`RECEBIMENTO PIX MAIRA DE CAMPOS SILV\` | R$ 436,00 (Consta no banco)
7. \`PAGAMENTO PIX CARMENLEE\` | R$ -1.905,39 (Consta no banco)
8. \`RECEBIMENTO PIX HINA TAHSEEN HASHMI\` | R$ 258,00 (Consta no banco) -> **Este é o último lançamento e define o Saldo Final de R$ 46.807,31.**

### Lançamentos Extras no Banco de Dados (Não aparecem no Extrato do dia 29/05/2026):
1. **SICREDI DEBITO MASTER |0001-41** | R$ 1.348,48 (RECEITA)
2. **SICREDI ANTECIPACAO VISA |0001-41** | R$ 1.735,08 (RECEITA)

Esses dois lançamentos somam **R$ 3.083,56** de receita que não constam no extrato naquele dia.

---

## 3. Reconciliação Geral da Diferença

Vamos somar os valores das divergências encontradas:
- **10 Lançamentos Duplicados da Receita Federal (Despesas Extras):** -R$ 860,50
- **2 Lançamentos de Cartão extras no dia 29/05 (Receitas Extras):** +R$ 3.083,56
- **Diferença líquida dos erros identificados:** +R$ 2.223,06

Se fizermos:
\`\`\`
Saldo no Banco (R$ 50.661,62) 
- Receitas Extras (R$ 3.083,56) 
+ Despesas Duplicadas (R$ 860,50) 
= R$ 48.438,56
\`\`\`
Ainda restará uma diferença de **R$ 1.631,25** para atingir os **R$ 46.807,31** esperados.

Isso sugere que existem outros lançamentos divergentes ou duplicados ao longo do mês. 

### Ações Recomendadas:
1. Excluir as duplicatas do PIX da Receita Federal do dia 20/05.
2. Verificar a origem e validade dos lançamentos de cartão de R$ 1.348,48 e R$ 1.735,08 no dia 29/05.
3. Fazer uma varredura completa nas transações de outros dias para bater os valores exatamente com o extrato.

---

## Tabela de Lançamentos de Maio/2026 (Banco de Dados)

| Data | Descrição | Tipo | Valor | Saldo Corrente | Status |
|------|-----------|------|-------|----------------|--------|
${reportRows.join('\n')}
`;

    fs.writeFileSync(path.resolve(__dirname, 'relatorio_auditoria.md'), reportContent);
    console.log("Relatório gerado com sucesso em scratch/relatorio_auditoria.md");
}

run().catch(console.error);
