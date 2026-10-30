# Por que o mapa é assim: fundamentação cartográfica

Este documento explica cada escolha de representação do mapa, a regra de cartografia ou de percepção visual que a sustenta e onde ela foi publicada. As medições de cor podem ser refeitas com `python scripts/medir_cores.py`.

Nível de verificação das referências: são obras clássicas e amplamente citadas da cartografia e da visualização. Os dados bibliográficos (autores, ano, periódico, volume e páginas) foram conferidos com cuidado, mas vale checar volume e páginas na fonte antes de citar este texto num trabalho acadêmico.

## 1. Tipo de mapa: coropleto para taxas, símbolos proporcionais para contagens

**Escolha.** Os municípios são pintados por **taxas** (% dos votos válidos, % de abstenção, variação em p.p.), nunca por contagens absolutas. Os locais de votação são **círculos com área proporcional aos votos válidos**.

**Fundamento.** Mapa coroplético só deve representar dados normalizados (taxas, proporções, densidades): pintar contagens absolutas confunde o tamanho da área com a quantidade (Slocum et al., 2009). Contagens vão para símbolos proporcionais, em que a **área** do círculo, e não o raio, é proporcional ao valor. Na semiologia gráfica de Bertin (1967), tamanho é a variável visual adequada para quantidades, e valor (claro/escuro) é a adequada para ordem.

## 2. Cores: esquemas do ColorBrewer, escolhidos pelo tipo de dado

**Escolha.**

| Modo | Tipo de dado | Esquema |
|---|---|---|
| Mais votado | categórico (quem venceu) + ordenado (margem) | uma matiz por candidato; 3 tons de valor no presidente, 2 no governador |
| % de um candidato | divergente, com ponto crítico em 50% | tons do adversário abaixo de 50%, do candidato acima (6 classes no presidente, 4 no governador) |
| Variação desde o 1º turno | divergente, com ponto crítico em 0 | PRGn-6 (roxo–verde) |
| Brancos e nulos | sequencial | RdPu-4 |
| Abstenção | sequencial | YlGnBu-4 |
| Governador, por partido | categórico | PT e PL fixos + 3 rampas de 2 tons (Purples, YlOrBr, YlGn) |

**Fundamento.** O ColorBrewer (Harrower e Brewer, 2003; Brewer, Hatchard e Harrower, 2003) separa os esquemas em **sequenciais** (dados ordenados de baixo para alto), **divergentes** (dados com um ponto crítico no meio, com duas direções de afastamento) e **qualitativos** (categorias sem ordem). Brewer (1996) recomenda o divergente quando há um valor de referência com significado — aqui, 50% (onde muda a maioria) e 0 p.p. (onde a variação muda de sinal).

**O que mudou em relação à versão anterior.** A versão anterior usava, para o % de candidato, brancos e nulos e abstenção, a mesma paleta de 5 cores do Nexo (amarelo → laranja → vermelho → roxo → azul-escuro). Essa paleta tem dois problemas medidos: (1) ela vai do amarelo ao azul passando pelo vermelho, o que lê como divergente num dado que é sequencial (abstenção não tem "meio" com significado); (2) na simulação de deuteranopia, duas classes vizinhas ficam com ΔE00 = 6,5, abaixo do limiar de distinção usado aqui. Na variação, a versão anterior usava a rampa do próprio candidato com cinza para queda; isso mistura **sinal** (ganhou/perdeu) com **identidade partidária**, e o vermelho de "ganhou muito" lia como "PT".

## 3. Distinção entre cores: ΔE00 ≥ 10, também para daltônicos

**Escolha.** Toda escala foi medida com a diferença de cor **CIEDE2000** (Sharma, Wu e Dalal, 2005) entre classes vizinhas. Critério: **ΔE00 ≥ 10**, em visão normal e simulando deuteranopia e protanopia (os tipos mais comuns de daltonismo vermelho-verde), com o modelo de Machado, Oliveira e Fernandes (2009).

