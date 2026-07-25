/**
 * Landing Page - Sistem Tes Kebugaran PPG
 */

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin'
};

let dataTable = null;
let chartBMI = null;
let chartVO2 = null;
let chartIPAQ = null;
let lastSearchResult = null;
let currentSection = 'cek-hasil';

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function migrateDataIds() {
    const data = DataStore.getAll();
    let changed = false;
    data.forEach((p, i) => {
        if (!p.id) {
            p.id = Date.now() + i;
            changed = true;
        }
    });
    if (changed) DataStore.saveAll(data);
}

async function initializeApp() {
    await DataStore.init();
    DataStore._onUpdate = () => { refreshAll(); };
    migrateDataIds();
    initDataTable();
    initCharts();
    refreshAll();
    setupEventListeners();

    const hash = window.location.hash.replace('#', '');
    if (hash && ['cek-hasil','ranking','perbandingan','dashboard','data-peserta'].includes(hash)) {
        showSection(hash);
    } else {
        showSection('cek-hasil');
    }

    window.addEventListener('hashchange', function() {
        const h = window.location.hash.replace('#', '');
        if (h && ['cek-hasil','ranking','perbandingan','dashboard','data-peserta'].includes(h)) {
            showSection(h);
            refreshAll();
        }
    });
}

function setupEventListeners() {
    document.getElementById('formLogin').addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    document.getElementById('filterTanggalRanking').addEventListener('change', updateRanking);
}

function recalcVO2(p) {
    let vo2 = p.vo2max;
    let kategori = p.kategoriKebugaran;
    if ((!vo2 || vo2 <= 0 || isNaN(vo2)) && p.waktuMenit != null && p.hr > 0 && p.bb > 0 && p.usia > 0) {
        const g = p.gender !== undefined ? p.gender : (p.jenisKelamin === 'Perempuan' ? 0 : 1);
        vo2 = Calculations.hitungVO2Max(p.bb, p.usia, g, p.waktuMenit, p.waktuDetik || 0, p.hr);
        vo2 = Math.round(vo2 * 100) / 100;
        if (vo2 <= 0) {
            vo2 = 0;
            kategori = 'Kurang Sekali';
        } else {
            kategori = Calculations.getKategoriKebugaran(vo2, p.usia, g);
        }
    }
    return { vo2: (vo2 != null && !isNaN(vo2) && vo2 >= 0) ? vo2 : null, kategori };
}

function recalcIPAQ(p) {
    if (p.ipaq_v_days != null || p.ipaq_v_min != null || p.ipaq_m_days != null || p.ipaq_m_min != null || p.ipaq_w_days != null || p.ipaq_w_min != null) {
        const r = Calculations.hitungIPAQ(p.ipaq_v_days || 0, p.ipaq_v_min || 0, p.ipaq_m_days || 0, p.ipaq_m_min || 0, p.ipaq_w_days || 0, p.ipaq_w_min || 0);
        return { totalMET: r.total_met, kategoriIPAQ: r.kategori };
    }
    return { totalMET: p.totalMET, kategoriIPAQ: p.kategoriIPAQ };
}

// ==================== SECTION NAVIGATION ====================

function showSection(sectionId) {
    currentSection = sectionId;

    document.querySelectorAll('.section-page').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + sectionId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-menu-btn').forEach(btn => btn.classList.remove('active'));
    const navBtn = document.getElementById('nav-' + sectionId);
    if (navBtn) navBtn.classList.add('active');

    refreshAll();

    if (sectionId === 'perbandingan') {
        inisialisasiChartPerbandingan();
    }

    const bsCollapse = document.getElementById('navbarNav');
    if (bsCollapse && bsCollapse.classList.contains('show')) {
        const bsNav = bootstrap.Collapse.getInstance(bsCollapse);
        if (bsNav) bsNav.hide();
    }
}

// ==================== LOGIN ====================

function showLoginModal() {
    new bootstrap.Modal(document.getElementById('loginModal')).show();
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        errorDiv.classList.add('d-none');
        window.location.href = 'admin.html';
    } else {
        errorDiv.classList.remove('d-none');
    }
}

// ==================== AUTOCOMPLETE CEK HASIL ====================

let cekHasilDropdownIndex = -1;

