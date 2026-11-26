// Evento e erros — paradigma ORIENTADO A OBJETOS.
import type { EventoInfo } from "./tipos.ts";

// ---------------------------------------------------------------- Erros
// Classe abstrata: ninguém cria um "ErroDeNegocio" genérico, só as filhas.
// Cada erro carrega o próprio status HTTP, então o servidor não precisa de um
// if para cada tipo: basta ler erro.status (polimorfismo).
export abstract class ErroDeNegocio extends Error {
  readonly status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
    this.name = new.target.name;
  }
}

// Pedido ou poltrona inválidos.
export class DadosInvalidosErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

// O evento não existe.
export class NaoEncontradoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 404);
  }
}

// A poltrona já foi vendida.
export class PoltronaOcupadaErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 409);
  }
}

// A operadora não aprovou o pagamento (ou não respondeu a tempo).
export class PagamentoErro extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(mensagem, 502);
  }
}

// ---------------------------------------------------------------- Evento
export class Evento {
  // Campo privado de verdade (#): de fora da classe não dá para ler nem mudar.
  // A única forma de mexer nas poltronas é pelos métodos reservar e liberar,
  // que validam tudo antes.
  #vendidas: number[] = [];

  constructor(
    readonly id: number,
    readonly nome: string,
    readonly preco: number,
    readonly capacidade: number,
  ) {}

  // Só getter, sem setter: dá para ler quantas restam, mas não dá para atribuir.
  get disponivel(): number {
    return this.capacidade - this.#vendidas.length;
  }

  // Tudo ou nada: primeiro confere TODAS as poltronas, só depois marca.
  // Se qualquer uma falhar, o erro sai antes de marcar qualquer coisa.
  reservar(poltronas: number[]): void {
    if (!Array.isArray(poltronas) || poltronas.length === 0) {
      throw new DadosInvalidosErro("informe ao menos uma poltrona");
    }
    for (const poltrona of poltronas) {
      if (!this.#existe(poltrona)) {
        throw new DadosInvalidosErro(`poltrona ${poltrona} não existe (vai de 1 a ${this.capacidade})`);
      }
    }
    if (new Set(poltronas).size !== poltronas.length) {
      throw new DadosInvalidosErro("a mesma poltrona aparece mais de uma vez no pedido");
    }
    const ocupada = poltronas.find((poltrona) => this.#vendidas.includes(poltrona));
    if (ocupada !== undefined) {
      throw new PoltronaOcupadaErro(`poltrona ${ocupada} já foi vendida`);
    }
    // Passou em tudo: agora sim marca.
    this.#vendidas.push(...poltronas);
  }

  // Devolve as poltronas para a venda (usado quando o pagamento falha).
  liberar(poltronas: number[]): void {
    const naoVendida = poltronas.find((poltrona) => !this.#vendidas.includes(poltrona));
    if (naoVendida !== undefined) {
      throw new DadosInvalidosErro(`poltrona ${naoVendida} não estava vendida`);
    }
    this.#vendidas = this.#vendidas.filter((poltrona) => !poltronas.includes(poltrona));
  }

  info(): EventoInfo {
    return {
      id: this.id,
      nome: this.nome,
      preco: this.preco,
      capacidade: this.capacidade,
      disponivel: this.disponivel,
    };
  }

  #existe(poltrona: number): boolean {
    return Number.isInteger(poltrona) && poltrona >= 1 && poltrona <= this.capacidade;
  }
}