**Fundamento.** Brychtová e Çöltekin (2017) mediram em experimento que cores em áreas separadas no mapa precisam de diferenças bem maiores que o limiar clássico de "diferença apenas perceptível" para serem distinguidas com segurança, e que a dificuldade cresce com a distância entre as áreas. O valor 10 é uma margem prática adotada neste projeto com base nesse resultado, não um número tirado diretamente do artigo.

**Resultado** (`scripts/medir_cores.py`, pior caso entre visão normal, deuteranopia e protanopia):

| Escala | ΔE00 mínimo entre classes vizinhas |
|---|---|
| Mais votado, vermelho | 12,9 |
| Mais votado, azul | 13,5 |
| % de um candidato (divergente) | 12,9 |
| Variação (PRGn-6) | 15,6 |
| Brancos e nulos (RdPu-4) | 10,4 |
| Abstenção (YlGnBu-4) | 17,8 |
| Governador, PT (2 tons) | 25,7 |
| Governador, PL (2 tons) | 34,3 |
| Governador, Purples 4 e 6 | 19,4 |
| Governador, YlOrBr 4 e 6 | 14,2 |
| Governador, YlGn 3 e 5 | 11,1 |
| Governador, % de um candidato (pior par) | 10,6 |

### Partidos no governador: por que 2 faixas de margem, e não 3

**Primeira tentativa (3 tons por partido).** Uma busca exaustiva em 12 esquemas sequenciais do ColorBrewer (todas as combinações de 3 classes) procurou rampas que, junto com as de PT e PL, mantivessem ΔE00 ≥ 10 entre tons vizinhos, entre o mesmo tom de partidos diferentes e contra os cinzas, nos três tipos de visão. **Nenhum conjunto com mais de duas rampas extras passou.** Pior: as rampas que passavam terminavam num tom quente e escuro, e nos quatro marrons escuros testados como alternativa, a distância ao vermelho-escuro do PT para daltônicos ficou entre ΔE00 5 e 9. Com só duas rampas extras, três partidos que se enfrentam em ciclo entre estados (A × B, B × C, C × A) exigiam uma terceira cor que não passava no critério.

**Solução adotada (2 tons por partido: 50–60% e 60% ou mais).** Com dois tons, a mesma busca, em 13 esquemas, encontrou até 6 rampas compatíveis. Ficaram três, sem vermelho, sem cinza e sem confusão com o cinza do empate: **Purples (classes 4 e 6 de 9), YlOrBr (4 e 6) e YlGn (3 e 5)**. PT e PL usam o tom claro e o escuro das cores do presidente. Todos os pares de partidos passam (pior caso: YlOrBr × YlGn, 10,6), e a escala divergente do % de um candidato a governador (4 classes: 40/50/60%) também. O mapa do presidente continua com 3 faixas.

**Distribuição das cores.** Cada estado tem só dois finalistas, então três rampas bastam se forem **reutilizadas entre estados**. O pipeline resolve isso como **coloração de um grafo de conflitos**, a mesma ideia da coloração de mapas, por busca exaustiva (os partidos de 2º turno são poucos). Regra rígida: os dois finalistas de um estado têm cores diferentes (`tests/testar_dados.py` confere). Depois, minimiza o número de partidos diferentes com a mesma cor em estados vizinhos. Três cores bastam para ciclos de três partidos; só se quatro partidos se enfrentassem todos entre si o quarto ficaria em cinza.

**Preços.** (1) Perde-se uma faixa de margem no governador. A mensagem principal desse mapa é quem venceu em cada estado; a margem é secundária. (2) A legenda tem partidos que dividem a mesma cor; a desambiguação vem do nome na etiqueta e do destaque da legenda. (3) Nos dados de teste, sobrou um par de partidos diferentes com a mesma cor em estados vizinhos (PDT e PSD, em RN–PB e em MS–SP). Com aquela combinação de rivais não existe solução sem repetição: MDB, PDT e UNIÃO se enfrentam em ciclo e ocupam as três cores, e o PSD é vizinho dos três. (4) A luminosidade não é igual entre matizes: o tom claro do YlGn (L* ≈ 92) é bem mais claro que o do PL (L* ≈ 63). Comparar margens *entre partidos diferentes* pela claridade é impreciso; dentro do mesmo partido, a leitura é correta. É um limite conhecido de usar matiz para categoria e valor para quantidade: amarelos e verdes só são saturados quando claros.

