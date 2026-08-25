// Lógica pura dos Casos Clínicos v2: pontuação do modo Rápido, orçamento de
// tokens do modo Interativo, Caso do Dia e comparação com colegas. Nenhuma
// função aqui faz I/O — só recebe dados já carregados e calcula.

const TOKENS_INICIAIS_PADRAO = 10;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

// --- modo Rápido: perguntas, pontuação, revisão ---

/**
 * Normaliza um caso para a lista de perguntas do modo Rápido. Casos novos
 * guardam o array completo em `perguntas`; casos antigos (schema de 1
 * pergunta por caso) caem no fallback a partir das colunas legadas.
 */
export function obterPerguntas(caso) {
    if (Array.isArray(caso?.perguntas) && caso.perguntas.length > 0) return caso.perguntas;

    if (caso?.pergunta) {
        return [
            {
                pergunta: caso.pergunta,
                alternativas: caso.alternativas,
                alternativa_correta: caso.alternativa_correta,
                explicacao: caso.explicacao,
            },
        ];
    }

    return [];
}

/** respostas: array de índices escolhidos, na mesma ordem de `perguntas` (null = não respondida). */
export function calcularScoreRapido(perguntas, respostas) {
    const total = perguntas.length;
    const acertos = perguntas.reduce(
        (soma, pergunta, indice) => soma + (respostas[indice] === pergunta.alternativa_correta ? 1 : 0),
        0
    );
    const percentual = total === 0 ? 0 : Math.round((acertos / total) * 100);
    return { acertos, total, percentual };
}

export function identificarPontosParaRevisar(perguntas, respostas) {
    return perguntas
        .map((pergunta, indice) => ({
            pergunta: pergunta.pergunta,
            explicacao: pergunta.explicacao,
            acertou: respostas[indice] === pergunta.alternativa_correta,
        }))
        .filter((item) => !item.acertou);
}

// --- modo Interativo: orçamento de tokens dos exames ---

export function calcularTokensRestantes(exames, examesRealizadosIds, tokensIniciais = TOKENS_INICIAIS_PADRAO) {
    const gastos = exames
        .filter((exame) => examesRealizadosIds.includes(exame.id))
        .reduce((soma, exame) => soma + exame.custo_tokens, 0);
    return tokensIniciais - gastos;
}

export function podeRealizarExame(exame, tokensRestantes) {
    return exame.custo_tokens <= tokensRestantes;
}

// --- Caso do Dia ---

// data_caso é uma coluna `date default current_date` no Postgres (migration
// 010) — o Supabase roda em UTC, então current_date reflete o dia em UTC no
// momento do insert. Comparar com a data LOCAL do navegador (getFullYear/
// getMonth/getDate) causa falso-negativo em fusos atrás de UTC (ex: Brasil,
// UTC-3) durante a janela em que UTC já virou o dia mas o horário local
// ainda não (~21h-00h local) — o app acha que não existe caso do dia e tenta
// gerar um novo à toa. Por isso a comparação usa UTC dos dois lados.
function formatarDataISO(data) {
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(data.getUTCDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

/** O Caso do Dia é o mesmo para todas as usuárias — compara a data salva com a data de hoje em UTC (ver nota acima). */
export function ehCasoDeHoje(caso, agora = new Date()) {
    if (!caso?.data_caso) return false;
    return caso.data_caso.slice(0, 10) === formatarDataISO(agora);
}

export function jaResolveuHoje(caso, usuarioId) {
    return Array.isArray(caso?.usuarios_resolveram_hoje) && caso.usuarios_resolveram_hoje.includes(usuarioId);
}

// --- streak e taxa de acerto por período (histórico) ---

function chaveDiaLocal(data) {
    const d = new Date(data);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function calcularStreakCasos(logs, agora = new Date()) {
    if (logs.length === 0) return 0;

    const diasComResolucao = new Set(logs.map((log) => chaveDiaLocal(log.resolvido_em)));
    const hoje = agora;
    const ontem = new Date(hoje.getTime() - UM_DIA_MS);

    const resolveuHoje = diasComResolucao.has(chaveDiaLocal(hoje));
    const resolveuOntem = diasComResolucao.has(chaveDiaLocal(ontem));

    if (!resolveuHoje && !resolveuOntem) return 0;

    let cursor = resolveuHoje ? hoje : ontem;
    let streak = 0;

    while (diasComResolucao.has(chaveDiaLocal(cursor))) {
        streak++;
        cursor = new Date(cursor.getTime() - UM_DIA_MS);
    }

    return streak;
}

export function calcularTaxaAcertoPeriodo(logs, dias, agora = new Date()) {
    const limite = agora.getTime() - dias * UM_DIA_MS;
    const logsNoPeriodo = logs.filter((log) => new Date(log.resolvido_em).getTime() >= limite);

    if (logsNoPeriodo.length === 0) return 0;

    const acertos = logsNoPeriodo.filter((log) => log.acertou).length;
    return Math.round((acertos / logsNoPeriodo.length) * 100);
}

// --- comparação com colegas ---

/**
 * Agrupa o histórico compartilhado por usuária e calcula taxa de acerto da
 * semana + sequência de dias para cada uma. Não assume nomes/e-mails
 * conhecidos: rotula a usuária logada como "Você" e as demais como
 * "Colega 1", "Colega 2"... em ordem alfabética de id, para um resultado
 * determinístico sem expor dados pessoais que o app não tem acesso a ler.
 */
export function calcularComparacaoColegas(logs, usuarioIdAtual, agora = new Date()) {
    const idsUnicos = [...new Set(logs.map((log) => log.usuario_id))];
    const outrosIds = idsUnicos.filter((id) => id !== usuarioIdAtual).sort();

    const rotularUsuario = (id) => {
        if (id === usuarioIdAtual) return "Você";
        const posicao = outrosIds.indexOf(id) + 1;
        return `Colega ${posicao}`;
    };

    return idsUnicos
        .map((id) => {
            const logsDoUsuario = logs.filter((log) => log.usuario_id === id);
            return {
                usuarioId: id,
                rotulo: rotularUsuario(id),
                taxaAcertoSemana: calcularTaxaAcertoPeriodo(logsDoUsuario, 7, agora),
                streak: calcularStreakCasos(logsDoUsuario, agora),
            };
        })
        .sort((a, b) => (a.rotulo === "Você" ? -1 : b.rotulo === "Você" ? 1 : a.rotulo.localeCompare(b.rotulo)));
}
