// Edge Function: gera e conduz casos clínicos via API da Groq, nos 3 modos
// de estudo (Rápido, Interativo, Simulador de Anamnese) e nas chamadas
// conversacionais que cada modo precisa (responder, avaliar).
//
// Requer o secret GROQ_API_KEY configurado no projeto Supabase:
//   supabase secrets set GROQ_API_KEY=sua_chave_aqui
//
// Modelo: openai/gpt-oss-20b (mesmo modelo já usado por gerar-flashcard/
// index.ts com esta mesma chave Groq — moonshotai/kimi-k2-instruct não está
// acessível na conta configurada, retornando "model_not_found").
//
// Esta função é propositalmente stateless (não grava nada no Supabase):
// quem decide o que persistir é o cliente, que já tem essa responsabilidade
// para os demais dados do app (mesmo padrão usado no restante do MediStudy).

import { registrarLogUso } from "../_shared/logUsoIA.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CABECALHO_BASE = `Você é um assistente de estudo de medicina para o 4º período de um curso
médico brasileiro. Responda SEMPRE apenas com um objeto JSON válido, sem
texto antes ou depois, sem markdown, sem \`\`\`json.

É PROIBIDO inventar dado clínico fisiologicamente impossível (valores de
exame incompatíveis com a condição descrita, sinais que se contradizem,
fisiopatologia inconsistente). Se não tiver certeza de um valor específico,
use uma faixa plausível e coerente, nunca um número aleatório.`;

function promptRapido(materia: string, dificuldade: string) {
    return `${CABECALHO_BASE}

Gere um caso clínico de ${materia}, nível de dificuldade "${dificuldade}",
com EXATAMENTE 4 perguntas de múltipla escolha sequenciais sobre o mesmo
paciente (podem evoluir o raciocínio: diagnóstico, exames, conduta etc.).

Formato exato do JSON:
{
  "enunciado": string (o caso clínico: idade, sexo, queixa, achados),
  "perguntas": [
    {
      "pergunta": string,
      "alternativas": array de 4 a 5 strings,
      "alternativa_correta": number (índice 0-based),
      "explicacao": string (raciocínio clínico de por que a alternativa correta está certa)
    }
    // total de exatamente 4 objetos assim
  ]
}

Exatamente UMA alternativa por pergunta deve estar correta. As demais devem
ser plausíveis (erros comuns de raciocínio clínico), não absurdas óbvias.`;
}

function promptInterativo(materia: string, dificuldade: string, ehCasoDoDia: boolean) {
    return `${CABECALHO_BASE}

Gere um caso clínico ${ehCasoDoDia ? "especialmente memorável e didático " : ""}de
${materia}, nível de dificuldade "${dificuldade}", estruturado para um fluxo
interativo de 5 etapas (apresentação, anamnese, exames, hipótese, conduta).

Formato exato do JSON:
{
  "paciente": {
    "nome": string (fictício),
    "idade": number,
    "sexo": string,
    "queixa_principal": string,
    "sinais_vitais": { "fc": string, "fr": string, "pa": string, "temperatura": string, "sato2": string }
  },
  "perguntas_anamnese": [
    { "id": string, "texto": string, "essencial": boolean, "resposta": string }
    // 6 a 9 perguntas de anamnese que a aluna pode fazer ao paciente;
    // marque "essencial": true nas que são realmente decisivas pro diagnóstico
  ],
  "exames": [
    { "id": string, "nome": string, "custo_tokens": number (1 a 4), "resultado": string (laudo resumido) }
    // 4 a 6 exames disponíveis, nem todos necessários — inclua exames pouco
    // úteis com custo baixo e o(s) decisivo(s) com custo mais alto
  ],
  "hipotese_correta": string (o diagnóstico correto, resumido),
  "condutas": [
    { "texto": string, "correta": boolean, "justificativa": string }
    // 4 opções de conduta, exatamente 1 correta
  ],
  "raciocinio_final": string (resumo do raciocínio clínico ideal do caso completo)
}`;
}

function promptAnamnese(materia: string, dificuldade: string) {
    return `${CABECALHO_BASE}

Crie um paciente virtual de ${materia}, nível de dificuldade "${dificuldade}",
para um simulador de entrevista clínica (anamnese) em formato de chat.

Formato exato do JSON:
{
  "paciente": {
    "nome": string (fictício),
    "idade": number,
    "sexo": string,
    "queixa": string (breve, 1 frase),
    "personalidade": string (1-2 palavras, ex: "Ansioso", "Reticente", "Colaborativo")
  },
  "diagnostico_secreto": string (o diagnóstico real do paciente, não revelado à aluna),
  "perguntas_essenciais": array de 4 a 7 strings (temas de pergunta que uma
    boa anamnese deveria cobrir para chegar no diagnóstico, ex: "início e
    evolução da dor", "sintomas associados", "história prévia relevante")
}`;
}

function promptResponderAnamnese(perfilPaciente: unknown, historico: unknown, novaPergunta: string) {
    return `${CABECALHO_BASE}

Você está interpretando o papel do paciente abaixo, respondendo à pergunta
da aluna em primeira pessoa, coerente com a personalidade e o diagnóstico
secreto (nunca revele o diagnóstico diretamente, apenas descreva sintomas
e sensações como um paciente real faria).

Perfil do paciente: ${JSON.stringify(perfilPaciente)}
Histórico de perguntas já feitas nesta conversa: ${JSON.stringify(historico)}
Nova pergunta da aluna: "${novaPergunta}"

Formato exato do JSON: { "resposta": string (a fala do paciente, em primeira pessoa) }`;
}