## 4. Classificação: quartis com quebras arredondadas

**Escolha.** Brancos e nulos e abstenção usam **4 classes nos quartis dos municípios**, recalculados pelo pipeline a cada atualização e arredondados a 0,5 ponto. As mesmas quebras valem no zoom de municípios e no de locais.

**Fundamento.** Brewer e Pickle (2002) compararam métodos de classificação em mapas coropléticos com leitores e concluíram que **quantis** tiveram desempenho igual ou melhor que quebras naturais (Jenks) e outros métodos nas tarefas testadas, além de serem fáceis de explicar. Quebras fixas copiadas de outra eleição podem deixar quase todo o país numa só classe — nos dados sintéticos de teste, a versão anterior pôs quase todos os municípios na faixa de 20–25% de abstenção.

**Ressalva.** Quartis por município dão o mesmo peso a um município de 1 mil e a um de 9 milhões de eleitores. É uma escolha de leitura geográfica ("como se distribui pelo território"), não populacional.

## 5. Área grande não é eleitor: valor por transparência

**Escolha (desde out./2026).** No modo "mais votado", o mapa **abre sem transparência**: cada município tem uma das 6 cores da legenda (3 faixas de margem para cada candidato a presidente; 2 por partido no governador). Quem liga **"Transparência pelo nº de eleitores"** passa a ver **uma cor só por candidato**, e a claridade mostra só o tamanho do eleitorado (4 classes: menos de 5 mil, 5–20 mil, 20–100 mil, 100 mil ou mais; opacidade 0,3 / 0,5 / 0,75 / 1; os cortes e as opacidades são escolha deste projeto). Nesse caso, a legenda vira uma **grade candidato × eleitorado**, com a cor que aparece de fato no mapa em cada célula (a cor misturada com o fundo do mapa base, na opacidade de 0,92 do zoom de país). Nos outros modos, a transparência vem desligada. A legenda também avisa que, ao aproximar o mapa (zoom 7 a 9), as cores dos municípios clareiam até sumir e dar lugar aos locais de votação.

**Fundamento do valor por transparência.** Em mapas eleitorais coropléticos, municípios grandes e pouco povoados dominam a imagem. Cartogramas resolvem distorcendo a forma (Gastner, Shalizi e Newman, 2005); o **valor por transparência** (Roth, Woodruff e Johnson, 2010) resolve mantendo a geografia e reduzindo o peso visual das áreas com pouca gente. Em teste com usuários, a transparência teve o melhor desempenho entre os canais visuais para uma variável quantitativa quando a matiz codificava a categoria (Mohammed, Polys e Sforza, 2018) — é exatamente o arranjo da grade: matiz = quem venceu, transparência = eleitorado.

**Por que mudou.** A versão anterior (até out./2026) abria com a transparência ligada **e** com as 3 faixas de margem. Colegas de doutorado apontaram que o mapa mostrava muito mais tons do que a legenda. Medido com os dados reais:

- com margem × transparência, o mapa desenhava **24 cores** (22 distinguíveis com ΔE00 ≥ 3) contra **6 na legenda**;
- **22 pares** dessas cores ficavam abaixo de ΔE00 = 10; o pior: Lula 60–70% em município com menos de 5 mil eleitores ≈ Lula 50–60% em município de 5–20 mil (**ΔE00 = 1,4**, indistinguível). Ou seja, o leitor não tinha como saber se um tom claro era margem pequena ou eleitorado pequeno;
- municípios por classe de eleitorado: menos de 5 mil, 1428; 5–20 mil, 2780; 20–100 mil, 1142; 100 mil ou mais, 221 — a maioria do mapa estava nas duas classes mais transparentes.

O problema de fundo é que margem e eleitorado eram duas variáveis **ordenadas** disputando a **mesma** variável visual, a claridade (Bertin, 1967): o olho não separa uma da outra. E legendas de duas variáveis por cor exigem consulta constante à legenda (Wainer e Francolini, 1980). A solução é não sobrepor as duas:

