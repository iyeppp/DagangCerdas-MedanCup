// DagangCerdas — Transaction History Screen

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { formatRupiah, formatDate, formatRelativeTime } from '../../src/utils/formatters';
import { useAuthStore } from '../../src/stores/authStore';
import { getTransactions } from '../../src/services/database/repository';
import type { Transaction } from '../../src/types';

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const loadTransactions = useCallback(async () => {
    const userId = user?.id || '';
    if (!userId) return;
    const txs = await getTransactions(userId, 100);
    setTransactions(txs);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  const getPaymentIcon = (method: string) => {
    if (method === 'tunai') return 'cash-outline';
    if (method === 'qris') return 'qr-code-outline';
    return 'phone-portrait-outline';
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'tunai') return 'Tunai';
    if (method === 'qris') return 'QRIS';
    return 'Transfer';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.txCard}
      onPress={() => router.push(`/transaction/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.txLeft}>
        <View style={styles.txIcon}>
          <Ionicons name={getPaymentIcon(item.paymentMethod) as any} size={20} color={colors.primary[600]} />
        </View>
        <View>
          <Text style={styles.txAmount}>{formatRupiah(item.totalAmount)}</Text>
          <Text style={styles.txMeta}>
            {getPaymentLabel(item.paymentMethod)} • {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txTime}>{formatDate(item.createdAt, 'time')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  // Group by date
  const groupedByDate = transactions.reduce((groups: Record<string, Transaction[]>, tx) => {
    const dateKey = formatDate(tx.createdAt, 'long');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {});

  const sections = Object.entries(groupedByDate);

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={([date]) => date}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />}
        renderItem={({ item: [date, txs] }) => (
          <View style={styles.dateSection}>
            <Text style={styles.dateHeader}>{date}</Text>
            {txs.map((tx) => (
              <View key={tx.id}>
                {renderTransaction({ item: tx })}
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  list: { padding: spacing.lg, paddingBottom: 100 },
  dateSection: { marginBottom: spacing.xl },
  dateHeader: {
    ...typography.labelSm, color: colors.text.tertiary,
    marginBottom: spacing.sm, paddingLeft: spacing.xs,
  },
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.sm, ...shadows.sm,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  txAmount: { ...typography.label, color: colors.text.primary },
  txMeta: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  txRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  txTime: { ...typography.caption, color: colors.text.tertiary },
  emptyState: { alignItems: 'center', paddingVertical: spacing['5xl'] },
  emptyText: { ...typography.body, color: colors.text.tertiary, marginTop: spacing.md },
});
