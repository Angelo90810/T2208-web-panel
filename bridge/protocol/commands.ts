import { encodeFrame } from './frame';

/**
 * Command IDs recovered from the APK's SendCommand methods and the Windows
 * EXE's CommandConst. Keep this table in sync with
 * docs/research/2026-11-09-t2208-protocol-analysis.md.
 */
export const CommandType = {
  FatChannel: 1,
  Gate: 2,
  CompLimit: 3,
  Equalizer: 4,
  MuteGain: 5,
  BusMixer: 6,
  LcdBacklight: 7,
  Phantom48v: 8,
  DefaultPreset: 9,
  DfxChannel: 10,
  Solo: 11,
  FaderGroupSelect: 12,
  FaderGroupGain: 13,
  AllAuxPost: 14,
  PresetRemoteSaveStart: 15,
  GeqChannel: 16,
  BbeFunction: 17,
  ReadStatus: 18,
  ReadCurrentScene: 19,
  Ack: 20,
  ClearSolo: 21,
  SavePreset: 22,
  DeletePreset: 23,
  ReadPresetList: 24,
  SetChannelName: 25,
  DigitalOut: 26,
  LoadScenePreset: 28,
  LoadDspPreset: 29,
  LoadDfxPreset: 30,
  LoadGeqPreset: 31,
  FlatEq: 32,
  Sync: 33,
  Reset: 34,
  PcLocalPresetLoad: 35,
  SetDeviceName: 36,
  ReadDeviceName: 37,
  Copy: 38,
  ChannelButtonClick: 39,
  ReadLimitMeter: 40,
  ReadMeter: 41,
  GroupSet: 42,
  BGroupSet: 43,
  ReadVersion: 44,
  ChangeScene: 45,
  MemoryExport: 47,
  MemoryExportAck: 48,
  MemoryImport: 49,
  LoadLocalFinish: 51,
  ReadSysGuiIndex: 52,
  AutoMixAssign: 55,
} as const;

/** Total frame length recovered from each send* method, when observed. */
export const COMMAND_LENGTHS: Partial<Record<number, number>> = {
  1: 28,
  2: 17,
  3: 20,
  4: 19,
  5: 41,
  6: 23,
  7: 13,
  8: 27,
  9: 63,
  10: 25,
  11: 41,
  12: 16,
  13: 16,
  14: 12,
  16: 43,
  19: 10,
  20: 11,
  22: 29,
  23: 12,
  24: 11,
  25: 19,
  26: 40,
  28: 13,
  29: 13,
  30: 13,
  31: 13,
  32: 11,
  33: 15,
  34: 11,
  36: 27,
  37: 27,
  38: 42,
  39: 12,
  42: 56,
  43: 56,
  44: 16,
  52: 10,
  55: 30,
};

export function encodeCommand(
  type: number,
  payload: Uint8Array = new Uint8Array(),
  expectedLength?: number,
): Buffer {
  return encodeFrame(type, payload, expectedLength ?? COMMAND_LENGTHS[type]);
}

export function ackFrame(): Buffer {
  return encodeCommand(CommandType.Ack, Buffer.alloc(1), COMMAND_LENGTHS[CommandType.Ack]);
}

export function getVersionFrame(): Buffer {
  return encodeCommand(CommandType.ReadVersion, Buffer.alloc(6), COMMAND_LENGTHS[CommandType.ReadVersion]);
}

export function readDeviceNameFrame(): Buffer {
  return encodeCommand(
    CommandType.ReadDeviceName,
    Buffer.alloc(17),
    COMMAND_LENGTHS[CommandType.ReadDeviceName],
  );
}

export function readPresetListFrame(group = 0): Buffer {
  return encodeCommand(
    CommandType.ReadPresetList,
    Buffer.from([group & 0xff]),
    COMMAND_LENGTHS[CommandType.ReadPresetList],
  );
}

export function readStatusFrame(): Buffer {
  return encodeCommand(CommandType.ReadStatus, Buffer.alloc(1));
}

export function asciiPayload(value: string, length: number): Buffer {
  const buffer = Buffer.alloc(length, 0);
  buffer.write(value.slice(0, length), 0, 'ascii');
  return buffer;
}

export function parseAscii(payload: Uint8Array): string {
  return Buffer.from(payload)
    .toString('ascii')
    .replace(/\0/g, '')
    .trim();
}
