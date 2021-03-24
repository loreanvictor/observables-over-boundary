export enum MessageType {
  Subscribe=0,
  Unsubscribe=1,
  Subscribed=2,
  Data=3,
  Error=4,
  Completed=5,
  Unknown=6,
}

export interface SubscribeMessage {
  type: MessageType.Subscribe
  observableId: string
}

export interface UnsubscribeMessage {
  type: MessageType.Unsubscribe
  observableId: string
  subscriptionId: string
}

export interface SubscribedMessage {
  type: MessageType.Subscribed
  observableId: string
  subscriptionId: string
}

export interface DataMessage {
  type: MessageType.Data,
  subscriptionId: string,
  data: unknown
}

export interface ErrorMessage {
  type: MessageType.Error,
  subscriptionId: string,
  error: unknown
}

export interface CompletedMessage {
  type: MessageType.Completed,
  subscriptionId: string
}

export interface UnknownMessage {
  type: MessageType.Unknown
}

export type Message =
  SubscribeMessage
  | UnsubscribeMessage
  | SubscribedMessage
  | DataMessage
  | ErrorMessage
  | CompletedMessage
  | UnknownMessage
