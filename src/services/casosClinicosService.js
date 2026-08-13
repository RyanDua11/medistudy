import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";
import { validarCasoClinico } from "./validacaoCasoClinico.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

const TABELA_CASOS_CLINICOS = "casos_clinicos";
const TABELA_LOG_RESOLUCOES_CASOS = "log_resolucoes_casos";

export async function gerarCasoClinico(materia) {
    const { data, error } = await supabase.functions.invoke("gerar-caso-clinico", {
        body: { materia },
    });

    if (error) throw new Error(traduzErroSupabase(error));
    if (data?.erro) throw new Error(data.erro);

    return data.texto;
}

export async function criarCasoClinico(materia) {
    const texto = await gerarCasoClinico(materia);
    const caso = validarCasoClinico(texto);
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .insert({ materia, criado_por: userId, ...caso })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function registrarResolucaoCaso(casoClinicoId, alternativaEscolhida, acertou) {
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_LOG_RESOLUCOES_CASOS)
        .insert({
            caso_clinico_id: casoClinicoId,
            usuario_id: userId,
            alternativa_escolhida: alternativaEscolhida,
            acertou,
        })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function listarLogResolucoesCasos() {
    const { data, error } = await supabase
        .from(TABELA_LOG_RESOLUCOES_CASOS)
        .select()
        .order("resolvido_em", { ascending: false });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function listarCasosClinicos() {
    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .select()
        .order("criado_em", { ascending: false });

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}
