# T2208 — Análise estática do protocolo e do modelo de controle

- **Data:** 2026-11-09
- **Método:** análise estática com REA 6.7.0 (JADX headless 0.7.1 + apktool 3.0.3). O APK não foi instalado nem executado; o EXE não foi carregado por CLR nem executado.
- **Artefatos:**
  - APK `com.sekaku.yingshenwen.t2208-12.apk` — SHA-256 `80b0b89222d08c85f2a25886af881ceb696276728080e4418b963d4afe9b0968` (6.817.501 bytes)
  - EXE `T2208.exe` — SHA-256 `81d6bd162c8db5219a1010810b15708b358a297370bf4f5e58ca6d052b0586e9` (1.685.504 bytes)
- **Escopo:** confirmar transporte, descoberta, enquadramento e mapa de comandos; corrigir o modelo de canais; separar o que é fato observado do que ainda depende de hardware.

> Este documento não autoriza controle real. Ele descreve o que o código dos dois aplicativos faz, não o que um T2208 específico aceita. A validação com a mesa física continua obrigatória.

## 1. Identidade dos artefatos

### APK

| Campo | Valor |
|---|---|
| Pacote | `com.sekaku.yingshenwen.t2208` |
| Versão | 1.1.0 (versionCode 12) |
| minSdk / targetSdk | 19 / 34 |
| Classes / recursos | 1.243 / 645 |
| Atividades | `IpFindActivity` (launcher), `MainActivity`, `AllFadesActivity`, `DCASmallFaderActivity`, `DCAActivity` |
| Permissões | `INTERNET`, `GET_TASKS`, leitura/escrita de armazenamento externo, `READ_PHONE_STATE` |

O APK usa uma única `MainActivity` em landscape com fragments para as telas; as demais activities são variações de fader/DCA. O texto de versão exibido é `T2208 For Android Pad Ver : v1.1.0` e a compatibilidade declarada é com firmware `V1.1`.

### EXE

| Campo | Valor |
|---|---|
| Formato | PE32, .NET Framework 4.5, WPF |
| Assembly | `T2208`, versão `1.0.7.0`, sem strong name |
| Metadados | 144 tipos, 1.926 métodos, 948 campos |
| Empacotamento | Costura.Fody (DLLs embutidas e comprimidas) |
| Bibliotecas embutidas | `CommLibrary 2.1.3.5`, `FFT`, `BasicClassLib`, `JayLib`, `JayCustomControlLib`, `Lib.Controls.MyControls`, `System.Data.SQLite`, `Microsoft.Expression.Interactions` |

O EXE é o aplicativo Windows completo: a lógica de transporte está em `CommLibrary`, a UI em WPF e os presets locais em SQLite. As DLLs embutidas foram extraídas apenas para leitura (`costura.*.compressed` → deflate) e inspecionadas com REA.

## 2. Descoberta de dispositivos

O APK usa dois caminhos de descoberta UDP em paralelo, disparados por `IpManager.sendUdp()`:

| Família | Destino | Porta local | Payload de envio | Resposta esperada |
|---|---|---|---|---|
| HF-A11 | broadcast `255.255.255.255` | 48899 | ASCII `HF-A11ASSISTHREAD` | `HF-A11ASSISTHREAD` / dados do módulo |
| IP120/IP210 | broadcast `255.255.255.255` | 5005 → envio para 8000 | `01 02 00 0C 00 00 00 00 00 01 FF 11` | prefixo ASCII `192.168.1.101,ACCF235E4A60,` |

Confirmado em três lugares independentes:

- `IpManager.sendUdp()` no APK: `new UdpDetectUtil("255.255.255.255", 48899, 48899, StaticData.HAF11.getBytes(), StaticData.HAF11_REC_COMMAND)` e `new UdpDetectUtil("255.255.255.255", 5005, 8000, StaticData.IP120, StaticData.IP120_REC_COMMAND)`.
- Arrays decodificados do `StaticData.<clinit>` do APK (12 bytes do IP120 e 27 bytes da resposta).
- Strings e constantes da `CommLibrary` do EXE (`initHAF11` com 48899, `initIP210` com 8000, string `HF-A11ASSISTHREAD`, e a mensagem `Socket port 8000 or 4899 is occupied!`).

