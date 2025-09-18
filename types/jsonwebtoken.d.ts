declare module "jsonwebtoken" {
  export interface JwtPayload {
    [key: string]: any
    iss?: string | undefined
    sub?: string | undefined
    aud?: string | string[] | undefined
    exp?: number | undefined
    nbf?: number | undefined
    iat?: number | undefined
    jti?: string | undefined
  }

  export interface SignOptions {
    algorithm?: Algorithm | undefined
    keyid?: string | undefined
    expiresIn?: string | number | undefined
    notBefore?: string | number | undefined
    audience?: string | string[] | undefined
    subject?: string | undefined
    issuer?: string | undefined
    jwtid?: string | undefined
    mutatePayload?: boolean | undefined
    noTimestamp?: boolean | undefined
    header?: JwtHeader | undefined
    encoding?: string | undefined
  }

  export interface VerifyOptions {
    algorithms?: Algorithm[] | undefined
    audience?: string | RegExp | Array<string | RegExp> | undefined
    clockTimestamp?: number | undefined
    clockTolerance?: number | undefined
    complete?: boolean | undefined
    issuer?: string | string[] | undefined
    ignoreExpiration?: boolean | undefined
    ignoreNotBefore?: boolean | undefined
    jwtid?: string | undefined
    nonce?: string | undefined
    subject?: string | undefined
    maxAge?: string | number | undefined
  }

  export interface DecodeOptions {
    complete?: boolean | undefined
    json?: boolean | undefined
  }

  export interface JwtHeader {
    alg: string | Algorithm
    typ?: string | undefined
    cty?: string | undefined
    crit?: Array<string | Exclude<keyof JwtHeader, "crit">> | undefined
    kid?: string | undefined
    jku?: string | undefined
    x5u?: string | string[] | undefined
    "x5t#S256"?: string | undefined
    x5t?: string | undefined
    x5c?: string | string[] | undefined
  }

  export type Algorithm =
    | "HS256"
    | "HS384"
    | "HS512"
    | "RS256"
    | "RS384"
    | "RS512"
    | "ES256"
    | "ES384"
    | "ES512"
    | "PS256"
    | "PS384"
    | "PS512"
    | "none"

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions,
  ): string

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions,
  ): JwtPayload | string

  export function decode(
    token: string,
    options?: DecodeOptions & { complete: true },
  ): null | { header: JwtHeader; payload: JwtPayload; signature: string }
  export function decode(token: string, options?: DecodeOptions): null | JwtPayload | string

  export class JsonWebTokenError extends Error {
    constructor(message: string)
  }

  export class TokenExpiredError extends JsonWebTokenError {
    constructor(message: string, expiredAt: Date)
    expiredAt: Date
  }

  export class NotBeforeError extends JsonWebTokenError {
    constructor(message: string, date: Date)
    date: Date
  }
}
