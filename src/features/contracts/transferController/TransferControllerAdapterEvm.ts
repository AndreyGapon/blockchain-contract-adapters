import { BaseEvmContractAdapter } from '../common/BaseEvmContractAdapter'
import { proxyContractAbi } from '../abis'
import { IBaseEvmContractAdapterOptions } from '../types'
import { ITransferControllerProxyAdapter, ITransferIdentityArgs } from './types'
import { TxResponse } from '@/features/wallet/types'
import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import BigNumber from 'bignumber.js'
import { LZ_TRANSFER_OPTIONS_HASH } from '@/features/contracts/common/constants.ts'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'
import { pad } from 'viem'

export class TransferControllerAdapterEvm extends BaseEvmContractAdapter implements ITransferControllerProxyAdapter {
  constructor(options: IBaseEvmContractAdapterOptions) {
    super(options, proxyContractAbi)
  }

  async estimateCrossChainTransferFee(argument: ITransferIdentityArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()
    const toAddress = this.convertAddressToBytes32(argument.toAddress)
    const bytesPayload: string = await this.contract.read.getTransferDomainPayload([
      this.options.wallet.address! as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
      toAddress,
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_TRANSFER_OPTIONS_HASH)
  }

  async estimateTransferIdentity(argument: ITransferIdentityArgs): Promise<number> {
    const payload = await this.createTransferPayload(argument)
    return this.options.wallet.estimateTxFee(payload, false)
  }

  @requiredWalletAddress
  async transferIdentity(argument: ITransferIdentityArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createTransferPayload(argument)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  private async createTransferPayload(argument: ITransferIdentityArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainTransferFee(argument)
    const toAddress = this.convertAddressToBytes32(argument.toAddress)

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'transferDomain',
        methodArguments: [domainName, domainSuffix ?? '', toAddress, LZ_TRANSFER_OPTIONS_HASH],
      },
      options: {
        value: fee.toFixed(0, 1),
      },
    }
  }

  private convertAddressToBytes32(address: string) {
    return pad(address as `0x${string}`, {
      dir: 'right',
      size: 32,
    })
  }
}
