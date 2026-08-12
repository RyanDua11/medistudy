const SVG_NS = "http://www.w3.org/2000/svg";
const LARGURA = 720;
const ALTURA = 220;
const MARGEM = { topo: 16, base: 28, esquerda: 8, direita: 8 };
const PALETA_CORES = ["201, 168, 76", "91, 155, 240", "95, 191, 135", "228, 104, 92", "161, 132, 232", "82, 196, 214"];

function criarElementoSvg(tag, atributos) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(atributos).forEach(([nome, valor]) => el.setAttribute(nome, valor));
    return el;
}

function calcularEscalas(datasUnicas, valorMinimo, valorMaximo) {
    const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
    const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
    const amplitudeValor = valorMaximo - valorMinimo || 1;

    return {
        x: (indice) =>
            datasUnicas.length > 1
                ? MARGEM.esquerda + (indice / (datasUnicas.length - 1)) * larguraUtil
                : MARGEM.esquerda + larguraUtil / 2,
        y: (valor) => MARGEM.topo + alturaUtil - ((valor - valorMinimo) / amplitudeValor) * alturaUtil,
    };
}

function renderizarSerie(svg, pontosSerie, cor, escalaX, escalaY, datasUnicas) {
    const grupo = criarElementoSvg("g", {});
    const caminho = pontosSerie
        .map((ponto, i) => {
            const indice = datasUnicas.indexOf(ponto.data);
            return `${i === 0 ? "M" : "L"}${escalaX(indice)},${escalaY(ponto.valor)}`;
        })
        .join(" ");

    grupo.appendChild(
        criarElementoSvg("path", {
            d: caminho,
            fill: "none",
            stroke: `rgb(${cor})`,
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        })
    );

    pontosSerie.forEach((ponto) => {
        const indice = datasUnicas.indexOf(ponto.data);
        grupo.appendChild(
            criarElementoSvg("circle", {
                cx: escalaX(indice),
                cy: escalaY(ponto.valor),
                r: "3.5",
                fill: `rgb(${cor})`,
            })
        );
        const titulo = criarElementoSvg("title", {});
        titulo.textContent = `${ponto.data}: ${ponto.valor}`;
        grupo.lastChild.appendChild(titulo);
    });

    svg.appendChild(grupo);
}

export function criarGraficoLinha(container, series) {
    container.innerHTML = "";

    const todosOsPontos = series.flatMap((s) => s.pontos);
    if (todosOsPontos.length === 0) return;

    const datasUnicas = [...new Set(todosOsPontos.map((p) => p.data))].sort();
    const valores = todosOsPontos.map((p) => p.valor);
    const escalas = calcularEscalas(datasUnicas, Math.min(...valores), Math.max(...valores));

    const svg = criarElementoSvg("svg", {
        viewBox: `0 0 ${LARGURA} ${ALTURA}`,
        class: "grafico-linha-svg",
        role: "img",
        "aria-label": series.map((s) => s.nome).join(", "),
    });

    const linhaBase = criarElementoSvg("line", {
        x1: MARGEM.esquerda,
        x2: LARGURA - MARGEM.direita,
        y1: ALTURA - MARGEM.base,
        y2: ALTURA - MARGEM.base,
        stroke: "rgba(245, 237, 232, 0.12)",
        "stroke-width": "1",
    });
    svg.appendChild(linhaBase);

    series.forEach((serie, indice) => {
        const cor = serie.cor ?? PALETA_CORES[indice % PALETA_CORES.length];
        renderizarSerie(svg, serie.pontos, cor, escalas.x, escalas.y, datasUnicas);
    });

    const rotulosEixo =
        datasUnicas.length > 1
            ? [
                  { data: datasUnicas[0], indice: 0, ancora: "start" },
                  { data: datasUnicas[datasUnicas.length - 1], indice: datasUnicas.length - 1, ancora: "end" },
              ]
            : datasUnicas.length === 1
              ? [{ data: datasUnicas[0], indice: 0, ancora: "middle" }]
              : [];

    rotulosEixo.forEach(({ data, indice, ancora }) => {
        const rotulo = criarElementoSvg("text", {
            x: escalas.x(indice),
            y: ALTURA - 8,
            "text-anchor": ancora,
            class: "grafico-linha-rotulo-eixo",
        });
        rotulo.textContent = data;
        svg.appendChild(rotulo);
    });

    container.appendChild(svg);

    if (series.length > 1) {
        const legenda = document.createElement("div");
        legenda.className = "grafico-linha-legenda";
        series.forEach((serie, indice) => {
            const cor = serie.cor ?? PALETA_CORES[indice % PALETA_CORES.length];
            const item = document.createElement("span");
            item.className = "grafico-linha-legenda-item";
            item.innerHTML = `<span class="grafico-linha-legenda-cor" style="background-color: rgb(${cor})"></span>${serie.nome}`;
            legenda.appendChild(item);
        });
        container.appendChild(legenda);
    }
}
