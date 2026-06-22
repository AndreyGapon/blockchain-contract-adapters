import { BaseEvmContractAdapter } from '@/features/contracts/common/BaseEvmContractAdapter.ts'
import { proxyContractAbi, priceModelAbi } from '../abis'
import {
  IClaimFromNSArgs,
  IEvmRegistrarControllerOptions,
  IExtendOwnershipArgs,
  IPurchaseIdentityArgs,
  IRegistrarControllerProxyAdapter,
  IRemoveNFTAvatarArgs,
  ISetNFTAvatarArgs,
  ISetPrimaryNameArgs,
  IUpdateRecordArgs,
  IRegistrarControllerNSClaimableAdapter,
} from '@/features/contracts/registryController/types.ts'
import { getDomainNameAndSuffix } from '@/features/contracts/common/utils.ts'
import { fromDecimalsPrecision, toBN } from '@/utils/formatNumbers.ts'
import BigNumber from 'bignumber.js'
import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import { ITxCallbacks, TxResponse } from '@/features/wallet/types.ts'
import {
  LZ_CLAIM_FROM_NS_OPTIONS_HASH,
  LZ_EXTEND_OWNERSHIP_OPTIONS_HASH,
  LZ_REGISTER_OPTIONS_HASH,
  LZ_SET_AVATAR_OPTIONS_HASH,
  LZ_SET_PRIMARY_NAME_OPTIONS_HASH,
  LZ_UPDATE_RECORD_OPTIONS_HASH,
  PYTH_FEE_TOLERANCE,
} from '@/features/contracts/common/constants.ts'
import { Optional } from '@/types/utility-types.ts'
import { yearsToSeconds } from '@/utils/dates.ts'
import { IBinaryDataResponse } from '@/features/priceOracle/types.ts'
import { getContract, GetContractReturnType } from 'viem'

