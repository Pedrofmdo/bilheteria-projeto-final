// Liga tudo e sobe o servidor na porta 3000.
import { criarBilheteria } from "./bilheteria.ts";
import { Evento } from "./dominio.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const eventos = [
  new Evento(1, "Show de Abertura", 100, 100), // o bench usa este
  new Evento(2, "Festival de Jazz", 150, 50),
  new Evento(3, "Stand-up Comedy", 60, 30),
];

const pagar = criarPagamentoFalso({ latenciaMs: 80, taxaDeFalha: 0.1 });

const bilheteria = criarBilheteria({ eventos, pagar, limitePagamentoMs: 500 });

const PORTA = 3000;
criarServidor(bilheteria).listen(PORTA, () => {
  console.log(`Bilheteria no ar em http://localhost:${PORTA}`);
});
