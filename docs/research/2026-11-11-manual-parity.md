# T2208 — paridade manual × APK × EXE × painel

Data: 2026-11-11
Fontes:
- Manual oficial: `https://www.topppro.com/manuals/T2208-UM.pdf` (texto extraído localmente; referências por linha do `.txt`).
- APK: `com.sekaku.yingshenwen.t2208-12.apk`, versão `1.1.0` (código 12), analisado estaticamente com REA/JADX.
- EXE: `T2208.exe`, .NET/WPF com Costura, analisado estaticamente; **não executado**.
- Painel: `C:\Users\Angelo\Projects\T2208-web-panel`.

Nenhum binário foi instalado, alterado ou executado durante esta auditoria.

## 1. O que o manual define

### Modelo de canais

- 16 pré-amplificadores de microfone e 20 entradas de linha; os canais 17–20 são entradas de linha (manual, linhas 121–149).
- 8 Aux, 2 FX, USB estéreo, Main estéreo; 30 strips na tela (16 mono + 2 pares estéreo + USB + 8 Aux + 2 FX + Main).
- 48V phantom nos 16 primeiros canais de microfone, com aviso.
- Link em pares fixos: 1-2, 3-4, 5-6, 7-8, 9-10, 11-12, 13-14, 15-16 e Aux 1-2, 3-4, 5-6, 7-8 (manual, linha 77 e seção 6.4).
- 6 grupos DCA, com assign repetido, renomeação e DCA Clear (manual, seção 6.12, linhas 2030–2107).
- Faders motorizados de 100 mm; o painel web não tem realimentação do motor.

### Processamento

- Gate: threshold 0 a -84 dB; attack 0,5–200 ms; release 0,01–1 s (manual, seção 6.5, linhas 1428–1510).
- Compressor: threshold -30 a +20 dB; attack 10–150 ms; release 10–1000 ms; ratio 10:1 a 1:1; gain 0–24 dB (manual, seção 6.6, linhas 1510–1657).
- PEQ: 4 bandas, frequência 20 Hz–20 kHz, Q 0,4–24, gain -24 a +24 dB; cada EQ1–4 pode ser HPF, LPF ou band-pass; HPF/LPF separados (manual, seção 6.7, linhas 1657–1754).
- GEQ: 31 bandas de 1/3 de oitava, 20 Hz–20 kHz, ±24 dB; somente Main estéreo e 8 Aux mono (manual, seção 6.8, linhas 1754–1864).
- Delay: até 300 ms em 48 kHz (manual, seção 6.4, linha 1382).
- FX: 12 tipos — Hall, Room, Plate, Delay, Stdelay, Tremolo, Flanger, Chorus, DelayRev, StDelayRev, FlangerRev, ChorusRev (manual, seção 6.9, linhas 1864–1954).
- Copy: copia Polarity, Gain, Delay, Gate, Comp, EQ, Assign e Send de um canal para outros (manual, seção 6.17, linhas 2375–2417).
- Presets: Scene, DSP Channel, FX1, FX2 e GEQ; 8 slots por página; Save/Load/Delete (manual, seções 6.16 e 6.18, linhas 2322–2445).
- Sistema: Scene atual, canal selecionado, brilho LCD/knob, Install Matrix, Lock Matrix, Default Setting, Default Page, All Faders, firmware, Lock Mixer (senha padrão 1111, super 2208), Password Setting, Fader Calibration, Device Name e atalhos (manual, seção 6.15, linhas 2199–2322).
- Digital In: somente canais 1–16; Digital Out com mapa de saídas (manual, seções 6.10 e 6.11, linhas 1954–2030).
- Routing: entradas para Main/Aux/FX; nível do Main não é ajustável; Aux/FX têm nível e pre/post (manual, seção 6.14, linhas 2107–2199).

## 2. O que o APK confirma

O APK tem 47 métodos `send*`/`change*`. Os corpos recuperados confirmam os quadros e os tamanhos:

| Comando | Tipo | Corpo | Evidência |
|---|---:|---|---|
| `sendGain` | 5 | 30 bytes; bit 0x80 = mute, 7 bits de gain ID | `SendCommand.sendGain` |
| `sendV48` | 8 | 2 bytes; bit por canal 1–16 | `SendCommand.sendV48` |
| `sendAssign` | 1 | 56 bytes; 30 strips | `SendCommand.sendAssign` |
| `sendGate` | 2 | 17 bytes | `SendCommand.sendGate` |
| `sendComp` | 3 | 14 bytes | `SendCommand.sendComp` |
| `sendEQ` | 4 | 13 bytes | `SendCommand.sendEQ` |
| `sendGEQ` | 16 | 33 bytes | `SendCommand.sendGEQ` |
| `sendLink` | 39 | 2 bytes | `SendCommand.sendLink` |
| `sendDca` | 12 | 24 bytes | `SendCommand.sendDca` |
| `sendRout` | 6 | 48 bytes | `SendCommand.sendRout` |
| `sendAutoMix` | 55 | — | `SendCommand.sendAutoMix` |

O APK também contém `AutoMix` (39 referências em `classes.dex`) e os 12 nomes de FX (`Stdelay`, `StDelay`, `FlangerRev`, `ChorusRev`, `DelayRev`, `Tremolo`). O manual **não** documenta AutoMix.

**Limite importante:** os campos enviados são IDs (`gainID`, `panID`, `freqID`, `qID`, `gThres`, `cThres`), não valores em dB/Hz. `getGainValue(mute, gain)` apenas empacota `(mute ? 0x80 : 0) | (gain & 0x7F)`. Sem a tabela ID→valor e sem leitura de estado, uma escrita pode mandar um valor diferente do que a tela mostra. Por isso a ponte continua em dry-run.

