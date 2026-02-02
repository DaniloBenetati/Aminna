# 🔧 Correção do Erro ao Salvar Profissional

## ✅ Solução Rápida - Copie e Cole o SQL Abaixo

Para corrigir o erro "Erro ao salvar profissional", você precisa adicionar duas colunas que estão faltando na tabela `providers` do banco de dados.

### 📋 Passo a Passo:

1. **Abra o Supabase Dashboard**
   - Acesse: https://supabase.com/dashboard/project/eedazqhgvvelcjurigla

2. **Navegue até o SQL Editor**
   - No menu lateral esquerdo, clique em **"SQL Editor"**

3. **Crie uma Nova Query**
   - Clique no botão **"+ New query"** ou **"Nova consulta"**

4. **Copie e Cole o SQL Abaixo**

```sql
-- Adiciona a coluna 'order' para ordenação personalizada dos profissionais
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- Adiciona a coluna 'commission_history' para histórico de comissões
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_history JSONB DEFAULT '[]'::jsonb;

-- Cria índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_providers_order ON public.providers("order");
```

5. **Execute o SQL**
   - Clique no botão **"Run"** ou pressione **Ctrl + Enter**

6. **Confirme o Sucesso**
   - Você deve ver uma mensagem de sucesso indicando que os comandos foram executados

---

## ✨ Após Executar o SQL

O erro "Erro ao salvar profissional" será corrigido e você poderá:
- ✅ Adicionar novos profissionais
- ✅ Editar profissionais existentes
- ✅ Alterar taxas de comissão com histórico
- ✅ Reordenar profissionais na interface

---

## 🔍 O Que Foi Corrigido?

### Coluna `order`
- Permite ordenação personalizada dos profissionais na lista
- Os botões ⬆️ e ⬇️ funcionarão corretamente

### Coluna `commission_history`
- Armazena o histórico de alterações nas taxas de comissão
- Registra data, valor anterior e motivo de cada mudança
- Mantém auditoria completa das comissões

---

## ⚠️ Notas Importantes

- O comando `IF NOT EXISTS` garante que não haverá erro se as colunas já existirem
- Nenhum dado existente será afetado
- A migração é segura e reversível
- Após executar, recarregue a página do aplicativo (F5)
