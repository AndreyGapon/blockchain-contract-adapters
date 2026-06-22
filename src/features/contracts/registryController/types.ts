import { ITxCallbacks, TxResponse } from '@/features/wallet/types.ts'
import BigNumber from 'bignumber.js'
import { IBaseEvmContractAdapterOptions, IBaseMoveProxyContractAdapterOptions } from '@/features/contracts/types.ts'
import { Optional } from '@/types/utility-types.ts'
import { IBinaryDataResponse } from '@/features/priceOracle/types.ts'

export interface IPurchaseIdentityArgs {
  name: string
  duration: number
  isExclusive?: boolean
  isPrimary: boolean
  amount: string
  priceUpdateData: IBinaryDataResponse
  voucherId?: string
  merkleProof?: string[]
  nativeFee?: string
}

export interface IExtendOwnershipArgs {
  name: string
  duration: number
  isExclusive?: boolean
  amount: string
  priceUpdateData: IBinaryDataResponse
  nativeFee?: string
}

export interface IUpdateRecordArgs {
  name: string
  subname?: string
  keys: string[]
  values: string[]
  addresses: string[]
  chainIds: string[]
}

export interface ISetPrimaryNameArgs {
  name: string
}

export interface ISetNFTAvatarArgs {
  name: string
  avatarIPFSHash: string
}

export interface IRemoveNFTAvatarArgs {
  name: string
}

export interface IClaimFromNSArgs {
  name: string
  amount: string
  priceUpdateData: IBinaryDataResponse
}

export interface IRegistryControllerAdapter {
  getMaxCommitmentAge(): number

  checkAvailability(name: string): Promise<boolean>

  estimatePurchase(argument: IPurchaseIdentityArgs): Promise<number>

  getRentPriceUSD(argument: Pick<IPurchaseIdentityArgs, 'name' | 'duration' | 'isExclusive'>): Promise<BigNumber>

  getPriceUpdateFee(updateData: IBinaryDataResponse): Promise<BigNumber>

  purchaseIdentity(argument: IPurchaseIdentityArgs, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>>

  estimateExtendOwnership(argument: IExtendOwnershipArgs): Promise<number>

  extendOwnership(argument: IExtendOwnershipArgs): Promise<TxResponse<unknown>>

  estimateUpdateRecord(argument: IUpdateRecordArgs): Promise<number>

  updateRecord(argument: IUpdateRecordArgs): Promise<TxResponse<unknown>>

  estimateSetPrimaryName(name?: string): Promise<number>

  setPrimaryName(argument: ISetPrimaryNameArgs): Promise<TxResponse<unknown>>

  clearPrimaryName(): Promise<TxResponse<unknown>>

  estimateSetNFTAvatar(argument: ISetNFTAvatarArgs | IRemoveNFTAvatarArgs): Promise<number>

  setNFTAvatar(argument: ISetNFTAvatarArgs): Promise<TxResponse<unknown>>

  removeNFTAvatar(argument: IRemoveNFTAvatarArgs): Promise<TxResponse<unknown>>
}

export interface IRegistrarControllerProxyAdapter extends IRegistryControllerAdapter {
  estimateCrossChainPurchaseFee(argument: IPurchaseIdentityArgs): Promise<BigNumber>

  estimateCrossChainSetNFTAvatarFee(argument: Optional<ISetNFTAvatarArgs, 'avatarIPFSHash'>): Promise<BigNumber>

  estimateCrossChainExtendFee(argument: IExtendOwnershipArgs): Promise<BigNumber>

  estimateCrossChainUpdateRecordFee(argument: IUpdateRecordArgs): Promise<BigNumber>

  estimateCrossChainSetPrimaryNameFee(argument: ISetPrimaryNameArgs): Promise<BigNumber>
}

export interface IRegistrarControllerNSClaimableAdapter extends IRegistryControllerAdapter {
  /**
   * Determines whether a claim can be made from the given name service (NS).
   * Each chain can have its own name service, so we don't mention exact name service
   *
   * @param {string} name
   * @return {Promise<boolean>}
   */
  canClaimFromNS(name: string): Promise<boolean>

  estimateCrossChainClaimFromNSFee(argument: Omit<IClaimFromNSArgs, 'amount'>): Promise<BigNumber>

  estimateClaimFromNS(argument: IClaimFromNSArgs): Promise<number>

  claimFromNS(argument: IClaimFromNSArgs): Promise<TxResponse<unknown>>
}

export interface IEvmRegistrarControllerOptions extends IBaseEvmContractAdapterOptions {
  originalContract: IRegistryControllerAdapter
  priceManagerAddress?: string
}

export interface IMoveProxyRegistrarControllerOptions extends IBaseMoveProxyContractAdapterOptions {
  originalContract: IRegistryControllerAdapter
}
