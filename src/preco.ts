// Preço — paradigma FUNCIONAL.
// Só funções puras: mesma entrada => mesma saída, sem alterar nada de fora.
// Nada de let, var, laços, push ou class: tudo com const, map, reduce e funções que devolvem funções.
import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

export const TAXA_DE_SERVICO = 0.1;

// Arredonda em 2 casas, devolvendo número (o toFixed devolveria texto).
const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

// Fábrica: recebe o preço base e devolve uma função que, dado o tipo, devolve o valor do ingresso.
// valorDoIngresso(80)("meia") => 40
export const valorDoIngresso =
  (precoBase: number) =>
  (tipo: TipoIngresso): number =>
    tipo === "meia" ? arredondar(precoBase / 2) : precoBase;

// Fábrica: recebe o percentual e devolve uma função que soma essa taxa a um valor.
// aplicarTaxa(0.1)(100) => 110
export const aplicarTaxa =
  (percentual: number) =>
  (valor: number): number =>
    arredondar(valor * (1 + percentual));

// Um Ingresso por pessoa, na mesma ordem. Quem decide a meia é a função recebida
// (função de alta ordem): assim a regra pode mudar sem mexer aqui.
export const montarIngressos = (
  precoBase: number,
  pessoas: readonly Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] => {
  const valorDe = valorDoIngresso(precoBase);
  return pessoas.map((pessoa): Ingresso => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return { nome: pessoa.nome, poltrona: pessoa.poltrona, tipo, valor: valorDe(tipo) };
  });
};

// Soma os valores com reduce e aplica a taxa de serviço de 10%.
export const calcularTotal = (ingressos: readonly Ingresso[]): number =>
  aplicarTaxa(TAXA_DE_SERVICO)(ingressos.reduce((soma, ingresso) => soma + ingresso.valor, 0));
