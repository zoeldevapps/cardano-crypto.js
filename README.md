# 🧴cardano-glue

The glue between typescript frontend and nodejs applications and the cardano blockchain. This library is a collection of cryptolibraries and functions useful for working with Cardano cryptocurrency, eliminating the need for many dependencies.

For now the library provides the basic functions, but the aim is to extend the functionality past the basic primitives.

The cryptographic functions are compiled to pure javascript using Emscripten.

- [input-output-hk/cardano-crypto](https://github.com/input-output-hk/cardano-crypto/tree/master/cbits)
- [haskell-crypto/cryptonite](https://github.com/haskell-crypto/cryptonite)
- [grigorig/chachapoly](https://github.com/grigorig/chachapoly)

Originally forked from `vacuumlabs/cardano-crypto.js`. The original intent was to provide a common library to support crypto primitives, but even the library moved past that. Several utility and serialization functions were added. This library is a continuation building on top of the basic crypto functions.

Existing alternatives:

<dl>
<dt>cardano-[multiplatform | serialization]-lib</dt>
<dd><a href="https://github.com/dcspark/cardano-multiplatform-lib" target="_blank">multiplatform</a> & <a href="https://github.com/emurgo/cardano-serialization-lib" target="_blank">serialization</a> Rust compiled into wasm providing serialization and utility functions for wallets and dapps. Provides rich and <b>very</b> verbose 😞 API, which might not be everybody's cup of tea 🍵. Wasm might not play nice with some bundlers for the web, debugging can be challenging and currently the package size is > 1.5 MB 📈.</dd>
<dt><a href="https://github.com/spacebudz/lucid" target="_blank">lucid</a></dt>
<dd>Built on top of `cardano-multiplatform-lib` to provide a more functional-style expression. The library is more geared towards interacting with dapps.</dd>
<dt><a href="https://github.com/StricaHQ/typhonjs" target="_blank">typhonjs</a></dt>
<dd>Pure javascript Cardano wallet library. The library is geared more towards building wallet-type functionality.</dd>
</dl>

# Examples

## Signing

```javascript
import * as glue from 'cardano-glue';

const mnemonic = 'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme';
const walletSecret = await glue.mnemonicToRootKeypair(mnemonic, 1);
const msg = Buffer.from('hello there');
const sig = glue.sign(msg, walletSecret);
```

## Deriving child keys (hardened derivation, you can choose either derivation scheme 1 or 2)

```javascript
import * as glue from 'cardano-glue';

const mnemonic = 'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme';
const parentWalletSecret = glue.mnemonicToRootKeypair(mnemonic, 1);
const childWalletSecret = glue.derivePrivate(parentWalletSecret, 0x80000001, 1);
```

## Deriving child public keys (nonhardened derivation, you can choose either derivation scheme 1 or 2)

```javascript
import * as glue from 'cardano-glue';

const mnemonic = 'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme';
const parentWalletSecret = glue.mnemonicToRootKeypair(mnemonic, 1);
const parentWalletPublicKey = parentWalletSecret.slice(64, 128);
const childWalletSecret = glue.derivePublic(parentWalletPublicKey, 1, 1);
```

# Docs

TBD - see package types

We encourage you to take a look `at test/index.js` to see how the functions above should be used.

# Development

- Install [emscripten](http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html#installation-instructions)
- run `npm install`
- run `npm run build:native`
- run `npm run build`

## Emscripten build example

```
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.25
./emsdk activate 3.1.25
source ./emsdk_env.sh
cd ../
git clone https://github.com/zoeldevapps/cardano-glue
cd cardano-glue
npm install
npm run build:native
shasum src/lib.js # should match shasum of published version of lib.js
```

The npm package is published via automated github workflows. Check out `.github/setup-with-native/action.yml`.

## tests

- run `npm run test`

# Bundle size optimizations

- [bitcoinjs/bip39](https://github.com/bitcoinjs/bip39)

Browserify/Webpack bundles can get very large if you include all the wordlists, so you can now exclude wordlists to make your bundle lighter.

For example, if we want to exclude all wordlists besides chinese_simplified, you could build using the browserify command below.

```bash
$ browserify -r bip39 -s bip39 \
 --exclude=./wordlists/english.json \
 --exclude=./wordlists/japanese.json \
 --exclude=./wordlists/spanish.json \
 --exclude=./wordlists/italian.json \
 --exclude=./wordlists/french.json \
 --exclude=./wordlists/korean.json \
 --exclude=./wordlists/chinese_traditional.json \
  > bip39.browser.js
```

This will create a bundle that only contains the chinese_simplified wordlist, and it will be the default wordlist for all calls without explicit wordlists.

You can also do this in Webpack using the `IgnorePlugin`. Here is an example of excluding all non-English wordlists

```javascript
...
plugins: [
  new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/wordlists\/(?!english)/,
      contextRegExp: /bip39\/src$/,
    }),
],
...
```

Alternatively you can use an alias to `bip39-light`. Example with `vite`:

```js
export default defineConfig({
  /* ... */
  resolve: {
    alias: {
      bip39: 'bip39-light',
    },
  },
});
```
