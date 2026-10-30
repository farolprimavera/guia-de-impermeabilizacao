/* ==========================================================================
   totem.js — modo totem

   Depois de um tempo sem ninguém mexer, o guia volta sozinho para a tela
   inicial, limpa e no topo. É para os totens Android da loja: o cliente vai
   embora no meio de uma ficha e o próximo encontra a tela inicial, não o
   produto que o outro estava olhando.

   VEIO DO SITE DE TINTAS, onde já roda. Lá o tempo é de 5 minutos; aqui
   começou com 5 e o David baixou para 2 em 27/10. O resto é
   igual — aviso de 15 s e volta ao início —, mas a implementação foi adaptada
   a este guia em três pontos, e cada um está explicado onde acontece:
   as cores saíram do JavaScript e foram para o styles.css, a volta ao início
   recarrega a página, e a checagem de "está na inicial" entende a navegação
   por hash daqui.

   ALÉM DISSO, desde 30/10 este arquivo marca o <html> com data-totem, e o
   styles.css usa essa marca para esconder os links de WhatsApp no aparelho
   da loja. O motivo está junto da linha que põe a marca.

   SÓ FUNCIONA NO APARELHO MARCADO. Quem abre o guia em casa, pelo link, não
   é mandado de volta para o início no meio da navegação:
     abra uma vez   .../index.html?totem=1   → o aparelho vira totem
     para desligar  .../index.html?totem=0
   ========================================================================== */