O scan dura ~3–3,5 s; o app então tenta um TCP "rápido" em cada IP encontrado para ler o nome do dispositivo antes de abrir a conexão de controle. O EXE usa o mesmo esquema na `CommLibrary.DeviceScaner` (`startScan`, `sendHAF11`, `sendIP210`, `udpRecive_*`).

## 3. Transporte de controle

- **TCP, porta 5000.** Confirmado no APK (`IpFindActivity.<init>`: `tcpConPort = 0x1388`) e na `CommLibrary` (`NetCilent..ctor` e `IoSocketProces..ctor` usam `ldc.i4 5000`).
- Conexão: `Socket.connect(new InetSocketAddress(ip, 5000), 5000)`; `setSoTimeout(150000)`.
- Keepalive: o `TcpConn` guarda `heartCommand = ACK()` (tipo 20) e mantém uma thread de heartbeat; também agenda uma tarefa periódica de 3 s e envia `sendGetVersion` (tipo 44) logo após conectar.
- Não há TLS nem autenticação no transporte observado.

## 4. Formato do quadro

O construtor de pacotes é `SendCommand.getDefData(byte[] buffer, int type, int length)`:

```java
buffer[0] = 1;      // 0x01
buffer[1] = 32;     // 0x20
buffer[2] = 3;      // 0x03
buffer[3] = (byte) length;   // tamanho total do quadro
buffer[4] = 0;
buffer[5] = 1;
buffer[6] = 0;
buffer[7] = 1;
buffer[8] = (byte) type;
buffer[length - 1] = Stop_Bit_0;  // 0x40
```

- **Cabeçalho:** `01 20 03 LEN 00 01 00 01 TYPE`.
- **Payload:** começa no índice 9; o último byte é sempre `0x40` (64). O parser só aceita o quadro quando `buffer[3] == tamanho_recebido` e o último byte é 64.
- **Tipo de resposta:** também no índice 8. O `HandleNormalCommand` do APK faz o switch por esse byte.
- **Tamanhos especiais:** o parser trata `type 19` (recall) com `LEN = 0xF5` como `LOAD_DSP_TYPE`, e `type 24` (lista de presets) com `LEN` 0xF7/0xF8/0xF9/0xFA como pacotes de 395/1675/779 bytes.

Pseudo-código do parser (APK, `ReceiveNormalCommand`):

```
se buffer vazio: exige 0x01
se tamanho == 1: exige 0x20
se tamanho == 2: exige 0x03
adiciona byte
se tamanho > 9:
    len = buffer[3] (com ajustes para 19 e 24)
    se len == tamanho e buffer[len-1] == 0x40:
        processa(buffer); limpa
```

## 5. Mapa de comandos

Os IDs vêm de duas fontes que concordam: as propriedades `T2208.DeviceCommuncation.CommandConst` do EXE (valores extraídos da IL dos getters) e os métodos `SendCommand.send*` do APK (constantes inlined pelo JADX). O comprimento é o `length` passado ao `getDefData`.

### 5.1 Comandos do app → mesa

