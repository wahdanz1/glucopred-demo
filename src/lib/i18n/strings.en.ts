export const en = {
  language: {
    label: "Language",
    en: "EN",
    sv: "SV",
  },
  header: {
    eyebrow: "Degree thesis · Predictive CGM",
    eyebrowSyntheticSuffix: " · Synthetic data",
    logoAriaLabel: "GlucoPred logo",
    heroBase:
      "Short-horizon blood-glucose forecasting from continuous-monitor and insulin-pump signals - five models evaluated head-to-head at +15, +30 and +60 minutes.",
    heroDemoSuffix:
      " Curves run the project's real model code on simulated patients; no real medical data.",
    demoRepo: "Demo repo",
    contact: "Contact",
  },
  controls: {
    dataset: "Dataset",
    setN: (n: number) => `Set ${n}`,
    horizon: "Horizon",
    horizonAriaLabel: "Prediction horizon",
  },
  splits: {
    test: "Test",
    validation: "Validation",
  },
  predictions: {
    title: "Predictions vs actual",
    loading: "loading…",
    intro: (horizon: number) =>
      `The white line is the actual glucose. Every colored line is a model's forecast for that same moment, made ${horizon} minutes earlier from the previous 2 hours of data - never the future. Where a colored line lands on the white, the prediction was right; the gap is how far off the model was. The shaded band is the in-range target (3.9–10.0 mmol/L).`,
    splitFieldLabel: "Split",
    noData: "No data in this range.",
    mobileHint: "Tap or drag a finger along the chart to inspect any moment.",
    actualSeriesName: "Actual",
    modelSeriesName: (prettyName: string, horizon: number) =>
      `${prettyName} (+${horizon}m)`,
  },
  metrics: {
    title: "Per-model metrics",
    subtitle: (splitLabel: string, horizon: number) =>
      `${splitLabel} · +${horizon} min`,
    intro:
      "Accuracy and clinical-safety scores for every model at the selected horizon.",
    columns: {
      model: "Model",
      n: "N",
      rmse: "RMSE",
      mae: "MAE",
      tirAgr: "TIR agr.",
      ab: "A+B",
      unsafe: "Unsafe",
      neuralBadge: "neural",
    },
    tooltips: {
      rmse: "Root-mean-squared error in mmol/L. Heavily penalises large misses. Lower is better.",
      mae: "Mean absolute error in mmol/L. The model's typical miss size. Lower is better.",
      tirAgr:
        "Time-in-range agreement: share of predictions that agree with reality on whether glucose is in the 3.9–10.0 mmol/L target band. Higher is better.",
      ab: "Share of predictions landing in Clarke zones A or B - clinically acceptable: accurate or off in a way that wouldn't lead to harmful action. Higher is better.",
      unsafe:
        "Share of predictions in Clarke zones C, D, or E - would lead to a wrong or harmful action. Lower is better; ≥ 5 % is flagged red.",
    },
    footnote: {
      units: "RMSE / MAE in mmol/L",
      tirAgrLabel: "TIR agr.",
      tirAgrDesc:
        "share of points where forecast and truth agree on in-range vs. out",
      abLabel: "A+B",
      abDesc: "clinically acceptable (Clarke)",
      unsafeLabel: "Unsafe",
      unsafeTail:
        "= C+D+E. Best value per column is highlighted; Unsafe ≥ 5% flagged in red.",
    },
  },
  clarke: {
    title: "Clarke Error Grid",
    intro:
      "Every prediction plotted against truth. Distance from the 45° line is the error; the zone it lands in is the clinical consequence of trusting it.",
    neuralNetSuffix: "· neural net",
    baselineSuffix: "· baseline",
    emptyState: "Toggle at least one model above to populate the grid.",
    axisX: "CGM mmol/L",
    axisY: "Predicted mmol/L",
    loading: "loading…",
    samplingSubsampled: (visible: string, total: string) =>
      `Showing ${visible} of ${total} points (every C/D/E point shown; A/B subsampled for performance). Percentages computed from the full set.`,
    samplingFull: (total: string) =>
      `All ${total} predictions plotted; percentages from the full set.`,
    descriptions: {
      persistence: (horizon: number) =>
        `Predicts that glucose will stay the same ${horizon} minutes from now. The simplest baseline - every other model has to beat it to justify its existence.`,
      moving_average_5:
        "Predicts the average of the last 5 CGM readings (25 minutes). Smooths sensor noise but lags behind actual changes.",
      ar_2: "A second-order autoregression: a linear combination of the previous two readings. Captures local trend while staying mean-reverting, so it rarely overshoots.",
      linear_extrapolation:
        "Extends the slope between the last two readings forward in time. Aggressive - overshoots when glucose is rising sharply, undershoots when it's falling.",
      lstm: "A neural network trained per horizon. Reads the previous 2 hours of glucose plus insulin context (8 channels including bolus and basal IOB) and predicts ahead. The only model that's aware of insulin.",
    },
    zones: {
      A: {
        name: "Accurate",
        meaning:
          "Clinically accurate - within 20% of truth, or both in the low range.",
      },
      B: {
        name: "Benign error",
        meaning: "Off, but a treatment based on it would do no harm.",
      },
      C: {
        name: "Overcorrection",
        meaning:
          "Would prompt an unnecessary correction, pushing glucose the wrong way.",
      },
      D: {
        name: "Failure to detect",
        meaning: "Misses a dangerous high or low that needed action.",
      },
      E: {
        name: "Erroneous treatment",
        meaning:
          "Opposite treatment indicated - treats a high as a low or vice versa.",
      },
    },
  },
};

export type Strings = typeof en;
