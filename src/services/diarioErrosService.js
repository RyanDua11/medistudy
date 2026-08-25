import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";

const TABELA_ERROS = "erros_estudo";
const UMA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Registra um erro de estudo no diário — silencioso: nunca lança, só loga no
 * console em caso de falha, pra nunca interromper o fluxo real (revisão de
 * flashcard, resolução de caso clínico) por causa de um insert secundário.
 */
export async function registrarErroEstudo({ ferramenta, materia = null, topico = null, perguntaResumo = null, respostaUsuario = null, respostaCorreta = null }) {
    try {
        const usuarioId = await obterIdUsuarioLogado();
        const { error } = await supabase.from(TABELA_ERROS).insert({
            usuario_id: usuarioId,
            ferramenta,
            materia,
            topico,
            pergunta_resumo: perguntaResumo,
            resposta_usuario: respostaUsuario,
            resposta_correta: respostaCorreta,
        });
        if (error) console.error("registrarErroEstudo: falha ao gravar erro no diário:", error);
    } catch (erro) {
        console.error("registrarErroEstudo: falha ao gravar erro no diário:", erro);
    }
}

export async function listarErrosRecentes(limite = 20) {
    const { data, error } = await supabase
        .from(TABELA_ERROS)
        .select()
        .order("criado_em", { ascending: false })
        .limit(limite);

    if (error) throw error;
    return data ?? [];
}

/** Agrupa erros por matéria (com contagem por tópico dentro dela), ordenado do maior pro menor volume. */
export function agruparErrosPorMateria(erros) {
    const porMateria = new Map();

    for (const erro of erros) {
        const materia = erro.materia ?? "Sem matéria";
        const atual = porMateria.get(materia) ?? { materia, total: 0, topicos: new Map() };
        atual.total += 1;

        const topico = erro.topico ?? "Geral";
        atual.topicos.set(topico, (atual.topicos.get(topico) ?? 0) + 1);

        porMateria.set(materia, atual);
    }

    const maiorTotal = Math.max(...[...porMateria.values()].map((m) => m.total), 1);

    return [...porMateria.values()]
        .map((m) => ({
            materia: m.materia,
            total: m.total,
            percentual: Math.round((m.total / maiorTotal) * 100),
            topicos: [...m.topicos.entries()].map(([topico, total]) => ({ topico, total })).sort((a, b) => b.total - a.total),
        }))
        .sort((a, b) => b.total - a.total);
}

/** Agrupa erros por semana (início da semana, segunda-feira, formato YYYY-MM-DD) nas últimas `semanas` semanas. */
export function agruparErrosPorSemana(erros, semanas = 8) {
    const inicioSemana = (data) => {
        const d = new Date(data);
        const diaSemana = d.getUTCDay();
        const deslocamento = diaSemana === 0 ? 6 : diaSemana - 1;
        d.setUTCDate(d.getUTCDate() - deslocamento);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    };

    const hoje = inicioSemana(new Date());
    const semanasOrdenadas = [];
    for (let i = semanas - 1; i >= 0; i--) {
        const inicio = new Date(hoje);
        inicio.setUTCDate(inicio.getUTCDate() - i * 7);
        semanasOrdenadas.push(inicio.toISOString().slice(0, 10));
    }

    const contagem = new Map(semanasOrdenadas.map((s) => [s, 0]));
    for (const erro of erros) {
        const chave = inicioSemana(erro.criado_em).toISOString().slice(0, 10);
        if (contagem.has(chave)) contagem.set(chave, contagem.get(chave) + 1);
    }

    return semanasOrdenadas.map((semana) => ({ semana, total: contagem.get(semana) }));
}

export async function buscarErrosDesde(dataInicioIso) {
    const { data, error } = await supabase.from(TABELA_ERROS).select().gte("criado_em", dataInicioIso).order("criado_em", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function buscarPainelDiarioErros() {
    const desde = new Date(Date.now() - 8 * UMA_SEMANA_MS).toISOString();
    const [errosRecentes, errosParaEvolucao] = await Promise.all([listarErrosRecentes(20), buscarErrosDesde(desde)]);

    return {
        errosRecentes,
        padroesPorMateria: agruparErrosPorMateria(errosParaEvolucao),
        evolucaoSemanal: agruparErrosPorSemana(errosParaEvolucao, 8),
    };
}
