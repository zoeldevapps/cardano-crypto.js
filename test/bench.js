const bip39 = require("bip39");
const { mnemonicToRootKeypair } = require("../features/key-derivation");
const { randomBytes } = require("node:crypto");
const { cardanoMemoryCombine } = require("../features/crypto-primitives");

const ITERATION_COUNT = 1000;
const MNEMONIC_LENGTH = 24;

/*
 * Runs the function  the functions time in milliseconds
 */
function measure(fn) {
  const start_time = process.hrtime.bigint();
  for (let i = 0; i < ITERATION_COUNT; i++) {
    fn();
  }
  const end_time = process.hrtime.bigint();

  return Number((end_time - start_time) / 1000n);
}

const KEY_COUNT = 1000;
function keyGeneration() {
  const mnemonics = Array(KEY_COUNT).map(() =>
    bip39.generateMnemonic((32 * MNEMONIC_LENGTH) / 3)
  );
  const v1Time = measure(() =>
    mnemonics.forEach((mnemonic) => mnemonicToRootKeypair(mnemonic, 1))
  );
  const v2Time = measure(() =>
    mnemonics.forEach((mnemonic) => mnemonicToRootKeypair(mnemonic, 2))
  );

  console.log(`Key generations ${ITERATION_COUNT} x ${KEY_COUNT} keys`);
  console.log(`V1: ${v1Time}ms`);
  console.log(`V2: ${v1Time}ms`);
  console.log("");
}

const BUFFER_COUNT = 1000;
function memoryCombine() {
  // this used to be an issue in the past
  const BUFFERS = Array(BUFFER_COUNT).map(() => randomBytes(256));
  const passwords = Array(BUFFER_COUNT).map(() =>
    randomBytes(8).toString("hex")
  );
  const combineTime = measure(() =>
    BUFFERS.map((buf, index) => cardanoMemoryCombine(buf, passwords[index]))
  );

  console.log(`Memory combine (${ITERATION_COUNT} x ${BUFFER_COUNT} buffers):`);
  console.log(`${combineTime}ms`);
}

keyGeneration();
memoryCombine();
