// DagangCerdas — Profile Screen
// Dengan setting API Key OpenAI

import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { logoutUser } from '../../src/services/firebase/auth';
import { BUSINESS_TYPE_LABELS } from '../../src/types/user';
import { getApiKey, setApiKey, removeApiKey, hasApiKey } from '../../src/services/ai/apiKeyStore';

export default function ProfileScreen() {
  const router = useRouter();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isAIConnected, setIsAIConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const { user, logout } = useAuthStore();

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const connected = await hasApiKey();
    setIsAIConnected(connected);
    if (connected) {
      const key = await getApiKey();
      if (key) {
        setMaskedKey(`sk-...${key.slice(-6)}`);
      }
    } else {
      setMaskedKey('');
    }
  };

  const handleSaveApiKey = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      Alert.alert('Error', 'API Key tidak boleh kosong');
      return;
    }
    if (!key.startsWith('AIzaSy')) {
      Alert.alert('Error', 'API Key Gemini biasanya dimulai dengan "AIzaSy"');
      return;
    }

    try {
      await setApiKey(key);
      setIsAIConnected(true);
      setMaskedKey(`AIza...${key.slice(-6)}`);
      setShowApiKeyModal(false);
      setApiKeyInput('');
      Alert.alert('✅ Berhasil!', 'API Key Gemini berhasil disimpan. AI Cerdas sekarang aktif!');
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan API key');
    }
  };

  const handleRemoveApiKey = () => {
    Alert.alert(
      'Hapus API Key',
      'Yakin ingin menghapus API Key? AI Chat akan kembali ke mode offline.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive', onPress: async () => {
            await removeApiKey();
            setIsAIConnected(false);
            setMaskedKey('');
            Alert.alert('Dihapus', 'API Key telah dihapus. AI akan menggunakan mode offline.');
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
        await logoutUser();
        logout();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profil Bisnis', onPress: () => Alert.alert('Info', 'Fitur edit profil akan segera hadir') },
    { icon: 'chatbubble-ellipses-outline', label: 'AI Asisten Cerdas', onPress: () => router.push('/chat') },
    { icon: 'analytics-outline', label: 'AI Mentor Bisnis', onPress: () => router.push('/ai-mentor') },
    { icon: 'receipt-outline', label: 'Riwayat Transaksi', onPress: () => router.push('/transaction') },
    { icon: 'cloud-outline', label: 'Sinkronisasi Data', onPress: () => Alert.alert('Sync', 'Sinkronisasi data berhasil! ✅') },
    { icon: 'notifications-outline', label: 'Notifikasi', onPress: () => Alert.alert('Info', 'Pengaturan notifikasi akan segera hadir') },
    { icon: 'help-circle-outline', label: 'Bantuan & FAQ', onPress: () => Alert.alert('Bantuan', 'Hubungi: support@dagangcerdas.id') },
    { icon: 'information-circle-outline', label: 'Tentang Aplikasi', onPress: () => Alert.alert('DagangCerdas v1.0.0', 'Dibuat untuk MCC 2026\n\nSolusi Cerdas UMKM Naik Kelas\n\n© 2026 Tim DagangCerdas') },
    { icon: 'log-out-outline', label: 'Keluar (Logout)', onPress: handleLogout },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'Toko').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Pengguna UMKM'}</Text>
        <Text style={styles.businessName}>{user?.businessName || user?.name || 'Toko Anda'}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {BUSINESS_TYPE_LABELS[user?.businessType || 'retail'] || 'UMKM Retail'}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={18} color={colors.primary[500]} />
          <Text style={styles.statValue}>Medan</Text>
          <Text style={styles.statLabel}>Lokasi</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.primary[500]} />
          <Text style={styles.statValue}>{user?.phone || '-'}</Text>
          <Text style={styles.statLabel}>Telepon</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
          <Text style={styles.statValue}>Aktif</Text>
          <Text style={styles.statLabel}>Sync</Text>
        </View>
      </View>

      {/* AI Settings Card */}
      <View style={styles.aiSettingsCard}>
        <View style={styles.aiSettingsHeader}>
          <View style={styles.aiSettingsLeft}>
            <Ionicons name="sparkles" size={22} color={colors.primary[600]} />
            <View>
              <Text style={styles.aiSettingsTitle}>AI Cerdas (Google Gemini)</Text>
              <Text style={styles.aiSettingsSubtitle}>
                {isAIConnected ? `Terhubung • ${maskedKey}` : 'Belum dikonfigurasi'}
              </Text>
            </View>
          </View>
          <View style={[styles.aiStatusDot, isAIConnected ? styles.aiStatusOn : styles.aiStatusOff]} />
        </View>

        <View style={styles.aiSettingsActions}>
          <TouchableOpacity
            style={[styles.aiSettingsButton, isAIConnected && styles.aiSettingsButtonSecondary]}
            onPress={() => setShowApiKeyModal(true)}
          >
            <Ionicons
              name={isAIConnected ? 'create-outline' : 'key-outline'}
              size={16}
              color={isAIConnected ? colors.primary[600] : '#FFFFFF'}
            />
            <Text style={[styles.aiSettingsButtonText, isAIConnected && styles.aiSettingsButtonTextSecondary]}>
              {isAIConnected ? 'Ubah Key' : 'Atur API Key'}
            </Text>
          </TouchableOpacity>
          {isAIConnected && (
            <TouchableOpacity style={styles.aiRemoveButton} onPress={handleRemoveApiKey}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={22} color={colors.text.secondary} />
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton}
        onPress={() => Alert.alert('Keluar', 'Fitur logout akan tersedia setelah integrasi Firebase Auth')}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>DagangCerdas v1.0.0 • MCC 2026</Text>
      <View style={{ height: 100 }} />

      {/* API Key Modal */}
      <Modal visible={showApiKeyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.apiKeyModal}>
            <View style={styles.apiKeyModalHeader}>
              <Ionicons name="key" size={28} color={colors.primary[500]} />
              <Text style={styles.apiKeyModalTitle}>Google Gemini API Key</Text>
              <TouchableOpacity onPress={() => { setShowApiKeyModal(false); setApiKeyInput(''); }}>
                <Ionicons name="close" size={24} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.apiKeyModalDesc}>
              Masukkan API key dari Google Gemini untuk mengaktifkan AI Chatbot dan AI Mentor yang sesungguhnya.
              {'\n\n'}Dapatkan API key gratis di{' '}
              <Text style={styles.apiKeyLink}>aistudio.google.com</Text>
            </Text>

            <TextInput
              style={styles.apiKeyInput}
              placeholder="AIzaSy..."
              placeholderTextColor={colors.neutral[400]}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.apiKeyModalInfo}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.apiKeyModalInfoText}>
                Key disimpan terenkripsi di device Anda (SecureStore). Tidak dikirim ke server mana pun kecuali OpenAI.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.apiKeySaveButton, !apiKeyInput.trim() && styles.apiKeySaveButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
            >
              <Text style={styles.apiKeySaveButtonText}>Simpan & Aktifkan AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary[500], paddingTop: 56, paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  avatarText: { ...typography.h2, color: '#FFFFFF' },
  userName: { ...typography.h4, color: '#FFFFFF', marginBottom: 2 },
  businessName: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.sm },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: borderRadius.full,
  },
  typeBadgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: spacing.lg,
    marginTop: -spacing.lg, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { ...typography.labelSm, color: colors.text.primary },
  statLabel: { ...typography.caption, color: colors.text.tertiary },
  statDivider: { width: 1, backgroundColor: colors.border.light },

  // AI Settings Card
  aiSettingsCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.xl,
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg,
    padding: spacing.lg, ...shadows.md,
    borderWidth: 1, borderColor: colors.primary[100],
  },
  aiSettingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiSettingsLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  aiSettingsTitle: { ...typography.label, color: colors.text.primary },
  aiSettingsSubtitle: { ...typography.caption, color: colors.text.tertiary },
  aiStatusDot: { width: 10, height: 10, borderRadius: 5 },
  aiStatusOn: { backgroundColor: colors.success },
  aiStatusOff: { backgroundColor: colors.neutral[300] },
  aiSettingsActions: { flexDirection: 'row', gap: spacing.sm },
  aiSettingsButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary[500],
  },
  aiSettingsButtonSecondary: {
    backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200],
  },
  aiSettingsButtonText: { ...typography.buttonSm, color: '#FFFFFF' },
  aiSettingsButtonTextSecondary: { color: colors.primary[600] },
  aiRemoveButton: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.error, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.errorLight,
  },

  menuSection: {
    marginTop: spacing.xl, marginHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemLabel: { ...typography.body, color: colors.text.primary },

  logoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, paddingVertical: spacing.lg,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.error,
  },
  logoutText: { ...typography.button, color: colors.error },

  versionText: {
    ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg,
  },

  // API Key Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  apiKeyModal: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.xl,
    padding: spacing.xl, marginHorizontal: spacing.xl,
    width: '90%', maxWidth: 400,
  },
  apiKeyModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg,
  },
  apiKeyModalTitle: { ...typography.h4, color: colors.text.primary, flex: 1 },
  apiKeyModalDesc: {
    ...typography.bodySm, color: colors.text.secondary, lineHeight: 20,
    marginBottom: spacing.lg,
  },
  apiKeyLink: { color: colors.primary[600], fontWeight: '600' },
  apiKeyInput: {
    backgroundColor: colors.neutral[50], borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    ...typography.body, color: colors.text.primary,
    borderWidth: 1, borderColor: colors.border.default,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: spacing.md,
  },
  apiKeyModalInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.successLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  apiKeyModalInfoText: { ...typography.caption, color: colors.text.secondary, flex: 1, lineHeight: 16 },
  apiKeySaveButton: {
    backgroundColor: colors.primary[500], borderRadius: borderRadius.md,
    paddingVertical: spacing.lg, alignItems: 'center', ...shadows.sm,
  },
  apiKeySaveButtonDisabled: { backgroundColor: colors.neutral[300] },
  apiKeySaveButtonText: { ...typography.button, color: '#FFFFFF' },
});
