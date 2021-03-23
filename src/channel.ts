import { Observer } from 'rxjs'


export interface Channel {
  subscribe(id: string, observer: Observer<any>): undefined | string | Promise<undefined | string>
  unsubscribe(id: string, subid: string): void | Promise<void>
}
