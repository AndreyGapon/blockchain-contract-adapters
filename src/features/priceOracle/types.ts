export interface IPriceOracleOptions {
  baseUrl: string
}

export interface IBinaryDataResponse {
  hex: string
}

export interface IGetLatestPriceResponse {
  priceRaw: string
  decimals: number
  priceUSD: number
  binaryData: IBinaryDataResponse
}

export interface IPriceOracle {
  getLatestPrice: (feedId: string) => Promise<IGetLatestPriceResponse>
}

export interface IRPCPrice {
  price: string
  conf: string
  expo: number
  publish_time: number
}

export interface IParsedPriceUpdate {
  id: string
  price: IRPCPrice
}

export interface IBinaryPrice {
  data: string[]
  encoding: 'hex' | 'base64'
}

export interface IPriceUpdate {
  binary: IBinaryPrice
  parsed: IParsedPriceUpdate[]
}
