export const FRAME_START = Buffer.from([0x01, 0x20, 0x03]);
export const FRAME_STOP = 0x40;
export const MIN_FRAME_LENGTH = 10;
export const MAX_FRAME_LENGTH = 255;

export interface T2208Frame {
  type: number;
  payload: Buffer;
  raw: Buffer;
}

/**
 * Builds the frame documented by the APK and the Windows EXE:
 * 01 20 03 LEN 00 01 00 01 TYPE payload... 40
 *
 * `expectedLength` pads the payload with zeros so probes match the lengths
 * recovered from the APK's SendCommand methods. The hardware payload
 * semantics remain unverified.
 */
export function encodeFrame(
  type: number,
  payload: Uint8Array = new Uint8Array(),
  expectedLength?: number,
): Buffer {
  if (!Number.isInteger(type) || type < 0 || type > 255) {
    throw new RangeError(`Invalid command type: ${type}`);
  }

  const minimum = MIN_FRAME_LENGTH + payload.length;
  const total = expectedLength ?? minimum;

  if (total < minimum) {
    throw new RangeError(`Expected length ${total} is smaller than payload frame ${minimum}`);
  }
  if (total > MAX_FRAME_LENGTH) {
    throw new RangeError(`Frame length ${total} exceeds ${MAX_FRAME_LENGTH}`);
  }

  const buffer = Buffer.alloc(total, 0);
  buffer[0] = 0x01;
  buffer[1] = 0x20;
  buffer[2] = 0x03;
  buffer[3] = total;
  buffer[4] = 0x00;
  buffer[5] = 0x01;
  buffer[6] = 0x00;
  buffer[7] = 0x01;
  buffer[8] = type;
  buffer.set(payload, 9);
  buffer[total - 1] = FRAME_STOP;

  return buffer;
}

export function decodeFrame(raw: Buffer): T2208Frame {
  if (raw.length < MIN_FRAME_LENGTH) {
    throw new Error(`Frame too short: ${raw.length}`);
  }
  if (raw[0] !== 0x01 || raw[1] !== 0x20 || raw[2] !== 0x03) {
    throw new Error('Invalid T2208 frame header');
  }
  if (raw[3] !== raw.length) {
    throw new Error(`Frame length mismatch: header=${raw[3]} actual=${raw.length}`);
  }
  if (raw[raw.length - 1] !== FRAME_STOP) {
    throw new Error('Missing T2208 stop byte');
  }

  return {
    type: raw[8],
    payload: raw.subarray(9, raw.length - 1),
    raw,
  };
}

/**
 * Incremental parser for a TCP stream. It tolerates noise before a frame and
 * drops malformed candidates instead of killing the connection.
 */
export class FrameParser {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): T2208Frame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames: T2208Frame[] = [];

    while (this.buffer.length >= 4) {
      const start = this.buffer.indexOf(FRAME_START);
      if (start < 0) {
        // Keep the last two bytes: a frame may start in the next chunk.
        this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - 2));
        break;
      }
      if (start > 0) {
        this.buffer = this.buffer.subarray(start);
      }
      if (this.buffer.length < 4) break;

      const length = this.buffer[3];
      if (length < MIN_FRAME_LENGTH) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }
      if (this.buffer.length < length) break;

      const candidate = this.buffer.subarray(0, length);
      if (candidate[length - 1] !== FRAME_STOP) {
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      try {
        frames.push(decodeFrame(candidate));
        this.buffer = this.buffer.subarray(length);
      } catch {
        this.buffer = this.buffer.subarray(1);
      }
    }

    return frames;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