- **A (padrão):** sem transparência, a cor do mapa é sempre uma das cores da legenda;
- **B (opcional):** com transparência, a margem sai e a claridade passa a significar uma coisa só; a grade mostra as 8 combinações exatamente como aparecem no mapa.

**Medido na grade B** (cor de cada candidato misturada com o fundo `#e9e9e7`; `scripts/medir_cores.py` tem o método): entre candidatos, na mesma classe de eleitorado, ΔE00 ≥ 20,6 em visão normal e ≥ 9,0 na pior simulação de daltonismo (protanomalia, classe de menos de 5 mil); entre classes vizinhas do mesmo candidato, 9,9 em visão normal e 8,4 na deuteranomalia. **Não chega a ΔE00 ≥ 10 em todos os casos**, mas o par que antes era indistinguível (1,4) deixou de existir. Limite inerente ao método: na opacidade 0,3, todas as cores se aproximam do fundo, inclusive o cinza escuro de "empate" (pior caso: Lula em município de menos de 5 mil × empate no mesmo tamanho, ΔE00 = 7,1 a 3,8 conforme a visão; empates são raríssimos) — é o efeito pretendido (pouco peso visual para pouca gente), mas quem precisa da classe exata deve desligar a transparência ou clicar no município.

**Como voltar à versão anterior.** Em `assets/app.js`, `CONFIG.transparenciaPadrao: true` faz o mapa abrir com a transparência ligada, e `CONFIG.transparenciaCorUnica: false` volta às faixas de margem com transparência. O ramo `versao-antes-legenda-ab` guarda o código exato de antes (README, "Voltar à legenda anterior").

## 6. Números pequenos: esmaecer em vez de esconder

**Escolha.** Nos modos de variação, locais com menos de **50 votos válidos comparáveis** aparecem com preenchimento apagado e contorno cinza, e a etiqueta avisa "base pequena".

**Fundamento.** Gelman e Price (1999) mostram que, em mapas de taxas, as unidades com população pequena tendem a ocupar os extremos da escala só por variação aleatória, e o leitor confunde ruído com padrão. O limiar de 50 é uma escolha deste projeto, não um número da literatura; está em `CONFIG.minVotosVariacao` e pode ser ajustado.

## 7. Incerteza da posição

**Escolha.** Locais cuja coordenada é o centro da localidade no CNEFE (posição aproximada) aparecem como **círculos vazados**; o popup diz a fonte da coordenada.

**Fundamento.** MacEachren et al. (2005) revisam formas de mostrar incerteza em mapas e defendem que ela seja visível no próprio símbolo, não só em nota. A forma escolhida aqui (contorno sem preenchimento) é decisão deste projeto dentro dessa recomendação: comunica "menos certo" sem esconder o local.

## 8. Barra em vez de rosca no popup

**Escolha.** O popup mostra a divisão dos votos numa **barra empilhada horizontal** com marca em 50%.

**Fundamento.** Cleveland e McGill (1984) ordenaram tarefas de percepção gráfica por precisão: comparar **posição e comprimento numa escala comum** é mais preciso que comparar ângulos ou áreas, que é o que a rosca exige. A marca em 50% dá a referência da maioria.

## 9. Generalização da malha

**Escolha.** Base: Malha Municipal Digital 2025 do IBGE (cerca de 20 milhões de vértices; a cidade de São Paulo sozinha tem 21.301). Duas versões generalizadas, com o tamanho do detalhe dado em metros (intervalo do Visvalingam ponderado do mapshaper), e não em porcentagem de vértices, para que o erro máximo seja o mesmo no país inteiro: **2 km** para o país (2,8 MB; São Paulo com 40 vértices), usada nas áreas coloridas até o zoom 9; e **20 m** por município, um arquivo para cada (São Paulo com 3.235 vértices, 14 kB comprimido), usado só no contorno do município escolhido ou sob o mouse e baixado só nessa hora. Ao aproximar, as áreas somem (zoom 9), então a malha leve não fica visível no zoom em que pareceria grosseira. A divisa dos estados sai da dissolução da malha leve já simplificada, para coincidir com a dos municípios. SIRGAS 2000 é tratado como WGS 84: a diferença é de centímetros.

