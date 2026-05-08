// DagangCerdas — Firestore Sync Service
// Sinkronisasi data antara SQLite lokal <-> Firebase Firestore cloud
// Hanya sync: products & transactions (chat & group buying tetap lokal)

import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db as firestoreDb } from './config';
import { getDatabase } from '../database/schema';

// ==========================================
// UPLOAD: SQLite → Firestore
// ==========================================

/**
 * Upload semua produk user ke Firestore
 */
export async function uploadProducts(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const products = await sqliteDb.getAllAsync<any>(
      'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (products.length === 0) return 0;

    const batch = writeBatch(firestoreDb);
    
    for (const product of products) {
      const docRef = doc(firestoreDb, `users/${userId}/products`, product.id);
      batch.set(docRef, {
        name: product.name,
        barcode: product.barcode || null,
        category: product.category || 'Lainnya',
        price: product.price,
        costPrice: product.cost_price || 0,
        stock: product.stock,
        minStock: product.min_stock || 5,
        unit: product.unit || 'pcs',
        imageUri: product.image_uri || null,
        isActive: product.is_active === 1,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        deletedAt: product.deleted_at || null,
      });
    }

    await batch.commit();
    console.log(`[Sync] Uploaded ${products.length} products to Firestore`);
    return products.length;
  } catch (error) {
    console.error('[Sync] Upload products error:', error);
    return 0;
  }
}

/**
 * Upload satu produk ke Firestore
 */
export async function uploadSingleProduct(userId: string, productId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const product = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!product) return;

    const docRef = doc(firestoreDb, `users/${userId}/products`, product.id);
    await setDoc(docRef, {
      name: product.name,
      barcode: product.barcode || null,
      category: product.category || 'Lainnya',
      price: product.price,
      costPrice: product.cost_price || 0,
      stock: product.stock,
      minStock: product.min_stock || 5,
      unit: product.unit || 'pcs',
      imageUri: product.image_uri || null,
      isActive: product.is_active === 1,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      deletedAt: product.deleted_at || null,
    });

    console.log(`[Sync] Uploaded product ${product.name} to Firestore`);
  } catch (error) {
    console.error('[Sync] Upload single product error:', error);
  }
}

/**
 * Upload satu transaksi + items ke Firestore
 */
export async function uploadTransaction(
  userId: string,
  transactionId: string
): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    
    const tx = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (!tx) return;

    const items = await sqliteDb.getAllAsync<any>(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      [transactionId]
    );

    // Upload transaction
    const txDocRef = doc(firestoreDb, `users/${userId}/transactions`, tx.id);
    await setDoc(txDocRef, {
      totalAmount: tx.total_amount,
      paymentMethod: tx.payment_method,
      paymentStatus: tx.payment_status,
      customerName: tx.customer_name || null,
      notes: tx.notes || null,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
      deletedAt: tx.deleted_at || null,
    });

    // Upload transaction items
    const batch = writeBatch(firestoreDb);
    for (const item of items) {
      const itemDocRef = doc(
        firestoreDb,
        `users/${userId}/transactions/${tx.id}/items`,
        item.id
      );
      batch.set(itemDocRef, {
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      });
    }
    await batch.commit();

    console.log(`[Sync] Uploaded transaction ${tx.id} with ${items.length} items`);
  } catch (error) {
    console.error('[Sync] Upload transaction error:', error);
  }
}

// ==========================================
// DOWNLOAD: Firestore → SQLite
// ==========================================

/**
 * Download semua produk dari Firestore ke SQLite
 * Menggunakan strategi: cloud data menang (overwrite lokal)
 */
