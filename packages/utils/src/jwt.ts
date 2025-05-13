import jwt, { SignOptions } from "jsonwebtoken";

export const signJwt = (
  payload: Object,
  privateKey: string,
  options: SignOptions
) => {
  return jwt.sign(payload, privateKey, {
    ...(options && options),
    algorithm: "RS256",
  });
};

export const verifyJwt = <T>(
  token: string,
  publicKey: string
): T | null => {
  try {
    const decoded = jwt.verify(token, publicKey) as T;
    return decoded;
  } catch (error) {
    return null;
  }
};