(function () {
  "use strict";

  var MINUTOS = 2;               // tempo parado até voltar ao início
  var AVISO = 15;                // segundos de aviso antes de voltar
  var CHAVE = "farol-totem";
  var INICIO = "index.html";

  /* ---------------------------------------------------------------------
     A ÚNICA EXCEÇÃO À REGRA "SEM localStorage" DO PROJETO.

     A regra 4 do CLAUDE.md existe para que a preferência de um cliente não
     sobre para o próximo no aparelho compartilhado — é por isso que o tema
     escuro e a bandeja de comparação não são guardados.

     Aqui é o contrário: isto não é preferência de cliente, é configuração
     DO APARELHO, posta uma vez por quem instala o totem. Ela PRECISA
     sobreviver ao recarregamento, porque o próprio modo totem recarrega a
     página o dia inteiro. Guardar na memória não funcionaria.

     Se um dia alguém for "consertar" isto por causa da regra 4: a regra
     continua valendo para estado de cliente. Esta linha não é estado de
     cliente.
     --------------------------------------------------------------------- */
  var ligado = false;
  try {
    var p = new URLSearchParams(location.search).get("totem");
    if (p === "1") localStorage.setItem(CHAVE, "1");
    if (p === "0") localStorage.removeItem(CHAVE);
    ligado = localStorage.getItem(CHAVE) === "1";
  } catch (e) {
    /* Navegador com dados bloqueados: vale só para esta visita. Sem isto,
       um erro aqui derrubaria o resto do script. */
    ligado = new URLSearchParams(location.search).get("totem") === "1";
  }
  if (!ligado) return;

  /* MARCA O <html>, E É DAQUI QUE O CSS ESCONDE O QUE APONTA PARA FORA.
     No totem o botão "Chamar no WhatsApp" da ficha e o link igual no rodapé
     não fazem sentido, por três motivos: o cliente já está dentro da loja; o
     aparelho é da loja, então o wa.me abriria o WhatsApp DO TOTEM, com a
     conta de quem estiver logado nele ou numa tela de login; e o toque
     levaria o cliente para outro aplicativo, que é justamente o que este
     arquivo existe para evitar. O que o vendedor precisa — o código do
     produto — continua na tela.

     AS REDES SOCIAIS DO RODAPÉ CONTINUAM, por decisão do David em 30/10.
     Elas têm o mesmo risco de levar o cliente para fora; se um dia o totem
     aparecer parado num feed, é só acrescentar `.rodape-rede` à regra do
     styles.css — não há mais nada a mudar.

     POR QUE CSS, E NÃO DEIXAR DE DESENHAR NO index.js: o index.js monta a
     tela inteira na hora em que é lido, ANTES deste arquivo, então na hora
     de montar a ficha ainda não há como saber que o aparelho é um totem.
     Pelo CSS funciona de qualquer jeito, inclusive nas telas que ele
     redesenha depois, e sem piscar — a pintura só acontece quando o parser
     termina os dois scripts. */
  document.documentElement.setAttribute("data-totem", "1");

  /* O tempo que o contador espera ANTES de mostrar o aviso. O aviso ocupa
     os últimos AVISO segundos do total, por isso a subtração.

     O piso de 1 segundo não é preciosismo: com AVISO maior que o total, a
     conta dá negativo e o setTimeout dispara na hora, o que põe o aviso num
     laço — ele reaparece no instante em que o cliente o dispensa. Caí nisso
     testando com 0,1 min e 15 s de aviso, e por um momento pareceu que o
     botão "Continuar aqui" não funcionava. Quem for encurtar os tempos para
     testar vai passar pelo mesmo: encurte os dois. */
  var espera = Math.max(MINUTOS * 60 * 1000 - AVISO * 1000, 1000);
  var timer = null;
  var contagem = null;
  var aviso = null;

  /* RECARREGA A PÁGINA em vez de só trocar o hash para #/inicio. Trocar o
     hash levaria à tela inicial, mas deixaria para trás o que ficou em
     memória: a bandeja de comparação com os produtos do cliente anterior, o
     campo de metragem preenchido, a rolagem. Como o estado todo deste guia
     vive em memória (regra 4), recarregar é justamente o que limpa tudo. */
  function voltar() {
    location.replace(INICIO);
  }

  function esconderAviso() {
    clearInterval(contagem);
    contagem = null;
    if (aviso) {
      aviso.remove();
      aviso = null;
    }
  }

  function mostrarAviso() {
    var resta = AVISO;

    aviso = document.createElement("div");
    aviso.className = "totem-aviso";
    aviso.setAttribute("role", "alertdialog");
    aviso.setAttribute("aria-live", "assertive");
    aviso.setAttribute("aria-labelledby", "totemTitulo");

    /* Sem estilo embutido: as cores vêm do styles.css, que já inverte no
       tema escuro. O arquivo de tintas desenha a caixa com branco fixo no
       próprio JavaScript; aqui isso deixaria uma caixa branca acesa no meio
       da tela escura, e o guia tem tema escuro desde 28/08. */
    aviso.innerHTML =
      '<div class="totem-caixa">' +
        '<p class="totem-titulo" id="totemTitulo">Ainda está aí?</p>' +
        '<p class="totem-texto">Voltando para o início em ' +
          '<b id="totemSeg">' + resta + "</b> s.</p>" +
        '<button class="botao botao--cheio totem-botao" type="button">Continuar aqui</button>' +
      "</div>";

    document.body.appendChild(aviso);

    /* O foco vai para o botão. Quem usa leitor de tela ouve o aviso pelo
       role, e quem usa teclado não precisa caçar o controle antes dos 15 s
       acabarem. */
    var botao = aviso.querySelector(".totem-botao");
    if (botao) botao.focus();

    contagem = setInterval(function () {
      resta -= 1;
      var s = document.getElementById("totemSeg");
      if (s) s.textContent = resta;
      if (resta <= 0) {
        clearInterval(contagem);
        contagem = null;
        voltar();
      }
    }, 1000);
  }

  function armar() {
    clearTimeout(timer);
    timer = setTimeout(mostrarAviso, espera);
  }

  /* Qualquer sinal de gente na frente da tela desarma e recomeça a contagem.
     O botão "Continuar aqui" não precisa de clique próprio: o toque nele já
     passa por aqui, porque o ouvinte está na janela com capture. */
  function atividade() {
    if (aviso) esconderAviso();
    armar();
  }

  ["pointerdown", "touchstart", "keydown", "wheel", "scroll", "input"].forEach(
    function (ev) {
      window.addEventListener(ev, atividade, { passive: true, capture: true });
    }
  );

  /* NA INICIAL LIMPA, NÃO COMEÇA A CONTAR. Sem isto o totem recarregaria a
     tela inicial a cada 2 minutos a noite inteira, sem ninguém na frente.
     O contador só nasce quando alguém mexe.

     A checagem olha o hash porque a navegação deste guia é toda por hash:
     `#/produto/...`, `#/problema/...`. Hash vazio é a tela inicial. E o
     `rotear()` do index.js lê o hash sem escrever nele quando está vazio —
     conferido, senão esta checagem viraria mentira já no primeiro desenho da
     tela e o totem entraria em laço de recarregamento.

     A busca não entra na conta: ela é um campo na própria tela inicial, não
     uma rota. Quem digita nela dispara o evento `input` e arma o contador
     por esse caminho. */
  var naInicial =
    /(^|\/)(index\.html)?$/.test(location.pathname) &&
    (!location.hash || location.hash === "#/inicio");

  if (!naInicial) armar();
})();
