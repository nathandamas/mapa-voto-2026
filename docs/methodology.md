# Why the map looks the way it does: methodology summary

This is an English summary of the full methodology notes, which are in Portuguese (`docs/fundamentacao.md`). Where the two differ, the Portuguese version is the reference. Colour measurements can be reproduced with `python scripts/medir_cores.py`.

## Data

- **Votes, turnout and registered voters:** Brazil's Superior Electoral Court (TSE), open data, first and second rounds of the 2026 elections, for President and, in the states that held a run-off, for Governor.
- **Polling stations:** the TSE register of polling stations, via the onde-voto-2026 project. Each **electoral section** (one voting machine, the smallest unit with published results) is counted at the polling station where it voted in the second round. Missing coordinates were filled in from the Inep School Catalogue and the IBGE 2022 address register (CNEFE); stations placed only at the centre of their locality are drawn as **hollow circles**.
- **Boundaries:** IBGE (Brazilian Institute of Geography and Statistics), 2025 Digital Municipal Boundaries, 5,571 municipalities.
- **Voting abroad:** the TSE gives no coordinates outside Brazil, so each city with electoral sections abroad is placed at the centre of the city (Natural Earth, public domain; GeoNames, CC BY 4.0, for six small border towns). The city is the one the TSE records, usually the seat of the consulate: some polling stations are in neighbouring cities.

## Map types

Municipalities are shaded by **rates** (% of valid votes, % abstention, change in percentage points), never by raw counts: choropleth maps should show normalised data (Slocum et al., 2009). Polling stations are **proportional circles** whose **area** (not radius) is proportional to valid votes, following Bertin's (1967) use of size for quantities.

## Colour

| View | Data type | Scheme |
|---|---|---|
| Leading candidate | category (who won) + order (margin) | one hue per candidate; 3 shades for President, 2 for Governor |
| A candidate's % | diverging around 50% | the opponent's shades below 50%, the candidate's above |
| Change since the first round | diverging around 0 | ColorBrewer PRGn-6 (purple–green, so that direction is not confused with party) |
| Blank and spoilt ballots | sequential | ColorBrewer RdPu-4 |
| Abstention | sequential | ColorBrewer YlGnBu-4 |

The schemes follow the ColorBrewer logic of sequential, diverging and qualitative data (Harrower and Brewer, 2003; Brewer, Hatchard and Harrower, 2003), with diverging schemes only where the midpoint means something (Brewer, 1996): 50% is where the majority changes, 0 is where the change switches sign.

Every pair of neighbouring classes was measured with the **CIEDE2000** colour difference (Sharma, Wu and Dalal, 2005), in normal vision and in simulated red–green colour blindness (Machado, Oliveira and Fernandes, 2009). The project's threshold is **ΔE00 ≥ 10**, a practical margin based on Brychtová and Çöltekin (2017), who found that colours in separate map areas need much larger differences than the classic "just noticeable" threshold. All scales pass; the weakest is blank and spoilt ballots at 10.4.

For Governor, parties get two shades (50–60% and 60% or more) instead of three: with three shades, no set of extra colour ramps kept every pair of parties distinguishable for colour-blind readers. Ramps are reused between states through graph colouring, with one hard rule: the two finalists in a state never share a colour.

## Classification

Blank and spoilt ballots and abstention use **four quantile classes** of municipalities, recalculated at each data update and rounded to half a point. Brewer and Pickle (2002) found quantiles performed as well as or better than other methods for map readers. Caveat: a municipality of 1,000 voters weighs the same as one of 9 million.

## Area is not voters

In the "Leading candidate" view the map now **opens without transparency**, so every municipality has one of the colours in the legend (3 margin bands per presidential candidate, 2 per party for Governor). Ticking **"Transparency by number of voters"** switches to **one colour per candidate**, with lightness showing only the size of the electorate (**value-by-alpha**, Roth, Woodruff and Johnson, 2010), so that large, sparsely populated areas do not dominate the picture. The legend then becomes a **candidate × electorate grid** showing the exact colour drawn on the map. A note in the legend explains that municipality colours fade as you zoom in, giving way to the polling stations.

