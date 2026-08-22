const ICONE_MAPAS_MENTAIS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 0-4 4c-2 0-3.5 1.6-3.5 3.5S6 14 6 14s-1.5.9-1.5 2.5S6 20 8 20"/><path d="M12 3a4 4 0 0 1 4 4c2 0 3.5 1.6 3.5 3.5S18 14 18 14s1.5.9 1.5 2.5S16 20 14 20"/><path d="M12 3v17"/></svg>`;
const ICONE_QUESTOES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"/><path d="M9.5 10.5l1.6 1.6 3.4-3.4"/></svg>`;
const ICONE_ANAMNESE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4v6a4 4 0 0 0 8 0V4"/><path d="M9 14v2a5 5 0 0 0 10 0v-2"/><circle cx="19" cy="9" r="2"/></svg>`;
const ICONE_FEYNMAN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a7 7 0 0 1-7 7H8l-5 3 1.5-4.5A7 7 0 1 1 21 12z"/><circle cx="9" cy="12" r="0.8" fill="currentColor" stroke="none"/><circle cx="12.5" cy="12" r="0.8" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none"/></svg>`;
const ICONE_CONFIGURACOES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

export const FERRAMENTAS_EM_BREVE = {
    "mapas-mentais": {
        nome: "Mapas Mentais",
        cor: "verde",
        icone: ICONE_MAPAS_MENTAIS,
        frase: "Organize ideias e conecte conceitos de forma visual — em breve por aqui.",
    },
    questoes: {
        nome: "Questões",
        cor: "azul",
        icone: ICONE_QUESTOES,
        frase: "Teste seus conhecimentos com questões de provas — em breve por aqui.",
    },
    anamnese: {
        nome: "Simulador de Anamnese",
        cor: "roxo",
        icone: ICONE_ANAMNESE,
        frase: "Treine entrevistas clínicas com simulação realista — em breve por aqui.",
    },
    feynman: {
        nome: "Explique pro Professor",
        cor: "dourado",
        icone: ICONE_FEYNMAN,
        frase: "Tire dúvidas explicando o assunto com suas próprias palavras — em breve por aqui.",
    },
    configuracoes: {
        nome: "Configurações",
        cor: "dourado",
        icone: ICONE_CONFIGURACOES,
        frase: "Preferências de conta e do app vão morar aqui.",
    },
};

/** Resolve os dados de exibição de em-breve.html a partir do parâmetro ?ferramenta=. */
export function resolverFerramentaEmBreve(slug) {
    return FERRAMENTAS_EM_BREVE[slug] ?? null;
}
