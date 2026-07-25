/**
 * Data Management Module - Sistem Tes Kebugaran PPG
 * Firestore backend with in-memory cache for sync reads.
 * All writes update cache immediately + persist to Firestore async.
 */

const DataStore = {
    COLLECTION: 'peserta',
    _cache: [],
    _ready: false,
    _initPromise: null,
    _db: null,

    /**
     * Initialize Firestore connection and load data into cache.
     * Must be called once before any data access.
     */
    init() {
        if (this._initPromise) return this._initPromise;
        this._initPromise = (async () => {
            try {
                this._db = firebase.firestore();
                const snapshot = await this._db.collection(this.COLLECTION).get();
                this._cache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this._ready = true;
                console.log(`[DataStore] Loaded ${this._cache.length} records from Firestore`);
            } catch (err) {
                console.error('[DataStore] Firestore init failed, falling back to localStorage:', err);
                const fallback = localStorage.getItem('ppg_fitness_data');
                this._cache = fallback ? JSON.parse(fallback) : [];
                this._ready = true;
            }
        })();
        return this._initPromise;
    },

    /**
     * Returns a promise that resolves when DataStore is ready.
     */
    waitForInit() {
        if (this._ready) return Promise.resolve();
        return this.init();
    },

    _persist() {
        try {
            localStorage.setItem('ppg_fitness_data', JSON.stringify(this._cache));
        } catch (e) { /* ignore */ }
    },

    _asyncSet(docId, data) {
        if (!this._db) return;
        const clean = { ...data };
        delete clean.id;
        this._db.collection(this.COLLECTION).doc(docId).set(clean).catch(err => {
            console.error('[DataStore] Firestore write error:', err);
        });
    },

    _asyncDelete(docId) {
        if (!this._db) return;
        this._db.collection(this.COLLECTION).doc(docId).delete().catch(err => {
            console.error('[DataStore] Firestore delete error:', err);
        });
    },

    _asyncAdd(data) {
        if (!this._db) return null;
        const clean = { ...data };
        delete clean.id;
        const ref = this._db.collection(this.COLLECTION).doc();
        ref.set(clean).catch(err => {
            console.error('[DataStore] Firestore add error:', err);
        });
        return ref.id;
    },

    getAll() {
        return [...this._cache];
    },

    getById(id) {
        return this._cache.find(p => p.id === id) || null;
    },

    add(peserta) {
        const docId = String(Date.now()) + '_' + Math.random().toString(36).substr(2, 5);
        peserta.id = docId;
        peserta.createdAt = new Date().toISOString();
        this._cache.push(peserta);
        this._persist();
        this._asyncAdd(peserta);
        return peserta;
    },

    update(id, updatedData) {
        const index = this._cache.findIndex(p => p.id === id);
        if (index !== -1) {
            this._cache[index] = { ...this._cache[index], ...updatedData, updatedAt: new Date().toISOString() };
            this._persist();
            this._asyncSet(id, this._cache[index]);
            return this._cache[index];
        }
        return null;
    },

    delete(id) {
        const before = this._cache.length;
        this._cache = this._cache.filter(p => p.id !== id);
        if (this._cache.length < before) {
            this._persist();
            this._asyncDelete(id);
            return true;
        }
        return false;
    },

    saveAll(data) {
        this._cache = [...data];
        this._persist();
        // Re-sync all to Firestore
        if (this._db) {
            const batch = this._db.batch();
            this._db.collection(this.COLLECTION).get().then(snapshot => {
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                data.forEach(item => {
                    const clean = { ...item };
                    const docId = String(clean.id);
                    delete clean.id;
                    batch.set(this._db.collection(this.COLLECTION).doc(docId), clean);
                });
                return batch.commit();
            }).catch(err => console.error('[DataStore] Bulk save error:', err));
        }
    },

    clearAll() {
        this._cache = [];
        this._persist();
        if (this._db) {
            this._db.collection(this.COLLECTION).get().then(snapshot => {
                const batch = this._db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            }).catch(err => console.error('[DataStore] Clear error:', err));
        }
    },

    getCount() {
        return this._cache.length;
    },

    getAvgVO2Max() {
        if (this._cache.length === 0) return 0;
        const total = this._cache.reduce((sum, p) => sum + (p.vo2max || 0), 0);
        return Math.round((total / this._cache.length) * 100) / 100;
    },

    getAvgBMI() {
        if (this._cache.length === 0) return 0;
        const total = this._cache.reduce((sum, p) => sum + (p.imt || 0), 0);
        return Math.round((total / this._cache.length) * 10) / 10;
    },

    getAvgHR() {
        if (this._cache.length === 0) return 0;
        const total = this._cache.reduce((sum, p) => sum + (p.hr || 0), 0);
        return Math.round(total / this._cache.length);
    },

    getBMIDistribution() {
        const dist = { 'Kurus': 0, 'Normal': 0, 'Gemuk': 0, 'Obesitas': 0 };
        this._cache.forEach(p => {
            if (p.kategoriIMT) dist[p.kategoriIMT] = (dist[p.kategoriIMT] || 0) + 1;
        });
        return dist;
    },

    getVO2Distribution() {
        const dist = { 'Istimewa': 0, 'Sangat Baik': 0, 'Baik': 0, 'Sedang': 0, 'Kurang': 0, 'Kurang Sekali': 0 };
        this._cache.forEach(p => {
            if (p.kategoriKebugaran) dist[p.kategoriKebugaran] = (dist[p.kategoriKebugaran] || 0) + 1;
        });
        return dist;
    },

    getTopRanking(limit = 10) {
        return [...this._cache]
            .sort((a, b) => (b.vo2max || 0) - (a.vo2max || 0))
            .slice(0, limit);
    },

    exportToExcel() {
        return this._cache.map((p, i) => ({
            'No': i + 1,
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
    },

    importFromExcel(importData) {
        const newRecords = [];

        importData.forEach(item => {
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

            const vo2max = Calculations.hitungVO2Max(bb, usia, gender, menit, detik, hr);
            const kategoriKebugaran = Calculations.getKategoriKebugaran(vo2max, usia, gender);
            const imt = Calculations.hitungIMT(bb, tb);
            const kategoriIMT = Calculations.getKategoriIMT(imt);

            const peserta = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
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
                jenisTes: 'baru',
                createdAt: new Date().toISOString()
            };

            this._cache.push(peserta);
            newRecords.push(peserta);
        });

        this._persist();
        newRecords.forEach(p => this._asyncAdd(p));
        return importData.length;
    }
};

// Separate collection for admin participant database
const DatabasePeserta = {
    COLLECTION: 'database_peserta',
    _cache: [],
    _db: null,

    init(db) {
        this._db = db;
        return this._db.collection(this.COLLECTION).get().then(snapshot => {
            this._cache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`[DatabasePeserta] Loaded ${this._cache.length} records`);
        }).catch(err => {
            console.error('[DatabasePeserta] Load error:', err);
            this._cache = [];
        });
    },

    getAll() {
        return [...this._cache];
    },

    find(filterFn) {
        return this._cache.find(filterFn) || null;
    },

    save(data) {
        this._cache = [...data];
        localStorage.setItem('ppg_database_peserta', JSON.stringify(this._cache));
        if (this._db) {
            this._db.collection(this.COLLECTION).get().then(snapshot => {
                const batch = this._db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                data.forEach(item => {
                    const clean = { ...item };
                    const docId = String(clean.id || Date.now());
                    delete clean.id;
                    batch.set(this._db.collection(this.COLLECTION).doc(docId), clean);
                });
                return batch.commit();
            }).catch(err => console.error('[DatabasePeserta] Save error:', err));
        }
    },

    clear() {
        this._cache = [];
        localStorage.removeItem('ppg_database_peserta');
        if (this._db) {
            this._db.collection(this.COLLECTION).get().then(snapshot => {
                const batch = this._db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            }).catch(err => console.error('[DatabasePeserta] Clear error:', err));
        }
    }
};
