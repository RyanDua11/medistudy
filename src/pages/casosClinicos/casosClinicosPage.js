import { protegerRota } from "../../services/routeGuard.js";
import { obterIdUsuarioLogado } from "../../services/authService.js";
import {
    criarCasoRapido,
    criarCasoInterativo,
    avaliarHipotese,
    criarCasoAnamnese,
    responderAnamnese,
    avaliarAnamnese,
    salvarHistoricoAnamnese,
    buscarOuGerarCasoDoDia,
    marcarResolvidoHoje,
    registrarResolucaoCaso,
    listarLogResolucoesCasos,
    listarCasosClinicos,
} from "../../services/casosClinicosService.js";
import {
    obterPerguntas,
    calcularScoreRapido,
    identificarPontosParaRevisar,
    calcularTokensRestantes,
    podeRealizarExame,
    ehCasoDeHoje,
    jaResolveuHoje,
    calcularStreakCasos,
    calcularComparacaoColegas,
} from "../../services/casosClinicosLogica.js";
import { calcularCasosResolvidos, calcularTaxaAcertoCasos } from "../../services/estatisticas.js";
import { corPorMateria } from "../../services/corMateria.js";
import { criarElementoCasoClinico } from "../../components/casoClinicoCard.js";
import { inicializarUsuarioMenu } from "../../components/usuarioMenu.js";
import { inicializarNotificacaoRevisao } from "../../components/notificacaoRevisao.js";
import { inicializarNavegacaoPrincipal } from "../../components/navegacaoPrincipal.js";
import { inicializarPomodoroWidget } from "../../components/pomodoroWidget.js";
import { aplicarEntradaEscalonada } from "../../components/entradaEscalonada.js";
import { melhorarSelect } from "../../components/selectPersonalizado.js";

const TELAS = Object.freeze({
    ESCOLHA: "escolha",
    RAPIDO: "rapido",
    INTERATIVO: "interativo",
    ANAMNESE: "anamnese",
    HISTORICO: "historico",
});

const MATERIAS_DISPONIVEIS = [
    "Farmacologia II",
    "Patologia Clínica",
    "Semiologia IV",
    "Microbiologia",
    "Parasitologia",
    "Humanidades",
];

const ORDEM_ETAPAS_INTERATIVO = ["apresentacao", "anamnese", "exames", "hipotese", "conduta"];
const TOKENS_INICIAIS_INTERATIVO = 10;

const ROTULOS_MODO = { rapido: "⚡ Caso Rápido", interativo: "🩺 Caso Interativo", anamnese: "💬 Anamnese" };
const ROTULOS_AVALIACAO_HIPOTESE = { correta: "Correta", proxima: "Próxima", incorreta: "Incorreta" };

// --- referências DOM ---

const telas = document.querySelectorAll(".tela-modo");
const botoesVoltar = document.querySelectorAll("[data-voltar]");
const mensagemCasos = document.getElementById("mensagem-casos");

// tela 1 — escolha
const casoDoDiaEl = document.getElementById("caso-do-dia");
const casoDoDiaResumo = document.getElementById("caso-do-dia-resumo");
const casoDoDiaMateria = document.getElementById("caso-do-dia-materia");
const casoDoDiaResolveram = document.getElementById("caso-do-dia-resolveram");
const botaoResolverCasoDoDia = document.getElementById("botao-resolver-caso-do-dia");
const botaoModoRapido = document.getElementById("botao-modo-rapido");
const botaoModoInterativo = document.getElementById("botao-modo-interativo");
const botaoModoAnamnese = document.getElementById("botao-modo-anamnese");
const selectMateriaPersonalizar = document.getElementById("select-materia-personalizar");
const pillsDificuldade = document.querySelectorAll(".dificuldade-pill");
const botaoIrHistorico = document.getElementById("botao-ir-historico");

// tela 2 — rápido
const rapidoCarregando = document.getElementById("rapido-carregando");
const rapidoSessao = document.getElementById("rapido-sessao");
const rapidoProgressoBadge = document.getElementById("rapido-progresso-badge");
const rapidoProgressoBarra = document.getElementById("rapido-progresso-barra");
const rapidoEnunciado = document.getElementById("rapido-enunciado");
const rapidoEnunciadoRepeticao = document.getElementById("rapido-enunciado-repeticao");
const rapidoPerguntaTexto = document.getElementById("rapido-pergunta-texto");
const rapidoAlternativas = document.getElementById("rapido-alternativas");
const rapidoFeedback = document.getElementById("rapido-feedback");
const rapidoExplicacao = document.getElementById("rapido-explicacao");
const botaoRapidoProxima = document.getElementById("botao-rapido-proxima");
const rapidoResultado = document.getElementById("rapido-resultado");
const rapidoScoreFracao = document.getElementById("rapido-score-fracao");
const rapidoScorePercentual = document.getElementById("rapido-score-percentual");
const rapidoResumoPerguntas = document.getElementById("rapido-resumo-perguntas");
const rapidoPontosRevisar = document.getElementById("rapido-pontos-revisar");
const rapidoPontosRevisarLista = document.getElementById("rapido-pontos-revisar-lista");
const rapidoExplicacoesCompletas = document.getElementById("rapido-explicacoes-completas");
const botaoRapidoVerExplicacoes = document.getElementById("botao-rapido-ver-explicacoes");
const botaoRapidoTentarOutro = document.getElementById("botao-rapido-tentar-outro");

