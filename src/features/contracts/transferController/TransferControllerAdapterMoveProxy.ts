import { ITransferControllerProxyAdapter, ITransferIdentityArgs } from './types'
import { IBaseMoveProxyContractAdapterOptions } from '../types'
import { BaseMoveProxyContractAdapter } from '../common/BaseMoveProxyContractAdapter'
import BigNumber from 'bignumber.js'
import { LZ_TRANSFER_OPTIONS_HASH } from '../common/constants'
import { requiredWalletAddress } from '../decorator/requiredWalletAddress'
import { TxResponse } from '@/features/wallet/types'
import { hexToVectorU8 } from '@/utils/encoding'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'

export class TransferControllerAdapterMoveProxy
  extends BaseMoveProxyContractAdapter<IBaseMoveProxyContractAdapterOptions>
  implements ITransferControllerProxyAdapter
{
  constructor(options: IBaseMoveProxyContractAdapterOptions) {
    super(options)
  }

  async estimateCrossChainTransferFee(args: ITransferIdentityArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(args.name)

    const payload = this.options.payloadEncoder.getTransferDomainPayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
      toAddress: args.toAddress,
    })

    return this.estimateLayerZeroFee(payload, LZ_TRANSFER_OPTIONS_HASH)
  }

  async estimateTransferIdentity(args: ITransferIdentityArgs) {
    const payload = await this.createTransferPayload(args)
    return this.options.wallet.estimateTxFee(payload)
  }

  @requiredWalletAddress
  async transferIdentity(args: ITransferIdentityArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createTransferPayload(args)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  private async createTransferPayload(args: ITransferIdentityArgs) {
    const fee = await this.estimateCrossChainTransferFee(args)
    const [domainName, domainSuffix] = getDomainNameAndSuffix(args.name)
    return this.createEntryPayload({
      functionName: 'transfer_domain',
      functionArguments: [
        domainName,
        domainSuffix ?? '',
        args.toAddress,
        hexToVectorU8(LZ_TRANSFER_OPTIONS_HASH),
        fee.toFixed(0, 1),
      ],
    })
  }
}
