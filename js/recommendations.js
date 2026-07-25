// ==================== RECOMMENDATION ENGINE ====================

function generateRekomendasi(p) {
    const hasVO2 = p.vo2max && p.vo2max > 0;
    const hasIMT = p.imt && p.kategoriIMT;
    const hasIPAQ = p.kategoriIPAQ;

    if (!hasVO2 && !hasIMT && !hasIPAQ) {
        return '<div class="alert alert-secondary mb-0"><i class="fas fa-info-circle me-2"></i>Belum ada data tes yang tersedia untuk menghasilkan rekomendasi.</div>';
    }

    let html = '';

    html += '<div class="card border-0 shadow-sm mb-3">';
    html += '<div class="card-header bg-primary bg-opacity-10 border-0"><h6 class="fw-bold text-primary mb-0"><i class="fas fa-heartbeat me-2"></i>Status Postur & Kardio</h6></div>';
    html += '<div class="card-body" style="font-size:0.92rem; line-height:1.7;">';

    if (hasIMT && hasVO2) {
        html += `<p class="mb-0">${recGetIMTPesan(p.kategoriIMT, p.imt)} ${recGetVO2Pesan(p.kategoriKebugaran, p.vo2max)}</p>`;
    } else if (hasIMT) {
        html += `<p class="mb-0">${recGetIMTPesan(p.kategoriIMT, p.imt)}</p>`;
    } else if (hasVO2) {
        html += `<p class="mb-0">${recGetVO2Pesan(p.kategoriKebugaran, p.vo2max)}</p>`;
    } else {
        html += '<p class="text-muted mb-0">Data postur dan kardio belum tersedia.</p>';
    }
    html += '</div></div>';

    if (hasIPAQ) {
        html += '<div class="card border-0 shadow-sm mb-3">';
        html += '<div class="card-header bg-warning bg-opacity-10 border-0"><h6 class="fw-bold text-warning mb-0"><i class="fas fa-person-walking me-2"></i>Catatan Aktivitas (IPAQ)</h6></div>';
        html += '<div class="card-body" style="font-size:0.92rem; line-height:1.7;">';
        html += `<p class="mb-0">${recGetIPAQPesan(p.kategoriIPAQ)}</p>`;
        html += '</div></div>';
    }

    html += '<div class="card border-0 shadow-sm mb-3">';
    html += '<div class="card-header bg-success bg-opacity-10 border-0"><h6 class="fw-bold text-success mb-0"><i class="fas fa-clipboard-check me-2"></i>Rekomendasi Program Latihan</h6></div>';
    html += '<div class="card-body" style="font-size:0.92rem; line-height:1.7;">';
    html += '<ul class="mb-0">';
    html += hasVO2 ? recGetRekomendasiVO2(p.kategoriKebugaran) : '<li>Lengkapi tes Rockport untuk mendapatkan rekomendasi latihan kardiorespirasi yang personal.</li>';
    html += hasIPAQ ? recGetRekomendasiIPAQ(p.kategoriIPAQ) : '';
    html += hasIMT ? recGetRekomendasiIMT(p.kategoriIMT) : '';
    html += '</ul></div></div>';

    html += '<div class="card border-0 shadow-sm mb-2">';
    html += '<div class="card-header bg-info bg-opacity-10 border-0"><h6 class="fw-bold text-info mb-0"><i class="fas fa-lightbulb me-2"></i>Tips Umum Kesehatan</h6></div>';
    html += '<div class="card-body" style="font-size:0.92rem; line-height:1.7;">';
    html += '<ul class="mb-0">';
    html += '<li>Perbanyak konsumsi sayur dan buah (minimal 5 porsi/hari).</li>';
    html += '<li>Minum air putih minimal 8 gelas per hari.</li>';
    html += '<li>Istirahat cukup 7-8 jam setiap malam.</li>';
    html += '<li>Kurangi makanan olahan dan fast food.</li>';
    html += (hasVO2 && hasIMT && hasIPAQ)
        ? '<li>Lakukan evaluasi ulang secara berkala (3-6 bulan) untuk memonitor perkembangan.</li>'
        : '<li>Lengkapi semua tes (Rockport, IMT, IPAQ) untuk analisis kesehatan komprehensif.</li>';
    html += '</ul></div></div>';

    return html;
}

