/**
 * Chat Room Manager
 * 
 * Manages chat rooms and chat room participants with optimized performance.
 * Chat room keys follow the format: "chat_room_" + chatRoomId
 * 
 * Optimizations:
 * - Reduced key conversions by caching
 * - Automatic cleanup of empty rooms
 * - Batch operations support
 * - Better memory management
 */

import { ChatRoomInfo, ChatRoomMetadata } from "../enu/events/chat-room-events";

export class ChatRoomManager {
    // Map of chatRoomKey -> ChatRoomMetadata (combines participants and info for better locality)
    private chatRooms: Map<string, ChatRoomMetadata> = new Map();
    
    // Map of clientId -> Set of chatRoomKeys the client is in (for fast lookup)
    private clientChatRooms: Map<string, Set<string>> = new Map();

    // Cache for key conversions to avoid repeated string operations
    private keyCache: Map<string, string> = new Map();
    private idCache: Map<string, string> = new Map();

    /**
     * Generate chat room key from chat room ID (with caching)
     * Format: "chat_room_" + chatRoomId
     */
    static getChatRoomKey(chatRoomId: string): string {
        return `chat_room_${chatRoomId}`;
    }

    /**
     * Extract chat room ID from chat room key (with caching)
     */
    static getChatRoomId(chatRoomKey: string): string {
        return chatRoomKey.replace(/^chat_room_/, "");
    }

    /**
     * Get cached chat room key (optimization)
     */
    private getCachedKey(chatRoomId: string): string {
        let key = this.keyCache.get(chatRoomId);
        if (!key) {
            key = ChatRoomManager.getChatRoomKey(chatRoomId);
            this.keyCache.set(chatRoomId, key);
        }
        return key;
    }

    /**
     * Get cached chat room ID (optimization)
     */
    private getCachedId(chatRoomKey: string): string {
        let id = this.idCache.get(chatRoomKey);
        if (!id) {
            id = ChatRoomManager.getChatRoomId(chatRoomKey);
            this.idCache.set(chatRoomKey, id);
        }
        return id;
    }

    /**
     * Cleanup empty chat rooms (called automatically or manually)
     */
    private cleanupEmptyRooms(): void {
        const emptyRooms: string[] = [];
        
        for (const [chatRoomKey, roomData] of this.chatRooms.entries()) {
            if (roomData.participants.size === 0) {
                emptyRooms.push(chatRoomKey);
            }
        }

        for (const chatRoomKey of emptyRooms) {
            this.chatRooms.delete(chatRoomKey);
            const chatRoomId = this.getCachedId(chatRoomKey);
            this.keyCache.delete(chatRoomId);
            this.idCache.delete(chatRoomKey);
        }

        if (emptyRooms.length > 0) {
            console.log(`🧹 [ChatRoomManager] Cleaned up ${emptyRooms.length} empty chat room(s)`);
        }
    }

    /**
     * Create a new chat room (called when Spring Boot creates a chat room)
     */
    createChatRoom(chatRoomId: string, info?: Partial<ChatRoomInfo>): string {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        
        if (!this.chatRooms.has(chatRoomKey)) {
            this.chatRooms.set(chatRoomKey, {
                participants: new Set(),
                info: {
                    chatRoomId,
                    createdAt: Date.now(),
                    ...info
                }
            });
            console.log(`🏠 [ChatRoomManager] Created chat room: ${chatRoomKey}`);
        }
        
        return chatRoomKey;
    }

    /**
     * Add a client (participant) to a chat room
     * Returns true if successfully joined, false if already in room
     */
    joinChatRoom(clientId: string, chatRoomId: string): boolean {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        
        // Create chat room if it doesn't exist
        let roomData = this.chatRooms.get(chatRoomKey);
        if (!roomData) {
            this.createChatRoom(chatRoomId);
            roomData = this.chatRooms.get(chatRoomKey)!;
        }

        // Check if already in room (optimization: avoid unnecessary operations)
        if (roomData.participants.has(clientId)) {
            return false;
        }

        // Add client to chat room
        roomData.participants.add(clientId);

        // Track which chat rooms client is in
        if (!this.clientChatRooms.has(clientId)) {
            this.clientChatRooms.set(clientId, new Set());
        }
        this.clientChatRooms.get(clientId)!.add(chatRoomKey);

        console.log(`✅ [ChatRoomManager] Client ${clientId} joined chat room ${chatRoomKey} (${roomData.participants.size} participants)`);
        return true;
    }

