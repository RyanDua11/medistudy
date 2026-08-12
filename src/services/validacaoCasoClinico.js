const MIN_ALTERNATIVAS = 4;
const MAX_ALTERNATIVAS = 5;

function extrairJson(texto) {
    const semCercaMarkdown = texto.replace(/```json\s*|```/g, "").trim();

    try {
        return JSON.parse(semCercaMarkdown);
    } catch {
        const inicio = semCercaMarkdown.indexOf("{");
        const fim = semCercaMarkdown.lastIndexOf("}");
        if (inicio === -1 || fim === -1 || fim < inicio) {
            throw new Error("Resposta da IA não é um JSON válido");
        }
        try {
            return JSON.parse(semCercaMarkdown.slice(inicio, fim + 1));
        } catch {
            throw new Error("Resposta da IA não é um JSON válido");
        }
    }
}

function validarTextoNaoVazio(valor, campo) {
    if (typeof valor !== "string" || valor.trim() === "") {
        throw new Error(`Campo obrigatório ausente ou vazio: ${campo}`);
    }
}

export function validarCasoClinico(textoResposta) {
    const caso = extrairJson(textoResposta);

    if (typeof caso !== "object" || caso === null || Array.isArray(caso)) {
        throw new Error("Resposta da IA não é um JSON válido");
    }

    validarTextoNaoVazio(caso.enunciado, "enunciado");
    validarTextoNaoVazio(caso.pergunta, "pergunta");
    validarTextoNaoVazio(caso.explicacao, "explicacao");

    if (
        !Array.isArray(caso.alternativas) ||
        caso.alternativas.length < MIN_ALTERNATIVAS ||
        caso.alternativas.length > MAX_ALTERNATIVAS ||
        caso.alternativas.some((alt) => typeof alt !== "string" || alt.trim() === "")
    ) {
        throw new Error(
            `Campo alternativas deve ser um array de ${MIN_ALTERNATIVAS} a ${MAX_ALTERNATIVAS} strings não vazias`
        );
    }

    if (
        typeof caso.alternativa_correta !== "number" ||
        !Number.isInteger(caso.alternativa_correta) ||
        caso.alternativa_correta < 0 ||
        caso.alternativa_correta >= caso.alternativas.length
    ) {
        throw new Error(
            "Campo alternativa_correta deve ser um índice inteiro válido dentro de alternativas"
        );
    }

    return caso;
}