export async function downloadProducts(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const productsRef = collection(firestoreDb, `users/${userId}/products`);
    const snapshot = await getDocs(productsRef);

    if (snapshot.empty) {
      console.log('[Sync] No products in Firestore to download');
      return 0;
    }

    let count = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const id = docSnap.id;

      await sqliteDb.runAsync(
        `INSERT INTO products (id, user_id, name, barcode, category, price, cost_price, stock, min_stock, unit, image_uri, is_active, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         barcode = excluded.barcode,
         category = excluded.category,
         price = excluded.price,
         cost_price = excluded.cost_price,
         stock = excluded.stock,
         min_stock = excluded.min_stock,
         unit = excluded.unit,
         image_uri = excluded.image_uri,
         is_active = excluded.is_active,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
        [
          id,
          userId,
          data.name,
          data.barcode || null,
          data.category || 'Lainnya',
          data.price,
          data.costPrice || 0,
          data.stock,
          data.minStock || 5,
          data.unit || 'pcs',
          data.imageUri || null,
          data.isActive ? 1 : 0,
          data.createdAt,
          data.updatedAt,
          data.deletedAt || null,
        ]
      );
      count++;
    }

    console.log(`[Sync] Downloaded ${count} products from Firestore`);
    return count;
  } catch (error) {
    console.error('[Sync] Download products error:', error);
    return 0;
  }
}

/**
 * Download semua transaksi dari Firestore ke SQLite
 */
export async function downloadTransactions(userId: string): Promise<number> {
  try {
    const sqliteDb = await getDatabase();
    const txRef = collection(firestoreDb, `users/${userId}/transactions`);
    const txQuery = query(txRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(txQuery);

    if (snapshot.empty) {
      console.log('[Sync] No transactions in Firestore to download');
      return 0;
    }

    let count = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const txId = docSnap.id;

      // Insert/update transaction
      await sqliteDb.runAsync(
        `INSERT INTO transactions (id, user_id, total_amount, payment_method, payment_status, customer_name, notes, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         total_amount = excluded.total_amount,
         payment_method = excluded.payment_method,
         payment_status = excluded.payment_status,
         updated_at = excluded.updated_at`,
        [
          txId,
          userId,
          data.totalAmount,
          data.paymentMethod,
          data.paymentStatus || 'selesai',
          data.customerName || null,
          data.notes || null,
          data.createdAt,
          data.updatedAt,
          data.deletedAt || null,
        ]
      );

      // Download transaction items
      const itemsRef = collection(firestoreDb, `users/${userId}/transactions/${txId}/items`);
      const itemsSnapshot = await getDocs(itemsRef);

      for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data();
        
        // Pastikan produk ada di database lokal agar tidak kena error FOREIGN KEY
        try {
          await sqliteDb.runAsync(
            `INSERT INTO products (id, user_id, name, category, price, stock, is_active, created_at, updated_at, deleted_at)
             VALUES (?, ?, ?, 'Lainnya', ?, 0, 0, ?, ?, ?)
             ON CONFLICT(id) DO NOTHING`,
            [
              itemData.productId,
              userId,
              itemData.productName || 'Produk Dihapus',
              itemData.unitPrice || 0,
              Date.now(),
              Date.now(),
              Date.now() // Langsung set deleted_at agar tidak muncul di daftar produk aktif
            ]
          );
        } catch (e) {
          console.warn('[Sync] Info: Placeholder product step failed:', e);
        }

        await sqliteDb.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO NOTHING`,
          [
            itemDoc.id,
            txId,
            itemData.productId,
            itemData.productName,
            itemData.quantity,
            itemData.unitPrice,
            itemData.subtotal,
          ]
        );
      }

      count++;
    }

    console.log(`[Sync] Downloaded ${count} transactions from Firestore`);
    return count;
  } catch (error: any) {
    if (error?.message?.includes('Missing or insufficient permissions')) {
      console.log('[Sync] Download transactions aborted (User logged out)');
    } else {
      console.error('[Sync] Download transactions error:', error);
    }
    return 0;
  }
}

/**
 * Upload user profile data ke Firestore
 */
export async function uploadUserProfile(userId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const user = await sqliteDb.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) return;

    const docRef = doc(firestoreDb, 'users', userId);
    await setDoc(docRef, {
      name: user.name,
      email: user.email,
      businessName: user.business_name || null,
      businessType: user.business_type || null,
      phone: user.phone || null,
      latitude: user.latitude || null,
      longitude: user.longitude || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }, { merge: true });

    console.log('[Sync] Uploaded user profile to Firestore');
  } catch (error) {
    console.error('[Sync] Upload user profile error:', error);
  }
}

/**
 * Download user profile dari Firestore ke SQLite
 */
export async function downloadUserProfile(userId: string): Promise<void> {
  try {
    const sqliteDb = await getDatabase();
    const docRef = doc(firestoreDb, 'users', userId);
    const { getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('[Sync] No user profile in Firestore');
      return;
    }

    const data = docSnap.data();

    await sqliteDb.runAsync(
      `UPDATE users SET 
       business_name = COALESCE(?, business_name),
       business_type = COALESCE(?, business_type),
       phone = COALESCE(?, phone),
       latitude = COALESCE(?, latitude),
       longitude = COALESCE(?, longitude),
       updated_at = ?
       WHERE id = ?`,
      [
        data.businessName || null,
        data.businessType || null,
        data.phone || null,
        data.latitude || null,
        data.longitude || null,
        Date.now(),
        userId,
      ]
    );

    console.log('[Sync] Downloaded user profile from Firestore');
  } catch (error) {
    console.error('[Sync] Download user profile error:', error);
  }
}

// ==========================================
// FULL SYNC
// ==========================================

/**
 * Full sync: upload lokal → cloud, lalu download cloud → lokal
 * Dipanggil saat login atau app dibuka
 */
export async function syncAll(userId: string): Promise<{ uploaded: number; downloaded: number }> {
  console.log('[Sync] Starting full sync for user:', userId);

  try {
    // 1. Upload data lokal ke Firestore terlebih dahulu
    await uploadUserProfile(userId);
    const uploadedProducts = await uploadProducts(userId);

    // 2. Download data dari Firestore ke SQLite
    await downloadUserProfile(userId);
    const downloadedProducts = await downloadProducts(userId);
    const downloadedTransactions = await downloadTransactions(userId);

    const result = {
      uploaded: uploadedProducts,
      downloaded: downloadedProducts + downloadedTransactions,
    };

    console.log(`[Sync] Sync complete — Uploaded: ${result.uploaded}, Downloaded: ${result.downloaded}`);
    return result;
  } catch (error) {
    console.error('[Sync] Full sync error:', error);
    return { uploaded: 0, downloaded: 0 };
  }
}
