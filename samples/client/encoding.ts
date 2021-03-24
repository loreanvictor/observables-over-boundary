import { NetworkEncoding } from '../../src/network/interface'
import { Message } from '../../src/network/message'


export class Encoding implements NetworkEncoding<string> {
  serialize(message: Message): string {
    return JSON.stringify(message)
  }

  parse(msg: string): Message {
    return JSON.parse(msg)
  }
}
