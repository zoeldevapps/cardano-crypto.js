import { pbkdf2 as pbkdf2Async, pbkdf2Sync } from 'pbkdf2';

const promisifiedPbkdf2 = (
  password: string | Buffer,
  salt: string | Buffer,
  iterations: number,
  length: number,
  algo: string
): Promise<Buffer> =>
  new Promise((resolveFunction, rejectFunction) => {
    pbkdf2Async(password, salt, iterations, length, algo, (error, response) => {
      if (error) {
        rejectFunction(error);
      }
      resolveFunction(response);
    });
  });

const pbkdf2 = async (
  password: string | Buffer,
  salt: string | Buffer,
  iterations: number,
  length: number,
  algo: string
) => {
  try {
    const result = await promisifiedPbkdf2(password, salt, iterations, length, algo);
    return result;
  } catch (e) {
    // falback to sync since on Firefox promisifiedPbkdf2 fails for empty password
    return pbkdf2Sync(password, salt, iterations, length, algo);
  }
};

export default pbkdf2;
