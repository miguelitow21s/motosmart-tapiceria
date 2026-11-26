import { compactText, queryWords } from "./search.ts";

/*
  Modelos de moto con molde en el taller: la silla se corta con el patrón de
  esa moto, no a ojo. Se edita en /admin > "Textos" > "Modelos con molde",
  una línea por modelo: "Marca: modelo".

  La lista de respaldo sale de las fichas técnicas del taller (noviembre
  2026), sin las variantes de color de costura (comparten molde).
*/

export const DEFAULT_MOLDES_TEXT = `AKT: AK 100S
AKT: AK 110 (2011)
AKT: AK 110S
AKT: AK 235R
AKT: AK Special 110 (2013)
AKT: CR5 180
AKT: Dynamic 125 (2009-2010)
AKT: Dynamic 125 (2012)
AKT: Dynamic Pro
AKT: Evo 1 125
AKT: Evo 2 125
AKT: Evo 150 (2010)
AKT: Evo NE 125/150
AKT: Evo R3 125/150
AKT: Evo R3 125/150 (2016)
AKT: Flex 125
AKT: Flex 125 (2012)
AKT: Flex 125 (2016)
AKT: Jet 4
AKT: Jet 5R
AKT: NKD R 125 (2011)
AKT: NKD R 125 (2016)
AKT: NKD R 125 (2018)
AKT: RTX 150
AKT: SL 125 (2008)
AKT: SM 200 (2008)
AKT: TT 125R Enduro
AKT: TT 150 (2009-2010)
AKT: TT 250 Adventure
AKT: TT R 125 (2013)
AKT: TT R 125/150 (2009-2010)
AKT: TTR/TTX 125/150/180 (2015)
AKT: TTR/TTX 125/150/180 (2018)
AKT: XM 180 (2011-2014)
AKT: XM 200 (2009-2010)
Auteco: Boxer BM 100 (2011)
Auteco: Boxer BM 100/150 Classic (2012)
Auteco: Boxer CT (2012)
Auteco: Boxer MV
Auteco: Boxer S
Auteco: Discover 100
Auteco: Discover 100M
Auteco: Discover 125+
Auteco: Discover 125/135
Auteco: Discover 125 ST (2013)
Auteco: Discover 125 ST Style
Auteco: Discover 150 ST
Auteco: Discover Pro 150 ST
Auteco: Jetix 125
Auteco: MRX 125/150
Auteco: Platino 100/125
Auteco: Platino 110
Auteco: Pulsar 135
Auteco: Pulsar 135 GP
Auteco: Pulsar 135 GT
Auteco: Pulsar 135 R
Auteco: Pulsar 180/200/220 GP
Auteco: Pulsar 180/200/220 GT
Auteco: Pulsar 180/200/220 R
Auteco: Pulsar 180 UG/200/220
Auteco: Pulsar 200 NS
Auteco: XCD 125
Honda: Biz 100
Honda: Biz 125
Honda: C100 Wave
Honda: C100 Wave (2010)
Honda: CB 110
Honda: CB 125E (2011)
Honda: CB 150 Invicta (2011)
Honda: CB 150 Invicta (2014)
Honda: CB 160F
Honda: CBF 125
Honda: CBF 150 Sport
Honda: CBR 250
Honda: CBZ 160
Honda: CD 100 Hero
Honda: E-Storm
Honda: Eco 100 Deluxe
Honda: Eco 100 MV
Honda: Eco 100+
Honda: Navi 110
Honda: PCX 150
Honda: Splendor MV
Honda: Splendor NXG
Honda: Titan
Honda: Tornado
Honda: XL 200
Honda: XLR 125
Honda: XR 125 Bros
Honda: XR 150L
Honda: XRE 300
Kawasaki: GTO 125 Clásica
Kawasaki: KLR 650
Kawasaki: KLX 150
Kawasaki: KW 100 / G7 Sport
Kawasaki: Magic 110 / K1 / Cheer
Kawasaki: Magic 2 / ZX 135
Kawasaki: Neomax 100
Kawasaki: Ninja 250
Kawasaki: Victor 150
Kymco: Active 110
Kymco: Bet & Win 250
Kymco: Agility 150 City
Kymco: Agility (2009)
Kymco: Agility Digital
Kymco: Agility Digital 3.0
Kymco: Agility Fly 125
Kymco: Agility RS
Kymco: Agility RS Naked
Kymco: Agility Twist 125 (2017)
Kymco: Agility Twist 125 (2019)
Kymco: Agility Twist 125 City (2017)
Kymco: Agility Xtreme
Kymco: Rocket
Kymco: Top Boy 100
Kymco: Uni-K
Kymco: Uni-K (2017)
Kymco: Urban
Suzuki: AN 100 Space
Suzuki: AX 100 Clásica
Suzuki: AX 2
Suzuki: AX 4
Suzuki: AX 4 (2015)
Suzuki: AX 4 (2016)
Suzuki: AX 4 (2018)
Suzuki: Best 125
Suzuki: Best 125 (2014)
Suzuki: Best 125 (2015)
Suzuki: Best 125 (2018)
Suzuki: DL 650 V-Strom
Suzuki: DR 200
Suzuki: DR 650
Suzuki: ER 125/185
Suzuki: Freewind
Suzuki: Gixxer
Suzuki: GN 125
Suzuki: GN 125 Nova
Suzuki: GN 125 Nova (2018)
Suzuki: GN 125H Special
Suzuki: GS 125
Suzuki: GS 125 (2012)
Suzuki: GS 150R (2015)
Suzuki: GS 500 (2002)
Suzuki: GSR 600
Suzuki: TS 125 CN/CR
Suzuki: TS 185 (1997 en adelante)
Suzuki: TSZ 125 Andina
Suzuki: Viva 115
Suzuki: Viva R
Suzuki: Viva R Style
Suzuki: Vivax 115
TVS: Apache RTR
TVS: Apache RTR (2018)
TVS: Rockz 125
TVS: Sport 100
TVS: Sport 100 (2016)
Yamaha: BWS 100
Yamaha: BWS 125 FI (2017)
Yamaha: BWS 125 X Motard
Yamaha: Crypton 115 (2011)
Yamaha: Crypton MV
Yamaha: Crypton R (2009)
Yamaha: Crypton T 115
Yamaha: DT 125/175
Yamaha: DT 200 LC
Yamaha: DTE 175 Calibmatic
Yamaha: Fazer 16 carenaje
Yamaha: Fino
Yamaha: FZ 16
Yamaha: FZ 25
Yamaha: FZ/Fazer 16 (2013-2015)
Yamaha: FZ/Fazer 2.0
Yamaha: Jog
Yamaha: LB 80 Chappy
Yamaha: Libero 110
Yamaha: Libero 125
Yamaha: Next
Yamaha: NMAX 150
Yamaha: NMAX 150 (2017)
Yamaha: R15 (2010)
Yamaha: RX 100 Clásica
Yamaha: RX 100 Especial
Yamaha: RX 100 Sport
Yamaha: RX 115
Yamaha: RX 115 Especial
Yamaha: SZ R
Yamaha: V 80
Yamaha: XT 225
Yamaha: XT 600
Yamaha: XT 660
Yamaha: XTZ 125
Yamaha: XTZ 125 (2013)
Yamaha: XTZ 125 (2018)
Yamaha: XTZ 250 (2011)
Yamaha: XTZ 250 (2014)
Yamaha: YBR 125
Yamaha: YBR 125 ESD
Yamaha: YBR 125 SS (2011)`;

