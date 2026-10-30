# Por qué el mapa es así: resumen de la metodología

Este es un resumen en español de las notas completas de metodología, que están en portugués (`docs/fundamentacao.md`). Si hay diferencias, la versión en portugués es la de referencia. Las mediciones de color pueden repetirse con `python scripts/medir_cores.py`.

## Datos

- **Votos, participación y censo:** Tribunal Superior Electoral de Brasil (TSE), datos abiertos, primera y segunda vuelta de las elecciones de 2026, para Presidente y, en los estados que tuvieron segunda vuelta, para Gobernador.
- **Colegios electorales:** el registro de colegios del TSE, a través del proyecto onde-voto-2026. Cada **mesa electoral** (una urna electrónica, la unidad más pequeña con resultados publicados) se cuenta en el colegio donde votó en la segunda vuelta. Las coordenadas que faltaban se completaron con el Catálogo de Escuelas del Inep y con el registro de direcciones del IBGE de 2022 (CNEFE); los colegios situados solo en el centro de su localidad se dibujan como **círculos huecos**.
- **Límites:** IBGE (Instituto Brasileño de Geografía y Estadística), Malla Municipal Digital 2025, 5571 municipios.
- **Voto en el exterior:** el TSE no facilita coordenadas fuera de Brasil, así que cada ciudad con mesas en el exterior se sitúa en el centro de la ciudad (Natural Earth, dominio público; GeoNames, CC BY 4.0, para seis pequeñas localidades fronterizas). La ciudad es la que registra el TSE, normalmente la sede del consulado: algunos colegios están en ciudades vecinas.

## Tipos de mapa

Los municipios se colorean por **tasas** (% de votos válidos, % de abstención, variación en puntos porcentuales), nunca por cifras absolutas: los mapas de coropletas deben mostrar datos normalizados (Slocum et al., 2009). Los colegios electorales son **círculos proporcionales** cuya **área** (no el radio) es proporcional a los votos válidos, siguiendo el uso del tamaño para cantidades en Bertin (1967).

## Color

| Vista | Tipo de dato | Esquema |
|---|---|---|
| Candidato más votado | categoría (quién ganó) + orden (margen) | un tono por candidato; 3 intensidades para Presidente, 2 para Gobernador |
| % de un candidato | divergente en torno al 50 % | tonos del rival por debajo del 50 %, del candidato por encima |
| Variación desde la primera vuelta | divergente en torno a 0 | ColorBrewer PRGn-6 (morado–verde, para no confundir el sentido con el partido) |
| Votos en blanco y nulos | secuencial | ColorBrewer RdPu-4 |
| Abstención | secuencial | ColorBrewer YlGnBu-4 |

Los esquemas siguen la lógica de ColorBrewer para datos secuenciales, divergentes y cualitativos (Harrower y Brewer, 2003; Brewer, Hatchard y Harrower, 2003), con esquemas divergentes solo cuando el punto medio tiene significado (Brewer, 1996): el 50 % es donde cambia la mayoría y el 0 es donde la variación cambia de signo.

Cada par de clases vecinas se midió con la diferencia de color **CIEDE2000** (Sharma, Wu y Dalal, 2005), en visión normal y simulando daltonismo rojo-verde (Machado, Oliveira y Fernandes, 2009). El umbral del proyecto es **ΔE00 ≥ 10**, un margen práctico basado en Brychtová y Çöltekin (2017), que comprobaron que los colores en áreas separadas del mapa necesitan diferencias mucho mayores que el umbral clásico de «diferencia apenas perceptible». Todas las escalas lo cumplen; la más ajustada es la de votos en blanco y nulos, con 10,4.

Para Gobernador, los partidos tienen dos intensidades (50–60 % y 60 % o más) en lugar de tres: con tres, ningún conjunto de rampas de color adicionales mantenía todos los pares de partidos distinguibles para personas con daltonismo. Las rampas se reutilizan entre estados mediante coloración de grafos, con una regla fija: los dos finalistas de un estado nunca comparten color.

