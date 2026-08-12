// Edge Function: gera um caso clínico de múltipla escolha via API da Groq.
//
// Requer o secret GROQ_API_KEY configurado no projeto Supabase:
//   supabase secrets set GROQ_API_KEY=sua_chave_aqui
//
// Modelo: moonshotai/kimi-k2-instruct (Kimi K2, hospedado na Groq, camada
// gratuita). Mesma escolha de modelo do plano original com OmniRoute —
// bom equilíbrio entre raciocínio e velocidade para casos clínicos
// coerentes, agora servido diretamente pela Groq para funcionar em produção.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "moonshotai/kimi-k2-instruct";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT_SISTEMA = `Você é um gerador de casos clínicos para estudo de medicina, nível graduação
(4º período de curso médico brasileiro).

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com um objeto JSON válido, sem texto antes ou depois,
   sem markdown, sem \`\`\`json.
2. O JSON deve ter exatamente este formato:
   {
     "enunciado": string (o caso clínico: idade, sexo, queixa, achados),
     "pergunta": string (a pergunta de múltipla escolha sobre o caso),
     "alternativas": array de 4 a 5 strings,
     "alternativa_correta": number (índice 0-based da alternativa certa),
     "explicacao": string (por que a alternativa correta está certa)
   }
3. Exatamente UMA alternativa deve estar correta. As demais devem ser
   plausíveis (erros comuns de raciocínio clínico), não absurdas óbvias.
4. É PROIBIDO inventar dado clínico fisiologicamente impossível (valores de
   exame incompatíveis com a condição descrita, sinais que se contradizem,
   fisiopatologia inconsistente). Se não tiver certeza de um valor
   específico, use uma faixa plausível e coerente, nunca um número aleatório.
5. O caso deve ser resolvível com o conhecimento típico de graduação médica
   — não exija subespecialidade nem dado que não esteja no enunciado.
6. A matéria informada pela usuária define o tema central do caso.`;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ erro: "Método não permitido" }),
            { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
        return new Response(
            JSON.stringify({ erro: "GROQ_API_KEY não configurada no projeto Supabase" }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    let materia;
    try {
        const corpo = await req.json();
        materia = corpo.materia;
    } catch {
        return new Response(
            JSON.stringify({ erro: "Corpo da requisição inválido" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    if (typeof materia !== "string" || materia.trim() === "") {
        return new Response(
            JSON.stringify({ erro: "Campo materia é obrigatório" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    try {
        const respostaGroq = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: PROMPT_SISTEMA },
                    { role: "user", content: `Gere um caso clínico de ${materia}.` },
                ],
            }),
        });

        if (!respostaGroq.ok) {
            const detalhe = await respostaGroq.text();
            return new Response(
                JSON.stringify({ erro: `Falha ao chamar a Groq: ${detalhe}` }),
                { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        const dados = await respostaGroq.json();
        const texto = dados.choices?.[0]?.message?.content ?? "";

        return new Response(
            JSON.stringify({ texto }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    } catch (erro) {
        return new Response(
            JSON.stringify({ erro: `Erro inesperado ao gerar caso clínico: ${erro.message}` }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
