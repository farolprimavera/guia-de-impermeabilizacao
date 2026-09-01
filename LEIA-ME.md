# Guia de impermeabilização

Tela de autoatendimento para o cliente se orientar entre produtos
impermeabilizantes. Roda direto no navegador, sem instalar nada e sem servidor.

## Estrutura

```
impermeabilizantes/
├── index.html          esqueleto das telas
├── CLAUDE.md           contexto do projeto, lido pelo Claude Code no VS Code
├── scripts/
│   ├── dados.js        marcas, problemas, produtos, tamanhos e preços
│   └── index.js        navegação, busca, comparação e calculadora
├── styles/
│   ├── styles.css      toda a aparência (cores e fontes nas variáveis do topo)
│   └── fontes/         8 arquivos de fonte, para o guia rodar sem internet
└── imagens/
    ├── casa.jpg        imagem principal, com as áreas marcadas
    ├── casa-900.jpg    mesma imagem, menor, usada no celular
    ├── casa.png        original sem compressão
    ├── marcas/
    └── produtos/
```

## Como abrir

Clique duas vezes em `index.html`. Só isso.

## Telas

| Tela | Endereço | O que faz |
|---|---|---|
| Início | `#/inicio` | A casa com as sete áreas clicáveis, a busca e as portas de entrada |
| Marcas | `#/marcas` | Todas as marcas, com contagem de produtos |
| Linha da marca | `#/marca/vedacit` | O que temos daquela marca |
| Problemas | `#/problemas` | Os nove problemas mais comuns, com sintomas |
| Soluções | `#/problema/laje` | Quais marcas resolvem aquele problema, do mais barato ao mais caro |
| Ficha do produto | `#/produto/vedapren` | Tamanhos, preços, rendimento por tamanho e ficha técnica |
| Comparação | `#/comparar` | Até quatro produtos lado a lado |

## Como atualizar

Tudo em `scripts/dados.js`, sem tocar em HTML ou CSS.

**Mudar um preço** — ache o produto, ache o tamanho, troque o número em `preco`.
Escreva com ponto: `89.9`, não `89,90`.

**Incluir um produto** — copie um bloco inteiro de `PRODUTOS`, troque os
valores. O `id` precisa ser único, o `marcaId` precisa existir em `MARCAS` e
cada item de `problemas` precisa existir em `PROBLEMAS`.

**Incluir uma marca ou um problema** — acrescente o bloco na lista
correspondente. A tela se monta sozinha.

**Tirar o aviso amarelo do topo** — em `CONFIG`, troque
`dadosDeExemplo: true` por `false`. Faça isso só depois de conferir os preços.

**Mudar as linhas da tabela comparativa** — a lista `LINHAS_COMPARACAO`
define quais linhas aparecem e em que ordem.

**Mexer nas áreas clicáveis da casa** — em `CASA.pontos`. Cada ponto tem
`esquerda`, `topo`, `largura` e `altura` em porcentagem da imagem, e um
`problemaId` que precisa existir em `PROBLEMAS`. Por serem porcentagens,
funcionam em qualquer tamanho de tela.

Se trocar a imagem da casa, as sete coordenadas mudam e precisam ser medidas
de novo. Um problema que ficar de fora da imagem aparece sozinho no bloco
"Não está na imagem?", logo abaixo dela.

## Aparência

As cores e as fontes estão em `:root`, no começo de `styles/styles.css`.
Trocar `--agua` muda o azul de toda a tela; trocar `--sinal` muda o amarelo.

As fontes vêm do Google Fonts, então o computador precisa de internet para
carregá-las. Sem internet, o navegador usa uma fonte parecida e a tela
continua funcionando.

## Antes de publicar

- Conferir todos os preços e rendimentos na ficha técnica do fabricante
- Salvar as imagens conforme `imagens/LEIA-ME.md`
- Preencher `CONFIG.loja` e `CONFIG.telefone`
- Virar `dadosDeExemplo` para `false`
