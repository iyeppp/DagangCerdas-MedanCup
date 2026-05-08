# DagangCerdas — Solusi Cerdas UMKM Naik Kelas 🚀

DagangCerdas adalah aplikasi manajemen bisnis terintegrasi yang dirancang khusus untuk pelaku UMKM di Kota Medan. Aplikasi ini menggabungkan kekuatan AI, manajemen stok real-time, dan sistem kasir pintar untuk membantu pengusaha lokal mengoptimalkan operasional dan meningkatkan omzet.

## ✨ Fitur Utama

- **🤖 AI Mentor Bisnis (Powered by Groq/Llama 3)**: Asisten AI yang memberikan analisis penjualan mingguan, saran restok produk, dan tips bisnis spesifik untuk pasar Medan.
- **🛒 Smart POS (Kasir Pintar)**: Pencatatan transaksi cepat dengan dukungan scan barcode, manajemen keranjang, dan berbagai metode pembayaran (Tunai, QRIS, Transfer).
- **📦 Manajemen Stok Canggih**: Monitoring persediaan barang dengan notifikasi stok rendah otomatis dan sistem generate barcode EAN-13.
- **👥 Belanja Kolektif**: Fitur inovatif untuk UMKM agar bisa melakukan pembelian stok secara bersama-sama guna mendapatkan harga grosir yang lebih murah.
- **📊 Dashboard KPI**: Visualisasi performa bisnis (Omzet, Profit, Transaksi) dalam bentuk grafik yang mudah dipahami.
- **🔐 Firebase Integration**: Sistem keamanan data menggunakan Google Firebase untuk otentikasi dan penyimpanan data yang sinkron.

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, Expo Router
- **Backend/DB**: Firebase Auth, Firestore
- **AI Engine**: Groq Cloud API (Llama-3.3-70b)
- **Styling**: Vanilla CSS with custom Design System
- **State Management**: Zustand & React Context

## 🚀 Cara Menjalankan

1. **Clone Repository**
   ```bash
   git clone https://github.com/ZeaLIsHere/DagangCerdas-MedanCup.git
   cd DagangCerdas-MedanCup
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi API**
   - Pastikan API Key Groq sudah terpasang di `src/utils/constants.ts`
   - Konfigurasi Firebase di `src/services/firebase/config.ts`

4. **Jalankan Aplikasi**
   ```bash
   npx expo start
   ```
   Gunakan aplikasi **Expo Go** di Android/iOS atau jalankan emulator.

---
**DagangCerdas** — Dibuat untuk **Medan Cup (MCC) 2026**
*Membangun UMKM Digital Menuju Indonesia Emas 2045*
