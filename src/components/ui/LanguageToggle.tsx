import { Segmented } from "./Segmented";
import { useLang, useT } from "../../lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <Segmented
      options={[
        { value: "sv", label: t.language.sv },
        { value: "en", label: t.language.en },
      ]}
      value={lang}
      onChange={setLang}
      ariaLabel={t.language.label}
      urgent
    />
  );
}
