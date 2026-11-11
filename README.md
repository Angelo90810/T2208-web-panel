# T2208 Web Panel

Painel web responsivo para o mixer **T2208**, construído a partir do manual oficial e da análise estática do APK Android e do aplicativo Windows. O painel é **somente ponte**: sem a mesa conectada ele mostra a tela de conexão, não um mixer simulado. A validação de escrita com a mesa física continua pendente.

![status](https://img.shields.io/badge/fase-ponte%20local-4cc9f0) ![bridge](https://img.shields.io/badge/ponte-dry--run-f6a623) ![testes](https://img.shields.io/badge/testes-29%20passando-34d399)

## O que já funciona

- **Mixer** — 30 strips (20 entradas, USB, 8 Aux, 2 FX e Main), 6 grupos DCA, fader, mute, solo, ganho, pan, nomes e seleção por banco ou salto direto de canal.
- **Medidores e RTA** — medidores por canal e espectro FFT.
- **Processamento** — PEQ de 4 bandas + HPF/LPF, GEQ de 31 bandas, gate, compressor, 12 tipos de FX, delay de até 300 ms e 48V com confirmação.
- **Routing** — envios Aux/FX, pré/pós, grupos DCA, I/O digital e matriz de saída.
- **AutoMix** — ativação, participação por canal e limpeza com confirmação.
- **Presets e cenas** — biblioteca local no navegador, salvar, carregar, copiar, excluir e recall com confirmação.
- **Sistema** — identidade, idioma (pt-BR/en/zh-CN), brilho, página inicial, atalho, IP, restauração de padrões e placeholders de memória (Windows-only).
- **Conexão** — descoberta UDP real, TCP 5000, leitura de versão/nome e dry-run. Sem ponte, as demais telas ficam bloqueadas.
- **Ponte local** — codec do quadro, mapa de comandos 1–55, descoberta HF-A11/IP120, cliente TCP, servidor HTTP/WS e simulador T2208.

## Modo

O painel tem um único modo de produção: **ponte local**. A URL pode vir de `?bridge=ws://127.0.0.1:8787/ws` ou da tela **Conexão → Usar ponte**. Sem ponte, o painel mostra apenas a tela de conexão e mantém as outras funções desabilitadas. O `DemoAdapter` existe somente para testes automatizados e para o estado interno da ponte; ele não é selecionável na interface.

## Segurança e limites

- O banner é **PONTE LOCAL — mesa não validada**; a ponte lê versão/nome e mantém **dry-run**.
- Sem conexão, o painel não inventa strips nem estado da mesa.
- A ponte ainda **não envia comandos de controle** (ganho, fader, 48V, routing etc.) porque os payloads não foram validados no hardware. `--allow-real-writes` é reservado e ignorado.
- 48V/phantom power, reset, exclusão de preset, recall de cena e limpeza do AutoMix exigem confirmação explícita; cancelar não altera o estado.
- O perfil de 30 strips/6 DCA/48V nos 16 primeiros vem da análise estática e ainda **não foi validado em hardware**.
- O APK e o EXE fornecidos não foram executados, instalados nem alterados.

## Rodando

```bash
npm install
npm run dev          # sobe a ponte + Vite em http://127.0.0.1:5173
npm run dev:web      # só o Vite, se a ponte já estiver rodando
npm run test:run     # 29 testes
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

Se a descoberta não achar a mesa, use **Conexão → Ponte local → Conectar por IP** ou abra direto com o IP:

```text
http://127.0.0.1:5173/?bridge=ws://127.0.0.1:8787/ws&device=192.168.1.50
```

## PC da igreja (Windows)

1. Instale o **Node.js LTS** uma vez: <https://nodejs.org/>.
2. Copie a pasta do projeto para o PC (ex.: `C:\T2208\`).
3. Dê dois cliques em **`start-panel.cmd`**. Ele instala as dependências na primeira vez, sobe a ponte + o painel e abre o navegador.
4. Na tela **Conexão**, use **Procurar mesa** ou **Conectar por IP** com o IP do T2208.
5. Para usar em tablet/celular na mesma rede, abra `http://IP_DO_PC:5173/` e permita o Node.js no firewall do Windows.

O painel não tem login; use somente na rede local da igreja, nunca exposto na internet. A janela **“T2208 - Ponte”** precisa ficar aberta; feche-a para encerrar.

## Estrutura

```
src/
  adapters/       MixerAdapter, BridgeAdapter e DemoAdapter (testes/estado interno)
  app/            provider, i18n, navegação, shell e seleção de modo
  components/     controles e feedback reutilizáveis
  domain/         tipos, capacidades, constantes e seed do estado local
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
- `docs/research/2026-11-11-manual-parity.md` — comparação manual × APK × EXE × painel, com o que foi corrigido e o que falta.
- `docs/specs/2026-10-17-t2208-web-panel-design.md` — decisões de produto e escopo da fase 1.
- `docs/specs/2026-11-11-local-bridge-phase.md` — escopo e status da ponte local.
- `bridge/README.md` — API, execução e limites da ponte.
