/**
 * Admin Panel - Sistem Tes Kebugaran PPG
 * Main JavaScript Logic with Registration, Timer, and IPAQ
 */

// ==================== INITIALIZATION ====================

let lastCalculated = null;

// ==================== IPAQ VALUE PARSER ====================

// Parse nilai IPAQ dari string (handle simbol < >)
// Mengembalikan angka untuk perhitungan
function parseIPAQValue(val) {
    if (val === null || val === undefined || val === '') return 0;
    
    let str = String(val).trim();
    
    // Remove common non-numeric characters except < > . ,
    str = str.replace(/[^\d<>.]/g, '');
    
    // Handle empty after cleanup
    if (!str || str === '.' || str === ',') return 0;
    
    // Handle ">=150" → 150 (ambang maksimum)
    if (str.startsWith('>=')) {
        const num = parseFloat(str.substring(2));
        if (!isNaN(num)) return num;
        return 0;
    }
    
    // Handle "<=150" → 150 (ambang maksimum)
    if (str.startsWith('<=')) {
        const num = parseFloat(str.substring(2));
        if (!isNaN(num)) return num;
        return 0;
    }
    
    // Handle ">3" → 3.5 (estimasi di atas angka dasar)
    if (str.startsWith('>')) {
        const num = parseFloat(str.substring(1));
        if (!isNaN(num)) return num + 0.5;
        return 0;
    }
    
    // Handle "<150" → 75 (estimasi setengah dari batas atas)
    if (str.startsWith('<')) {
        const num = parseFloat(str.substring(1));
        if (!isNaN(num)) return num / 2;
        return 0;
    }
    
    // Normal number
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Format tampilan nilai IPAQ dengan simbol asli
function formatIPAQDisplay(val) {
    if (val === null || val === undefined || val === '') return '0';
    let str = String(val).trim();
    str = str.replace(/[^\d<>.]/g, '');
    if (!str || str === '.' || str === ',') return '0';
    return str;
}

// Keterangan untuk input IPAQ dengan simbol
function getIPAQHint() {
    return '<small class="text-muted">Gunakan <code>&lt;</code> kurang dari, <code>&gt;</code> lebih dari (contoh: &gt;3, &lt;30)</small>';
}

document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

async function initializeAdmin() {
    await DataStore.init();
    await DatabasePeserta.init(firebase.firestore());
    if (DatabasePeserta._cache.length === 0) {
        loadDatabasePeserta();
    }
    refreshAll();
    updateClock();
    setInterval(updateClock, 1000);
    loadDropdownPeserta();
}

function clearAllDummyData() {
    if (confirm('Hapus SEMUA data (termasuk data lama dan data baru)?')) {
        DataStore.clearAll();
        DatabasePeserta.clear();
        refreshAll();
        loadDropdownPeserta();
        alert('Semua data berhasil dihapus!');
    }
}

// ==================== DATABASE MANAGEMENT ====================

function loadDatabasePeserta() {
    if (DatabasePeserta._cache.length === 0) {
        const allData = DataStore.getAll();
        if (allData.length > 0) {
            DatabasePeserta._cache = allData.filter(p => p.jenisTes !== 'lama').map(p => ({
                bib: p.bib,
                nama: p.nama,
                gender: p.jenisKelamin || 'Laki-laki',
                genderValue: p.gender !== undefined ? p.gender : 1,
                usia: p.usia,
                tglLahir: p.tglLahir || '',
                tb: p.tb,
                bb: p.bb,
                imt: p.imt || 0,
                kategoriIMT: p.kategoriIMT || '-',
                jabatan: ''
            }));
            saveDatabasePeserta();
        }
    }
}

function saveDatabasePeserta() {
    DatabasePeserta.save(DatabasePeserta._cache);
}

// ==================== NAVIGATION ====================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const icon = document.querySelector('#btnToggleSidebar i');
    
    sidebar.classList.toggle('collapsed');
    content.classList.toggle('sidebar-collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fas fa-bars';
    } else {
        icon.className = 'fas fa-times';
    }
}

function switchTab(sectionId, element) {
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    element.parentElement.classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');

    const titles = {
        'timer-rockport': 'Timer Rockport',
        'import-data': 'Import Data',
        'import-lama': 'Import Data Lama'
    };
    document.getElementById('page-title').innerText = titles[sectionId] || 'Admin Panel';
}

// ==================== CLOCK ====================

function updateClock() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentTime').textContent = now.toLocaleDateString('id-ID', options);
}

// ==================== HELPER FUNCTIONS ====================

function getBadgeClass(kategori) {
    const classes = {
        'Istimewa': 'bg-primary',
        'Sangat Baik': 'bg-info text-dark',
        'Baik': 'bg-success',
        'Sedang': 'bg-warning text-dark',
        'Kurang': 'bg-danger',
        'Kurang Sekali': 'bg-dark',
        'Kurus': 'bg-info',
        'Normal': 'bg-success',
        'Gemuk': 'bg-warning text-dark',
        'Obesitas': 'bg-danger'
    };
    return classes[kategori] || 'bg-secondary';
}

function showSaranModal() {
    if (!lastCalculated) {
        const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
        if (data.length === 0) {
            alert('Belum ada data! Silakan input data terlebih dahulu.');
            return;
        }
        lastCalculated = data[data.length - 1];
    }

    document.getElementById('modalIMT').textContent = 
        `${lastCalculated.imt.toFixed(2)} (${lastCalculated.kategoriIMT})`;
    document.getElementById('modalVO2').textContent = 
        `${lastCalculated.vo2max.toFixed(2)} ml/kg/min (${lastCalculated.kategoriKebugaran})`;

    document.getElementById('saranLatihan').innerHTML = generateSaranLatihan(lastCalculated);
    document.getElementById('saranNutrisi').innerHTML = generateSaranNutrisi(lastCalculated);

    new bootstrap.Modal(document.getElementById('modalSaran')).show();
}

