import { Observer } from 'rxjs'


export interface Channel {
  subscribe(observableId: string, observer: Observer<any>): undefined | string | Promise<undefined | string>
  unsubscribe(observableId: string, subscriptionId: string): void | Promise<void>
}
