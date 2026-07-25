/**
 * Calculations Module - Sistem Tes Kebugaran PPG
 * Berisi semua rumus perhitungan
 */

const Calculations = {
    /**
     * Menghitung usia dari tanggal lahir
     * @param {string} tglLahir - Format: YYYY-MM-DD
     * @returns {number} Usia dalam tahun
     */
    hitungUsia(tglLahir) {
        const lahir = new Date(tglLahir);
        const today = new Date();
        let usia = today.getFullYear() - lahir.getFullYear();
        const bulanDiff = today.getMonth() - lahir.getMonth();
        if (bulanDiff < 0 || (bulanDiff === 0 && today.getDate() < lahir.getDate())) {
            usia--;
        }
        return usia;
    },

    /**
     * Rumus Rockport 1-Mile Walk Test (Estimasi VO2Max)
     * VO2Max = 132.853 - (0.0769 * Berat_Lbs) - (0.3877 * Usia) + (6.315 * Gender)
     *          - (3.2649 * Waktu_Desimal) - (0.1565 * HR)
     * 
     * @param {number} beratKg - Berat badan dalam kg
     * @param {number} usia - Usia dalam tahun
     * @param {number} gender - 1 (Pria), 0 (Wanita)
     * @param {number} waktuMenit - Waktu dalam menit
     * @param {number} waktuDetik - Sisa waktu dalam detik
     * @param {number} hr - Denyut jantung (BPM)
     * @returns {number} VO2Max
     */
    hitungVO2Max(beratKg, usia, gender, waktuMenit, waktuDetik, hr) {
        // Konversi berat ke lbs
        const beratLbs = beratKg * 2.20462;
        
        // Konversi waktu ke desimal (menit + detik/60)
        const waktuDesimal = waktuMenit + (waktuDetik / 60);
        
        // Rumus Rockport
        const vo2max = 132.853 
            - (0.0769 * beratLbs) 
            - (0.3877 * usia) 
            + (6.315 * gender) 
            - (3.2649 * waktuDesimal) 
            - (0.1565 * hr);
        
        return Math.round(vo2max * 100) / 100;
    },

    /**
     * Menentukan Kategori Kebugaran VO2Max berdasarkan norma ACSM
     * @param {number} vo2max - Nilai VO2Max
     * @param {number} usia - Usia dalam tahun
     * @param {number} gender - 1 (Pria), 0 (Wanita)
     * @returns {string} Kategori kebugaran
     */
    getKategoriKebugaran(vo2max, usia, gender) {
        // Tabel norma ACSM (nilai ambang batas)
        // Format: { usia_min, usia_max, pria: {istimewa, sangat_baik, baik, sedang, kurang}, wanita: {...} }
        const norma = [
            // Usia 20-29
            { usiaMin: 20, usiaMax: 29, pria: [51.5, 48.2, 45.1, 41.0, 38.5], wanita: [44.2, 41.0, 37.5, 34.0, 31.0] },
            // Usia 30-39
            { usiaMin: 30, usiaMax: 39, pria: [48.5, 45.0, 42.5, 38.5, 35.5], wanita: [42.0, 38.5, 35.5, 32.0, 29.0] },
            // Usia 40-49
            { usiaMin: 40, usiaMax: 49, pria: [47.0, 43.5, 40.0, 36.5, 33.5], wanita: [40.0, 36.5, 33.0, 30.0, 27.0] },
            // Usia 50-59
            { usiaMin: 50, usiaMax: 59, pria: [45.0, 41.0, 37.5, 34.0, 31.0], wanita: [38.0, 34.5, 31.0, 28.0, 25.5] },
            // Usia 60+
            { usiaMin: 60, usiaMax: 100, pria: [43.0, 39.5, 36.0, 32.5, 29.5], wanita: [36.5, 33.0, 29.5, 26.5, 24.0] }
        ];

        // Cari rentang usia yang sesuai
        let ambangBatas = norma.find(n => usia >= n.usiaMin && usia <= n.usiaMax);
        
        // Default jika usia di luar range
        if (!ambangBatas) {
            ambangBatas = usia < 20 ? norma[0] : norma[norma.length - 1];
        }

        const batas = gender === 1 ? ambangBatas.pria : ambangBatas.wanita;

        // Tentukan kategori berdasarkan nilai ambang batas
        // batas[0] = Istimewa, batas[1] = Sangat Baik, batas[2] = Baik, batas[3] = Sedang, batas[4] = Kurang
        if (vo2max >= batas[0]) {
            return 'Istimewa';
        } else if (vo2max >= batas[1]) {
            return 'Sangat Baik';
        } else if (vo2max >= batas[2]) {
            return 'Baik';
        } else if (vo2max >= batas[3]) {
            return 'Sedang';
        } else if (vo2max >= batas[4]) {
            return 'Kurang';
        } else {
            return 'Kurang Sekali';
        }
    },

    /**
     * Menghitung IMT (Indeks Massa Tubuh)
     * IMT = Berat (kg) / (Tinggi (m))^2
     * 
     * @param {number} beratKg - Berat badan dalam kg
     * @param {number} tinggiCm - Tinggi badan dalam cm
     * @returns {number} Nilai IMT
     */
    hitungIMT(beratKg, tinggiCm) {
        const tinggiM = tinggiCm / 100;
        const imt = beratKg / (tinggiM * tinggiM);
        return Math.round(imt * 10) / 10;
    },

    /**
     * Klasifikasi IMT berdasarkan WHO
     * @param {number} imt - Nilai IMT
     * @returns {string} Kategori IMT
     */
    getKategoriIMT(imt) {
        if (imt < 18.5) {
            return 'Kurus';
        } else if (imt < 25) {
            return 'Normal';
        } else if (imt < 30) {
            return 'Gemuk';
        } else {
            return 'Obesitas';
        }
    },

    truncateMinutes(min) {
        if (min > 180) return 180;
        if (min < 10) return 0;
        return min;
    },

    hitungIPAQ(v_days, v_min, m_days, m_min, w_days, w_min) {
        const v_min_t = this.truncateMinutes(v_min);
        const m_min_t = this.truncateMinutes(m_min);
        const w_min_t = this.truncateMinutes(w_min);

        const met_vigorous = 8.0 * v_min_t * v_days;
        const met_moderate = 4.0 * m_min_t * m_days;
        const met_walking = 3.3 * w_min_t * w_days;
        const total_met = met_vigorous + met_moderate + met_walking;
        const total_days = v_days + m_days + w_days;

        let kategori;
        if ((v_days >= 3 && total_met >= 1500) || (total_days >= 7 && total_met >= 3000)) {
            kategori = 'Tinggi (Aktif)';
        } else if (
            (v_days >= 3 && v_min_t >= 20) ||
            (m_min_t >= 30 && w_min_t >= 30 && (m_days + w_days) >= 5) ||
            (m_min_t >= 30 && m_days >= 5) ||
            (w_min_t >= 30 && w_days >= 5) ||
            (total_days >= 5 && total_met >= 600)
        ) {
            kategori = 'Sedang';
        } else {
            kategori = 'Rendah (Kurang Aktif)';
        }

        return { total_met: Math.round(total_met), kategori };
    },

    /**
     * Mendapatkan warna badge berdasarkan kategori
     * @param {string} kategori 
     * @returns {string} CSS class Bootstrap
     */
    getBadgeColor(kategori) {
        const colors = {
            'Istimewa': 'bg-success',
            'Sangat Baik': 'bg-info',
            'Baik': 'bg-primary',
            'Sedang': 'bg-warning text-dark',
            'Kurang': 'bg-orange',
            'Kurang Sekali': 'bg-danger',
            'Kurus': 'bg-info',
            'Normal': 'bg-success',
            'Gemuk': 'bg-warning text-dark',
            'Obesitas': 'bg-danger'
        };
        return colors[kategori] || 'bg-secondary';
    },

    /**
     * Mendapatkan saran berdasarkan kategori kebugaran dan IMT
     * @param {string} kategoriKebugaran 
     * @param {string} kategoriIMT 
     * @returns {string} Saran
     */
    getSaran(kategoriKebugaran, kategoriIMT) {
        let saran = '<h5>Saran Kebugaran</h5>';
        
        // Saran berdasarkan kategori kebugaran
        saran += '<h6 class="mt-3">Berdasarkan Tingkat Kebugaran:</h6>';
        switch (kategoriKebugaran) {
            case 'Istimewa':
                saran += '<p class="text-success"><strong>Istimewa!</strong> Tingkat kebugaran Anda luar biasa. Pertahankan dengan rutin berolahraga minimal 150 menit per minggu dengan intensitas sedang hingga tinggi.</p>';
                break;
            case 'Sangat Baik':
                saran += '<p class="text-info"><strong>Sangat Baik!</strong> Kebugaran Anda di atas rata-rata. Untuk meningkatkan lagi, coba tambah variasi latihan seperti interval training.</p>';
                break;
            case 'Baik':
                saran += '<p class="text-primary"><strong>Baik!</strong> Kebugaran Anda dalam kategori baik. Tingkatkan dengan rutin berjalan cepat, bersepeda, atau berenang minimal 30 menit per hari.</p>';
                break;
            case 'Sedang':
                saran += '<p class="text-warning"><strong>Sedang.</strong> Ada ruang untuk peningkatan. Mulai dengan berjalan kaki 20-30 menit per hari, naikkan intensitas secara bertahap.</p>';
                break;
            case 'Kurang':
                saran += '<p class="text-orange"><strong>Kurang.</strong> Kebugaran Anda perlu ditingkatkan. Mulai dengan aktivitas ringan seperti berjalan kaki 15-20 menit per hari dan tingkatkan secara bertahap.</p>';
                break;
            case 'Kurang Sekali':
                saran += '<p class="text-danger"><strong>Kurang Sekali.</strong> Kebugaran Anda dalam kategori rendah. Konsultasikan dengan dokter sebelum memulai program olahraga. Mulai dengan aktivitas sangat ringan seperti berjalan pelan.</p>';
                break;
        }

        // Saran berdasarkan kategori IMT
        saran += '<h6 class="mt-3">Berdasarkan Indeks Massa Tubuh (IMT):</h6>';
        switch (kategoriIMT) {
            case 'Kurus':
                saran += '<p class="text-info">IMT Anda menunjukkan berat badan kurang. Tingkatkan asupan makanan bergizi seimbang dengan porsi yang cukup. Konsultasikan dengan ahli gizi untuk pola makan yang tepat.</p>';
                break;
            case 'Normal':
                saran += '<p class="text-success">IMT Anda normal. Pertahankan pola makan seimbang dan rutin berolahraga untuk menjaga kesehatan optimal.</p>';
                break;
            case 'Gemuk':
                saran += '<p class="text-warning">IMT Anda menunjukkan overweight. Kurangi asupan makanan tinggi kalori, perbanyak sayur dan buah, serta tingkatkan aktivitas fisik.</p>';
                break;
            case 'Obesitas':
                saran += '<p class="text-danger">IMT Anda menunjukkan obesitas. Sangat disarankan untuk berkonsultasi dengan dokter atau ahli gizi. Mulai program penurunan berat badan secara sehat dan bertahap.</p>';
                break;
        }

        // Tips umum
        saran += '<h6 class="mt-3">Tips Umum:</h6>';
        saran += '<ul>';
        saran += '<li>Rutin berolahraga minimal 150 menit per minggu</li>';
        saran += '<li>Perbanyak konsumsi sayur dan buah</li>';
        saran += '<li>Kurangi makanan tinggi gula dan lemak</li>';
        saran += '<li>Minum air putih minimal 8 gelas per hari</li>';
        saran += '<li>Istirahat yang cukup (7-8 jam per hari)</li>';
        saran += '</ul>';

        return saran;
    },

    /**
     * Mendapatkan warna untuk kategori kebugaran di chart
     * @param {string} kategori 
     * @returns {string} Warna hex
     */
    getChartColor(kategori) {
        const colors = {
            'Istimewa': '#198754',
            'Sangat Baik': '#20c997',
            'Baik': '#0d6efd',
            'Sedang': '#ffc107',
            'Kurang': '#fd7e14',
            'Kurang Sekali': '#dc3545'
        };
        return colors[kategori] || '#6c757d';
    },

    /**
     * Mendapatkan warna untuk kategori IMT di chart
     * @param {string} kategori 
     * @returns {string} Warna hex
     */
    getChartColorBMI(kategori) {
        const colors = {
            'Kurus': '#0dcaf0',
            'Normal': '#198754',
            'Gemuk': '#ffc107',
            'Obesitas': '#dc3545'
        };
        return colors[kategori] || '#6c757d';
    }
};

// Export untuk penggunaan di modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculations;
}
