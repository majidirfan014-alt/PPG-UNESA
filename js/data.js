/**
 * Data Management Module - Sistem Tes Kebugaran PPG
 * Mengelola data menggunakan localStorage
 */

const DataStore = {
    STORAGE_KEY: 'ppg_fitness_data',
    
    /**
     * Mendapatkan semua data peserta
     * @returns {Array} Array objek peserta
     */
    getAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Menyimpan semua data
     * @param {Array} data 
     */
    saveAll(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Menambah data peserta baru
     * @param {Object} peserta 
     * @returns {Object} Data peserta yang sudah ditambahkan
     */
    add(peserta) {
        const data = this.getAll();
        peserta.id = Date.now(); // ID unik
        peserta.createdAt = new Date().toISOString();
        data.push(peserta);
        this.saveAll(data);
        return peserta;
    },

    /**
     * Update data peserta
     * @param {number} id 
     * @param {Object} updatedData 
     * @returns {Object|null}
     */
    update(id, updatedData) {
        const data = this.getAll();
        const index = data.findIndex(p => p.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedData, updatedAt: new Date().toISOString() };
            this.saveAll(data);
            return data[index];
        }
        return null;
    },

    /**
     * Hapus data peserta
     * @param {number} id 
     * @returns {boolean}
     */
    delete(id) {
        const data = this.getAll();
        const filtered = data.filter(p => p.id !== id);
        if (filtered.length !== data.length) {
            this.saveAll(filtered);
            return true;
        }
        return false;
    },

    /**
     * Mendapatkan data peserta berdasarkan ID
     * @param {number} id 
     * @returns {Object|null}
     */
    getById(id) {
        const data = this.getAll();
        return data.find(p => p.id === id) || null;
    },

    /**
     * Menghapus semua data
     */
    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Mendapatkan jumlah total peserta
     * @returns {number}
     */
    getCount() {
        return this.getAll().length;
    },

    /**
     * Menghitung rata-rata VO2Max
     * @returns {number}
     */
    getAvgVO2Max() {
        const data = this.getAll();
        if (data.length === 0) return 0;
        const total = data.reduce((sum, p) => sum + (p.vo2max || 0), 0);
        return Math.round((total / data.length) * 100) / 100;
    },

    /**
     * Menghitung rata-rata IMT
     * @returns {number}
     */
    getAvgBMI() {
        const data = this.getAll();
        if (data.length === 0) return 0;
        const total = data.reduce((sum, p) => sum + (p.imt || 0), 0);
        return Math.round((total / data.length) * 10) / 10;
    },

    /**
     * Menghitung rata-rata HR
     * @returns {number}
     */
    getAvgHR() {
        const data = this.getAll();
        if (data.length === 0) return 0;
        const total = data.reduce((sum, p) => sum + (p.hr || 0), 0);
        return Math.round(total / data.length);
    },

    /**
     * Mendapatkan distribusi kategori IMT
     * @returns {Object} { label: count }
     */
    getBMIDistribution() {
        const data = this.getAll();
        const dist = { 'Kurus': 0, 'Normal': 0, 'Gemuk': 0, 'Obesitas': 0 };
        data.forEach(p => {
            if (p.kategoriIMT) {
                dist[p.kategoriIMT] = (dist[p.kategoriIMT] || 0) + 1;
            }
        });
        return dist;
    },

    /**
     * Mendapatkan distribusi kategori VO2Max
     * @returns {Object} { label: count }
     */
    getVO2Distribution() {
        const data = this.getAll();
        const dist = { 'Istimewa': 0, 'Sangat Baik': 0, 'Baik': 0, 'Sedang': 0, 'Kurang': 0, 'Kurang Sekali': 0 };
        data.forEach(p => {
            if (p.kategoriKebugaran) {
                dist[p.kategoriKebugaran] = (dist[p.kategoriKebugaran] || 0) + 1;
            }
        });
        return dist;
    },

    /**
     * Mendapatkan Top ranking berdasarkan VO2Max
     * @param {number} limit 
     * @returns {Array}
     */
    getTopRanking(limit = 10) {
        const data = this.getAll();
        return data
            .sort((a, b) => (b.vo2max || 0) - (a.vo2max || 0))
            .slice(0, limit);
    },

    /**
     * Import data dari array (hasil parsing Excel)
     * @param {Array} importData 
     */
    importFromExcel(importData) {
        const data = this.getAll();
        
        importData.forEach(item => {
            // Proses data sesuai format kolom Excel
            const tglLahir = item['Tanggal Lahir'] || item['tgl_lahir'] || '';
            const usia = tglLahir ? Calculations.hitungUsia(tglLahir) : (item['Usia'] || 0);
            const genderStr = String(item['Jenis Kelamin'] || item['jenis_kelamin'] || item['jk'] || item['JK'] || '').trim().toUpperCase();
            const gender = (genderStr === 'L' || genderStr === 'LAKI-LAKI' || genderStr === 'LAKI' || genderStr === '1' || genderStr === 'PRIA') ? 1 : 0;
            const bb = parseFloat(item['Berat Badan'] || item['bb'] || 0);
            const tb = parseFloat(item['Tinggi Badan'] || item['tb'] || 0);
            const menit = parseInt(item['Waktu Menit'] || item['menit'] || 0);
            const detik = parseInt(item['Waktu Detik'] || item['detik'] || 0);
            const hr = parseInt(item['Denyut Nadi'] || item['hr'] || 0);
            const met = parseFloat(item['Total MET'] || item['met'] || 0);
            const ipaq = item['Kategori IPAQ'] || item['ipaq'] || '';

            // Hitung nilai
            const vo2max = Calculations.hitungVO2Max(bb, usia, gender, menit, detik, hr);
            const kategoriKebugaran = Calculations.getKategoriKebugaran(vo2max, usia, gender);
            const imt = Calculations.hitungIMT(bb, tb);
            const kategoriIMT = Calculations.getKategoriIMT(imt);

            const peserta = {
                id: Date.now() + Math.random(),
                nama: item['Nama'] || item['nama'] || '',
                tglLahir: tglLahir,
                usia: usia,
                gender: gender,
                jenisKelamin: gender === 1 ? 'Laki-laki' : 'Perempuan',
                tglTes: item['Tanggal Tes'] || item['tgl_tes'] || new Date().toISOString().split('T')[0],
                bb: bb,
                tb: tb,
                waktuMenit: menit,
                waktuDetik: detik,
                waktuTempuh: `${menit}:${detik.toString().padStart(2, '0')}`,
                hr: hr,
                vo2max: vo2max,
                kategoriKebugaran: kategoriKebugaran,
                imt: imt,
                kategoriIMT: kategoriIMT,
                totalMET: met,
                kategoriIPAQ: ipaq,
                createdAt: new Date().toISOString()
            };

            data.push(peserta);
        });

        this.saveAll(data);
        return importData.length;
    },

    /**
     * Export data ke array untuk Excel
     * @returns {Array}
     */
    exportToExcel() {
        const data = this.getAll();
        return data.map(p => ({
            'No': data.indexOf(p) + 1,
            'Nama': p.nama,
            'Usia': p.usia,
            'Jenis Kelamin': p.jenisKelamin,
            'Tanggal Tes': p.tglTes,
            'Berat Badan (kg)': p.bb,
            'Tinggi Badan (cm)': p.tb,
            'Waktu Menit': p.waktuMenit,
            'Waktu Detik': p.waktuDetik,
            'Denyut Nadi (BPM)': p.hr,
            'VO2Max': p.vo2max,
            'Kategori Kebugaran': p.kategoriKebugaran,
            'IMT': p.imt,
            'Kategori IMT': p.kategoriIMT,
            'Total MET': p.totalMET,
            'Kategori IPAQ': p.kategoriIPAQ
        }));
    }
};

// Export untuk penggunaan di modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStore;
}