function generateSaranLatihan(data) {
    let saran = '';
    const kategori = data.kategoriKebugaran;
    
    if (kategori === 'Istimewa' || kategori === 'Sangat Baik') {
        saran = `
            <p><strong>Tingkat Kebugaran: ${kategori}</strong></p>
            <ul>
                <li>Pertahankan aktivitas aerobik 150-300 menit/minggu dengan intensitas sedang-tinggi</li>
                <li>Tambahkan latihan interval training (HIIT) 2-3x seminggu</li>
                <li>Lakukan latihan kekuatan seluruh tubuh 2-3x seminggu</li>
                <li>Include flexibility training dan recovery day</li>
            </ul>
        `;
    } else if (kategori === 'Baik') {
        saran = `
            <p><strong>Tingkat Kebugaran: ${kategori}</strong></p>
            <ul>
                <li>Aerobik 150 menit/minggu (jalan cepat, bersepeda, berenang)</li>
                <li>Tingkatkan intensitas secara bertahap</li>
                <li>Tambahkan latihan interval 1-2x seminggu</li>
                <li>Latihan kekuatan 2x seminggu untuk meningkatkan massa otot</li>
            </ul>
        `;
    } else if (kategori === 'Sedang') {
        saran = `
            <p><strong>Tingkat Kebugaran: ${kategori}</strong></p>
            <ul>
                <li>Mulai dengan jalan kaki cepat 20-30 menit/hari</li>
                <li>Lakukan 5x seminggu dengan intensitas moderat</li>
                <li>Tambahkan aktivitas bersepeda atau berenang</li>
                <li>Latihan peregangan 10-15 menit setelah olahraga</li>
                <li>Tingkatkan durasi secara bertahap setiap minggu</li>
            </ul>
        `;
    } else {
        saran = `
            <p><strong>Tingkat Kebugaran: ${kategori}</strong></p>
            <ul>
                <li>Konsultasikan dengan dokter sebelum memulai program olahraga</li>
                <li>Mulai dengan berjalan kaki pelan 10-15 menit/hari</li>
                <li>Tingkatkan durasi secara bertahap (5 menit per minggu)</li>
                <li>Hindari aktivitas berat di awal</li>
                <li>Lakukan aktivitas ringan seperti berkebun atau yoga</li>
            </ul>
        `;
    }
    
    return saran;
}

function generateSaranNutrisi(data) {
    let saran = '';
    const kategoriIMT = data.kategoriIMT;
    
    if (kategoriIMT === 'Normal') {
        saran = `
            <p><strong>IMT Normal (${data.imt.toFixed(2)})</strong></p>
            <ul>
                <li>Pertahankan pola makan seimbang dengan 4 sehat 5 sempurna</li>
                <li>Konsumsi protein 1-1.2g/kg berat badan per hari</li>
                <li>Perbanyak sayur dan buah (5 porsi/hari)</li>
                <li>Minum air putih 8-10 gelas per hari</li>
                <li>Batasi gula, garam, dan lemak jenuh</li>
            </ul>
        `;
    } else if (kategoriIMT === 'Kurus') {
        saran = `
            <p><strong>IMT Kurus (${data.imt.toFixed(2)})</strong></p>
            <ul>
                <li>Tingkatkan asupan kalori 300-500 kalori dari kebutuhan dasar</li>
                <li>Konsumsi makanan tinggi protein (daging, telur, kacang-kacangan)</li>
                <li>Makan 5-6 kali sehari dengan porsi kecil</li>
                <li>Konsultasi dengan ahli gizi untuk diet sehat</li>
                <li>Hindari makanan olahan dan junk food</li>
            </ul>
        `;
    } else if (kategoriIMT === 'Gemuk' || kategoriIMT === 'Obesitas') {
        saran = `
            <p><strong>IMT ${kategoriIMT} (${data.imt.toFixed(2)})</strong></p>
            <ul>
                <li>Kurangi asupan kalori 300-500 kalori dari kebutuhan dasar</li>
                <li>Hindari makanan tinggi gula dan lemak</li>
                <li>Perbanyak sayur dan protein tanpa lemak</li>
                <li>Makan perlahan dan kunyah makanan dengan baik</li>
                <li>Minum air putih sebelum makan untuk mengurangi porsi</li>
                <li>Pertimbangkan konsultasi dengan dokter atau ahli gizi</li>
            </ul>
        `;
    }
    
    saran += `
        <hr class="my-3">
        <p class="mb-2"><strong>Tips Umum:</strong></p>
        <ul class="mb-0">
            <li>Perbanyak konsumsi sayur dan buah</li>
            <li>Kurangi makanan olahan dan fast food</li>
            <li>Minum air putih minimal 8 gelas per hari</li>
            <li>Pola makan teratur (3 kali makan utama + 2 snack)</li>
        </ul>
    `;
    
    return saran;
}

// ==================== INPUT WAKTU & HR ====================

let dropdownIndex = -1;

function loadDropdownPeserta() {
    const list = document.getElementById('dropdownListPeserta');
    if (!list) return;
    list.innerHTML = '';
    // Filter out records without name, sort by BIB ascending
    const validRecords = DatabasePeserta._cache
        .filter(p => p.nama && p.nama.trim())
        .sort((a, b) => String(a.bib || '').localeCompare(String(b.bib || ''), undefined, { numeric: true }));
    validRecords.forEach(p => {
        const div = document.createElement('div');
        div.className = 'dd-item';
        div.setAttribute('data-bib', p.bib);
        div.innerHTML = `<span class="dd-bib">${p.bib}</span> <span class="dd-name">${p.nama}</span>`;
        div.onclick = function() { selectPesertaFromDropdown(p.bib, p.nama); };
        list.appendChild(div);
    });
}

