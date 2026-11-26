// Regra de negócio da meia-entrada.
import type { Pessoa } from "./tipos.ts";

export const IDADE_MINIMA_IDOSO = 60;

// Estudante, PcD ou 60 anos ou mais pagam meia.
export function direitoAMeia(pessoa: Pessoa): boolean {
  return pessoa.estudante || pessoa.pcd || pessoa.idade >= IDADE_MINIMA_IDOSO;
}