export class RegistryControllerAdapterEvm
  extends BaseEvmContractAdapter<IEvmRegistrarControllerOptions>
  implements IRegistrarControllerProxyAdapter, IRegistrarControllerNSClaimableAdapter
{
  private priceModel: GetContractReturnType<
    typeof priceModelAbi,
    IEvmRegistrarControllerOptions['client']['walletClient']
  > | null = null
  private _maxCommitmentAge: number | null = null
  private BASIS_POINTS_DECIMALS = 4
  private _rentPriceCache: Record<string, string> = {}

  constructor(options: IEvmRegistrarControllerOptions) {
    super(options, proxyContractAbi)

    if (options.priceManagerAddress) {
      this.priceModel = getContract({
        address: options.priceManagerAddress as `0x${string}`,
        abi: priceModelAbi,
        client: {
          public: options.client.publicClient,
          wallet: options.client.walletClient,
        },
      })
    }
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

  async canClaimFromNS(name: string): Promise<boolean> {
    if (!this.options.wallet.address) return false
    try {
      await this.contract.read.canClaimEnsIdentity([name, this.options.wallet.address as `0x${string}`])
      return true
    } catch (e) {
      return false
    }
  }

  async getRentPriceUSD({
    name,
    duration,
    isExclusive,
  }: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>) {
    const priceRaw = await this.getRentPriceUSDRaw({ name, duration, isExclusive })
    return fromDecimalsPrecision(toBN(priceRaw), this.BASIS_POINTS_DECIMALS)
  }

  async getPriceUpdateFee(updateData: IBinaryDataResponse) {
    const priceModel = await this.getPriceModel()
    const priceUpdateFee = await priceModel.read.getOracleUpdateFee([`0x${updateData.hex}`] as [`0x${string}`])
    return toBN(priceUpdateFee?.toString() ?? 0).multipliedBy(PYTH_FEE_TOLERANCE)
  }

  async estimatePurchase(argument: IPurchaseIdentityArgs): Promise<number> {
    return this.options.wallet.estimateTxFee(this.createRegisterPayload(argument))
  }

  async estimateExtendOwnership(argument: IExtendOwnershipArgs): Promise<number> {
    return this.options.wallet.estimateTxFee(this.createExtendOwnershipPayload(argument))
  }

  async estimateCrossChainPurchaseFee(argument: IPurchaseIdentityArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()

    const priceUSD = await this.getRentPriceUSDRaw({
      name: argument.name,
      duration: argument.duration,
      isExclusive: argument.isExclusive,
    })

    const bytesPayload: string = await this.contract.read.getRegisterDomainPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
      BigInt(argument.duration),
      BigInt(argument.amount),
      BigInt(priceUSD),
      argument.voucherId ?? '',
      (argument.merkleProof ?? []) as `0x${string}`[],
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_REGISTER_OPTIONS_HASH)
  }

  async estimateCrossChainSetNFTAvatarFee(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()
    const bytesPayload: string = await this.contract.read.getSetAvatarIpfsHashPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
      argument.avatarIPFSHash ?? '',
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_SET_AVATAR_OPTIONS_HASH)
  }

  async estimateCrossChainExtendFee(argument: IExtendOwnershipArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()

    const priceUSD = await this.getRentPriceUSDRaw({
      name: argument.name,
      duration: argument.duration,
      isExclusive: argument.isExclusive,
    })

    const bytesPayload: string = await this.contract.read.getRenewDomainPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
      BigInt(argument.duration),
      BigInt(argument.amount),
      BigInt(priceUSD),
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_EXTEND_OWNERSHIP_OPTIONS_HASH)
  }

  async estimateCrossChainUpdateRecordFee(argument: IUpdateRecordArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()

    const bytesPayload: string = await this.contract.read.getSetRecordsPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
      argument.chainIds,
      argument.addresses,
      argument.keys,
      argument.values,
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_UPDATE_RECORD_OPTIONS_HASH)
  }

  async estimateCrossChainSetPrimaryNameFee(argument: ISetPrimaryNameArgs): Promise<BigNumber> {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const nonce = await this.getNonce()

    const bytesPayload: string = await this.contract.read.getSetPrimaryNamePayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      domainName,
      domainSuffix ?? '',
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_SET_PRIMARY_NAME_OPTIONS_HASH)
  }

  async estimateCrossChainClaimFromNSFee(argument: Omit<IClaimFromNSArgs, 'amount'>) {
    const nonce = await this.getNonce()
    // TODO: update with actual avatar hash from NS
    const avatar = '' // empty for now
    const duration = yearsToSeconds(0.5)
    const price = 0 // price is 0 due to 100% discount
    const priceUsd = await this.getNSClaimPriceUSDRaw(argument.name)

    const bytesPayload: string = await this.contract.read.getClaimEnsIdentityPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      argument.name,
      avatar,
      BigInt(duration),
      BigInt(price),
      BigInt(priceUsd),
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_CLAIM_FROM_NS_OPTIONS_HASH)
  }

  async estimateClaimFromNS(argument: IClaimFromNSArgs) {
    return this.options.wallet.estimateTxFee(this.createClaimFromNSPayload(argument))
  }

  async estimateUpdateRecord(argument: IUpdateRecordArgs) {
    const payload = await this.createUpdateRecordPayload(argument)
    return this.options.wallet.estimateTxFee(payload, false)
  }

  @requiredWalletAddress
  purchaseIdentity(argument: IPurchaseIdentityArgs, callbacks: ITxCallbacks = {}) {
    const payload = this.createRegisterPayload(argument)
    return this.options.wallet.executeTxAndNotify(payload, callbacks)
  }

  @requiredWalletAddress
  extendOwnership(argument: IExtendOwnershipArgs): Promise<TxResponse<unknown>> {
    return this.options.wallet.executeTxAndNotify(this.createExtendOwnershipPayload(argument))
  }

  @requiredWalletAddress
  async updateRecord(argument: IUpdateRecordArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createUpdateRecordPayload(argument)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  async estimateSetPrimaryName(name = '') {
    const payload = await this.createSetPrimaryNamePayload({ name })
    return this.options.wallet.estimateTxFee(payload, false)
  }

  @requiredWalletAddress
  async setPrimaryName(argument: ISetPrimaryNameArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createSetPrimaryNamePayload(argument)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  @requiredWalletAddress
  async clearPrimaryName(): Promise<TxResponse<unknown>> {
    const payload = await this.createSetPrimaryNamePayload({ name: '' })
    return this.options.wallet.executeTxAndNotify(payload)
  }

  async estimateSetNFTAvatar(argument: ISetNFTAvatarArgs | IRemoveNFTAvatarArgs) {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.estimateTxFee(payload, false)
  }

  @requiredWalletAddress
  async setNFTAvatar(argument: ISetNFTAvatarArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  @requiredWalletAddress
  async removeNFTAvatar(argument: IRemoveNFTAvatarArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createSetNFTAvatarPayload(argument)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  @requiredWalletAddress
  claimFromNS(argument: IClaimFromNSArgs): Promise<TxResponse<unknown>> {
    return this.options.wallet.executeTxAndNotify(this.createClaimFromNSPayload(argument))
  }

  private async getRentPriceUSDRaw({
    name,
    duration,
    isExclusive,
  }: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(name)
    const cacheKey = `${domainName}-${domainSuffix}-${duration}`
    if (this._rentPriceCache[cacheKey]) {
      return this._rentPriceCache[cacheKey]
    }

    const priceModel = await this.getPriceModel()
    const rentPrice = isExclusive
      ? await priceModel.read.exclusiveNamePriceUSD()
      : await priceModel.read.getPriceUSD([domainName, domainSuffix ?? '', BigInt(duration)])

    this._rentPriceCache[cacheKey] = rentPrice.toString()
    return rentPrice.toString()
  }

  private async getNSClaimPriceUSDRaw(name: string) {
    const priceModel = await this.getPriceModel()
    const price = await priceModel.read.getPriceForEnsUSD([name])
    return price?.toString() ?? '0'
  }

  private createRegisterPayload(argument: IPurchaseIdentityArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const isRegisterWithVoucher = argument.voucherId && argument.merkleProof

    const methodArguments = isRegisterWithVoucher
      ? [
          {
            domain: domainName,
            domainSuffix: domainSuffix ?? '',
            duration: argument.duration,
            options: LZ_REGISTER_OPTIONS_HASH,
            pythUpdateData: `0x${argument.priceUpdateData.hex}`,
            voucherId: argument.voucherId,
            merkleProof: argument.merkleProof,
          },
        ]
      : [
          domainName,
          domainSuffix ?? '',
          argument.duration,
          LZ_REGISTER_OPTIONS_HASH,
          `0x${argument.priceUpdateData.hex}`,
        ]

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: isRegisterWithVoucher ? 'registerDomainWithVoucher' : 'registerDomain',
        methodArguments,
      },
      options: {
        value: argument.amount,
      },
    }
  }

  private createExtendOwnershipPayload(argument: IExtendOwnershipArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'renewDomain',
        methodArguments: [
          domainName,
          domainSuffix ?? '',
          String(argument.duration),
          LZ_EXTEND_OWNERSHIP_OPTIONS_HASH,
          `0x${argument.priceUpdateData.hex}`,
        ],
      },
      options: {
        value: argument.amount,
      },
    }
  }

  private async createSetNFTAvatarPayload(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainSetNFTAvatarFee(argument)

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'setIpfsHash',
        methodArguments: [domainName, domainSuffix ?? '', argument.avatarIPFSHash ?? '', LZ_SET_AVATAR_OPTIONS_HASH],
      },
      options: {
        value: fee.toFixed(0, 1),
      },
    }
  }

  private async createUpdateRecordPayload(argument: IUpdateRecordArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainUpdateRecordFee(argument)

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'setRecords',
        methodArguments: [
          domainName,
          domainSuffix ?? '',
          argument.chainIds,
          argument.addresses,
          argument.keys,
          argument.values,
          LZ_UPDATE_RECORD_OPTIONS_HASH,
        ],
      },
      options: {
        value: fee.toFixed(0, 1),
      },
    }
  }

  private async createSetPrimaryNamePayload(argument: ISetPrimaryNameArgs) {
    const [domainName, domainSuffix] = getDomainNameAndSuffix(argument.name)
    const fee = await this.estimateCrossChainSetPrimaryNameFee(argument)

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'setPrimaryName',
        methodArguments: [domainName, domainSuffix ?? '', LZ_SET_PRIMARY_NAME_OPTIONS_HASH],
      },
      options: {
        value: fee.toFixed(0, 1),
      },
    }
  }

  private createClaimFromNSPayload(argument: IClaimFromNSArgs) {
    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'claimEnsIdentity',
        methodArguments: [argument.name, LZ_CLAIM_FROM_NS_OPTIONS_HASH, `0x${argument.priceUpdateData.hex}`],
      },
      options: {
        value: argument.amount,
      },
    }
  }

  private async getPriceModel() {
    if (!this.priceModel) {
      const priceModelAddress = await this.contract.read.priceModel()
      this.priceModel = getContract({
        address: priceModelAddress,
        abi: priceModelAbi,
        client: {
          public: this.options.client.publicClient,
          wallet: this.options.client.walletClient,
        },
      })
    }
    return this.priceModel
  }
}
