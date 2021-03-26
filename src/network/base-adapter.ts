import { Observable, Observer, Subject, Subscription } from 'rxjs'
import { filter, map, take } from 'rxjs/operators'
import { InputLayer } from '../input'
import { OutputLayer } from '../output'
import { KeyedQueue } from '../util/keyed-queue'
import { Connection, NetworkEncoding } from './interface'
import { CompletedMessage, DataMessage, ErrorMessage, MessageType, SubscribedMessage } from './message'


/**
 *
 * Represents a network adapter for transfering observables over some network.
 *
 */
export abstract class BaseAdapter<Msg, Id> {
  input = new InputLayer()
  output = new OutputLayer()

  subscribedRelay = new KeyedQueue<SubscribedMessage>(m => m.observableId)

  dataRelay = new Subject<DataMessage | ErrorMessage | CompletedMessage>()
  subscriptionMap: {[id: string]: Subscription} = {}

  connection: Subscription

  /**
   *
   * @param encoding The encoding of network messages to and from adapter messages.
   *
   */
  constructor(
    readonly encoding: NetworkEncoding<Msg>
  ) { }

  /**
   *
   * Connects to the underlying network interface.
   *
   */
  connect() {
    this.connection = this.start()
  }

  /**
   *
   * Disconnects from the underlying network interface.
   *
   */
  disconnect() {
    this.connection.unsubscribe()
  }

  /**
   *
   * @returns A string identifier for given observable that can be passed across the network.
   *
   */
  serialize(obs: Observable<unknown>) {
    return this.output.serialize(obs)
  }

  /**
   *
   * Should connect to the underlying network interface and start intercepting incoming messages.
   *
   */
  protected abstract start(): Subscription

  /**
   *
   * Handles an incoming message.
   * @param msg The received message.
   * @param conenction The network connection from which the message was received.
   *
   */
  protected receive(msg: Msg, connection: Connection<Msg, Id>) {

    // parse the message
    const message = this.encoding.parse(msg)

    // someone requested to subscribe to one of our observables ...
    if (message.type === MessageType.Subscribe) {

      // subscribe to the observable by serializing its emissions
      // and sending them through the same communication channel.
      //
      const subscriptionId = this.output.subscribe(message.observableId, {
        next: data => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Data, data, subscriptionId })),
        error: error => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Error, error, subscriptionId })),
        complete: () => subscriptionId &&
          connection.send(this.encoding.serialize({ type: MessageType.Completed, subscriptionId }))
      })

      // we might have failed to subscribe (e.g. the observable id is wrong)
      if (subscriptionId) {

        // 👉 successfully subscribed? send a "Subscribed" message through the communication channel
        //    with the produced subscription id.
        //
        connection.send(this.encoding.serialize({
          type: MessageType.Subscribed,
          observableId: message.observableId,
          subscriptionId
        }))

        // 👉 disconnect handler ensures that we unsubscribe this subscription
        //   whenever the communication channel is closed (e.g. disconnect).
        //
        const disconnect = () => this.output.unsubscribe(message.observableId, subscriptionId)
        this.connection.add(connection.messages().subscribe({
          error: disconnect,
          complete: disconnect,
        }))
      }
    }

    // someone requested to unsubscribe to one of our observables ...
    else if (message.type === MessageType.Unsubscribe) {
      this.output.unsubscribe(message.observableId, message.subscriptionId)
    }

    // emissions from a remote observable ...
    else if (
      message.type === MessageType.Data
      || message.type === MessageType.Error
      || message.type === MessageType.Completed
    ) {
      this.dataRelay.next(message)
    }

    // confirmation for a prior request to subscribe to a remote observable ...
    else if (message.type === MessageType.Subscribed) {
      this.subscribedRelay.next(message)
    }
  }

  /**
   *
   * @param observableId Identifier of the remote observable
   * @param connection Network connection to the owner of the remote observable
   * @returns An observable object that mirrors the given remote observable
   *
   */
  protected _parse<T=unknown>(observableId: string, connection: Connection<Msg, Id>) {
    return this.input.parse<T>(observableId, {
      subscribe: (_observableId, observer) => this.subscribe(connection, _observableId, observer),
      unsubscribe: (_observableId, subscriptionId) => this.unsubscribe(connection, _observableId, subscriptionId),
    })
  }

  /**
   *
   * Subscribes to given remote observable.
   * @param connection Network connection to the owner of the remote observable
   * @param observableId Identifier of the remote observable
   * @returns The identifier of the subscription (can be used to unsubscribe)
   *
   */
  private subscribe(connection: Connection<Msg, Id>, observableId: string, observer: Observer<unknown>) {
    // 👉 wait for a subscription confirmation on the
    //   given observable id.
    //
    const subscriptionId$ = this.subscribedRelay
      .for(observableId)
      .pipe(
        map(msg => msg.subscriptionId),
        take(1),
      )
      .toPromise()
      .then(subscriptionId => {
        //  👉 now listen to data relay and channel everything
        //     related to this subscription to the given observer.
        //
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

        // hold a reference to the internal subscription
        // for later cleanup.
        this.subscriptionMap[subscriptionId] = subscription

        return subscriptionId
      })

    // request the subscription
    connection.send(this.encoding.serialize({
      type: MessageType.Subscribe,
      observableId
    }))

    return subscriptionId$
  }

  /**
   *
   * Unsubscribes given subscription from given remote observable
   * @param connection Network connection to the owner of the remote observable
   * @param observableId Identifier of the remote observable
   * @param subscriptionId Identifier of the subscription to the remote observable
   *
   */
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