// tela 3 — interativo
const interativoCarregando = document.getElementById("interativo-carregando");
const interativoEtapasBarra = document.getElementById("interativo-etapas-barra");
const interativoEtapasItens = document.querySelectorAll("#interativo-etapas-barra li");

const interativoEtapaApresentacao = document.getElementById("interativo-etapa-apresentacao");
const apresentacaoNome = document.getElementById("apresentacao-nome");
const apresentacaoIdadeSexo = document.getElementById("apresentacao-idade-sexo");
const apresentacaoQueixa = document.getElementById("apresentacao-queixa");
const apresentacaoSinaisVitais = document.getElementById("apresentacao-sinais-vitais");
const botaoIniciarAnamnese = document.getElementById("botao-iniciar-anamnese");

const interativoEtapaAnamnese = document.getElementById("interativo-etapa-anamnese");
const anamneseNomeInterativo = document.getElementById("anamnese-nome");
const anamneseIdadeSexoInterativo = document.getElementById("anamnese-idade-sexo");
const anamneseQueixaInterativo = document.getElementById("anamnese-queixa");
const anamneseSinaisVitaisInterativo = document.getElementById("anamnese-sinais-vitais");
const anamnesePerguntasLista = document.getElementById("anamnese-perguntas-lista");
const botaoAnamnesePerguntar = document.getElementById("botao-anamnese-perguntar");
const botaoIrExames = document.getElementById("botao-ir-exames");

const interativoEtapaExames = document.getElementById("interativo-etapa-exames");
const examesTokensRestantes = document.getElementById("exames-tokens-restantes");
const examesLista = document.getElementById("exames-lista");
const botaoFormularHipotese = document.getElementById("botao-formular-hipotese");

const interativoEtapaHipotese = document.getElementById("interativo-etapa-hipotese");
const campoHipotese = document.getElementById("campo-hipotese");
const contadorHipotese = document.getElementById("contador-hipotese");
const botaoEnviarHipotese = document.getElementById("botao-enviar-hipotese");
const hipoteseFeedback = document.getElementById("hipotese-feedback");
const hipoteseBadge = document.getElementById("hipotese-badge");
const hipoteseAvaliacaoTexto = document.getElementById("hipotese-avaliacao-texto");
const hipoteseRaciocinioIdeal = document.getElementById("hipotese-raciocinio-ideal");
const botaoIrConduta = document.getElementById("botao-ir-conduta");

const interativoEtapaConduta = document.getElementById("interativo-etapa-conduta");
const condutaOpcoes = document.getElementById("conduta-opcoes");
const condutaFeedback = document.getElementById("conduta-feedback");
const condutaDesfecho = document.getElementById("conduta-desfecho");
const botaoVerResultadoInterativo = document.getElementById("botao-ver-resultado-interativo");

const interativoResultado = document.getElementById("interativo-resultado");
const interativoScorePercentual = document.getElementById("interativo-score-percentual");
const interativoResumoEtapas = document.getElementById("interativo-resumo-etapas");
const interativoTokensUsados = document.getElementById("interativo-tokens-usados");
const botaoInterativoTentarOutro = document.getElementById("botao-interativo-tentar-outro");

// tela 4 — anamnese
const anamneseCarregando = document.getElementById("anamnese-carregando");
const anamneseChatTela = document.getElementById("anamnese-chat-tela");
const anamneseChatDescricao = document.getElementById("anamnese-chat-descricao");
const anamneseChatPersonalidade = document.getElementById("anamnese-chat-personalidade");
const anamneseMensagens = document.getElementById("anamnese-mensagens");
const formAnamneseChat = document.getElementById("form-anamnese-chat");
const campoAnamnesePergunta = document.getElementById("campo-anamnese-pergunta");
const botaoEncerrarAnamnese = document.getElementById("botao-encerrar-anamnese");
const anamneseFeedbackTela = document.getElementById("anamnese-feedback-tela");
const anamneseHistoricoLeitura = document.getElementById("anamnese-historico-leitura");
const anamneseColetadasLista = document.getElementById("anamnese-coletadas-lista");
const anamneseEsquecidasLista = document.getElementById("anamnese-esquecidas-lista");
const anamneseHipoteseInferida = document.getElementById("anamnese-hipotese-inferida");
const botaoAnamneseTentarOutro = document.getElementById("botao-anamnese-tentar-outro");

// tela 5 — histórico
const historicoTaxaGeral = document.getElementById("historico-taxa-geral");
const historicoCasosResolvidos = document.getElementById("historico-casos-resolvidos");
const historicoStreak = document.getElementById("historico-streak");
const historicoListaCasos = document.getElementById("historico-lista-casos");
const historicoVazio = document.getElementById("historico-vazio");
const historicoComparacaoLista = document.getElementById("historico-comparacao-lista");

