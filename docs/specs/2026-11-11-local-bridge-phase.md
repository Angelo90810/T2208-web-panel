# T2208 Local Bridge — Phase 2 Spec

- **Status:** implemented on 2026-11-11 without physical hardware; hardware validation pending.
- **Project:** `C:\Users\Angelo\Projects\T2208-web-panel`
- **Depends on:** `docs/research/2026-11-09-t2208-protocol-analysis.md` and `docs/specs/2026-10-17-t2208-web-panel-design.md`.
- **Scope:** everything that can be built and tested without the mixer: protocol codec, discovery, TCP client, local bridge, simulator, browser adapter and mode switch.

## 1. Why

The Phase 1 panel is a DEMO. The mixer lives at the church, so the next useful step is the local bridge and the whole transport path, tested against a simulator. Control payloads cannot be considered validated until the physical T2208 is available.

## 2. Architecture

```
Browser SPA (React)
  ├─ DemoAdapter (localStorage, default)
  └─ BridgeAdapter (WebSocket/HTTP)
          │
          ▼
Local bridge (Node/TypeScript)
  ├─ BridgeEngine (snapshot + status)
  ├─ TcpDeviceClient (TCP 5000, safe probes)
  ├─ discovery (UDP 48899 / 5005→8000)
  └─ T2208Simulator (tests and demo mode)
```

- The bridge owns the device socket; the browser never opens UDP/TCP directly.
- The bridge exposes `GET /health`, `GET /status`, `GET /state`, `POST /discover`, `POST /connect`, `POST /disconnect`, `POST /action`, and `WS /ws`.
- `BridgeAdapter` implements the same `MixerAdapter` as `DemoAdapter`; views do not know which one is active.
- Mode is selected by `?bridge=<ws-url>` or the `t2208-bridge-url` localStorage key; without it the panel stays in DEMO.

## 3. Protocol implementation

- Frame: `01 20 03 LEN 00 01 00 01 TYPE payload… 40`; `LEN` is the total frame length.
- Parser tolerates split chunks and noise; rejects bad stop bytes.
- Command IDs and expected lengths follow the recovered map (types 1–55).
- Safe probes only: version (44), device name (37), preset list (24) and keepalive (20).
- Discovery sends `HF-A11ASSISTHREAD` to UDP 48899 and the 12-byte IP120/IP210 probe to UDP 8000 from local port 5005.
- Control writes are intentionally **not implemented** until payload encodings, ACKs and firmware behavior are validated.

## 4. Safety and truthfulness

- Bridge defaults to **dry-run**; the banner says `PONTE LOCAL — mesa não validada`.
- `--allow-real-writes` is reserved and ignored until control writes exist.
- A bridge connection is never presented as a validated mixer connection; the status pill says "Ponte conectada", not "Mesa conectada".
- The bridge binds to `127.0.0.1` by default; `0.0.0.0` is opt-in for a trusted LAN.
- No credentials, TLS or public exposure are introduced.

## 5. Acceptance

- `npm run typecheck` and `npm run typecheck:bridge` pass.
- `npm run test:run` passes: existing 18 tests + 9 bridge tests.
- `npm run build` succeeds.
- `npm run bridge:sim` starts TCP 5000 + UDP 48899/8000; `/health` reports `bridge-connected`, version `V1.1`, name `T2208-SIM`.
- `POST /discover` finds the simulator through both UDP paths.
- The SPA opened with `?bridge=ws://127.0.0.1:8787/ws` shows the bridge banner, version, name, dry-run, and a fader change reaches the bridge snapshot.

## 6. Pending hardware validation

1. Confirm the real device accepts the frame header/length/stop byte and responds to version/name probes.
2. Capture the real version response and the firmware lock behavior.
3. Validate per-command ACKs and payload encodings (gain, pan, EQ, delay, 48V, routing, presets).
4. Validate UDP discovery on the church network (broadcast, firewall, multiple interfaces).
5. Only then implement and enable control writes; add an explicit hardware-validation checklist.