function promptAvaliarHipotese(hipoteseAluna: string, hipoteseCorreta: string) {
    return `${CABECALHO_BASE}

Avalie a hipótese diagnóstica da aluna comparando com a hipótese correta do caso.

Hipótese da aluna: "${hipoteseAluna}"
Hipótese correta do caso: "${hipoteseCorreta}"

Formato exato do JSON:
{
  "avaliacao": "correta" | "proxima" | "incorreta",
  "explicacao": string (avaliação do raciocínio da aluna + o raciocínio clínico ideal)
}

Use "correta" quando a hipótese é essencialmente a mesma (mesmo com palavras
diferentes); "proxima" quando está no caminho certo mas incompleta ou
imprecisa; "incorreta" quando é um diagnóstico diferente.`;
}

function promptAvaliarAnamnese(perfilPaciente: unknown, historico: unknown, perguntasEssenciais: unknown) {
    return `${CABECALHO_BASE}

Avalie a anamnese que a aluna conduziu com este paciente.

Perfil do paciente: ${JSON.stringify(perfilPaciente)}
Perguntas essenciais que o caso esperava: ${JSON.stringify(perguntasEssenciais)}
Histórico da conversa (perguntas da aluna e respostas do paciente): ${JSON.stringify(historico)}

Formato exato do JSON:
{
  "coletadas": array de strings (temas das perguntas essenciais que a aluna
    efetivamente cobriu, mesmo que com outras palavras),
  "esquecidas": array de strings (temas essenciais que a aluna não perguntou),
  "hipotese_inferida": string (o diagnóstico mais provável dado só o que foi
    perguntado e respondido nesta conversa — não o diagnostico_secreto)
}`;
}

const MODOS_GERACAO = new Set(["rapido", "interativo", "anamnese", "caso_do_dia"]);
const MODOS_CONVERSA = new Set(["responder_anamnese", "avaliar_hipotese", "avaliar_anamnese"]);

async function chamarGroq(groqApiKey: string, prompt: string, mensagemUsuario: string) {
    const resposta = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: mensagemUsuario },
            ],
        }),
    });

    if (!resposta.ok) {
        const detalhe = await resposta.text();
        throw new Error(`Falha ao chamar a Groq: ${detalhe}`);
    }

    const dados = await resposta.json();
    return dados.choices?.[0]?.message?.content ?? "";
}

function montarPrompt(modo: string, corpo: Record<string, unknown>) {
    const materia = typeof corpo.materia === "string" ? corpo.materia : "";
    const dificuldade = typeof corpo.dificuldade === "string" ? corpo.dificuldade : "medio";

    switch (modo) {
        case "rapido":
            if (!materia.trim()) throw new Error("Campo materia é obrigatório");
            return promptRapido(materia, dificuldade);
        case "interativo":
            if (!materia.trim()) throw new Error("Campo materia é obrigatório");
            return promptInterativo(materia, dificuldade, false);
        case "caso_do_dia":
            if (!materia.trim()) throw new Error("Campo materia é obrigatório");
            return promptInterativo(materia, dificuldade, true);
        case "anamnese":
            if (!materia.trim()) throw new Error("Campo materia é obrigatório");
            return promptAnamnese(materia, dificuldade);
        case "responder_anamnese":
            return promptResponderAnamnese(corpo.perfil_paciente, corpo.historico, String(corpo.nova_pergunta ?? ""));
        case "avaliar_hipotese":
            return promptAvaliarHipotese(String(corpo.hipotese_aluna ?? ""), String(corpo.hipotese_correta ?? ""));
        case "avaliar_anamnese":
            return promptAvaliarAnamnese(corpo.perfil_paciente, corpo.historico, corpo.perguntas_essenciais);
        default:
            throw new Error(`Modo desconhecido: ${modo}`);
    }
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

    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    if (!groqApiKey) {
        return new Response(
            JSON.stringify({ erro: "GROQ_API_KEY não configurada no projeto Supabase" }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    let corpo: Record<string, unknown>;
    try {
        corpo = await req.json();
    } catch {
        return new Response(
            JSON.stringify({ erro: "Corpo da requisição inválido" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    // "rapido" continua o padrão para não quebrar nenhuma chamada antiga
    // sem o campo `modo`.
    const modo = typeof corpo.modo === "string" ? corpo.modo : "rapido";

    if (!MODOS_GERACAO.has(modo) && !MODOS_CONVERSA.has(modo)) {
        return new Response(
            JSON.stringify({ erro: `Modo desconhecido: ${modo}` }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }

    const inicio = Date.now();

    try {
        const prompt = montarPrompt(modo, corpo);
        const mensagemUsuario = MODOS_GERACAO.has(modo)
            ? `Gere o caso agora, no formato JSON pedido.`
            : `Responda agora, no formato JSON pedido.`;

        const texto = await chamarGroq(groqApiKey, prompt, mensagemUsuario);

        await registrarLogUso({
            provedor: "Groq",
            modelo: GROQ_MODEL,
            funcionalidade: "casos-clinicos",
            sucesso: true,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(
            JSON.stringify({ texto }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        const status = mensagem.startsWith("Campo") ? 400 : 502;

        await registrarLogUso({
            provedor: "Groq",
            modelo: GROQ_MODEL,
            funcionalidade: "casos-clinicos",
            sucesso: false,
            erroMensagem: mensagem,
            tempoRespostaMs: Date.now() - inicio,
        });

        return new Response(
            JSON.stringify({ erro: mensagem }),
            { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});
