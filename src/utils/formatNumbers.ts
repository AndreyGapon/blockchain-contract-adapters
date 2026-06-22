import BigNumber from 'bignumber.js'

export function toBN(num: number | string) {
  return new BigNumber(num)
}

export function fromDecimalsPrecision(bn: BigNumber, decimals: number) {
  return bn.dividedBy(toBN(10).pow(toBN(decimals)))
}
