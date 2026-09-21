import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { fr } from "@/lib/i18n/dictionaries/fr";
import type { Locale } from "@/lib/i18n/types";

export type { Dictionary };
export type { Locale } from "@/lib/i18n/types";
export { intlLocale } from "@/lib/i18n/storage";

const dictionaries: Record<Locale, Dictionary> = { en, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

type Primitive = string | number | boolean;

type Leaves<T, P extends string = ""> = T extends Primitive
  ? P
  : {
      [K in keyof T & string]: Leaves<
        T[K],
        P extends "" ? K : `${P}.${K}`
      >;
    }[keyof T & string];

export type MessageKey = Leaves<Dictionary>;

export type TranslateVars = Record<string, string | number>;

function getByPath(dict: Dictionary, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translate(
  dict: Dictionary,
  key: MessageKey | string,
  vars?: TranslateVars,
): string {
  let template = getByPath(dict, key) ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      template = template.replaceAll(`{${name}}`, String(value));
    }
  }
  return template;
}