| Tipo | Nome (EXE) | Método APK | Tam. | Conteúdo principal |
|---:|---|---|---:|---|
| 0 | `CMD_RESERVED` | — | — | reservado |
| 1 | `CMD_FatChannel` | `sendAssign`, `sendAssignByPan`, `sendDigInAssign` | 28 | canal, inversão, ganho, mute, delay, ganho digital, 48V, link, pan, main, Aux5–8, solo |
| 2 | `CMD_GATE` | `sendGate` | 17 | canal, threshold, attack, release, on/off |
| 3 | `CMD_COMP_LIMIT` | `sendComp` | 20 | canal, threshold, attack, release, ratio, gain, on/off |
| 4 | `CMD_Equalizer` | `sendEQ` | 19 | canal, banda, tipo, freq, Q, gain, on/off |
| 5 | `CMD_MUTE_GAIN` | `sendGain` | 41 | 30 valores de ganho/mute (um byte por strip) |
| 6 | `CMD_BusMixer` | `sendRout` | 23 | canal, Aux1–4, FX1–2, pre/post de cada um |
| 7 | `CMD_LCDBlackLight` | `sendLcdKnob` | 13 | LCD, knob |
| 8 | `CMD_DC48V` | `sendV48` | 27 | 16 canais de phantom |
| 9 | `CMD_DefaultPreset` | `sendSysDefSetting` | 63 | seleção de presets, cena, solo/PFL, LCD, knob, aux bus, OS mode |
| 10 | `CMD_DFXChannel` | `sendFX` | 25 | unidade FX, página, 12 valores, mute |
| 11 | `CMD_SOLO` | `sendSolo`, `sendDcaSolo` | 41 | 30 flags de solo (ou membros de DCA) |
| 12 | `CMD_allFadergroupSelect` | `sendActiveGroup`, `sendDca` | 16/56 | grupo DCA ativo, ganho, mute |
| 13 | `CMD_allFadergroupGain` | `sendActiveGroupGain` | 16 | ganho/solo do grupo |
| 14 | `CMD_AllAuxPost` | `sendRoutAllPrePost` | 12 | pre/post de todos os Aux |
| 15 | `CMD_PRESET_REMOTE_SAVE_START` | — | — | início de save remoto (EXE) |
| 16 | `CMD_GEQChannel` | `sendGEQ` | 43 | canal GEQ, 31 bandas, bypass |
| 17 | `CMD_BBEFunction` | — | — | BBE (EXE) |
| 18 | `CMD_ReadStatus` | — | — | leitura de status (EXE) |
| 19 | `CMD_ReadCurrentScene` | `sendRecall` | 10 | recall da cena atual |
| 20 | `CMD_AckCommd` | `ACK` | 11 | keepalive |
| 21 | `CMD_ClearSolo` | — | — | limpar solo (EXE) |
| 22 | `CMD_SavePreset` | `sendSavePreName` | 29 | grupo, índice, nome (16 bytes) |
| 23 | `CMD_DeletePreset` | `sendDelPreset` | 12 | grupo, índice |
| 24 | `CMD_ReadPresetList` | `sendPresetList` | 11 | grupo |
| 25 | `CMD_SetChannelName` | `sendChangeChName` | 19 | canal, nome (8 bytes) |
| 26 | `CMD_DigltalOut` | `sendDigOut` | 40 | 28 saídas digitais, post flag |
| 27 | — | — | — | não observado |
| 28 | `CMD_LoadSencePreset` | `sendLoadDevicePreset` | 13 | grupo, índice |
| 29 | `CMD_LoadDSPPreset` | `sendLoadDevicePreset` | 13 | grupo, índice |
| 30 | `CMD_LoadDfxPreset` | `sendLoadDevicePreset` | 13 | grupo, índice |
| 31 | `CMD_LoadGEQPreset` | `sendLoadDevicePreset` | 13 | grupo, índice |
| 32 | `CMD_FlatEQCommand` | `sendFlatEQ` | 11 | flat EQ |
| 33 | `CMD_SyncCommand` | `changePage`, `change*Page` | 15 | sincronização/troca de página |
| 34 | `CMD_ResetCommand` | `sendDefSetting` | 11 | reset/default |
| 35 | `CMD_PCLocalPresetLoad` | `sendLocScenePre`, `sendLocGeqPre`, `sendLocFxPre`, `sendLocalDspPre` | 25/44/77/3939 | presets locais do PC |
| 36 | `CMD_SetDeviceName` | `sendChangeDevName` | 27 | nome do dispositivo |
| 37 | `CMD_ReadDeviceName` | `sendGetDeviceName` | 27 | leitura do nome |
| 38 | `CMD_Copy` | `sendCopy` | 42 | 30 flags de cópia + bitmask |
| 39 | `CMD_ChannelButtonClick` | `sendLink` | 12 | link de canal |
| 40 | `CMD_ReadLimitMeter` | — | — | medidor de limite (EXE) |
| 41 | `CMD_ReadMeter` | — | — | medidores (EXE) |
| 42 | `CMD_GroupSet` | `sendDca` | 56 | confirma grupo DCA |
| 43 | `CMD_bGroupSet` | `sendDca` | 56 | grupo DCA temporário |
| 44 | `CMD_ReadVersionCmd` | `sendGetVersion` | 16 | leitura de versão |
| 45 | `CMD_ChangeSceneCmd` | — | — | troca de cena (EXE) |
| 47 | `CMD_MemoryExport` | — | — | exportação de memória (EXE) |
| 48 | `CMD_MemoryExportAck` | — | — | ack de exportação |
| 49 | `CMD_MemoryImport` | — | — | importação de memória |
| 51 | `CMD_LoadlocalFinish` | — | — | fim de carga local |
| 52 | `CMD_ReadeSysGUIindex` | `sendSysGUI` | 10 | índice de GUI do sistema |
| 55 | `CMD_AutoMixAssign` | `sendAutoMix` | 30 | 18 canais AutoMix + ativo |