function filterDropdownPeserta() {
    const input = document.getElementById('inputSearchPeserta').value.trim().toLowerCase();
    const list = document.getElementById('dropdownListPeserta');
    const items = Array.from(list.querySelectorAll('.dd-item'));
    dropdownIndex = -1;

    const startsWith = [];
    const contains = [];

    items.forEach(item => {
        item.classList.remove('active');
        item.style.display = 'none';
        const bib = item.getAttribute('data-bib').toLowerCase();
        const name = item.querySelector('.dd-name').textContent.toLowerCase();
        if (!input) {
            startsWith.push(item);
        } else if (bib.startsWith(input) || name.startsWith(input)) {
            startsWith.push(item);
        } else if (bib.includes(input) || name.includes(input)) {
            contains.push(item);
        }
    });

    const sorted = [...startsWith, ...contains];
    sorted.forEach(item => item.style.display = '');

    const nr = list.querySelector('.dd-no-result');
    if (nr) nr.remove();

    if (input && sorted.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'dd-no-result';
        noResult.textContent = 'Peserta tidak ditemukan';
        list.appendChild(noResult);
    }

    if (sorted.length > 0) {
        dropdownIndex = 0;
        sorted[0].classList.add('active');
        sorted[0].scrollIntoView({ block: 'nearest' });
    }

    list.classList.add('show');
}

function showDropdownPeserta() {
    const list = document.getElementById('dropdownListPeserta');
    if (list) list.classList.add('show');
}

function hideDropdownPeserta() {
    setTimeout(() => {
        const list = document.getElementById('dropdownListPeserta');
        if (list) list.classList.remove('show');
    }, 200);
}

