import { entrar, registrar } from "../../services/authService.js";

const botaoEntrar = document.getElementById("botao-entrar");
const botaoRegistrar = document.getElementById("botao-registrar");
const inputSenha = document.getElementById("senha");
const inputEmail = document.getElementById("email");
const telaFormulario = document.getElementById("tela-formulario");
const telaBoasVindas = document.getElementById("tela-boas-vindas");
const spanEmail = document.getElementById("email-usuario");
const loginContainer = document.getElementById("login-container");
const mensagemErro = document.getElementById("mensagem-erro");

function mostrarErro(texto) {
    mensagemErro.textContent = texto;
    mensagemErro.classList.remove("mensagem-sucesso");
    mensagemErro.hidden = false;
}

function mostrarSucesso(texto) {
    mensagemErro.textContent = texto;
    mensagemErro.classList.add("mensagem-sucesso");
    mensagemErro.hidden = false;
}

function limparErro() {
    mensagemErro.hidden = true;
    mensagemErro.classList.remove("mensagem-sucesso");
    mensagemErro.textContent = "";
}

function marcarCamposInvalidos() {
    inputEmail.classList.remove("campo-erro");
    inputSenha.classList.remove("campo-erro");

    void inputEmail.offsetWidth;

    inputEmail.classList.add("campo-erro");
    inputSenha.classList.add("campo-erro");
}

function camposPreenchidos() {
    return inputEmail.value !== "" && inputSenha.value !== "";
}

function mostrarBoasVindas(email) {
    document.body.classList.add("ativo");
    loginContainer.classList.add("ativo");
    telaBoasVindas.style.display = "flex";

    setTimeout(function () {
        telaBoasVindas.style.opacity = "1";
    }, 10);

    telaFormulario.style.display = "none";
    spanEmail.textContent = email;

    setTimeout(function () {
        window.location.href = "home.html";
    }, 3000);
}

async function tratarEntrar() {
    limparErro();

    if (!camposPreenchidos()) {
        marcarCamposInvalidos();
        return;
    }

    try {
        const { user } = await entrar(inputEmail.value, inputSenha.value);
        mostrarBoasVindas(user.email);
    } catch (erro) {
        mostrarErro(erro.message);
    }
}

async function tratarRegistrar() {
    limparErro();

    if (!camposPreenchidos()) {
        marcarCamposInvalidos();
        return;
    }

    try {
        await registrar(inputEmail.value, inputSenha.value);
        mostrarSucesso("Conta criada! Você já pode entrar.");
    } catch (erro) {
        mostrarErro(erro.message);
    }
}

botaoEntrar.addEventListener("click", tratarEntrar);
botaoRegistrar.addEventListener("click", tratarRegistrar);

inputSenha.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") {
        botaoEntrar.click();
    }
});

inputEmail.addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") {
        botaoEntrar.click();
    }
});
