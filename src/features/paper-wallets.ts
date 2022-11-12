import { mnemonicToEntropy, entropyToMnemonic } from 'bip39';

import { validatePaperWalletMnemonic } from '../utils/validation';
import pbkdf2 from '../utils/pbkdf2';

export async function decodePaperWalletMnemonic(paperWalletMnemonic: string) {
  validatePaperWalletMnemonic(paperWalletMnemonic);

  const paperWalletMnemonicAsList = paperWalletMnemonic.split(' ');

  const mnemonicScrambledPart = paperWalletMnemonicAsList.slice(0, 18).join(' ');
  const mnemonicPassphrasePart = paperWalletMnemonicAsList.slice(18, 27).join(' ');

  const passphrase = await mnemonicToPaperWalletPassphrase(mnemonicPassphrasePart);
  const unscrambledMnemonic = await paperWalletUnscrambleStrings(passphrase, mnemonicScrambledPart);

  return unscrambledMnemonic;
}

async function mnemonicToPaperWalletPassphrase(mnemonic: string, password?: string): Promise<string> {
  const mnemonicBuffer = Buffer.from(mnemonic, 'utf8');
  const salt = `mnemonic${password || ''}`;
  const saltBuffer = Buffer.from(salt, 'utf8');
  return (await pbkdf2(mnemonicBuffer, saltBuffer, 2048, 32, 'sha512')).toString('hex');
}

/* taken from https://github.com/input-output-hk/rust-cardano/blob/08796d9f100f417ff30549b297bd20b249f87809/cardano/src/paperwallet.rs */
async function paperWalletUnscrambleStrings(passphrase, mnemonic) {
  const input = Buffer.from(mnemonicToEntropy(mnemonic), 'hex');
  const saltLength = 8;

  if (saltLength >= input.length) {
    throw Error('unscrambleStrings: Input is too short');
  }

  const outputLength = input.length - saltLength;

  const output = await pbkdf2(passphrase, input.slice(0, saltLength), 10000, outputLength, 'sha512');

  for (let i = 0; i < outputLength; i++) {
    output[i] = output[i] ^ input[saltLength + i];
  }

  return entropyToMnemonic(output);
}
