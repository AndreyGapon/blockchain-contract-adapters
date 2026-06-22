import { AbiCoder } from 'ethers'
import {
  ILinkToAAPayloadParams,
  IPayloadEncoder,
  IPaylodEncoderOptions,
  IRegisterDomainPayloadParams,
  IRenewDomainPayloadParams,
  ISetAvatarIpfsHashPayloadParams,
  ISetPrimaryNamePayloadParams,
  ISetRecordsPayloadParams,
  ITransferDomainPayloadParams,
} from './types'

const REGISTER_DOMAIN = '0x2e6f1978'
const RENEW_DOMAIN = '0x11234066'
const TRANSFER_DOMAIN = '0x86e4cd2b'
const SET_RECORDS = '0xc38f1936'
const SET_AVATAR_IPFS_HASH = '0x11c77d0c'
const SET_PRIMARY_NAME = '0xcfd1b0f6'
const LINK_MOVE_WALLET = '0xda092092'

export class PayloadEncoder implements IPayloadEncoder {
  private readonly abiCoder = new AbiCoder()

  constructor(private options: IPaylodEncoderOptions) {
    this.abiCoder = new AbiCoder()
  }

  getRegisterDomainPayload(params: IRegisterDomainPayloadParams): string {
    const payloadArgs = this.abiCoder.encode(
      [
        'bytes4',
        'bytes32',
        'uint256',
        'string',
        'string',
        'uint64',
        'uint256',
        'string',
        'uint256',
        'string',
        'bytes32[]',
      ],
      [
        REGISTER_DOMAIN,
        params.address,
        params.nonce,
        params.domain,
        params.domainSuffix,
        params.duration,
        params.price,
        this.options.caip2Id,
        params.usdPrice,
        params.voucherId,
        params.merkleProof,
      ],
    )

    return this.registerOrRenewDomainPayload(payloadArgs)
  }
  getSetAvatarIpfsHashPayload(params: ISetAvatarIpfsHashPayloadParams): string {
    return this.abiCoder.encode(
      ['bytes4', 'bytes32', 'uint256', 'string', 'string', 'string', 'string'],
      [
        SET_AVATAR_IPFS_HASH,
        params.address,
        params.nonce,
        params.domain,
        params.domainSuffix,
        params.avatarIPFSHash,
        this.options.caip2Id,
      ],
    )
  }

  getRenewDomainPayload(params: IRenewDomainPayloadParams): string {
    const payloadArgs = this.abiCoder.encode(
      [
        'bytes4',
        'bytes32',
        'uint256',
        'string',
        'string',
        'uint64',
        'uint256',
        'string',
        'uint256',
        'string',
        'bytes32[]',
      ],
      [
        RENEW_DOMAIN,
        params.address,
        params.nonce,
        params.domain,
        params.domainSuffix,
        params.duration,
        params.price,
        this.options.caip2Id,
        params.usdPrice,
        '',
        [],
      ],
    )
    return this.registerOrRenewDomainPayload(payloadArgs)
  }

  getSetRecordsPayload(params: ISetRecordsPayloadParams): string {
    return this.abiCoder.encode(
      ['bytes4', 'bytes32', 'uint256', 'string', 'string', 'string[]', 'string[]', 'string[]', 'string[]', 'string'],
      [
        SET_RECORDS,
        params.address,
        params.nonce,
        params.domain,
        params.domainSuffix,
        params.chainIds,
        params.addresses,
        params.keys,
        params.values,
        this.options.caip2Id,
      ],
    )
  }

  getSetPrimaryNamePayload(params: ISetPrimaryNamePayloadParams): string {
    return this.abiCoder.encode(
      ['bytes4', 'bytes32', 'uint256', 'string', 'string', 'string'],
      [SET_PRIMARY_NAME, params.address, params.nonce, params.domain, params.domainSuffix, this.options.caip2Id],
    )
  }

  getTransferDomainPayload(params: ITransferDomainPayloadParams): string {
    return this.abiCoder.encode(
      ['bytes4', 'bytes32', 'uint256', 'string', 'string', 'bytes32', 'string'],
      [
        TRANSFER_DOMAIN,
        params.address,
        params.nonce,
        params.domain,
        params.domainSuffix,
        params.toAddress,
        this.options.caip2Id,
      ],
    )
  }

  getLinkToAAPayload(params: ILinkToAAPayloadParams): string {
    return this.abiCoder.encode(
      ['bytes4', 'bytes32', 'uint256', 'string', 'bytes', 'bytes32', 'uint64'],
      [
        LINK_MOVE_WALLET,
        params.address,
        params.nonce,
        this.options.caip2Id,
        params.signature,
        params.pubkey,
        params.deadline,
      ],
    )
  }

  private registerOrRenewDomainPayload(payloadArgs: string) {
    const decoded = this.abiCoder.decode(
      [
        'bytes4',
        'bytes32',
        'uint256',
        'string',
        'string',
        'uint64',
        'uint256',
        'string',
        'uint256',
        'string',
        'bytes32[]',
      ],
      payloadArgs,
    )

    const [selector, user, nonce, domain, domainSuffix, duration, price, caip, usdPrice, voucherId, merkleProof] =
      decoded as unknown as [string, string, bigint, string, string, bigint, bigint, string, bigint, string, string[]]

    if (merkleProof.length > 0 && voucherId.length > 0) {
      return payloadArgs
    } else {
      const encoded = this.abiCoder.encode(
        ['bytes4', 'bytes32', 'uint256', 'string', 'string', 'uint64', 'uint256', 'string', 'uint256'],
        [selector, user, nonce, domain, domainSuffix, duration, price, caip, usdPrice],
      )
      return encoded
    }
  }
}
