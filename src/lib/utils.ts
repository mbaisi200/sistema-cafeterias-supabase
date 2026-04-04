import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata um número como moeda R$ com proteção contra undefined/null */
export function fmtMoney(val: number | string | undefined | null): string {
  const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formata um número com casas decimais (protegido contra undefined/null) */
export function fmt(val: number | undefined | null, decimals: number = 2): string {
  return (val || 0).toFixed(decimals);
}
