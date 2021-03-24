import { Connection, NetworkMap } from '../../src/network/interface'


export class StringMap<Msg> implements NetworkMap<Msg, string> {
  map: {[id: string]: Connection<Msg, string>} = {}

  find(id: string){
    return this.map[id]
  }

  add(connection: Connection<Msg, string>) {
    this.map[connection.id()] = connection

    return connection
  }

  remove(id: string | Connection<Msg, string>) {
    if (typeof id === 'string') {
      delete this.map[id]
    } else {
      delete this.map[id.id()]
    }
  }
}
