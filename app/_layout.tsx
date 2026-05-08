// DagangCerdas — Root Layout
// Inisialisasi database, auth, dan navigation

import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { initializeDatabase } from '../src/services/database/schema';
import { onAuthChanged } from '../src/services/firebase/auth';
import { syncAll } from '../src/services/firebase/firestore-sync';
import type { User as FirebaseUser } from 'firebase/auth';
import { useAuthStore } from '../src/stores/authStore';
import { upsertUser, getUserProfile } from '../src/services/database/repository';
import { colors } from '../src/theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary[500],
    secondary: colors.accent[500],
    background: colors.background.primary,
    surface: colors.background.secondary,
    error: colors.error,
  },
};

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const { setUser, isAuthenticated, logout } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function initialize() {
      try {
        await initializeDatabase();
        console.log('[App] Initialization complete');
      } catch (error) {
        console.error('[App] Initialization failed:', error);
      } finally {
        setIsDbReady(true);
      }
    }
    initialize();
  }, []);

  // Use a ref to access isAuthenticated inside the auth listener
  // without adding it to the dependency array (which causes double-registration)
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  useEffect(() => {
    const unsubscribe = onAuthChanged((firebaseUser) => {
      setFbUser(firebaseUser);
      if (firebaseUser) {
        const minimalUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Pengguna UMKM',
          email: firebaseUser.email || '',
        };
        setUser(minimalUser as any);
        upsertUser(minimalUser).catch(e => console.error('[SQLite] Failed to upsert user:', e));
        
        // Auto-sync data dari Firestore ke SQLite saat app dibuka
        syncAll(firebaseUser.uid)
          .then(async () => {
            // Load full profile (with businessName, phone, etc.) from SQLite after sync
            const profile = await getUserProfile(firebaseUser.uid);
            if (profile) {
              setUser({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                businessName: profile.business_name || undefined,
                businessType: profile.business_type || undefined,
                phone: profile.phone || undefined,
                latitude: profile.latitude || undefined,
                longitude: profile.longitude || undefined,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at,
                syncedAt: profile.synced_at || null,
              } as any);
            }
          })
          .catch(e => console.error('[Sync] Auto-sync failed:', e));
      } else if (isAuthenticatedRef.current) {
        // Clear ghost dummy state if firebase is logged out
        logout();
      }
      setIsAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isDbReady || !isAuthReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!fbUser && !inAuthGroup) {
      // Tunggu layout ter-mount sebelum navigasi
      setTimeout(() => router.replace('/(auth)/login'), 1);
    } else if (fbUser && inAuthGroup) {
      setTimeout(() => router.replace('/(tabs)'), 1);
    }
  }, [fbUser, segments, isDbReady, isAuthReady]);

  if (!isDbReady || !isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen 
          name="chat/index" 
          options={{ 
            headerShown: true,
            title: 'AI Asisten Cerdas',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="ai-mentor/index" 
          options={{ 
            headerShown: true,
            title: 'AI Mentor Bisnis',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="transaction/index" 
          options={{ 
            headerShown: true,
            title: 'Riwayat Transaksi',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen 
          name="transaction/[id]" 
          options={{ 
            headerShown: true,
            title: 'Detail Transaksi',
            headerStyle: { backgroundColor: colors.primary[500] },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
});
