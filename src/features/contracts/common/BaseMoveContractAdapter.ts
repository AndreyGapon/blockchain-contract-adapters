import { IBaseMoveContractAdapterOptions } from '@/features/contracts/types.ts'
import { CreateEntryPayloadDataMove, CreateViewPayloadDataMove } from '@/features/contracts/common/types'
import { InputViewFunctionData } from '@aptos-labs/ts-sdk'
import { ITxInput } from '@/features/wallet/types.ts'

export class BaseMoveContractAdapter<O extends IBaseMoveContractAdapterOptions = IBaseMoveContractAdapterOptions> {
  constructor(protected options: O) {}

  protected createEntryPayload({
    module,
    functionName,
    functionArguments,
    typeArguments,
  }: CreateEntryPayloadDataMove): ITxInput {
    return {
      sender: this.options.wallet.address,
      data: {
        method: `${this.options.address}::${module ?? this.options.module}::${functionName}`,
        methodArguments: functionArguments,
        typeArguments,
      },
    }
  }

  protected createViewPayload({
    module,
    functionName,
    functionArguments,
    typeArguments,
  }: CreateViewPayloadDataMove): InputViewFunctionData {
    return {
      function: `${this.options.address}::${module ?? this.options.module}::${functionName}`,
      functionArguments,
      typeArguments,
    }
  }
}
