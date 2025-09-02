import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import config from "config"

export class AppleAuthService {
    private static client = jwksClient({
        jwksUri: "https://appleid.apple.com/auth/keys"
    });

    static async verifyAppleToken(identityToken: string) {
        try {
            const decodedToken = jwt.decode(identityToken, { complete: true });

            if (!decodedToken || typeof decodedToken === 'string') {
                throw new Error("Invalid token format");
            }

            const { kid } = decodedToken.header;

            if (!kid) {
                throw new Error("Token header does not contain 'kid'");
            }

            const key = await this.getSigningKey(kid);

            const payload = jwt.verify(identityToken, key, {
                algorithms: ["RS256"],
                issuer: "https://appleid.apple.com",
                audience: config.get<string>("appleClientId") // Your Apple app's client ID
            }) as any;

            return {
                sub: payload.sub,
                email: payload.email,
                email_verified: payload.email_verified,
                name: payload.name,
                real_user_status: payload.real_user_status
            };
        } catch (error: any) {
            throw new Error(`Apple token verification failed: ${error.message}`);
        }
    }

    private static async getSigningKey(kid: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.getSigningKey(kid, (err, key) => {
                if (err) {
                    reject(err);
                } else if (key) {
                    resolve(key.getPublicKey());
                } else {
                    reject(new Error("Signing key is undefined"));
                }
            });
        });
    }
}