import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en, type Strings } from "./strings.en";
import { sv } from "./strings.sv";

export type Lang = "en" | "sv";

const STRINGS: Record<Lang, Strings> = { en, sv };
const STORAGE_KEY = "glucopred:lang";

function detectInitial(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "sv") return stored;
  // Walk navigator.languages in preference order and take the first entry
  // we support. A Swedish-OS user lands on SV; an English-OS user with SV
  // as a secondary browser language stays on EN (their primary wins).
  const prefs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const raw of prefs) {
    const code = raw?.toLowerCase().slice(0, 2);
    if (code === "sv") return "sv";
    if (code === "en") return "en";
  }
  return "en";
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Strings;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitial);

  // Keep <html lang> in sync so screen readers and the browser pick the right
  // pronunciation/hyphenation rules.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t: STRINGS[lang] }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT(): Strings {
  return useI18n().t;
}

/**
 * Same as {@link useT} but returns a deferred copy of the strings. Use inside
 * heavy components (Recharts subtrees) so a language switch lets the rest of
 * the UI repaint instantly while the chart re-renders concurrently. Rapid
 * sequential switches drop the intermediate render rather than queuing.
 */
export function useTDeferred(): Strings {
  return useDeferredValue(useI18n().t);
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { lang, setLang } = useI18n();
  return { lang, setLang };
}