// --- estado ---

let usuarioId = null;
let casoDoDia = null;

let sessaoAtual = { materia: "", dificuldade: "medio" };

let rapidoCaso = null;
let rapidoPerguntas = [];
let rapidoRespostas = [];
let rapidoIndice = 0;
let rapidoExplicacoesPopuladas = false;

let interativoCasoRow = null;
let interativoDados = null;
let interativoEhCasoDoDia = false;
let examesRealizadosIds = [];
let perguntaAnamneseSelecionadaId = null;
let hipoteseAvaliacao = null;
let condutaEscolhidaIndice = null;

let anamneseCasoRow = null;
let anamneseDados = null;
let anamneseHistoricoConversa = [];

let casos = [];
let logsResolucoes = [];

// --- utilitários gerais ---

function mostrarTela(tela) {
    telas.forEach((secao) => {
        secao.hidden = secao.dataset.tela !== tela;
    });
}

function mostrarMensagem(texto) {
    mensagemCasos.textContent = texto;
    mensagemCasos.hidden = false;
}

function limparMensagem() {
    mensagemCasos.hidden = true;
    mensagemCasos.textContent = "";
}

function materiaEscolhidaOuAleatoria() {
    const valor = selectMateriaPersonalizar.value;
    if (valor) return valor;
    return MATERIAS_DISPONIVEIS[Math.floor(Math.random() * MATERIAS_DISPONIVEIS.length)];
}

function renderSinaisVitais(elementoDl, sinaisVitais) {
    elementoDl.innerHTML = "";
    const rotulos = { fc: "FC", fr: "FR", pa: "PA", temperatura: "Temp.", sato2: "SatO₂" };
    Object.entries(rotulos).forEach(([campo, rotulo]) => {
        const dt = document.createElement("dt");
        dt.textContent = rotulo;
        const dd = document.createElement("dd");
        dd.textContent = sinaisVitais?.[campo] ?? "—";
        elementoDl.appendChild(dt);
        elementoDl.appendChild(dd);
    });
}

function irParaEscolha() {
    limparMensagem();
    mostrarTela(TELAS.ESCOLHA);
}

botoesVoltar.forEach((botao) => botao.addEventListener("click", irParaEscolha));

// --- modo Rápido ---

function resetTelaRapido() {
    rapidoCarregando.hidden = true;
    rapidoSessao.hidden = true;
    rapidoResultado.hidden = true;
    rapidoExplicacoesCompletas.hidden = true;
    rapidoExplicacoesPopuladas = false;
}

async function iniciarModoRapido(materia, dificuldade) {
    limparMensagem();
    sessaoAtual = { materia, dificuldade };
    mostrarTela(TELAS.RAPIDO);
    resetTelaRapido();
    rapidoCarregando.hidden = false;

    try {
        rapidoCaso = await criarCasoRapido(materia, dificuldade);
        rapidoPerguntas = obterPerguntas(rapidoCaso);
        rapidoRespostas = new Array(rapidoPerguntas.length).fill(null);
        rapidoIndice = 0;
        rapidoSessao.hidden = false;
        renderizarPerguntaRapido();
    } catch (erro) {
        mostrarMensagem(erro.message);
        mostrarTela(TELAS.ESCOLHA);
    } finally {
        rapidoCarregando.hidden = true;
    }
}

function renderizarPerguntaRapido() {
    const pergunta = rapidoPerguntas[rapidoIndice];

    rapidoProgressoBadge.textContent = `Pergunta ${rapidoIndice + 1}/${rapidoPerguntas.length}`;
    rapidoProgressoBarra.style.width = `${Math.round((rapidoIndice / rapidoPerguntas.length) * 100)}%`;
    rapidoEnunciado.textContent = rapidoCaso.enunciado;
    rapidoEnunciadoRepeticao.hidden = rapidoIndice === 0;
    rapidoPerguntaTexto.textContent = pergunta.pergunta;
    rapidoFeedback.hidden = true;

    rapidoAlternativas.innerHTML = "";
    pergunta.alternativas.forEach((alternativa, indice) => {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "resolucao-alternativa";
        botao.textContent = alternativa;
        botao.addEventListener("click", () => tratarRespostaRapido(indice, botao));
        item.appendChild(botao);
        rapidoAlternativas.appendChild(item);
    });
}

async function tratarRespostaRapido(indiceEscolhido, botaoEscolhido) {
    const pergunta = rapidoPerguntas[rapidoIndice];
    const botoes = rapidoAlternativas.querySelectorAll(".resolucao-alternativa");
    botoes.forEach((botao) => (botao.disabled = true));

    const acertou = indiceEscolhido === pergunta.alternativa_correta;
    botaoEscolhido.classList.add(acertou ? "resolucao-correta" : "resolucao-incorreta");
    if (!acertou) botoes[pergunta.alternativa_correta].classList.add("resolucao-correta");

    rapidoRespostas[rapidoIndice] = indiceEscolhido;
    rapidoExplicacao.textContent = pergunta.explicacao;
    rapidoFeedback.hidden = false;

    try {
        await registrarResolucaoCaso(rapidoCaso.id, indiceEscolhido, acertou);
    } catch (erro) {
        mostrarMensagem(`Resposta registrada aqui, mas não foi possível salvar seu histórico: ${erro.message}`);
    }
}

