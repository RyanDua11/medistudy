const MAPA_ARQUIVO_PARA_PAGINA = {
    "": "home",
    "home.html": "home",
    "flashcards.html": "flashcards",
    "casos-clinicos.html": "casos-clinicos",
    "provas.html": "provas",
    "notas.html": "notas",
    "chat.html": "chat",
    "em-breve.html": "configuracoes",
};

/** Deriva a chave de página ativa a partir de window.location.pathname. */
export function paginaAtivaPara(pathname) {
    const arquivo = pathname.split("/").pop();
    return MAPA_ARQUIVO_PARA_PAGINA[arquivo] ?? null;
}

export function inicializarNavegacaoPrincipal() {
    const pagina = paginaAtivaPara(window.location.pathname);
    if (!pagina) return;

    document
        .querySelectorAll(`.sidebar-link[data-pagina="${pagina}"], .bottom-nav-link[data-pagina="${pagina}"]`)
        .forEach((link) => link.classList.add("ativo"));
}
