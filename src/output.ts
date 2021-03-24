import { Observable, Observer, Subscription } from 'rxjs'

import { Channel } from './channel'
import { makeId } from './util'


/**
 *
 * An Output Layer can serialize observables to be sent over some boundary,
 * and handle incoming subscribe / unsubscribe requests coming over the boundary.
 * This means it can effectively send observables over a boundary and handle subscribing / unsubscribing
 * to them.
 *
 */
export class OutputLayer implements Channel {
  registry: {[id: string]: {
    obs: Observable<unknown>,
    refCount: number,
    subs: { [id: string]: Subscription },
    monitor?: Subscription,
  }} = {}

  serialize(obs: Observable<unknown>): string {
    if (!(obs as any).__registry_id__) {
      (obs as any).__registry_id__ = makeId()
      this.registry[(obs as any).__registry_id__] = { obs, refCount: 0, subs: {} }
    }

    return (obs as any).__registry_id__
  }

  subscribe(observableId: string, observer: Observer<any>) {
    if (!(observableId in this.registry)) {
      return
    }

    const entry = this.registry[observableId]
    if (entry.refCount === 0) {
      const cleanup = () => {
        sub.unsubscribe()
        Object.values(this.registry[observableId].subs).forEach(sub => sub.unsubscribe())
        delete this.registry[observableId]
      }

      const sub = entry.obs.subscribe({
        error: cleanup,
        complete: cleanup
      })

      entry.monitor = sub
    }

    const subid = makeId()
    const sub = entry.obs.subscribe(observer)
    entry.subs[subid] = sub
    entry.refCount++

    return subid
  }

  unsubscribe(observableId: string, subscriptionId: string) {
    if (!(observableId in this.registry)) {
      return
    }

    const entry = this.registry[observableId]
    const sub = entry.subs[subscriptionId]
    sub.unsubscribe()
    delete entry.subs[subscriptionId]
    entry.refCount--

    if (entry.refCount === 0) {
      entry.monitor?.unsubscribe()
    }
  }
}