function finalizarRapido() {
    rapidoSessao.hidden = true;
    rapidoResultado.hidden = false;

    const { acertos, total, percentual } = calcularScoreRapido(rapidoPerguntas, rapidoRespostas);
    rapidoScoreFracao.textContent = `${acertos}/${total}`;
    rapidoScorePercentual.textContent = `${percentual}%`;

    rapidoResumoPerguntas.innerHTML = "";
    rapidoPerguntas.forEach((pergunta, indice) => {
        const acertou = rapidoRespostas[indice] === pergunta.alternativa_correta;
        const item = document.createElement("li");
        item.className = acertou ? "rapido-resumo-acertou" : "rapido-resumo-errou";
        item.textContent = `${acertou ? "✓" : "✗"} ${pergunta.pergunta}`;
        rapidoResumoPerguntas.appendChild(item);
    });

    const pontos = identificarPontosParaRevisar(rapidoPerguntas, rapidoRespostas);
    rapidoPontosRevisar.hidden = pontos.length === 0;
    rapidoPontosRevisarLista.innerHTML = "";
    pontos.forEach((ponto) => {
        const item = document.createElement("li");
        item.textContent = `${ponto.pergunta} — ${ponto.explicacao}`;
        rapidoPontosRevisarLista.appendChild(item);
    });
}

function alternarExplicacoesCompletas() {
    if (!rapidoExplicacoesPopuladas) {
        rapidoExplicacoesCompletas.innerHTML = "";
        rapidoPerguntas.forEach((pergunta, indice) => {
            const bloco = document.createElement("div");
            bloco.className = "rapido-explicacao-item";
            const titulo = document.createElement("p");
            titulo.className = "resolucao-pergunta";
            titulo.textContent = pergunta.pergunta;
            const resposta = document.createElement("p");
            resposta.className = "rapido-explicacao";
            resposta.textContent = `Resposta correta: ${pergunta.alternativas[pergunta.alternativa_correta]}. ${pergunta.explicacao}`;
            bloco.appendChild(titulo);
            bloco.appendChild(resposta);
            rapidoExplicacoesCompletas.appendChild(bloco);
        });
        rapidoExplicacoesPopuladas = true;
    }
    rapidoExplicacoesCompletas.hidden = !rapidoExplicacoesCompletas.hidden;
}

botaoModoRapido.addEventListener("click", () => iniciarModoRapido(materiaEscolhidaOuAleatoria(), sessaoAtual.dificuldade));
botaoRapidoProxima.addEventListener("click", () => {
    rapidoIndice++;
    if (rapidoIndice < rapidoPerguntas.length) renderizarPerguntaRapido();
    else finalizarRapido();
});
botaoRapidoVerExplicacoes.addEventListener("click", alternarExplicacoesCompletas);
botaoRapidoTentarOutro.addEventListener("click", () => iniciarModoRapido(sessaoAtual.materia, sessaoAtual.dificuldade));

// --- modo Interativo ---

function resetTelaInterativo() {
    interativoCarregando.hidden = true;
    interativoEtapasBarra.hidden = true;
    interativoEtapaApresentacao.hidden = true;
    interativoEtapaAnamnese.hidden = true;
    interativoEtapaExames.hidden = true;
    interativoEtapaHipotese.hidden = true;
    interativoEtapaConduta.hidden = true;
    interativoResultado.hidden = true;
    examesRealizadosIds = [];
    perguntaAnamneseSelecionadaId = null;
    hipoteseAvaliacao = null;
    condutaEscolhidaIndice = null;
}

function marcarEtapaAtiva(nomeEtapa) {
    const ordemAtual = ORDEM_ETAPAS_INTERATIVO.indexOf(nomeEtapa);
    interativoEtapasItens.forEach((li) => {
        const ordemLi = ORDEM_ETAPAS_INTERATIVO.indexOf(li.dataset.etapa);
        li.classList.toggle("ativa", li.dataset.etapa === nomeEtapa);
        li.classList.toggle("concluida", ordemLi < ordemAtual);
    });
}

async function iniciarModoInterativo(materia, dificuldade, casoPreCarregado = null) {
    limparMensagem();
    mostrarTela(TELAS.INTERATIVO);
    resetTelaInterativo();

    if (casoPreCarregado) {
        interativoCasoRow = casoPreCarregado;
        interativoDados = casoPreCarregado.dados_interativo;
        interativoEhCasoDoDia = true;
        mostrarEtapaApresentacao();
        return;
    }

    sessaoAtual = { materia, dificuldade };
    interativoEhCasoDoDia = false;
    interativoCarregando.hidden = false;

    try {
        interativoCasoRow = await criarCasoInterativo(materia, dificuldade);
        interativoDados = interativoCasoRow.dados_interativo;
        mostrarEtapaApresentacao();
    } catch (erro) {
        mostrarMensagem(erro.message);
        mostrarTela(TELAS.ESCOLHA);
    } finally {
        interativoCarregando.hidden = true;
    }
}

