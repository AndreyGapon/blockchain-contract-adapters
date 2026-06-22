import { TxResponse } from '@/features/wallet/types'
import BigNumber from 'bignumber.js'

export interface ILinkWalletArgs {
  signature: string
  deadline: number
  originalPublicKey: string
}

export interface ISignMessageForLinkingArgs {
  caip2: string
  deadline: number
  evmAddress: string
}

export interface IWalletLinkingAdapter {
  signMessageForLinking(args: ISignMessageForLinkingArgs): Promise<string>
  linkToOriginalWallet(args: ILinkWalletArgs): Promise<TxResponse<unknown>>
  estimateCrossChainLinkToOriginalWalletFee(args: ILinkWalletArgs): Promise<BigNumber>
}
