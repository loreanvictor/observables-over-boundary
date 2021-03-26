import { mergeMap, tap } from 'rxjs/operators'

import { BaseAdapter } from './base-adapter'
import { NetworkInterface } from './interface'


export class NetworkAdapter<Msg, Id> extends BaseAdapter<Msg, Id> {
  constructor(
    readonly network: NetworkInterface<Msg, Id>
  ) {
    super(network.encoding())
  }

  protected start() {
    return this.network
      .connections()
      .pipe(
        mergeMap(
          connection =>
            connection
              .messages()
              .pipe(
                tap(msg => this.receive(msg, connection))
              )
        )
      ).subscribe()
  }

  public parse<T=unknown>(observableId: string, source: Id) {
    const connection = this.network.map().find(source)
    if (connection) {
      return this._parse<T>(observableId, connection)
    }
  }
}
