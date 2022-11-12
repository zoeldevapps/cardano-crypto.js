import * as cbor from 'cbor';
import { chacha20poly1305Encrypt, chacha20poly1305Decrypt, blake2b, sha3_256 } from './crypto-primitives';
import crc32 from '../utils/crc32';
import base58 from '../utils/base58';
import * as bech32 from '../utils/bech32';
import pbkdf2 from '../utils/pbkdf2';
import variableLengthEncode from '../utils/variableLengthEncode';
import CborIndefiniteLengthArray from '../utils/CborIndefiniteLengthArray';
import {
  validateBuffer,
  validateDerivationScheme,
  validateArray,
  validateString,
  validateNetworkId,
  validateUint32,
} from '../utils/validation';

export type BIP32Path = number[];

type AddressType = number;
export enum AddressTypes {
  BASE = 0b0000,
  BASE_SCRIPT_KEY = 0b0001,
  BASE_KEY_SCRIPT = 0b0010,
  BASE_SCRIPT_SCRIPT = 0b0011,
  POINTER = 0b0100,
  POINTER_SCRIPT = 0b0101,
  ENTERPRISE = 0b0110,
  ENTERPRISE_SCRIPT = 0b0111,
  BOOTSTRAP = 0b1000,
  REWARD = 0b1110,
  REWARD_SCRIPT = 0b1111,
}

export enum BaseAddressTypes {
  BASE = 0b00,
  SCRIPT_KEY = 0b01,
  KEY_SCRIPT = 0b10,
  SCRIPT_SCRIPT = 0b11,
}

const shelleyAddressTypes = [
  AddressTypes.BASE,
  AddressTypes.BASE_SCRIPT_KEY,
  AddressTypes.BASE_KEY_SCRIPT,
  AddressTypes.BASE_SCRIPT_SCRIPT,
  AddressTypes.POINTER,
  AddressTypes.POINTER_SCRIPT,
  AddressTypes.ENTERPRISE,
  AddressTypes.ENTERPRISE_SCRIPT,
  AddressTypes.REWARD,
  AddressTypes.REWARD_SCRIPT,
];

const PUB_KEY_LEN = 32;
const KEY_HASH_LEN = 28;
const MAINNET_PROTOCOL_MAGIC = 764824073;

export type Pointer = {
  blockIndex: number;
  txIndex: number;
  certificateIndex: number;
};

function validatePointer(input: Pointer) {
  if (!('blockIndex' in input) || !('txIndex' in input) || !('certificateIndex' in input)) {
    throw new Error('Invalid pointer! Missing one of blockIndex, txIndex, certificateIndex');
  }
  if (
    !Number.isInteger(input.blockIndex) ||
    !Number.isInteger(input.txIndex) ||
    !Number.isInteger(input.certificateIndex)
  ) {
    throw new Error('Invalid pointer! values must be integer');
  }
}

export function packBootstrapAddress(
  derivationPath: BIP32Path,
  xpub: Buffer,
  hdPassphrase: Buffer | void,
  derivationScheme: number,
  protocolMagic: number
) {
  validateBuffer(xpub, 64);
  validateDerivationScheme(derivationScheme);
  validateUint32(protocolMagic);

  if (derivationScheme === 1) {
    validateArray(derivationPath);
    validateBuffer(hdPassphrase, 32);
  }

  let addressPayload, addressAttributes;
  if (derivationScheme === 1 && derivationPath.length > 0 && hdPassphrase) {
    addressPayload = encryptDerivationPath(derivationPath, hdPassphrase);
    addressAttributes = new Map([[1, cbor.encode(addressPayload)]]);
  } else {
    addressPayload = Buffer.from([]);
    addressAttributes = new Map();
  }

  if (protocolMagic !== MAINNET_PROTOCOL_MAGIC) {
    addressAttributes.set(2, cbor.encode(protocolMagic));
  }

  const getAddressRootHash = (input) => blake2b(sha3_256(cbor.encode(input)), 28);

  const addressRoot = getAddressRootHash([
    0,
    [0, xpub],
    addressPayload.length > 0 ? new Map([[1, cbor.encode(addressPayload)]]) : new Map(),
  ]);
  const addressType = 0; // Public key address
  const addressData = [addressRoot, addressAttributes, addressType];
  const addressDataEncoded = cbor.encode(addressData);

  return cbor.encode([new cbor.Tagged(24, addressDataEncoded), crc32(addressDataEncoded)]);
}

function getAddressHeader(addressType: AddressType, networkId: number) {
  return Buffer.from([(addressType << 4) | networkId]);
}

export function getPubKeyBlake2b224Hash(pubKey: Buffer): Buffer {
  validateBuffer(pubKey, PUB_KEY_LEN);

  return blake2b(pubKey, KEY_HASH_LEN);
}

export function packBaseAddress(
  spendingHash: Buffer,
  stakingHash: Buffer,
  networkId: number,
  type = BaseAddressTypes.BASE
) {
  validateBuffer(spendingHash, KEY_HASH_LEN);
  validateBuffer(stakingHash, KEY_HASH_LEN);
  validateNetworkId(networkId);
  validateUint32(type);

  return Buffer.concat([getAddressHeader(AddressTypes.BASE | type, networkId), spendingHash, stakingHash]);
}

export function packPointerAddress(
  spendingHash: Buffer,
  pointer: Pointer,
  networkId: number,
  isScript?: boolean
) {
  validateBuffer(spendingHash, KEY_HASH_LEN);
  validatePointer(pointer);
  validateNetworkId(networkId);

  const { blockIndex, txIndex, certificateIndex } = pointer;

  return Buffer.concat([
    getAddressHeader(isScript ? AddressTypes.POINTER_SCRIPT : AddressTypes.POINTER, networkId),
    spendingHash,
    Buffer.concat([
      variableLengthEncode(blockIndex),
      variableLengthEncode(txIndex),
      variableLengthEncode(certificateIndex),
    ]),
  ]);
}

