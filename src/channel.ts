import { Observer } from 'rxjs'


/**
 *
 * Represents a communication channel over a boundary. The main properties
 * of this communication channel are being able to subscribe to observables that reside
 * over the boundary (remote observables) and unsubscribing from them.
 *
 */
export interface Channel {
  /**
   *
   * Subscribes to the remote observable that has the given identifier.
   * @returns A subscription identifier (or a promise for one).
   *
   */
  subscribe(observableId: string, observer: Observer<any>): undefined | string | Promise<undefined | string>

  /**
   *
   * Cancels the given subscription (given subscription identifier) of the given remote observable.
   *
   */
  unsubscribe(observableId: string, subscriptionId: string): void | Promise<void>
}