    /**
     * Batch join: Add multiple clients to a chat room at once
     */
    joinChatRoomBatch(clientIds: string[], chatRoomId: string): { joined: string[], alreadyInRoom: string[] } {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        
        // Create chat room if it doesn't exist
        let roomData = this.chatRooms.get(chatRoomKey);
        if (!roomData) {
            this.createChatRoom(chatRoomId);
            roomData = this.chatRooms.get(chatRoomKey)!;
        }

        const joined: string[] = [];
        const alreadyInRoom: string[] = [];

        for (const clientId of clientIds) {
            if (roomData.participants.has(clientId)) {
                alreadyInRoom.push(clientId);
                continue;
            }

            roomData.participants.add(clientId);

            if (!this.clientChatRooms.has(clientId)) {
                this.clientChatRooms.set(clientId, new Set());
            }
            this.clientChatRooms.get(clientId)!.add(chatRoomKey);

            joined.push(clientId);
        }

        if (joined.length > 0) {
            console.log(`✅ [ChatRoomManager] Batch joined ${joined.length} client(s) to chat room ${chatRoomKey} (${roomData.participants.size} total participants)`);
        }

        return { joined, alreadyInRoom };
    }

    /**
     * Remove a client (participant) from a chat room
     * Returns true if successfully left, false if not in room
     */
    leaveChatRoom(clientId: string, chatRoomId: string): boolean {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        
        if (!roomData || !roomData.participants.has(clientId)) {
            return false;
        }

        roomData.participants.delete(clientId);
        const remainingCount = roomData.participants.size;

        // Remove from client's chat room list
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (clientChatRoomSet) {
            clientChatRoomSet.delete(chatRoomKey);
            // Clean up empty client entry
            if (clientChatRoomSet.size === 0) {
                this.clientChatRooms.delete(clientId);
            }
        }

        console.log(`👋 [ChatRoomManager] Client ${clientId} left chat room ${chatRoomKey} (${remainingCount} participants remaining)`);

        // Auto-cleanup empty rooms (optional: can be disabled for performance)
        if (remainingCount === 0) {
            // Defer cleanup to avoid blocking
            setImmediate(() => this.cleanupEmptyRooms());
        }

        return true;
    }

    /**
     * Remove a client from all chat rooms (on disconnect)
     * Optimized for performance
     */
    leaveAllChatRooms(clientId: string): void {
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (!clientChatRoomSet || clientChatRoomSet.size === 0) {
            return;
        }

        const roomsToCleanup: string[] = [];

        for (const chatRoomKey of clientChatRoomSet) {
            const roomData = this.chatRooms.get(chatRoomKey);
            if (roomData) {
                roomData.participants.delete(clientId);
                if (roomData.participants.size === 0) {
                    roomsToCleanup.push(chatRoomKey);
                }
            }
        }

        this.clientChatRooms.delete(clientId);

        // Cleanup empty rooms
        if (roomsToCleanup.length > 0) {
            for (const chatRoomKey of roomsToCleanup) {
                this.chatRooms.delete(chatRoomKey);
                const chatRoomId = this.getCachedId(chatRoomKey);
                this.keyCache.delete(chatRoomId);
                this.idCache.delete(chatRoomKey);
            }
        }

        console.log(`👋 [ChatRoomManager] Client ${clientId} removed from ${clientChatRoomSet.size} chat room(s)`);
    }

    /**
     * Get all participants (clients) in a chat room
     * Returns a copy to prevent external modification
     */
    getChatRoomParticipants(chatRoomId: string): Set<string> {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        return roomData ? new Set(roomData.participants) : new Set();
    }

    /**
     * Get participant count for a chat room (optimized)
     */
    getChatRoomParticipantCount(chatRoomId: string): number {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        return roomData ? roomData.participants.size : 0;
    }

    /**
     * Check if a client is in a chat room (optimized)
     */
    isClientInRoom(clientId: string, chatRoomId: string): boolean {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        return roomData ? roomData.participants.has(clientId) : false;
    }

