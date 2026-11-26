# Bilheteria concorrente

**Vídeo:** COLOCAR_O_LINK_AQUI

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** COLOCAR_O_LINK_AQUI

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| Pedro Jorge Fernandes Medeiros de Oliveira | Pedrofmdo | `preco.ts` (funcional), `dominio.ts` (OO), `bilheteria.ts` (concorrência), `main.ts` e bench |
| NOME_DA_DUPLA | usuario_da_dupla | `regras.ts` (meia-entrada) e README |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?

   O Node executa o JavaScript numa linha só e só troca de pedido quando um pedido chega num `await`.
   No `reservar` da bilheteria, a validação e a marcação das poltronas (`evento.reservar(poltronas)`)
   acontecem **antes** do `await` do pagamento, num trecho síncrono que nenhum outro pedido consegue
   interromper. Quando o pedido para no `await`, as poltronas dele já estão marcadas, então o próximo
   pedido para a mesma poltrona recebe `PoltronaOcupadaErro` sem ser cobrado. O `await` perigoso seria
   cobrar primeiro e marcar depois: enquanto o primeiro pedido espera a operadora, os outros também
   passam pela checagem (a poltrona ainda parece livre), todos são cobrados e só um fica com a poltrona.
   Além disso, o pagamento tem tempo limite (`comTempoLimite` com `Promise.race`) para não travar o
   pedido numa operadora parada, e se a cobrança falha ou estoura o tempo as poltronas são devolvidas
   com `evento.liberar` e o cliente recebe `PagamentoErro` (502).

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?

   O `Evento` esconde a lista de poltronas vendidas num campo privado `#vendidas`. De fora só dá para
   ler `disponivel` (um getter sem setter); atribuir `evento.disponivel = 999` não muda nada. Assim a
   única forma de mexer nas poltronas é pelos métodos `reservar` e `liberar`, que validam os dados
   (encapsulamento). O `reservar` é tudo ou nada porque um pedido é de uma família: se uma poltrona
   falhar, não faz sentido vender só parte e deixar poltronas presas sem pagamento. Por isso ele confere
   todas as poltronas primeiro e só marca no final. Os erros são uma hierarquia (`ErroDeNegocio` abstrata
   e quatro filhas) porque cada erro carrega o próprio `status` HTTP: o servidor trata todos do mesmo
   jeito (`erro instanceof ErroDeNegocio` → `res.status(erro.status)`), sem um `if` por tipo, e criar
   um erro novo não exige mudar o servidor (polimorfismo).

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   As funções dependem só dos parâmetros e não alteram nada de fora: mesma entrada, mesma saída. Isso
   torna o cálculo previsível, fácil de reutilizar e seguro com vários pedidos ao mesmo tempo (não há
   estado compartilhado para dar conflito). As fábricas (`valorDoIngresso`, `aplicarTaxa`) e a função
   `temDireitoAMeia` recebida por parâmetro deixam trocar a regra sem mexer no código. Para testar,
   basta importar e chamar: `assert.equal(aplicarTaxa(0.1)(100), 110)`,
   `montarIngressos(100, pessoas, regraQualquer)`, `calcularTotal([...])`. Não precisa de servidor,
   banco, operadora nem mock.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   O preço em OO: uma classe `CalculadoraDePreco` com campos `precoBase` e `taxa` e um método
   `calcular(pessoas)` que percorre a lista com `for` e vai acumulando num `let total`. Funcionaria,
   mas ficaria pior: o objeto guarda estado que pode ser alterado entre chamadas, o teste precisa
   montar o objeto antes, e trocar a regra da meia exigiria herança ou um campo a mais. No funcional a
   regra é só mais um parâmetro e cada função faz uma coisa só.

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?

   Hoje a checagem e a marcação das poltronas nunca são interrompidas, porque só uma linha de código
   roda por vez. Com vários núcleos, dois pedidos poderiam executar `evento.reservar` exatamente ao
   mesmo tempo: os dois veriam a poltrona livre e os dois marcariam (condição de corrida). Seria
   preciso uma trava (mutex/lock) em volta da checagem e marcação, operações atômicas, ou deixar o
   banco de dados garantir (transação ou restrição `UNIQUE` na poltrona). Também a lista `#vendidas`
   teria que ficar num lugar compartilhado entre os processos, não na memória de um só.

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 233 | 92 | 100 | 8 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram: os 200 pedidos (dois para cada uma das 100 poltronas) terminaram em cerca de
233 ms, embora cada cobrança demore 80 ms. Se fossem atendidos um por vez, levariam uns 100 × 80 ms = 8 s;
como enquanto um pedido espera no `await` o Node atende os outros, todos esperam a operadora ao mesmo
tempo. Exatamente 100 pedidos receberam 409: o segundo pedido de cada poltrona, recusado antes de ser
cobrado, então nenhuma poltrona foi vendida duas vezes. Os 8 erros 502 são a operadora falsa falhando
cerca de 10% das vezes; essas poltronas voltaram para a venda (no fim, `disponivel` do evento 1 ficou
em 8). Vendidos + falhas de pagamento = 100, o número de poltronas.