Why this changed (October 2026): the earlier version opened with transparency on **and** margin bands. Measured on the real data, the map drew 24 colours against 6 in the legend, and some were indistinguishable (Lula 60–70% in a municipality under 5,000 voters vs Lula 50–60% in one of 5,000–20,000: ΔE00 = 1.4). Margin and electorate are both ordered variables, and they were competing for the same visual variable, lightness (Bertin, 1967); two-variable colour legends are also hard to read (Wainer and Francolini, 1980). In a user study, transparency performed best among visual channels for a quantitative variable when hue carried the category (Mohammed, Polys and Sforza, 2018), which is the arrangement of the grid. In the grid, the two candidates stay at ΔE00 ≥ 20.6 in normal vision (≥ 9.0 in the worst colour-blindness simulation); neighbouring electorate classes of the same candidate are at 9.9 (8.4 with deuteranomaly), just under the project's threshold of 10.

## First round

A "First round / Second round" switch adds the first round: President, Governor and Senator, with every candidate, by municipality and by polling station. Each electoral section is counted at the polling station where it voted in the first round. Votes for annulled candidacies (cancelled, including those under appeal) are not counted as valid, as in the official TSE tally; the valid votes of all 458 candidates match the TSE file of votes by candidate exactly.

- **Leading candidate:** President uses party colours (PL, PT and PSD). Governor and Senator use the candidate's **place in the state** (1st, 2nd, 3rd; the others in grey), not the party: 12 parties win at least one place for Governor and 17 for Senator, too many for distinguishable colours. Two shades for President and Governor, split at 50% of valid votes (the absolute majority that wins in the first round); one shade for Senator, where each voter had two votes.
- **A candidate's share:** a sequential scale of four classes in the candidate's colour, with breaks at the quartiles of municipalities (of polling stations in states with fewer than 30 municipalities). The same colour therefore does not mean the same percentage for different candidates.
- All the new colours pass ΔE00 ≥ 10 in normal vision and in simulated deuteranopia and protanopia.

## Small numbers

In the change views, polling stations with fewer than **50 comparable valid votes** are faded rather than hidden: small populations land at the extremes of a rate map by chance alone (Gelman and Price, 1999). The threshold of 50 is this project's choice, not a figure from the literature.

## Other choices

- **Bars, not doughnuts,** in the result panel: position and length on a common scale are read more accurately than angles or areas (Cleveland and McGill, 1984).
- **Boundary generalisation:** Visvalingam and Whyatt (1993), with a 2 km tolerance for the country view and 20 m for the outline of the selected municipality, which is downloaded only when needed.
- **Projection:** Web Mercator, standard for web maps, exaggerates areas away from the Equator (about +19% in São Paulo and +44% in Chuí compared with Manaus), so areas should not be compared across regions (Battersby et al., 2014).
- **Limits of interpretation:** a result describes the voters of a place as a group, not each voter (ecological fallacy, Robinson, 1950), and the pattern changes with the unit chosen (modifiable areal unit problem, Openshaw, 1984).

## References

- Battersby, S. E.; Finn, M. P.; Usery, E. L.; Yamamoto, K. H. (2014). Implications of Web Mercator and its use in online mapping. *Cartographica*, 49(2), 85–101.
- Bertin, J. (1967). *Sémiologie graphique*. Paris: Gauthier-Villars.
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
- Slocum, T. A.; McMaster, R. B.; Kessler, F. C.; Howard, H. H. (2009). *Thematic cartography and geovisualization*. 3rd ed. Upper Saddle River: Pearson Prentice Hall.
- Visvalingam, M.; Whyatt, J. D. (1993). Line generalisation by repeated elimination of points. *The Cartographic Journal*, 30(1), 46–51.
- Wainer, H.; Francolini, C. M. (1980). An empirical inquiry concerning human understanding of two-variable color maps. *The American Statistician*, 34(2), 81–93.
