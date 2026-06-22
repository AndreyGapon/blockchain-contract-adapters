import { IBaseEvmContractAdapterOptions } from '@/features/contracts/types.ts'
import { toBN } from '@/utils/formatNumbers.ts'
import { LZ_FEE_TOLERANCE } from './constants'
import { getContract, GetContractReturnType } from 'viem'
import { proxyContractAbi } from '../abis'

export class BaseEvmContractAdapter<O extends IBaseEvmContractAdapterOptions = IBaseEvmContractAdapterOptions> {
  protected contract: GetContractReturnType<
    typeof proxyContractAbi,
    IBaseEvmContractAdapterOptions['client']['walletClient']
  >

  constructor(
    protected options: O,
    abi: typeof proxyContractAbi,
  ) {
    this.contract = getContract({
      address: options.address as `0x${string}`,
      abi,
      client: {
        public: options.client.publicClient,
        wallet: options.client.walletClient,
      },
    })
  }

  protected async estimateLayerZeroFee(payload: string, options: string) {
    const res = await this.contract.read.quoteFee([payload, options] as [`0x${string}`, `0x${string}`])
    return toBN(res[0].toString()).multipliedBy(LZ_FEE_TOLERANCE)
  }

  protected async getNonce() {
    const nonce = await this.options.client.publicClient.getTransactionCount({
      address: this.options.wallet.address as `0x${string}`,
      blockTag: 'pending',
    })
    return BigInt(nonce)
  }
}
