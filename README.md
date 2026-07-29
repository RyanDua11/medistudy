<p align="center">
  <a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.demolab.com?font=Georgia&size=26&pause=1200&color=F4D06F&center=true&vCenter=true&width=900&lines=MediStudy;App+de+estudo+que+se+adapta+a+cada+aluno+de+medicina" alt="Typing SVG"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-1a1008?style=flat&logo=html5&logoColor=F4D06F" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1a1008?style=flat&logo=css3&logoColor=F4D06F" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-1a1008?style=flat&logo=javascript&logoColor=F4D06F" alt="JavaScript"/>
</p>

<img src="assets/hero.svg" width="100%" alt="MediStudy"/>

<p align="center">
  <img src="screenshots/login.webp" width="45%" alt="Tela de login do MediStudy"/>
  <img src="screenshots/home.png" width="45%" alt="Home do MediStudy com a Missão do dia"/>
</p>

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="indice"><img src="assets/heading-indice.svg" alt="Índice"/></h2>

- [Motivação](#user-content-motivacao)
- [O que foi construído](#user-content-construido)
- [Números de impacto](#user-content-impacto)
- [Decisões técnicas](#user-content-decisoes)
- [Arquitetura e modelagem de dados](#user-content-arquitetura)
- [Stack](#user-content-stack)
- [Como rodar localmente](#user-content-rodar)
- [Onde está hoje](#user-content-hoje)
- [Visão futura](#user-content-futuro)

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-motivacao"><img src="assets/heading-motivacao.svg" alt="Motivação"/></h2>

O gatilho foi ver a namorada, que tem TDAH, usando várias ferramentas de estudo diferentes ao mesmo tempo para dar conta da faculdade de medicina. Cada ferramenta resolvia um pedaço, nenhuma resolvia o problema inteiro. Captei o que ela realmente usava no dia a dia e comecei o MediStudy a partir disso.

O formato final veio de uma reflexão mais ampla. Cerca de um ano e meio antes, eu já tinha pedido um protótipo de "MediStudy" ao Claude, via chat: era só conversa, esbarrava no limite de token do plano e exigia pedir tudo de novo a cada uso. Usar várias ferramentas soltas tinha o mesmo problema de fundo, cada uma pedia acesso e configuração próprios. O MediStudy nasce como resposta a essa fragmentação, antecipando tudo num só lugar em vez de forçar o aluno a montar o próprio quebra-cabeça de ferramentas.

O TDAH da namorada foi o gatilho real, mas o MediStudy não é pensado como um app de nicho para TDAH. A filosofia central é ser um "camaleão": a IA se adapta ao máximo a cada estudante individualmente, qualquer que seja o jeito dele de aprender, não só ao caso que disparou a ideia. Construir isso também é, na prática, a forma que escolhi para aprender fundamentos de programação.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-construido"><img src="assets/heading-construido.svg" alt="O que foi construído"/></h2>

O MediStudy está no começo do desenvolvimento. Hoje existem duas telas prontas e com acabamento visual premium: Login e Home.

O **Login** tem identidade clínica, dourado e vinho sobre fundo escuro, fonte Cinzel. A identificação é por nome e email. Tentar enviar com um campo vazio bloqueia o envio com feedback visual, o campo pisca em vermelho, em vez de um alert do navegador. Apertar Enter dispara o login, igual clicar no botão. Ao confirmar, o card "acende" e sobe sozinho enquanto o fundo desfoca em sincronia, antes de trocar para a tela de boas-vindas com fade de opacidade.

A **Home** tem um header fixo com o nome do usuário lido dinamicamente do `localStorage`. O bloco "Missão do dia" é o centro da tela: a filosofia de UX aqui é reduzir decisão em vez de mostrar informação demais, um foco único do dia, não um painel cheio de números. Ao lado, uma ilustração de coração pulsando com brilho dourado e uma linha de ECG animada correndo continuamente atrás dele, feita em SVG puro, sem biblioteca externa de animação.

O grid de ferramentas de estudo (Flashcards, Casos Clínicos, Mapas Mentais, Questões, Simulador de Anamnese, Explique pro Professor) e o bloco "continue de onde parou" ainda não foram implementados. Isso está descrito na seção [Visão futura](#user-content-futuro), junto com o restante do planejamento do produto.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-impacto"><img src="assets/heading-impacto.svg" alt="Números de impacto"/></h2>

<img src="assets/impact-metrics.svg" width="100%" alt="Uso real do MediStudy"/>

Sem base de usuários para mostrar ainda, então o número honesto aqui é uso real, não simulado: o próprio Ryan e a namorada, estudando para o 4º período de medicina, usam o app no dia a dia.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-decisoes"><img src="assets/heading-decisoes.svg" alt="Decisões técnicas"/></h2>

**Onde chamar `localStorage.setItem`?**
Na primeira versão a chamada estava fora do listener de clique do botão Entrar. O nome do usuário não persistia corretamente entre o login e a Home, porque o valor era lido antes de o usuário efetivamente preencher o campo. Movi a chamada para dentro do handler de clique, junto com a leitura dos valores dos inputs, o que resolveu a perda de dado entre as duas telas.

**Animar o card e o fundo com transições independentes ou com um estado compartilhado?**
A primeira tentativa animava o card (`#login-container`) e o wallpaper de fundo (`body::before`) com transições próprias, cada um reagindo ao seu próprio gatilho. O efeito de "o card acende e sobe" e o desfoque do fundo rodavam de forma perceptivelmente descolada. Troquei para os dois reagirem à mesma classe CSS (`ativo`), aplicada simultaneamente ao `body` e ao card, o que garante que os dois efeitos disparam no mesmo instante.

**Como animar a linha de ECG sem depender de uma lib externa?**
Em vez de trazer uma biblioteca de animação só para simular uma linha "correndo", o efeito é feito com camadas de `<path>` (`ecg-c1` a `ecg-c4`) usando o mesmo traçado, cada uma defasada e com opacidade diferente via `pathLength` e `stroke-dashoffset` em CSS. A sobreposição das camadas cria a sensação de traço contínuo com brilho, sem nenhuma dependência JS extra.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-arquitetura"><img src="assets/heading-arquitetura.svg" alt="Arquitetura e modelagem de dados"/></h2>

O código-fonte não faz parte deste repositório (ver nota abaixo), então esta seção descreve a arquitetura em alto nível, não a estrutura de pastas real.

<img src="assets/architecture-flow.svg" width="100%" alt="Fluxo de dados do MediStudy hoje"/>

Hoje o MediStudy é front-end puro, HTML, CSS e JavaScript sem framework e sem build step. Não há backend rodando. A única persistência é o `localStorage` do navegador, guardando o nome do usuário entre a tela de login e a Home. Não existe schema de banco de dados hoje, modelagem de dados é parte do roadmap (ver [Visão futura](#user-content-futuro)).

> Este repositório guarda apenas documentação, identidade visual do README e screenshots do produto renderizado. O código-fonte do MediStudy não é público.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-stack"><img src="assets/heading-stack.svg" alt="Stack"/></h2>

<img src="assets/stack-table.svg" width="100%" alt="Stack técnica do MediStudy"/>

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-rodar"><img src="assets/heading-rodar.svg" alt="Como rodar localmente"/></h2>

O código-fonte do MediStudy não está neste repositório, então não há como rodar o projeto a partir daqui. Esta seção existe só para manter a estrutura padrão de documentação; quando o produto avançar o suficiente para justificar abrir o código, esta seção será atualizada com os passos reais.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-hoje"><img src="assets/heading-hoje.svg" alt="Onde está hoje"/></h2>

Em desenvolvimento ativo, bem no começo. Login e Home estão prontas e em uso real por Ryan e a namorada. O restante do planejamento (funcionalidades de estudo com IA, banco de dados, backend) ainda está por construir.

<img src="assets/divider.svg" width="100%" height="6" role="presentation"/>

<h2 id="user-content-futuro"><img src="assets/heading-futuro.svg" alt="Visão futura"/></h2>

> Ainda não implementado, visão futura, cada item pensado como mais uma forma de a IA se adaptar ao estudante:
> - Grid de ferramentas de estudo: flashcards com repetição espaçada, casos clínicos gerados por IA, mapa mental interativo, modo "explique pro professor", simulador de anamnese com IA no papel do paciente, interpretador de exames.
> - Orquestração de múltiplas IAs (Claude para raciocínio pesado, Groq para respostas rápidas, Gemini para imagem/PDF), escolhendo o modelo certo por tipo de pedido, priorizando custo.
> - Diário de erros inteligente, identificando o padrão de dificuldade do próprio aluno.
> - Integração com calendário de provas e contexto por matéria e professor.