export type MoldeModel = { brand: string; model: string };
export type MoldeBrand = { brand: string; models: string[] };

/** Una línea válida: "Marca: modelo", con marca y modelo de largo razonable. */
const LINE = /^([^:]{1,40}):\s*(.{1,80})$/;

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Las líneas que no tienen la forma "Marca: modelo" (para avisar en el panel). */
export function invalidMoldeLines(text: string) {
  return lines(text).filter((line) => !LINE.test(line));
}

/** Los modelos de la lista, sin repetidos, en el orden en que se escribieron. */
export function parseMoldes(text: string): MoldeModel[] {
  const seen = new Set<string>();
  const models: MoldeModel[] = [];
  for (const line of lines(text)) {
    const match = LINE.exec(line);
    if (!match) continue;
    const brand = match[1].trim();
    const model = match[2].trim();
    const key = compactText(`${brand}${model}`);
    if (!brand || !model || seen.has(key)) continue;
    seen.add(key);
    models.push({ brand, model });
  }
  return models;
}

/** Agrupados por marca (la marca como se escribió la primera vez). */
export function groupMoldes(models: MoldeModel[]): MoldeBrand[] {
  const groups = new Map<string, MoldeBrand>();
  for (const { brand, model } of models) {
    const key = compactText(brand);
    const group = groups.get(key) ?? { brand, models: [] };
    group.models.push(model);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Modelos cuyo nombre (con la marca) contiene cada palabra buscada, con las
 * mismas reglas que la búsqueda de diseños: "dt 125", "DT-125" y "yamaha dt"
 * encuentran la DT 125/175. Una búsqueda solo de palabras genéricas ("silla
 * moto") no encuentra nada aquí: listar 200 modelos no ayuda.
 */
export function searchMoldes(models: MoldeModel[], query: string) {
  const words = queryWords(query);
  if (!words.length) return [];
  const joined = words.join("");
  return models.filter(({ brand, model }) => {
    const haystack = compactText(`${brand} ${model}`);
    return words.every((word) => haystack.includes(word)) || haystack.includes(joined);
  });
}