### 5.2 Respostas da mesa → app

O `HandleNormalCommand` do APK trata os tipos abaixo. Os nomes entre parênteses são os usados pelo EXE.

| Tipo | Significado |
|---:|---|
| 1 | Assign / FatChannel |
| 2 | Gate |
| 3 | Compressor/limiter |
| 4 | PEQ |
| 5 | Ganho/mute dos canais |
| 6 | Mixer / bus |
| 7 | LCD/knob |
| 8 | 48V |
| 9 | Configuração padrão do sistema |
| 10 | FX |
| 11 | Solo |
| 12 | Grupo ativo |
| 13 | Ganho do grupo ativo |
| 14 | Pre/post de todos os Aux |
| 16 | GEQ |
| 19 | Recall |
| 20 | Tipo digital (o mesmo ID é usado como keepalive no sentido app → mesa) |
| 22 | Save preset |
| 23 | Delete preset |
| 24 | Lista de presets |
| 25 | Nome de canal |
| 26 | Saída digital |
| 28 | Load scene |
| 33 | Troca de página |
| 37 | Nome do dispositivo |
| 38 | Copy |
| 40 | Medidor de compressor |
| 41 | Medidores |
| 42 | Confirmação de grupo DCA |
| 43 | Grupo DCA temporário |
| 44 | Versão |
| 51 | Load local concluído |
| 55 | AutoMix |

## 6. Modelo de canais, buses e DCA

O modelo do EXE (`T2208.MyDatas.ChannelData`) é explícito e bate com os laços do APK:

| Bloco | Quantidade | Observação |
|---|---:|---|
| CH01–CH16 | 16 | mono, com 48V |
| CH17_18, CH19_20 | 2 pares | estéreo |
| USB | 1 | estéreo |
| Aux01–Aux08 | 8 | buses auxiliares |
| FX01–FX02 | 2 | retornos de efeito |
| Main | 1 | saída principal |
| **Total de strips** | **30** | 16 + 2 + 1 + 8 + 2 + 1 |

- **Canais de entrada:** 20 (CH01–CH20, sendo 17–20 dois pares estéreo). O `sendGain` percorre 30 strips, não 30 canais de entrada.
- **Aux:** 8. O comando tipo 6 (`sendRout`) carrega apenas Aux1–4 + FX1–2; Aux5–8 viajam no comando tipo 1 (`sendAssign`), nos bytes 21–24.
- **DCA:** 6 grupos (`StaticData.DCA_GROUP` = DCA1…DCA6). Cada grupo pode receber 29 strips (todos menos Main), confirmado pelo laço de 29 posições no `sendDca`.
- **48V:** apenas os 16 primeiros canais (`sendV48` percorre 16).
- **Presets/cenas:** o app carrega 4 listas antes de entrar na tela principal (`preCount == 4`); o significado exato de cada grupo ainda não foi confirmado.

## 7. Inventário funcional

### 7.1 APK (fragments)

`Assign`, `AutoMix`, `Channel`, `Comp`, `Copy`, `DCAConfirm`, `Digital`, `FX`, `GEQ`, `Gate`, `LongFader`, `Meter`, `PEQ`, `Preset`, `Routing`, `System`, `V48`, além dos diálogos `Show48Alert`, `ShowDcaAlert`, `ShowDefSetAlert`, `ShowDelPreAlert`, `ShowLoadAlert`, `ShowRestoreScen`, `ShowSavePreset`, `ShowVerLock`.

### 7.2 EXE (view models)

