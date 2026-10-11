# Rekon

Aplikasi rekonsiliasi bank dengan frontend statis, Supabase Auth, dan Supabase Postgres. GitHub Actions menerbitkan folder `frontend/` ke GitHub Pages; Node.js tidak diperlukan untuk hosting publik.

## Konfigurasi Supabase

1. Di Supabase **SQL Editor**, jalankan `backend/schema.sql`.
2. Buka **Project Settings → API Keys**, salin **publishable key** (`sb_publishable_...`) atau legacy `anon` key.
3. Tempel key tersebut ke `supabasePublishableKey` di `frontend/config.js`. URL proyek sudah diisi.
4. Di **Authentication → URL Configuration**, atur Site URL dan Redirect URL ke alamat GitHub Pages, misalnya `https://lautlaut.github.io/rekon/`.
5. Aktifkan konfirmasi email di **Authentication → Providers → Email**. Pengguna mendaftar melalui halaman Rekon sebelum masuk.

Publishable/anon key memang terlihat di browser. Perlindungan data dilakukan oleh login dan kebijakan RLS pada empat tabel. **Jangan gunakan `sb_secret_...` atau `service_role` key di frontend maupun GitHub.** Jika key rahasia yang pernah terlihat di screenshot belum diganti, cabut dan buat yang baru di Supabase.

## Deploy ke GitHub Pages

Push perubahan ke repository GitHub. Workflow `.github/workflows/pages.yml` akan menerbitkan frontend secara otomatis. Di repository, buka **Settings → Pages** dan pilih **GitHub Actions** sebagai build and deployment source. URL publik tersedia di halaman Pages setelah workflow berhasil.

## Data lama

Jika skema lama sudah pernah dijalankan, jalankan kembali SQL terbaru. Baris lama yang belum memiliki `user_id` tidak akan terlihat melalui RLS; assign ke akun pemilik yang benar atau hapus setelah membuat backup.

`backend/app.js` adalah server demo lokal lama dan tidak dipakai oleh GitHub Pages. Frontend publik menghubungi Supabase langsung dengan publishable key dan sesi pengguna.