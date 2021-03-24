import { Observable } from 'rxjs'
import { Socket } from 'socket.io'
import { Connection } from '../../src/network/interface'


export class SocketConnection<Msg> implements Connection<Msg, string> {
  constructor(
    readonly socket: Socket
  ) {}

  id(): string {
    return this.socket.id
  }

  messages(): Observable<Msg> {
    return new Observable(observer => {
      const next = (_: Msg) => observer.next(_)
      const complete = () => observer.complete()

      this.socket.on('message', next)
      this.socket.on('disconnect', complete)

      return () => {
        this.socket.removeListener('message', next)
        this.socket.removeListener('disconnect', complete)
      }
    })
  }

  send(message: Msg) {
    this.socket.send(message)
  }
}
