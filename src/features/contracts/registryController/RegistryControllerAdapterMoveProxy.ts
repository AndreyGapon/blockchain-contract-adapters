import { toBN } from '@/utils/formatNumbers'
import { fromDecimalsPrecision } from '@/utils/formatNumbers'
import { BaseMoveProxyContractAdapter } from '../common/BaseMoveProxyContractAdapter'
import {
  IExtendOwnershipArgs,
  IMoveProxyRegistrarControllerOptions,
  IPurchaseIdentityArgs,
  IRegistrarControllerProxyAdapter,
  IRemoveNFTAvatarArgs,
  ISetNFTAvatarArgs,
  ISetPrimaryNameArgs,
  IUpdateRecordArgs,
} from './types'
import { IBinaryDataResponse } from '@/features/priceOracle/types'
import BigNumber from 'bignumber.js'
import { getDomainNameAndSuffix } from '../common/utils'
import {
  LZ_EXTEND_OWNERSHIP_OPTIONS_HASH,
  LZ_REGISTER_OPTIONS_HASH,
  LZ_SET_AVATAR_OPTIONS_HASH,
  LZ_SET_PRIMARY_NAME_OPTIONS_HASH,
  LZ_UPDATE_RECORD_OPTIONS_HASH,
  PYTH_FEE_TOLERANCE,
} from '../common/constants'
import { Optional } from '@/types/utility-types'
import { hexToVectorU8 } from '@/utils/encoding'
import { requiredWalletAddress } from '../decorator/requiredWalletAddress'
import { ITxCallbacks, TxResponse } from '@/features/wallet/types'