**Custo.** Com um arquivo por estado, 20 m seriam pesados demais (Minas Gerais passaria de 25 MB). Um arquivo por município resolve: só se baixa o contorno que vai aparecer. No zoom dos locais (15), 20 m são uns 4 pixels.

**Fundamento.** O mapshaper usa uma variação ponderada do algoritmo de **Visvalingam e Whyatt (1993)**, que remove primeiro os vértices que formam os menores triângulos e preserva melhor a forma geral que a remoção por distância. A generalização deve acompanhar a escala: o que é aceitável no país inteiro fica grosseiro no zoom de bairro.

## 10. Projeção: Web Mercator, com aviso

**Escolha.** O mapa usa Web Mercator, padrão dos mapas web e do MapLibre. "Como foi feito" avisa que a área é exagerada longe do Equador.

**Fundamento.** Battersby et al. (2014) mostram que a Web Mercator não é adequada para comparar áreas e que isso precisa ser comunicado. Exagero de área em relação ao Equador (fator 1/cos²φ): Manaus ≈ 0%, Brasília ≈ +8%, São Paulo ≈ +19%, Curitiba ≈ +23%, Chuí ≈ +44%. Trocar a projeção exigiria outra biblioteca ou renderizar tudo do lado do cliente, o que custa desempenho; o aviso foi a solução de menor custo.

## 11. Limites de leitura

- **Falácia ecológica** (Robinson, 1950): o resultado de um município ou local descreve o conjunto dos eleitores dali, não cada eleitor.
- **Problema da unidade de área modificável** (Openshaw, 1984): o padrão muda conforme a unidade (município, local, seção) e conforme como as unidades são desenhadas. Por isso o mapa oferece duas escalas e não tira conclusões causais.

## 12. Exterior: um ponto por cidade, no centro da cidade

**Escolha.** O TSE não informa coordenadas fora do país (latitude e longitude vêm como -1 no cadastro de locais). Cada cidade com seções no exterior vira um **círculo proporcional** aos votos válidos, colorido como os locais de votação, no **centro da cidade**, visível em qualquer zoom (no mapa-múndi, como no Nexo). As coordenadas vêm da Natural Earth (*populated places* 1:10m, domínio público) e, para 6 cidades pequenas de fronteira que ela não tem (Puerto Iguazú, Paso de los Libres, Chuy, Santa Elena de Uairén, Salto del Guairá e Río Branco, no Uruguai), do GeoNames (CC BY 4.0); a tabela fica em `config/cidades_exterior.json` e é gerada por `scripts/cidades_exterior.py`, com as escolhas feitas à mão listadas no próprio script (nomes repetidos em vários países, como Córdoba, Concepción, Santiago e Rio Branco, foram resolvidos pelo endereço dos locais no cadastro do TSE).

**Conferência.** 183 das 186 cidades do cadastro caem dentro do polígono do país esperado (Natural Earth, países 1:10m). As 3 restantes foram olhadas uma a uma: Caiena e Saint-Georges-de-l'Oyapock são da Guiana Francesa, que a Natural Earth desenha como parte da França; Nicósia cai na zona-tampão da ONU, que a Natural Earth separa de Chipre.

**Limitações.** (1) A "cidade" é a que o TSE registra para as seções, em geral a sede da jurisdição consular: alguns locais ficam em outra cidade (seções de Boston em Malden; de Nagóia em Hiroshima; de Bruxelas em Esch-sur-Alzette, Luxemburgo). O ponto mostra a cidade do TSE, não o prédio. (2) Os círculos do exterior usam uma escala de tamanho própria, maior que a dos locais no Brasil, para serem vistos no mapa-múndi; não compare o tamanho de um círculo do exterior com o de um local de votação no Brasil. (3) No 2º turno de 2026, o arquivo de votos do TSE tem 144 cidades no exterior; 42 cidades do cadastro (528 eleitores ao todo) não aparecem nele. Não verifiquei por quê.

