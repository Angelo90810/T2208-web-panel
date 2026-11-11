# T2208 Web Control Panel — Design Spec

- **Status:** Written spec approved on 2026-10-23; protocol re-analysis completed on 2026-11-09 (see `docs/research/2026-11-09-t2208-protocol-analysis.md`).
- **Date:** 2026-10-17
- **Project path:** `C:\Users\Angelo\Projects\T2208-web-panel`
- **Target:** T2208 digital mixer/controller represented by the supplied Android APK and Windows EXE.

## 1. Purpose

Create a responsive browser-based control panel that covers the functions exposed by the T2208 app. The first deliverable is an interactive **DEMO** front end because no physical mixer is available. Real control is a later phase and must use a local bridge after the device protocol and firmware compatibility are validated.

## 2. User intent and constraints

- The panel should provide the complete function set, not only a live-fader mockup.
- Desktop, tablet, and phone have equal importance. Layouts may differ, but feature coverage must not.
- Future hardware control should be local to the same network as the T2208; public cloud control is out of scope.
- The Android APK and Windows EXE are reference artifacts only. Neither artifact is to be modified, installed, or executed as part of this project.
- The panel must not claim a device is connected when it is only simulating state.

## 3. Evidence and uncertainties

REA statically inspected the Android APK `com.sekaku.yingshenwen.t2208`, version 1.1.0 (version code 12; min SDK 19; target SDK 34), and decoded its manifest and resources. Its strings and class names identify mixer/channel-strip, DCA/assignment, PEQ, GEQ, gate, compressor, FX, metering/RTA, routing/output matrix, digital I/O, AutoMix, presets/scenes, 48V, and system controls. The APK declares control for firmware V1.1.

The 2026-11-09 re-analysis confirmed the transport and the control model statically:

- Discovery uses UDP broadcast on port 48899 with the HF-A11 token `HF-A11ASSISTHREAD`, and on local port 5005 sending to 8000 with a 12-byte IP120/IP210 probe.
- Control uses TCP port 5000.
- Frames are `01 20 03 LEN 00 01 00 01 TYPE payload… 40`, where `LEN` is the total frame length and the type is at index 8.
- The command map (types 1–55) and the packet lengths were recovered from the APK's `SendCommand` methods and independently from the Windows EXE's `CommandConst` IL.

The channel model is now explicit: 16 mono inputs (CH01–CH16), two stereo pairs (CH17/18, CH19/20), one USB stereo strip, eight Aux buses, two FX returns, and Main — 30 strips total, with 20 input channels. DCA has six groups, each assignable to 29 strips (all except Main). Phantom power exists on the first 16 channels. The earlier reading of “30 channels” meant 30 mixer strips, not 30 input channels.

Decoded resources also expose channel mapping, fader-name editing, shortcut assignment, brightness, IP connection configuration, and an optional digital-card notice. These controls belong in the completeness checklist where the APK confirms their behavior. A `Dio-24` support notice appears in the resource strings, but its relationship to the user's T2208 hardware is not established.

The Windows EXE is a 32-bit .NET/WPF application, assembly T2208 version 1.0.7.0, with Costura-embedded libraries including `CommLibrary 2.1.3.5`, `FFT`, and `System.Data.SQLite`. Its view models expose Ducker and FBC (feedback suppression), PC preset save/load/delete, and memory export/import that have no matching fragment in the Android 1.1.0 APK. Treat those as Windows-only/unverified for the user's T2208 until hardware testing.

## 4. Phase 1 scope — simulated front end

### Main views

1. **Mixer:** channel banks over 30 strips (20 input channels including two stereo pairs, USB, 8 Aux, 2 FX, Main), fader/gain, mute, solo, pan, polarity, meters, main output, and channel selection.
2. **Channel processing:** PEQ/HPF/LPF, GEQ, gate, compressor/limiter, delay, and FX parameters.
3. **DCA and Assign:** group assignment, link, channel assignment, and group controls.
4. **Routing / Digital I/O:** Aux and FX sends, pre/post selection, Main L/R routing, output matrix, digital input/output.
5. **Meters / RTA:** channel and output meters, FFT/RTA presentation, gate/compressor activity.
6. **AutoMix:** active state, per-channel participation, and clear/reset flow.
7. **Presets / Scenes:** list, select, save, load, copy, delete, and scene recall flows; distinguish device presets from browser-local demo entries.
8. **System:** device name/ID, firmware/app compatibility, language, default-page settings, brightness, fader/channel naming, shortcut assignment, memory export/import placeholders, and system controls surfaced by the app.
9. **Connection screen:** clearly simulated discovery/list/connect/disconnect states and IP configuration; no real scan or socket activity in Phase 1.

Optional, marked unverified: **Ducker** and **FBC**, present in the Windows EXE but not in the Android 1.1.0 APK. They may be shown as disabled/experimental modules, never as confirmed T2208 features.

The default UI language is Brazilian Portuguese. The exact number of controls and labels must remain configurable until the physical model is verified.

### Demo behavior

