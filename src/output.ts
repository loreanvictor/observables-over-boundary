import { Observable, Observer, Subscription } from 'rxjs'

import { Channel } from './channel'
import { ObservableIdentifier } from './observable-id'
import { makeId } from './util/make-id'


/**
 *
 * Helps with sending observables over some boundary.
 *
 * It serializes observables into string identifiers, and allows
 * subscribing / unsubscribing to them using these identifiers instead of object references.
 * This is useful when observables are to be observed over some boundary
 * where object references cannot be passed but string identifiers can (for example, over network).
 *
 */
export class OutputLayer implements Channel {
  registry: {[id: string]: {
    observable: Observable<unknown>,
    subscriptions: { [id: string]: Subscription },
    monitor?: Subscription,
  }} = {}

  observables = new ObservableIdentifier()

  /**
   *
   * @returns A string identifier for the observable. can be used to subscribe to this
   * observable over the boundary (where object reference cannot be passed).
   *
   */
  serialize(observable: Observable<unknown>) {
    if (!(this.observables.id(observable) in this.registry)) {
      this.registry[this.observables.id(observable)] = { observable, subscriptions: {} }
    }

    return this.observables.id(observable)
  }

  /**
   *
   * Subscribes to the observable that was serialized to given identifier.
   * @returns A subscription identifier string for this subscription. Can be used to unsubscribe
   * over the boundary (where object reference cannot be passed).
   *
   */
  subscribe(observableId: string, observer: Observer<any>) {
    if (!(observableId in this.registry)) {
      return
    }

    const entry = this.registry[observableId]

    // 👉 first subscription: we also create a monitor subscription to handle
    //    cleanup when everyone has unsubscribed from the observable.
    //
    if (Object.keys(entry.subscriptions).length === 0) {
      const cleanup = () => {
        entry.monitor?.unsubscribe()
        Object.values(this.registry[observableId].subscriptions).forEach(sub => sub.unsubscribe())
        delete this.registry[observableId]
      }

      entry.monitor = entry.observable.subscribe({
        error: cleanup,
        complete: cleanup
      })
    }

    // 👉 build an id for the subscription, subscribe to the observable
    //    and hold a reference to the subscription so we can clear it later.
    //
    const subscriptionId = makeId()
    const subscription = entry.observable.subscribe(observer)
    entry.subscriptions[subscriptionId] = subscription

    return subscriptionId
  }

  /**
   *
   * Cancels the subscription (represented by given subscription identifier)
   * to the observable (represented by given observable identifier).
   *
   */
  unsubscribe(observableId: string, subscriptionId: string) {
    if (!(observableId in this.registry)) {
      return
    }

    // unsubscribe and clean up the registry entry.
    const entry = this.registry[observableId]
    const sub = entry.subscriptions[subscriptionId]
    sub.unsubscribe()
    delete entry.subscriptions[subscriptionId]

    // 👉 no more subscriptions left in the entry?
    //    we should release the reference to the observable and disconnect
    //    the monitor as well.
    //
    if (Object.keys(entry.subscriptions).length === 0) {
      entry.monitor?.unsubscribe()
      delete this.registry[observableId]
    }
  }

  /**
   *
   * @returns a JSON-serializable representation of the internal state of the output layer.
   * Useful for performance monitoring / debugging.
   *
   */
  inspect() {
    return Object.entries(this.registry).reduce((res, [observableId, entry]) => {
      res[observableId] = {
        subs: Object.keys(entry.subscriptions),
        monitor: !!entry.monitor
      }

      return res
    }, <{[id: string]: unknown}>{})
  }
}
