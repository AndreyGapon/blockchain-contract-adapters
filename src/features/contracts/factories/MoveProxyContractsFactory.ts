import { Aptos } from '@aptos-labs/ts-sdk'
import { RegistryControllerAdapterMoveProxy } from '../registryController'
import { IContractsAdaptersFactory, IProxyContractsFactoryOptions } from './types'
import { IPayloadEncoder } from '../common/PayloadEncoder/types'
import { PayloadEncoder } from '../common/PayloadEncoder/PayloadEnocder'
import { IRegistryControllerAdapter } from '@/features/contracts/registryController/types'
import { ISaleControllerAdapter } from '../saleController/types'
import { SaleControllerAdapterMoveProxy } from '../saleController'
import { ITransferControllerAdapter } from '../transferController/types'
import { TransferControllerAdapterMoveProxy } from '../transferController'

export class MoveProxyContractsFactory implements IContractsAdaptersFactory {
  private payloadEncoder: IPayloadEncoder
  constructor(private options: IProxyContractsFactoryOptions) {
    this.payloadEncoder = new PayloadEncoder({
      caip2Id: this.options.wallet.chainId!,
    })
  }

  createRegistryControllerAdapter(): IRegistryControllerAdapter {
    const originalContract = this.options.originalContractsFactory!.createRegistryControllerAdapter()
    return new RegistryControllerAdapterMoveProxy({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'proxy',
      originalContract,
      payloadEncoder: this.payloadEncoder,
    })
  }

  createSaleControllerAdapter(): ISaleControllerAdapter {
    return new SaleControllerAdapterMoveProxy({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'proxy',
      payloadEncoder: this.payloadEncoder,
    })
  }

  createTransferControllerAdapter(): ITransferControllerAdapter {
    return new TransferControllerAdapterMoveProxy({
      address: this.options.contractAddress,
      wallet: this.options.wallet,
      aptos: this.options.client as Aptos,
      module: 'proxy',
      payloadEncoder: this.payloadEncoder,
    })
  }

  // Feature not supported on Move network for now
  createWalletLinkingAdapter(): null {
    return null
  }
}
