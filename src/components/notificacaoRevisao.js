import { listarFlashcards } from "../services/flashcardsService.js";
import { calcularFlashcardsARevisar } from "../services/estatisticas.js";

const URL_REVISAO_RAPIDA = "flashcards.html?modo=revisaoRapida";

function atualizarBadge(sino, badge, quantidade) {
    if (quantidade === 0) {
        badge.hidden = true;
        sino.setAttribute("aria-label", "Notificações");
        return;
    }

    badge.hidden = false;
    badge.textContent = quantidade > 9 ? "9+" : String(quantidade);
    sino.setAttribute("aria-label", `Notificações: ${quantidade} flashcard(s) pronto(s) para revisão`);
}

export async function inicializarNotificacaoRevisao() {
    const sino = document.getElementById("sino");
    const badge = document.getElementById("badge-revisao");
    if (!sino || !badge) return;

    sino.addEventListener("click", () => {
        window.location.href = URL_REVISAO_RAPIDA;
    });

    try {
        const flashcards = await listarFlashcards();
        atualizarBadge(sino, badge, calcularFlashcardsARevisar(flashcards));
    } catch (erro) {
        console.error("Não foi possível carregar a notificação de revisão:", erro);
    }
}
