import { IListIdentityArgs, ISaleControllerAdapter } from './types.ts'
import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import { ITxCallbacks } from '@/features/wallet/types.ts'
import { BaseMoveContractAdapter } from '@/features/contracts/common/BaseMoveContractAdapter.ts'
import { IBaseMoveContractAdapterOptions } from '@/features/contracts/types.ts'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'

// Convert base points to percent
const BPS_PER_PERCENT = 100

export class SaleControllerAdapterMove extends BaseMoveContractAdapter implements ISaleControllerAdapter {
  constructor(options: IBaseMoveContractAdapterOptions) {
    super(options)
  }

  estimateListFee(args: IListIdentityArgs) {
    return this.options.wallet.estimateTxFee(this.createListPayload(args))
  }

  estimateBuyFromSale(name: string) {
    return this.options.wallet.estimateTxFee(this.createBuyFromSalePayload(name))
  }

  @requiredWalletAddress
  async listIdentityForSale(args: IListIdentityArgs, callbacks?: ITxCallbacks) {
    return this.options.wallet.executeTxAndNotify(this.createListPayload(args), callbacks)
  }

  @requiredWalletAddress
  async buyFromSale(name: string, callbacks?: ITxCallbacks) {
    return this.options.wallet.executeTxAndNotify(this.createBuyFromSalePayload(name), callbacks)
  }

  @requiredWalletAddress
  async updateSale({ name, price, durationSecs }: IListIdentityArgs, callbacks?: ITxCallbacks) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    const payload = this.createEntryPayload({
      functionName: 'update_domain_listing',
      functionArguments: [price, durationSecs, domainName, domainSuffix],
    })

    return this.options.wallet.executeTxAndNotify(payload, callbacks)
  }

  @requiredWalletAddress
  async closeSale(name: string, callbacks?: ITxCallbacks) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    const payload = this.createEntryPayload({
      functionName: 'cancel_domain_listing',
      functionArguments: [domainName, domainSuffix],
    })

    return this.options.wallet.executeTxAndNotify(payload, callbacks)
  }

  @requiredWalletAddress
  async getRoyaltyPercentage(name: string) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)
    const payload = this.createViewPayload({
      functionName: 'get_royalty_percentage',
      functionArguments: [domainName, domainSuffix],
      module: 'config',
    })
    const [res] = await this.options.aptos.view({ payload })
    return Number(res) / BPS_PER_PERCENT
  }

  private createListPayload({ name, price, durationSecs }: IListIdentityArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    return this.createEntryPayload({
      functionName: 'list_domain_for_sale',
      functionArguments: [price, durationSecs, domainName, domainSuffix],
    })
  }

  private createBuyFromSalePayload(name: string) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    return this.createEntryPayload({
      functionName: 'purchase_listed_domain',
      functionArguments: [domainName, domainSuffix],
    })
  }
}
