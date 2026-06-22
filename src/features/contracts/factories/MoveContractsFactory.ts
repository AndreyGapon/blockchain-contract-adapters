import { Aptos } from '@aptos-labs/ts-sdk'
import { IBaseContractsFactoryOptions, IContractsAdaptersFactory } from '@/features/contracts/factories/types.ts'
import { IRegistryControllerAdapter } from '@/features/contracts/registryController/types.ts'
import { RegistryControllerAdapterMove } from '@/features/contracts/registryController'
import { ISaleControllerAdapter } from '../saleController/types'
import { ITransferControllerAdapter } from '../transferController/types'
import { SaleControllerAdapterMove } from '@/features/contracts/saleController'
import { TransferControllerAdapterMove } from '@/features/contracts/transferController'

export class MoveContractsFactory implements IContractsAdaptersFactory {
  constructor(private options: IBaseContractsFactoryOptions) {}

  createRegistryControllerAdapter(): IRegistryControllerAdapter {
    return new RegistryControllerAdapterMove({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'router',
    })
  }

  createSaleControllerAdapter(): ISaleControllerAdapter {
    return new SaleControllerAdapterMove({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'router',
    })
  }

  createTransferControllerAdapter(): ITransferControllerAdapter {
    return new TransferControllerAdapterMove({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'router',
    })
  }

  // Original (Movement) network doesn't support wallet linking since it's the main wallet
  createWalletLinkingAdapter(): null {
    return null
  }
}
