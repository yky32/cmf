/**
 * Chat Room Manager
 * 
 * Manages chat rooms and chat room participants.
 * Chat room keys follow the format: "chat_room_" + chatRoomId
 */

export interface ChatRoomInfo {
    chatRoomId: string;
    type?: string;
    name?: string;
    createdAt: number;
    participantIds?: string[];
}

export class ChatRoomManager {
    // Map of chatRoomKey -> Set of clientIds (participants) in that chat room
    private chatRooms: Map<string, Set<string>> = new Map();
    
    // Map of clientId -> Set of chatRoomKeys the client is in
    private clientChatRooms: Map<string, Set<string>> = new Map();
    
    // Map of chatRoomKey -> ChatRoomInfo
    private chatRoomInfo: Map<string, ChatRoomInfo> = new Map();

    /**
     * Generate chat room key from chat room ID
     * Format: "chat_room_" + chatRoomId
     */
    static getChatRoomKey(chatRoomId: string): string {
        return `chat_room_${chatRoomId}`;
    }

    /**
     * Extract chat room ID from chat room key
     */
    static getChatRoomId(chatRoomKey: string): string {
        return chatRoomKey.replace(/^chat_room_/, "");
    }

    /**
     * Create a new chat room (called when Spring Boot creates a chat room)
     */
    createChatRoom(chatRoomId: string, info?: Partial<ChatRoomInfo>): string {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        
        if (!this.chatRooms.has(chatRoomKey)) {
            this.chatRooms.set(chatRoomKey, new Set());
            this.chatRoomInfo.set(chatRoomKey, {
                chatRoomId,
                createdAt: Date.now(),
                ...info
            });
            console.log(`🏠 [ChatRoomManager] Created chat room: ${chatRoomKey}`);
        }
        
        return chatRoomKey;
    }

    /**
     * Add a client (participant) to a chat room
     */
    joinChatRoom(clientId: string, chatRoomId: string): boolean {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        
        // Create chat room if it doesn't exist
        if (!this.chatRooms.has(chatRoomKey)) {
            this.createChatRoom(chatRoomId);
        }
        
        // Add client to chat room
        const participants = this.chatRooms.get(chatRoomKey)!;
        participants.add(clientId);
        
        // Track which chat rooms client is in
        if (!this.clientChatRooms.has(clientId)) {
            this.clientChatRooms.set(clientId, new Set());
        }
        this.clientChatRooms.get(clientId)!.add(chatRoomKey);
        
        console.log(`✅ [ChatRoomManager] Client ${clientId} joined chat room ${chatRoomKey} (${participants.size} participants)`);
        return true;
    }

    /**
     * Remove a client (participant) from a chat room
     */
    leaveChatRoom(clientId: string, chatRoomId: string): boolean {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        const participants = this.chatRooms.get(chatRoomKey);
        
        if (participants) {
            participants.delete(clientId);
            console.log(`👋 [ChatRoomManager] Client ${clientId} left chat room ${chatRoomKey} (${participants.size} participants remaining)`);
        }
        
        // Remove from client's chat room list
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (clientChatRoomSet) {
            clientChatRoomSet.delete(chatRoomKey);
        }
        
        return true;
    }

    /**
     * Remove a client from all chat rooms (on disconnect)
     */
    leaveAllChatRooms(clientId: string): void {
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (!clientChatRoomSet) return;
        
        for (const chatRoomKey of clientChatRoomSet) {
            const participants = this.chatRooms.get(chatRoomKey);
            if (participants) {
                participants.delete(clientId);
            }
        }
        
        this.clientChatRooms.delete(clientId);
        console.log(`👋 [ChatRoomManager] Client ${clientId} removed from all chat rooms`);
    }

    /**
     * Get all participants (clients) in a chat room
     */
    getChatRoomParticipants(chatRoomId: string): Set<string> {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        return this.chatRooms.get(chatRoomKey) || new Set();
    }

    /**
     * Get all chat rooms a client is in
     */
    getClientChatRooms(clientId: string): string[] {
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (!clientChatRoomSet) return [];
        
        return Array.from(clientChatRoomSet).map(chatRoomKey => ChatRoomManager.getChatRoomId(chatRoomKey));
    }

    /**
     * Get chat room info
     */
    getChatRoomInfo(chatRoomId: string): ChatRoomInfo | undefined {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        return this.chatRoomInfo.get(chatRoomKey);
    }

    /**
     * Check if chat room exists
     */
    chatRoomExists(chatRoomId: string): boolean {
        const chatRoomKey = ChatRoomManager.getChatRoomKey(chatRoomId);
        return this.chatRooms.has(chatRoomKey);
    }

    /**
     * Get all chat rooms
     */
    getAllChatRooms(): string[] {
        return Array.from(this.chatRooms.keys()).map(chatRoomKey => ChatRoomManager.getChatRoomId(chatRoomKey));
    }

    /**
     * Get chat room count
     */
    getChatRoomCount(): number {
        return this.chatRooms.size;
    }

    /**
     * Get total participants across all chat rooms
     */
    getTotalParticipants(): number {
        return this.clientChatRooms.size;
    }
}
