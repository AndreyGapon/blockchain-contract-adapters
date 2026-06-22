import { hexToVectorU8 } from '@/utils/encoding'
import { IBaseMoveContractAdapterOptions } from '../types'
import { BaseMoveContractAdapter } from './BaseMoveContractAdapter'
import { toBN } from '@/utils/formatNumbers'
import { LZ_FEE_TOLERANCE } from './constants'

export class BaseMoveProxyContractAdapter<
  O extends IBaseMoveContractAdapterOptions,
> extends BaseMoveContractAdapter<O> {
  private _dstEid: number | null = null

  constructor(protected options: O) {
    super(options)
  }

  protected async getDstEid() {
    if (this._dstEid) {
      return this._dstEid
    }
    const payload = this.createViewPayload({
      module: 'proxy',
      functionName: 'get_dst_eid',
      functionArguments: [],
    })
    const [dstEid]: [number] = await this.options.aptos.view({ payload })
    this._dstEid = dstEid
    return this._dstEid
  }

  protected async estimateLayerZeroFee(message: string, options: string) {
    const dstEid = await this.getDstEid()
    const payload = this.createViewPayload({
      module: 'oapp_core',
      functionName: 'lz_quote',
      functionArguments: [dstEid, hexToVectorU8(message), hexToVectorU8(options), false],
    })
    const [fee]: [number] = await this.options.aptos.view({ payload })
    return toBN(fee).multipliedBy(LZ_FEE_TOLERANCE)
  }
}
