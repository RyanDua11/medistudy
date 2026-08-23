// Parsing e formatação de flashcards do tipo Cloze (texto com lacunas {{palavra}}).

const REGEX_LACUNA = /\{\{(.+?)\}\}/g;
const MARCADOR_LACUNA = "_____";

/** Extrai as palavras marcadas como lacuna ({{palavra}}) de um texto cloze. */
export function extrairPalavrasCloze(texto) {
    const palavras = [];
    for (const match of texto.matchAll(REGEX_LACUNA)) {
        palavras.push(match[1].trim());
    }
    return palavras;
}

/** Um texto cloze válido precisa ter pelo menos uma lacuna {{...}} não vazia. */
export function validarCloze(texto) {
    return extrairPalavrasCloze(texto).some((palavra) => palavra.length > 0);
}

/** Substitui cada {{palavra}} por _____ , para exibir a pergunta na revisão. */
export function ocultarLacunas(texto) {
    return texto.replace(REGEX_LACUNA, MARCADOR_LACUNA);
}

/**
 * Monta o texto de resposta da revisão: o texto original com as lacunas
 * reveladas (sem as chaves {{ }}).
 */
export function revelarLacunas(texto) {
    return texto.replace(REGEX_LACUNA, "$1");
}

/**
 * Quebra o texto cloze em segmentos { texto, lacuna } na ordem em que
 * aparecem, para a UI destacar apenas as palavras que eram lacuna (em
 * dourado) ao montar o DOM diretamente — sem inserir HTML bruto do usuário.
 */
export function segmentarCloze(texto) {
    const segmentos = [];
    let ultimoIndice = 0;

    for (const match of texto.matchAll(REGEX_LACUNA)) {
        if (match.index > ultimoIndice) {
            segmentos.push({ texto: texto.slice(ultimoIndice, match.index), lacuna: false });
        }
        segmentos.push({ texto: match[1].trim(), lacuna: true });
        ultimoIndice = match.index + match[0].length;
    }

    if (ultimoIndice < texto.length) {
        segmentos.push({ texto: texto.slice(ultimoIndice), lacuna: false });
    }

    return segmentos;
}
