import { TxResponse } from '@/features/wallet/types'
import { ITxCallbacks } from '@/features/wallet/types'
import { BaseMoveProxyContractAdapter } from '../common/BaseMoveProxyContractAdapter'
import { IBaseMoveProxyContractAdapterOptions } from '../types'
import { IListIdentityArgs, ISaleControllerAdapter } from './types'

export class SaleControllerAdapterMoveProxy
  extends BaseMoveProxyContractAdapter<IBaseMoveProxyContractAdapterOptions>
  implements ISaleControllerAdapter
{
  constructor(options: IBaseMoveProxyContractAdapterOptions) {
    super(options)
  }

  estimateListFee(args: IListIdentityArgs): Promise<number> {
    console.log(args)
    throw new Error('Method not implemented.')
  }

  estimateBuyFromSale(name: string): Promise<number> {
    console.log(name)
    throw new Error('Method not implemented.')
  }

  listIdentityForSale(args: IListIdentityArgs, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>> {
    console.log(args, callbacks)
    throw new Error('Method not implemented.')
  }

  buyFromSale(name: string, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>> {
    console.log(name, callbacks)
    throw new Error('Method not implemented.')
  }

  updateSale(args: IListIdentityArgs, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>> {
    console.log(args, callbacks)
    throw new Error('Method not implemented.')
  }

  closeSale(name: string, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>> {
    console.log(name, callbacks)
    throw new Error('Method not implemented.')
  }

  getRoyaltyPercentage(name: string): Promise<number> {
    console.log(name)
    throw new Error('Method not implemented.')
  }
}
