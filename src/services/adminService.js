import { traduzErroSupabase } from "./erroAmigavel.js";

/**
 * Busca todos os dados do painel admin (uso por provedor, chamadas por dia,
 * usuárias, últimos erros) via Edge Function — a agregação roda inteira
 * server-side com a service role key, que nunca é exposta ao navegador (ver
 * supabase/functions/admin-painel/index.ts). Substituiu o client
 * supabaseAdminClient.js, que colocava a service role key no bundle do
 * browser: bypassa RLS pra quem inspecionasse o JS, e quebrava em produção
 * sempre que VITE_SUPABASE_SERVICE_KEY não estivesse configurada no host.
 */
export async function buscarPainelAdmin(supabaseClient) {
    const { data, error } = await supabaseClient.functions.invoke("admin-painel");

    if (error) throw new Error(traduzErroSupabase(error));
    if (data?.erro) throw new Error(data.erro);
    return data;
}
