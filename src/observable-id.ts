import { Observable } from 'rxjs'
import { makeId } from './util/make-id'


/**
 *
 * A utility that helps with identifying each observable with a unique id.
 * This ensures using consistent ids when the same observable object is serialized.
 *
 */
export class ObservableIdentifier {
  map = new WeakMap<Observable<unknown>, string>()

  /**
   *
   * @returns The identifier string for given observable
   *
   */
  id(observable: Observable<unknown>): string {
    if (!this.map.has(observable)) {
      this.map.set(observable, makeId())
    }

    return this.map.get(observable)!
  }
}
