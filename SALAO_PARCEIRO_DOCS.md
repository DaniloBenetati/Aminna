# Documentação Técnica: Emissão de NFSe e Conformidade Salão Parceiro

**Versão do Documento:** 1.0
**Data:** 05/02/2026
**Sistema:** Aminna - Gestão Inteligente

---

## 1. Visão Geral

O sistema Aminna possui um módulo integrado de emissão de Nota Fiscal de Serviços Eletrônica (NFSe), utilizando a API da Focus NFe. Este módulo foi desenvolvido em conformidade com a legislação tributária brasileira, especificamente atendendo às exigências do **Programa Salão Parceiro** (Lei nº 13.352/2016) e às regulamentações do **Município de São Paulo** (Instrução Normativa SF/SUREM nº 11/2025).

As principais funcionalidades incluem:
- Emissão automática de NFSe após atendimento.
- Emissão manual de NFSe através do histórico de atendimento.
- Suporte a CPF opcional para o consumidor final.
- Compartilhamento de NFSe via WhatsApp.
- Download de PDF da NFSe.

---

## 2. Conformidade com Salão Parceiro

O sistema implementa a lógica de segregação de receitas entre o **Salão-Parceiro** (estabelecimento) e o **Profissional-Parceiro**, garantindo a tributação correta para ambas as partes.

### 2.1. Segregação de Valores ("Split")

Para cada serviço prestado, o sistema calcula automaticamente as cotas-partes:

1.  **Cota-Parte do Salão:** Valor retido pelo estabelecimento (percentual definido em contrato/configuração).
2.  **Cota-Parte do Profissional:** Valor repassado ao profissional (comissão).

**Fórmula:**
```typescript
SalonValue = TotalValue * (SalonPercentage / 100)
ProfessionalValue = TotalValue * (ProfessionalPercentage / 100)
```

### 2.2. Campos Obrigatórios na NFSe

Para compliance com a nota fiscal paulistana no modelo Salão Parceiro, a requisição de emissão inclui obrigatoriamente:

-   **Tomador:** O cliente final (pode ser não identificado/sem CPF).
-   **Prestador:** O Salão-Parceiro (CNPJ do estabelecimento).
-   **Intermediário:** O Profissional-Parceiro.

**Estrutura de Dados (JSON Exemplo):**

```json
{
  "intermediario": {
    "cnpj": "12345678000199", // CNPJ do Profissional (MEI/PJ)
    "razao_social": "NOME DO PROFISSIONAL",
    "inscricao_municipal": "12345678"
  }
}
```

> **Nota:** A presença do campo `intermediario` é o que caracteriza a operação de agenciamento/Salão Parceiro perante o Fisco Municipal de São Paulo, permitindo a dedução da base de cálculo do ISSQN para o Salão.

---

## 3. Emissão com CPF Opcional

O sistema permite o cadastro de clientes sem CPF obrigatório. No momento da emissão da NFSe:

-   **Com CPF:** O CPF é enviado no campo `tomador.cpf_cnpj`.
-   **Sem CPF:** O campo `tomador.cpf_cnpj` é enviado vazio ou omitido, emitindo a nota para "Consumidor Final não Identificado" (comum no varejo).

---

## 4. Arquivos e Serviços Relacionados

-   **`focusNfeService.ts`**: Contém toda a lógica de negócio, comunicação com API e cálculo de impostos.
-   **`ServiceModal.tsx`**: Interface de usuário para acionamento da emissão e visualização do resultado (PDF/WhatsApp).
-   **`fiscal_config` (Tabela):** Armazena as configurações tributárias do Salão.
-   **`professional_fiscal_config` (Tabela):** Armazena os dados tributários (CNPJ, IM) de cada profissional.

---

## 5. Fluxo de Emissão

1.  Usuário finaliza atendimento no `ServiceModal`.
2.  Aciona "Emitir NFSe".
3.  Front-end chama `focusNfeService.issueNFSe`.
4.  Sistema valida configurações fiscais do Salão e do Profissional.
5.  Calcula a segregação de valores.
6.  Envia requisição para Edge Function (Supabase) -> Focus NFe.
7.  Retorna SUCESSO e salva registro na tabela `nfse_records`.
8.  Botões de "Baixar PDF" e "WhatsApp" tornam-se visíveis.
