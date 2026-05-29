import type { Strings } from "./strings.en";

export const sv: Strings = {
  language: {
    label: "Språk",
    en: "EN",
    sv: "SV",
  },
  header: {
    eyebrow: "Examensarbete · Prediktiv CGM",
    eyebrowSyntheticSuffix: " · Syntetiska data",
    logoAriaLabel: "GlucoPred-logotyp",
    heroBase:
      "Kortsiktig blodsockerprognos från CGM- och insulinpumpdata - fem modeller utvärderas sida vid sida på +15, +30 och +60 minuter.",
    heroDemoSuffix:
      " Kurvorna kommer från projektets riktiga modellkod körd på simulerade patienter; inga riktiga patientdata.",
    demoRepo: "Demo-repo",
    contact: "Kontakt",
  },
  controls: {
    dataset: "Dataset",
    setN: (n: number) => `Set ${n}`,
    horizon: "Horisont",
    horizonAriaLabel: "Prediktionshorisont",
  },
  splits: {
    test: "Test",
    validation: "Validering",
  },
  predictions: {
    title: "Prediktion mot verklighet",
    loading: "laddar…",
    intro: (horizon: number) =>
      `Den vita linjen är det faktiska blodsockret. Varje färgad linje är en modells prognos för samma ögonblick, beräknad ${horizon} minuter tidigare utifrån de senaste 2 timmarnas data - aldrig framtiden. Där en färgad linje träffar den vita var prognosen rätt; avståndet är hur mycket modellen missade. Det skuggade fältet är målintervallet (3,9–10,0 mmol/L).`,
    splitFieldLabel: "Datadel",
    noData: "Inga data i detta intervall.",
    mobileHint: "Tryck eller dra fingret över grafen för att läsa av valfritt ögonblick.",
    actualSeriesName: "Uppmätt",
    modelSeriesName: (prettyName: string, horizon: number) =>
      `${prettyName} (+${horizon} min)`,
  },
  metrics: {
    title: "Mått per modell",
    subtitle: (splitLabel: string, horizon: number) =>
      `${splitLabel} · +${horizon} min`,
    intro:
      "Noggrannhet och klinisk säkerhet för varje modell vid vald horisont.",
    columns: {
      model: "Modell",
      n: "N",
      rmse: "RMSE",
      mae: "MAE",
      tirAgr: "TIR-överens.",
      ab: "A+B",
      unsafe: "Osäker",
      neuralBadge: "neural",
    },
    tooltips: {
      rmse: "Rotmedelkvadratiskt fel i mmol/L. Straffar stora missar hårt. Lägre är bättre.",
      mae: "Medelabsolutfel i mmol/L. Modellens typiska missavstånd. Lägre är bättre.",
      tirAgr:
        "Tid-i-mål-överensstämmelse: andel prognoser som är överens med verkligheten om blodsockret ligger inom målintervallet 3,9–10,0 mmol/L. Högre är bättre.",
      ab: "Andel prognoser i Clarkes zoner A eller B - kliniskt acceptabla: korrekta eller felaktiga på ett sätt som inte leder till skadlig åtgärd. Högre är bättre.",
      unsafe:
        "Andel prognoser i Clarkes zoner C, D eller E - skulle leda till felaktig eller skadlig åtgärd. Lägre är bättre; ≥ 5 % markeras rött.",
    },
    footnote: {
      units: "RMSE / MAE i mmol/L",
      tirAgrLabel: "TIR-överens.",
      tirAgrDesc:
        "andel där prognos och verklighet är överens om blodsockret är inom målintervallet",
      abLabel: "A+B",
      abDesc: "kliniskt acceptabla (Clarke)",
      unsafeLabel: "Osäker",
      unsafeTail:
        "= C+D+E. Bästa värde per kolumn är markerat; Osäker ≥ 5 % markeras rött.",
    },
  },
  clarke: {
    title: "Clarke Error Grid",
    intro:
      "Varje prognos plottad mot verkligheten. Avståndet från 45°-linjen är felet; zonen den hamnar i är den kliniska konsekvensen av att lita på den.",
    neuralNetSuffix: "· neuralt nätverk",
    baselineSuffix: "· baslinje",
    emptyState: "Aktivera minst en modell ovan för att fylla rutnätet.",
    axisX: "CGM mmol/L",
    axisY: "Predikterat mmol/L",
    loading: "laddar…",
    samplingSubsampled: (visible: string, total: string) =>
      `Visar ${visible} av ${total} punkter (varje C/D/E-punkt visas; A/B nedsamplade för prestanda). Procent beräknas på hela datamängden.`,
    samplingFull: (total: string) =>
      `Alla ${total} prognoser plottade; procent beräknas på hela datamängden.`,
    descriptions: {
      persistence: (horizon: number) =>
        `Förutspår att blodsockret står stilla under nästa ${horizon} minuter. Den enklaste baslinjen - varje annan modell måste slå den för att rättfärdiga sin existens.`,
      moving_average_5:
        "Förutspår medelvärdet av de senaste 5 CGM-värdena (25 minuter). Jämnar ut sensorbrus men släpar efter faktiska förändringar.",
      ar_2: "En autoregression av andra ordningen: en linjär kombination av de två föregående värdena. Fångar lokala trender men drar mot medelvärdet, så den skjuter sällan över.",
      linear_extrapolation:
        "Förlänger lutningen mellan de två senaste värdena framåt i tiden. Aggressiv - skjuter över när blodsockret stiger snabbt, underskattar när det faller.",
      lstm: "Ett neuralt nätverk tränat per horisont. Läser de senaste 2 timmarnas blodsocker plus insulinkontext (8 kanaler inklusive bolus och basal-IOB) och förutspår framåt. Den enda modellen som ser insulinet.",
    },
    zones: {
      A: {
        name: "Korrekt",
        meaning:
          "Kliniskt korrekt - inom 20 % av sanningen, eller båda i det låga intervallet.",
      },
      B: {
        name: "Ofarligt fel",
        meaning: "Fel, men en behandling baserad på prognosen skulle inte göra någon skada.",
      },
      C: {
        name: "Överkorrektion",
        meaning:
          "Skulle utlösa en onödig korrektion och driva blodsockret åt fel håll.",
      },
      D: {
        name: "Missad detektion",
        meaning: "Missar en farlig höjning eller sänkning som krävde åtgärd.",
      },
      E: {
        name: "Felaktig behandling",
        meaning:
          "Motsatt behandling indikerad - behandlar en höjning som en sänkning eller tvärtom.",
      },
    },
  },
};
