import { bech32 } from 'bech32';
import { validateString, validateBuffer } from './validation';

export function encode(prefix: string, data: Buffer) {
  validateString(prefix);
  validateBuffer(data);

  const words = bech32.toWords(data);
  // we need longer than default length for privkeys and 1000 should suffice
  return bech32.encode(prefix, words, 1000);
}

export function decode(str: string) {
  validateString(str);

  const tmp = bech32.decode(str, 1000);
  return {
    prefix: tmp.prefix,
    data: Buffer.from(bech32.fromWords(tmp.words)),
  };
}