function filterCekHasil() {
    const input = document.getElementById('cariBIB').value.trim().toLowerCase();
    const list = document.getElementById('ddListCekHasil');
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    list.innerHTML = '';
    cekHasilDropdownIndex = -1;

    if (!input) { list.classList.remove('show'); return; }

    const startsWith = data.filter(p => p.nama.toLowerCase().startsWith(input));
    const contains = data.filter(p => p.nama.toLowerCase().includes(input) && !p.nama.toLowerCase().startsWith(input));
    const sorted = [...startsWith, ...contains];

    if (sorted.length === 0) {
        list.innerHTML = '<div class="dd-no-result-cek">Peserta tidak ditemukan</div>';
        list.classList.add('show');
        return;
    }

    sorted.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'dd-item-cek';
        div.innerHTML = `<span class="dd-name-cek">${p.nama}</span><span class="dd-bib-cek">BIB: ${p.bib || '-'}</span>`;
        div.onmousedown = function(e) {
            e.preventDefault();
            document.getElementById('cariBIB').value = p.nama;
            list.classList.remove('show');
            cariDataIndividu();
        };
        if (i === 0) div.classList.add('active');
        list.appendChild(div);
    });

    cekHasilDropdownIndex = 0;
    list.classList.add('show');
}

function showCekHasilDropdown() {
    const input = document.getElementById('cariBIB').value.trim();
    if (input) {
        filterCekHasil();
    }
}

function hideCekHasilDropdown() {
    setTimeout(() => {
        const list = document.getElementById('ddListCekHasil');
        if (list) list.classList.remove('show');
    }, 200);
}

function handleCekHasilKeydown(e) {
    const list = document.getElementById('ddListCekHasil');
    const items = Array.from(list.querySelectorAll('.dd-item-cek'));
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        cekHasilDropdownIndex = Math.min(cekHasilDropdownIndex + 1, items.length - 1);
        items.forEach((item, i) => {
            item.classList.toggle('active', i === cekHasilDropdownIndex);
            if (i === cekHasilDropdownIndex) item.scrollIntoView({ block: 'nearest' });
        });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cekHasilDropdownIndex = Math.max(cekHasilDropdownIndex - 1, 0);
        items.forEach((item, i) => {
            item.classList.toggle('active', i === cekHasilDropdownIndex);
            if (i === cekHasilDropdownIndex) item.scrollIntoView({ block: 'nearest' });
        });
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (cekHasilDropdownIndex >= 0 && cekHasilDropdownIndex < items.length) {
            items[cekHasilDropdownIndex].click();
        } else {
            cariDataIndividu();
        }
    } else if (e.key === 'Escape') {
        list.classList.remove('show');
    }
}

function cariDataIndividu() {
    const inputBIB = document.getElementById('cariBIB').value.trim();
    if (!inputBIB) {
        alert("Masukkan nama peserta terlebih dahulu!");
        return;
    }

    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    const peserta = data.find(p => p.nama.toLowerCase() === inputBIB.toLowerCase()) ||
                    data.find(p => p.nama.toLowerCase().includes(inputBIB.toLowerCase())) ||
                    data.find(p => p.bib === String(inputBIB).padStart(3, '0'));

    if (peserta) {
        lastSearchResult = peserta;

        document.getElementById('hasilPencarian').style.display = 'block';
        document.getElementById('hasilBIB').textContent = `BIB: ${peserta.bib || '-'}`;
        document.getElementById('hasilNama').textContent = peserta.nama;

        if (peserta.imt) {
            document.getElementById('hasilIMT').textContent = peserta.imt.toFixed(2);
            const badgeIMT = document.getElementById('hasilKetIMT');
            badgeIMT.textContent = peserta.kategoriIMT || '-';
            badgeIMT.className = `badge ${getBadgeClass(peserta.kategoriIMT)}`;
        } else {
            document.getElementById('hasilIMT').textContent = '-';
            document.getElementById('hasilKetIMT').textContent = '-';
            document.getElementById('hasilKetIMT').className = 'badge bg-secondary';
        }

        const { vo2, kategori } = recalcVO2(peserta);

        if (vo2) {
            document.getElementById('hasilVO2').textContent = vo2.toFixed(2) + ' ml/kg/min';
            const badgeVO2 = document.getElementById('hasilKetVO2');
            badgeVO2.textContent = kategori || '-';
            badgeVO2.className = `badge ${getBadgeClass(kategori)}`;
        } else {
            document.getElementById('hasilVO2').textContent = 'Belum tes';
            document.getElementById('hasilKetVO2').textContent = '-';
            document.getElementById('hasilKetVO2').className = 'badge bg-secondary';
        }
    } else {
        alert("Peserta dengan nama tersebut tidak ditemukan.");
        document.getElementById('hasilPencarian').style.display = 'none';
        lastSearchResult = null;
    }
}

