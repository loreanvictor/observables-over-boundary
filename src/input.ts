import { Observable } from 'rxjs'

import { Channel } from './channel'


/**
 *
 * Helps with receiving observables over some boundary.
 *
 * It parses incoming observable identifiers to local observable objects
 * that mimick the behavior of the corresponding observable over the boundary.
 *
 */
export class InputLayer {
  /**
   *
   * @returns An observable object using given observable identifier that was received
   * via given communication channel. This observable mimicks the behavior of the actual
   * observable which resides on the other side of the channel (over the boundary).
   *
   */
  parse<T=unknown>(observableId: string, channel: Channel): Observable<T> {
    return new Observable(observer => {
      const subid$ = (async () => { return await channel.subscribe(observableId, observer) })()

      return () => subid$.then(subid => subid ? channel.unsubscribe(observableId, subid) : void(0))
    })
  }
}
