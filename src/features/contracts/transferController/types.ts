import { TxResponse } from '@/features/wallet/types.ts'
import BigNumber from 'bignumber.js'

export interface ITransferIdentityArgs {
  name: string
  subname?: string
  toAddress: string
}

export interface ITransferControllerAdapter {
  estimateTransferIdentity(argument: ITransferIdentityArgs): Promise<number>
  transferIdentity(argument: ITransferIdentityArgs): Promise<TxResponse<unknown>>
}

export interface ITransferControllerProxyAdapter extends ITransferControllerAdapter {
  estimateCrossChainTransferFee(argument: ITransferIdentityArgs): Promise<BigNumber>
}
