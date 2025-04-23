import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

// Database instance
let db: any = null;

// Message types
export type Message = {
  id?: number;
  conversation_id: number;
  content: string;
  sender: string; // 'user' | 'assistant'
  timestamp: string;
};

// Folder types
export type Folder = {
  id?: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
};

// Conversation types
export type Conversation = {
  id?: number;
  name: string;
  folder_id: number | null;
  parent_conversation_id: number | null;
  fork_message_id: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * Initialize and get database connection
 */
export async function getDb() {
  if (!db) {
    try {
      // Get database path from Rust
      const dbPath = await invoke('get_db_path');
      console.log('Database path:', dbPath);
      
      // Connect to the database using the full path
      db = await Database.load(`sqlite:${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
  return db;
}

// ---------- FOLDER OPERATIONS ----------

/**
 * Create a new folder
 */
export async function createFolder(name: string, parentId: number | null = null): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const result = await db.execute(
    "INSERT INTO folders (name, parent_id, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, parentId, now, now]
  );
  
  return result.lastInsertId;
}

/**
 * Update folder details
 */
export async function updateFolder(id: number, name: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.execute(
    "UPDATE folders SET name = $1, updated_at = $2 WHERE id = $3",
    [name, now, id]
  );
}

/**
 * Get all folders
 */
export async function getFolders(): Promise<Folder[]> {
  const db = await getDb();
  return await db.select("SELECT * FROM folders ORDER BY name");
}

/**
 * Get all root folders (no parent)
 */
export async function getRootFolders(): Promise<Folder[]> {
  const db = await getDb();
  return await db.select("SELECT * FROM folders WHERE parent_id IS NULL ORDER BY name");
}

/**
 * Get child folders for a parent folder
 */
export async function getChildFolders(parentId: number): Promise<Folder[]> {
  const db = await getDb();
  return await db.select("SELECT * FROM folders WHERE parent_id = $1 ORDER BY name", [parentId]);
}

/**
 * Get a specific folder by id
 */
export async function getFolder(id: number): Promise<Folder | null> {
  const db = await getDb();
  const results = await db.select("SELECT * FROM folders WHERE id = $1", [id]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Delete a folder and update its conversations to have no folder
 */
export async function deleteFolder(id: number): Promise<void> {
  const db = await getDb();
  
  // Update conversations to have no folder
  await db.execute(
    "UPDATE conversations SET folder_id = NULL WHERE folder_id = $1",
    [id]
  );
  
  // Delete the folder
  await db.execute("DELETE FROM folders WHERE id = $1", [id]);
}

/**
 * Move conversations to a folder
 */
export async function moveConversationsToFolder(conversationIds: number[], folderId: number | null): Promise<void> {
  const db = await getDb();
  
  // Convert list of ids to comma-separated string for SQL IN clause
  const idList = conversationIds.join(',');
  
  await db.execute(
    `UPDATE conversations SET folder_id = $1 WHERE id IN (${idList})`,
    [folderId]
  );
}

// ---------- CONVERSATION OPERATIONS ----------

/**
 * Create a new conversation
 */
export async function createConversation(
  name: string, 
  folderId: number | null = null,
  parentConversationId: number | null = null,
  forkMessageId: number | null = null
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const result = await db.execute(
    `INSERT INTO conversations 
     (name, folder_id, parent_conversation_id, fork_message_id, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, folderId, parentConversationId, forkMessageId, now, now]
  );
  
  return result.lastInsertId;
}

/**
 * Fork a conversation at a specific message
 */
export async function forkConversation(
  parentConversationId: number, 
  forkMessageId: number, 
  name: string,
  folderId: number | null = null
): Promise<number> {
  // Create the new conversation
  const newConversationId = await createConversation(
    name, 
    folderId, 
    parentConversationId, 
    forkMessageId
  );
  
  // Get all messages up to the fork point
  const db = await getDb();
  const messages = await db.select(
    `SELECT * FROM messages 
     WHERE conversation_id = $1 
     AND id <= $2
     ORDER BY timestamp`,
    [parentConversationId, forkMessageId]
  );
  
  // Copy messages to the new conversation
  for (const message of messages) {
    await db.execute(
      `INSERT INTO messages (conversation_id, content, sender, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [newConversationId, message.content, message.sender, message.timestamp]
    );
  }
  
  return newConversationId;
}

/**
 * Update conversation details
 */
export async function updateConversation(id: number, name: string, folderId: number | null = null): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  await db.execute(
    "UPDATE conversations SET name = $1, folder_id = $2, updated_at = $3 WHERE id = $4",
    [name, folderId, now, id]
  );
}

/**
 * Get all conversations
 */
export async function getConversations(): Promise<Conversation[]> {
  const db = await getDb();
  return await db.select("SELECT * FROM conversations ORDER BY updated_at DESC");
}

/**
 * Get conversations in a specific folder
 */
export async function getConversationsByFolder(folderId: number | null): Promise<Conversation[]> {
  const db = await getDb();
  
  if (folderId === null) {
    return await db.select(
      "SELECT * FROM conversations WHERE folder_id IS NULL ORDER BY updated_at DESC"
    );
  } else {
    return await db.select(
      "SELECT * FROM conversations WHERE folder_id = $1 ORDER BY updated_at DESC",
      [folderId]
    );
  }
}

/**
 * Get a specific conversation by id
 */
export async function getConversation(id: number): Promise<Conversation | null> {
  const db = await getDb();
  const results = await db.select("SELECT * FROM conversations WHERE id = $1", [id]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Get forked conversations from a parent conversation
 */
export async function getForkedConversations(parentConversationId: number): Promise<Conversation[]> {
  const db = await getDb();
  return await db.select(
    "SELECT * FROM conversations WHERE parent_conversation_id = $1 ORDER BY created_at",
    [parentConversationId]
  );
}

/**
 * Delete a conversation and its messages
 */
export async function deleteConversation(id: number): Promise<void> {
  const db = await getDb();
  
  // Delete messages first due to foreign key constraint
  await db.execute("DELETE FROM messages WHERE conversation_id = $1", [id]);
  // Then delete the conversation
  await db.execute("DELETE FROM conversations WHERE id = $1", [id]);
}

// ---------- MESSAGE OPERATIONS ----------

/**
 * Add a message to a conversation
 */
export async function addMessage(conversationId: number, content: string, sender: string): Promise<number> {
  const db = await getDb();
  const timestamp = new Date().toISOString();
  
  // Also update the conversation's updated_at timestamp
  await db.execute(
    "UPDATE conversations SET updated_at = $1 WHERE id = $2",
    [timestamp, conversationId]
  );
  
  const result = await db.execute(
    "INSERT INTO messages (conversation_id, content, sender, timestamp) VALUES ($1, $2, $3, $4) RETURNING id",
    [conversationId, content, sender, timestamp]
  );
  
  return result.lastInsertId;
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  return await db.select(
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp",
    [conversationId]
  );
}

/**
 * Get a specific message by id
 */
export async function getMessage(id: number): Promise<Message | null> {
  const db = await getDb();
  const results = await db.select("SELECT * FROM messages WHERE id = $1", [id]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Delete a specific message
 */
export async function deleteMessage(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM messages WHERE id = $1", [id]);
} 