## Clasificación

Los votos en blanco y nulos y la abstención usan **cuatro clases por cuartiles** de municipios, recalculadas en cada actualización de datos y redondeadas a medio punto. Brewer y Pickle (2002) comprobaron que los cuantiles funcionan igual o mejor que otros métodos para los lectores de mapas. Salvedad: un municipio de 1000 electores pesa lo mismo que uno de 9 millones.

## Superficie no es electorado

En la vista «Candidato más votado», el mapa ahora **se abre sin transparencia**: cada municipio tiene uno de los colores de la leyenda (3 franjas de margen por candidato a Presidente, 2 por partido para Gobernador). Al marcar **«Transparencia según el número de electores»**, cada candidato pasa a tener **un solo color**, y la claridad indica solo el tamaño del censo (**valor por transparencia**, Roth, Woodruff y Johnson, 2010), para que las áreas grandes y poco pobladas no dominen la imagen. La leyenda se convierte entonces en una **cuadrícula candidato × censo** con el color exacto que se dibuja en el mapa. Una nota en la leyenda explica que, al acercar el mapa, los colores de los municipios se aclaran y dejan paso a los colegios electorales.

Por qué cambió (octubre de 2026): la versión anterior se abría con la transparencia activada **y** con las franjas de margen. Medido con los datos reales, el mapa dibujaba 24 colores frente a 6 en la leyenda, y algunos eran indistinguibles (Lula 60–70 % en un municipio de menos de 5000 electores frente a Lula 50–60 % en uno de 5000–20.000: ΔE00 = 1,4). Margen y censo son dos variables ordenadas que competían por la misma variable visual, la claridad (Bertin, 1967); además, las leyendas de dos variables en color son difíciles de leer (Wainer y Francolini, 1980). En un estudio con usuarios, la transparencia fue el mejor canal visual para una variable cuantitativa cuando el tono indicaba la categoría (Mohammed, Polys y Sforza, 2018), que es justo la disposición de la cuadrícula. En ella, los dos candidatos quedan a ΔE00 ≥ 20,6 en visión normal (≥ 9,0 en la peor simulación de daltonismo); las clases de censo vecinas de un mismo candidato quedan a 9,9 (8,4 con deuteranomalía), justo por debajo del umbral de 10 del proyecto.

## Primera vuelta

Un selector «Primera vuelta / Segunda vuelta» añade la primera vuelta: Presidente, Gobernador y Senador, con todos los candidatos, por municipio y por colegio electoral. Cada mesa se cuenta en el colegio donde votó en la primera vuelta. Los votos a candidaturas anuladas (canceladas, también las recurridas) no cuentan como válidos, como en el recuento oficial del TSE; los votos válidos de los 458 candidatos coinciden exactamente con el archivo de votos por candidato del TSE.

- **Candidato más votado:** Presidente usa los colores de partido (PL, PT y PSD). Gobernador y Senador usan el **puesto del candidato en el estado** (1.º, 2.º, 3.º; los demás en gris), no el partido: 12 partidos ganan al menos un lugar para Gobernador y 17 para Senador, demasiados para colores distinguibles. Dos tonos para Presidente y Gobernador, con el corte en el 50 % de los votos válidos (la mayoría absoluta que da la victoria en la primera vuelta); un tono para Senador, en el que cada elector tuvo dos votos.
- **% de un candidato:** escala secuencial de cuatro clases en el color del candidato, con cortes en los cuartiles de los municipios (de los colegios, en los estados con menos de 30 municipios). Por eso el mismo color no significa el mismo porcentaje para candidatos distintos.
- Todos los colores nuevos cumplen ΔE00 ≥ 10 en visión normal y simulando deuteranopía y protanopía.

## Números pequeños

En las vistas de variación, los colegios con menos de **50 votos válidos comparables** aparecen atenuados en lugar de ocultos: en un mapa de tasas, las poblaciones pequeñas caen en los extremos solo por azar (Gelman y Price, 1999). El umbral de 50 es una elección de este proyecto, no una cifra de la literatura.