function handleDropdownKeydown(e) {
    const list = document.getElementById('dropdownListPeserta');
    const items = Array.from(list.querySelectorAll('.dd-item')).filter(i => i.style.display !== 'none');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        dropdownIndex = Math.min(dropdownIndex + 1, items.length - 1);
        updateDropdownActive(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dropdownIndex = Math.max(dropdownIndex - 1, 0);
        updateDropdownActive(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (dropdownIndex >= 0 && dropdownIndex < items.length) {
            items[dropdownIndex].click();
        }
    } else if (e.key === 'Escape') {
        list.classList.remove('show');
    }
}

function updateDropdownActive(items) {
    items.forEach((item, i) => {
        item.classList.toggle('active', i === dropdownIndex);
        if (i === dropdownIndex) item.scrollIntoView({ block: 'nearest' });
    });
}

function selectPesertaFromDropdown(bib, nama) {
    document.getElementById('inputSearchPeserta').value = bib + ' - ' + nama;
    document.getElementById('selectedBIBPeserta').value = bib;
    document.getElementById('selectedNamaInfo').innerHTML = '<i class="fas fa-check-circle text-success me-1"></i>Terpilih: <strong>' + nama + '</strong> (BIB: ' + bib + ')';
    document.getElementById('dropdownListPeserta').classList.remove('show');
    document.getElementById('inputWaktu').focus();
}

function simpanWaktuDanHR() {
    const bib = document.getElementById('selectedBIBPeserta').value;
    const inputWaktu = document.getElementById('inputWaktu');
    const inputHR = document.getElementById('inputHR');

    if (!bib) { alert('Pilih peserta terlebih dahulu!'); document.getElementById('inputSearchPeserta').focus(); return; }

    const waktuStr = inputWaktu.value.trim();
    if (!waktuStr || !waktuStr.includes(':')) { alert('Format waktu: MM:SS (contoh: 02:18)'); inputWaktu.focus(); return; }

    const waktuParts = waktuStr.split(':');
    const menit = parseInt(waktuParts[0]) || 0;
    const detik = parseInt(waktuParts[1]) || 0;
    if (menit === 0 && detik === 0) { alert('Waktu tidak boleh 00:00!'); inputWaktu.focus(); return; }

    const hr = parseInt(inputHR.value);
    if (isNaN(hr) || hr <= 0) { alert('Masukkan denyut nadi yang valid!'); inputHR.focus(); return; }

    const peserta = DatabasePeserta._cache.find(p => String(p.bib) === String(bib));
    if (!peserta) { alert('Peserta tidak ditemukan!'); return; }

    if (!peserta.bb || peserta.bb <= 0) {
        alert('Data berat badan peserta kosong! Silakan update data peserta terlebih dahulu.');
        return;
    }

    const gender = peserta.genderValue !== undefined ? peserta.genderValue : (peserta.gender === 'Perempuan' ? 0 : 1);
    const vo2max = Calculations.hitungVO2Max(peserta.bb, peserta.usia, gender, menit, detik, hr);
    const kategoriKebugaran = Calculations.getKategoriKebugaran(vo2max, peserta.usia, gender);
    const waktuTempuh = menit + ':' + detik.toString().padStart(2, '0');

    const allData = DataStore.getAll();
    const bibStr = String(bib);
    let record = allData.find(p => {
        const pBib = String(p.bib || '');
        return (pBib === bibStr || pBib.replace(/^0+/, '') === bibStr.replace(/^0+/, '')) && p.jenisTes !== 'lama';
    });

    const updatedFields = {
        waktuMenit: menit,
        waktuDetik: detik,
        waktuTempuh: waktuTempuh,
        hr: hr,
        vo2max: parseFloat(vo2max.toFixed(2)),
        kategoriKebugaran: kategoriKebugaran,
        tglTes: new Date().toISOString().split('T')[0]
    };

    if (record) {
        if (!record.bb || record.bb <= 0) updatedFields.bb = peserta.bb;
        if (!record.tb || record.tb <= 0) updatedFields.tb = peserta.tb;
        DataStore.update(record.id, updatedFields);
    } else {
        DataStore.add({
            bib: peserta.bib,
            nama: peserta.nama,
            tglLahir: peserta.tglLahir || '',
            usia: peserta.usia,
            gender: gender,
            jenisKelamin: peserta.gender,
            tglTes: new Date().toISOString().split('T')[0],
            bb: peserta.bb,
            tb: peserta.tb,
            waktuMenit: menit,
            waktuDetik: detik,
            waktuTempuh: waktuTempuh,
            hr: hr,
            vo2max: parseFloat(vo2max.toFixed(2)),
            kategoriKebugaran: kategoriKebugaran,
            imt: peserta.imt || 0,
            kategoriIMT: peserta.kategoriIMT || '-',
            totalMET: peserta.totalMET || 0,
            kategoriIPAQ: peserta.kategoriIPAQ || '-',
            jenisTes: 'baru'
        });
    }

    showToast(`${peserta.nama}: ${waktuTempuh} | HR ${hr} | VO2Max ${vo2max.toFixed(2)} (${kategoriKebugaran})`);

    document.getElementById('inputSearchPeserta').value = '';
    document.getElementById('selectedBIBPeserta').value = '';
    document.getElementById('selectedNamaInfo').innerHTML = '';
    inputWaktu.value = '';
    inputHR.value = '';
    document.getElementById('infoInputArea').style.display = 'none';

    refreshAll();
    loadDropdownPeserta();
}

// ==================== IPAQ CALCULATION ====================

function hitungIPAQManual() {
    const getVal = (id) => parseIPAQValue(document.getElementById(id).value);
    
    // Q3 & Q4: Aktivitas Berat (MET 8.0)
    const hariBerat = getVal('q3');
    const menitBerat = getVal('q4');
    
    // Q5 & Q6: Aktivitas Sedang (MET 4.0)
    const hariSedang = getVal('q5');
    const menitSedang = getVal('q6');
    
    // Q7 & Q8: Berjalan (MET 3.3)
    const hariJalan = getVal('q7');
    const menitJalan = getVal('q8');

    // Hitung menggunakan fungsi terpusat
    const hasil = kalkulasiIPAQ(hariBerat, menitBerat, hariSedang, menitSedang, hariJalan, menitJalan);

    // Tampilkan Hasil dengan detail breakdown
    document.getElementById('hasilIPAQManual').innerHTML = 
        '<div class="mt-2">' +
            '<div class="d-flex justify-content-between mb-1"><span class="small">Berat (8.0 MET):</span><strong>' + hasil.metBerat + ' MET-min/wk</strong></div>' +
            '<div class="d-flex justify-content-between mb-1"><span class="small">Sedang (4.0 MET):</span><strong>' + hasil.metSedang + ' MET-min/wk</strong></div>' +
            '<div class="d-flex justify-content-between mb-1"><span class="small">Jalan (3.3 MET):</span><strong>' + hasil.metJalan + ' MET-min/wk</strong></div>' +
            '<hr class="my-1">' +
            '<div class="d-flex justify-content-between"><span class="small fw-bold">Total:</span><strong class="text-primary">' + hasil.total + ' MET-min/wk</strong></div>' +
            '<div class="mt-2"><span class="badge ' + hasil.warna + ' fs-6">' + hasil.kategori + '</span></div>' +
        '</div>';
}

function importIPAQ() {
    const fileInput = document.getElementById('fileIPAQ');
    const file = fileInput.files[0];

    if (!file) {
        alert('Pilih file terlebih dahulu!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            jsonData.forEach(item => {
                const hariBerat = parseIPAQValue(item['Hari Aktivitas Berat'] || item['hari_berat'] || item['Frekuensi Aktivitas Berat']);
                const menitBerat = parseIPAQValue(item['Menit Aktivitas Berat'] || item['menit_berat'] || item['Durasi Aktivitas Berat']);
                const hariSedang = parseIPAQValue(item['Hari Aktivitas Sedang'] || item['hari_sedang'] || item['Frekuensi Aktivitas Sedang']);
                const menitSedang = parseIPAQValue(item['Menit Aktivitas Sedang'] || item['menit_sedang'] || item['Durasi Aktivitas Sedang']);
                const hariJalan = parseIPAQValue(item['Hari Jalan Kaki'] || item['hari_jalan'] || item['Frekuensi Berjalan']);
                const menitJalan = parseIPAQValue(item['Menit Jalan Kaki'] || item['menit_jalan'] || item['Durasi Berjalan']);

                const result = Calculations.hitungIPAQ(hariBerat, menitBerat, hariSedang, menitSedang, hariJalan, menitJalan);
                
                const nama = item['Nama'] || item['nama'];
                if (nama) {
                    const allData = DataStore.getAll();
                    const peserta = allData.find(p => p.nama.toLowerCase() === nama.toLowerCase());
                    if (peserta) {
                        DataStore.update(peserta.id, {
                            totalMET: result.total_met,
                            kategoriIPAQ: result.kategori,
                            ipaq_v_days: hariBerat,
                            ipaq_v_min: menitBerat,
                            ipaq_m_days: hariSedang,
                            ipaq_m_min: menitSedang,
                            ipaq_w_days: hariJalan,
                            ipaq_w_min: menitJalan
                        });
                    }
                }
            });

            refreshAll();
            alert(`Berhasil memproses ${jsonData.length} data IPAQ!`);
            fileInput.value = '';
        } catch (error) {
            console.error('Error importing IPAQ:', error);
            alert('Gagal import file. Pastikan format file benar.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ==================== REFRESH ====================

function refreshAll() {
    updateStats();
}

function updateStats() {
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    const elTotal = document.getElementById('statTotal');
    const elVO2 = document.getElementById('statAvgVO2');
    if (elTotal) elTotal.textContent = data.length;
    if (elVO2) {
        const withVO2 = data.filter(p => p.vo2max && p.vo2max > 0);
        const avg = withVO2.length > 0 ? (withVO2.reduce((s, p) => s + p.vo2max, 0) / withVO2.length).toFixed(1) : 0;
        elVO2.textContent = avg;
    }
}

function showInfoPeserta(id) {
    const peserta = DataStore.getById(id);
    if (!peserta) return;

    const saran = generateRekomendasi(peserta);
    
    const modalBody = document.getElementById('infoModalBody');
    modalBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6 class="fw-bold text-primary border-bottom pb-2"><i class="fas fa-user me-1"></i> Ringkasan Data</h6>
                <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted" style="width:40%">Nama</td><td class="fw-semibold">${peserta.nama}</td></tr>
                    <tr><td class="text-muted">Usia</td><td>${peserta.usia || '-'} tahun</td></tr>
                    <tr><td class="text-muted">VO2Max</td><td class="fw-bold ${getWarnaKardio(peserta.kategoriKebugaran)}">${peserta.vo2max != null && peserta.vo2max >= 0 ? peserta.vo2max.toFixed(2) + ' ml/kg/min' : '-'}</td></tr>
                    <tr><td class="text-muted">IMT</td><td>${peserta.imt ? peserta.imt.toFixed(1) : '-'}</td></tr>
                    <tr><td class="text-muted">Total MET</td><td>${peserta.totalMET != null && peserta.totalMET !== '' ? peserta.totalMET : '-'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-success border-bottom pb-2"><i class="fas fa-chart-bar me-1"></i> Status Kategori</h6>
                <div class="d-flex flex-column gap-2">
                    <div>${renderStatusBadge('Kardio', peserta.kategoriKebugaran, 'fa-heartbeat', getWarnaKardio(peserta.kategoriKebugaran))}</div>
                    <div>${renderStatusBadge('Postur', peserta.kategoriIMT, 'fa-weight', getWarnaIMT(peserta.kategoriIMT))}</div>
                    <div>${renderStatusBadge('Aktivitas', peserta.kategoriIPAQ, 'fa-person-walking', getWarnaIPAQ(peserta.kategoriIPAQ))}</div>
                </div>
            </div>
        </div>
        <hr class="my-3">
        <div class="saran-section">${saran}</div>
    `;

    new bootstrap.Modal(document.getElementById('infoModal')).show();
}

// ==================== IMPORT/EXPORT ====================

function importExcel(fileId) {
    const fileInput = document.getElementById(fileId);
    const file = fileInput.files[0];

    if (!file) {
        alert('Pilih file terlebih dahulu!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (fileId === 'filePeserta') {
                // Import Peserta with auto-BIB
                importPesertaFromExcel(jsonData);
            } else {
                // Import IPAQ
                const importCount = DataStore.importFromExcel(jsonData);
                refreshAll();
                alert(`Berhasil import ${importCount} data IPAQ!`);
            }
            
            fileInput.value = '';
        } catch (error) {
            console.error('Error importing file:', error);
            alert('Gagal import file. Pastikan format file benar.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function importPesertaFromExcel(jsonData) {
    let importCount = 0;
    
    jsonData.forEach(item => {
        // Get values from Excel columns (flexible column names)
        const nama = item['Nama Lengkap'] || item['Nama'] || item['nama'] || '';
        const genderVal = item['Jenis Kelamin'] || item['Gender'] || item['gender'] || '';
        const tglLahir = item['Tanggal Lahir'] || item['tgl_lahir'] || '';
        const tb = parseFloat(item['Tinggi Badan'] || item['TB'] || item['tb'] || 0);
        const bb = parseFloat(item['Berat Badan'] || item['BB'] || item['bb'] || 0);

        if (nama && tb && bb) {
            // Generate BIB
            const newBib = String(DatabasePeserta._cache.length + 1).padStart(3, '0');
            
            // Parse gender
            let genderText = 'Laki-laki';
            let genderValue = 1;
            if (genderVal == 0 || genderVal === 'Perempuan' || genderVal === 'P') {
                genderText = 'Perempuan';
                genderValue = 0;
            }

            // Calculate age
            const usia = tglLahir ? Calculations.hitungUsia(tglLahir) : 0;
            
            // Calculate IMT
            const imt = Calculations.hitungIMT(bb, tb);
            const kategoriIMT = Calculations.getKategoriIMT(imt);

            const pesertaBaru = {
                bib: newBib,
                nama: nama,
                gender: genderText,
                genderValue: genderValue,
                usia: usia,
                tglLahir: tglLahir,
                tb: tb,
                bb: bb,
                imt: imt,
                kategoriIMT: kategoriIMT
            };

            DatabasePeserta._cache.push(pesertaBaru);
            importCount++;
        }
    });

    saveDatabasePeserta();
    loadDropdownPeserta();
    
    alert(`Berhasil import ${importCount} data peserta!\nBIB telah otomatis di-generate.`);
}

// ==================== IMPORT TERINTEGRASI (PESERTA + IPAQ) ====================

// Database sementara untuk hasil import
let dataPeserta = [];

// Rumus Hitung IPAQ - Sesuai Standar IPAQ Resmi (https://sites.google.com/view/ipaq/score)
// MET values: Walking=3.3, Moderate=4.0, Vigorous=8.0
// Formula: MET-min/week = MET × menit/hari × hari/minggu
function kalkulasiIPAQ(hariBerat, menitBerat, hariSedang, menitSedang, hariJalan, menitJalan) {
    const result = Calculations.hitungIPAQ(hariBerat || 0, menitBerat || 0, hariSedang || 0, menitSedang || 0, hariJalan || 0, menitJalan || 0);

    const v_min_t = Calculations.truncateMinutes(menitBerat || 0);
    const m_min_t = Calculations.truncateMinutes(menitSedang || 0);
    const w_min_t = Calculations.truncateMinutes(menitJalan || 0);

    const metBerat = 8.0 * v_min_t * (hariBerat || 0);
    const metSedang = 4.0 * m_min_t * (hariSedang || 0);
    const metJalan = 3.3 * w_min_t * (hariJalan || 0);

    const warnaMap = {
        'Tinggi (Aktif)': 'bg-success',
        'Sedang': 'bg-primary',
        'Rendah (Kurang Aktif)': 'bg-danger'
    };

    return {
        total: String(result.total_met),
        metBerat: String(metBerat),
        metSedang: String(metSedang),
        metJalan: String(metJalan),
        kategori: result.kategori,
        warna: warnaMap[result.kategori] || 'bg-secondary'
    };
}

function prosesImportExcel() {
    const fileInput = document.getElementById('fileDataUtama');
    const file = fileInput.files[0];
    const tanggalTesInput = document.getElementById('importTanggalTes');
    const tanggalTes = tanggalTesInput ? tanggalTesInput.value : new Date().toISOString().split('T')[0];

    if (!file) {
        alert('Pilih file terlebih dahulu!');
        return;
    }

    if (!tanggalTes) {
        alert('Pilih tanggal tes terlebih dahulu!');
        if (tanggalTesInput) tanggalTesInput.focus();
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            // Debug: Tampilkan kolom yang ditemukan
            if (jsonData.length > 0) {
                const headers = jsonData[0];
                console.log('Kolom ditemukan:', headers);
                
                // Mapping kolom berdasarkan Posisi (A-P) atau Nama
                const columns = mapColumns(headers);
                console.log('Mapping kolom:', columns);
                
                // Kosongkan database
                dataPeserta = [];
                DatabasePeserta._cache = [];

                // Proses data mulai dari baris ke-2 (index 1)
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    // Ambil nilai berdasarkan posisi kolom yang sudah di-map
                    const nama = getValue(row, columns.nama);
                    const tb = parseFloat(getValue(row, columns.tb)) || 0;
                    const bb = parseFloat(getValue(row, columns.bb)) || 0;
                    
                    if (!nama || tb === 0 || bb === 0) continue;

                    // Generate BIB dari posisi atau kolom BIB
                    let bib = getValue(row, columns.bib);
                    if (!bib) {
                        bib = String(dataPeserta.length + 1).padStart(3, '0');
                    } else {
                        bib = String(bib).padStart(3, '0');
                    }

                    // Ambil data lainnya
                    const jkRaw = String(getValue(row, columns.jk) || '1').trim().toUpperCase();
                    const usia = parseInt(getValue(row, columns.usia)) || 0;
                    const jabatan = getValue(row, columns.jabatan) || '';

                    // Kolom IPAQ (gunakan parser untuk handle simbol < >)
                    const q3 = parseIPAQValue(getValue(row, columns.q3));
                    const q4 = parseIPAQValue(getValue(row, columns.q4));
                    const q5 = parseIPAQValue(getValue(row, columns.q5));
                    const q6 = parseIPAQValue(getValue(row, columns.q6));
                    const q7 = parseIPAQValue(getValue(row, columns.q7));
                    const q8 = parseIPAQValue(getValue(row, columns.q8));

                    const hasilIPAQ = kalkulasiIPAQ(q3, q4, q5, q6, q7, q8);

                    // Hitung IMT
                    const tbMeter = tb / 100;
                    const imt = (bb / (tbMeter * tbMeter)).toFixed(2);

                    // Simpan ke DatabasePeserta._cache (registrasi)
                    // Deteksi JK: L/Laki-laki/Laki/Pria/1 = Laki-laki, P/Perempuan/0 = Perempuan
                    const isPerempuan = (jkRaw === '0' || jkRaw === 'P' || jkRaw === 'PEREMPUAN' || jkRaw === 'WANITA');
                    const genderText = isPerempuan ? 'Perempuan' : 'Laki-laki';
                    const genderValue = isPerempuan ? 0 : 1;

                    DatabasePeserta._cache.push({
                        bib: bib,
                        nama: nama,
                        gender: genderText,
                        genderValue: genderValue,
                        usia: usia,
                        tglLahir: '',
                        tb: tb,
                        bb: bb,
                        imt: parseFloat(imt),
                        kategoriIMT: Calculations.getKategoriIMT(parseFloat(imt)),
                        jabatan: jabatan
                    });

                    // Simpan ke DataStore (untuk landing page)
                    const pesertaForLanding = {
                        bib: bib,
                        nama: nama,
                        tglLahir: '',
                        usia: usia,
                        gender: genderValue,
                        jenisKelamin: genderText,
                        tglTes: tanggalTes,
                        bb: bb,
                        tb: tb,
                        waktuMenit: 0,
                        waktuDetik: 0,
                        waktuTempuh: '-',
                        hr: 0,
                        vo2max: 0,
                        kategoriKebugaran: '-',
                        imt: parseFloat(imt),
                        kategoriIMT: Calculations.getKategoriIMT(parseFloat(imt)),
                        totalMET: parseInt(hasilIPAQ.total) || 0,
                        kategoriIPAQ: hasilIPAQ.kategori,
                        ipaq_v_days: q3,
                        ipaq_v_min: q4,
                        ipaq_m_days: q5,
                        ipaq_m_min: q6,
                        ipaq_w_days: q7,
                        ipaq_w_min: q8,
                        jenisTes: 'baru'
                    };
                    DataStore.add(pesertaForLanding);

                    // Simpan ke dataPeserta (tampilan import)
                    dataPeserta.push({
                        bib: bib,
                        nama: nama,
                        jk: genderText,
                        usia: usia,
                        tb: tb,
                        bb: bb,
                        imt: imt,
                        met: hasilIPAQ.total,
                        kategoriIPAQ: hasilIPAQ.kategori,
                        warnaIPAQ: hasilIPAQ.warna
                    });
                }

                // Simpan ke localStorage
                saveDatabasePeserta();
                loadDropdownPeserta();
                
                // Update UI
                renderTabelImport();
                
                showToast(`Berhasil import ${dataPeserta.length} data peserta! IPAQ telah dihitung otomatis.`);
                fileInput.value = '';
            } else {
                alert('File Excel kosong atau tidak valid!');
            }
        } catch (error) {
            console.error('Error importing file:', error);
            alert('Gagal import file. Error: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Fungsi untuk mapping kolom berdasarkan header
function mapColumns(headers) {
    const columns = {
        bib: -1, nama: -1, jk: -1, usia: -1, tb: -1, bb: -1, jabatan: -1,
        q3: -1, q4: -1, q5: -1, q6: -1, q7: -1, q8: -1
    };

    const keywords = {
        bib: ['bib', 'no bib', 'nomor', 'no'],
        nama: ['nama', 'nama lengkap', 'name'],
        jk: ['jenis kelamin', 'jk', 'gender', 'sex', 'l/p', 'laki', 'perempuan'],
        usia: ['usia', 'age', 'umur'],
        tb: ['tinggi', 'tinggi badan', 'height', 'tb', 'tinggi badan (cm)'],
        bb: ['berat', 'berat badan', 'weight', 'bb', 'berat badan (kg)'],
        jabatan: ['jabatan', 'position', 'job', 'pekerjaan'],
        q3: ['frekuensi aktivitas berat', 'frekuensi aktivitas berat (hari/minggu)', 'q3', 'q 3', 'freq berat'],
        q4: ['durasi aktivitas berat', 'durasi aktivitas berat (menit/hari)', 'q4', 'q 4', 'durasi berat'],
        q5: ['frekuensi aktivitas sedang', 'frekuensi aktivitas sedang (hari/minggu)', 'q5', 'q 5', 'freq sedang'],
        q6: ['durasi aktivitas sedang', 'durasi aktivitas sedang (menit/hari)', 'q6', 'q 6', 'durasi sedang'],
        q7: ['frekuensi berjalan', 'frekuensi berjalan (hari/minggu)', 'q7', 'q 7', 'freq jalan'],
        q8: ['durasi berjalan', 'durasi berjalan (menit/hari)', 'q8', 'q 8', 'durasi jalan']
    };

    headers.forEach((header, index) => {
        if (!header) return;
        const headerLower = String(header).toLowerCase().trim();
        for (const [key, words] of Object.entries(keywords)) {
            if (columns[key] === -1) {
                for (const word of words) {
                    if (headerLower.includes(word)) {
                        columns[key] = index;
                        break;
                    }
                }
            }
        }
    });

    if (columns.nama === -1) columns.nama = 1;
    if (columns.jk === -1) columns.jk = 2;
    if (columns.usia === -1) columns.usia = 3;
    if (columns.tb === -1) columns.tb = 4;
    if (columns.bb === -1) columns.bb = 5;

    if (columns.q3 === -1 && headers.length >= 12) {
        columns.q3 = 9;  // Kolom J
        columns.q4 = 10; // Kolom K
        columns.q5 = 11; // Kolom L
        columns.q6 = 12; // Kolom M
        columns.q7 = 13; // Kolom N
        columns.q8 = 14; // Kolom O
    }

    return columns;
}

// Fungsi untuk mengambil nilai dari array berdasarkan index
function getValue(row, index) {
    if (index === -1 || index >= row.length) return null;
    return row[index];
}

function renderTabelImport() {
    const tbody = document.getElementById('tabelImport');
    tbody.innerHTML = '';

    if (dataPeserta.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-muted py-3">Belum ada data yang di-import.</td></tr>';
    } else {
        dataPeserta.forEach(p => {
            const row = `<tr>
                <td><span class="badge bg-primary">${p.bib}</span></td>
                <td class="text-start fw-bold">${p.nama}</td>
                <td>${p.jk === 'Laki-laki' ? 'L' : 'P'}</td>
                <td>${p.usia}</td>
                <td>${p.tb}</td>
                <td>${p.bb}</td>
                <td>${p.imt}</td>
                <td class="fw-bold text-primary">${p.met}</td>
                <td><span class="badge ${p.warnaIPAQ}">${p.kategoriIPAQ}</span></td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    }

    document.getElementById('totalImported').textContent = `${dataPeserta.length} Peserta`;
}

function exportToExcel() {
    const data = DataStore.exportToExcel();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Peserta");
    XLSX.writeFile(wb, "data_peserta_ppg.xlsx");
}

function updateIPAQExisting() {
    const fileInput = document.getElementById('fileUpdateIPAQ');
    const file = fileInput.files[0];
    const statusEl = document.getElementById('statusUpdateIPAQ');

    if (!file) { alert('Pilih file terlebih dahulu!'); return; }

    statusEl.textContent = 'Memproses...';
    statusEl.className = 'text-warning small fw-bold';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) { alert('File kosong!'); statusEl.textContent = ''; return; }

            const headers = jsonData[0];
            const columns = mapColumns(headers);

            let updated = 0;
            let skipped = 0;
            const allData = DataStore.getAll();

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const nama = getValue(row, columns.nama);
                if (!nama) { skipped++; continue; }

                const peserta = allData.find(p => p.nama && p.nama.toLowerCase() === String(nama).toLowerCase());
                if (!peserta) { skipped++; continue; }

                const v_days = parseInt(parseIPAQValue(getValue(row, columns.q3))) || 0;
                const v_min = parseInt(parseIPAQValue(getValue(row, columns.q4))) || 0;
                const m_days = parseInt(parseIPAQValue(getValue(row, columns.q5))) || 0;
                const m_min = parseInt(parseIPAQValue(getValue(row, columns.q6))) || 0;
                const w_days = parseInt(parseIPAQValue(getValue(row, columns.q7))) || 0;
                const w_min = parseInt(parseIPAQValue(getValue(row, columns.q8))) || 0;

                const result = Calculations.hitungIPAQ(v_days, v_min, m_days, m_min, w_days, w_min);

                DataStore.update(peserta.id, {
                    totalMET: result.total_met,
                    kategoriIPAQ: result.kategori,
                    ipaq_v_days: v_days,
                    ipaq_v_min: v_min,
                    ipaq_m_days: m_days,
                    ipaq_m_min: m_min,
                    ipaq_w_days: w_days,
                    ipaq_w_min: w_min
                });
                updated++;
            }

            refreshAll();
            statusEl.textContent = `Berhasil update ${updated} data, ${skipped} dilewati`;
            statusEl.className = 'text-success small fw-bold';
            fileInput.value = '';
        } catch (error) {
            console.error('Error update IPAQ:', error);
            statusEl.textContent = 'Error: ' + error.message;
            statusEl.className = 'text-danger small fw-bold';
        }
    };
    reader.readAsArrayBuffer(file);
}

