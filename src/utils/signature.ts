import { Ed25519Signature, Signature } from '@aptos-labs/ts-sdk'

interface RawSignature {
  data: { data: number[] }
}

const isSignatureInstance = (sig: unknown): sig is Signature =>
  typeof sig === 'object' && sig !== null && 'toUint8Array' in sig

const isSignatureLikeObject = (sig: unknown): sig is RawSignature =>
  typeof sig === 'object' && sig !== null && 'data' in sig && 'data' in (sig as any).data

const isHexStringSignature = (sig: unknown): sig is string => typeof sig === 'string'

const createSignatureFromRaw = (signature: RawSignature) => {
  // Extract and convert to hex
  const innerData = signature.data.data
  const signatureArray = new Uint8Array(Object.values(innerData))
  const hexString = Array.from(signatureArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  // Create new Ed25519Signature instance
  return new Ed25519Signature(hexString)
}

export const handleMoveSignature = (signature: unknown) => {
  if (isSignatureInstance(signature)) {
    return signature // It's a valid Signature instance
  }

  if (isSignatureLikeObject(signature)) {
    return createSignatureFromRaw(signature) // Handle plain object with Signature-like structure
  }

  if (isHexStringSignature(signature)) {
    return new Ed25519Signature(signature)
  }

  throw new Error('Unsupported signature format') // Handle unexpected cases
}
