const UM_DIA_MS = 24 * 60 * 60 * 1000;

function chaveDiaLocal(data) {
    const d = new Date(data);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatarDataRelativa(dataIso) {
    if (!dataIso) return "Nunca revisado";

    const data = new Date(dataIso);
    const hoje = new Date();

    if (chaveDiaLocal(data) === chaveDiaLocal(hoje)) return "Revisado hoje";

    const ontem = new Date(hoje.getTime() - UM_DIA_MS);
    if (chaveDiaLocal(data) === chaveDiaLocal(ontem)) return "Revisado ontem";

    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const diasAtras = Math.round((inicioHoje.getTime() - inicioData.getTime()) / UM_DIA_MS);

    return `Há ${diasAtras} dias`;
}
