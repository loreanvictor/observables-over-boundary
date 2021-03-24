import { Observable, Observer, Subject, Subscription } from 'rxjs'
import { filter, map, take } from 'rxjs/operators'
import { InputLayer } from '../input'
import { OutputLayer } from '../output'
import { Connection, NetworkEncoding } from './interface'
import { CompletedMessage, DataMessage, ErrorMessage, MessageType, SubscribedMessage } from './message'


// TODO: add cleanup after connection disconnect

export abstract class BaseAdapter<Msg, Id> {
  input = new InputLayer()
  output = new OutputLayer()

  subscribedRelay = new Subject<SubscribedMessage>()
  dataRelay = new Subject<DataMessage | ErrorMessage | CompletedMessage>()

  subscriptionMap: {[id: string]: Subscription} = {}
  connection: Subscription

  constructor(
    readonly encoding: NetworkEncoding<Msg>
  ) { }

  connect() {
    this.connection = this.start()
  }

  disconnect() {
    this.connection.unsubscribe()
  }

  serialize(obs: Observable<unknown>) {
    return this.output.serialize(obs)
  }

  protected abstract start(): Subscription

  protected receive(msg: Msg, connection: Connection<Msg, Id>) {
    const message = this.encoding.parse(msg)

    if (message.type === MessageType.Subscribe) {
      const subscriptionId = this.output.subscribe(message.observableId, {
        next: data => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Data, data, subscriptionId })),
        error: error => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Error, error, subscriptionId })),
        complete: () => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Completed, subscriptionId }))
      })

      if (subscriptionId) {
        connection.send(this.encoding.serialize({
          type: MessageType.Subscribed,
          observableId: message.observableId,
          subscriptionId
        }))
      }
    } else if (message.type === MessageType.Unsubscribe) {
      this.output.unsubscribe(message.observableId, message.subscriptionId)
    } else if (
      message.type === MessageType.Data
      || message.type === MessageType.Error
      || message.type === MessageType.Completed
    ) {
      this.dataRelay.next(message)
    } else if (message.type === MessageType.Subscribed) {
      this.subscribedRelay.next(message)
    }
  }

  protected _parse(observableId: string, connection: Connection<Msg, Id>) {
    return this.input.parse(observableId, {
      subscribe: (_observableId, observer) => this.subscribe(connection, _observableId, observer),
      unsubscribe: (_observableId, subscriptionId) => this.unsubscribe(connection, _observableId, subscriptionId),
    })
  }

  private subscribe(connection: Connection<Msg, Id>, observableId: string, observer: Observer<unknown>) {
    const subscriptionId$ = this.subscribedRelay.pipe(
      filter(msg => msg.observableId === observableId),
      map(msg => msg.subscriptionId),
      take(1),
    ).toPromise().then(subscriptionId => {

      const subscription = this.dataRelay.pipe(
        filter(msg => msg.subscriptionId === subscriptionId),
      ).subscribe(msg => {
        if (msg.type === MessageType.Data) {
          observer.next(msg.data)
        } else if (msg.type === MessageType.Error) {
          observer.error(msg.error)
          this.clearsub(subscriptionId)
        } else if (msg.type === MessageType.Completed) {
          observer.complete()
          this.clearsub(subscriptionId)
        }
      })

      this.subscriptionMap[subscriptionId] = subscription

      return subscriptionId
    })

    connection.send(this.encoding.serialize({
      type: MessageType.Subscribe,
      observableId
    }))

    return subscriptionId$
  }


  private unsubscribe(connection: Connection<Msg, Id>, observableId: string, subscriptionId: string) {
    connection.send(this.encoding.serialize({
      type: MessageType.Unsubscribe,
      observableId,
      subscriptionId
    }))
    this.clearsub(subscriptionId)
  }

  private clearsub(subscriptionId: string) {
    this.subscriptionMap[subscriptionId]?.unsubscribe()
    delete this.subscriptionMap[subscriptionId]
  }
}
