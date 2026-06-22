import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import { IBaseMoveContractAdapterOptions } from '@/features/contracts/types'
import { BaseMoveContractAdapter } from '@/features/contracts/common/BaseMoveContractAdapter.ts'
import { ITransferControllerAdapter, ITransferIdentityArgs } from '@/features/contracts/transferController/types'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'

export class TransferControllerAdapterMove extends BaseMoveContractAdapter implements ITransferControllerAdapter {
  constructor(options: IBaseMoveContractAdapterOptions) {
    super(options)
  }

  estimateTransferIdentity(argument: ITransferIdentityArgs) {
    return this.options.wallet.estimateTxFee(this.createTransferPayload(argument))
  }

  @requiredWalletAddress
  async transferIdentity(argument: ITransferIdentityArgs) {
    return this.options.wallet.executeTxAndNotify(this.createTransferPayload(argument))
  }

  private createTransferPayload({ name, subname, toAddress }: ITransferIdentityArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    return this.createEntryPayload({
      functionName: 'transfer_name',
      functionArguments: [toAddress, domainName, domainSuffix, subname],
    })
  }
}