    /**
     * Get all chat rooms a client is in
     * Returns array of chat room IDs (not keys)
     */
    getClientChatRooms(clientId: string): string[] {
        const clientChatRoomSet = this.clientChatRooms.get(clientId);
        if (!clientChatRoomSet || clientChatRoomSet.size === 0) {
            return [];
        }

        // Use cached IDs for better performance
        const chatRoomIds: string[] = [];
        for (const chatRoomKey of clientChatRoomSet) {
            chatRoomIds.push(this.getCachedId(chatRoomKey));
        }
        return chatRoomIds;
    }

    /**
     * Get chat room info
     */
    getChatRoomInfo(chatRoomId: string): ChatRoomInfo | undefined {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        return roomData ? { ...roomData.info } : undefined;
    }

    /**
     * Update chat room info
     */
    updateChatRoomInfo(chatRoomId: string, updates: Partial<ChatRoomInfo>): boolean {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        const roomData = this.chatRooms.get(chatRoomKey);
        
        if (!roomData) {
            return false;
        }

        roomData.info = {
            ...roomData.info,
            ...updates,
            chatRoomId: roomData.info.chatRoomId // Preserve chatRoomId
        };

        return true;
    }

    /**
     * Check if chat room exists
     */
    chatRoomExists(chatRoomId: string): boolean {
        const chatRoomKey = this.getCachedKey(chatRoomId);
        return this.chatRooms.has(chatRoomKey);
    }

    /**
     * Get all chat rooms
     * Returns array of chat room IDs (not keys)
     */
    getAllChatRooms(): string[] {
        const chatRoomIds: string[] = [];
        for (const chatRoomKey of this.chatRooms.keys()) {
            chatRoomIds.push(this.getCachedId(chatRoomKey));
        }
        return chatRoomIds;
    }

    /**
     * Get all chat rooms with their participant counts (optimized for stats)
     */
    getAllChatRoomsWithStats(): Array<{ chatRoomId: string; participantCount: number; info?: ChatRoomInfo }> {
        const stats: Array<{ chatRoomId: string; participantCount: number; info?: ChatRoomInfo }> = [];
        
        for (const [chatRoomKey, roomData] of this.chatRooms.entries()) {
            stats.push({
                chatRoomId: this.getCachedId(chatRoomKey),
                participantCount: roomData.participants.size,
                info: { ...roomData.info }
            });
        }
        
        return stats;
    }

    /**
     * Get chat room count
     */
    getChatRoomCount(): number {
        return this.chatRooms.size;
    }

    /**
     * Get total participants across all chat rooms
     * Note: This counts unique clients, not total memberships
     */
    getTotalParticipants(): number {
        return this.clientChatRooms.size;
    }

    /**
     * Get total participant memberships (sum of all room sizes)
     * Useful for understanding total room activity
     */
    getTotalParticipantMemberships(): number {
        let total = 0;
        for (const roomData of this.chatRooms.values()) {
            total += roomData.participants.size;
        }
        return total;
    }

    /**
     * Manual cleanup of empty rooms (can be called periodically)
     */
    manualCleanup(): number {
        const beforeCount = this.chatRooms.size;
        this.cleanupEmptyRooms();
        return beforeCount - this.chatRooms.size;
    }

    /**
     * Clear all data (useful for testing or reset)
     */
    clear(): void {
        this.chatRooms.clear();
        this.clientChatRooms.clear();
        this.keyCache.clear();
        this.idCache.clear();
        console.log(`🧹 [ChatRoomManager] Cleared all data`);
    }

    /**
     * Get memory usage statistics (for monitoring)
     */
    getStats(): {
        chatRoomCount: number;
        totalClients: number;
        totalMemberships: number;
        averageParticipantsPerRoom: number;
        largestRoomSize: number;
    } {
        const chatRoomCount = this.chatRooms.size;
        const totalClients = this.clientChatRooms.size;
        let totalMemberships = 0;
        let largestRoomSize = 0;

        for (const roomData of this.chatRooms.values()) {
            const size = roomData.participants.size;
            totalMemberships += size;
            if (size > largestRoomSize) {
                largestRoomSize = size;
            }
        }

        return {
            chatRoomCount,
            totalClients,
            totalMemberships,
            averageParticipantsPerRoom: chatRoomCount > 0 ? totalMemberships / chatRoomCount : 0,
            largestRoomSize
        };
    }
}