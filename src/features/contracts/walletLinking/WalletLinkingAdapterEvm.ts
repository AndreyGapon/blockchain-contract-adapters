import { BaseEvmContractAdapter } from '../common/BaseEvmContractAdapter'
import { proxyContractAbi } from '../abis'
import { IBaseEvmContractAdapterOptions } from '../types'
import { ILinkWalletArgs, ISignMessageForLinkingArgs, IWalletLinkingAdapter } from './types'
import { ITxInput, IWallet, TxResponse } from '@/features/wallet/types'
import { requiredWalletAddress } from '@/features/contracts/decorator/requiredWalletAddress.ts'
import { LZ_LINK_TO_ORIGINAL_WALLET_OPTIONS_HASH } from '@/features/contracts/common/constants.ts'
import BigNumber from 'bignumber.js'
import { handleMoveSignature } from '@/utils/signature'
import { isHex, pad } from 'viem'

export interface IWalletLinkingAdapterEvmOptions extends IBaseEvmContractAdapterOptions {
  originalWallet: IWallet
}

export class WalletLinkingAdapterEvm
  extends BaseEvmContractAdapter<IWalletLinkingAdapterEvmOptions>
  implements IWalletLinkingAdapter
{
  constructor(options: IWalletLinkingAdapterEvmOptions) {
    super(options, proxyContractAbi)
  }

  @requiredWalletAddress
  async signMessageForLinking({ caip2, deadline, evmAddress }: ISignMessageForLinkingArgs): Promise<string> {
    if (!this.options.originalWallet.publicKey) {
      throw new Error('Original wallet is not connected or does not have a public key')
    }

    const message = this.createWalletLinkMessage(
      this.options.originalWallet.publicKey.toString(),
      caip2,
      evmAddress,
      deadline,
    )

    const response = await this.options.originalWallet.signMessage(`0x${message.toString('hex')}`, { nonce: '0' })
    return handleMoveSignature(response.signature).toString()
  }

  @requiredWalletAddress
  async linkToOriginalWallet(args: ILinkWalletArgs): Promise<TxResponse<unknown>> {
    const payload = await this.createLinkToOriginalWalletPayload(args)
    return this.options.wallet.executeTxAndNotify(payload)
  }

  private createWalletLinkMessage(movePublicKey: string, caip: string, evmAddress: string, deadline: number): Buffer {
    const cleanPubKey = movePublicKey.startsWith('0x') ? movePublicKey.slice(2) : movePublicKey
    const cleanEvmAddress = evmAddress.startsWith('0x') ? evmAddress.slice(2) : evmAddress

    const pubKeyBuf = Buffer.from(cleanPubKey, 'hex')
    const caipBuf = Buffer.from(caip, 'utf8')
    const caipAddrBuf = Buffer.from(cleanEvmAddress.padStart(64, '0'), 'hex') // Pad to 32 bytes
    const deadlineBuf = Buffer.alloc(8)

    deadlineBuf.writeBigUInt64LE(BigInt(deadline))

    return Buffer.concat([pubKeyBuf, caipBuf, caipAddrBuf, deadlineBuf])
  }

  private async createLinkToOriginalWalletPayload(args: ILinkWalletArgs): Promise<ITxInput> {
    const { signature, deadline, originalPublicKey } = args
    const movePublicKey = originalPublicKey || this.options.originalWallet.publicKey!.toString()

    const pubkeyBytes32 = pad(isHex(movePublicKey, { strict: true }) ? movePublicKey : `0x${movePublicKey}`, {
      dir: 'right',
      size: 32,
    })

    const crossChainFee = await this.estimateCrossChainLinkToOriginalWalletFee(args)

    return {
      sender: this.options.wallet.address,
      data: {
        contract: this.contract,
        method: 'linkToMoveAA',
        methodArguments: [signature, pubkeyBytes32, deadline, LZ_LINK_TO_ORIGINAL_WALLET_OPTIONS_HASH],
      },
      options: {
        value: crossChainFee.toFixed(0, 1),
      },
    }
  }

  async estimateCrossChainLinkToOriginalWalletFee(args: ILinkWalletArgs): Promise<BigNumber> {
    if (!this.options.wallet.address) {
      throw new Error('Wallet address is not set')
    }

    const nonce = await this.getNonce()
    const bytesPayload: string = await this.contract.read.getLinkToAAPayload([
      this.options.wallet.address as `0x${string}`,
      nonce,
      args.signature as `0x${string}`,
      pad((args.originalPublicKey || this.options.originalWallet.publicKey!.toString()) as `0x${string}`, {
        dir: 'right',
        size: 32,
      }),
      BigInt(args.deadline),
    ])

    return this.estimateLayerZeroFee(bytesPayload, LZ_LINK_TO_ORIGINAL_WALLET_OPTIONS_HASH)
  }
}
