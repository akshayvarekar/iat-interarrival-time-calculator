import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import {
  toolExplainSkuSite,
  toolQueryResults,
  toolSimulateSnapshot,
} from './aiTools';
import { CalculationInput } from '../utils/iatCalculator';

const explainSkuSiteDeclaration: FunctionDeclaration = {
  name: 'explain_sku_site',
  description:
    'Looks up the calculated record for a specific SKU-Site pair. Returns location type (Hub DC/Spoke DC), formula used, qualifying week/day count, qualifying receipt dates, and substitution details if applicable.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sku: { type: Type.STRING, description: 'SKU code or name (e.g. SKU1001, SKU1060)' },
      site: { type: Type.STRING, description: 'Site or Plant code (e.g. EU_HUB_01, EU_SPOKE_01, NA_HUB_01)' },
    },
    required: ['sku', 'site'],
  },
};

const queryResultsDeclaration: FunctionDeclaration = {
  name: 'query_results',
  description:
    'Filters and sorts the current IAT calculation results table in code. Filter by region, status (old/new), logic_used; sort by interarrivalTimeDays ascending or descending; limit top_n rows.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filter_criteria: {
        type: Type.OBJECT,
        properties: {
          region: { type: Type.STRING, description: "Filter by region (e.g. 'Europe', 'NA')" },
          status: { type: Type.STRING, description: "Filter by status: 'old' or 'new'" },
          logic_used: {
            type: Type.STRING,
            description:
              "Filter by logic rule type: 'direct_hub', 'direct_spoke', 'gtin_sub', 'segment_sub', 'default'",
          },
        },
      },
      sort_by: {
        type: Type.STRING,
        description: "Field to sort by: 'interarrivalTimeDays', 'sku', 'site'",
      },
      direction: { type: Type.STRING, description: "'asc' or 'desc'" },
      top_n: { type: Type.INTEGER, description: 'Limit to top N rows (e.g. 3, 5, 10)' },
    },
  },
};

const simulateSnapshotDeclaration: FunctionDeclaration = {
  name: 'simulate_snapshot',
  description:
    'Re-runs the exact IAT calculation function with a hypothetical snapshot date (YYYY-MM-DD). Returns full new result set and diff against current snapshot date (changed IATs, flipped OLD/NEW status, changed rules). Read-only simulation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      hypothetical_date: {
        type: Type.STRING,
        description: 'Hypothetical snapshot date in YYYY-MM-DD format (e.g. 2026-06-30)',
      },
    },
    required: ['hypothetical_date'],
  },
};

export async function handleAiInsightsChat(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  context: CalculationInput
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      answer:
        'Gemini API key is missing. Please ensure GEMINI_API_KEY is configured in your project environment.',
      toolsUsed: [],
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const toolsUsedSet = new Set<string>();

  const systemInstruction = `You are an AI Insights Assistant embedded in the Interarrival Time (IAT) Calculator dashboard.
CRITICAL GROUNDING CONSTRAINTS & MANDATES:
1. NEVER calculate, estimate, or state any IAT number yourself. You MUST call tool(s) to fetch or compute IAT numbers and narrate their results.
2. ALWAYS call the relevant tool(s) before answering. Never state a number that didn't come directly from a tool result.
3. For explain_sku_site answers: respond in 2-3 concise sentences strictly matching this style:
   "This SKU is at a [Hub DC/Spoke DC]. During the last 182 days, qualifying receipts occurred in [count] unique [weeks/days]. Therefore IAT = 182 / [count] = [result] days."
   If it was a substitution, explain which rule (GTIN or Hierarchy) and which sibling SKU(s) were used instead.
4. For query_results answers: state the ranked list clearly with numbered items (1., 2., 3., etc.), giving explicit SKU, Site, and IAT values. Do not describe it vaguely.
5. For simulate_snapshot answers: clearly label the answer as hypothetical ("Under a snapshot date of [date]...") and explicitly call out what changed versus the current dashboard view (which SKU-Site pairs changed IAT, which flipped between OLD and NEW status, and which changed rules). Never claim the live dashboard state was altered.
6. If a question needs more than one tool (e.g., "which SKUs would become NEW if the snapshot moved to June 30"), call multiple tools and combine their results before answering.
7. If you cannot resolve the SKU or Site from the user's question, ask the user to clarify instead of guessing.`;

  const contents: any[] = [];

  if (history && Array.isArray(history)) {
    history.forEach((h) => {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: h.parts.map((p) => ({ text: p.text })),
      });
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  let turns = 0;
  const maxTurns = 6;

  while (turns < maxTurns) {
    turns++;
    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              explainSkuSiteDeclaration,
              queryResultsDeclaration,
              simulateSnapshotDeclaration,
            ],
          },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      break;
    }

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      contents.push(candidate.content);

      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        toolsUsedSet.add(call.name);
        let result: any = null;

        if (call.name === 'explain_sku_site') {
          result = toolExplainSkuSite(call.args as any, context);
        } else if (call.name === 'query_results') {
          result = toolQueryResults(call.args as any, context);
        } else if (call.name === 'simulate_snapshot') {
          result = toolSimulateSnapshot(call.args as any, context);
        } else {
          result = { error: `Unknown tool name: ${call.name}` };
        }

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result },
            id: call.id,
          },
        });
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    } else {
      return {
        answer: response.text || 'No response text generated.',
        toolsUsed: Array.from(toolsUsedSet),
      };
    }
  }

  return {
    answer: 'Completed calculation analysis.',
    toolsUsed: Array.from(toolsUsedSet),
  };
}
