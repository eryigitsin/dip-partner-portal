import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { storage } from './storage';

interface SocketUser {
  id: number;
  userName: string;
  userEmail: string;
  socketId: string;
}

interface ChatMessage {
  id: string;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface ConversationRoom {
  roomId: string;
  participants: number[];
  messages: ChatMessage[];
  lastActivity: Date;
}

class SocketChatManager {
  private io: SocketIOServer;
  private connectedUsers: Map<number, SocketUser> = new Map();
  private conversations: Map<string, ConversationRoom> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io/'
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);

      socket.on('user:authenticate', async (authData: { userId: number; userName: string; userEmail: string }) => {
        try {
          const { userId, userName, userEmail } = authData;
          
          // Verify user exists in database
          const user = await storage.getUser(userId);
          if (!user) {
            socket.emit('error', { message: 'User not found' });
            return;
          }

          // Store user connection
          const socketUser: SocketUser = {
            id: userId,
            userName,
            userEmail,
            socketId: socket.id
          };

          this.connectedUsers.set(userId, socketUser);
          socket.join(`user:${userId}`);

          console.log(`User ${userName} (${userId}) connected via socket ${socket.id}`);
          
          // Send user's existing conversations
          const userConversations = this.getUserConversations(userId);
          socket.emit('conversations:list', userConversations);

          socket.emit('user:authenticated', { success: true });

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      socket.on('conversation:create', async (data: { partnerId: number }) => {
        try {
          const socketUser = this.getSocketUser(socket.id);
          if (!socketUser) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const { partnerId } = data;
          const roomId = this.generateRoomId(socketUser.id, partnerId);

          // Create or get existing conversation
          let conversation = this.conversations.get(roomId);
          if (!conversation) {
            conversation = {
              roomId,
              participants: [socketUser.id, partnerId].sort(),
              messages: [],
              lastActivity: new Date()
            };
            this.conversations.set(roomId, conversation);
          }

          socket.join(roomId);
          socket.emit('conversation:created', { 
            roomId, 
            partnerId,
            messages: conversation.messages 
          });

        } catch (error) {
          console.error('Create conversation error:', error);
          socket.emit('error', { message: 'Failed to create conversation' });
        }
      });

      socket.on('message:send', async (data: { roomId: string; message: string; receiverId: number }) => {
        try {
          const socketUser = this.getSocketUser(socket.id);
          if (!socketUser) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const { roomId, message, receiverId } = data;
          const conversation = this.conversations.get(roomId);

          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          // Create message
          const chatMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: socketUser.id,
            receiverId,
            message: message.trim(),
            timestamp: new Date(),
            isRead: false
          };

          // Add to conversation
          conversation.messages.push(chatMessage);
          conversation.lastActivity = new Date();

          // Send to all participants in the room
          this.io.to(roomId).emit('message:received', chatMessage);

          // Send notification to receiver if they're online
          const receiverUser = this.connectedUsers.get(receiverId);
          if (receiverUser) {
            this.io.to(`user:${receiverId}`).emit('notification:new_message', {
              senderId: socketUser.id,
              senderName: socketUser.userName,
              message: message.substring(0, 100),
              roomId
            });
          }

        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      socket.on('message:read', (data: { roomId: string; messageId: string }) => {
        try {
          const { roomId, messageId } = data;
          const conversation = this.conversations.get(roomId);

          if (conversation) {
            const message = conversation.messages.find(m => m.id === messageId);
            if (message) {
              message.isRead = true;
              this.io.to(roomId).emit('message:read_updated', { messageId, isRead: true });
            }
          }
        } catch (error) {
          console.error('Mark message read error:', error);
        }
      });

      socket.on('disconnect', () => {
        // Remove user from connected users
        for (const [userId, user] of this.connectedUsers.entries()) {
          if (user.socketId === socket.id) {
            this.connectedUsers.delete(userId);
            console.log(`User ${user.userName || user.email} (${userId}) disconnected`);
            break;
          }
        }
      });
    });
  }

  private getSocketUser(socketId: string): SocketUser | null {
    for (const user of this.connectedUsers.values()) {
      if (user.socketId === socketId) {
        return user;
      }
    }
    return null;
  }

  private generateRoomId(userId1: number, userId2: number): string {
    const sortedIds = [userId1, userId2].sort();
    return `room:${sortedIds[0]}:${sortedIds[1]}`;
  }

  private getUserConversations(userId: number) {
    const userConversations = [];
    
    for (const conversation of this.conversations.values()) {
      if (conversation.participants.includes(userId)) {
        const partnerId = conversation.participants.find(id => id !== userId);
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        
        userConversations.push({
          roomId: conversation.roomId,
          partnerId,
          lastMessage,
          unreadCount: conversation.messages.filter(m => 
            m.receiverId === userId && !m.isRead
          ).length,
          lastActivity: conversation.lastActivity
        });
      }
    }

    return userConversations.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }
}

export function setupSocketIO(httpServer: HttpServer): SocketChatManager {
  return new SocketChatManager(httpServer);
}