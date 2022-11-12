import * as crypto from './features/crypto-primitives';
export * from './features/address';
export * from './features/key-derivation';
export * from './features/signing';
export * from './features/paper-wallets';

import _base58 from './utils/base58';
import * as _bech32 from './utils/bech32';
import _scrypt from './utils/scrypt-async';

export const base58 = _base58;
export const bech32 = _bech32;
export const scrypt = _scrypt;

export const blake2b = crypto.blake2b;
export const cardanoMemoryCombine = crypto.cardanoMemoryCombine;
export const _sha3_256 = crypto.sha3_256;
export const _chacha20poly1305Decrypt = crypto.chacha20poly1305Decrypt;
export const _chacha20poly1305Encrypt = crypto.chacha20poly1305Encrypt;
