# T2208 Web Panel

Painel web responsivo para o mixer **T2208**, construído a partir da análise estática do APK Android e do aplicativo Windows oficiais. Esta primeira fase é **100% DEMO**: a interface inteira funciona, mas nenhum comando é enviado a uma mesa real.

![status](https://img.shields.io/badge/fase-DEMO-f6a623) ![stack](https://img.shields.io/badge/React-19-4cc9f0) ![testes](https://img.shields.io/badge/testes-18%20passando-34d399)

## O que já funciona

- **Mixer** — 30 strips (20 entradas, USB, 8 Aux, 2 FX e Main), 6 grupos DCA, fader, mute, solo, ganho, pan, nomes e seleção por banco ou salto direto de canal.
- **Medidores e RTA** — medidores por canal e espectro FFT simulado.
- **Processamento** — PEQ de 4 bandas + HPF/LPF, GEQ de 31 bandas, gate, compressor/limiter, FX, delay e 48V com confirmação.
- **Routing** — envios Aux/FX, pré/pós, grupos DCA, I/O digital e matriz de saída.
- **AutoMix** — ativação, participação por canal e limpeza com confirmação.
- **Presets e cenas** — biblioteca local no navegador, salvar, carregar, copiar, excluir e recall com confirmação.
- **Sistema** — identidade, idioma (pt-BR/en/zh-CN), brilho, página inicial, atalho, IP, restauração de padrões e placeholders de memória (Windows-only).
- **Conexão** — estados simulados de descoberta e conexão, validação de IPv4 e explicação do protocolo observado.

## Segurança e limites desta fase

- Toda tela mantém o banner **DEMO** e o estado de conexão prefixado `demo-`.
- Não há descoberta de rede, sockets UDP/TCP, bridge local, escrita de firmware ou comandos reais.
- 48V/phantom power, reset, exclusão de preset, recall de cena e limpeza do AutoMix exigem confirmação explícita; cancelar não altera o estado.
- O modelo de canais (`DeviceCapabilities`) é dirigido por dados: a interface se adapta a uma mesa com outra contagem de strips, Aux, FX ou DCA.
- O perfil de 30 strips/6 DCA/48V nos 16 primeiros vem da análise estática e ainda **não foi validado em hardware**.

## Rodando

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run test:run   # 18 testes
npm run typecheck
npm run build      # gera dist/
```

## Estrutura

```
src/
  adapters/       contrato MixerAdapter + DemoAdapter persistido em localStorage
  app/            provider, i18n, navegação e shell responsivo
  components/     controles e feedback reutilizáveis
  domain/         tipos, capacidades, constantes e seed do perfil demo
  features/       uma pasta por tela (mixer, meters, processing, routing, ...)
  i18n/           catálogo pt-BR/en/zh-CN
  styles/         tokens e CSS global
docs/
  research/       análise do protocolo e dos artefatos
  specs/          spec aprovado
  plans/          plano de implementação
```

## Próxima fase

Quando houver uma mesa e o protocolo validado em campo, entra uma **ponte local** na mesma rede do T2208: o navegador fala com a ponte, e a ponte fala TCP 5000/UDP 48899 com a mesa. O `MixerAdapter` já isola essa troca; a implementação real não precisa mexer nas telas.

## Referências

- `docs/research/2026-11-09-t2208-protocol-analysis.md` — portas, quadro, mapa de comandos e modelo de canais recuperados estaticamente.
- `docs/specs/2026-10-17-t2208-web-panel-design.md` — decisões de produto e escopo.
- `docs/plans/2026-10-17-t2208-web-panel.md` — plano de implementação.

> Nenhum APK ou EXE foi executado, instalado ou modificado durante a análise.