## 3. O que o EXE acrescenta

O EXE .NET contém `AutoMix`, `Ducker`, `FBC`, `Matrix` e export/import de memória. O manual não descreve Ducker, FBC nem AutoMix; são funções do aplicativo Windows/firmware, não do fluxo documentado do painel frontal. O painel web não implementa Ducker/FBC.

## 4. Comparação com o painel

Legenda: ✅ alinhado; 🟡 parcial ou depende da mesa; ❌ ausente; ⚪ fora do manual.

| Função do manual | Painel antes | Estado agora |
|---|---|---|
| 30 strips / 20 entradas / 8 Aux / 2 FX / USB / Main | ✅ | ✅ |
| 48V nos 16 primeiros, com confirmação | ✅ | ✅ |
| Link em pares fixos | ❌ | 🟡 UI e estado local; comando real não validado |
| DCA 6 grupos, assign e rename | 🟡 (sem rename; “link” inventado) | ✅ rename; “link” de DCA removido da UI |
| Gate 0…-84 dB, 0,5–200 ms, 0,01–1 s | ❌ fora da faixa | ✅ |
| Compressor -30…+20 dB, 10–150 ms, 10–1000 ms, 10:1…1:1, 0–24 dB | ❌ fora da faixa | ✅ |
| Limiter separado | ❌ inventado | ✅ removido; o manual só tem o medidor “Limit (dB)” |
| PEQ ±24 dB, Q 0,4–24 | ❌ ±15 / Q 0,1–10 | ✅ |
| PEQ EQ1–4 com tipo HPF/LPF/BP | 🟡 tipo fixo | ✅ seletor de tipo por banda |
| GEQ ±24 dB, só Main/Aux | ❌ ±12 e em qualquer canal | ✅ faixa e escopo |
| Delay 300 ms | ❌ 500 ms | ✅ |
| 12 tipos de FX | ❌ 6 tipos | ✅ |
| Main assign | 🟡 Aux podia ir para Main | ✅ Aux/Main bloqueados; FX liberado |
| Copy de canal | ❌ | 🟡 copia polaridade, ganho, delay, gate, comp, EQ, assign e sends no estado local; comando real não validado |
| Presets de cena/DSP/FX/GEQ no aparelho | ❌ (só biblioteca local) | ❌ ainda ausente |
| Lock/password 1111/2208, Lock Matrix, Install Matrix | ❌ | ❌ ainda ausente |
| Fader Calibration, lista de firmware, brilho LCD/knob | ❌ | 🟡 brilho e device name existem na UI; calibração/firmware não |
| Digital In 1–16 / Digital Out | 🟡 | 🟡 UI parcial; sem mapa completo |
| Mute silencia canais atribuídos às saídas | 🟡 | 🟡 UI mute só do strip; sem semântica de barramento |
| Fader motorizado | ❌ | ❌ UI não lê posição real |
| AutoMix | ⚪ | 🟡 existe no APK/EXE, não no manual; UI mantida como função observada |
| Ducker/FBC | ⚪ | ❌ só no EXE; fora do escopo do manual |

## 5. O que foi corrigido nesta passada

1. **Demo removido do caminho de produção.** `createAdapter()` agora sempre cria `BridgeAdapter`; não há mais fallback para `DemoAdapter` nem dispositivo “T2208 DEMO” na lista. Sem ponte, o painel mostra a tela de conexão, não um mixer falso.
2. **Snapshot inicial vazio.** `BridgeAdapter` começa com `buildEmptySnapshot()`; o `AppShell` bloqueia as demais views até existir um snapshot com strips.
3. **Rodapé e textos.** O rodapé não mostra mais “DEMO” no modo ponte; o texto de ponte offline não fala em estado simulado.
4. **FX de 6 para 12 tipos**, com parâmetros do manual.
5. **Faixas de Gate, Compressor, PEQ, GEQ e Delay** alinhadas ao manual.
6. **Link de pares fixos** (1-2…15-16, Aux 1-2…7-8) com cópia de DSP e restauração local ao deslinkar.
7. **DCA rename** (8 caracteres) e remoção do “link de DCA”, que não existe no manual.
8. **GEQ restrito a Main/Aux** na navegação de processamento.
9. **Main assign** bloqueado para Aux/Main e liberado para FX, conforme o manual.
10. **Tipo de banda PEQ** (PEQ/HPF/LPF) editável em EQ1–4.
11. **Limiter separado removido**; o manual só mostra o medidor de limite.
12. **Copy de canal** no painel de detalhe, com os campos do manual (polaridade, ganho, delay, gate, comp, EQ, assign e sends).

## 6. O que ainda bloqueia o uso “só com a mesa”

- **A ponte lê versão e nome**, mas ainda **não escreve controle** no T2208. `allowRealWrites` é forçado a `false`; as ações da UI são aplicadas no estado local da ponte.
- **Não há leitura de estado completo** (faders, mutes, EQ, gate, comp, routing). O painel não deve inventar que os valores atuais são os da mesa.
- **IDs do protocolo não estão mapeados para dB/Hz**; os corpos de `send*` foram recuperados, mas faltam as tabelas de conversão do APK/EXE e a confirmação de ACK no firmware.
- **Presets de aparelho, lock/password, matrizes, calibração de fader e Digital I/O completo** continuam ausentes.
- **Ducker/FBC** só aparecem no EXE; não são funções do manual e não foram implementados.

Próximo passo seguro, quando a mesa estiver acessível: conectar a ponte, confirmar versão/nome e capturar os quadros que a mesa envia após o handshake; com essa captura, mapear os IDs e validar um comando por vez (começando por link e gain) antes de habilitar escrita real.
