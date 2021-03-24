import { Observable } from 'rxjs'

import { Channel } from './channel'


/**
 *
 * An Input Layer can receive observables via a boundary channel.
 * It will return observables who will automatically subscribe over the boundary
 * for each new observer.
 *
 */
export class InputLayer {
  constructor() {}

  parse<T=unknown>(observableId: string, channel: Channel): Observable<T> {
    return new Observable(observer => {
      const subid$ = (async () => { return await channel.subscribe(observableId, observer) })()

      return () => subid$.then(subid => subid ? channel.unsubscribe(observableId, subid) : void(0))
    })
  }
}
