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
        modelo: "google/gemma-4-31b-it:free",
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
