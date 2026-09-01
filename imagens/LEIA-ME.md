# Pasta de imagens

Três subpastas, cada uma com um papel:

```
imagens/
├── casa.jpg       imagem principal da tela inicial (usada)
├── casa-900.jpg   versão menor, servida no celular (usada)
├── casa.png       original sem compressão, guardado como fonte
├── marcas/        logo de cada marca
├── produtos/      foto da embalagem
└── problemas/     foto do problema (opcional, ainda não usada na tela)
```

## A imagem da casa

O original tinha 2,5 MB, peso demais para abrir rápido num tablet de balcão.
Ficou 329 KB em JPG e 141 KB na versão de celular, sem perda visível.

Se você editar a casa, gere as duas versões de novo e confira as coordenadas
das áreas clicáveis em `CASA.pontos`, dentro de `dados.js`. Etiqueta que sai
do lugar deixa o ponto clicável no lugar errado.

## Regra de nome

O nome do arquivo tem que ser igual ao caminho escrito em `dados.js`.
Se não bater, a tela não quebra: aparece um bloco com as iniciais no lugar
da logo, e um aviso no lugar da foto do produto.

## O que já está esperado

**marcas/** — PNG com fundo transparente, 400 × 400 px, logo centralizada:

- `vedacit.png`
- `sika.png`
- `quartzolit.png`
- `denver.png`
- `viapol.png`

**produtos/** — JPG do produto, fundo branco, 1200 × 900 px:

- `vedacit-aditivo.jpg`
- `vedapren.jpg`
- `vedatop-flexivel.jpg`
- `igol-2.jpg`
- `sika-1.jpg`
- `sikatop-107.jpg`
- `sikafill-power.jpg`
- `sika-igolflex.jpg`
- `quartzolit-aditivo.jpg`
- `quartzolit-manta-liquida.jpg`
- `quartzolit-polimerica.jpg`
- `denver-impercolor.jpg`
- `denvertec-100.jpg`
- `viaplus-1000.jpg`
- `manta-torodin.jpg`
- `viapol-primer.jpg`

**problemas/** — JPG horizontal, 1200 × 800 px, um por problema
(`laje.jpg`, `banheiro.jpg`, `reservatorio.jpg`, `piscina.jpg`,
`parede-umidade.jpg`, `fundacao.jpg`, `telhado.jpg`, `jardineira.jpg`,
`fachada.jpg`).

## Duas coisas para não esquecer

1. Logo de marca é propriedade do fabricante. Use o material oficial de
   revenda, não uma imagem qualquer do Google.
2. Salve tudo em minúsculo, sem acento e sem espaço. Servidor Linux
   diferencia maiúscula de minúscula e vai reclamar depois.
