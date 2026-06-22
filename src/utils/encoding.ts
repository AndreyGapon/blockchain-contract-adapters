export const hexToVectorU8 = (hexString: string) => {
  if (hexString === '0x') {
    return new Uint8Array([0])
  }
  hexString = hexString.replace(/^0x/, '')
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
}