function mostrarEtapaApresentacao() {
    interativoEtapasBarra.hidden = false;
    marcarEtapaAtiva("apresentacao");

    const paciente = interativoDados.paciente;
    apresentacaoNome.textContent = paciente.nome;
    apresentacaoIdadeSexo.textContent = `${paciente.idade} anos, ${paciente.sexo}`;
    apresentacaoQueixa.textContent = paciente.queixa_principal;
    renderSinaisVitais(apresentacaoSinaisVitais, paciente.sinais_vitais);

    interativoEtapaApresentacao.hidden = false;
}

function mostrarEtapaAnamneseInterativo() {
    interativoEtapaApresentacao.hidden = true;
    marcarEtapaAtiva("anamnese");

    const paciente = interativoDados.paciente;
    anamneseNomeInterativo.textContent = paciente.nome;
    anamneseIdadeSexoInterativo.textContent = `${paciente.idade} anos, ${paciente.sexo}`;
    anamneseQueixaInterativo.textContent = paciente.queixa_principal;
    renderSinaisVitais(anamneseSinaisVitaisInterativo, paciente.sinais_vitais);

    perguntaAnamneseSelecionadaId = null;
    botaoAnamnesePerguntar.disabled = true;
    anamnesePerguntasLista.innerHTML = "";

    interativoDados.perguntas_anamnese.forEach((pergunta) => {
        const item = document.createElement("li");
        item.className = "anamnese-pergunta-item";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "anamnese-pergunta-botao";
        botao.textContent = pergunta.texto;
        botao.addEventListener("click", () => {
            if (botao.disabled) return;
            anamnesePerguntasLista.querySelectorAll(".anamnese-pergunta-botao").forEach((b) => b.classList.remove("selecionada"));
            botao.classList.add("selecionada");
            perguntaAnamneseSelecionadaId = pergunta.id;
            botaoAnamnesePerguntar.disabled = false;
        });

        item.appendChild(botao);
        anamnesePerguntasLista.appendChild(item);
    });

    interativoEtapaAnamnese.hidden = false;
}

function tratarPerguntarAnamneseInterativo() {
    const pergunta = interativoDados.perguntas_anamnese.find((p) => p.id === perguntaAnamneseSelecionadaId);
    if (!pergunta) return;

    const botaoSelecionado = anamnesePerguntasLista.querySelector(".anamnese-pergunta-botao.selecionada");
    if (botaoSelecionado) {
        botaoSelecionado.disabled = true;
        botaoSelecionado.classList.remove("selecionada");
        botaoSelecionado.classList.add("respondida");
        const resposta = document.createElement("p");
        resposta.className = "rapido-explicacao";
        resposta.textContent = pergunta.resposta;
        botaoSelecionado.parentElement.appendChild(resposta);
    }

    perguntaAnamneseSelecionadaId = null;
    botaoAnamnesePerguntar.disabled = true;
}

function mostrarEtapaExames() {
    interativoEtapaAnamnese.hidden = true;
    marcarEtapaAtiva("exames");
    examesRealizadosIds = [];
    renderizarExamesLista();
    interativoEtapaExames.hidden = false;
}

function renderizarExamesLista() {
    const tokensRestantes = calcularTokensRestantes(interativoDados.exames, examesRealizadosIds, TOKENS_INICIAIS_INTERATIVO);
    examesTokensRestantes.textContent = `${tokensRestantes} tokens restantes`;

    examesLista.innerHTML = "";
    interativoDados.exames.forEach((exame) => {
        const realizado = examesRealizadosIds.includes(exame.id);
        const item = document.createElement("li");
        item.className = "exame-item";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "exame-botao";
        botao.textContent = `${exame.nome} (${exame.custo_tokens} token${exame.custo_tokens > 1 ? "s" : ""})`;
        botao.disabled = realizado || !podeRealizarExame(exame, tokensRestantes);

        if (!realizado) {
            botao.addEventListener("click", () => {
                examesRealizadosIds = [...examesRealizadosIds, exame.id];
                renderizarExamesLista();
            });
        }

        item.appendChild(botao);

        if (realizado) {
            item.classList.add("exame-realizado");
            const resultado = document.createElement("p");
            resultado.className = "rapido-explicacao";
            resultado.textContent = exame.resultado;
            item.appendChild(resultado);
        }

        examesLista.appendChild(item);
    });
}

function mostrarEtapaHipotese() {
    interativoEtapaExames.hidden = true;
    marcarEtapaAtiva("hipotese");
    campoHipotese.value = "";
    contadorHipotese.textContent = "0/500";
    hipoteseFeedback.hidden = true;
    botaoEnviarHipotese.disabled = false;
    interativoEtapaHipotese.hidden = false;
}

