import { IWallet } from '@/features/wallet/types.ts'
import { Aptos } from '@aptos-labs/ts-sdk'
import { IPayloadEncoder } from './common/PayloadEncoder/types'
import { PublicClient, WalletClient } from 'viem'

export interface IBaseMoveContractAdapterOptions {
  address: string
  aptos: Aptos
  wallet: IWallet
  module: string
}

export interface IBaseMoveProxyContractAdapterOptions extends IBaseMoveContractAdapterOptions {
  payloadEncoder: IPayloadEncoder
}

export interface IBaseEvmContractAdapterOptions {
  address: string
  client: {
    publicClient: PublicClient
    walletClient: WalletClient
  }
  wallet: IWallet
}
