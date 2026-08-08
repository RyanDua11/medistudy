PYTHON

print()         → exibe na tela
variavel =      → guarda um valor
"texto"         → string, texto entre aspas
123             → número inteiro
12.5            → número decimal (float)
+               → soma (números) ou junta (textos)
-  *  /         → subtrai, multiplica, divide
%               → resto da divisão
==              → pergunta "é igual?"
!=              → pergunta "é diferente?"
>  <  >=  <=   → maior, menor, maior/igual, menor/igual
if              → se isso for verdade...
elif            → senão, se isso for verdade...
else            → senão (qualquer outra coisa)
for x in y      → repete para cada item de y
range(n)        → gera números de 0 até n-1
range(a, b)     → gera números de a até b-1
range(a, b, c)  → gera de a até b pulando de c em c
def nome():     → cria uma função
nome()          → chama uma função
parametro       → valor que você passa pra função
lista = []      → guarda vários valores
lista[0]        → pega o primeiro item da lista
input()         → para e espera o usuário digitar


HTML

<!DOCTYPE html>    → avisa o navegador que é HTML moderno
<html>             → começo de tudo
<head>             → parte invisível (configurações)
<body>             → parte visível (o que o usuário vê)
<title>            → nome que aparece na aba do navegador
<meta charset>     → define que aceita acentos e caracteres especiais
<meta viewport>    → faz a página funcionar bem no celular
<link>             → conecta um arquivo externo (ex: style.css)
<h1> até <h6>      → títulos, do maior ao menor
<p>                → parágrafo de texto
<div>              → caixa invisível pra organizar elementos
<span>             → igual ao div mas pra texto inline
<button>           → botão clicável
<input>            → campo pra usuário digitar
<textarea>         → campo de texto maior
<img>              → imagem
<a>                → link clicável
<ul> / <ol>        → lista (sem número / com número)
<li>               → item de lista
<form>             → formulário
<label>            → texto explicativo de um campo
<select>           → dropdown de opções
<option>           → cada opção do dropdown
<script>           → onde entra JavaScript


CSS

color             → cor do texto
background-color  → cor de fundo
font-size         → tamanho da fonte
font-weight       → espessura (bold = negrito)
font-family       → tipo da fonte
margin            → espaço do lado de fora do elemento
padding           → espaço do lado de dentro do elemento
border            → borda ao redor do elemento
width / height    → largura / altura
display: flex     → organiza elementos lado a lado
display: grid     → organiza em grade
justify-content   → alinha horizontalmente
align-items       → alinha verticalmente
border-radius     → arredonda as bordas
box-shadow        → sombra no elemento
cursor: pointer   → muda o cursor pra mãozinha
opacity           → transparência (0 = invisível, 1 = visível)
transition        → animação suave ao mudar algo


JAVASCRIPT

document.getElementById()   → pega um elemento pelo id
document.querySelector()    → pega um elemento pelo CSS selector
element.innerHTML            → muda o conteúdo de um elemento
element.style                → muda o estilo de um elemento
addEventListener()           → escuta um evento (clique, tecla, etc)
fetch()                      → faz chamada pra uma API
async / await                → espera uma resposta sem travar tudo
JSON.stringify()             → transforma objeto em texto
JSON.parse()                 → transforma texto em objeto
console.log()                → igual ao print, mas no navegador