export class RegistryControllerAdapterMoveProxy
  extends BaseMoveProxyContractAdapter<IMoveProxyRegistrarControllerOptions>
  implements IRegistrarControllerProxyAdapter
{
  private _maxCommitmentAge: number | null = null
  private BASIS_POINTS_DECIMALS = 4
  private _rentPriceCache: Record<string, string> = {}
  constructor(options: IMoveProxyRegistrarControllerOptions) {
    super(options)
  }

  getMaxCommitmentAge() {
    if (!this._maxCommitmentAge) {
      // 10 minutes in seconds
      this._maxCommitmentAge = 600
    }
    return this._maxCommitmentAge
  }

  checkAvailability(name: string): Promise<boolean> {
    return this.options.originalContract.checkAvailability(name)
  }

  async getRentPriceUSD({
    name,
    duration,
    isExclusive,
  }: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>) {
    const rentPrice = await this.getRentPriceUSDRaw({ name, duration, isExclusive })
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

  async estimateCrossChainPurchaseFee(argument: IPurchaseIdentityArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)

    const usdPrice = await this.getRentPriceUSDRaw({
      name: argument.name,
      duration: argument.duration,
      isExclusive: argument.isExclusive,
    })

    const payload = this.options.payloadEncoder.getRegisterDomainPayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
      duration: argument.duration,
      price: argument.amount,
      caip: this.options.wallet.chainId!,
      usdPrice,
      voucherId: argument.voucherId ?? '',
      merkleProof: argument.merkleProof ?? [],
    })

    return this.estimateLayerZeroFee(payload, LZ_REGISTER_OPTIONS_HASH)
  }

  estimatePurchase(argument: IPurchaseIdentityArgs) {
    return this.options.wallet.estimateTxFee(this.createRegisterPayload(argument))
  }

  @requiredWalletAddress
  purchaseIdentity(argument: IPurchaseIdentityArgs, callbacks: ITxCallbacks = {}): Promise<TxResponse<unknown>> {
    return this.options.wallet.executeTxAndNotify(this.createRegisterPayload(argument), callbacks)
  }

  async estimateCrossChainExtendFee(argument: IExtendOwnershipArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)

    const usdPrice = await this.getRentPriceUSDRaw({
      name: argument.name,
      duration: argument.duration,
      isExclusive: argument.isExclusive,
    })
    const payload = this.options.payloadEncoder.getRenewDomainPayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
      duration: argument.duration,
      price: argument.amount,
      usdPrice,
    })

    return this.estimateLayerZeroFee(payload, LZ_EXTEND_OWNERSHIP_OPTIONS_HASH)
  }

  estimateExtendOwnership(argument: IExtendOwnershipArgs) {
    return this.options.wallet.estimateTxFee(this.createExtendPayload(argument))
  }

  @requiredWalletAddress
  extendOwnership(argument: IExtendOwnershipArgs) {
    return this.options.wallet.executeTx(this.createExtendPayload(argument))
  }

  async estimateCrossChainUpdateRecordFee(argument: IUpdateRecordArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const payload = this.options.payloadEncoder.getSetRecordsPayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
      chainIds: argument.chainIds,
      addresses: argument.addresses,
      keys: argument.keys,
      values: argument.values,
    })

    return this.estimateLayerZeroFee(payload, LZ_UPDATE_RECORD_OPTIONS_HASH)
  }

  async estimateUpdateRecord(argument: IUpdateRecordArgs) {
    const payload = await this.createUpdateRecordPayload(argument)
    return this.options.wallet.estimateTxFee(payload)
  }

  @requiredWalletAddress
  async updateRecord(argument: IUpdateRecordArgs) {
    const payload = await this.createUpdateRecordPayload(argument)
    return this.options.wallet.executeTx(payload)
  }

  async estimateCrossChainSetNFTAvatarFee(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const payload = this.options.payloadEncoder.getSetAvatarIpfsHashPayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
      avatarIPFSHash: argument.avatarIPFSHash ?? '',
    })

    return this.estimateLayerZeroFee(payload, LZ_SET_AVATAR_OPTIONS_HASH)
  }

  async estimateSetNFTAvatar(argument: ISetNFTAvatarArgs | IRemoveNFTAvatarArgs): Promise<number> {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.estimateTxFee(payload)
  }

  @requiredWalletAddress
  async setNFTAvatar(argument: ISetNFTAvatarArgs) {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.executeTx(payload)
  }

  @requiredWalletAddress
  async removeNFTAvatar(argument: IRemoveNFTAvatarArgs) {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.executeTx(payload)
  }

  async estimateCrossChainSetPrimaryNameFee(argument: ISetPrimaryNameArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const payload = this.options.payloadEncoder.getSetPrimaryNamePayload({
      address: this.options.wallet.address!,
      nonce: 0n,
      domain: domainName,
      domainSuffix: domainSuffix ?? '',
    })

    return this.estimateLayerZeroFee(payload, LZ_SET_PRIMARY_NAME_OPTIONS_HASH)
  }

  async estimateSetPrimaryName(name = ''): Promise<number> {
    const payload = await this.createSetPrimaryNamePayload({ name: name ?? '' })
    return this.options.wallet.estimateTxFee(payload, false)
  }

  @requiredWalletAddress
  async setPrimaryName(argument: ISetPrimaryNameArgs) {
    const payload = await this.createSetPrimaryNamePayload(argument)
    return this.options.wallet.executeTx(payload)
  }

  @requiredWalletAddress
  async clearPrimaryName() {
    const payload = await this.createSetPrimaryNamePayload({ name: '' })
    return this.options.wallet.executeTx(payload)
  }

  private createRegisterPayload(argument: IPurchaseIdentityArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const updatePriceVector = hexToVectorU8(argument.priceUpdateData.hex)
    const merkleProofVector = argument.merkleProof ? argument.merkleProof.map(hexToVectorU8) : null

    return this.createEntryPayload({
      functionName: 'register_domain',
      functionArguments: [
        [updatePriceVector],
        domainName,
        domainSuffix ?? '',
        argument.duration,
        hexToVectorU8(LZ_REGISTER_OPTIONS_HASH),
        argument.nativeFee ?? '0',
        argument.voucherId ?? null,
        merkleProofVector,
      ],
    })
  }

  private createExtendPayload(argument: IExtendOwnershipArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const updatePriceVector = hexToVectorU8(argument.priceUpdateData.hex)
    return this.createEntryPayload({
      functionName: 'renew_domain',
      functionArguments: [
        [updatePriceVector],
        domainName,
        domainSuffix ?? '',
        argument.duration,
        hexToVectorU8(LZ_EXTEND_OWNERSHIP_OPTIONS_HASH),
        argument.nativeFee ?? '0',
      ],
    })
  }

  private async createUpdateRecordPayload(argument: IUpdateRecordArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainUpdateRecordFee(argument)
    return this.createEntryPayload({
      functionName: 'set_records',
      functionArguments: [
        domainName,
        domainSuffix ?? '',
        argument.chainIds,
        argument.addresses,
        argument.keys,
        argument.values,
        hexToVectorU8(LZ_UPDATE_RECORD_OPTIONS_HASH),
        fee.toFixed(0, 1),
      ],
    })
  }

  private async createSetPrimaryNamePayload(argument: ISetPrimaryNameArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainSetPrimaryNameFee(argument)
    return this.createEntryPayload({
      functionName: 'set_primary_name',
      functionArguments: [
        domainName,
        domainSuffix ?? '',
        hexToVectorU8(LZ_SET_PRIMARY_NAME_OPTIONS_HASH),
        fee.toFixed(0, 1),
      ],
    })
  }

  private async createSetNFTAvatarPayload(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainSetNFTAvatarFee(argument)
    return this.createEntryPayload({
      functionName: 'set_avatar_ipfs_hash',
      functionArguments: [
        domainName,
        domainSuffix ?? '',
        argument.avatarIPFSHash ?? '',
        hexToVectorU8(LZ_SET_AVATAR_OPTIONS_HASH),
        fee.toFixed(0, 1),
      ],
    })
  }

  private async getRentPriceUSDRaw({
    name,
    duration,
    isExclusive,
  }: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>) {
    const cacheKey = `${name}-${duration}`
    if (this._rentPriceCache[cacheKey]) {
      return this._rentPriceCache[cacheKey]
    }

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
    this._rentPriceCache[cacheKey] = String(rentPrice)
    return this._rentPriceCache[cacheKey]
  }
}
