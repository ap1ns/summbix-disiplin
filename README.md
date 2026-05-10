<div align="center">
  <img src="/README.png" width="100%" alt="Summbix Discipline Banner" />

  # ✨ Summbix Discipline
  **Master Your Time. Elevate Your Potential.**

  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

  ---
</div>

## 1. Deskripsi Proyek
**Summbix Discipline** adalah dashboard produktivitas premium yang dirancang untuk membantu pengguna mencapai level disiplin tertinggi. Aplikasi ini menggabungkan estetika *monochrome* minimalis dengan fitur pelacakan waktu, manajemen target (goals), dan analisis perilaku yang mendalam. Dibangun dengan fokus pada performa mobile dan pengalaman pengguna yang fluid.

## 2. Fungsi Utama
Proyek ini dikembangkan untuk memberikan solusi manajemen diri yang komprehensif:
- **Gambaran Umum**: Monitoring progres harian, mingguan, hingga jangka panjang melalui dashboard yang intuitif.
- **Kredensial Proyek**: Sistem mendukung Login reguler, Registrasi dengan OTP, serta mode **Guest** untuk akses cepat tanpa akun.
- **Panduan Penggunaan**: Pengguna dapat memulai dengan membuat *Grand Objective* (Goal), lalu memecahnya menjadi tugas-tugas kecil dan ritual harian (habits).

## 3. Instalasi (Cara Install)
Ikuti langkah-langkah berikut untuk menjalankan proyek di lingkungan lokal Anda:

### Prasyarat
- **Node.js** (LTS)
- **Git**
- **PostgreSQL** (Jika ingin menjalankan backend sendiri)

### Langkah-langkah
1. **Clone Repositori**:
   ```bash
   git clone https://github.com/your-username/summbix-discipline.git
   cd summbix-discipline
   ```

2. **Install Dependensi**:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies (opsional, jika ada folder server)
   cd server && npm install && cd ..
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env` dan isi kredensial database serta API key Anda.

4. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```

## 4. Cara Penggunaan
- **Dashboard**: Gunakan sebagai pusat kendali untuk melihat tugas hari ini dan status goal.
- **Deep Focus**: Aktifkan mode fokus untuk memblokir gangguan dan mendengarkan audio ambient sambil bekerja.
- **Timeline Nexus**: Atur jadwal harian secara kronologis untuk visualisasi waktu yang lebih baik.
- **Analytics Oracle**: Cek statistik progres Anda untuk mengetahui di mana waktu Anda paling banyak dihabiskan.

## 5. Contoh Kode (Core Logic)
Berikut adalah contoh bagaimana aplikasi menangani notifikasi otomatis secara cerdas:

```typescript
// Auto-Notification Trigger Logic
useEffect(() => {
  tasks.forEach(t => {
    if (t.completed && !prevCompletedTasks.current.has(t.id)) {
      addNotification(
        "Mission Accomplished", 
        `Objective "${t.title}" has been successfully completed.`, 
        'task'
      );
    }
  });
}, [tasks]);
```

## 6. Panduan Kontribusi
Kami sangat menghargai kontribusi dari komunitas!
1. Fork repositori ini.
2. Buat branch fitur baru (`git checkout -b fitur-keren`).
3. Commit perubahan Anda (`git commit -m 'Menambah fitur keren'`).
4. Push ke branch tersebut (`git push origin fitur-keren`).
5. Buat Pull Request.

## 7. Pentingnya README di GitHub
Dokumentasi ini dibuat menggunakan format **Markdown (.md)** agar rapi dan mudah dibaca langsung di platform seperti GitHub. **README** adalah elemen vital dalam proyek open-source karena berfungsi sebagai wajah utama repositori, memberikan kesan pertama yang profesional, dan memudahkan pengembang lain untuk berkolaborasi tanpa kebingungan.

---

<div align="center">
  Built with ❤️ for the disciplined by **Summbix Team**.
</div>
