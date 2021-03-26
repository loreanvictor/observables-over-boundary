import state from 'callbag-state'
import { List, makeRenderer } from 'callbag-jsx'
import { io } from 'socket.io-client'
import { NetworkClientAdapter } from '../../src/network/client-adapter'
import { SocketConnection } from '../socketio/client'
import { Encoding } from './encoding'


const renderer = makeRenderer()

const socket = io('localhost:3000')
const connection = new SocketConnection<string>(socket)
const adapter = new NetworkClientAdapter<string>({
  connection: () => connection,
  encoding: () => new Encoding()
})
adapter.connect()

fetch('http://localhost:3000')
  .then(r => r.text())
  .then(r => {
    adapter.parse<string>(r).subscribe(msg => {
      messages.sub(messages.get().length).set(msg)
    })
  })

const messages = state<string[]>([])
const draft = state('')

const send = () => {
  fetch('http://localhost:3000', {
    method: 'POST',
    body: draft.get()
  })

  draft.set('')
}

renderer.render(
  <>
    <h1>Observables Over Boundary</h1>
    <input type='text' placeholder='type something ...' _state={draft}/>
    <button onclick={send}>Send</button>
    <br/>
    <List of={messages} each={msg => <div>{msg}</div>}/>
  </>
).on(document.body)