function recGetIMTPesan(k, imt) {
    const map = {
        'Kurus': `<strong class="text-info">Kurus</strong> (IMT: ${imt.toFixed(1)}).`,
        'Normal': `sangat baik (<strong class="text-success">Normal</strong>, IMT: ${imt.toFixed(1)}).`,
        'Gemuk': `tergolong <strong class="text-warning">Gemuk</strong> (IMT: ${imt.toFixed(1)}).`,
        'Obesitas': `tergolong <strong class="text-danger">Obesitas</strong> (IMT: ${imt.toFixed(1)}).`
    };
    return `Indeks Massa Tubuh Anda ${map[k] || `: ${imt.toFixed(1)} (${k}).`}`;
}

function recGetVO2Pesan(k, vo2) {
    const bad = ['Kurang Sekali', 'Kurang'];
    const ok = ['Sedang'];
    const good = ['Baik', 'Sangat Baik', 'Istimewa'];
    if (bad.includes(k)) return `Kapasitas jantung-paru (VO2Max) Anda berada di level <strong class="text-danger">${k}</strong> (${vo2.toFixed(2)} ml/kg/min).`;
    if (ok.includes(k)) return `dan kapasitas jantung-paru (VO2Max) Anda berada di level <strong class="text-warning">Sedang</strong> (${vo2.toFixed(2)} ml/kg/min).`;
    if (good.includes(k)) return `dan kapasitas jantung-paru (VO2Max) Anda berada di level <strong class="text-success">${k}</strong> (${vo2.toFixed(2)} ml/kg/min). Ini adalah modal fisik yang sangat baik.`;
    return `dan VO2Max Anda: ${vo2.toFixed(2)} ml/kg/min.`;
}

function recGetIPAQPesan(k) {
    const map = {
        'Rendah (Kurang Aktif)': 'Tingkat aktivitas fisik harian Anda terdeteksi masih <strong class="text-danger">Rendah</strong>. Anda termasuk dalam kategori kurang aktif.',
        'Sedang (Cukup Aktif)': 'Tingkat aktivitas fisik harian Anda <strong class="text-warning">Sedang</strong>. Anda sudah cukup aktif, namun masih ada ruang untuk peningkatan.',
        'Tinggi (Sangat Aktif)': 'Tingkat aktivitas fisik harian Anda <strong class="text-success">Tinggi</strong>. Luar biasa! Anda termasuk sangat aktif.'
    };
    return map[k] || `Aktivitas fisik harian Anda: ${k}.`;
}

function recGetRekomendasiVO2(k) {
    const map = {
        'Kurang Sekali': '<li><strong>Prioritas Utama:</strong> Mulai dengan jalan kaki pelan 10-15 menit/hari, tingkatkan secara bertahap. Konsultasikan dengan dokter sebelum memulai program olahraga.</li><li>Hindari aktivitas berat di awal program. Fokus pada aktivitas ringan seperti berkebun atau yoga.</li>',
        'Kurang': '<li><strong>Prioritas Utama:</strong> Jalan kaki rutin 15-20 menit/hari. Tambahkan aktivitas ringan seperti bersepeda santai atau berenang.</li><li>Tingkatkan durasi secara bertahap setiap minggu.</li>',
        'Sedang': '<li>Jalan cepat 20-30 menit/hari, 5x seminggu.</li><li>Tambahkan bersepeda atau berenang 1-2x seminggu.</li><li>Latihan peregangan 10-15 menit setelah olahraga.</li>',
        'Baik': '<li>Pertahankan aktivitas aerobik 150-300 menit/minggu.</li><li>Tambahkan latihan interval training 2-3x seminggu untuk meningkatkan performa.</li><li>Lakukan latihan kekuatan seluruh tubuh 2-3x seminggu.</li>',
        'Sangat Baik': '<li>Pertahankan aktivitas aerobik 200-300 menit/minggu dengan variasi intensitas.</li><li>Fokus pada latihan interval intensitas tinggi (HIIT) 2-3x seminggu.</li><li>Sertakan flexibility training dan recovery day untuk mencegah cedera.</li>',
        'Istimewa': '<li>Anda memiliki kapasitas kardiorespirasi yang luar biasa! Pertahankan dengan program periodisasi latihan.</li><li>Coba tantangan baru seperti trail running, triathlon, atau latihan spesifik olahraga Anda.</li>'
    };
    return map[k] || '<li>Lanjutkan aktivitas fisik secara rutin untuk menjaga kebugaran.</li>';
}

