import { ITxCallbacks, TxResponse } from '@/features/wallet/types.ts'

export interface IListIdentityArgs {
  name: string
  price: string
  durationSecs: number
}

export interface ISaleControllerAdapter {
  estimateListFee(args: IListIdentityArgs): Promise<number>

  estimateBuyFromSale(name: string): Promise<number>

  listIdentityForSale(args: IListIdentityArgs, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>>

  buyFromSale(name: string, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>>

  updateSale(args: IListIdentityArgs, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>>

  closeSale(name: string, callbacks?: ITxCallbacks): Promise<TxResponse<unknown>>

  getRoyaltyPercentage(name: string): Promise<number>
}