## 13. Peso e velocidade

Medido em 28/10/2026 com os dados reais, num servidor local que comprime os arquivos como o GitHub Pages, com a conexão limitada. Os tempos de desenho foram medidos sem placa de vídeo e são pessimistas; os tamanhos são exatos.

- **Malha do país em TopoJSON** (Bostock; cada divisa entre dois municípios é guardada uma vez, e não duas): municípios e estados num arquivo só, de 901 para 456 kB comprimidos. Lido no navegador pela topojson-client.
- **Contorno por município** (item 9): ao aproximar em São Paulo e clicar na capital, a malha baixada caiu de 801 kB (o estado inteiro) para 14 kB.
- **Downloads começam no HTML**, em paralelo com o MapLibre, e o mapa é criado sem esperar os dados.
- **Municípios em duas partes**: o mapa inicial precisa só dos votos do 2º turno, dos eleitores aptos e do número de locais (89 kB comprimidos); o 1º turno e o resto chegam depois do primeiro desenho.
- **Opções das fontes de dados do MapLibre** (recomendações da documentação da Mapbox para GeoJSON grande): a malha leve não gera mosaicos acima do zoom 9, em que as áreas já sumiram; pontos sem margem entre mosaicos.

Resultado, do pedido da página até o mapa pintado com as cores: no 4G lento (1,6 Mbps) com celular 4× mais lento, de cerca de 12,1 s para 7,7 s; no 4G bom (9 Mbps) num computador, de 3,9 s para 3,5 s (aqui, o que sobra é o tempo de desenhar sem placa de vídeo). O que se baixa na abertura caiu de 1.377 para 817 kB comprimidos (a segunda parte dos municípios, 158 kB, chega depois do primeiro desenho), e a memória usada pelo JavaScript, de 131 para 86 MB.

## 14. 1º turno: presidente, governador e senador, com todos os candidatos

**Escolha.** Um seletor "1º turno / 2º turno" no painel. No 1º turno: presidente (12 candidatos com votos válidos), governador (169) e senador (277), por município e por local de votação, com os mesmos modos do Nexo: "mais votado", "% de um candidato" (todos os candidatos, pelo menu ou pela busca), brancos e nulos, e abstenção. Nas três versões do site (português, inglês e espanhol; a princípio só em português, traduzido em 30/10/2026). Dados em `data/t1/`, gerados por `scripts/gerar_1turno.py` e conferidos por `tests/testar_1turno.py`.

**Regras dos dados.**

- **Fonte:** votação por seção eleitoral do TSE (presidente no arquivo nacional; governador e senador nos arquivos por UF), eleitorado por local de votação (aptos do 1º turno) e candidatos 2026 (situação: eleito, 2º turno).
- **Local:** cada seção é contada no local onde votou **no 1º turno** (no 2º turno, algumas seções mudaram de local). Os locais seguem a ordem do 2º turno, para a busca de escolas servir aos dois; 239 locais existiram só no 1º turno e vêm no fim da lista (7 deles sem coordenada).
- **Votos anulados:** votos dados a candidaturas que o TSE não conta como válidas (canceladas, inclusive *sub judice*) **não entram nos válidos**, como na totalização oficial. O critério vem do próprio TSE: no arquivo de votação por candidato, município e zona, o candidato com `QT_VOTOS_NOMINAIS_VALIDOS = 0`. Sem essa regra, o resultado mudava de sentido: no Rio de Janeiro, o governador eleito no 1º turno aparecia com 49,3% dos válidos (quando teve 50,9%). Esses votos aparecem no painel do clique como "votos em candidaturas anuladas".
- **Conferência:** os votos válidos de cada um dos 458 candidatos, somados no Brasil (presidente) ou no estado (governador e senador), batem exatamente com o arquivo de votação por candidato do TSE, que é independente do arquivo por seção.
- **Senador:** em 2026, cada eleitor votou em **dois** candidatos (2 vagas por estado). O % de cada um é sobre o total de votos válidos para senador, como o TSE divulga; por isso ninguém chega perto de 50%.

