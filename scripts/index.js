/* ==========================================================================
   index.js — navegação, montagem das telas, busca e comparação.

   COMO ESTE ARQUIVO É ORGANIZADO
     1. Atalhos e formatação
     2. Calculadora de m²
     3. Bloco de preço
     4. Imagens (logo de marca e foto de produto)
     5. Telas, navegação e migalhas
     6. Roteador
     7. Montagem de cada tela, na ordem em que o cliente as encontra
     8. Comparação
     9. Busca
    10. Partida

   REGRAS QUE VALEM PARA O ARQUIVO INTEIRO

   Conteúdo não mora aqui. Nome de produto, preço, rendimento e texto de
   ficha ficam todos em dados.js. Se você precisou digitar o nome de um
   produto neste arquivo, provavelmente está no lugar errado.

   Nada de framework, build ou npm. O guia roda abrindo o index.html, sem
   servidor. Isso é requisito: ele precisa funcionar num computador de
   balcão com internet ruim, ou sem internet nenhuma.

   Nada de localStorage. O aparelho é compartilhado entre clientes; o que
   um pesquisou não pode aparecer para o próximo.

   A tela nunca quebra por imagem faltando. Foto de produto some, logo de
   marca vira iniciais. Sempre.

   Acessibilidade não é enfeite. Todo alvo de toque tem no mínimo 44 px,
   toda imagem tem alt, todo botão alcançável por teclado.
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------- ATALHOS ----------------------------- */

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  /* Tudo que vem do dados.js passa por aqui antes de virar HTML. Nome de
     produto com & ou aspas quebraria a marcação, e um dia alguém vai
     cadastrar "Manta 3M & Cia" na planilha. */
  const escapar = (texto) =>
    String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  /* Buscas por id. São listas curtas (22 marcas, 7 problemas, 66 produtos),
     então varrer o array é mais simples e rápido o bastante. */
  const marcaDe = (id) => MARCAS.find((m) => m.id === id);
  const problemaDe = (id) => PROBLEMAS.find((p) => p.id === id);
  const produtoDe = (id) => PRODUTOS.find((p) => p.id === id);

  const produtosDaMarca = (id) => PRODUTOS.filter((p) => p.marcaId === id);
  const produtosDoProblema = (id) => PRODUTOS.filter((p) => p.problemas.includes(id));

  // O preço que vale para o cliente é a oferta, quando existe; senão, o à vista.
  const melhorPreco = (t) => (t.precoOferta != null ? t.precoOferta : t.precoVista);

  /* O menor preco entre os tamanhos, para o cartão dizer "a partir de". */
  const menorPreco = (produto) =>
    Math.min.apply(null, produto.tamanhos.map(melhorPreco));

  /* O tamanho que aparece no topo da ficha. E o mais barato, não o menor:
     quem chega quer saber por quanto comeca. */
  const tamanhoMaisBarato = (produto) =>
    produto.tamanhos.reduce((a, b) => (melhorPreco(a) <= melhorPreco(b) ? a : b));

  /* ---------------------------- CALCULADORA ----------------------------
     Converte metros quadrados em quantidade de embalagens. Só funciona
     onde a ficha do fabricante dá um rendimento confiável: quando o
     rendimento é "por demão" e o número de demãos não está na ficha, o
     campo coberturaMin vem nulo e a conta não aparece. Chutar aqui faria
     o cliente comprar material a menos e voltar bravo à loja. */
  /* Categorias em que ninguém compra por metro quadrado. Veda calha se
     compra por tubo, espuma por lata, massa de calafetar por bisnaga: o
     consumo depende do comprimento da junta ou do tamanho do furo, não da
     área. Nesses produtos a calculadora não aparece — mostrar "consulte o
     vendedor" sugeria que faltava um dado, quando na verdade a pergunta é
     que não se aplica. */
  const SEM_CALCULO_POR_AREA = [
    "Veda calha",
    "Espuma expansiva",
    "Massa de calafetar",
    "Selante de junta",
    "Massa de vedação",
    "Massa para trinca",
    "Adesivo estrutural",
    "Adesivo para argamassa",
    "Removedor",
    "Desmoldante",
    "Reparo emergencial",
    "Tamponamento",
    "Fita multiuso",
    /* Aditivo impermeabilizante entra aqui por um motivo diferente dos
       outros: ele não se dosa por metro quadrado, e sim por saco de
       cimento. Votoran Imperplus são 2 L por saco de 50 kg; Contra
       Umidade Viapol, 2 L por saco em argamassa e 0,5 L em concreto.
       Quem aplica precisa saber quantos sacos vai usar, não quantos m²
       de parede tem. A dosagem aparece no campo de rendimento da ficha. */
    "Aditivo impermeabilizante",
    /* "Selador de fissura" saiu desta lista: o representante da AditivMais
       respondeu o rendimento do Selatop em metro quadrado acabado, então a
       pergunta se aplica. */
  ];

  const calculaPorArea = (produto) =>
    SEM_CALCULO_POR_AREA.indexOf(produto.categoria) === -1;

  /* Teto de 2000 m². Não é limitação técnica: é que o guia atende obra de
     casa, e acima disso quase sempre é erro de digitação. Sem o teto, um
     dedo escorregado no teclado devolvia "50 mil embalagens, R$ 1,9 milhão",
     que faz o cliente desconfiar da ferramenta inteira. Obra grande de
     verdade precisa de vendedor, não de calculadora de balcão. */
  const METRAGEM_MAXIMA = 2000;

  function calcularEmbalagens(t, metros) {
    if (!t.coberturaMin || !metros || metros <= 0) return null;
    if (metros > METRAGEM_MAXIMA) return { exagerada: true };
    // A maior cobertura gasta menos embalagens, e vice-versa.
    const menos = Math.ceil(metros / t.coberturaMax);
    const mais = Math.ceil(metros / t.coberturaMin);
    // Preço desatualizado não vira conta: o bloco de preço já diz "a
    // confirmar", e mostrar um total aqui contradiria a própria tela.
    if (t.precoDesatualizado) {
      return { menos: menos, mais: mais, exato: menos === mais, semPreco: true };
    }
    const preco = melhorPreco(t);
    return {
      menos: menos,
      mais: mais,
      custoMenos: menos * preco,
      custoMais: mais * preco,
      exato: menos === mais
    };
  }

  function textoCalculo(t, metros, melhorConta) {
    const c = calcularEmbalagens(t, metros);
    if (c && c.exagerada) {
      return '<p class="calculo calculo--sem">Metragem acima de ' +
        METRAGEM_MAXIMA + " m². Para obra desse tamanho, fale com o vendedor " +
        "pelo " + escapar(CONFIG.telefone) + ".</p>";
    }
    if (!c) {
      const motivo = t.coberturaObs
        ? "Rendimento não fecha para calcular: " + t.coberturaObs + "."
        : "Rendimento não informado pelo fabricante.";
      return '<p class="calculo calculo--sem">' + escapar(motivo) +
        " Confirme a quantidade com o vendedor.</p>";
    }
    const unidade = c.exato && c.menos === 1 ? "embalagem" : "embalagens";
    const qtd = c.exato ? String(c.menos) : c.menos + " a " + c.mais;
    const custo = c.semPreco
      ? "Preço a confirmar com o vendedor"
      : c.exato
        ? moeda.format(c.custoMenos)
        : moeda.format(c.custoMenos) + " a " + moeda.format(c.custoMais);
    return '<p class="calculo' + (melhorConta ? " calculo--melhor" : "") + '">' +
      (melhorConta ? '<span class="calculo-selo">Sai em conta</span>' : "") +
      '<span class="calculo-qtd">' + qtd + " " + unidade + "</span>" +
      '<span class="calculo-custo">' + custo + "</span>" +
      (c.exato ? "" : '<span class="calculo-nota">A faixa existe porque o ' +
        "rendimento varia com a superfície. Na dúvida, leve pela conta maior.</span>") +
      "</p>";
  }

  /* Bloco de preço. A condição anda colada ao valor, nunca em letra miúda:
     a super oferta só vale à vista e retirando na loja. */
  /* O terceiro parâmetro é o rótulo do tamanho. Só vem preenchido nos
     lugares onde o preço mostrado é o do tamanho mais barato entre
     vários: no cartão da lista e no topo da ficha. Sem ele, a Fita Veda
     Tudo aparecia com foto de rolo e o preço de R$ 9,90 do blister, e
     quem batesse o olho acharia que o rolo custava isso. Nos blocos de
     cada tamanho o rótulo já é o título, então não se repete. */
  function blocoPreco(t, compacto, rotuloTamanho) {
    if (t.precoDesatualizado) {
      return '<div class="preco preco--sem">' +
        '<span class="preco-rotulo">Preço a confirmar' +
          (rotuloTamanho ? " · " + escapar(rotuloTamanho) : "") + "</span>" +
        '<span class="preco-condicao">Consulte o vendedor pelo ' + escapar(CONFIG.telefone) + "</span>" +
        "</div>";
    }

    const temOferta = t.precoOferta != null;
    const destaque = temOferta ? t.precoOferta : t.precoVista;
    const linhas = [];

    // Na vitrine (compacto), quem tem oferta mostra só a oferta.
    // Na ficha do produto o valor cheio aparece, para o cliente que vai
    // pagar no cartão saber quanto custa antes de chegar ao caixa.
    if (temOferta && !compacto) {
      linhas.push(t.precoPrazo > t.precoVista
        ? '<span class="preco-alt">Fora da oferta: à vista ' + moeda.format(t.precoVista) +
          " · a prazo " + moeda.format(t.precoPrazo) + "</span>"
        : '<span class="preco-alt">Fora da oferta: ' + moeda.format(t.precoVista) + "</span>");
    }
    // Sem cálculo de parcela na tela: só o valor a prazo.
    // A condição de parcelamento é conversa de balcão, não de vitrine.
    if (!temOferta && t.precoPrazo > t.precoVista) {
      linhas.push('<span class="preco-alt">a prazo ' + moeda.format(t.precoPrazo) + "</span>");
    }

    return '<div class="preco' + (temOferta ? " preco--oferta" : "") + '">' +
      (temOferta ? '<span class="preco-selo">Super oferta</span>' : "") +
      /* valor e tamanho na mesma linha: em colunas separadas o rótulo
         caía embaixo do preço e parecia outra informação */
      '<div class="preco-linha-valor">' +
        '<span class="preco-valor">' + moeda.format(destaque) + "</span>" +
        (rotuloTamanho
          ? '<span class="preco-tamanho">a partir de · ' + escapar(rotuloTamanho) + "</span>"
          : "") +
      "</div>" +
      '<span class="preco-condicao">' +
        escapar(temOferta ? CONFIG.condicaoOferta : CONFIG.condicaoVista) +
      "</span>" +
      (linhas.length ? '<div class="preco-linhas">' + linhas.join("") + "</div>" : "") +
      "</div>";
  }

  /* -------------------------- ESTADO DA TELA -------------------------- */

  const estado = {
    comparacao: [],
    acessoriosDoProblema: []
  };

  /* --------------------------- IMAGENS ------------------------------- */
  /* As imagens ficam em imagens/. Enquanto o arquivo não existir, entra um
     bloco com as iniciais no lugar — a tela nunca fica quebrada.           */

  /* Iniciais como reserva do logo, enquanto o arquivo não existe.
     Prefixo fixo não serve: com 2 letras Tecryl e Tekbond viram TE, com 3
     Votoran e Votomassa viram VOT. Então cada marca cresce até deixar de
     colidir com as outras, e para aí. Recalcula sozinho quando o catálogo
     mudar, sem ninguém precisar lembrar deste detalhe. */
  const iniciaisDaMarca = (nome) => {
    const limpo = nome.trim().toUpperCase();
    for (let n = 2; n <= 6; n++) {
      const minhas = limpo.slice(0, n);
      const iguais = MARCAS.filter(
        (m) => m.nome.trim().toUpperCase().slice(0, n) === minhas
      ).length;
      if (iguais <= 1) return minhas;
    }
    return limpo.slice(0, 6);
  };

  /* Logo da marca. Se o arquivo não existir, aplicarFallbackImagens troca
     por iniciais. Nunca deixa buraco na tela. */
  function selo(caminho, nome) {
    const iniciais = iniciaisDaMarca(nome);
    return (
      '<img class="selo" data-fallback="' + escapar(iniciais) + '" ' +
      'src="' + escapar(caminho) + '" alt="Logo ' + escapar(nome) + '">'
    );
  }

  /* O bloco da foto nasce escondido e só aparece quando a imagem carrega
     de verdade. Assim o carregamento preguiçoso não deixa espaço vazio nos
     cartões que ainda não têm foto. */
  function esconderFotosAusentes(raiz) {
    raiz.querySelectorAll("[data-some-sem-foto] img").forEach(function (img) {
      const caixa = img.closest("[data-some-sem-foto]");

      const mostrar = function () { if (caixa) caixa.classList.add("produto-foto--ok"); };
      const remover = function () { if (caixa) caixa.remove(); };

      if (img.complete && img.naturalWidth > 0) return mostrar();
      img.addEventListener("load", mostrar);
      img.addEventListener("error", remover);
    });
  }

  /* Mesma ideia do esconderFotosAusentes, mas para imagens que precisam
     deixar algo no lugar: o logo da marca vira uma div com as iniciais,
     preservando a classe para o CSS continuar valendo. */
  function aplicarFallbackImagens(raiz) {
    raiz.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", function () {
        const caixa = document.createElement("div");
        caixa.className = img.className;
        caixa.textContent = img.dataset.fallback;
        caixa.setAttribute("aria-hidden", "true");
        img.replaceWith(caixa);
      });
    });
  }

  /* ---------------------------- NAVEGAÇÃO ---------------------------- */

  const TELAS = {
    inicio: "tela-inicio",
    marcas: "tela-marcas",
    problemas: "tela-problemas",
    lista: "tela-lista",
    produto: "tela-produto",
    comparar: "tela-comparar"
  };

  /* Troca a tela visível. Todas existem no HTML desde o início e ficam
     escondidas por hidden; não há carregamento de página. */
  function mostrarTela(nome) {
    Object.values(TELAS).forEach((id) => {
      const secao = document.getElementById(id);
      secao.hidden = true;
      secao.classList.remove("tela--ativa");
    });
    const alvo = document.getElementById(TELAS[nome]);
    alvo.hidden = false;
    alvo.classList.add("tela--ativa");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* Acende o item do menu do topo correspondente à tela atual. */
  function marcarMenu(nome) {
    $$(".menu-item").forEach((b) => {
      b.setAttribute("aria-current", b.dataset.ir === nome ? "true" : "false");
    });
  }

  /* Navegação interna. Mexe só no hash: quem roteia e a funcao rotear,
     escutando o evento hashchange. Assim o botão Voltar do navegador
     funciona de graca. */
  function irPara(rota) {
    window.location.hash = "#/" + rota;
  }

  /* O caminho "Inicio / Dryko / Drykolaje Top" no alto da tela. Serve para
     o cliente saber onde está e conseguir subir um nível sem se perder. */
  function migalhas(trilha) {
    const faixa = $("#migalhasFaixa");
    const alvo = $("#migalhas");

    if (!trilha || trilha.length === 0) {
      faixa.hidden = true;
      alvo.innerHTML = "";
      return;
    }

    faixa.hidden = false;
    alvo.innerHTML = trilha
      .map((item, i) => {
        const sep = i > 0 ? '<span class="migalha-sep" aria-hidden="true">/</span>' : "";
        if (!item.rota) {
          return sep + '<span class="migalha migalha--atual">' + escapar(item.texto) + "</span>";
        }
        return (
          sep +
          '<button class="migalha" data-rota="' + escapar(item.rota) + '">' +
          escapar(item.texto) +
          "</button>"
        );
      })
      .join("");
  }

  /* ------------------------------ ROTEADOR ------------------------------ */

  /* Coração da navegação. Le o hash, quebra em partes e chama quem monta a
     tela. Rota desconhecida cai no início, então link velho ou digitado
     errado nunca deixa a tela em branco. */
  function rotear() {
    const rota = (window.location.hash || "#/inicio").replace(/^#\//, "");
    const partes = rota.split("/");

    switch (partes[0]) {
      case "marcas":
        montarMarcas();
        break;
      case "marca":
        montarListaPorMarca(partes[1]);
        break;
      case "problemas":
        montarProblemas();
        break;
      case "problema":
        montarListaPorProblema(partes[1]);
        break;
      case "produto":
        montarProduto(partes[1]);
        break;
      case "comparar":
        montarComparacao();
        break;
      default:
        montarInicio();
    }
  }

  /* ------------------------------- INÍCIO ------------------------------- */

  /* Tela inicial: a casa clicável, a busca e as portas por marca e por
     problema. */
  function montarInicio() {
    marcarMenu("inicio");
    migalhas(null);

    montarCasa();

    $("#contagemMarcas").textContent =
      MARCAS.length + " marcas · " + PRODUTOS.length + " produtos";
    $("#contagemProblemas").textContent =
      PROBLEMAS.length + " situações mais comuns no balcão";

    mostrarTela("inicio");
  }

  /* ---------------------------- MAPA DA CASA ---------------------------- */

  /* Desenha os pontos clicáveis por cima da imagem da casa. As posições vêm
     de CASA.pontos, em porcentagem, medidas na própria imagem por detecção
     de cor das etiquetas azuis: não foram estimadas no olho. Porcentagem e
     não pixel porque a imagem encolhe junto com a tela.

     A lista de botões abaixo repete as mesmas áreas. Acima de 1000 px ela
     some por CSS; abaixo disso os pontos ficam com menos de 44 px de altura
     e a lista passa a ser a forma prática de navegar no dedo. */
  function montarCasa() {
    const quadro = $("#casaQuadro");
    const imagem = $("#casaImagem");

    imagem.alt = CASA.descricao;
    imagem.src = CASA.imagem;

    // limpa pontos de uma montagem anterior, preservando a imagem
    quadro.querySelectorAll(".ponto").forEach((p) => p.remove());

    const validos = CASA.pontos.filter((ponto) => problemaDe(ponto.problemaId));

    validos.forEach((ponto) => {
      const problema = problemaDe(ponto.problemaId);
      const botao = document.createElement("button");

      botao.className = "ponto";
      botao.dataset.rota = "problema/" + ponto.problemaId;
      botao.style.left = ponto.esquerda + "%";
      botao.style.top = ponto.topo + "%";
      botao.style.width = ponto.largura + "%";
      botao.style.height = ponto.altura + "%";
      botao.setAttribute("aria-label", "Ver produtos para " + problema.nome);
      botao.innerHTML = '<span class="ponto-texto">' + escapar(ponto.rotulo) + "</span>";

      quadro.appendChild(botao);
    });

    $("#casaLegenda").textContent =
      "Toque em uma das " + validos.length + " áreas marcadas";

    // os mesmos pontos, em botões grandes
    $("#casaLista").innerHTML = validos
      .map(
        (ponto) =>
          '<button class="area" data-rota="problema/' + ponto.problemaId + '">' +
            "<span>" + escapar(ponto.rotulo) + "</span>" +
            '<span class="area-seta" aria-hidden="true">→</span>' +
          "</button>"
      )
      .join("");

    // problemas que existem no catálogo mas não aparecem na imagem
    const naImagem = validos.map((p) => p.problemaId);
    const foraDaImagem = PROBLEMAS.filter((p) => naImagem.indexOf(p.id) === -1);

    const atalhos = $("#atalhosGrade");
    atalhos.innerHTML = foraDaImagem
      .map(
        (p) =>
          '<button class="atalho" data-rota="problema/' + p.id + '">' +
          escapar(p.nome) + "</button>"
      )
      .join("");

    atalhos.parentElement.hidden = foraDaImagem.length === 0;
  }

  /* ------------------ CORTE DAS CAMADAS (ficha do produto) ------------------ */

  const CAMADAS = [
    { n: 1, texto: "Substrato preparado, limpo e com caimento" },
    { n: 2, texto: "Primer ou demão diluída" },
    { n: 3, texto: "Impermeabilizante, em demãos cruzadas" },
    { n: 4, texto: "Proteção mecânica ou revestimento" }
  ];

  /* Assinatura visual do guia: um corte do sistema em quatro camadas
     (substrato, primer, impermeabilizante, proteção) com a camada deste
     produto acesa e as outras apagadas. Serve para o cliente entender que
     impermeabilização é um conjunto, não um balde só. A camada de cada
     categoria está em CAMADA_POR_CATEGORIA, no dados.js. */
  function corteDoProduto(produto) {
    const info = CAMADA_POR_CATEGORIA[produto.categoria];
    const ativa = info ? info.camada : 0;
    const apagar = (n) => (ativa && n !== ativa ? " camada--apagada" : "");

    const svg =
      '<svg class="corte-desenho" viewBox="0 0 420 150" role="img" ' +
      'aria-label="Corte do sistema, com a camada deste produto em destaque">' +
        '<defs><pattern id="hachuraFicha" width="10" height="10" ' +
        'patternTransform="rotate(45)" patternUnits="userSpaceOnUse">' +
        '<line x1="0" y1="0" x2="0" y2="10" stroke="var(--linha-forte)" stroke-width="1.5"/>' +
        "</pattern></defs>" +
        '<rect class="camada camada--protecao' + apagar(4) + '" x="30" y="14" width="360" height="26"/>' +
        '<rect class="camada camada--membrana' + apagar(3) + '" x="30" y="40" width="360" height="22"/>' +
        '<rect class="camada camada--primer' + apagar(2) + '" x="30" y="62" width="360" height="10"/>' +
        '<rect class="camada camada--substrato' + apagar(1) + '" x="30" y="72" width="360" height="60"/>' +
        '<rect x="30" y="72" width="360" height="60" fill="url(#hachuraFicha)" opacity="0.35"' +
        (ativa && ativa !== 1 ? ' class="camada--apagada"' : "") + "/>" +
        '<g class="chamadas">' +
          '<line x1="30" y1="27" x2="14" y2="27"/><text x="10" y="31">4</text>' +
          '<line x1="30" y1="51" x2="14" y2="51"/><text x="10" y="55">3</text>' +
          '<line x1="30" y1="67" x2="14" y2="67"/><text x="10" y="71">2</text>' +
          '<line x1="30" y1="102" x2="14" y2="102"/><text x="10" y="106">1</text>' +
        "</g>" +
      "</svg>";

    const lista = CAMADAS.map(
      (c) =>
        "<li" + (c.n === ativa ? ' class="destacada"' : "") + ">" +
        "<span>" + c.n + "</span> " + escapar(c.texto) + "</li>"
    ).join("");

    return (
      '<figure class="corte">' +
        svg +
        '<figcaption class="corte-legenda">' +
          '<span class="corte-titulo">Ordem de aplicação</span>' +
          '<ol class="corte-lista">' + lista + "</ol>" +
          (info ? '<p class="apoio">' + escapar(info.texto) + "</p>" : "") +
        "</figcaption>" +
      "</figure>"
    );
  }

  /* ------------------------------- MARCAS ------------------------------- */

  /* Grade de marcas. O número de produtos é contado na hora, então nunca
     desencontra do catálogo. */
  function montarMarcas() {
    marcarMenu("marcas");
    migalhas([{ texto: "Início", rota: "inicio" }, { texto: "Marcas" }]);

    /* Ordem por tamanho da linha, não alfabética. Alfabética punia quem
       tem catálogo: Dryko com 20 produtos ficava no meio da grade e
       "Outras marcas" — três itens sem fabricante identificado — abria a
       tela. Quem entra por marca quer ver primeiro quem a loja tem de
       verdade. Empate volta à ordem alfabética, para não ficar aleatório,
       e "Outras marcas" vai para o fim porque não é fabricante. */
    const ordenadas = MARCAS.slice().sort((a, b) => {
      if (a.id === "outras") return 1;
      if (b.id === "outras") return -1;
      const diferenca = produtosDaMarca(b.id).length - produtosDaMarca(a.id).length;
      return diferenca !== 0 ? diferenca : a.nome.localeCompare(b.nome, "pt-BR");
    });

    $("#gradeMarcas").innerHTML = ordenadas.map((marca) => {
      const total = produtosDaMarca(marca.id).length;
      return (
        '<button class="cartao" data-rota="marca/' + marca.id + '">' +
          '<div class="cartao-topo">' +
            selo(marca.logo, marca.nome) +
            '<span class="cartao-nome">' + escapar(marca.nome) + "</span>" +
          "</div>" +
          '<span class="cartao-resumo">' + escapar(marca.resumo) + "</span>" +
          '<div class="cartao-rodape">' +
            "<span>" + total + (total === 1 ? " produto" : " produtos") + "</span>" +
            '<span class="cartao-seta">Ver linha →</span>' +
          "</div>" +
        "</button>"
      );
    }).join("");

    aplicarFallbackImagens($("#gradeMarcas"));
    mostrarTela("marcas");
  }

  /* ------------------------------ PROBLEMAS ------------------------------ */

  /* Grade de problemas: as 7 áreas da casa em forma de lista. */
  function montarProblemas() {
    marcarMenu("problemas");
    migalhas([{ texto: "Início", rota: "inicio" }, { texto: "Problemas" }]);

    $("#gradeProblemas").innerHTML = PROBLEMAS.map((problema) => {
      const produtos = produtosDoProblema(problema.id);
      const marcas = Array.from(new Set(produtos.map((p) => p.marcaId)));
      const sintomas = problema.sintomas
        .slice(0, 3)
        .map((s) => '<span class="sintoma">' + escapar(s) + "</span>")
        .join("");

      return (
        '<button class="cartao" data-rota="problema/' + problema.id + '">' +
          '<span class="cartao-nome">' + escapar(problema.nome) + "</span>" +
          '<span class="cartao-resumo">' + escapar(problema.resumo) + "</span>" +
          '<span class="etiqueta-sintomas">' + sintomas + "</span>" +
          '<div class="cartao-rodape">' +
            "<span>" + marcas.length + " marcas · " + produtos.length + " produtos</span>" +
            '<span class="cartao-seta">Ver soluções →</span>' +
          "</div>" +
        "</button>"
      );
    }).join("");

    mostrarTela("problemas");
  }

  /* ------------------------- LISTAS DE PRODUTOS ------------------------- */

  /* O cartão que aparece em todas as listagens. Desenho único de propósito,
     para o cliente reconhecer o padrao em qualquer tela. */
  function cartaoProduto(produto) {
    const marca = marcaDe(produto.marcaId);
    const marcado = estado.comparacao.includes(produto.id);

    return (
      '<article class="produto">' +
        '<div class="produto-lombada" aria-hidden="true"></div>' +
        '<div class="produto-corpo">' +
          // A foto some sozinha se o arquivo ainda não existe: enquanto a
          // pasta imagens/produtos estiver vazia, o cartão fica como antes.
          '<div class="produto-foto" data-some-sem-foto>' +
            // Sem loading="lazy": um bloco escondido fica fora do layout e o
            // carregamento preguiçoso nunca dispara. As fotos são leves.
            '<img src="' + escapar(produto.imagem) + '" alt="Embalagem do ' +
            escapar(produto.nome) + '">' +
          "</div>" +
          "<div>" +
            '<span class="produto-marca">' + escapar(marca ? marca.nome : "") + "</span>" +
            /* O nome é um botão que abre a ficha, e o ::after dele cobre o
               cartão inteiro (truque conhecido como "stretched link"). Assim
               tocar em qualquer ponto do cartão entra no produto, sem criar
               um botão gigante que atrapalharia o leitor de tela. O botão
               Comparar fica por cima, com z-index, e continua funcionando. */
            '<h3 class="produto-nome">' +
              '<button class="produto-link" data-rota="produto/' + escapar(produto.id) + '">' +
                escapar(produto.nome) +
              "</button>" +
            "</h3>" +
          "</div>" +
          '<span class="produto-categoria">' + escapar(produto.categoria) + "</span>" +
          '<p class="produto-resumo">' + escapar(produto.resumo) + "</p>" +
          '<div class="dados-rapidos">' +
            '<div><span class="dado-rotulo">Rendimento</span>' +
              '<span class="dado-valor">' + escapar(produto.rendimento) + "</span></div>" +
            '<div><span class="dado-rotulo">Secagem</span>' +
              '<span class="dado-valor">' + escapar(produto.secagem) + "</span></div>" +
            '<div><span class="dado-rotulo">Demãos</span>' +
              '<span class="dado-valor">' + escapar(produto.demaos) + "</span></div>" +
            '<div><span class="dado-rotulo">Contato com água</span>' +
              '<span class="dado-valor">' + escapar(produto.contatoAgua) + "</span></div>" +
          "</div>" +
          blocoPreco(tamanhoMaisBarato(produto), true,
            produto.tamanhos.length > 1 ? tamanhoMaisBarato(produto).rotulo : null) +
          '<div class="produto-acoes">' +
            '<button class="botao ' + (marcado ? "botao--marcado" : "botao--vazado") +
              '" data-comparar="' + produto.id + '">' +
              (marcado ? "Comparando" : "Comparar") +
            "</button>" +
            '<button class="botao botao--cheio" data-rota="produto/' + produto.id + '">' +
              (produto.tamanhos.length > 1
                ? produto.tamanhos.length + " tamanhos"
                : "Ver ficha") +
            "</button>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* Monta qualquer listagem de produtos, venha ela de marca ou de problema.
     Os acessórios entram em faixa separada, embaixo: eles não competem com
     o impermeabilizante, complementam. */
  function montarLista(cabecalho, produtos, trilha, menu) {
    marcarMenu(menu);
    migalhas(trilha);

    $("#cabecalhoLista").innerHTML = cabecalho;
    const acess = estado.acessoriosDoProblema || [];
    const blocoAcessorios = acess.length
      ? '<div class="faixa-acessorios">' +
          '<p class="atalhos-titulo">Acessórios para esse serviço</p>' +
          '<div class="lista-produtos">' + acess.map(cartaoProduto).join("") + "</div>" +
        "</div>"
      : "";

    $("#listaProdutos").innerHTML = produtos.length
      ? produtos.map(cartaoProduto).join("")
      : '<p class="tabela-vazia">Nenhum impermeabilizante cadastrado para esta área.</p>';

    esconderFotosAusentes($("#listaProdutos"));

    const antigo = document.getElementById("blocoAcessorios");
    if (antigo) antigo.remove();
    if (blocoAcessorios) {
      const caixa = document.createElement("div");
      caixa.id = "blocoAcessorios";
      caixa.innerHTML = blocoAcessorios;
      $("#listaProdutos").after(caixa);
      esconderFotosAusentes(caixa);
    }
    estado.acessoriosDoProblema = [];

    mostrarTela("lista");
  }

  /* Listagem de uma marca. */
  function montarListaPorMarca(id) {
    const marca = marcaDe(id);
    if (!marca) return irPara("marcas");

    const cabecalho =
      '<p class="sobrancelha">Linha ' + escapar(marca.nome) + "</p>" +
      '<h2 id="tituloLista">' + escapar(marca.nome) + "</h2>" +
      '<p class="apoio">' + escapar(marca.resumo) +
      " Mais forte em: " + escapar(marca.forte.toLowerCase()) + ".</p>";

    montarLista(
      cabecalho,
      produtosDaMarca(id),
      [
        { texto: "Início", rota: "inicio" },
        { texto: "Marcas", rota: "marcas" },
        { texto: marca.nome }
      ],
      "marcas"
    );
  }

  /* Listagem de uma área da casa. Separa impermeabilizantes de acessórios
     e guarda os acessórios no estado para montarLista usar. */
  function montarListaPorProblema(id) {
    const problema = problemaDe(id);
    if (!problema) return irPara("problemas");

    // Do mais barato para o mais caro. Primer vai por último: sozinho ele
    // não resolve o problema, é etapa de um sistema.
    const peso = (p) => (p.categoria === "Primer" ? 1 : 0);
    const todos = produtosDoProblema(id).sort(
      (a, b) => peso(a) - peso(b) || menorPreco(a) - menorPreco(b)
    );
    const produtos = todos.filter((p) => !p.acessorio);
    estado.acessoriosDoProblema = todos.filter((p) => p.acessorio);
    const marcas = Array.from(new Set(produtos.map((p) => p.marcaId)))
      .map((m) => marcaDe(m).nome)
      .join(", ");

    const cabecalho =
      '<p class="sobrancelha">Solução por problema</p>' +
      '<h2 id="tituloLista">' + escapar(problema.nome) + "</h2>" +
      '<p class="apoio">' + escapar(problema.resumo) +
      (marcas ? " Marcas disponíveis: " + escapar(marcas) + "." : "") + "</p>" +
      '<div class="aviso-atencao"><div><strong>Antes de vender</strong>' +
      escapar(problema.atencao) + "</div></div>";

    montarLista(
      cabecalho,
      produtos,
      [
        { texto: "Início", rota: "inicio" },
        { texto: "Problemas", rota: "problemas" },
        { texto: problema.nome }
      ],
      "problemas"
    );
  }

  /* --------------------------- FICHA DO PRODUTO --------------------------- */

  /* A ficha completa: preco por tamanho, calculadora de m², ficha técnica,
     o corte do sistema e os problemas que o produto resolve. É a tela mais
     longa do guia e a que mais pesa na venda. */
  function montarProduto(id) {
    const produto = produtoDe(id);
    if (!produto) return irPara("inicio");

    const marca = marcaDe(produto.marcaId);
    marcarMenu("");
    migalhas([
      { texto: "Início", rota: "inicio" },
      { texto: marca.nome, rota: "marca/" + marca.id },
      { texto: produto.nome }
    ]);

    const tamanhos = produto.tamanhos
      .map(
        (t) =>
          '<div class="tamanho" data-codigo="' + escapar(t.codigo) + '">' +
            '<div class="tamanho-cabecalho">' +
              '<span class="tamanho-rotulo">' + escapar(t.rotulo) +
                (t.cor ? ' <span class="tamanho-cor">' + escapar(t.cor) + "</span>" : "") +
              "</span>" +
            "</div>" +
            blocoPreco(t, false) +
            '<div class="calculo-area" hidden></div>' +
            '<dl class="tamanho-linhas">' +
              '<div class="tamanho-linha"><dt>Rende</dt><dd>' + escapar(t.rendimentoM2) + "</dd></div>" +
              '<div class="tamanho-linha"><dt>Demãos</dt><dd>' + escapar(produto.demaos) + "</dd></div>" +
              '<div class="tamanho-linha"><dt>Secagem</dt><dd>' + escapar(produto.secagem) + "</dd></div>" +
              '<div class="tamanho-linha"><dt>Cura total</dt><dd>' + escapar(produto.curaTotal) + "</dd></div>" +
              '<div class="tamanho-linha"><dt>Código</dt><dd>' + escapar(t.codigo) + "</dd></div>" +
              (t.observacao ? '<div class="tamanho-linha"><dt>Atenção</dt><dd>' + escapar(t.observacao) + "</dd></div>" : "") +
            "</dl>" +
          "</div>"
      )
      .join("");

    const especificacoes = [
      ["Tipo", produto.categoria],
      ["Base", produto.base],
      ["Como funciona", produto.comoFunciona],
      ["Onde aplicar", produto.ondeAplicar || (produto.substratos || []).join(" · ") || "—"],
      ["Cores", (produto.cores || []).join(" · ") || "—"],
      ["Precisa de primer", produto.exigePrimer || "—"],
      ["Aplicação", produto.aplicacaoCom],
      ["Diluição", produto.diluicao],
      ["Contato com água", produto.contatoAgua],
      ["Trânsito / revestimento", produto.transito],
      ["Durabilidade estimada", produto.durabilidade],
      ["Não usar em", produto.naoUsarEm]
    ]
      .map(
        (par) =>
          '<div class="especificacao"><dt>' + escapar(par[0]) + "</dt>" +
          "<dd>" + escapar(par[1]) + "</dd></div>"
      )
      .join("");

    const resolve = produto.problemas
      .map((p) => problemaDe(p))
      .filter(Boolean)
      .map(
        (p) =>
          '<li><button class="migalha" data-rota="problema/' + p.id + '">' +
          escapar(p.nome) + "</button></li>"
      )
      .join("");

    const marcado = estado.comparacao.includes(produto.id);

    $("#fichaProduto").innerHTML =
      '<div class="ficha-topo">' +
        "<div>" +
          '<p class="sobrancelha">' + escapar(marca.nome) + " · " + escapar(produto.categoria) + "</p>" +
          '<h2 id="tituloProduto">' + escapar(produto.nome) + "</h2>" +
          '<p class="ficha-descricao">' + escapar(produto.resumo) + "</p>" +
          /* O campo alerta existia no dados.js desde o começo, com 13
             produtos preenchidos, mas nunca era desenhado: o aviso de que o
             Veda Laje não vai sobre manta velha, por exemplo, nunca chegou
             ao cliente. Fica logo abaixo do resumo, antes do preço, porque
             é informação que muda a decisão de compra. */
          (produto.alerta
            ? '<div class="aviso-atencao"><div><strong>Atenção</strong>' +
                escapar(produto.alerta) + "</div></div>"
            : "") +
          blocoPreco(tamanhoMaisBarato(produto), false,
            produto.tamanhos.length > 1 ? tamanhoMaisBarato(produto).rotulo : null) +
          '<div class="produto-acoes">' +
            '<button class="botao ' + (marcado ? "botao--marcado" : "botao--vazado") +
              '" data-comparar="' + produto.id + '">' +
              (marcado ? "Comparando" : "Comparar") + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="ficha-imagem">' +
          '<img data-fallback="Foto do produto: salve em ' + escapar(produto.imagem) + '" ' +
          'src="' + escapar(produto.imagem) + '" alt="Embalagem do ' + escapar(produto.nome) + '">' +
        "</div>" +
      "</div>" +

      '<section class="ficha-secao">' +
        '<h3 class="ficha-secao-titulo">Tamanhos, preços e rendimento</h3>' +
        (calculaPorArea(produto)
          ? '<div class="metragem">' +
          '<label class="metragem-rotulo" for="campoMetros">' +
            "Quantos metros quadrados você vai impermeabilizar?</label>" +
          '<div class="metragem-linha">' +
            '<input class="metragem-campo" id="campoMetros" type="number" ' +
              'min="0" step="0.5" inputmode="decimal" placeholder="ex.: 25">' +
            '<span class="metragem-unidade">m²</span>' +
            '<button class="botao botao--vazado" type="button" id="limparMetros">Limpar</button>' +
          "</div>" +
            '<p class="metragem-ajuda">Meça o comprimento vezes a largura da área. ' +
              "A conta aparece em cada tamanho abaixo.</p>" +
            "</div>"
          : "") +
        '<div class="tamanhos">' + tamanhos + "</div>" +
      "</section>" +

      '<section class="ficha-secao">' +
        '<h3 class="ficha-secao-titulo">Ficha técnica resumida</h3>' +
        '<dl class="especificacoes">' + especificacoes + "</dl>" +
      "</section>" +

      /* O corte só aparece para quem tem camada no sistema. Sem isso, os 28
         acessórios do catálogo (espuma, veda calha, removedor, massa de
         calafetar) exibiam o desenho com as quatro camadas apagadas por
         igual, sob um título que promete responder onde o produto entra e
         não responde nada — e ainda dava a entender que um veda calha faz
         parte do sistema de impermeabilização. */
      (CAMADA_POR_CATEGORIA[produto.categoria]
        ? '<section class="ficha-secao">' +
            '<h3 class="ficha-secao-titulo">Onde este produto entra no sistema</h3>' +
            corteDoProduto(produto) +
          "</section>"
        : "") +

      '<section class="ficha-secao">' +
        '<h3 class="ficha-secao-titulo">Resolve estes problemas</h3>' +
        '<ul class="lista-simples">' + resolve + "</ul>" +
      "</section>";

    // Calculadora: um campo só, e cada tamanho responde por si.
    const campo = $("#campoMetros");
    const limpar = $("#limparMetros");
    if (campo) {
      const recalcular = function () {
        const metros = parseFloat(String(campo.value).replace(",", "."));
        const valido = !isNaN(metros) && metros > 0;

        /* Qual tamanho resolve a obra gastando menos. Comparo pelo pior caso
           de cada um, que é a conta que o cliente vai mesmo pagar se a
           superfície beber material. Só marco quando há mais de um tamanho
           com conta possível e um deles é realmente mais barato: empate
           não ganha selo. */
        let melhor = null;
        if (valido) {
          const contas = produto.tamanhos
            .map(function (t) {
              const c = calcularEmbalagens(t, metros);
              return c && !c.semPreco && !c.exagerada ? { codigo: t.codigo, custo: c.custoMais } : null;
            })
            .filter(Boolean);
          if (contas.length > 1) {
            const barato = contas.reduce((a, b) => (a.custo <= b.custo ? a : b));
            const empate = contas.filter((c) => c.custo === barato.custo).length > 1;
            if (!empate) melhor = barato.codigo;
          }
        }

        produto.tamanhos.forEach(function (t) {
          const caixa = document.querySelector(
            '#fichaProduto .tamanho[data-codigo="' + t.codigo + '"] .calculo-area'
          );
          if (!caixa) return;
          if (!valido) {
            caixa.hidden = true;
            caixa.innerHTML = "";
            return;
          }
          caixa.hidden = false;
          caixa.innerHTML = textoCalculo(t, metros, t.codigo === melhor);
        });
      };
      campo.addEventListener("input", recalcular);
      if (limpar) {
        limpar.addEventListener("click", function () {
          campo.value = "";
          recalcular();
          campo.focus();
        });
      }
    }

    // troca o fallback da foto por um bloco de texto, e não pelas iniciais
    const foto = $("#fichaProduto .ficha-imagem img");
    if (foto) {
      foto.addEventListener("error", function () {
        const vazio = document.createElement("p");
        vazio.className = "ficha-imagem-vazia";
        vazio.textContent = "Sem foto ainda — salve em " + produto.imagem;
        foto.replaceWith(vazio);
      });
    }

    mostrarTela("produto");
  }

  /* ----------------------------- COMPARAÇÃO ----------------------------- */

  /* Aviso do limite de comparação, dentro da própria bandeja. Antes era um
     alert() do navegador: trava a tela, exige um segundo toque para fechar
     e, num aparelho de balcão, passa a impressão de que o guia quebrou.
     O role="status" faz o leitor de tela anunciar sem roubar o foco. */
  let relogioAviso = null;

  function avisarLimite() {
    const aviso = $("#bandejaAviso");
    if (!aviso) return;
    aviso.textContent =
      "Dá para comparar até " + CONFIG.limiteComparacao +
      " produtos por vez. Tire um da lista para incluir outro.";
    aviso.hidden = false;
    aviso.classList.remove("bandeja-aviso--saindo");
    clearTimeout(relogioAviso);
    relogioAviso = setTimeout(function () {
      aviso.classList.add("bandeja-aviso--saindo");
      setTimeout(function () { aviso.hidden = true; }, 300);
    }, 4000);
  }

  /* Poe ou tira um produto da comparacao. O limite de 4 não é capricho:
     acima disso a tabela não cabe sem rolagem lateral, que e onde o cliente
     desiste. */
  function alternarComparacao(id) {
    const pos = estado.comparacao.indexOf(id);

    if (pos >= 0) {
      estado.comparacao.splice(pos, 1);
    } else {
      if (estado.comparacao.length >= CONFIG.limiteComparacao) {
        avisarLimite();
        return;
      }
      estado.comparacao.push(id);
    }

    atualizarBandeja();
    atualizarBotoesComparar();

    if (!document.getElementById(TELAS.comparar).hidden) montarComparacao();
  }

  /* Sincroniza o texto e o estado de todos os botões Comparar da tela, que
     podem estar em vários cartões ao mesmo tempo. */
  function atualizarBotoesComparar() {
    $$("[data-comparar]").forEach((botao) => {
      const marcado = estado.comparacao.includes(botao.dataset.comparar);
      botao.classList.toggle("botao--marcado", marcado);
      botao.classList.toggle("botao--vazado", !marcado);
      botao.textContent = marcado ? "Comparando" : "Comparar";
    });
  }

  /* A barra fixa no rodapé com o que está em comparacao. A classe
     com-bandeja no body abre espaço embaixo, para a barra não cobrir o
     último produto da lista. */
  function atualizarBandeja() {
    const bandeja = $("#bandeja");
    const total = estado.comparacao.length;

    bandeja.hidden = total === 0;
    document.body.classList.toggle("com-bandeja", total > 0);

    $("#bandejaItens").innerHTML = estado.comparacao
      .map((id) => {
        const produto = produtoDe(id);
        return (
          '<span class="bandeja-chip">' + escapar(produto.nome) +
          '<button class="bandeja-remover" data-remover="' + id +
          '" aria-label="Tirar ' + escapar(produto.nome) + ' da comparação">×</button></span>'
        );
      })
      .join("");

    $("#abrirComparacao").textContent = "Comparar (" + total + ")";
  }

  /* Tabela lado a lado. As linhas vem de LINHAS_COMPARACAO, no dados.js,
     e não daqui: assim dá para mudar o que se compara sem mexer em código. */
  function montarComparacao() {
    marcarMenu("comparar");
    migalhas([{ texto: "Início", rota: "inicio" }, { texto: "Comparar" }]);

    const produtos = estado.comparacao.map(produtoDe).filter(Boolean);
    const apoio = $("#apoioComparar");

    if (produtos.length === 0) {
      apoio.textContent =
        "Escolha até " + CONFIG.limiteComparacao +
        " produtos usando o botão Comparar e eles aparecem aqui lado a lado.";
      $("#compararCorpo").innerHTML =
        '<div class="tabela-vazia">' +
          "<p>Nenhum produto selecionado ainda.</p>" +
          '<button class="botao botao--cheio" data-rota="problemas">Escolher por problema</button>' +
        "</div>";
      mostrarTela("comparar");
      return;
    }

    apoio.textContent =
      produtos.length +
      (produtos.length === 1 ? " produto selecionado." : " produtos selecionados.") +
      " Role a tabela para o lado no celular.";

    const cabecalhos = produtos
      .map((p) => {
        const marca = marcaDe(p.marcaId);
        return (
          '<th scope="col" class="cabecalho-produto">' +
            '<span class="produto-marca">' + escapar(marca.nome) + "</span>" +
            '<span class="cabecalho-nome">' + escapar(p.nome) + "</span>" +
            '<span class="preco-mini">a partir de ' + moeda.format(menorPreco(p)) + "</span>" +
          "</th>"
        );
      })
      .join("");

    const linhaTamanhos =
      '<tr class="linha-preco">' +
        '<th scope="row" class="coluna-rotulo">Tamanhos e preços</th>' +
        produtos
          .map(
            (p) =>
              "<td>" +
              p.tamanhos
                .map((t) => escapar(t.rotulo) + " — " + moeda.format(t.preco))
                .join("<br>") +
              "</td>"
          )
          .join("") +
      "</tr>";

    const linhas = LINHAS_COMPARACAO.map((linha) => {
      const celulas = produtos
        .map((p) => "<td>" + escapar(p[linha.campo] || "—") + "</td>")
        .join("");
      return (
        "<tr>" +
        '<th scope="row" class="coluna-rotulo">' + escapar(linha.rotulo) + "</th>" +
        celulas +
        "</tr>"
      );
    }).join("");

    const acoes =
      "<tr>" +
      '<th scope="row" class="coluna-rotulo">Ficha completa</th>' +
      produtos
        .map(
          (p) =>
            '<td><button class="botao botao--cheio" data-rota="produto/' + p.id +
            '">Abrir ficha</button></td>'
        )
        .join("") +
      "</tr>";

    $("#compararCorpo").innerHTML =
      '<div class="comparar-rolagem">' +
        '<table class="tabela-comparativa">' +
          "<thead><tr><td class='coluna-rotulo'></td>" + cabecalhos + "</tr></thead>" +
          "<tbody>" + linhaTamanhos + linhas + acoes + "</tbody>" +
        "</table>" +
      "</div>";

    mostrarTela("comparar");
  }

  /* -------------------------------- BUSCA -------------------------------- */

  /* Tira acento e caixa para a busca. Sem isso quem digita "impermeavel"
     sem acento não acha nada, e ninguem digita acento com pressa. */
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* Busca em marcas, problemas e produtos ao mesmo tempo. Procura também
     nos sintomas do problema e na base química do produto, porque o cliente
     costuma descrever o que vê ("infiltração no teto") e não o nome do
     produto. Mínimo de 2 letras para não devolver o catálogo inteiro. */
  function buscar(termo) {
    const t = normalizar(termo);
    if (t.length < 2) return [];

    const achados = [];

    MARCAS.forEach((m) => {
      if (normalizar(m.nome + " " + m.resumo + " " + m.forte).includes(t)) {
        achados.push({ tipo: "Marca", texto: m.nome, rota: "marca/" + m.id });
      }
    });

    PROBLEMAS.forEach((p) => {
      const campo = p.nome + " " + p.resumo + " " + p.sintomas.join(" ");
      if (normalizar(campo).includes(t)) {
        achados.push({ tipo: "Problema", texto: p.nome, rota: "problema/" + p.id });
      }
    });

    PRODUTOS.forEach((p) => {
      const campo = p.nome + " " + p.categoria + " " + p.resumo + " " + p.base;
      if (normalizar(campo).includes(t)) {
        achados.push({
          tipo: "Produto",
          texto: p.nome + " · " + marcaDe(p.marcaId).nome,
          rota: "produto/" + p.id
        });
      }
    });

    return achados.slice(0, 8);
  }

  /* Desenha a lista de resultados embaixo do campo de busca. */
  function mostrarResultados(termo) {
    const caixa = $("#buscaResultados");
    const achados = buscar(termo);

    if (normalizar(termo).length < 2) {
      caixa.hidden = true;
      caixa.innerHTML = "";
      return;
    }

    if (achados.length === 0) {
      caixa.hidden = false;
      caixa.innerHTML =
        '<li class="busca-vazio">Nada encontrado com esse termo. ' +
        "Tente o local do problema, como laje, box ou caixa d'água.</li>";
      return;
    }

    caixa.hidden = false;
    caixa.innerHTML = achados
      .map(
        (a) =>
          '<li><button class="busca-item" data-rota="' + escapar(a.rota) + '">' +
            '<span class="busca-tipo">' + escapar(a.tipo) + "</span>" +
            "<span>" + escapar(a.texto) + "</span>" +
          "</button></li>"
      )
      .join("");
  }

  /* ------------------------------- EVENTOS ------------------------------- */

  document.addEventListener("click", function (evento) {
    const rota = evento.target.closest("[data-rota]");
    if (rota) {
      irPara(rota.dataset.rota);
      $("#buscaResultados").hidden = true;
      return;
    }

    const ir = evento.target.closest("[data-ir]");
    if (ir) {
      evento.preventDefault();
      irPara(ir.dataset.ir);
      return;
    }

    const comparar = evento.target.closest("[data-comparar]");
    if (comparar) {
      alternarComparacao(comparar.dataset.comparar);
      return;
    }

    const remover = evento.target.closest("[data-remover]");
    if (remover) {
      alternarComparacao(remover.dataset.remover);
      return;
    }

    if (!evento.target.closest(".busca")) {
      $("#buscaResultados").hidden = true;
    }
  });

  $("#buscaGeral").addEventListener("input", function (e) {
    mostrarResultados(e.target.value);
  });

  $("#buscaGeral").addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.target.value = "";
      $("#buscaResultados").hidden = true;
    }
  });

  $("#limparComparacao").addEventListener("click", function () {
    estado.comparacao = [];
    atualizarBandeja();
    atualizarBotoesComparar();
    if (!document.getElementById(TELAS.comparar).hidden) montarComparacao();
  });

  $("#abrirComparacao").addEventListener("click", function () {
    irPara("comparar");
  });

  window.addEventListener("hashchange", rotear);

  /* ------------------------------- PARTIDA ------------------------------- */


  /* ------------------------------ TEMA ------------------------------
     Escuro serve para quem abre o guia em casa, no celular, à noite. O
     padrão acompanha o aparelho: quem já usa o telefone escuro entra no
     escuro sem clicar em nada.

     A escolha NÃO é guardada. Parece descuido, mas é a regra do projeto:
     o aparelho do balcão é compartilhado, e a preferência de um cliente
     não pode sobrar para o próximo. Em casa, o padrão do sistema já
     acerta na primeira vez.

     O atributo data-tema vive no <html> e só troca variáveis de cor —
     nenhuma regra de componente foi escrita duas vezes. */
  const SOL = '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2' +
    'M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>';
  const LUA = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>';

  function temaEscuroAtivo() {
    const escolhido = document.documentElement.getAttribute("data-tema");
    if (escolhido) return escolhido === "escuro";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function pintarBotaoTema() {
    const escuro = temaEscuroAtivo();
    const botao = $("#botaoTema");
    const icone = $("#iconeTema");
    const texto = $("#textoTema");
    if (!botao) return;
    /* O botão anuncia para onde vai, não onde está: no claro ele oferece
       o escuro. Rótulo que descreve o estado atual confunde. */
    if (icone) icone.innerHTML = escuro ? SOL : LUA;
    if (texto) texto.textContent = escuro ? "Modo claro" : "Modo escuro";
    botao.setAttribute("aria-pressed", escuro ? "true" : "false");
    botao.setAttribute("aria-label", escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro");
  }

  function ligarTema() {
    const botao = $("#botaoTema");
    if (!botao) return;
    botao.addEventListener("click", function () {
      document.documentElement.setAttribute("data-tema", temaEscuroAtivo() ? "claro" : "escuro");
      pintarBotaoTema();
    });
    /* Se o cliente mudar o tema do próprio aparelho com o guia aberto e
       ainda não tiver clicado na chavinha, a página acompanha. */
    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function () {
        if (!document.documentElement.getAttribute("data-tema")) pintarBotaoTema();
      });
    pintarBotaoTema();
  }

  /* Liga tudo: cliques, busca, hashchange, e monta a primeira tela. Roda
     uma vez só, no fim do arquivo. */
  function iniciar() {
    ligarTema();
    $("#nomeLoja").textContent = CONFIG.loja;
    $("#subtituloLoja").textContent = CONFIG.subtitulo;

    $("#rodapeContatos").innerHTML = [
      [CONFIG.telefoneRotulo || "Telefone", CONFIG.telefone],
      ["Endereço", CONFIG.endereco],
      ["Horário", CONFIG.horario]
    ].map(function (par) {
      return "<li><strong>" + escapar(par[0]) + "</strong>" + escapar(par[1]) + "</li>";
    }).join("");

    $("#rodapeLoja").textContent =
      CONFIG.loja + " " + (CONFIG.loja2 || "") +
      " · Preços atualizados em " + CONFIG.atualizadoEm;

    $("#avisoExemplo").hidden = !CONFIG.dadosDeExemplo;

    atualizarBandeja();
    rotear();
  }

  iniciar();
})();
