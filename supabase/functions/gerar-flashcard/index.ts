const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT_SISTEMA = `Você é um gerador de flashcards para estudo de medicina, nível graduação.
Gere UM flashcard de alta qualidade sobre o tema informado.

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown.
2. O JSON deve ter exatamente este formato:
   {
     "pergunta": string (pergunta direta e objetiva sobre o conceito),
     "resposta": string (resposta clara, concisa, máximo 2-3 linhas),
     "materia": string (nome da matéria inferida do tema, ex: "Microbiologia")
   }
3. A pergunta deve usar Active Recall — formule como uma pergunta que force
   recuperação de memória, não reconhecimento.
4. A resposta deve ser direta, sem introdução ("A resposta é..."), sem enrolação.
5. Se o tema for muito amplo, escolha o aspecto mais cobrado em provas de
   graduação médica brasileira.`;

async function gerarViaGroq(tema: string, apiKey: string): Promise<string> {
    const resposta = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: PROMPT_SISTEMA },
                { role: "user", content: `Gere um flashcard sobre: ${tema}.` },
            ],
        }),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(`Groq: ${detalhe}`);
    }

    const dados = await resposta.json();
    return dados.choices?.[0]?.message?.content ?? "";
}

async function gerarViaGemini(tema: string, apiKey: string): Promise<string> {
    const resposta = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `${PROMPT_SISTEMA}\n\nGere um flashcard sobre: ${tema}.`
                }]
            }],
            generationConfig: {
                responseMimeType: "application/json",
            },
        }),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(`Gemini: ${detalhe}`);
    }

    const dados = await resposta.json();
    return dados.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

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

    let tema: string;
    try {
        const corpo = await req.json();
        tema = corpo.tema;
    } catch {
        return new Response(
            JSON.stringify({ erro: "Corpo da requisição inválido" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    if (typeof tema !== "string" || tema.trim() === "") {
        return new Response(
            JSON.stringify({ erro: "Campo tema é obrigatório" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    let texto = "";
    let erroGroq = "";

    if (groqKey) {
        try {
            texto = await gerarViaGroq(tema, groqKey);
        } catch (e) {
            erroGroq = e.message;
        }
    }

    if (!texto && geminiKey) {
        try {
            texto = await gerarViaGemini(tema, geminiKey);
        } catch (e) {
            return new Response(
                JSON.stringify({ erro: `Groq falhou (${erroGroq}), Gemini também falhou: ${e.message}` }),
                { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }
    }

    if (!texto) {
        return new Response(
            JSON.stringify({ erro: "Nenhum provedor de IA disponível" }),
            { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    return new Response(
        JSON.stringify({ texto }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
});
