import { sair, obterIdUsuarioLogado } from "../services/authService.js";

// mesmo user_id hardcoded usado em src/pages/admin/adminPage.js e na
// policy RLS de log_uso_ia — sem sistema de roles ainda.
const ADMIN_USER_ID = "efe4e863-0ea1-4a0f-9656-f58e6f81d60d";

let ouvintesGlobaisRegistrados = false;

function fecharMenu(gatilho, opcoes) {
    opcoes.hidden = true;
    gatilho.setAttribute("aria-expanded", "false");
}

function registrarFechamentoGlobalDeMenus() {
    if (ouvintesGlobaisRegistrados) return;
    ouvintesGlobaisRegistrados = true;

    document.addEventListener("click", (evento) => {
        document.querySelectorAll(".usuario-menu-opcoes:not([hidden])").forEach((opcoes) => {
            const menu = opcoes.closest(".usuario-menu");
            const gatilho = menu?.querySelector(".usuario-menu-gatilho");
            if (menu && gatilho && !menu.contains(evento.target)) {
                fecharMenu(gatilho, opcoes);
            }
        });
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape") return;
        document.querySelectorAll(".usuario-menu-opcoes:not([hidden])").forEach((opcoes) => {
            const menu = opcoes.closest(".usuario-menu");
            const gatilho = menu?.querySelector(".usuario-menu-gatilho");
            if (gatilho) fecharMenu(gatilho, opcoes);
        });
    });
}

export function inicializarUsuarioMenu() {
    const menu = document.querySelector(".usuario-menu");
    if (!menu) return;

    registrarFechamentoGlobalDeMenus();

    const gatilho = document.createElement("button");
    gatilho.type = "button";
    gatilho.className = "usuario-menu-gatilho";
    gatilho.setAttribute("aria-haspopup", "true");
    gatilho.setAttribute("aria-expanded", "false");
    gatilho.setAttribute("aria-label", "Menu da usuária");
    gatilho.append(...menu.childNodes);

    const opcoes = document.createElement("div");
    opcoes.className = "usuario-menu-opcoes";
    opcoes.hidden = true;

    const botaoSair = document.createElement("button");
    botaoSair.type = "button";
    botaoSair.className = "usuario-menu-sair";
    botaoSair.textContent = "Sair";
    botaoSair.addEventListener("click", async (evento) => {
        evento.stopPropagation();
        await sair();
        window.location.href = "index.html";
    });

    opcoes.appendChild(botaoSair);
    menu.append(gatilho, opcoes);

    obterIdUsuarioLogado()
        .then((id) => {
            if (id !== ADMIN_USER_ID) return;
            const linkAdmin = document.createElement("a");
            linkAdmin.href = "admin.html";
            linkAdmin.className = "usuario-menu-admin";
            linkAdmin.textContent = "Painel Admin";
            opcoes.insertBefore(linkAdmin, botaoSair);
        })
        .catch(() => {});

    function alternar() {
        const abrir = opcoes.hidden;
        opcoes.hidden = !abrir;
        gatilho.setAttribute("aria-expanded", String(abrir));
    }

    gatilho.addEventListener("click", (evento) => {
        evento.stopPropagation();
        alternar();
    });
}