async function tratarEnviarHipotese() {
    const texto = campoHipotese.value.trim();
    if (!texto) {
        mostrarMensagem("Escreva sua hipótese diagnóstica antes de enviar.");
        return;
    }

    botaoEnviarHipotese.disabled = true;
    try {
        const resultado = await avaliarHipotese(texto, interativoDados.hipotese_correta);
        hipoteseAvaliacao = resultado.avaliacao;
        hipoteseBadge.textContent = ROTULOS_AVALIACAO_HIPOTESE[resultado.avaliacao] ?? resultado.avaliacao;
        hipoteseBadge.dataset.avaliacao = resultado.avaliacao;
        hipoteseAvaliacaoTexto.textContent = resultado.explicacao;
        hipoteseRaciocinioIdeal.textContent = `Raciocínio ideal do caso: ${interativoDados.raciocinio_final}`;
        hipoteseFeedback.hidden = false;
    } catch (erro) {
        mostrarMensagem(erro.message);
        botaoEnviarHipotese.disabled = false;
    }
}

function mostrarEtapaConduta() {
    interativoEtapaHipotese.hidden = true;
    marcarEtapaAtiva("conduta");
    condutaFeedback.hidden = true;
    condutaEscolhidaIndice = null;

    condutaOpcoes.innerHTML = "";
    interativoDados.condutas.forEach((conduta, indice) => {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "resolucao-alternativa";
        botao.textContent = conduta.texto;
        botao.addEventListener("click", () => tratarConduta(indice, botao));
        item.appendChild(botao);
        condutaOpcoes.appendChild(item);
    });

    interativoEtapaConduta.hidden = false;
}

function tratarConduta(indice, botaoEscolhido) {
    const botoes = condutaOpcoes.querySelectorAll(".resolucao-alternativa");
    botoes.forEach((botao) => (botao.disabled = true));

    const escolhida = interativoDados.condutas[indice];
    condutaEscolhidaIndice = indice;
    botaoEscolhido.classList.add(escolhida.correta ? "resolucao-correta" : "resolucao-incorreta");
    if (!escolhida.correta) {
        const indiceCorreta = interativoDados.condutas.findIndex((c) => c.correta);
        botoes[indiceCorreta].classList.add("resolucao-correta");
    }

    condutaDesfecho.textContent = escolhida.correta
        ? escolhida.justificativa
        : `${escolhida.justificativa} Conduta correta: ${interativoDados.condutas.find((c) => c.correta).texto}.`;
    condutaFeedback.hidden = false;
}

async function finalizarInterativo() {
    interativoEtapaConduta.hidden = true;
    interativoResultado.hidden = false;

    const condutaEscolhida = interativoDados.condutas[condutaEscolhidaIndice];
    const pontosHipotese = hipoteseAvaliacao === "correta" ? 1 : hipoteseAvaliacao === "proxima" ? 0.5 : 0;
    const pontosConduta = condutaEscolhida.correta ? 1 : 0;
    const percentual = Math.round(((pontosHipotese + pontosConduta) / 2) * 100);

    interativoScorePercentual.textContent = `${percentual}%`;

    interativoResumoEtapas.innerHTML = "";
    const itemHipotese = document.createElement("li");
    itemHipotese.textContent = `Hipótese diagnóstica: ${ROTULOS_AVALIACAO_HIPOTESE[hipoteseAvaliacao] ?? hipoteseAvaliacao}`;
    const itemConduta = document.createElement("li");
    itemConduta.textContent = `Conduta: ${condutaEscolhida.correta ? "correta" : "incorreta"}`;
    interativoResumoEtapas.appendChild(itemHipotese);
    interativoResumoEtapas.appendChild(itemConduta);

    const tokensRestantes = calcularTokensRestantes(interativoDados.exames, examesRealizadosIds, TOKENS_INICIAIS_INTERATIVO);
    interativoTokensUsados.textContent = `Você usou ${TOKENS_INICIAIS_INTERATIVO - tokensRestantes} de ${TOKENS_INICIAIS_INTERATIVO} tokens em exames.`;

    try {
        await registrarResolucaoCaso(interativoCasoRow.id, condutaEscolhidaIndice, condutaEscolhida.correta);
        if (interativoEhCasoDoDia && casoDoDia) {
            const atualizado = await marcarResolvidoHoje(casoDoDia.id, casoDoDia.usuarios_resolveram_hoje ?? []);
            if (atualizado) casoDoDia = atualizado;
            casoDoDiaEl.hidden = true;
        }
    } catch (erro) {
        mostrarMensagem(`Resultado exibido aqui, mas não foi possível salvar seu histórico: ${erro.message}`);
    }
}

