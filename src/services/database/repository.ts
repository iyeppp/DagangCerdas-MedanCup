// DagangCerdas — Database Repository (CRUD Operations)

// Use a safe Math.random fallback for UUID to avoid crypto.getRandomValues crash in Expo Go
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

import { getDatabase, initializeDatabase } from './schema';
import type { Product, Transaction, TransactionItem, CartItem, DailySales, SalesSummary } from '../../types';
import { uploadSingleProduct, uploadTransaction as uploadTxToFirestore } from '../firebase/firestore-sync';

// ==========================================
// USERS
// ==========================================

export async function upsertUser(user: { id: string; name: string; email: string }): Promise<void> {
  await initializeDatabase(); // Guarantee tables exist before upserting
  const db = await getDatabase();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO users (id, name, email, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET 
     name = excluded.name, 
     email = excluded.email, 
     updated_at = excluded.updated_at`,
    [user.id, user.name, user.email, now, now]
  );
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; businessName?: string; businessType?: string; phone?: string }
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  const setClause: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
  if (updates.businessName !== undefined) { setClause.push('business_name = ?'); values.push(updates.businessName); }
  if (updates.businessType !== undefined) { setClause.push('business_type = ?'); values.push(updates.businessType); }
  if (updates.phone !== undefined) { setClause.push('phone = ?'); values.push(updates.phone); }

  if (setClause.length === 0) return;

  setClause.push('updated_at = ?');
  values.push(now);
  values.push(userId);

  await db.runAsync(
    `UPDATE users SET ${setClause.join(', ')} WHERE id = ?`,
    values
  );
}

export async function getUserProfile(userId: string): Promise<any | null> {
  const db = await getDatabase();
  return db.getFirstAsync<any>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
}

// ==========================================
// PRODUCTS
// ==========================================

export async function getAllProducts(userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC',
    [userId]
  );
  return rows.map(mapRowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return row ? mapRowToProduct(row) : null;
}

export async function getProductByBarcode(barcode: string, userId: string): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM products WHERE barcode = ? AND user_id = ? AND deleted_at IS NULL',
    [barcode, userId]
  );
  return row ? mapRowToProduct(row) : null;
}

export async function searchProducts(query: string, userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL AND (name LIKE ? OR category LIKE ? OR barcode LIKE ?) ORDER BY name ASC',
    [userId, `%${query}%`, `%${query}%`, `%${query}%`]
  );
  return rows.map(mapRowToProduct);
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Product> {
  const db = await getDatabase();
  const now = Date.now();
  const id = uuidv4();

  await db.runAsync(
    `INSERT INTO products (id, user_id, name, barcode, category, price, cost_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.userId, data.name, data.barcode, data.category, data.price, data.costPrice, data.stock, data.minStock, data.unit, data.imageUri, data.isActive ? 1 : 0, now, now]
  );

  // Add to sync outbox
  await addToOutbox('products', id, 'create', { ...data, id, createdAt: now, updatedAt: now });

  // Sync to Firestore (background, non-blocking)
  uploadSingleProduct(data.userId, id).catch(() => {});

  return { ...data, id, createdAt: now, updatedAt: now, deletedAt: null };
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  const setClause: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
  if (updates.barcode !== undefined) { setClause.push('barcode = ?'); values.push(updates.barcode); }
  if (updates.category !== undefined) { setClause.push('category = ?'); values.push(updates.category); }
  if (updates.price !== undefined) { setClause.push('price = ?'); values.push(updates.price); }
  if (updates.costPrice !== undefined) { setClause.push('cost_price = ?'); values.push(updates.costPrice); }
  if (updates.stock !== undefined) { setClause.push('stock = ?'); values.push(updates.stock); }
  if (updates.minStock !== undefined) { setClause.push('min_stock = ?'); values.push(updates.minStock); }
  if (updates.unit !== undefined) { setClause.push('unit = ?'); values.push(updates.unit); }
  if (updates.imageUri !== undefined) { setClause.push('image_uri = ?'); values.push(updates.imageUri); }
  if (updates.isActive !== undefined) { setClause.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  setClause.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE products SET ${setClause.join(', ')} WHERE id = ?`,
    values
  );

  await addToOutbox('products', id, 'update', { ...updates, updatedAt: now });

  // Sync to Firestore (background, non-blocking)
  // Get userId from the product to sync
  const product = await db.getFirstAsync<any>('SELECT user_id FROM products WHERE id = ?', [id]);
  if (product) uploadSingleProduct(product.user_id, id).catch(() => {});
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  
  // Soft delete
  await db.runAsync(
    'UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );

  await addToOutbox('products', id, 'delete', { deletedAt: now });

  // Sync deletion to Firestore (background, non-blocking)
  const product = await db.getFirstAsync<any>('SELECT user_id FROM products WHERE id = ?', [id]);
  if (product) uploadSingleProduct(product.user_id, id).catch(() => {});
}

export async function getLowStockProducts(userId: string): Promise<Product[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL AND stock <= min_stock AND is_active = 1 ORDER BY stock ASC',
    [userId]
  );
  return rows.map(mapRowToProduct);
}

// ==========================================
// TRANSACTIONS
// ==========================================

export async function createTransaction(
  userId: string,
  cartItems: CartItem[],
  paymentMethod: string,
  customerName?: string,
  notes?: string
): Promise<Transaction> {
  const db = await getDatabase();
  const now = Date.now();
  const transactionId = uuidv4();
  const totalAmount = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  await db.withTransactionAsync(async () => {
    // Insert transaction
    await db.runAsync(
      `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, customer_name, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'selesai', ?, ?, ?, ?)`,
      [transactionId, userId, totalAmount, paymentMethod, customerName || null, notes || null, now, now]
    );

    // Insert transaction items & update stock
    for (const item of cartItems) {
      const itemId = uuidv4();
      const subtotal = item.product.price * item.quantity;

      await db.runAsync(
        `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [itemId, transactionId, item.product.id, item.product.name, item.quantity, item.product.price, subtotal]
      );

      // Reduce stock
      await db.runAsync(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
        [item.quantity, now, item.product.id]
      );
    }
  });

  await addToOutbox('transactions', transactionId, 'create', { totalAmount, paymentMethod, items: cartItems.length });

  // Sync transaction to Firestore (background, non-blocking)
  uploadTxToFirestore(userId, transactionId).catch(() => {});

  return {
    id: transactionId,
    userId,
    totalAmount,
    paymentMethod: paymentMethod as any,
    paymentStatus: 'selesai',
    customerName: customerName || null,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export async function getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM transactions WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows.map(mapRowToTransaction);
}

