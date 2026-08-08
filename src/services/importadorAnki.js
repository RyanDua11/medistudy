export function parsearArquivoAnki(conteudo) {
    const linhas = conteudo.split(/\r\n|\n/);
    const cards = [];
    let linhasIgnoradas = 0;

    for (const linha of linhas) {
        if (linha.trim() === "" || linha.startsWith("#")) {
            continue;
        }

        const [frente, verso, colunaTags] = linha.split("\t");

        if (!frente || !verso) {
            linhasIgnoradas += 1;
            continue;
        }

        const tags = colunaTags
            ? colunaTags.split(",").map((tag) => tag.trim()).filter((tag) => tag !== "")
            : [];
        cards.push({ frente, verso, tags });
    }

    return { cards, linhasIgnoradas };
}
