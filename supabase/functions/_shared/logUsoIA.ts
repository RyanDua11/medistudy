// Log de uso de IA — insere uma linha em public.log_uso_ia via REST direto
// (sem depender de @supabase/supabase-js dentro da Edge Function), usando
// SUPABASE_URL + SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY, nome
// legado) já disponíveis como secrets padrão em toda Edge Function.
//
// Deliberadamente "fire and forget, mas não silencioso": uma falha ao
// registrar o log nunca deve derrubar a resposta real ao usuário — só loga
// o erro no console da function.

export interface LogUsoIA {
    usuarioId?: string | null;
    provedor: string;
    modelo: string;
    funcionalidade: string;
    tokensInput?: number | null;
    tokensOutput?: number | null;
    sucesso: boolean;
    erroMensagem?: string | null;
    tempoRespostaMs: number;
}

export async function registrarLogUso(
    log: LogUsoIA,
    obterEnv: (nome: string) => string | undefined = (nome) => Deno.env.get(nome),
) {
    const supabaseUrl = obterEnv("SUPABASE_URL");
    const chave = obterEnv("SUPABASE_SECRET_KEY") ?? obterEnv("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !chave) {
        console.error("registrarLogUso: SUPABASE_URL/SUPABASE_SECRET_KEY não configurados, log não registrado");
        return;
    }

    try {
        const resposta = await fetch(`${supabaseUrl}/rest/v1/log_uso_ia`, {
            method: "POST",
            headers: {
                apikey: chave,
                Authorization: `Bearer ${chave}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                usuario_id: log.usuarioId ?? null,
                provedor: log.provedor,
                modelo: log.modelo,
                funcionalidade: log.funcionalidade,
                tokens_input: log.tokensInput ?? null,
                tokens_output: log.tokensOutput ?? null,
                sucesso: log.sucesso,
                erro_mensagem: log.erroMensagem ?? null,
                tempo_resposta_ms: log.tempoRespostaMs,
            }),
        });

        if (!resposta.ok) {
            const detalhe = await resposta.text();
            console.error(`registrarLogUso: falha ao inserir log (status ${resposta.status}): ${detalhe}`);
        }
    } catch (erro) {
        console.error("registrarLogUso: erro de rede ao inserir log:", erro);
    }
}