function clearAllData() {
    clearAllDummyData();
}

// ==================== IMPORT DATA LAMA ====================

function prosesImportDataLama() {
    const fileInput = document.getElementById('fileDataLama');
    const file = fileInput.files[0];

    if (!file) {
        alert('Pilih file data lama terlebih dahulu!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
                alert('File kosong atau tidak valid!');
                return;
            }

            const headers = jsonData[0];
            const colMap = mapColumnsDataLama(headers);

            let allData = DataStore.getAll();
            let addCount = 0;
            let detailResults = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const namaLama = String(getValue(row, colMap.nama) || '').trim();
                if (!namaLama) continue;

                const vo2maxLama = parseFloat(getValue(row, colMap.vo2max)) || 0;
                const kategoriLama = String(getValue(row, colMap.kategori) || '').trim();
                const waktuLama = String(getValue(row, colMap.waktu) || '').trim();
                const hrLama = parseInt(getValue(row, colMap.hr)) || 0;
                const usia = parseInt(getValue(row, colMap.usia)) || 0;
                const tb = parseFloat(getValue(row, colMap.tb)) || 0;
                const bb = parseFloat(getValue(row, colMap.bb)) || 0;

                let genderText = 'Laki-laki';
                let genderValue = 1;
                const jkRaw = String(getValue(row, colMap.jk) || '').trim().toUpperCase();
                if (jkRaw === '0' || jkRaw === 'P' || jkRaw === 'PEREMPUAN' || jkRaw === 'WANITA') {
                    genderText = 'Perempuan';
                    genderValue = 0;
                }

                let tglTesLama = '';
                if (colMap.tglTes !== -1) {
                    const rawDate = getValue(row, colMap.tglTes);
                    if (rawDate) {
                        if (rawDate instanceof Date) {
                            tglTesLama = rawDate.toISOString().split('T')[0];
                        } else {
                            const parsed = new Date(String(rawDate));
                            if (!isNaN(parsed.getTime())) {
                                tglTesLama = parsed.toISOString().split('T')[0];
                            } else {
                                tglTesLama = String(rawDate).trim();
                            }
                        }
                    }
                }
                if (!tglTesLama) tglTesLama = 'Data Lama';

                const imt = tb > 0 && bb > 0 ? Calculations.hitungIMT(bb, tb) : 0;
                const kategoriIMT = imt > 0 ? Calculations.getKategoriIMT(imt) : '-';

                const pesertaLama = {
                    id: Date.now() + '_' + i,
                    bib: '',
                    nama: namaLama,
                    usia: usia,
                    gender: genderValue,
                    jenisKelamin: genderText,
                    tglTes: tglTesLama,
                    bb: bb,
                    tb: tb,
                    waktuMenit: 0,
                    waktuDetik: 0,
                    waktuTempuh: waktuLama || '-',
                    hr: hrLama,
                    vo2max: vo2maxLama,
                    kategoriKebugaran: kategoriLama || '-',
                    imt: imt,
                    kategoriIMT: kategoriIMT,
                    totalMET: 0,
                    kategoriIPAQ: '-',
                    jenisTes: 'lama'
                };

                // Anti-duplicate: update existing lama record by name, don't add new
                const existingIdx = allData.findIndex(d => 
                    d.jenisTes === 'lama' && d.nama && d.nama.toLowerCase().trim() === namaLama.toLowerCase().trim()
                );
                if (existingIdx !== -1) {
                    allData[existingIdx] = { ...allData[existingIdx], ...pesertaLama, id: allData[existingIdx].id };
                } else {
                    allData.push(pesertaLama);
                }
                addCount++;

                detailResults.push({
                    bib: '-',
                    nama: namaLama,
                    vo2maxLama: vo2maxLama,
                    kategoriLama: kategoriLama || '-',
                    vo2maxBaru: 0,
                    selisih: '-',
                    status: 'Data Lama'
                });
            }

            DataStore.saveAll(allData).then(() => {
                refreshAll();
                showToast(`Import Data Lama selesai! ${addCount} data lama berhasil ditambahkan.`);
                fileInput.value = '';
                window.location.href = 'index.html#perbandingan';
            });

        } catch (error) {
            console.error('Error importing data lama:', error);
            alert('Gagal import file. Pastikan format file benar.\nError: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function mapColumnsDataLama(headers) {
    const colMap = {
        nama: -1, vo2max: -1, kategori: -1, waktu: -1, hr: -1,
        usia: -1, tb: -1, bb: -1, jk: -1, tglTes: -1
    };

    const keywords = {
        nama: ['nama', 'nama lengkap', 'name'],
        vo2max: ['vo2max', 'vo2 max', 'hasil vo2', 'vo2', 'hasil vo2max'],
        kategori: ['kategori kebugaran', 'kategori', 'category', 'hasil kategori', 'kategori global'],
        waktu: ['hasil waktu', 'waktu', 'time', 'finish', 'waktu tempuh'],
        hr: ['heart rate', 'hr', 'denyut', 'nadi', 'pulse'],
        usia: ['usia', 'age', 'umur'],
        tb: ['tinggi', 'tinggi badan', 'height', 'tb'],
        bb: ['berat', 'berat badan', 'weight', 'bb'],
        jk: ['jenis kelamin', 'jk', 'gender', 'sex', 'l/p'],
        tglTes: ['timestamp', 'tanggal', 'date', 'tgl']
    };

    headers.forEach((header, index) => {
        if (!header) return;
        const h = String(header).toLowerCase().trim();
        for (const [key, words] of Object.entries(keywords)) {
            if (colMap[key] === -1) {
                for (const word of words) {
                    if (h.includes(word)) {
                        colMap[key] = index;
                        break;
                    }
                }
            }
        }
    });

    if (colMap.nama === -1) colMap.nama = 1;

    return colMap;
}


// ==================== LOGOUT ====================

function handleLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        localStorage.removeItem('ppg_admin_logged_in');
        window.location.href = 'index.html';
    }
}

// ==================== TOAST NOTIFICATION ====================

function showToast(message, type) {
    type = type || 'success';
    const toastEl = document.getElementById('appToast');
    const toastBody = document.getElementById('toastMessage');
    toastBody.textContent = message;
    toastEl.className = 'toast align-items-center text-bg-' + type + ' border-0';
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}
