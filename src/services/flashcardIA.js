import { supabase } from "./supabaseClient.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

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

function validarFlashcardIA(textoResposta) {
    const flashcard = extrairJson(textoResposta);

    if (typeof flashcard !== "object" || flashcard === null || Array.isArray(flashcard)) {
        throw new Error("Resposta da IA não é um JSON válido");
    }

    validarTextoNaoVazio(flashcard.pergunta, "pergunta");
    validarTextoNaoVazio(flashcard.resposta, "resposta");
    validarTextoNaoVazio(flashcard.materia, "materia");

    return {
        pergunta: flashcard.pergunta,
        resposta: flashcard.resposta,
        materia: flashcard.materia,
    };
}

export async function gerarFlashcardIA(tema) {
    if (typeof tema !== "string" || tema.trim() === "") {
        throw new Error("Informe um tema para gerar o flashcard");
    }

    const { data, error } = await supabase.functions.invoke("gerar-flashcard", {
        body: { tema },
    });

    if (error) throw new Error(traduzErroSupabase(error));
    if (data?.erro) throw new Error(data.erro);

    return validarFlashcardIA(data.texto);
}
