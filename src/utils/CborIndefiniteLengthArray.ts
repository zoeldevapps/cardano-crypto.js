import * as cbor from 'cbor';

class CborIndefiniteLengthArray<T> {
  elements: T[];

  constructor(elements) {
    this.elements = elements;
  }

  encodeCBOR(encoder) {
    return encoder.push(
      Buffer.concat([
        Buffer.from([0x9f]), // indefinite array prefix
        ...this.elements.map((e) => cbor.encode(e)),
        Buffer.from([0xff]), // end of array
      ])
    );
  }
}

export default CborIndefiniteLengthArray;