function recGetRekomendasiIPAQ(k) {
    const map = {
        'Rendah (Kurang Aktif)': '<li><strong>Tingkatkan aktivitas harian:</strong> Cobalah rutin berjalan kaki minimal 30 menit sehari, bersepeda santai, atau menggunakan tangga alih-alih lift.</li><li>Atur pengingat untuk bergerak setiap 1 jam jika pekerjaan Anda banyak duduk.</li>',
        'Sedang (Cukup Aktif)': '<li><strong>Pertahankan aktivitas saat ini</strong> dan tingkatkan intensitas aktivitas berat secara bertahap.</li><li>Tambahkan variasi aktivitas untuk menghindari kejenuhan.</li>',
        'Tinggi (Sangat Aktif)': '<li>Pertahankan level aktivitas tinggi saat ini! Pastikan waktu recovery yang cukup antar sesi latihan.</li>'
    };
    return map[k] || '<li>Pertahankan aktivitas fisik harian secara rutin.</li>';
}

function recGetRekomendasiIMT(k) {
    const map = {
        'Kurus': '<li><strong>Asupan Nutrisi:</strong> Tingkatkan asupan kalori 300-500 kalori dari kebutuhan dasar. Konsumsi makanan tinggi protein (daging, telur, kacang-kacangan) dan makan 5-6 kali sehari dengan porsi kecil.</li>',
        'Normal': '<li><strong>Pertahankan Pola Makan:</strong> Pola makan Anda sudah ideal. Pertahankan pola makan seimbang dengan 4 sehat 5 sempurna. Tetap perbanyak sayur dan buah (5 porsi/hari).</li>',
        'Gemuk': '<li><strong>Evaluasi Pola Makan:</strong> Kurangi asupan kalori 300-500 kalori dari kebutuhan dasar. Hindari makanan tinggi gula dan lemak. Perbanyak sayur dan protein tanpa lemak.</li>',
        'Obesitas': '<li><strong>Prioritas Kesehatan:</strong> Konsultasikan dengan dokter atau ahli gizi untuk program penurunan berat badan yang aman. Fokus pada defisit kalori sehat dan aktivitas fisik ringan.</li>'
    };
    return map[k] || '<li>Pertahankan pola makan sehat dan seimbang.</li>';
}

function renderStatusBadge(label, kategori, icon, warna) {
    if (!kategori) return `<span class="badge bg-secondary"><i class="fas ${icon} me-1"></i> ${label}: <em>Belum ada data</em></span>`;
    return `<span class="badge ${warna}"><i class="fas ${icon} me-1"></i> ${label}: ${kategori}</span>`;
}

function getWarnaKardio(kategori) {
    if (!kategori) return 'text-secondary';
    if (['Kurang Sekali', 'Kurang'].includes(kategori)) return 'text-danger';
    if (['Sedang'].includes(kategori)) return 'text-warning';
    return 'text-success';
}

function getWarnaIMT(kategori) {
    if (!kategori) return 'text-secondary';
    if (['Kurus'].includes(kategori)) return 'text-info';
    if (['Normal'].includes(kategori)) return 'text-success';
    return 'text-danger';
}

function getWarnaIPAQ(kategori) {
    if (!kategori) return 'text-secondary';
    if (['Rendah (Kurang Aktif)'].includes(kategori)) return 'text-danger';
    if (['Sedang', 'Sedang (Cukup Aktif)'].includes(kategori)) return 'text-warning';
    return 'text-success';
}
