import express from 'express'
import http from 'http'
import cors from 'cors'
import { text } from 'body-parser'
import { Server } from 'socket.io'
import { Subject } from 'rxjs'
import { SocketInterface } from '../socketio/interface'
import { Encoding } from './encoding'
import { NetworkAdapter } from '../../src/network/adapter'

const app = express()
app.use(cors())
app.use(text())
const server = http.createServer(app)
const socket = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const network = new SocketInterface<string>(socket, new Encoding())
const adapter = new NetworkAdapter(network)
adapter.connect()

const port = 3000

const sub = new Subject<string>()

app.get('/', (_, res) => {
  res.send(adapter.serialize(sub))
})

app.post('/', (req, res) => {
  sub.next(req.body)
  res.sendStatus(200)
})

server.listen(port, () => {
  console.log('Listening on ' + port)
})