function showSaranFromSearch() {
    if (!lastSearchResult) return;
    const peserta = lastSearchResult;
    const saranHTML = generateRekomendasi(peserta);

    const modalBody = document.getElementById('infoModalBody');
    modalBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6 class="fw-bold text-primary border-bottom pb-2"><i class="fas fa-user me-1"></i> Ringkasan Data</h6>
                <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted" style="width:40%">Nama</td><td class="fw-semibold">${peserta.nama}</td></tr>
                    <tr><td class="text-muted">Usia</td><td>${peserta.usia || '-'} tahun</td></tr>
                    <tr><td class="text-muted">VO2Max</td><td class="fw-bold ${getWarnaKardio((() => { const r = recalcVO2(peserta); return r.kategori; })())}">${(() => { const r = recalcVO2(peserta); return r.vo2 ? r.vo2.toFixed(2) + ' ml/kg/min' : '-'; })()}</td></tr>
                    <tr><td class="text-muted">IMT</td><td>${peserta.imt ? peserta.imt.toFixed(1) : '-'}</td></tr>
                    <tr><td class="text-muted">Total MET</td><td>${(() => { const ipaq = recalcIPAQ(peserta); return ipaq.totalMET != null && ipaq.totalMET !== '' ? ipaq.totalMET : '-'; })()}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-success border-bottom pb-2"><i class="fas fa-chart-bar me-1"></i> Status Kategori</h6>
                <div class="d-flex flex-column gap-2">
                    <div>${renderStatusBadge('Kardio', peserta.kategoriKebugaran, 'fa-heartbeat', getWarnaKardio(peserta.kategoriKebugaran))}</div>
                    <div>${renderStatusBadge('Postur', peserta.kategoriIMT, 'fa-weight', getWarnaIMT(peserta.kategoriIMT))}</div>
                    <div>${renderStatusBadge('Aktivitas', (() => { const ipaq = recalcIPAQ(peserta); return ipaq.kategoriIPAQ; })(), 'fa-person-walking', getWarnaIPAQ((() => { const ipaq = recalcIPAQ(peserta); return ipaq.kategoriIPAQ; })()))}</div>
                </div>
            </div>
        </div>
        <hr class="my-3">
        <div class="saran-section">${saranHTML}</div>
    `;

    new bootstrap.Modal(document.getElementById('infoModal')).show();
}

// ==================== CHARTS ====================

function initCharts() {
    const ctxBMI = document.getElementById('chartBMI').getContext('2d');
    chartBMI = new Chart(ctxBMI, {
        type: 'doughnut',
        data: {
            labels: ['Kurus', 'Normal', 'Gemuk', 'Obesitas'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#0dcaf0', '#198754', '#ffc107', '#dc3545'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    const ctxVO2 = document.getElementById('chartVO2').getContext('2d');
    chartVO2 = new Chart(ctxVO2, {
        type: 'bar',
        data: {
            labels: ['Istimewa', 'Sangat Baik', 'Baik', 'Sedang', 'Kurang', 'Kurang Sekali'],
            datasets: [{
                label: 'Jumlah Peserta',
                data: [0, 0, 0, 0, 0, 0],
                backgroundColor: ['#198754', '#20c997', '#0d6efd', '#ffc107', '#fd7e14', '#dc3545'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    const ctxIPAQ = document.getElementById('chartIPAQ').getContext('2d');
    chartIPAQ = new Chart(ctxIPAQ, {
        type: 'doughnut',
        data: {
            labels: ['Tinggi (Aktif)', 'Sedang (Cukup Aktif)', 'Rendah (Kurang Aktif)'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#198754', '#0d6efd', '#dc3545'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ==================== DATA TABLE ====================

function initDataTable() {
    dataTable = $('#tablePeserta').DataTable({
        responsive: true,
        pageLength: 10,
        language: {
            search: "Cari:",
            lengthMenu: "Tampilkan _MENU_ data",
            info: "Menampilkan _START_ - _END_ dari _TOTAL_ data",
            infoEmpty: "Tidak ada data",
            infoFiltered: "(disaring dari _MAX_ total data)",
            zeroRecords: "Tidak ada data yang cocok"
        }
    });
}

// ==================== REFRESH ALL ====================

function refreshAll() {
    updateStats();
    updateTable();
    updateCharts();
    updateRanking();
}

function updateStats() {
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');

    document.getElementById('statTotal').textContent = data.length;

    const pesertaDenganVO2 = data.filter(p => p.vo2max && p.vo2max > 0);
    const avgVO2 = pesertaDenganVO2.length > 0
        ? (pesertaDenganVO2.reduce((sum, p) => sum + p.vo2max, 0) / pesertaDenganVO2.length).toFixed(1)
        : 0;
    document.getElementById('statAvgVO2').textContent = avgVO2;

    const avgIMT = data.length > 0
        ? (data.reduce((sum, p) => sum + (p.imt || 0), 0) / data.length).toFixed(1)
        : 0;
    document.getElementById('statAvgIMT').textContent = avgIMT;

    const pesertaDenganHR = data.filter(p => p.hr && p.hr > 0);
    const avgHR = pesertaDenganHR.length > 0
        ? Math.round(pesertaDenganHR.reduce((sum, p) => sum + p.hr, 0) / pesertaDenganHR.length)
        : 0;
    document.getElementById('statAvgHR').textContent = avgHR;
}

function updateTable() {
    if (!dataTable) return;
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    const filterTanggal = document.getElementById('filterTanggalData').value;

    let filteredData = data;
    if (filterTanggal) {
        filteredData = data.filter(p => p.tglTes === filterTanggal);
    }

    dataTable.clear();

    filteredData.forEach((p) => {
        let hrDisplay;
        if (p.hr && p.hr > 0) {
            hrDisplay = `<strong>${p.hr}</strong>`;
        } else {
            hrDisplay = '<span class="text-muted">-</span>';
        }

        const { vo2, kategori } = recalcVO2(p);
        const ipaq = recalcIPAQ(p);

        const row = [
            p.bib || '-',
            p.nama,
            p.usia || '-',
            p.jenisKelamin === 'Laki-laki' ? 'L' : (p.jenisKelamin === 'Perempuan' ? 'P' : '-'),
            p.waktuTempuh || '-',
            hrDisplay,
            vo2 != null ? `<strong>${vo2}</strong>` : '<span class="text-muted">-</span>',
            kategori && kategori !== '-' ?
                `<span class="badge badge-kategori ${getBadgeClass(kategori)}">${kategori}</span>` : '<span class="text-muted">-</span>',
            p.imt ? p.imt.toFixed(1) : '-',
            p.kategoriIMT ?
                `<span class="badge badge-kategori ${getBadgeClass(p.kategoriIMT)}">${p.kategoriIMT}</span>` : '-',
            ipaq.totalMET != null && ipaq.totalMET !== '' ? ipaq.totalMET : '-',
            ipaq.kategoriIPAQ ?
                `<span class="badge badge-kategori ${getBadgeClassIPAQ(ipaq.kategoriIPAQ)}">${ipaq.kategoriIPAQ}</span>` : '-',
            `<button class="btn btn-info btn-sm" onclick="showInfoPeserta('${p.id}')"><i class="fas fa-info-circle"></i></button>`
        ];
        dataTable.row.add(row);
    });

    dataTable.draw();
}

function showToast(message, type) {
    type = type || 'success';
    const toastEl = document.getElementById('appToast');
    if (!toastEl) return;
    const toastBody = document.getElementById('toastMessage');
    toastBody.textContent = message;
    toastEl.className = 'toast align-items-center text-bg-' + type + ' border-0';
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

// ==================== DATE FILTER ====================

function filterDataByTanggal() {
    refreshAll();
}

function resetFilterTanggal() {
    document.getElementById('filterTanggalData').value = '';
    refreshAll();
}

function updateCharts() {
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');

    const bmiDist = { 'Kurus': 0, 'Normal': 0, 'Gemuk': 0, 'Obesitas': 0 };
    data.forEach(p => {
        if (p.kategoriIMT) {
            bmiDist[p.kategoriIMT] = (bmiDist[p.kategoriIMT] || 0) + 1;
        }
    });
    chartBMI.data.datasets[0].data = [bmiDist['Kurus'], bmiDist['Normal'], bmiDist['Gemuk'], bmiDist['Obesitas']];
    chartBMI.update();

    const vo2Dist = { 'Istimewa': 0, 'Sangat Baik': 0, 'Baik': 0, 'Sedang': 0, 'Kurang': 0, 'Kurang Sekali': 0 };
    data.forEach(p => {
        if (p.kategoriKebugaran && p.kategoriKebugaran !== '-') {
            vo2Dist[p.kategoriKebugaran] = (vo2Dist[p.kategoriKebugaran] || 0) + 1;
        }
    });
    chartVO2.data.datasets[0].data = [vo2Dist['Istimewa'], vo2Dist['Sangat Baik'], vo2Dist['Baik'], vo2Dist['Sedang'], vo2Dist['Kurang'], vo2Dist['Kurang Sekali']];
    chartVO2.update();

    const ipaqDist = { 'Tinggi (Aktif)': 0, 'Sedang': 0, 'Sedang (Cukup Aktif)': 0, 'Rendah (Kurang Aktif)': 0 };
    data.forEach(p => {
        const ipaq = recalcIPAQ(p);
        if (ipaq.kategoriIPAQ) {
            ipaqDist[ipaq.kategoriIPAQ] = (ipaqDist[ipaq.kategoriIPAQ] || 0) + 1;
        }
    });
    chartIPAQ.data.datasets[0].data = [ipaqDist['Tinggi (Aktif)'], ipaqDist['Sedang'] + ipaqDist['Sedang (Cukup Aktif)'], ipaqDist['Rendah (Kurang Aktif)']];
    chartIPAQ.update();
}

// ==================== RANKING ====================

function updateRanking() {
    updateFilterTanggal();
    renderRanking();
}

function updateFilterTanggal() {
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    const select = document.getElementById('filterTanggalRanking');
    if (!select) return;
    const currentValue = select.value;

    const tanggalUnik = [...new Set(data.map(p => p.tglTes).filter(t => t))].sort().reverse();

    select.innerHTML = '<option value="semua">Semua Tanggal</option>';
    tanggalUnik.forEach(tgl => {
        const option = document.createElement('option');
        option.value = tgl;
        option.textContent = tgl;
        select.appendChild(option);
    });

    if (currentValue && (currentValue === 'semua' || tanggalUnik.includes(currentValue))) {
        select.value = currentValue;
    }
}

let currentRankingTab = 'L';

function switchRankingTab(gender) {
    currentRankingTab = gender;
    document.querySelectorAll('#rankingGenderTab .ranking-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderRanking();
}

function renderRanking() {
    const data = DataStore.getAll().filter(p => p.jenisTes !== 'lama');
    const filterTanggal = document.getElementById('filterTanggalRanking').value;
    const tbodyL = document.getElementById('rankingBodyL');
    const tbodyP = document.getElementById('rankingBodyP');

    let filteredData = data;
    if (filterTanggal !== 'semua') {
        filteredData = data.filter(p => p.tglTes === filterTanggal);
    }

    const genderLabel = { 'L': 'Laki-Laki', 'P': 'Perempuan' };

    ['L', 'P'].forEach(g => {
        const tbody = g === 'L' ? tbodyL : tbodyP;
        const genderData = filteredData.filter(p => {
            const jk = (p.jenisKelamin || '').toLowerCase();
            return g === 'L' ? (jk === 'laki-laki' || jk === 'l' || jk === 'laki') : (jk === 'perempuan' || jk === 'p' || jk === 'wanita');
        });

        const kategoriOrder = { 'Istimewa': 0, 'Sangat Baik': 1, 'Baik': 2, 'Sedang': 3, 'Kurang': 4, 'Kurang Sekali': 5 };
        const getOrder = (p) => {
            const k = p.kategoriKebugaran || '';
            return kategoriOrder[k] !== undefined ? kategoriOrder[k] : 6;
        };
        const sorted = genderData.sort((a, b) => {
            const orderA = getOrder(a);
            const orderB = getOrder(b);
            if (orderA !== orderB) return orderA - orderB;
            return (b.vo2max || 0) - (a.vo2max || 0);
        });

        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Belum ada data ${genderLabel[g]}</td></tr>`;
            return;
        }

        tbody.innerHTML = sorted.map((p, index) => {
            let rankBadge = `<span class="rank-badge">${index + 1}</span>`;
            if (index === 0) rankBadge = `<span class="rank-badge rank-1">${index + 1}</span>`;
            else if (index === 1) rankBadge = `<span class="rank-badge rank-2">${index + 1}</span>`;
            else if (index === 2) rankBadge = `<span class="rank-badge rank-3">${index + 1}</span>`;

            const vo2 = p.vo2max || 0;
            let catatan = '';
            if (vo2 === 0) {
                catatan = '<span class="text-muted fst-italic">Belum memenuhi syarat peringkat karena data VO2Max kosong/nol.</span>';
            } else if (index === 0) {
                catatan = `Berada di Peringkat 1 karena mencetak estimasi VO2Max tertinggi di kelompok ${genderLabel[g]}.`;
            } else {
                const prevVo2 = sorted[index - 1].vo2max || 0;
                const selisih = (prevVo2 - vo2).toFixed(2);
                catatan = `Berada di Peringkat ${index + 1} berdasarkan perolehan VO2Max sebesar ${vo2.toFixed(2)}. (Nilai ini lebih rendah ${selisih} poin dari peringkat di atasnya).`;
            }

            return `<tr>
                <td class="text-center">${rankBadge}</td>
                <td class="text-center"><span class="badge bg-primary">${p.bib || '-'}</span></td>
                <td class="text-start">${p.nama}</td>
                <td class="text-center">${p.tglTes || '-'}</td>
                <td class="text-center">${p.usia || '-'}</td>
                <td class="text-center">${g}</td>
                <td class="text-center"><strong>${vo2 >= 0 ? vo2.toFixed(2) : '-'}</strong></td>
                <td class="text-center">${p.kategoriKebugaran && p.kategoriKebugaran !== '-' ? `<span class="badge ${getBadgeClass(p.kategoriKebugaran)}">${p.kategoriKebugaran}</span>` : '<span class="text-muted">-</span>'}</td>
                <td class="text-start" style="font-size:0.82rem; line-height:1.4;">${catatan}</td>
            </tr>`;
        }).join('');
    });

    tbodyL.style.display = currentRankingTab === 'L' ? '' : 'none';
    tbodyP.style.display = currentRankingTab === 'P' ? '' : 'none';
}

