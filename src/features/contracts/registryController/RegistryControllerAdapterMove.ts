import { ITxCallbacks } from '@/features/wallet/types.ts'
import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import {
  IExtendOwnershipArgs,
  IPurchaseIdentityArgs,
  IRegistryControllerAdapter,
  IRemoveNFTAvatarArgs,
  ISetNFTAvatarArgs,
  ISetPrimaryNameArgs,
  IUpdateRecordArgs,
} from './types.ts'
import { BaseMoveContractAdapter } from '@/features/contracts/common/BaseMoveContractAdapter.ts'
import { fromDecimalsPrecision, toBN } from '@/utils/formatNumbers.ts'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'
import { IBaseMoveContractAdapterOptions } from '@/features/contracts/types.ts'
import { Optional } from '@/types/utility-types.ts'
import { hexToVectorU8 } from '@/utils/encoding.ts'
import { IBinaryDataResponse } from '@/features/priceOracle/types.ts'
import { PYTH_FEE_TOLERANCE } from '../common/constants.ts'

export class RegistryControllerAdapterMove extends BaseMoveContractAdapter implements IRegistryControllerAdapter {
  private _maxCommitmentAge: number | null = null
  private BASIS_POINTS_DECIMALS = 4
  constructor(options: IBaseMoveContractAdapterOptions) {
    super(options)
  }

  /**
   * In the Move contracts the commitment functionality was removed.
   * But on FE we will keep this variable for now just to warn the user that
   * they checked availability some time ago and since then the status might be changed
   */
  getMaxCommitmentAge() {
    if (!this._maxCommitmentAge) {
      // 10 minutes in seconds
      this._maxCommitmentAge = 600
    }
    return this._maxCommitmentAge
  }

  async checkAvailability(name: string): Promise<boolean> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)
    const payload = this.createViewPayload({
      functionName: 'can_register',
      functionArguments: [domainName, domainSuffix, null],
    })
    const [res] = await this.options.aptos.view({ payload })
    return res as boolean
  }

  estimatePurchase(argument: IPurchaseIdentityArgs) {
    return this.options.wallet.estimateTxFee(this.createRegisterPayload(argument))
  }

  async getRentPriceUSD({ name, isExclusive }: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>) {
    const inputArgs = isExclusive
      ? {
          module: 'price_model',
          functionName: 'exclusive_name_price_usd',
          functionArguments: [],
        }
      : {
          module: 'price_model',
          functionName: 'domain_price_for_length_usd',
          functionArguments: [name.length],
        }
    const payload = this.createViewPayload(inputArgs)
    const [rentPrice]: [number | string] = await this.options.aptos.view({ payload })
    return fromDecimalsPrecision(toBN(rentPrice), this.BASIS_POINTS_DECIMALS)
  }

  async getPriceUpdateFee(updateData: IBinaryDataResponse) {
    const payload = this.createViewPayload({
      module: 'price_model',
      functionName: 'get_update_fee',
      functionArguments: [[updateData.hex]],
    })

    const [priceUpdateFee]: [number | string] = await this.options.aptos.view({ payload })
    return toBN(priceUpdateFee).multipliedBy(PYTH_FEE_TOLERANCE)
  }

  @requiredWalletAddress
  async purchaseIdentity(argument: IPurchaseIdentityArgs, callbacks: ITxCallbacks = {}) {
    return this.options.wallet.executeTxAndNotify(this.createRegisterPayload(argument), callbacks)
  }

  estimateExtendOwnership(argument: IExtendOwnershipArgs) {
    return this.options.wallet.estimateTxFee(this.createExtendPayload(argument))
  }

  extendOwnership(argument: IExtendOwnershipArgs) {
    return this.options.wallet.executeTx(this.createExtendPayload(argument))
  }

  estimateUpdateRecord(argument: IUpdateRecordArgs): Promise<number> {
    return this.options.wallet.estimateTxFee(this.createUpdateRecordPayload(argument))
  }

  @requiredWalletAddress
  async updateRecord(argument: IUpdateRecordArgs) {
    return this.options.wallet.executeTx(this.createUpdateRecordPayload(argument))
  }

  estimateSetPrimaryName(name = ''): Promise<number> {
    return this.options.wallet.estimateTxFee(this.createSetPrimaryNamePayload(name))
  }

  @requiredWalletAddress
  setPrimaryName({ name }: ISetPrimaryNameArgs) {
    return this.options.wallet.executeTx(this.createSetPrimaryNamePayload(name))
  }

  @requiredWalletAddress
  async clearPrimaryName() {
    return this.options.wallet.executeTx(this.createSetPrimaryNamePayload())
  }

  estimateSetNFTAvatar(argument: ISetNFTAvatarArgs | IRemoveNFTAvatarArgs): Promise<number> {
    return this.options.wallet.estimateTxFee(this.createSetAvatarPayload(argument))
  }

  @requiredWalletAddress
  setNFTAvatar(argument: ISetNFTAvatarArgs) {
    return this.options.wallet.executeTx(this.createSetAvatarPayload(argument))
  }

  @requiredWalletAddress
  removeNFTAvatar(argument: IRemoveNFTAvatarArgs) {
    return this.options.wallet.executeTx(this.createSetAvatarPayload(argument))
  }

  private createRegisterPayload({
    name,
    duration,
    priceUpdateData,
    voucherId,
    merkleProof,
  }: Omit<IPurchaseIdentityArgs, 'amount'>) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)
    const updatePriceVector = hexToVectorU8(priceUpdateData.hex)
    const merkleProofVector = merkleProof ? merkleProof.map(hexToVectorU8) : null
    return this.createEntryPayload({
      functionName: 'register_domain',
      functionArguments: [
        [updatePriceVector],
        domainName,
        domainSuffix,
        duration,
        null,
        voucherId ?? null,
        merkleProofVector,
      ],
    })
  }

  private createExtendPayload({ name, duration, priceUpdateData }: IExtendOwnershipArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)
    const updatePriceVector = hexToVectorU8(priceUpdateData.hex)
    return this.createEntryPayload({
      functionName: 'renew_domain',
      functionArguments: [domainName, duration, [updatePriceVector], domainSuffix],
    })
  }

  private createSetPrimaryNamePayload(name = '') {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    return this.createEntryPayload({
      functionName: name ? 'set_primary_name' : 'clear_primary_name',
      functionArguments: name ? [domainName, domainSuffix, null] : [],
    })
  }

  private createSetAvatarPayload(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)

    return this.createEntryPayload({
      functionName: 'set_avatar_ipfs_hash',
      functionArguments: [domainName, domainSuffix, null, argument.avatarIPFSHash ?? null],
    })
  }

  private createUpdateRecordPayload({ name, subname, keys, values, addresses, chainIds }: IUpdateRecordArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)

    return this.createEntryPayload({
      functionName: 'set_records',
      functionArguments: [
        domainName,
        addresses.map((a) => hexToVectorU8(a)),
        chainIds,
        keys,
        values,
        domainSuffix,
        subname,
      ],
    })
  }
}
