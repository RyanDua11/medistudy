const NOTA_MAXIMA = 10;

function arredondarParaCima(valor) {
    return Math.ceil(valor * 10) / 10;
}

export function calcularNotaNecessaria(notasLancadas, mediaNecessaria, pesoProximaAvaliacao) {
    if (pesoProximaAvaliacao <= 0) {
        throw new Error("Peso da avaliação deve ser maior que zero");
    }

    const somaPesoAtual = notasLancadas.reduce((soma, item) => soma + item.peso, 0);
    const somaNotaPesoAtual = notasLancadas.reduce((soma, item) => soma + item.nota * item.peso, 0);
    const pesoTotal = somaPesoAtual + pesoProximaAvaliacao;

    const notaNecessariaBruta =
        (mediaNecessaria * pesoTotal - somaNotaPesoAtual) / pesoProximaAvaliacao;

    if (notaNecessariaBruta <= 0) {
        return { notaNecessaria: 0, jaAprovada: true, impossivel: false };
    }

    if (notaNecessariaBruta > NOTA_MAXIMA) {
        return { notaNecessaria: notaNecessariaBruta, jaAprovada: false, impossivel: true };
    }

    return {
        notaNecessaria: arredondarParaCima(notaNecessariaBruta),
        jaAprovada: false,
        impossivel: false,
    };
}
