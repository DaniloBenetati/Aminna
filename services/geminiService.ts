import { GoogleGenAI } from "@google/genai";
import { PROVIDERS, CUSTOMERS, STOCK, SERVICES } from "../constants";

// Construct a context string to give the AI awareness of the "database"
const getContextString = () => {
  return `
    DADOS DO SISTEMA (ESMALTERIA):
    
    PRESTADORAS (Total 22, Exemplo de 5):
    ${JSON.stringify(PROVIDERS.map(p => ({ name: p.name, specialty: p.specialty, commission: p.commissionRate })))}
    
    SERVIÇOS:
    ${JSON.stringify(SERVICES)}
    
    ESTOQUE (Crítico se qtd < min):
    ${JSON.stringify(STOCK)}
    
    CLIENTES EXEMPLO:
    ${JSON.stringify(CUSTOMERS.map(c => ({ name: c.name, status: c.status, history: c.history })))}
    
    REGRA DE NEGÓCIO:
    - Repasse quinzenal.
    - Trocas de prestadora exigem motivo.
    - Foco em retenção e upsell.
  `;
};

const SYSTEM_INSTRUCTION = `
Você é uma IA especialista em gestão de negócios de serviços (Esmalteria), atuando como atendente, vendedor, analista financeiro e estrategista.
Seu objetivo é automatizar operações, aumentar faturamento e retenção.

REGRAS GERAIS:
1. Sempre priorize converter atendimento em venda.
2. Quando houver dúvida, faça perguntas objetivas.
3. Ofereça upsell (serviços complementares).
4. Tom profissional, claro e humano.

FUNÇÕES ESPECÍFICAS:
- Atendimento: Sugira horários, confirme agendamentos.
- CRM: Registre trocas de prestadora (Ana -> Carla) com motivo obrigatório.
- Financeiro: Calcule repasses (Preço * % Comissão). Alerte sobre riscos.
- Estoque: Diferencie uso interno de venda. Alerte baixo estoque.

Use os dados fornecidos no contexto para responder com precisão sobre "Quem é a prestadora X" ou "Quanto temos de estoque de Y".
Se não souber, pergunte ou peça para verificar o sistema.
`;

export const sendMessageToGemini = async (message: string, history: any[] = []): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Combine context with the prompt implicitly via system instructions
    // Note: In a production app, we might use RAG or a smaller context window strategy.
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + getContextString(),
        temperature: 0.7,
      }
    });

    return response.text || "Desculpe, não consegui processar sua solicitação.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Desculpe, ocorreu um erro ao conectar com a inteligência artificial. Verifique sua chave de API ou tente novamente mais tarde.";
  }
};