- A persistent **DEMO — no mixer connected** indicator is visible on every view.
- A seeded sample mixer state powers the interactions. Fader, mute/solo, EQ, routing, and other controls update only simulated state.
- Save/load/copy/delete in the DEMO preset library may persist to that browser's local storage; it does not write to the supplied APK/EXE or the mixer.
- The UI never sends UDP/TCP, HTTP commands, or queued actions to the T2208 while in DEMO.

## 5. Responsive interaction model

- **Desktop:** multi-channel console with channel banks, visible meters/faders, selected-channel processing, and persistent view navigation.
- **Tablet:** touch-sized controls and banked channel strips; processing remains reachable without leaving the selected channel context.
- **Phone:** one-channel-focused mixer view with fast channel selection and quick controls; all processing, routing, presets, AutoMix, and system functions remain accessible through dedicated views.
- Responsive layouts preserve feature coverage, rather than scaling the desktop console until controls become unusable.

## 6. Architecture and future integration

The SPA talks to one small typed mixer interface (the design seam). Phase 1 supplies a `DemoAdapter`; a later `LocalBridgeAdapter` can satisfy the same interface. Views do not construct device packets and do not depend on the Android app's TCP/UDP implementation.

In the future integration phase, a local bridge on the same network will own device discovery, firmware checks, TCP framing, retries, and connection health. The protocol is now concrete enough to implement: UDP discovery on 48899 (HF-A11) and 5005→8000 (IP120/IP210), then TCP 5000 with the frame `01 20 03 LEN 00 01 00 01 TYPE … 40`. The bridge should send the version query (type 44) and keepalive (type 20), and treat the protocol map in `docs/research/2026-11-09-t2208-protocol-analysis.md` as the starting contract. Payload encodings and per-command acknowledgements still need hardware validation. The browser UI will exchange typed requests and state updates with the bridge over a local HTTP/WebSocket interface; manual IP configuration should remain available as a fallback. No public internet exposure is planned.

## 7. Safety and failure behavior

- **48V phantom power:** require a deliberate confirmation identifying the selected channel and showing the app's warning about damaging equipment that does not need phantom power. In DEMO, this changes only simulated state.
- Factory/default reset, deleting presets, and scene recall receive explicit confirmation where appropriate.
- Show distinct `DEMO`, `disconnected`, `connecting`, `connected`, `bridge unavailable`, and `firmware/model mismatch` states. Phase 1 may simulate these states but must label them as simulated.
- A disconnect must not leave commands queued for silent delivery later. The UI must distinguish “changed locally in demo” from “applied to hardware”.
- A future bridge must be local-network-only unless a separate security design is approved.

## 8. Validation and acceptance criteria

Phase 1 is acceptable when:

1. Every functional area in §4 has an accessible, interactive DEMO view.
2. DEMO interactions update visible simulated state and never report a real connection or applied hardware command.
3. Preset/scene save, load, copy, and delete flows work in the simulated library.
4. The 48V and destructive-action confirmation flows are present.
5. Desktop, tablet, and phone layouts preserve access to the same feature set and are verified at representative viewport sizes.
6. Adapter/state behavior is tested independently of view components; UI tests verify critical control flows and DEMO indicators.
7. There is no device integration, network scanning, firmware write, or real mixer command in Phase 1.

Real-control acceptance is separate and requires a physical T2208, matching firmware, verified protocol behavior, and tests through the local bridge. That phase does not begin from this spec alone.

## 9. Open questions for later hardware validation

- Exact hardware model, optional digital card, firmware version, and whether all commands in the recovered map are accepted.
- Payload encodings (gain in dB, pan, delay, EQ frequency/Q/gain tables), per-command acknowledgements, and the version-lock handshake.
- Whether the Windows-only Ducker/FBC and memory export/import features exist on the T2208 itself.
- Whether discovery works on the user's network (broadcast/firewall/multiple interfaces) and whether the HF-A11 or IP120/IP210 path applies.
- Whether the IGMP/Dio-24 notices apply to the T2208 model itself, and whether its discovery path requires multicast.
- Authentication/pairing requirements for devices on the local network.

## 10. Approval state

The user approved the direction, responsive priority, module grouping, local-bridge approach, safety model, and written spec on 2026-10-23.

Phase 1 (DEMO) was implemented on 2026-11-09 in commits `bc0a885` (`feat: build responsive T2208 demo panel`) and `b5e51fd` (`feat: add limiter, memory placeholders and tablet layout`). The app covers all nine functional areas above, keeps the DEMO banner on every view, persists presets/scenes only in browser storage, and passes 18 automated tests plus `tsc --noEmit` and a production build. Desktop (1440×900), tablet (1024×768) and phone (390×844) layouts were exercised in a real browser.

Real hardware control, discovery, and the local bridge remain pending; they require a physical T2208 and firmware/protocol validation, as described in §6 and §9.

The local-bridge phase was implemented on 2026-11-09 without hardware: frame codec, command map, UDP discovery, TCP 5000 client, HTTP/WebSocket bridge, T2208 simulator, browser `BridgeAdapter`, and a dry-run mode switch. Safe probes (version, device name, keepalive) run against the simulator; control writes remain disabled until payloads are validated on the physical mixer. See `docs/specs/2026-11-09-local-bridge-phase.md`.
