import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const META_API_VERSION = "v19.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Configurações e validações do ambiente
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_IG_ACCOUNT_ID = process.env.META_IG_ACCOUNT_ID;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

if (!META_ACCESS_TOKEN) {
  console.error("Aviso: META_ACCESS_TOKEN não está definido. Algumas requisições irão falhar.");
}

const server = new Server(
  {
    name: "meta-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define as ferramentas disponíveis para a IA
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_instagram_insights",
        description: "Obtém métricas orgânicas diárias (alcance, impressões, seguidores) do Instagram Business Account.",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Número de dias para buscar os dados (padrão: 30)",
            },
          },
        },
      },
      {
        name: "get_meta_ads_performance",
        description: "Obtém dados de performance (gasto, cpc, alcance, cliques) de anúncios do Meta Ads Account.",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Número de dias para o relatório de anúncios (padrão: 30)",
            },
          },
        },
      }
    ],
  };
});

// Lógica de execução das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!META_ACCESS_TOKEN) {
    throw new McpError(ErrorCode.InvalidRequest, "META_ACCESS_TOKEN não está configurado nas variáveis de ambiente do MCP.");
  }

  if (request.params.name === "get_instagram_insights") {
    if (!META_IG_ACCOUNT_ID) {
        throw new McpError(ErrorCode.InvalidRequest, "META_IG_ACCOUNT_ID não configurado.");
    }
    
    const days = typeof request.params.arguments?.days === "number" ? request.params.arguments.days : 30;
    const now = new Date();
    const sinceTs = Math.floor(new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime() / 1000);
    const untilTs = Math.floor(now.getTime() / 1000);

    try {
      // Busca informações básicas da conta
      const accRes = await axios.get(`${META_GRAPH_URL}/${META_IG_ACCOUNT_ID}`, {
        params: {
          fields: "followers_count,username,name",
          access_token: META_ACCESS_TOKEN
        }
      });

      // Busca insights detalhados (Alcance, Impressões, Perfil)
      const insightsRes = await axios.get(`${META_GRAPH_URL}/${META_IG_ACCOUNT_ID}/insights`, {
        params: {
          metric: "reach,impressions,profile_views",
          period: "day",
          since: sinceTs,
          until: untilTs,
          access_token: META_ACCESS_TOKEN
        }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            profile: accRes.data,
            insights: insightsRes.data.data
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error("Erro na API Graph:", error.response?.data || error.message);
      return {
        content: [{ type: "text", text: `Erro ao acessar Meta API: ${JSON.stringify(error.response?.data || error.message)}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "get_meta_ads_performance") {
    if (!META_AD_ACCOUNT_ID) {
        throw new McpError(ErrorCode.InvalidRequest, "META_AD_ACCOUNT_ID não configurado (deve começar com 'act_').");
    }

    const days = typeof request.params.arguments?.days === "number" ? request.params.arguments.days : 30;
    
    try {
      const adsRes = await axios.get(`${META_GRAPH_URL}/${META_AD_ACCOUNT_ID}/insights`, {
        params: {
          fields: "campaign_name,spend,impressions,reach,clicks,cpc,cpm,objective",
          level: "campaign",
          date_preset: `last_${days}d`,
          access_token: META_ACCESS_TOKEN
        }
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            period: `last_${days}d`,
            campaigns: adsRes.data.data
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error("Erro na API Ads:", error.response?.data || error.message);
      return {
        content: [{ type: "text", text: `Erro ao acessar Meta Ads API: ${JSON.stringify(error.response?.data || error.message)}` }],
        isError: true,
      };
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${request.params.name}`);
});

// Inicialização do Servidor Stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP da Meta iniciado via Stdio.");
}

main().catch((error) => {
  console.error("Erro fatal ao iniciar servidor:", error);
  process.exit(1);
});
