# Mapa do 2º turno por local de votação, Eleições 2026

Este repositório contém **apenas os arquivos publicados** do site (HTML, JavaScript, estilos, malha municipal e
dados já processados). Ele é **gerado automaticamente** e **substituído por inteiro a cada publicação**: não edite
nada aqui à mão, e não abra pull requests, porque as mudanças seriam apagadas na próxima atualização.

O site é servido pelo GitHub Pages a partir da branch principal deste repositório.

## Fontes e créditos

- Votos, eleitores e comparecimento: TSE, Dados Abertos (boletins de urna, 1º e 2º turnos de 2026).
- Locais de votação e coordenadas: cadastro do TSE, via onde-voto-2026; coordenadas complementares do Inep
  (Catálogo de Escolas) e do IBGE (CNEFE 2022).
- Limites municipais: IBGE, Malha Municipal Digital 2025 (generalizada para a web).
- Cidades do exterior (centro de cada cidade): Natural Earth (domínio público) e GeoNames (CC BY 4.0).
- Mapa base: Esri (Light Gray Canvas): Esri, HERE, Garmin, © colaboradores do OpenStreetMap e a comunidade de usuários de SIG.
- Biblioteca de mapas: MapLibre GL JS (BSD-3-Clause; licença em `lib/LICENSE-maplibre.txt`).
- Leitura do TopoJSON: topojson-client, de Mike Bostock (ISC; licença em `lib/LICENSE-topojson-client.txt`).
- Esquemas de cor: ColorBrewer (Cynthia Brewer, Mark Harrower e The Pennsylvania State University), Apache 2.0.

Como as escolhas de representação foram feitas: `docs/fundamentacao.md` (resumos em inglês, `docs/methodology.md`, e em
espanhol, `docs/metodologia.md`).

Versões em inglês britânico (`en/index.html`) e em espanhol da Espanha (`es/index.html`): mesmo código e mesmos dados; os
textos ficam em `assets/textos.js`.

O código do site está sob a licença MIT (`LICENSE`). Os dados seguem os termos das respectivas fontes.

Publicado em 30/10/2026 11:33 UTC.
