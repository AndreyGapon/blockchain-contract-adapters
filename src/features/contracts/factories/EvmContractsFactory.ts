import { IContractsAdaptersFactory, IProxyContractsFactoryOptions } from '@/features/contracts/factories/types.ts'
import { IRegistryControllerAdapter } from '@/features/contracts/registryController/types.ts'
import { RegistryControllerAdapterEvm } from '@/features/contracts/registryController/RegistryControllerAdapterEvm.ts'
import { ISaleControllerAdapter } from '../saleController/types'
import { ITransferControllerAdapter } from '../transferController/types'
import { SaleControllerAdapterEvm } from '@/features/contracts/saleController'
import { TransferControllerAdapterEvm } from '@/features/contracts/transferController'
import { IWalletLinkingAdapter } from '@/features/contracts/walletLinking/types'
import { WalletLinkingAdapterEvm } from '@/features/contracts/walletLinking/WalletLinkingAdapterEvm'
import { PublicClient, WalletClient } from 'viem'

export class EvmContractsFactory implements IContractsAdaptersFactory {
  constructor(private options: IProxyContractsFactoryOptions) {}

  createRegistryControllerAdapter(): IRegistryControllerAdapter {
    const originalContract = this.options.originalContractsFactory!.createRegistryControllerAdapter()
    return new RegistryControllerAdapterEvm({
      client: this.options.client as {
        publicClient: PublicClient
        walletClient: WalletClient
      },
      wallet: this.options.wallet,
      address: this.options.contractAddress,
      originalContract: originalContract,
      priceManagerAddress: this.options.priceManagerAddress,
    })
  }

  createSaleControllerAdapter(): ISaleControllerAdapter {
    return new SaleControllerAdapterEvm({
      client: this.options.client as {
        publicClient: PublicClient
        walletClient: WalletClient
      },
      wallet: this.options.wallet,
      address: this.options.contractAddress,
    })
  }

  createTransferControllerAdapter(): ITransferControllerAdapter {
    return new TransferControllerAdapterEvm({
      client: this.options.client as {
        publicClient: PublicClient
        walletClient: WalletClient
      },
      wallet: this.options.wallet,
      address: this.options.contractAddress,
    })
  }

  createWalletLinkingAdapter(): IWalletLinkingAdapter | null {
    // If we don't have an original wallet, we can't use wallet linking
    if (!this.options.originalWallet) {
      return null
    }

    return new WalletLinkingAdapterEvm({
      client: this.options.client as {
        publicClient: PublicClient
        walletClient: WalletClient
      },
      wallet: this.options.wallet,
      address: this.options.contractAddress,
      originalWallet: this.options.originalWallet,
    })
  }
}
