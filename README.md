# DapurQu

PWA ide masak: saran menu dari bahan, resep lengkap dari nama menu, dan jelajah resep.
Stack: Next.js (App Router), Tailwind v4, Firebase Auth + Firestore, Cloudinary, Gemini API.

## Jalankan lokal

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` sudah berisi konfigurasi Firebase dan Cloudinary. Template ada di `.env.example`.

## Checklist Firebase Console (wajib, sekali saja)

1. Authentication > Sign-in method: aktifkan **Email/Password** dan **Google**.
2. Authentication > Settings > Authorized domains: tambahkan domain deploy (misal `dapurqu.vercel.app`). `localhost` sudah ada.
3. Firestore Database: buat database, lalu tempel isi `firestore.rules` di tab Rules dan Publish.

## Checklist Cloudinary

Settings > Upload > Upload presets > `DapurQu` harus bertipe **Unsigned**. Jika Signed, unggah foto akan gagal.

## Struktur data Firestore

```
users/{uid}                       profil (displayName, onboarded, defaultServings, cuisinePref, photoURL)
users/{uid}/recipes/{id}          resep AI (dokumen lengkap) atau penanda resep bawaan {source:"seed", saved, imageUrl}
users/{uid}/private/ai            API key Gemini (hanya bila "Sinkronkan ke akun" aktif)
recipes/{id}                      katalog resep bersama (diedit admin). Hanya status "published" terlihat pengguna
admins/{uid}                      penanda admin, dibuat manual lewat Firebase Console
config/catalog                    { imported: true } setelah resep bawaan diimpor ke katalog
```

## AI (Gemini)

- Panggilan AI dikirim langsung dari browser ke Google memakai API key milik pengguna (diisi di Onboarding atau Pengaturan).
- Model default: `gemini-3.1-flash-lite`. ID model bisa diganti di Pengaturan karena Google rutin mengganti nama model.
- Logika ada di `lib/gemini.ts`.

## Struktur

```
app/(auth)/login, daftar     halaman masuk dan daftar
app/onboarding               3 slide, profil, isi API key
app/(app)/                   Beranda, cari, ai-masak, resep-ai, tersimpan, pengaturan, resep/[id]
components/                  UI, kartu, RecipeView (+ mode memasak), form API key
lib/                         firebase, gemini, cloudinary, context, seed (54 resep bawaan)
public/sw.js                 service worker (aktif di production)
```

## Git

```bash
git init && git add . && git commit -m "init: DapurQu"
```

## Resep bawaan (lib/seed.ts)

54 resep: 7 dari `Resep.pdf` (Royco) dan 47 dari buku *Kumpulan Resep Makanan Barat & Asia* (Natalia & Setiawan, 2022).

- Bahan dan takaran mengikuti sumber. Langkah dari buku ditulis ulang lebih ringkas.
- Resep buku ditandai `estimated: true`: waktu, tingkat kesulitan, dan deskripsi singkat adalah perkiraan.
- Field `note` dipakai untuk bagian yang tidak jelas atau disusun ulang (misalnya langkah Ayam Rica-Rica yang tidak ada di PDF).
- Field `credit` tampil di bawah halaman resep.
- Buku tersebut berhak cipta. Pakai untuk keluarga sendiri. Jangan dipublikasikan luas tanpa izin penerbit.

Format menambah resep: lihat fungsi `R(...)` di atas file seed.

## Dashboard admin (kelola resep tanpa kode)

Alamat: `/admin` (juga ada tombol di Pengaturan bagi akun admin). Dibuat untuk layar desktop.

Menyiapkan admin pertama (sekali saja):

1. Publish ulang `firestore.rules` di Firebase Console (tab Rules).
2. Daftar atau masuk di aplikasi, buka Pengaturan, salin **ID akun (UID)**.
3. Firebase Console, Firestore Database, Start collection `admins`, Document ID = UID tadi, field bebas (mis. `aktif: true`).
4. Muat ulang aplikasi lalu buka `/admin`. Klik **Impor resep bawaan** sekali agar 54 resep bisa diedit.

Fitur: daftar dengan pencarian dan filter, tambah/edit/hapus/duplikat, status Draft atau Published, penanda "sudah dicek", unggah foto ke Cloudinary, pratinjau langsung, isi formulir otomatis dari teks resep (butuh API key Gemini di Pengaturan), ekspor dan impor JSON sebagai cadangan.

Admin lain: tambahkan dokumen `admins/{uid}` baru. Cabut akses: hapus dokumennya.

## Catatan tampilan

Setelah menimpa file proyek, hentikan `npm run dev`, hapus folder `.next` (`rm -rf .next`), lalu jalankan ulang. Tailwind v4 bisa memakai CSS lama dan melewatkan kelas dari file baru kalau server dev tidak di-restart.

## Ikon dan splash screen

Sumber: `public/brand/dapurqu-icon.png` (1080 px). Semua turunan (ikon PWA 192/512/maskable, apple-touch-icon, favicon, logo UI, tanda putih transparan, dan 12 gambar splash iOS di `public/splash/`) dibuat dari file itu.
Android membuat splash dari ikon 512 dan `background_color` di `app/manifest.ts` (#974118). Di UI, logo dipakai lewat `components/Logo.tsx`.
Setelah mengganti ikon di perangkat yang sudah menginstal PWA, hapus lalu pasang ulang PWA agar ikon dan splash lama tidak tertinggal di cache.
