/* ==========================================================================
   sw.js — service worker do guia

   POR QUE ELE EXISTE. Só para o navegador aceitar instalar o guia como
   aplicativo. O Chrome exige três coisas para oferecer a instalação: HTTPS,
   um manifest válido e um service worker com tratador de `fetch`. Sem este
   arquivo o guia continua funcionando, mas abre com a barra do navegador
   por cima, que é justamente o que o David queria tirar.

   O QUE ELE NÃO É. Não é cache para deixar o guia mais rápido. A estratégia
   aqui é REDE PRIMEIRO: toda requisição vai à rede, e o cache só responde
   quando a rede falha. É mais lento que o contrário, e é de propósito.

   O MOTIVO É O PREÇO. O dados.js carrega preço e estoque dos 132 códigos, e
   eles mudam toda semana. Um cache que responde antes da rede mostraria o
   preço da semana passada num aparelho de balcão, sem ninguém perceber —
   bem pior que meio segundo a mais para carregar. Cliente que vê R$ 149 na
   tela e R$ 169 no caixa não volta.

   O que o cache ganha, então, é só o modo offline: se a internet da loja
   cair, o guia continua abrindo com o que foi visto por último, e a data no
   rodapé diz de quando são aqueles preços.

   SE UM DIA PRECISAR DE VELOCIDADE: separe por tipo — fonte, foto e CSS
   podem vir do cache primeiro, porque mudam pouco; dados.js e index.js não.
   Não troque tudo para cache primeiro de uma vez.
   ========================================================================== */

/* Trocar este nome descarta o cache antigo inteiro na próxima visita. Só é
   necessário se algum dia a estratégia mudar — com rede primeiro, conteúdo
   velho não sobrevive a uma visita com internet. */
const CACHE = "guia-impermeabilizacao-v1";

self.addEventListener("install", function () {
  /* Assume o lugar do service worker anterior sem esperar todas as abas
     fecharem. Num aparelho de balcão a aba fica aberta o dia inteiro, e sem
     isto uma versão nova só entraria no dia seguinte. */
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys()
      .then(function (nomes) {
        return Promise.all(
          nomes.filter(function (n) { return n !== CACHE; })
               .map(function (n) { return caches.delete(n); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (evento) {
  const req = evento.request;

  // Só GET entra no cache. O guia não tem POST, mas a regra evita surpresa.
  if (req.method !== "GET") return;

  /* Outros domínios passam direto, sem cache e sem interferência: são os
     quatro links do rodapé (WhatsApp, Instagram, Facebook, TikTok). O guia
     não CARREGA nada de fora — essa regra é de 01/09 e continua valendo. */
  if (new URL(req.url).origin !== self.location.origin) return;

  evento.respondWith(
    fetch(req)
      .then(function (resposta) {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resposta;
      })
      .catch(function () {
        /* Sem rede. Devolve o que tiver guardado; se a própria página não
           estiver no cache, cai na raiz, que é a tela inicial. */
        return caches.match(req).then(function (achado) {
          return achado || caches.match("./");
        });
      })
  );
});
