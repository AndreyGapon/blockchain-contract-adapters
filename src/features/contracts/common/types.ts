import { InputViewFunctionData } from '@aptos-labs/ts-sdk'
import { InputTransactionData } from '@aptos-labs/wallet-adapter-react'
import { priceModelAbi, proxyContractAbi } from '../abis'

export interface CreateEntryPayloadDataMove
  extends Pick<InputTransactionData['data'], 'functionArguments' | 'typeArguments'> {
  module?: string
  functionName: string
}

export interface CreateViewPayloadDataMove extends Pick<InputViewFunctionData, 'functionArguments' | 'typeArguments'> {
  module?: string
  functionName: string
}

export type MNSContractAbi = typeof priceModelAbi | typeof proxyContractAbi