**"Mais votado": cores.**

- **Presidente:** cor do partido, como no 2º turno (PL e PT), mais uma cor para o terceiro partido que vence algum lugar (PSD, com Ronaldo Caiado). Dois tons: **menos de 50%** e **50% ou mais** dos votos válidos. O corte de 50% não é arbitrário: é a maioria absoluta que elege no 1º turno (Constituição, art. 77, e, para governador, art. 28).
- **Governador e senador: cor pela colocação no estado** (1º, 2º e 3º colocados; quem mais vencer algum lugar fica em cinza), e não pelo partido. Pelo partido não cabe: nos 27 estados, 12 partidos vencem algum município ou local no governador e 17 no senador, que ainda tem, em 10 casos, dois candidatos do mesmo partido vencendo lugares no mesmo estado (até 8 candidatos diferentes vencem lugares num mesmo estado). Cinco matizes distinguíveis (seção 3) não bastam, e repetir cores entre estados tornaria a legenda ambígua. A colocação dá uma legenda curta e igual em todo o país; o nome de quem venceu aparece na etiqueta e no painel do clique. Vermelho e azul ficam fora dessa paleta, para não sugerir PT e PL. Governador: dois tons, com o corte em 50%; senador: um tom só.
- **Medição** (`scripts/medir_cores.py`, ΔE00 entre todos os pares, pior caso entre visão normal, deuteranopia e protanopia): governador, 11,1 (pior par: tom claro do 1º colocado × cinza de "sem dado"); senador, 17,0; presidente, 11,1 (PL escuro × roxo escuro). As cores saíram de uma busca nos esquemas sequenciais do ColorBrewer: Purples, Oranges e Greens para as colocações; cinza `#8c8c8c` para os demais, entre o "sem dado" e o "empate".

**"% de um candidato": escala sequencial, não divergente.** No 2º turno, 50% separa a vitória da derrota e a escala divergente faz sentido (seção 2). No 1º turno, com muitos candidatos, não há esse ponto: a escala é sequencial, de 4 classes, na matiz do candidato (Reds para PT; PuBu para PL, porque Blues não passa contra o cinza de "sem dado"; Purples, Oranges e Greens para as colocações; PuRd para quem não tem cor própria). As quebras são os **quartis dos municípios do escopo** (Brewer e Pickle, 2002): o mapa mostra onde o candidato foi melhor ou pior **em relação a ele mesmo**. Nos estados com menos de 30 municípios (AC, AP, RR e DF), os quartis são dos locais de votação. Medido: classes vizinhas, contra "sem dado" e a mais clara contra o fundo do mapa, ΔE00 ≥ 10,0 em todas as rampas (a mais justa é Purples, com 10,0).

**Limitações.**

- Com quartis por candidato, a mesma cor não quer dizer o mesmo percentual em candidatos diferentes; a legenda mostra os cortes de cada um.
- No senador, o "mais votado" mostra só um dos dois votos de cada eleitor; para ver o segundo colocado de cada lugar, use o "% de um candidato".
- As cores por colocação não permitem comparar partidos entre estados; para isso, use o "% de um candidato".
- Os 239 locais que só existiram no 1º turno não entram na busca de escolas (a busca usa a lista do 2º turno); aparecem no mapa e no clique.
- Não há comparação entre turnos neste modo (ela continua no 2º turno, nas mesmas seções).

## Limitações conhecidas (medidas)

`scripts/medir_cores.py` não aponta mais nenhuma medida abaixo do critério. Os três problemas da versão anterior foram resolvidos assim:

1. **PT × cinza de empate:** o empate passou de `#8c8c8c` para `#5c5c5c`, que fica a ΔE00 ≥ 11,1 de todos os tons de partido e a 37,8 dos cinzas claros, também para daltônicos.
2. **Rampa de último recurso (Greens):** deixou de existir; com 2 tons por partido, cabem três rampas que passam no critério.
3. **Vermelho-escuro do OrRd:** deixou de existir; nenhuma rampa de reserva tem vermelho.

