import { Observable } from 'rxjs'
import { map, share } from 'rxjs/operators'
import { Server, Socket } from 'socket.io'
import { Connection, NetworkEncoding, NetworkInterface, NetworkMap } from '../../src/network/interface'
import { SocketConnection } from './connection'
import { StringMap } from './map'


export class SocketInterface<Msg> implements NetworkInterface<Msg, string> {
  _map = new StringMap<Msg>()
  _relay: Observable<Connection<Msg, string>>

  constructor(
    readonly io: Server,
    readonly _encoding: NetworkEncoding<Msg>,
  ) {
    this._relay = new Observable<Socket>(observer => {
      const next = (_: Socket) => observer.next(_)
      io.on('connect', next)

      return () => io.removeListener('connect', next)
    }).pipe(
      map(socket => this._map.add(new SocketConnection(socket))),
      share()
    )
  }

  connections(): Observable<Connection<Msg, string>> {
    return this._relay
  }

  map(): NetworkMap<Msg, string> {
    return this._map
  }

  encoding(): NetworkEncoding<Msg> {
    return this._encoding
  }
}