## Otras decisiones

- **Barras en lugar de gráficos de anillo** en el panel de resultados: la posición y la longitud sobre una escala común se leen con más precisión que los ángulos o las áreas (Cleveland y McGill, 1984).
- **Generalización de los límites:** Visvalingam y Whyatt (1993), con una tolerancia de 2 km para la vista del país y de 20 m para el contorno del municipio elegido, que solo se descarga cuando hace falta.
- **Proyección:** Web Mercator, estándar en los mapas web, exagera las superficies lejos del ecuador (alrededor de un +19 % en São Paulo y un +44 % en Chuí respecto a Manaos), así que no deben compararse superficies entre regiones (Battersby et al., 2014).
- **Límites de la interpretación:** un resultado describe a los electores de un lugar como conjunto, no a cada elector (falacia ecológica, Robinson, 1950), y el patrón cambia con la unidad elegida (problema de la unidad de área modificable, Openshaw, 1984).

## Referencias

- Battersby, S. E.; Finn, M. P.; Usery, E. L.; Yamamoto, K. H. (2014). Implications of Web Mercator and its use in online mapping. *Cartographica*, 49(2), 85–101.
- Bertin, J. (1967). *Sémiologie graphique*. París: Gauthier-Villars.
- Brewer, C. A. (1996). Guidelines for selecting colors for diverging schemes on maps. *The Cartographic Journal*, 33(2), 79–86.
- Brewer, C. A.; Hatchard, G. W.; Harrower, M. A. (2003). ColorBrewer in print: a catalog of color schemes for maps. *Cartography and Geographic Information Science*, 30(1), 5–32.
- Brewer, C. A.; Pickle, L. (2002). Evaluation of methods for classifying epidemiological data on choropleth maps in series. *Annals of the Association of American Geographers*, 92(4), 662–681.
- Brychtová, A.; Çöltekin, A. (2017). The effect of spatial distance on the discriminability of colors in maps. *Cartography and Geographic Information Science*, 44(3), 229–245.
- Cleveland, W. S.; McGill, R. (1984). Graphical perception. *Journal of the American Statistical Association*, 79(387), 531–554.
- Gelman, A.; Price, P. N. (1999). All maps of parameter estimates are misleading. *Statistics in Medicine*, 18(23), 3221–3234.
- Harrower, M.; Brewer, C. A. (2003). ColorBrewer.org: an online tool for selecting colour schemes for maps. *The Cartographic Journal*, 40(1), 27–37.
- Machado, G. M.; Oliveira, M. M.; Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE Transactions on Visualization and Computer Graphics*, 15(6), 1291–1298.
- Mohammed, A.; Polys, N. F.; Sforza, P. M. (2018). Evaluating visual channels for multivariate map visualization. EuroGraphics. http://hdl.handle.net/10919/97514.
- Openshaw, S. (1984). *The modifiable areal unit problem*. CATMOG 38. Norwich: Geo Books.
- Robinson, W. S. (1950). Ecological correlations and the behavior of individuals. *American Sociological Review*, 15(3), 351–357.
- Roth, R. E.; Woodruff, A. W.; Johnson, Z. F. (2010). Value-by-alpha maps: an alternative technique to the cartogram. *The Cartographic Journal*, 47(2), 130–140.
- Sharma, G.; Wu, W.; Dalal, E. N. (2005). The CIEDE2000 color-difference formula. *Color Research & Application*, 30(1), 21–30.
- Slocum, T. A.; McMaster, R. B.; Kessler, F. C.; Howard, H. H. (2009). *Thematic cartography and geovisualization*. 3.ª ed. Upper Saddle River: Pearson Prentice Hall.
- Visvalingam, M.; Whyatt, J. D. (1993). Line generalisation by repeated elimination of points. *The Cartographic Journal*, 30(1), 46–51.
- Wainer, H.; Francolini, C. M. (1980). An empirical inquiry concerning human understanding of two-variable color maps. *The American Statistician*, 34(2), 81–93.
