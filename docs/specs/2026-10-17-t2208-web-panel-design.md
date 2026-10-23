# T2208 Web Control Panel — Design Spec

- **Status:** Written spec approved by the user on 2026-10-23; implementation plan in progress.
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

REA statically inspected the Android APK `com.sekaku.yingshenwen.t2208`, version 1.1.0 (version code 12; min SDK 19; target SDK 34), and decoded its manifest and resources. Its strings and class names identify mixer/channel-strip, DCA/assignment, PEQ, GEQ, gate, compressor, FX, metering/RTA, routing/output matrix, digital I/O, AutoMix, presets/scenes, 48V, and system controls. The APK declares control for firmware V1.1. The Android code contains UDP discovery and TCP control paths; these are static observations, not proof of live protocol behavior.

The inspected gain packet builder iterates over 30 entries. The channel model includes Aux 1–8 and FX1/FX2 sends, while the shared data model exposes six DCA gain/mute groups; the resource table contains DCA labels through DCA12. Exact channel, DCA, bus, and digital-card counts therefore remain hardware/model validation items, not unconditional UI assumptions.

Decoded resources also expose channel mapping, fader-name editing, shortcut assignment, brightness, IP connection configuration, and an optional digital-card notice. These controls belong in the completeness checklist where the APK confirms their behavior. A `Dio-24` support notice appears in the resource strings, but its relationship to the user's T2208 hardware is not established.

The Windows EXE is a 32-bit .NET/WPF application, assembly T2208 version 1.0.7.0. REA could not inspect its methods because its managed metadata representation exceeded the provider's 64 MiB limit. The Android APK is the detailed functional reference for this first design. Matching Windows-only behavior remains unknown.

## 4. Phase 1 scope — simulated front end

### Main views

1. **Mixer:** channel banks, fader/gain, mute, solo, pan, polarity, meters, main output, and channel selection.
2. **Channel processing:** PEQ/HPF/LPF, GEQ, gate, compressor/limiter, delay, and FX parameters.
3. **DCA and Assign:** group assignment, link, channel assignment, and group controls.
4. **Routing / Digital I/O:** Aux and FX sends, pre/post selection, Main L/R routing, output matrix, digital input/output.
5. **Meters / RTA:** channel and output meters, FFT/RTA presentation, gate/compressor activity.
6. **AutoMix:** active state, per-channel participation, and clear/reset flow.
7. **Presets / Scenes:** list, select, save, load, copy, delete, and scene recall flows.
8. **System:** device name/ID, firmware/app compatibility, language, default-page settings, brightness, fader/channel naming, shortcut assignment, and system controls surfaced by the app.
9. **Connection screen:** clearly simulated discovery/list/connect/disconnect states and IP configuration; no real scan or socket activity in Phase 1.

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

In the future integration phase, a local bridge on the same network will own device discovery, firmware checks, TCP/UDP framing, retries, and connection health. The browser UI will exchange typed requests and state updates with that bridge over a local HTTP/WebSocket interface. The APK contains IGMP/Dio-24 support warnings; whether T2208 discovery depends on multicast or on an optional card is unknown. Keep discovery replaceable and validate it on the actual network, with manual IP configuration as a fallback if supported. Exact transport, message schema, and protocol behavior are deferred until a physical T2208 is available. No public internet exposure is planned.

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

- Exact hardware model, channel count, DCA count, optional digital card, firmware version, and available ports.
- Whether the Windows EXE exposes behavior absent from the APK.
- Device discovery details, TCP/UDP ports, framing, reconnect/heartbeat semantics, and state-read coverage.
- Whether the IGMP/Dio-24 notices apply to the T2208 model itself, and whether its discovery path requires multicast.
- Authentication/pairing requirements for devices on the local network.

## 10. Approval state

The user approved the direction, responsive priority, module grouping, local-bridge approach, safety model, and written spec on 2026-10-23. The implementation plan is now being prepared; no product code has been created.
