import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';

describe('public request QR asset', () => {
  it('encodes the deployed public request URL with a high-recovery quiet zone', async () => {
    const target = 'https://sajeevanveeriah.github.io/saj-service-desk/request/';
    const expected = await QRCode.toBuffer(target, {
      type: 'png',
      errorCorrectionLevel: 'H',
      width: 512,
      margin: 4,
      color: { dark: '#102330FF', light: '#FFFFFFFF' },
    });
    const actual = await readFile(resolve(process.cwd(), 'public/20260909-Saj-Service-Desk-Request-QR-Rev00.png'));
    expect(actual.equals(expected)).toBe(true);
  });
});
