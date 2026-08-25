import { supabase } from "./supabaseClient.js";
import { traduzErroSupabase } from "./erroAmigavel.js";

const TIPOS_ACEITOS = ["application/pdf", "image/png", "image/jpeg"];
const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10MB

/** Valida um File antes de enviar pra interpretação: tipo e tamanho. Retorna null se válido, ou uma mensagem de erro. */
export function validarArquivoExame(arquivo) {
    if (!arquivo) return "Selecione um arquivo.";
    if (!TIPOS_ACEITOS.includes(arquivo.type)) return "Formato não suportado. Envie um PDF, PNG ou JPG.";
    if (arquivo.size > TAMANHO_MAXIMO_BYTES) return "Arquivo muito grande. O limite é 10MB.";
    return null;
}

/** Extrai só a parte base64 de uma data URL (remove o prefixo "data:<mime>;base64,"). */
export function extrairBase64DeDataUrl(dataUrl) {
    const indice = dataUrl.indexOf(",");
    return indice === -1 ? dataUrl : dataUrl.slice(indice + 1);
}

export function arquivoParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(extrairBase64DeDataUrl(leitor.result));
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(arquivo);
    });
}

/** Conta quantos parâmetros do resultado têm cada status — usado pro resumo visual. */
export function contarParametrosPorStatus(parametros) {
    return parametros.reduce(
        (contagem, p) => {
            contagem[p.status] = (contagem[p.status] ?? 0) + 1;
            return contagem;
        },
        { normal: 0, atencao: 0, critico: 0 },
    );
}

/**
 * supabase.functions.invoke() só dá uma mensagem genérica ("Edge Function
 * returned a non-2xx status code") pra qualquer erro HTTP — o detalhe real
 * (ex: "Gemini não retornou conteúdo interpretável") fica no corpo da
 * resposta, acessível via error.context (a Response bruta). Tenta ler esse
 * corpo antes de cair pro fallback genérico traduzido.
 */
async function extrairMensagemErroFuncao(error) {
    try {
        const corpo = await error?.context?.json?.();
        if (corpo?.erro) return corpo.erro;
    } catch {
        // corpo não é JSON legível — segue pro fallback abaixo
    }
    return traduzErroSupabase(error);
}

export async function interpretarExame(arquivo) {
    const erroValidacao = validarArquivoExame(arquivo);
    if (erroValidacao) throw new Error(erroValidacao);

    const base64 = await arquivoParaBase64(arquivo);

    const { data, error } = await supabase.functions.invoke("interpretar-exame", {
        body: { arquivo_base64: base64, tipo_mime: arquivo.type },
    });

    if (error) throw new Error(await extrairMensagemErroFuncao(error));
    if (data?.erro) throw new Error(data.erro);
    return data;
}
