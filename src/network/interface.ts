import { Observable } from 'rxjs'
import { Message } from './message'


export interface Connection<Msg, Id> {
  id(): Id
  messages(): Observable<Msg>
  send(message: Msg): void
}

export interface NetworkMap<Msg, Id> {
  find(id: Id): Connection<Msg, Id> | undefined
}

export interface NetworkEncoding<Msg> {
  serialize(message: Message): Msg
  parse(msg: Msg): Message
}

export interface NetworkInterface<Msg, Id> {
  connections(): Observable<Connection<Msg, Id>>
  map(): NetworkMap<Msg, Id>
  encoding(): NetworkEncoding<Msg>
}

export interface NetworkClientInterface<Msg, Id> {
  connection(): Connection<Msg, Id>
  encoding(): NetworkEncoding<Msg>
}