botaoModoInterativo.addEventListener("click", () => iniciarModoInterativo(materiaEscolhidaOuAleatoria(), sessaoAtual.dificuldade));
botaoIniciarAnamnese.addEventListener("click", mostrarEtapaAnamneseInterativo);
botaoAnamnesePerguntar.addEventListener("click", tratarPerguntarAnamneseInterativo);
botaoIrExames.addEventListener("click", mostrarEtapaExames);
botaoFormularHipotese.addEventListener("click", mostrarEtapaHipotese);
campoHipotese.addEventListener("input", () => {
    contadorHipotese.textContent = `${campoHipotese.value.length}/500`;
});
botaoEnviarHipotese.addEventListener("click", tratarEnviarHipotese);
botaoIrConduta.addEventListener("click", mostrarEtapaConduta);
botaoVerResultadoInterativo.addEventListener("click", finalizarInterativo);
botaoInterativoTentarOutro.addEventListener("click", () => iniciarModoInterativo(sessaoAtual.materia, sessaoAtual.dificuldade));

// --- Simulador de Anamnese ---

function resetTelaAnamnese() {
    anamneseCarregando.hidden = true;
    anamneseChatTela.hidden = true;
    anamneseFeedbackTela.hidden = true;
    anamneseMensagens.innerHTML = "";
    anamneseHistoricoConversa = [];
    campoAnamnesePergunta.value = "";
}

function adicionarMensagemAnamnese(autor, texto) {
    const mensagem = document.createElement("div");
    mensagem.className = "anamnese-mensagem";
    mensagem.dataset.autor = autor;
    mensagem.textContent = texto;
    anamneseMensagens.appendChild(mensagem);
    anamneseMensagens.scrollTop = anamneseMensagens.scrollHeight;
}

async function iniciarModoAnamnese(materia, dificuldade) {
    limparMensagem();
    sessaoAtual = { materia, dificuldade };
    mostrarTela(TELAS.ANAMNESE);
    resetTelaAnamnese();
    anamneseCarregando.hidden = false;

    try {
        anamneseCasoRow = await criarCasoAnamnese(materia, dificuldade);
        anamneseDados = anamneseCasoRow.dados_interativo;

        const paciente = anamneseDados.paciente;
        anamneseChatDescricao.textContent = `${paciente.nome}, ${paciente.idade} anos, ${paciente.sexo} — "${paciente.queixa}"`;
        anamneseChatPersonalidade.textContent = paciente.personalidade;
        anamneseChatTela.hidden = false;
    } catch (erro) {
        mostrarMensagem(erro.message);
        mostrarTela(TELAS.ESCOLHA);
    } finally {
        anamneseCarregando.hidden = true;
    }
}

async function tratarEnviarPerguntaAnamnese(evento) {
    evento.preventDefault();
    const texto = campoAnamnesePergunta.value.trim();
    if (!texto) return;

    adicionarMensagemAnamnese("aluna", texto);
    campoAnamnesePergunta.value = "";
    campoAnamnesePergunta.disabled = true;

    try {
        const resposta = await responderAnamnese(anamneseDados.paciente, anamneseHistoricoConversa, texto);
        anamneseHistoricoConversa = [...anamneseHistoricoConversa, { pergunta: texto, resposta }];
        adicionarMensagemAnamnese("paciente", resposta);
        salvarHistoricoAnamnese(anamneseCasoRow.id, anamneseHistoricoConversa).catch(() => {});
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        campoAnamnesePergunta.disabled = false;
        campoAnamnesePergunta.focus();
    }
}

function renderizarListaSimples(elementoUl, itens) {
    elementoUl.innerHTML = "";
    itens.forEach((texto) => {
        const item = document.createElement("li");
        item.textContent = texto;
        elementoUl.appendChild(item);
    });
}

async function finalizarAnamnese() {
    if (anamneseHistoricoConversa.length === 0) {
        mostrarMensagem("Faça ao menos uma pergunta antes de encerrar a anamnese.");
        return;
    }

    botaoEncerrarAnamnese.disabled = true;
    try {
        const resultado = await avaliarAnamnese(anamneseDados.paciente, anamneseHistoricoConversa, anamneseDados.perguntas_essenciais);

        anamneseChatTela.hidden = true;
        anamneseFeedbackTela.hidden = false;
        anamneseHistoricoLeitura.innerHTML = anamneseMensagens.innerHTML;

        renderizarListaSimples(anamneseColetadasLista, resultado.coletadas);
        renderizarListaSimples(anamneseEsquecidasLista, resultado.esquecidas);
        anamneseHipoteseInferida.textContent = `Hipótese inferida pela sua entrevista: ${resultado.hipotese_inferida}`;

        try {
            await registrarResolucaoCaso(anamneseCasoRow.id, 0, resultado.coletadas.length >= resultado.esquecidas.length);
        } catch {
            // feedback já foi exibido; falha ao salvar histórico não deve travar a tela
        }
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        botaoEncerrarAnamnese.disabled = false;
    }
}

botaoModoAnamnese.addEventListener("click", () => iniciarModoAnamnese(materiaEscolhidaOuAleatoria(), sessaoAtual.dificuldade));
formAnamneseChat.addEventListener("submit", tratarEnviarPerguntaAnamnese);
botaoEncerrarAnamnese.addEventListener("click", finalizarAnamnese);
botaoAnamneseTentarOutro.addEventListener("click", () => iniciarModoAnamnese(sessaoAtual.materia, sessaoAtual.dificuldade));

