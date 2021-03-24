
import { BaseAdapter } from './base-adapter'
import { NetworkClientInterface } from './interface'


export class NetworkClientAdapter<Msg> extends BaseAdapter<Msg, unknown>{
  constructor(
    readonly client: NetworkClientInterface<Msg, unknown>
  ) {
    super(client.encoding())
  }

  protected start() {
    const connection = this.client.connection()

    return connection
      .messages()
      .subscribe(msg => this.receive(msg, connection))
  }

  public parse(observableId: string) {
    return this._parse(observableId, this.client.connection())
  }
}
