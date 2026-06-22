import { IRegistryControllerAdapter } from '@/features/contracts/registryController/types.ts'
import { Aptos } from '@aptos-labs/ts-sdk'
import { IWallet } from '@/features/wallet/types.ts'
import { ISaleControllerAdapter } from '@/features/contracts/saleController/types.ts'
import { ITransferControllerAdapter } from '@/features/contracts/transferController/types.ts'
import { IWalletLinkingAdapter } from '@/features/contracts/walletLinking/types.ts'
import { PublicClient, WalletClient } from 'viem'

export interface IContractsAdaptersFactory {
  createRegistryControllerAdapter(): IRegistryControllerAdapter
  createSaleControllerAdapter(): ISaleControllerAdapter
  createTransferControllerAdapter(): ITransferControllerAdapter
  createWalletLinkingAdapter(): IWalletLinkingAdapter | null
}

export interface IBaseContractsFactoryOptions {
  client:
    | Aptos
    | {
        publicClient: PublicClient
        walletClient?: WalletClient
      }
  wallet: IWallet
  contractAddress: string
}

export interface IProxyContractsFactoryOptions extends IBaseContractsFactoryOptions {
  originalContractsFactory?: IContractsAdaptersFactory
  priceManagerAddress?: string
  originalWallet?: IWallet
}