// ==================== INFO MODAL ====================

function showInfoPeserta(id) {
    const peserta = DataStore.getById(id);
    if (!peserta) return;

    const saranHTML = generateRekomendasi(peserta);

    const modalBody = document.getElementById('infoModalBody');
    modalBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6 class="fw-bold text-primary border-bottom pb-2"><i class="fas fa-user me-1"></i> Ringkasan Data</h6>
                <table class="table table-sm table-borderless mb-0">
                    <tr><td class="text-muted" style="width:40%">Nama</td><td class="fw-semibold">${peserta.nama}</td></tr>
                    <tr><td class="text-muted">Usia</td><td>${peserta.usia || '-'} tahun</td></tr>
                    <tr><td class="text-muted">VO2Max</td><td class="fw-bold ${getWarnaKardio((() => { const r = recalcVO2(peserta); return r.kategori; })())}">${(() => { const r = recalcVO2(peserta); return r.vo2 ? r.vo2.toFixed(2) + ' ml/kg/min' : '-'; })()}</td></tr>
                    <tr><td class="text-muted">IMT</td><td>${peserta.imt ? peserta.imt.toFixed(1) : '-'}</td></tr>
                    <tr><td class="text-muted">Total MET</td><td>${(() => { const ipaq = recalcIPAQ(peserta); return ipaq.totalMET != null && ipaq.totalMET !== '' ? ipaq.totalMET : '-'; })()}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="fw-bold text-success border-bottom pb-2"><i class="fas fa-chart-bar me-1"></i> Status Kategori</h6>
                <div class="d-flex flex-column gap-2">
                    <div>${renderStatusBadge('Kardio', peserta.kategoriKebugaran, 'fa-heartbeat', getWarnaKardio(peserta.kategoriKebugaran))}</div>
                    <div>${renderStatusBadge('Postur', peserta.kategoriIMT, 'fa-weight', getWarnaIMT(peserta.kategoriIMT))}</div>
                    <div>${renderStatusBadge('Aktivitas', (() => { const ipaq = recalcIPAQ(peserta); return ipaq.kategoriIPAQ; })(), 'fa-person-walking', getWarnaIPAQ((() => { const ipaq = recalcIPAQ(peserta); return ipaq.kategoriIPAQ; })()))}</div>
                </div>
            </div>
        </div>
        <hr class="my-3">
        <div class="saran-section">${saranHTML}</div>
    `;

    new bootstrap.Modal(document.getElementById('infoModal')).show();
}

// ==================== CHART PERBANDINGAN ====================

let chartPerbandingan = null;

function inisialisasiChartPerbandingan() {
    const allData = DataStore.getAll();
    const tbody = document.getElementById('tabelPerbandinganBody');
    tbody.innerHTML = '';

    currentFilterPerbandingan = 'semua';
    document.querySelectorAll('#filterPerbandingan .filter-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-outline-secondary');
    });
    const defaultBtn = document.querySelector('#filterPerbandingan .filter-btn');
    if (defaultBtn) {
        defaultBtn.classList.remove('btn-outline-secondary');
        defaultBtn.classList.add('active', 'btn-primary');
    }

    const lamaRecords = allData.filter(p => p.jenisTes === 'lama');
    const baruRecords = allData.filter(p => p.jenisTes !== 'lama');

    const allNames = [...new Set([...lamaRecords.map(p => p.nama), ...baruRecords.map(p => p.nama)])];

    if (allNames.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    <i class="fas fa-scale-balanced fa-2x mb-2 d-block"></i>
                    Belum ada data. Import data lama dan input data baru terlebih dahulu.
                </td>
            </tr>`;
        document.getElementById('statTotalBanding').textContent = '0';
        document.getElementById('statAvgSelisih').textContent = '0';
        document.getElementById('statPersenNaik').textContent = '0%';
        return;
    }

    let dataLabels = [];
    let dataPreTest = [];
    let dataPostTest = [];
    let totalSelisih = 0;
    let jumlahAdaDua = 0;
    let jumlahNaik = 0;

    allNames.forEach(nama => {
        const lama = lamaRecords.find(p => p.nama === nama);
        const baru = baruRecords.find(p => p.nama === nama);

        const vo2Lama = lama && lama.vo2max > 0 ? lama.vo2max : 0;
        const vo2Baru = baru && baru.vo2max > 0 ? baru.vo2max : 0;
        const ketLama = lama ? (lama.kategoriKebugaran || '-') : '-';
        const ketBaru = baru ? (baru.kategoriKebugaran || '-') : '-';

        dataLabels.push(nama);
        dataPreTest.push(vo2Lama);
        dataPostTest.push(vo2Baru);

        if (vo2Lama > 0 && vo2Baru > 0) {
            jumlahAdaDua++;
            const selisih = (vo2Baru - vo2Lama).toFixed(2);
            totalSelisih += parseFloat(selisih);
            if (parseFloat(selisih) > 0) jumlahNaik++;
        }

        let keterangan = '';
        let rowType = '';
        if (vo2Lama > 0 && vo2Baru > 0) {
            const selisih = (vo2Baru - vo2Lama).toFixed(2);
            const selisihNum = parseFloat(selisih);
            const selisihTeks = selisihNum >= 0 ? '+' + selisih : selisih;
            const warnaSelisih = selisihNum > 0 ? 'text-success' : selisihNum < 0 ? 'text-danger' : 'text-secondary';
            const iconSelisih = selisihNum > 0 ? 'fa-arrow-up' : selisihNum < 0 ? 'fa-arrow-down' : 'fa-equals';

            let teksKeterangan = '';
            if (ketLama === ketBaru) {
                const arah = selisihNum > 0 ? 'meningkat' : selisihNum < 0 ? 'menurun' : 'stabil';
                teksKeterangan = `Kategori kebugaran <strong>stabil</strong> di <strong>${ketBaru}</strong>.`;
                if (selisihNum !== 0) {
                    teksKeterangan = `VO2Max ${arah} <span class="${warnaSelisih} fw-bold">${selisihTeks}</span> poin. ${teksKeterangan}`;
                } else {
                    teksKeterangan = `VO2Max tidak berubah. ${teksKeterangan}`;
                }
            } else {
                const arah = selisihNum > 0 ? 'Meningkat' : 'Menurun';
                const naikTurun = selisihNum > 0 ? 'naik' : 'turun';
                teksKeterangan = `${arah} <span class="${warnaSelisih} fw-bold">${selisihTeks}</span> poin. Kategori kebugaran ${naikTurun} dari <strong>${ketLama}</strong> menjadi <strong>${ketBaru}</strong>.`;
            }

            keterangan = `<div><span class="badge bg-primary"><i class="fas fa-scale-balanced me-1"></i>Ada Perbandingan</span></div>
                <small class="text-muted d-block mt-1" style="font-size:0.78rem; line-height:1.4;"><i class="fas ${iconSelisih} me-1 ${warnaSelisih}"></i>${teksKeterangan}</small>`;
            rowType = 'keduanya';
        } else if (vo2Lama > 0) {
            keterangan = '<span class="badge bg-secondary"><i class="fas fa-clock me-1"></i>Data Lama Saja</span>';
            rowType = 'lama';
        } else {
            keterangan = '<span class="badge bg-success"><i class="fas fa-star me-1"></i>Data Baru Saja</span>';
            rowType = 'baru';
        }

        const row = `
            <tr data-type="${rowType}">
                <td class="text-start ps-3 fw-semibold">${nama}</td>
                <td class="text-center">
                    <div class="fw-bold" style="font-size: 1.05rem;">${vo2Lama > 0 ? vo2Lama.toFixed(2) : '-'}</div>
                    <small class="text-muted" style="font-size: 0.78rem;">${ketLama}</small>
                </td>
                <td class="text-center">
                    <div class="fw-bold text-success" style="font-size: 1.05rem;">${vo2Baru > 0 ? vo2Baru.toFixed(2) : '-'}</div>
                    <small class="text-muted" style="font-size: 0.78rem;">${ketBaru}</small>
                </td>
                <td class="text-center">${keterangan}</td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });

    const avgSelisih = jumlahAdaDua > 0 ? (totalSelisih / jumlahAdaDua).toFixed(2) : '0';
    const persenNaik = jumlahAdaDua > 0 ? ((jumlahNaik / jumlahAdaDua) * 100).toFixed(0) : '0';

    document.getElementById('statTotalBanding').textContent = allNames.length;
    document.getElementById('statAvgSelisih').textContent = (parseFloat(avgSelisih) >= 0 ? '+' : '') + avgSelisih;
    document.getElementById('statPersenNaik').textContent = persenNaik + '%';

    const ctx = document.getElementById('chartPerbandinganVO2').getContext('2d');

    if (chartPerbandingan) {
        chartPerbandingan.destroy();
    }

    chartPerbandingan = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataLabels,
            datasets: [
                {
                    label: 'Data Lama',
                    data: dataPreTest,
                    backgroundColor: 'rgba(108, 117, 125, 0.7)',
                    borderColor: 'rgba(108, 117, 125, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                {
                    label: 'Data Baru',
                    data: dataPostTest,
                    backgroundColor: 'rgba(25, 135, 84, 0.8)',
                    borderColor: 'rgba(25, 135, 84, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 20, font: { size: 13, weight: '600' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 58, 95, 0.95)',
                    titleFont: { size: 14, weight: '700' },
                    bodyFont: { size: 13 },
                    bodySpacing: 6,
                    padding: 14,
                    cornerRadius: 10,
                    displayColors: true,
                    callbacks: {
                        title: function(items) {
                            return items[0].label;
                        },
                        label: function(context) {
                            const idx = context.dataIndex;
                            const lama = dataPreTest[idx];
                            const baru = dataPostTest[idx];
                            if (context.datasetIndex === 0) {
                                return ' Lama: ' + (lama > 0 ? lama.toFixed(2) + ' ml/kg/min' : '-');
                            } else {
                                return ' Baru: ' + (baru > 0 ? baru.toFixed(2) + ' ml/kg/min' : '-');
                            }
                        },
                        afterBody: function(items) {
                            const idx = items[0].dataIndex;
                            const lama = dataPreTest[idx];
                            const baru = dataPostTest[idx];
                            if (lama > 0 && baru > 0) {
                                const selisih = (baru - lama).toFixed(2);
                                const sign = parseFloat(selisih) >= 0 ? '+' : '';
                                return 'Selisih: ' + sign + selisih;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11, weight: '500' },
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'VO2Max (ml/kg/min)', font: { size: 12, weight: 'bold' } },
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { size: 11 } }
                }
            }
        }
    });
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

function getBadgeClassIPAQ(kategori) {
    const classes = {
        'Tinggi (Aktif)': 'bg-success',
        'Sedang': 'bg-primary',
        'Sedang (Cukup Aktif)': 'bg-primary',
        'Rendah (Kurang Aktif)': 'bg-danger'
    };
    return classes[kategori] || 'bg-secondary';
}

// ==================== FILTER PERBANDINGAN ====================

let currentFilterPerbandingan = 'semua';

function filterPerbandingan(filter) {
    currentFilterPerbandingan = filter;

    document.querySelectorAll('#filterPerbandingan .filter-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-outline-secondary');
    });
    event.currentTarget.classList.remove('btn-outline-secondary');
    event.currentTarget.classList.add('active', 'btn-primary');

    const rows = document.querySelectorAll('#tabelPerbandinganBody tr[data-type]');
    rows.forEach(row => {
        const type = row.getAttribute('data-type');
        if (filter === 'semua') {
            row.style.display = '';
        } else if (filter === 'lama') {
            row.style.display = type === 'lama' ? '' : 'none';
        } else if (filter === 'baru') {
            row.style.display = type === 'baru' ? '' : 'none';
        } else if (filter === 'keduanya') {
            row.style.display = type === 'keduanya' ? '' : 'none';
        }
    });
}