export function packEnterpriseAddress(spendingHash: Buffer, networkId: number, isScript?: boolean) {
  validateBuffer(spendingHash, KEY_HASH_LEN);
  validateNetworkId(networkId);

  return Buffer.concat([
    getAddressHeader(isScript ? AddressTypes.ENTERPRISE_SCRIPT : AddressTypes.ENTERPRISE, networkId),
    spendingHash,
  ]);
}

export function packRewardAddress(stakingHash: Buffer, networkId: number, isScript?: boolean) {
  validateBuffer(stakingHash, KEY_HASH_LEN);
  validateNetworkId(networkId);

  return Buffer.concat([
    getAddressHeader(isScript ? AddressTypes.REWARD_SCRIPT : AddressTypes.REWARD, networkId),
    stakingHash,
  ]);
}

export function getBootstrapAddressAttributes(addressBuffer: Buffer) {
  // we decode the address from the base58 string
  // and then we strip the 24 CBOR data tags (the "[0].value" part)
  const addressAsBuffer = cbor.decode(addressBuffer)[0].value;
  const addressData = cbor.decode(addressAsBuffer);
  const addressAttributes = addressData[1];

  // cbor decoder decodes empty map as empty object, so we re-cast it to Map(0)
  if (!(addressAttributes instanceof Map)) {
    return new Map();
  }

  return addressAttributes;
}

export function getBootstrapAddressDerivationPath(addressBuffer: Buffer, hdPassphrase: Buffer) {
  const addressAttributes = getBootstrapAddressAttributes(addressBuffer);
  const addressPayloadCbor = addressAttributes.get(1);

  if (!addressPayloadCbor) {
    return null;
  }
  const addressPayload = cbor.decode(addressPayloadCbor);

  let derivationPath: BIP32Path | null = null;
  try {
    derivationPath = decryptDerivationPath(addressPayload, hdPassphrase);
  } catch (e) {
    throw new Error('Unable to get derivation path from address');
  }

  if (derivationPath && derivationPath.length > 2) {
    throw Error('Invalid derivation path length, should be at most 2');
  }

  return derivationPath;
}

export function getBootstrapAddressProtocolMagic(addressBuffer: Buffer): number {
  const addressAttributes = getBootstrapAddressAttributes(addressBuffer);

  const protocolMagicCbor = addressAttributes.get(2);
  if (!protocolMagicCbor) {
    return MAINNET_PROTOCOL_MAGIC;
  }

  return cbor.decode(protocolMagicCbor);
}

export function isValidBootstrapAddress(address: string) {
  validateString(address);

  try {
    const addressAsArray = cbor.decode(base58.decode(address));
    // we strip the 24 CBOR data taga by taking the "value" attribute from the "Tagged" object
    const addressDataEncoded = addressAsArray[0].value;
    const crc32Checksum = addressAsArray[1];

    if (crc32Checksum !== crc32(addressDataEncoded)) {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
}

export function isValidShelleyAddress(address: string) {
  validateString(address);

  try {
    const { data: addressBuffer } = bech32.decode(address);

    if (!shelleyAddressTypes.includes(getAddressType(addressBuffer))) {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
}

export function addressToBuffer(addressStr: string): Buffer {
  validateString(addressStr);

  try {
    return base58.decode(addressStr);
  } catch (e) {
    return bech32.decode(addressStr).data;
  }
}

export function getAddressType(addressBuffer: Buffer) {
  validateBuffer(addressBuffer);

  return addressBuffer[0] >> 4;
}

export function hasSpendingScript(addressBuffer: Buffer) {
  validateBuffer(addressBuffer);

  return [
    AddressTypes.BASE_SCRIPT_KEY,
    AddressTypes.BASE_SCRIPT_SCRIPT,
    AddressTypes.POINTER_SCRIPT,
    AddressTypes.ENTERPRISE_SCRIPT,
  ].includes(getAddressType(addressBuffer));
}

export function hasStakingScript(addressBuffer: Buffer) {
  validateBuffer(addressBuffer);

  return [AddressTypes.BASE_KEY_SCRIPT, AddressTypes.BASE_SCRIPT_SCRIPT, AddressTypes.REWARD_SCRIPT].includes(
    getAddressType(addressBuffer)
  );
}

export function getShelleyAddressNetworkId(addressBuffer: Buffer) {
  validateBuffer(addressBuffer);

  return addressBuffer[0] & 15;
}

function encryptDerivationPath(derivationPath: BIP32Path, hdPassphrase: Buffer) {
  const serializedDerivationPath = cbor.encode(new CborIndefiniteLengthArray(derivationPath));

  return chacha20poly1305Encrypt(serializedDerivationPath, hdPassphrase, Buffer.from('serokellfore'));
}

function decryptDerivationPath(addressPayload: Buffer, hdPassphrase: Buffer): BIP32Path {
  const decipheredDerivationPath = chacha20poly1305Decrypt(
    addressPayload,
    hdPassphrase,
    Buffer.from('serokellfore')
  );

  try {
    return cbor.decode(Buffer.from(decipheredDerivationPath));
  } catch (err) {
    throw new Error('incorrect address or passphrase');
  }
}

export async function xpubToHdPassphrase(xpub: Buffer): Promise<Buffer> {
  validateBuffer(xpub, 64);

  return pbkdf2(xpub, 'address-hashing', 500, 32, 'sha512');
}
