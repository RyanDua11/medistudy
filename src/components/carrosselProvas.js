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

// "Próximas provas" hoje é exibida como uma linha discreta dentro do card
// "Missão do dia" (só a prova mais próxima), não mais como carrossel de
// cartões — se não houver prova cadastrada, a linha simplesmente some.
export async function inicializarCarrosselProvas() {
    const linha = document.getElementById("proxima-prova-linha");
    if (!linha) return;

    try {
        const provas = await listarProvas();
        const [proxima] = filtrarProvasFuturas(provas);

        if (!proxima) {
            linha.hidden = true;
            return;
        }

        linha.textContent = `📅 ${proxima.materia} ${formatarContagemRegressiva(calcularDiasAteProva(proxima.data))}`;
        linha.hidden = false;
    } catch (erro) {
        console.error("Não foi possível carregar as próximas provas:", erro);
        linha.hidden = true;
    }
}
