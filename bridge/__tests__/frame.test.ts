import { describe, expect, it } from 'vitest';
import {
  FRAME_STOP,
  FrameParser,
  decodeFrame,
  encodeFrame,
} from '../protocol/frame';
import {
  COMMAND_LENGTHS,
  CommandType,
  asciiPayload,
  getVersionFrame,
  parseAscii,
} from '../protocol/commands';

describe('T2208 frame codec', () => {
  it('encodes the documented header, length and stop byte', () => {
    const frame = encodeFrame(CommandType.ReadVersion, Buffer.alloc(6), 16);

    expect(frame.length).toBe(16);
    expect([...frame.subarray(0, 9)]).toEqual([0x01, 0x20, 0x03, 16, 0x00, 0x01, 0x00, 0x01, 44]);
    expect(frame[frame.length - 1]).toBe(FRAME_STOP);

    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(44);
    expect(decoded.payload.length).toBe(6);
  });

  it('uses the recovered command lengths for probes', () => {
    expect(getVersionFrame().length).toBe(COMMAND_LENGTHS[CommandType.ReadVersion]);
    expect(getVersionFrame()[8]).toBe(CommandType.ReadVersion);
  });

  it('parses frames split across chunks and ignores noise', () => {
    const frame = encodeFrame(CommandType.Ack, Buffer.from([0]), 11);
    const parser = new FrameParser();

    expect(parser.push(Buffer.from([0xff, 0x00]))).toEqual([]);
    expect(parser.push(frame.subarray(0, 5))).toEqual([]);
    const frames = parser.push(Buffer.concat([frame.subarray(5), frame]));

    expect(frames).toHaveLength(2);
    expect(frames.every((item) => item.type === CommandType.Ack)).toBe(true);
  });

  it('drops a candidate with a bad stop byte', () => {
    const frame = encodeFrame(CommandType.Ack, Buffer.from([0]), 11);
    frame[frame.length - 1] = 0x00;
    const parser = new FrameParser();

    expect(parser.push(frame)).toEqual([]);
  });

  it('round-trips ASCII payloads', () => {
    const payload = asciiPayload('V1.1', 6);
    expect(parseAscii(payload)).toBe('V1.1');
  });
});
