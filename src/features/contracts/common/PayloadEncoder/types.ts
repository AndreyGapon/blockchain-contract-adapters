export interface IRegisterDomainPayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
  duration: number
  price: string
  caip: string
  usdPrice: string
  voucherId: string
  merkleProof: string[]
}

export interface ISetAvatarIpfsHashPayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
  avatarIPFSHash: string
}

export interface IRenewDomainPayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
  duration: number
  price: string
  usdPrice: string
}

export interface ISetRecordsPayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
  chainIds: string[]
  addresses: string[]
  keys: string[]
  values: string[]
}

export interface ISetPrimaryNamePayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
}

export interface ITransferDomainPayloadParams {
  address: string
  nonce: bigint
  domain: string
  domainSuffix: string
  toAddress: string
}

export interface ILinkToAAPayloadParams {
  address: string
  nonce: bigint
  signature: string
  pubkey: string
  deadline: number
}

export interface IPaylodEncoderOptions {
  caip2Id: string
}

export interface IPayloadEncoder {
  getRegisterDomainPayload(params: IRegisterDomainPayloadParams): string
  getSetAvatarIpfsHashPayload(params: ISetAvatarIpfsHashPayloadParams): string
  getRenewDomainPayload(params: IRenewDomainPayloadParams): string
  getSetRecordsPayload(params: ISetRecordsPayloadParams): string
  getSetPrimaryNamePayload(params: ISetPrimaryNamePayloadParams): string
  getTransferDomainPayload(params: ITransferDomainPayloadParams): string
  getLinkToAAPayload(params: ILinkToAAPayloadParams): string
}
