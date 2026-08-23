export interface DirectMessage {
  id: string
  type: 'direct_message'
  createdAt: string
  sender: string
  recipient: string
  encryptedContent: EncryptedMessageContent
}

export interface EncryptedMessageContent {
  ciphertext: string
  iv: string
  authTag: string
}

export interface DirectMessageThread {
  id: string
  participants: string[]
  createdAt: string
  lastMessageAt: string
  messageIds: string[]
}

export interface DirectMessageStorage {
  getMessages(sender: string, recipient: string): Promise<DirectMessage[]>
  sendMessage(message: DirectMessage): Promise<DirectMessage>
  getThreads(username: string): Promise<DirectMessageThread[]>
  getThreadMessages(threadId: string): Promise<DirectMessage[]>
}

export const DM_MESSAGES_PATH = 'private/messages'
export const DM_THREADS_PATH = 'private/threads'
