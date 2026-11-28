import type { CreditTemplate } from "../types";

export const CREDIT_TEMPLATES: Array<{
  id: CreditTemplate;
  name: string;
  description: string;
}> = [
  { id: "impact", name: "MikoRoku Impact", description: "Comic-style poster with a bold title, logo, credit column, and social links." },
  { id: "split", name: "Dramatic split", description: "Bold cover panel with a dedicated credit column." },
  { id: "minimal", name: "Minimal", description: "Clean typography and a centered cover." },
];
