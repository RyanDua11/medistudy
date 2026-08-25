// Lista central dos provedores de IA free-tier usados em cascata de fallback
// pelas Edge Functions de texto (chat-medistudy, gerar-caso-clinico). Todos
// falam o formato OpenAI-compatible (POST {model, messages, ...} em
// /chat/completions). Extraído de chat-medistudy pra ser reaproveitado sem
// duplicar a lista (e o risco de ela divergir entre funções).
//
// Requer os secrets configurados no projeto Supabase:
//   supabase secrets set GROQ_API_KEY=sua_chave_aqui
//   supabase secrets set GEMINI_API_KEY=sua_chave_aqui
//   supabase secrets set CEREBRAS_API_KEY=sua_chave_aqui
//   supabase secrets set OPENROUTER_API_KEY=sua_chave_aqui
//   supabase secrets set MISTRAL_API_KEY=sua_chave_aqui
//   supabase secrets set SAMBANOVA_API_KEY=sua_chave_aqui
//   supabase secrets set DEEPSEEK_API_KEY=sua_chave_aqui
//   supabase secrets set HUGGINGFACE_API_KEY=sua_chave_aqui
//   supabase secrets set NVIDIA_API_KEY=sua_chave_aqui
//   supabase secrets set GITHUB_MODELS_API_KEY=seu_pat_aqui
//   supabase secrets set COHERE_API_KEY=sua_chave_aqui
//   supabase secrets set CLOUDFLARE_API_KEY=sua_chave_aqui
//   supabase secrets set CLOUDFLARE_ACCOUNT_ID=seu_account_id_aqui

// Lida uma vez no carregamento do módulo — estável durante a vida do isolate
// (env vars não mudam entre invocações da mesma function deployada), usada
// só pra montar a URL da Cloudflare, que precisa do account_id no path (os
// demais provedores têm URL fixa). Se ausente, a URL fica com um buraco no
// meio (".../accounts//ai/..."), o fetch dá 404 e cai no fluxo de erro
// normal do fallback — não precisa de tratamento especial.
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";

export interface Provedor {
    nome: string;
    url: string;
    modelo: string;
    envVar: string;
}

// Ordem de fallback: tenta cada provedor nesta sequência, só passando para o
// próximo se o anterior lançar exceção.
export const PROVEDORES: Provedor[] = [
    {
        nome: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        modelo: "openai/gpt-oss-20b",
        envVar: "GROQ_API_KEY",
    },
    {
        nome: "Gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        modelo: "gemini-3.6-flash",
        envVar: "GEMINI_API_KEY",
    },
    {
        nome: "Cerebras",
        url: "https://api.cerebras.ai/v1/chat/completions",
        modelo: "gpt-oss-120b",
        envVar: "CEREBRAS_API_KEY",
    },
    {
        nome: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        modelo: "nvidia/nemotron-3-super-120b-a12b:free",
        envVar: "OPENROUTER_API_KEY",
    },
    {
        nome: "Mistral",
        url: "https://api.mistral.ai/v1/chat/completions",
        modelo: "mistral-small-latest",
        envVar: "MISTRAL_API_KEY",
    },
    {
        nome: "SambaNova",
        url: "https://api.sambanova.ai/v1/chat/completions",
        modelo: "Meta-Llama-3.3-70B-Instruct",
        envVar: "SAMBANOVA_API_KEY",
    },
    {
        nome: "DeepSeek",
        url: "https://api.deepseek.com/chat/completions",
        modelo: "deepseek-chat",
        envVar: "DEEPSEEK_API_KEY",
    },
    {
        nome: "HuggingFace",
        url: "https://router.huggingface.co/v1/chat/completions",
        modelo: "meta-llama/Llama-3.3-70B-Instruct",
        envVar: "HUGGINGFACE_API_KEY",
    },
    {
        nome: "NVIDIA",
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        modelo: "meta/llama-3.3-70b-instruct",
        envVar: "NVIDIA_API_KEY",
    },
    {
        nome: "GitHubModels",
        url: "https://models.github.ai/inference/chat/completions",
        modelo: "openai/gpt-4o-mini",
        envVar: "GITHUB_MODELS_API_KEY",
    },
    {
        // 1000 chamadas/mês grátis. Endpoint OpenAI-compatible oficial da
        // Cohere (não precisa do SDK deles nem de payload no formato nativo).
        nome: "Cohere",
        url: "https://api.cohere.com/compatibility/v1/chat/completions",
        modelo: "command-r-plus",
        envVar: "COHERE_API_KEY",
    },
    {
        // Cloudflare Workers AI. Tem sim um endpoint OpenAI-compatible
        // (não precisa do formato nativo "/ai/run/@cf/..."), mas o path
        // inclui o account_id — só a Cloudflare, entre todos os provedores
        // daqui, precisa de uma segunda credencial além da API key (ver
        // CLOUDFLARE_ACCOUNT_ID acima). Modelo é gratuito na Workers AI.
        nome: "CloudflareWorkersAI",
        url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
        modelo: "@cf/meta/llama-3.1-8b-instruct",
        envVar: "CLOUDFLARE_API_KEY",
    },
];

/** Provedores com suporte a entrada multimodal (imagem via image_url em data URI), pro Interpretador de Exames. */
export const PROVEDORES_VISAO: Provedor[] = [
    {
        nome: "Gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        modelo: "gemini-3.6-flash",
        envVar: "GEMINI_API_KEY",
    },
    {
        nome: "Mistral",
        url: "https://api.mistral.ai/v1/chat/completions",
        modelo: "pixtral-12b-2409",
        envVar: "MISTRAL_API_KEY",
    },
    {
        nome: "OpenRouter",
        url: "https://openrouter.ai/api/v1/chat/completions",
        modelo: "meta-llama/llama-3.2-11b-vision-instruct:free",
        envVar: "OPENROUTER_API_KEY",
    },
];
