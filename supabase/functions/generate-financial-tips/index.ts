import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transactions } = await req.json();

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ tips: ["Faça algumas transações para receber dicas financeiras!"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const formattedTransactions = transactions
      .map((t: any) => `- ${t.description}: R$ ${t.amount.toFixed(2)} (Categoria: ${t.category || 'Não definida'})`)
      .join("\n");

    const prompt = `
      Você é um assistente financeiro amigável para jovens e adolescentes. 
      Seu objetivo é dar dicas curtas, úteis e positivas sobre como lidar com o dinheiro.
      Com base na seguinte lista de transações recentes, gere 3 dicas financeiras em português do Brasil.
      As dicas devem ser práticas e fáceis de entender.

      Transações:
      ${formattedTransactions}

      Retorne sua resposta como um array JSON de strings. Exemplo: ["Dica 1...", "Dica 2...", "Dica 3..."]
    `;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();


    const tipsText = data.candidates[0].content.parts[0].text;


    const tipsArray = JSON.parse(tipsText.replace(/```json|```/g, "").trim());

    return new Response(JSON.stringify({ tips: tipsArray }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});