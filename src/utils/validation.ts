import { validateMnemonic as _validateMnemonic, wordlists } from "bip39";

export function validateBuffer(
  input: unknown,
  expectedLength?: number
): asserts input is Buffer {
  if (!Buffer.isBuffer(input)) {
    throw new Error("not buffer!");
  }

  if (expectedLength && input.length !== expectedLength) {
    throw new Error("Invalid buffer length");
  }
}

export function validateArray<T>(input: unknown): asserts input is Array<T> {
  if (typeof input !== typeof []) {
    throw new Error("not an array!");
  }
}

export function validateDerivationIndex(
  input: unknown
): asserts input is number {
  if (!Number.isInteger(input)) {
    throw new Error("invalid derivation index!");
  }
}

export function validateString(input: unknown): asserts input is string {
  if (typeof input !== typeof "aa") {
    throw new Error("not a string!");
  }
}

export function validateDerivationScheme(
  input: unknown
): asserts input is 1 | 2 {
  if (input !== 1 && input !== 2) {
    throw new Error("invalid derivation scheme!");
  }
}

export function validateMnemonic(input: string) {
  if (!_validateMnemonic(input)) {
    const e = new Error("Invalid or unsupported mnemonic format:");
    e.name = "InvalidArgumentException";
    throw e;
  }
}

export function validateMnemonicWords(input: string) {
  const wordlist = wordlists.EN;
  const words = input.split(" ");

  const valid = words.reduce((result, word) => {
    return result && wordlist.indexOf(word) !== -1;
  }, true);

  if (!valid) {
    throw new Error("Invalid mnemonic words");
  }
}

export function validatePaperWalletMnemonic(input: string) {
  validateMnemonicWords(input);

  const mnemonicLength = input.split(" ").length;

  if (mnemonicLength !== 27) {
    throw Error(
      `Paper Wallet Mnemonic must be 27 words, got ${mnemonicLength} instead`
    );
  }
}

export function validateNetworkId(input: unknown): asserts input is number {
  if (!Number.isInteger(input) || input < 0 || input > 15) {
    throw Error("Network id must be an integer between 0 and 15");
  }
}

export function validateUint32(input: unknown): asserts input is number {
  if (!Number.isInteger(input) || input < 0 || input >= Math.pow(2, 32)) {
    throw Error("Value must be uint32");
  }
}