Além dos mesmos módulos: `Page_Ducker`, `Page_FBC` (feedback suppression), `SaveLoadCopy` com presets de PC (salvar/carregar/apagar), exportação/importação de memória, `Digital` com mapeamento de canais, `Route` com pre/post, `System` com reset, página inicial, versão e nome do dispositivo.

**Conclusão:** Ducker e FBC existem no aplicativo Windows e **não** têm fragment correspondente no APK 1.1.0. Trate-os como recursos "Windows-only / não verificados no T2208" até testar no hardware.

## 8. Estrutura do EXE

- O EXE é um único assembly gerenciado com as dependências embutidas por Costura.Fody; a `CommLibrary` é a camada de rede (TCP 5000, UDP 48899/8000, scan, serial).
- `T2208.DeviceCommuncation.CommandConst` concentra os IDs; `UpStreamCommand` monta os pacotes; `DownStream` e `ConnectionModel` cuidam do socket e do timer de alta frequência.
- `FFT` é usada nos medidores/RTA; `System.Data.SQLite` guarda presets locais do PC.
- Não há need de instalar o EXE para o painel: o protocolo relevante está no APK e na `CommLibrary`, ambos legíveis estaticamente.

## 9. O que continua não verificado

1. **Semântica de vários bytes.** Os nomes dos campos vêm dos modelos (`gain`, `panID`, `delayValue`, `mixAux5PrePost` etc.), mas as tabelas de codificação (ganho em dB, pan, delay) não foram extraídas por completo.
2. **Handshake e versão.** O app envia `sendGetVersion` (44) e espera a resposta 44; o comportamento de bloqueio por versão (`ShowVerLockFragment`) não foi reproduzido.
3. **ACK por comando.** O keepalive tipo 20 é claro; não se confirmou se cada comando tem ACK individual ou se o próximo estado é a confirmação.
4. **Diferenças de modelo/firmware.** O APK declara firmware V1.1; o EXE é 1.0.7.0. Não se sabe se o T2208 do usuário aceita todos os comandos.
5. **Contagem de presets/cenas e grupos.** O app carrega 4 listas; o número de slots por grupo não foi confirmado.
6. **Cartão digital / IGMP.** As mensagens de `Dio-24` e IGMP continuam sem relação estabelecida com o hardware do usuário.
7. **Comportamento em rede real.** Broadcast, firewall, múltiplas interfaces e resposta do módulo HF-A11/IP120 precisam de teste físico.

## 10. Impacto no painel web

O que muda em relação ao spec aprovado:

- **A ponte local deixa de ser especulativa.** Já se sabe como descobrir (UDP 48899/5005→8000), conectar (TCP 5000) e enquadrar (`01 20 03 LEN 00 01 00 01 TYPE … 40`). O que falta é validar no hardware, não redescobrir o protocolo.
- **O perfil de demonstração estava errado.** O painel deve modelar 20 canais de entrada (16 mono + 2 pares estéreo), USB, 8 Aux, 2 FX, Main e 6 DCA — 30 strips no total, não 30 canais de entrada.
- **Ducker/FBC** entram como módulos opcionais marcados como não verificados; não fazem parte do conjunto confirmado do APK.
- **A Fase 1 continua DEMO.** A implementação real deve esperar a mesa; a ponte pode ser escrita contra este mapa, mas só é considerada pronta após teste com o equipamento.

## 11. Como esta análise foi produzida

Comandos REA usados (todos somente leitura):

```bash
rea inspect-android-package <apk> --format json --full-output
rea search-android-classes <apk> '' --format json --full-output
rea inspect-android-class <apk> com.sekaku.yingshenwen.t2208.util.SendCommand
rea inspect-android-method <apk> com.sekaku.yingshenwen.t2208.util.SendCommand sendGain
rea inspect-android-method <apk> com.sekaku.yingshenwen.t2208.IpFindActivity HandleNormalCommand
rea inspect-managed-artifact <exe> --format json --full-output
rea inspect-managed-members <exe> --format json --full-output
```

Os IDs de `CommandConst` foram lidos da IL dos getters (`ldc.i4` + `ret`); os comprimentos e layouts vieram do código Java decompilado dos métodos `send*`. As DLLs Costura foram extraídas por leitura do blob de recursos e inflate (deflate), sem executar o EXE.
