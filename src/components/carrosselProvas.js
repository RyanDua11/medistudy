import { listarProvas } from "../services/provasService.js";

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_DIAS_PADRAO = 30;

// interpreta "YYYY-MM-DD" como data local (não UTC) — new Date(string) sozinho
// desloca um dia em fusos atrás de UTC (ex.: UTC-3), o que faria uma prova de
// hoje aparecer como "atrasada" ou de amanhã aparecer como "hoje"
function paraDataLocal(dataIso) {
    const [ano, mes, dia] = dataIso.slice(0, 10).split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

function inicioDoDiaLocal(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

export function calcularDiasAteProva(dataIso, referencia = new Date()) {
    const hoje = inicioDoDiaLocal(referencia);
    const dataProva = paraDataLocal(dataIso);
    return Math.round((dataProva.getTime() - hoje.getTime()) / UM_DIA_MS);
}

export function filtrarProvasFuturas(provas, referencia = new Date(), limiteDias = LIMITE_DIAS_PADRAO) {
    return provas
        .filter((prova) => {
            const dias = calcularDiasAteProva(prova.data, referencia);
            return dias >= 0 && dias <= limiteDias;
        })
        .sort((a, b) => calcularDiasAteProva(a.data, referencia) - calcularDiasAteProva(b.data, referencia));
}

export function formatarContagemRegressiva(dias) {
    if (dias === 0) return "hoje!";
    if (dias === 1) return "amanhã";
    return `em ${dias} dias`;
}

function formatarDataCurta(dataIso) {
    return paraDataLocal(dataIso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function criarCartaoProva(prova) {
    const cartao = document.createElement("div");
    cartao.className = "prova-card";

    const materia = document.createElement("span");
    materia.className = "prova-card-materia";
    materia.textContent = prova.materia;

    const data = document.createElement("span");
    data.className = "prova-card-data";
    data.textContent = formatarDataCurta(prova.data);

    const contagem = document.createElement("span");
    contagem.className = "prova-card-contagem";
    contagem.textContent = formatarContagemRegressiva(calcularDiasAteProva(prova.data));

    cartao.append(materia, data, contagem);
    return cartao;
}

export async function inicializarCarrosselProvas() {
    const container = document.getElementById("carrossel-provas");
    const vazio = document.getElementById("carrossel-provas-vazio");
    if (!container || !vazio) return;

    try {
        const provas = await listarProvas();
        const proximas = filtrarProvasFuturas(provas);

        container.innerHTML = "";
        proximas.forEach((prova) => container.appendChild(criarCartaoProva(prova)));

        container.hidden = proximas.length === 0;
        vazio.hidden = proximas.length > 0;
    } catch (erro) {
        console.error("Não foi possível carregar as próximas provas:", erro);
        container.hidden = true;
        vazio.hidden = false;
    }
}