export async function getTransactionWithItems(transactionId: string): Promise<{ transaction: Transaction; items: TransactionItem[] } | null> {
  const db = await getDatabase();
  
  const txRow = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE id = ?',
    [transactionId]
  );
  
  if (!txRow) return null;

  const itemRows = await db.getAllAsync<any>(
    'SELECT * FROM transaction_items WHERE transaction_id = ?',
    [transactionId]
  );

  return {
    transaction: mapRowToTransaction(txRow),
    items: itemRows.map(mapRowToTransactionItem),
  };
}

// ==========================================
// SALES ANALYTICS
// ==========================================

export async function getDailySales(userId: string, days: number = 7): Promise<DailySales[]> {
  const db = await getDatabase();
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const rows = await db.getAllAsync<any>(
    `SELECT 
       date(created_at / 1000, 'unixepoch', 'localtime') as date,
       SUM(total_amount) as total_amount,
       COUNT(*) as transaction_count
     FROM transactions 
     WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?
     GROUP BY date(created_at / 1000, 'unixepoch', 'localtime')
     ORDER BY date ASC`,
    [userId, startDate]
  );

  return rows.map((row: any) => ({
    date: row.date,
    totalAmount: row.total_amount || 0,
    totalProfit: (row.total_amount || 0) * 0.3, // Estimasi margin 30%
    transactionCount: row.transaction_count || 0,
    itemsSold: 0,
  }));
}

