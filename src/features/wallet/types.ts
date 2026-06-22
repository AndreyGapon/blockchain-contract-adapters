import { AccountInfo } from '@aptos-labs/wallet-adapter-react'
import { NetworkCode, NetworkNamespace } from '@/types/networks.ts'
import { EntryFunctionArgumentTypes, SimpleEntryFunctionArgumentTypes, TypeTag } from '@aptos-labs/ts-sdk'
import BigNumber from 'bignumber.js'
import { GetContractReturnType } from 'viem'
import { proxyContractAbi } from '../contracts/abis'
import { IBaseEvmContractAdapterOptions } from '../contracts/types'

export interface ITxCallbacks {
  onHash?: (hash: string) => void
  onSuccess?: (hash: string) => void
  onError?: (hash?: string) => void
  onReject?: () => void
}

export interface TxError {
  error: string
  txHash?: string
}

export interface TxResult<R> {
  result: R
  txHash?: string
}

export type TxResponse<R> = TxResult<R> | TxError

export type WalletType = string

export type GenericContract = GetContractReturnType<
  typeof proxyContractAbi,
  IBaseEvmContractAdapterOptions['client']['walletClient']
>

export interface ITxInputData {
  contract?: GenericContract
  method: string
  typeArguments?: (string | TypeTag)[]
  methodArguments: (EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes | Record<string, unknown>)[]
}

export interface ITxInputOptions {
  gasPrice?: string
  gasLimit?: string
  value?: string
}

export interface ITxInput {
  sender?: string
  data: ITxInputData
  options?: ITxInputOptions
}

export interface ISignMessageResponse {
  fullMessage: string
  signature: unknown
}

export interface IWallet {
  walletName?: WalletType
  chainsNamespace: NetworkNamespace
  address?: string
  connected: boolean
  isConnecting: boolean
  chainId?: NetworkCode
  defaultChain: NetworkCode
  supportedChains: NetworkCode[]
  connect: (walletType?: WalletType, chainCaip2Id?: NetworkCode) => void
  disconnect: () => void
  publicKey?: AccountInfo['publicKey']
  signMessage: (message: string, options?: { nonce?: string }) => Promise<ISignMessageResponse>
  switchChain: (chainId: NetworkCode) => Promise<void>
  estimateTxFee: (txInput: ITxInput, silent?: boolean) => Promise<number>
  executeTx: <R>(txInput: ITxInput, callbacks?: ITxCallbacks) => Promise<TxResponse<R>>
  executeTxAndNotify: <R>(txInput: ITxInput, callbacks?: ITxCallbacks) => Promise<TxResponse<R>>
  getNativeBalance: (address: string) => Promise<BigNumber>
}
