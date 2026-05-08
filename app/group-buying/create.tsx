import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { createGroupOrder } from '../../src/services/database/repository';
import { uploadGroupOrder } from '../../src/services/firebase/firestore-sync';
import type { GroupOrder } from '../../src/types/groupBuying';

export default function CreateGroupOrderScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!productName.trim() || !targetQuantity || !wholesalePrice || !retailPrice) {
      Alert.alert('Error', 'Harap isi semua kolom wajib (*)');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Sesi anda telah berakhir');
      return;
    }

    setIsLoading(true);

    try {
      const orderId = Crypto.randomUUID();
      const now = Date.now();
      // Deadline default: 7 hari dari sekarang
      const deadline = now + (7 * 24 * 60 * 60 * 1000); 

      const newOrder: GroupOrder = {
        id: orderId,
        initiatorId: user.id,
        initiatorName: user.businessName || user.name || 'UMKM',
        productName: productName.trim(),
        description: description.trim(),
        targetQuantity: parseInt(targetQuantity, 10),
        currentQuantity: 0, // Belum ada yang join saat awal dibuat, atau initiator otomatis ikut? (Bisa dihandle nanti)
        wholesalePrice: parseFloat(wholesalePrice),
        retailPrice: parseFloat(retailPrice),
        vendorName: vendorName.trim() || 'Vendor Tidak Disebutkan',
        vendorId: 'vendor-custom', // dummy vendor id
        hubLatitude: user.latitude || 3.5952,
        hubLongitude: user.longitude || 98.6722,
        hubAddress: 'Lokasi UMKM ' + (user.businessName || user.name),
        radiusKm: 5,
        status: 'terbuka',
        deadline: deadline,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Simpan ke SQLite lokal
      await createGroupOrder(newOrder);

      // 2. Upload ke Firestore
      await uploadGroupOrder(orderId);

      Alert.alert('Berhasil', 'Order Kolektif berhasil dibuat! UMKM sekitar kini dapat bergabung.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to create group order:', error);
      Alert.alert('Error', 'Gagal membuat order kolektif. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buat Order Kolektif</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionDesc}>
            Ajak UMKM lain di sekitar Anda untuk patungan membeli produk dalam jumlah besar guna mendapatkan harga distributor.
          </Text>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Contoh: Kopi Bubuk Asli 1 Kg"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deskripsi Singkat</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Jelaskan spesifikasi atau merek produk..."
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.label}>Target Kuantitas *</Text>
              <TextInput
                style={styles.input}
                value={targetQuantity}
                onChangeText={setTargetQuantity}
                placeholder="Mis: 100"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.label}>Nama Vendor</Text>
              <TextInput
                style={styles.input}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Mis: Distributor X"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga Eceran (Per Unit) *</Text>
            <TextInput
              style={styles.input}
              value={retailPrice}
              onChangeText={setRetailPrice}
              placeholder="Rp 0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimasi Harga Grosir (Per Unit) *</Text>
            <TextInput
              style={styles.input}
              value={wholesalePrice}
              onChangeText={setWholesalePrice}
              placeholder="Rp 0"
              keyboardType="numeric"
            />
          </View>

        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Menyimpan...' : 'Buat Order Kolektif'}
          </Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  backButton: { padding: spacing.xs },
  headerTitle: { ...typography.h4, color: colors.text.primary },
  
  scrollContent: { flex: 1, padding: spacing.lg },
  
  formSection: {
    backgroundColor: '#FFFFFF', padding: spacing.lg,
    borderRadius: borderRadius.lg, ...shadows.sm,
  },
  sectionDesc: {
    ...typography.bodySm, color: colors.text.secondary,
    marginBottom: spacing.xl, lineHeight: 20,
  },
  
  inputGroup: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm },
  input: {
    ...typography.body, color: colors.text.primary,
    backgroundColor: colors.neutral[50], borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  row: { flexDirection: 'row' },

  saveButton: {
    marginTop: spacing.xl, backgroundColor: colors.primary[500], 
    paddingVertical: spacing.lg, borderRadius: borderRadius.md, 
    alignItems: 'center', ...shadows.sm,
  },
  saveButtonDisabled: { backgroundColor: colors.primary[300] },
  saveButtonText: { ...typography.button, color: '#FFFFFF' },
});
