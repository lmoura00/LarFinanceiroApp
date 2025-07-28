import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// --- CORREÇÃO AQUI ---
// Trocamos 'gemini-pro' por 'gemini-1.5-flash-latest' que é mais moderno e eficiente.
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

serve(async (req) => {
  console.log("INFO: Função 'generate-financial-tips' foi chamada.");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error("ERRO FATAL: A variável de ambiente GEMINI_API_KEY não foi encontrada.");
      throw new Error("A chave da API para o serviço de IA não está configurada no servidor.");
    }
    console.log("INFO: Chave da API Gemini foi carregada.");

    const { transactions } = await req.json();

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({ tips: ["Faça algumas transações para receber dicas financeiras!"] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const formattedTransactions = transactions
      .map((t: any) => `- ${t.description}: R$ ${t.amount.toFixed(2)} (Categoria: ${t.category || 'Não definida'})`)
      .join("\n");
  
    const prompt = `Você é um consultor financeiro para jovens. Baseado nestas transações:\n${formattedTransactions}\nGere 3 dicas financeiras em português. Sua resposta DEVE ser um array JSON de strings, e nada mais. Exemplo: ["Dica 1", "Dica 2", "Dica 3"]`;
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "X-goog-api-key": GEMINI_API_KEY 
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("ERRO da API Gemini:", JSON.stringify(errorBody, null, 2));
      throw new Error(errorBody.error.message || `API Gemini retornou status ${response.status}`);
    }

    const data = await response.json();
    
    const tipsText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!tipsText) {
      throw new Error("Não foi possível extrair o texto da resposta da API Gemini.");
    }

    const cleanedText = tipsText.match(/\[.*\]/s)?.[0];
    if (!cleanedText) {
      throw new Error("A resposta da Gemini não continha um formato de array JSON válido.");
    }

    const tipsArray = JSON.parse(cleanedText);

    return new Response(JSON.stringify({ tips: tipsArray }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error) {
    console.error("ERRO NO BLOCO CATCH FINAL:", error.message);
    return new Response(JSON.stringify({ error: `Erro interno na função: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});