# Ponte local T2208

Ponte Node/TypeScript que fica entre o navegador e a mesa. O navegador fala WebSocket/HTTP com a ponte; a ponte fala UDP/TCP com o T2208.

## O que já funciona sem a mesa

- Codec do quadro `01 20 03 LEN 00 01 00 01 TYPE … 40`, com parser incremental.
- Mapa de comandos 1–55 e comprimentos recuperados do APK/EXE.
- Descoberta UDP HF-A11 (48899) e IP120/IP210 (5005→8000).
- Cliente TCP 5000 que envia os probes seguros: versão (44), nome (37) e keepalive (20).
- Simulador T2208 local (TCP + UDP) para exercitar tudo sem hardware.
- Servidor HTTP/WS com estado, status, descoberta, conexão e ações.
- Adaptador de ponte no SPA: o painel inteiro funciona em modo `bridge`, com banner próprio.
- Testes de codec, simulador, cliente e servidor (9 testes de ponte).

## Rodar com simulador

```bash
npm run bridge:sim
```

Saída esperada:

```
[sim] T2208 simulator TCP 5000, HF-A11 UDP 48899, IP120 UDP 8000
[bridge] HTTP  http://127.0.0.1:8787
[bridge] WS    ws://127.0.0.1:8787/ws
[bridge] mode  dry-run
```

Depois abra o painel em:

```
http://127.0.0.1:5173/?bridge=ws://127.0.0.1:8787/ws
```

O painel mostra **PONTE LOCAL — mesa não validada**, versão `V1.1` e nome `T2208-SIM`. Faders e demais controles atualizam o estado da ponte; nada é enviado a uma mesa real.

## Rodar contra a mesa (quando houver acesso)

```bash
npm run bridge -- --device 192.168.1.50
```

Ou descubra pela interface **Conexão → Ponte local → Procurar mesa**. A ponte conecta em TCP 5000, lê versão/nome e mantém o modo **dry-run**: nenhum comando de controle é enviado enquanto os payloads não forem validados no hardware.

### Sondar sem subir a ponte

```bash
npm run probe -- --host 192.168.1.50
npm run probe -- --discover
npm run probe -- --discover --target 127.0.0.1   # simulador local
```

O probe só envia versão, nome e keepalive; não escreve nada na mesa.

Para acessar de outro dispositivo da rede, suba a ponte e o Vite com `--host 0.0.0.0` e use o IP do PC no lugar de `127.0.0.1`:

```
http://192.168.1.12:5173/?bridge=ws://192.168.1.12:8787/ws
```

## API

| Método | Rota | Função |
|---|---|---|
| GET | `/health` | health + status |
| GET | `/status` | estado da ponte e da mesa |
| GET | `/state` | snapshot do mixer |
| POST | `/discover` | descoberta UDP (corpo opcional `{timeoutMs}`) |
| POST | `/connect` | `{host, port?}` |
| POST | `/disconnect` | desconecta |
| POST | `/action` | `{action: MixerAction}` |
| WS | `/ws` | snapshot/status + ações com `requestId` |

## Segurança e limites

- **Dry-run por padrão.** A ponte só envia leitura/keepalive; escrita de controle não está implementada.
- `--allow-real-writes` é reservado e ignorado até os payloads serem validados.
- O navegador nunca abre UDP/TCP direto; toda rede fica na ponte.
- A ponte escuta em `127.0.0.1` por padrão. Só use `0.0.0.0` em rede local confiável.
- O APK e o EXE fornecidos não foram executados, instalados nem alterados.

## Testes

```bash
npm run typecheck:bridge
npx vitest run bridge
```

Referência do protocolo: `../docs/research/2026-11-09-t2208-protocol-analysis.md`.