// --- Caso do Dia ---

function exibirCasoDoDia() {
    casoDoDiaResumo.textContent = casoDoDia.enunciado;
    casoDoDiaMateria.textContent = casoDoDia.materia;
    casoDoDiaMateria.dataset.cor = corPorMateria(casoDoDia.materia);

    const totalResolveram = casoDoDia.usuarios_resolveram_hoje?.length ?? 0;
    casoDoDiaResolveram.textContent =
        totalResolveram === 0
            ? "Seja a primeira a resolver hoje"
            : `${totalResolveram} colega${totalResolveram > 1 ? "s" : ""} já resolveu hoje`;

    casoDoDiaEl.hidden = false;
}

async function carregarCasoDoDia() {
    try {
        casoDoDia = await buscarOuGerarCasoDoDia();
        if (!ehCasoDeHoje(casoDoDia) || (usuarioId && jaResolveuHoje(casoDoDia, usuarioId))) {
            casoDoDiaEl.hidden = true;
            return;
        }
        exibirCasoDoDia();
    } catch {
        casoDoDiaEl.hidden = true;
    }
}

botaoResolverCasoDoDia.addEventListener("click", () => {
    if (!casoDoDia) return;
    iniciarModoInterativo(null, null, casoDoDia);
});

// --- Histórico ---

async function carregarHistorico() {
    try {
        casos = await listarCasosClinicos();
        logsResolucoes = await listarLogResolucoesCasos();
    } catch (erro) {
        mostrarMensagem(erro.message);
        return;
    }

    historicoTaxaGeral.textContent = `${calcularTaxaAcertoCasos(logsResolucoes)}%`;
    historicoCasosResolvidos.textContent = calcularCasosResolvidos(logsResolucoes);
    historicoStreak.textContent = `${calcularStreakCasos(logsResolucoes)} 🔥`;

    renderizarHistoricoLista();
    renderizarComparacaoColegas();
}

function renderizarHistoricoLista() {
    historicoListaCasos.innerHTML = "";

    const idsResolvidos = [...new Set(logsResolucoes.map((log) => log.caso_clinico_id))];
    const entradas = casos
        .filter((caso) => idsResolvidos.includes(caso.id))
        .map((caso) => {
            const logsDoCaso = logsResolucoes.filter((log) => log.caso_clinico_id === caso.id);
            const acertos = logsDoCaso.filter((log) => log.acertou).length;
            const score = Math.round((acertos / logsDoCaso.length) * 100);
            const ultimaResolucao = logsDoCaso.reduce(
                (maisRecente, log) => (new Date(log.resolvido_em) > new Date(maisRecente) ? log.resolvido_em : maisRecente),
                logsDoCaso[0].resolvido_em
            );
            return { caso, score, ultimaResolucao };
        })
        .sort((a, b) => new Date(b.ultimaResolucao) - new Date(a.ultimaResolucao));

    historicoVazio.hidden = entradas.length > 0;

    entradas.forEach(({ caso, score, ultimaResolucao }) => {
        const item = criarElementoCasoClinico(caso, { score, ultimaResolucao });
        historicoListaCasos.appendChild(item);
    });

    aplicarEntradaEscalonada(historicoListaCasos);
}

function renderizarComparacaoColegas() {
    historicoComparacaoLista.innerHTML = "";
    const comparacao = calcularComparacaoColegas(logsResolucoes, usuarioId);

    comparacao.forEach((colega) => {
        const item = document.createElement("li");
        item.textContent = `${colega.rotulo} — ${colega.taxaAcertoSemana}% esta semana, sequência de ${colega.streak} dia${colega.streak === 1 ? "" : "s"}`;
        historicoComparacaoLista.appendChild(item);
    });
}

botaoIrHistorico.addEventListener("click", async () => {
    limparMensagem();
    mostrarTela(TELAS.HISTORICO);
    await carregarHistorico();
});

// --- Personalizar ---

pillsDificuldade.forEach((pill) => {
    pill.addEventListener("click", () => {
        pillsDificuldade.forEach((p) => {
            p.classList.remove("selecionada");
            p.setAttribute("aria-checked", "false");
        });
        pill.classList.add("selecionada");
        pill.setAttribute("aria-checked", "true");
        sessaoAtual.dificuldade = pill.dataset.dificuldade;
    });
});

// --- inicialização ---

async function iniciar() {
    const sessao = await protegerRota();
    if (!sessao) return;

    inicializarUsuarioMenu();
    inicializarNotificacaoRevisao();
    inicializarNavegacaoPrincipal();
    inicializarPomodoroWidget();
    melhorarSelect(selectMateriaPersonalizar);

    mostrarTela(TELAS.ESCOLHA);

    usuarioId = await obterIdUsuarioLogado();
    await carregarCasoDoDia();
}

iniciar();
