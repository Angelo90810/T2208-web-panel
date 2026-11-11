# T2208 Web Panel

Painel web responsivo para o mixer **T2208**, construído a partir da análise estática do APK Android e do aplicativo Windows oficiais. A interface está completa em modo **DEMO**, e a **ponte local** já existe e roda contra um simulador — a validação com a mesa física continua pendente.

![status](https://img.shields.io/badge/fase-DEMO-f6a623) ![bridge](https://img.shields.io/badge/ponte-dry--run-4cc9f0) ![testes](https://img.shields.io/badge/testes-27%20passando-34d399)

## O que já funciona

- **Mixer** — 30 strips (20 entradas, USB, 8 Aux, 2 FX e Main), 6 grupos DCA, fader, mute, solo, ganho, pan, nomes e seleção por banco ou salto direto de canal.
- **Medidores e RTA** — medidores por canal e espectro FFT simulado.
- **Processamento** — PEQ de 4 bandas + HPF/LPF, GEQ de 31 bandas, gate, compressor/limiter, FX, delay e 48V com confirmação.
- **Routing** — envios Aux/FX, pré/pós, grupos DCA, I/O digital e matriz de saída.
- **AutoMix** — ativação, participação por canal e limpeza com confirmação.
- **Presets e cenas** — biblioteca local no navegador, salvar, carregar, copiar, excluir e recall com confirmação.
- **Sistema** — identidade, idioma (pt-BR/en/zh-CN), brilho, página inicial, atalho, IP, restauração de padrões e placeholders de memória (Windows-only).
- **Conexão** — cenários demo e **modo ponte**: descoberta UDP real, TCP 5000, leitura de versão/nome e dry-run.
- **Ponte local** — codec do quadro, mapa de comandos 1–55, descoberta HF-A11/IP120, cliente TCP, servidor HTTP/WS e simulador T2208.

## Modos

| Modo | Como entrar | O que acontece |
|---|---|---|
| **DEMO** | padrão, sem parâmetro | estado simulado no navegador; banner DEMO |
| **Ponte** | `?bridge=ws://127.0.0.1:8787/ws` ou Conexão → Usar ponte | painel usa o snapshot da ponte; banner PONTE LOCAL e dry-run |

## Segurança e limites

- No modo DEMO, toda tela mantém o banner **DEMO** e o estado `demo-*`; nenhum socket é aberto pelo navegador.
- No modo ponte, o banner é **PONTE LOCAL — mesa não validada**; a ponte lê versão/nome e mantém **dry-run**.
- A ponte ainda **não envia comandos de controle** (ganho, fader, 48V, routing etc.) porque os payloads não foram validados no hardware. `--allow-real-writes` é reservado e ignorado.
- 48V/phantom power, reset, exclusão de preset, recall de cena e limpeza do AutoMix exigem confirmação explícita; cancelar não altera o estado.
- O perfil de 30 strips/6 DCA/48V nos 16 primeiros vem da análise estática e ainda **não foi validado em hardware**.
- O APK e o EXE fornecidos não foram executados, instalados nem alterados.

## Rodando

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run test:run     # 27 testes
npm run typecheck
npm run typecheck:bridge
npm run build        # gera dist/
```

### Ponte com simulador (sem mesa)

```bash
npm run bridge:sim
# em outro terminal, abra:
# http://127.0.0.1:5173/?bridge=ws://127.0.0.1:8787/ws
```

A ponte sobe TCP 5000, UDP 48899/8000 e o simulador; o painel mostra versão `V1.1` e nome `T2208-SIM`. Mais detalhes em [`bridge/README.md`](bridge/README.md).

### Ponte contra a mesa (quando houver acesso)

```bash
npm run bridge -- --device 192.168.1.50
```

A descoberta também pode ser feita pela tela **Conexão → Ponte local → Procurar mesa**. Enquanto os payloads não forem validados, a ponte permanece somente leitura.

## Estrutura

```
src/
  adapters/       MixerAdapter, DemoAdapter e BridgeAdapter
  app/            provider, i18n, navegação, shell e seleção de modo
  components/     controles e feedback reutilizáveis
  domain/         tipos, capacidades, constantes e seed do perfil demo
  features/       uma pasta por tela (mixer, meters, processing, routing, ...)
  i18n/           catálogo pt-BR/en/zh-CN
  styles/         tokens e CSS global
bridge/
  protocol/       quadro, comandos e descoberta UDP
  device/         cliente TCP 5000 e simulador T2208
  engine.ts       estado, conexão e status da ponte
  server.ts       HTTP + WebSocket
  index.ts        CLI (bridge / bridge:sim)
docs/
  research/       análise do protocolo e dos artefatos
  specs/          specs das fases 1 e 2
  plans/          plano de implementação
```

## Próxima fase

Com a mesa no local: validar o handshake, a resposta de versão, os ACKs e a codificação de cada payload; depois implementar as escritas de controle na ponte, uma família de comandos por vez, com teste de regressão. A camada de UI já está isolada pelo `MixerAdapter` e não precisa mudar.

## Referências

- `docs/research/2026-11-09-t2208-protocol-analysis.md` — portas, quadro, mapa de comandos e modelo de canais recuperados estaticamente.
- `docs/specs/2026-10-17-t2208-web-panel-design.md` — decisões de produto e escopo da fase 1.
- `docs/specs/2026-11-09-local-bridge-phase.md` — escopo e status da ponte local.
- `bridge/README.md` — API, execução e limites da ponte.
