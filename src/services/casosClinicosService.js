import { supabase } from "./supabaseClient.js";
import { obterIdUsuarioLogado } from "./authService.js";
import {
    validarCasoRapido,
    validarCasoInterativo,
    validarCasoAnamnese,
    validarRespostaAnamnese,
    validarAvaliacaoHipotese,
    validarAvaliacaoAnamnese,
} from "./validacaoCasoClinicoV2.js";
import { ehCasoDeHoje } from "./casosClinicosLogica.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

const TABELA_CASOS_CLINICOS = "casos_clinicos";
const TABELA_LOG_RESOLUCOES_CASOS = "log_resolucoes_casos";
const MATERIAS_DISPONIVEIS = [
    "Farmacologia II",
    "Patologia Clínica",
    "Semiologia IV",
    "Microbiologia",
    "Parasitologia",
    "Humanidades",
];

async function chamarEdgeFunction(corpo) {
    const { data, error } = await supabase.functions.invoke("gerar-caso-clinico", { body: corpo });
    if (error) throw new Error(traduzErroSupabase(error));
    if (data?.erro) throw new Error(data.erro);
    return data.texto;
}

function escolherMateriaAleatoria() {
    return MATERIAS_DISPONIVEIS[Math.floor(Math.random() * MATERIAS_DISPONIVEIS.length)];
}

// --- modo Rápido ---

export async function criarCasoRapido(materia, dificuldade = "medio") {
    const texto = await chamarEdgeFunction({ modo: "rapido", materia, dificuldade });
    const caso = validarCasoRapido(texto);
    const userId = await obterIdUsuarioLogado();
    const primeiraPergunta = caso.perguntas[0];

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .insert({
            materia,
            dificuldade,
            modo: "rapido",
            criado_por: userId,
            enunciado: caso.enunciado,
            perguntas: caso.perguntas,
            // colunas legadas preenchidas com a 1ª pergunta, por compatibilidade
            // com qualquer leitura antiga do schema de 1 pergunta por caso.
            pergunta: primeiraPergunta.pergunta,
            alternativas: primeiraPergunta.alternativas,
            alternativa_correta: primeiraPergunta.alternativa_correta,
            explicacao: primeiraPergunta.explicacao,
        })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

// --- modo Interativo ---

export async function criarCasoInterativo(materia, dificuldade = "medio") {
    const texto = await chamarEdgeFunction({ modo: "interativo", materia, dificuldade });
    const caso = validarCasoInterativo(texto);
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .insert({
            materia,
            dificuldade,
            modo: "interativo",
            criado_por: userId,
            enunciado: caso.paciente.queixa_principal,
            dados_interativo: caso,
        })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function avaliarHipotese(hipoteseAluna, hipoteseCorreta) {
    const texto = await chamarEdgeFunction({ modo: "avaliar_hipotese", hipotese_aluna: hipoteseAluna, hipotese_correta: hipoteseCorreta });
    return validarAvaliacaoHipotese(texto);
}

// --- modo Simulador de Anamnese ---

export async function criarCasoAnamnese(materia, dificuldade = "medio") {
    const texto = await chamarEdgeFunction({ modo: "anamnese", materia, dificuldade });
    const caso = validarCasoAnamnese(texto);
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .insert({
            materia,
            dificuldade,
            modo: "anamnese",
            criado_por: userId,
            enunciado: caso.paciente.queixa,
            dados_interativo: caso,
            historico_anamnese: [],
        })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function responderAnamnese(perfilPaciente, historico, novaPergunta) {
    const texto = await chamarEdgeFunction({
        modo: "responder_anamnese",
        perfil_paciente: perfilPaciente,
        historico,
        nova_pergunta: novaPergunta,
    });
    return validarRespostaAnamnese(texto).resposta;
}

export async function avaliarAnamnese(perfilPaciente, historico, perguntasEssenciais) {
    const texto = await chamarEdgeFunction({
        modo: "avaliar_anamnese",
        perfil_paciente: perfilPaciente,
        historico,
        perguntas_essenciais: perguntasEssenciais,
    });
    return validarAvaliacaoAnamnese(texto);
}

export async function salvarHistoricoAnamnese(casoId, historico) {
    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .update({ historico_anamnese: historico })
        .eq("id", casoId)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

// --- Caso do Dia ---

/**
 * Busca o Caso do Dia já gerado para hoje; se ainda não existe nenhum,
 * gera e salva um novo (a primeira usuária a abrir a tela no dia gera pra
 * todas — visitas seguintes no mesmo dia reaproveitam o mesmo caso).
 */
export async function buscarOuGerarCasoDoDia() {
    const { data: casosDeHoje, error: erroBusca } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .select()
        .eq("tipo", "caso_do_dia")
        .order("criado_em", { ascending: false })
        .limit(1);

    if (erroBusca) throw new Error(traduzErroSupabase(erroBusca));

    const casoExistente = casosDeHoje?.[0];
    if (casoExistente && ehCasoDeHoje(casoExistente)) {
        return casoExistente;
    }

    const materia = escolherMateriaAleatoria();
    const texto = await chamarEdgeFunction({ modo: "caso_do_dia", materia, dificuldade: "medio" });
    const caso = validarCasoInterativo(texto);
    const userId = await obterIdUsuarioLogado();

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .insert({
            materia,
            dificuldade: "medio",
            modo: "interativo",
            tipo: "caso_do_dia",
            criado_por: userId,
            enunciado: caso.paciente.queixa_principal,
            dados_interativo: caso,
        })
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

export async function marcarResolvidoHoje(casoId, jaResolveramAntes) {
    const userId = await obterIdUsuarioLogado();
    if (jaResolveramAntes.includes(userId)) return null;

    const { data, error } = await supabase
        .from(TABELA_CASOS_CLINICOS)
        .update({ usuarios_resolveram_hoje: [...jaResolveramAntes, userId] })
        .eq("id", casoId)
        .select()
        .single();

    if (error) throw new Error(traduzErroSupabase(error));
    return data;
}

// --- leitura geral / histórico ---

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
