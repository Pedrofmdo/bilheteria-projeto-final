// A venda — onde a CONCORRÊNCIA aparece.
import { DadosInvalidosErro, Evento, NaoEncontradoErro, PagamentoErro } from "./dominio.ts";
import type { Pagamento } from "./pagamento.ts";
import { calcularTotal, montarIngressos } from "./preco.ts";
import { direitoAMeia } from "./regras.ts";
import type { Comprovante, ConfigBilheteria, EventoInfo, Pedido } from "./tipos.ts";

// Corrida entre a cobrança e um relógio: quem terminar primeiro decide.
// Se o relógio ganhar, a promessa rejeita com "tempo esgotado".
function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error("tempo esgotado")), ms);
  });
  // O finally desliga o relógio quando a cobrança termina antes.
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class Bilheteria {
  // Campos privados: ninguém de fora troca os eventos, a operadora, o limite ou o contador.
  #eventos: Evento[];
  #pagar: Pagamento;
  #limitePagamentoMs: number;
  #proximaReservaId = 1;

  constructor(config: ConfigBilheteria) {
    this.#eventos = config.eventos;
    this.#pagar = config.pagar;
    this.#limitePagamentoMs = config.limitePagamentoMs;
  }

  listarEventos(): EventoInfo[] {
    return this.#eventos.map((evento) => evento.info());
  }

  async reservar(pedido: Pedido): Promise<Comprovante> {
    // 1. Confere o pedido e acha o evento.
    if (!pedido || !Array.isArray(pedido.ingressos) || pedido.ingressos.length === 0) {
      throw new DadosInvalidosErro("o pedido precisa de ao menos um ingresso");
    }
    const evento = this.#eventos.find((e) => e.id === pedido.eventoId);
    if (!evento) {
      throw new NaoEncontradoErro(`evento ${pedido.eventoId} não existe`);
    }

    // 2. Marca as poltronas ANTES de qualquer await.
    // Daqui até o await o código roda sem interrupção (o Node só troca de pedido num await),
    // então nenhum outro pedido consegue pegar estas poltronas no meio do caminho.
    // Se a poltrona já foi vendida, o erro sai aqui — antes de cobrar alguém.
    const poltronas = pedido.ingressos.map((pessoa) => pessoa.poltrona);
    evento.reservar(poltronas);

    // 3. Preço (funções puras do preco.ts).
    const ingressos = montarIngressos(evento.preco, pedido.ingressos, direitoAMeia);
    const total = calcularTotal(ingressos);

    // 4. Cobra. Enquanto este pedido espera no await, o Node atende os outros.
    try {
      await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs);
    } catch (erro) {
      // Pagamento recusado ou operadora travada: devolve as poltronas para a venda.
      evento.liberar(poltronas);
      throw new PagamentoErro(`pagamento não aprovado: ${(erro as Error).message}`);
    }

    // 5. Comprovante com um id novo a cada compra.
    const reservaId = this.#proximaReservaId++;
    return { reservaId, eventoId: evento.id, ingressos, total };
  }
}

export function criarBilheteria(config: ConfigBilheteria): Bilheteria {
  return new Bilheteria(config);
}
