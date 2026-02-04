# 🧪 Como Testar a Integração Focus NFe

## Passo a Passo para Teste

### 1️⃣ Execute a Migration no Supabase

Acesse o **SQL Editor** no Supabase Dashboard e execute:

```sql
-- Copie todo o conteúdo do arquivo: 
-- Aminna/supabase/migrations/008_fiscal_integration.sql
-- E execute no SQL Editor
```

### 2️⃣ Configure os Dados Fiscais do Salão

```sql
UPDATE fiscal_config 
SET 
  salon_name = 'Aminna Esmalteria',
  cnpj = '12.345.678/0001-99',  -- ⚠️ CNPJ fictício para sandbox
  municipal_registration = '12345678',
  city = 'São Paulo',
  state = 'SP',
  address = 'Rua Exemplo, 123',
  zip_code = '01234-567',
  focus_nfe_token = 'L9QNHXiyP8fc9r7R5XdNaigtV4UkqGoy',
  focus_nfe_environment = 'sandbox',
  salao_parceiro_enabled = true,
  default_salon_percentage = 30.00,
  auto_issue_nfse = false
WHERE id = (SELECT id FROM fiscal_config LIMIT 1);
```

### 3️⃣ Cadastre o CNPJ de uma Profissional

Primeiro, pegue o ID de uma profissional ativa:

```sql
-- Ver profissionais ativas
SELECT id, name FROM providers WHERE active = true LIMIT 5;
```

Depois, cadastre os dados fiscais dela:

```sql
INSERT INTO professional_fiscal_config (
  provider_id,
  cnpj,
  municipal_registration,
  social_name,
  fantasy_name,
  service_percentage,
  email,
  phone,
  active,
  verified
) VALUES (
  'COLE_AQUI_O_ID_DA_PROFISSIONAL',  -- ID que você pegou acima
  '98.765.432/0001-88',  -- ⚠️ CNPJ fictício para sandbox
  '87654321',
  'Profissional Teste Ltda',
  'Profissional Teste',
  70.00,
  'profissional@teste.com',
  '(11) 98765-4321',
  true,
  true  -- ✅ IMPORTANTE: marque como verificado
);
```

### 4️⃣ Execute o Script de Teste

**Opção A: Via Console do Navegador**

1. Abra a aplicação no navegador (http://localhost:5173)
2. Abra o DevTools (F12)
3. Vá na aba **Console**
4. Execute:

```javascript
import('./services/testNFSe').then(m => m.runNFSeTests());
```

**Opção B: Via Node/Terminal** (se tiver ts-node instalado)

```bash
cd Aminna
npx ts-node services/testNFSe.ts
```

### 5️⃣ O que o Script Testa

O script executa 4 testes automaticamente:

1. ✅ **Verifica configuração fiscal** do salão
2. ✅ **Verifica dados fiscais** das profissionais
3. ✅ **Emite uma NFSe de teste** no sandbox
4. ✅ **Consulta o status** da NFSe emitida

### 6️⃣ Resultados Esperados

Se tudo estiver correto, você verá:

```
╔═══════════════════════════════════════════════════════════╗
║   🧪 TESTE DE INTEGRAÇÃO FOCUS NFE - SALÃO PARCEIRO     ║
╚═══════════════════════════════════════════════════════════╝

🔍 TESTE 1: Verificando configuração fiscal...
✅ Configuração fiscal OK!

🔍 TESTE 2: Verificando profissionais cadastradas...
👤 Nome da Profissional
   ✅ CNPJ: 98.765.432/0001-88
   ✅ Percentual: 70%
   ✅ Verificado: Sim

🚀 TESTE 3: Emitindo NFSe de teste...
✅ NFSe criada com sucesso!

🔍 TESTE 4: Consultando status da NFSe...
✅ Status atualizado!

📋 Detalhes da NFSe
{
  "status": "issued",
  "valorTotal": "R$ 100",
  "valorSalao": "R$ 30",
  "valorProfissional": "R$ 70",
  "cnpjProfissional": "98.765.432/0001-88",
  ...
}

╔═══════════════════════════════════════════════════════════╗
║               ✅ TESTES CONCLUÍDOS COM SUCESSO!          ║
╚═══════════════════════════════════════════════════════════╝
```

## ⚠️ Troubleshooting

### Erro: "Configuração fiscal NÃO encontrada"
- Execute a migration primeiro
- Verifique se a tabela `fiscal_config` existe

### Erro: "Token Focus NFe NÃO configurado"
- Execute o UPDATE na tabela fiscal_config com o token

### Erro: "Nenhuma profissional com CNPJ verificado"
- Cadastre os dados fiscais em `professional_fiscal_config`
- Certifique-se que o campo `verified = true`

### Erro na emissão da NFSe
- Verifique os logs de erro retornados
- Confirme que está usando o ambiente sandbox
- Verifique se o CNPJ está no formato correto

## 📌 Importante

- ✅ Sempre teste em **sandbox** primeiro
- ✅ Use **CNPJs fictícios** no sandbox
- ✅ Verifique os dados antes de ir para **produção**
- ✅ Em produção, use CNPJs e Inscrições Municipais **reais e válidas**
