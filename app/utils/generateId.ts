import { customAlphabet } from "nanoid";

function generateNanoid() {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const size = 9;

  const nanoid = customAlphabet(alphabet, size);

  return nanoid();
}

export default generateNanoid;
