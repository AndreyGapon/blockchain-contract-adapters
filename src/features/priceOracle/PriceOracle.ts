import { IGetLatestPriceResponse, IPriceOracle, IPriceOracleOptions, IPriceUpdate } from './types.ts'
import axios, { AxiosInstance } from 'axios'

export class PriceOracle implements IPriceOracle {
  private axiosInstance: AxiosInstance

  constructor(options: IPriceOracleOptions) {
    this.axiosInstance = axios.create({
      baseURL: options.baseUrl,
    })
  }

  getLatestPrice = async (feedId: string) => {
    const LATEST_PRICE_ENDPOINT = '/v2/updates/price/latest'
    const params = {
      ids: [feedId],
      parsed: true,
    }

    const { data: response } = await this.axiosInstance.get<IPriceUpdate>(LATEST_PRICE_ENDPOINT, {
      params: {
        ...params,
        encoding: 'hex',
      },
    })

    return this.convertResponse(response)
  }

  private convertResponse(response: IPriceUpdate): IGetLatestPriceResponse {
    if (
      !response.parsed?.length ||
      !response.parsed[0].price ||
      !response.binary?.data?.length ||
      !response.binary?.data[0]
    ) {
      throw new Error('Price Oracle: Invalid response format from API')
    }
    const parsedPriceData = response.parsed[0].price
    return {
      binaryData: {
        hex: response.binary.data[0],
      },
      priceRaw: parsedPriceData.price,
      priceUSD: Number(parsedPriceData.price) * Math.pow(10, parsedPriceData.expo),
      decimals: Math.abs(parsedPriceData.expo),
    }
  }
}