Continua valendo a limitação de luminosidade desigual entre partidos (item 4 de "Preços", acima).

Além disso: as quebras em quartis e o limiar de 50 votos foram testados só com **dados sintéticos**; com os dados reais, vale olhar o mapa de novo antes de publicar.

## Referências

- Battersby, S. E.; Finn, M. P.; Usery, E. L.; Yamamoto, K. H. (2014). Implications of Web Mercator and its use in online mapping. *Cartographica*, 49(2), 85–101.
- Bertin, J. (1967). *Sémiologie graphique: les diagrammes, les réseaux, les cartes*. Paris: Gauthier-Villars.
- Brewer, C. A. (1996). Guidelines for selecting colors for diverging schemes on maps. *The Cartographic Journal*, 33(2), 79–86.
- Brewer, C. A.; Hatchard, G. W.; Harrower, M. A. (2003). ColorBrewer in print: a catalog of color schemes for maps. *Cartography and Geographic Information Science*, 30(1), 5–32.
- Brewer, C. A.; Pickle, L. (2002). Evaluation of methods for classifying epidemiological data on choropleth maps in series. *Annals of the Association of American Geographers*, 92(4), 662–681.
- Brychtová, A.; Çöltekin, A. (2017). The effect of spatial distance on the discriminability of colors in maps. *Cartography and Geographic Information Science*, 44(3), 229–245.
- Cleveland, W. S.; McGill, R. (1984). Graphical perception: theory, experimentation, and application to the development of graphical methods. *Journal of the American Statistical Association*, 79(387), 531–554.
- Gastner, M. T.; Shalizi, C. R.; Newman, M. E. J. (2005). Maps and cartograms of the 2004 US presidential election results. *Advances in Complex Systems*, 8(1), 117–123.
- Gelman, A.; Price, P. N. (1999). All maps of parameter estimates are misleading. *Statistics in Medicine*, 18(23), 3221–3234.
- Harrower, M.; Brewer, C. A. (2003). ColorBrewer.org: an online tool for selecting colour schemes for maps. *The Cartographic Journal*, 40(1), 27–37.
- MacEachren, A. M. et al. (2005). Visualizing geospatial information uncertainty: what we know and what we need to know. *Cartography and Geographic Information Science*, 32(3), 139–160.
- Machado, G. M.; Oliveira, M. M.; Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291–1298.
- Mohammed, A.; Polys, N. F.; Sforza, P. M. (2018). Evaluating visual channels for multivariate map visualization. EuroGraphics. Disponível em: http://hdl.handle.net/10919/97514.
- Openshaw, S. (1984). *The modifiable areal unit problem*. Concepts and Techniques in Modern Geography (CATMOG) 38. Norwich: Geo Books.
- Robinson, W. S. (1950). Ecological correlations and the behavior of individuals. *American Sociological Review*, 15(3), 351–357.
- Roth, R. E.; Woodruff, A. W.; Johnson, Z. F. (2010). Value-by-alpha maps: an alternative technique to the cartogram. *The Cartographic Journal*, 47(2), 130–140.
- Sharma, G.; Wu, W.; Dalal, E. N. (2005). The CIEDE2000 color-difference formula: implementation notes, supplementary test data, and mathematical observations. *Color Research & Application*, 30(1), 21–30.
- Slocum, T. A.; McMaster, R. B.; Kessler, F. C.; Howard, H. H. (2009). *Thematic cartography and geovisualization*. 3. ed. Upper Saddle River: Pearson Prentice Hall.
- Visvalingam, M.; Whyatt, J. D. (1993). Line generalisation by repeated elimination of points. *The Cartographic Journal*, 30(1), 46–51.
- Wainer, H.; Francolini, C. M. (1980). An empirical inquiry concerning human understanding of two-variable color maps. *The American Statistician*, 34(2), 81–93.

Ferramentas: ColorBrewer (colorbrewer2.org, licença Apache 2.0); simulação de daltonismo com a biblioteca `colorspacious` (implementa Machado et al., 2009); ΔE00 com `colour-science`; generalização com mapshaper.