export async function getSalesSummary(userId: string, days: number = 7): Promise<SalesSummary> {
  const db = await getDatabase();
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  // Total summary
  const summary = await db.getFirstAsync<any>(
    `SELECT 
       COALESCE(SUM(total_amount), 0) as total_revenue,
       COUNT(*) as total_transactions
     FROM transactions 
     WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?`,
    [userId, startDate]
  );

  // Top products
  const topProducts = await db.getAllAsync<any>(
    `SELECT 
       ti.product_name as name,
       SUM(ti.quantity) as total_qty,
       SUM(ti.subtotal) as total_revenue
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.created_at >= ?
     GROUP BY ti.product_id
     ORDER BY total_qty DESC
     LIMIT 5`,
    [userId, startDate]
  );

  const dailyTrend = await getDailySales(userId, days);

  const totalRevenue = summary?.total_revenue || 0;
  const totalTransactions = summary?.total_transactions || 0;

  return {
    totalRevenue,
    totalProfit: totalRevenue * 0.3,
    totalTransactions,
    averagePerTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    topProducts: topProducts.map((p: any) => ({
      name: p.name,
      quantity: p.total_qty,
      revenue: p.total_revenue,
    })),
    dailyTrend,
  };
}

export async function getTodaySales(userId: string): Promise<{ revenue: number; profit: number; count: number }> {
  const db = await getDatabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const result = await db.getFirstAsync<any>(
    `SELECT 
       COALESCE(SUM(total_amount), 0) as revenue,
       COUNT(*) as count
     FROM transactions 
     WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?`,
    [userId, todayStart.getTime()]
  );

  return {
    revenue: result?.revenue || 0,
    profit: (result?.revenue || 0) * 0.3,
    count: result?.count || 0,
  };
}

// ==========================================
// SYNC OUTBOX
// ==========================================

async function addToOutbox(tableName: string, recordId: string, operation: string, payload: any): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO sync_outbox (table_name, record_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    [tableName, recordId, operation, JSON.stringify(payload), Date.now()]
  );
}

export async function getPendingSyncItems(): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync('SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 50');
}

export async function removeSyncItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [id]);
}

// ==========================================
// CHAT SESSIONS & MESSAGES 
// ==========================================

export async function createChatSession(userId: string, title: string): Promise<string> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, title, now, now]
  );
  return id;
}

export async function getUserChatSessions(userId: string): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  );
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const db = await getDatabase();
  // Karena ON DELETE CASCADE aktif di schema, pesan di dalamnya akan otomatis terhapus
  await db.runAsync('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
}

export async function updateChatSessionTitle(sessionId: string, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), sessionId]);
}

export async function saveChatMessage(userId: string, sessionId: string, role: string, content: string): Promise<string> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO chat_messages (id, session_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sessionId, userId, role, content, now]
    );
    await db.runAsync(
      'UPDATE chat_sessions SET updated_at = ? WHERE id = ?',
      [now, sessionId]
    );
  });
  return id;
}

export async function getChatHistory(userId: string, sessionId: string, limit: number = 50): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT ?',
    [userId, sessionId, limit]
  );
}

export async function clearChatHistory(userId: string, sessionId?: string): Promise<void> {
  const db = await getDatabase();
  if (sessionId) {
    await db.runAsync('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?', [userId, sessionId]);
  } else {
    await db.runAsync('DELETE FROM chat_messages WHERE user_id = ?', [userId]);
  }
}

// ==========================================
// MAPPERS
// ==========================================

function mapRowToProduct(row: any): Product {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    barcode: row.barcode,
    category: row.category,
    price: row.price,
    costPrice: row.cost_price,
    stock: row.stock,
    minStock: row.min_stock,
    unit: row.unit,
    imageUri: row.image_uri,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    customerName: row.customer_name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapRowToTransactionItem(row: any): TransactionItem {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    subtotal: row.subtotal,
  };
}
