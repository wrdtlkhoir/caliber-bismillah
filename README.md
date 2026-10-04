# CALIBER — Plant Intelligence Dashboard

Dashboard reliability & risk untuk **Case 2: Intelligent Manufacturing**. Tujuannya menjawab satu pertanyaan:
**"Apa yang perlu ditangani sekarang?"** Caranya:

1. Data condition monitoring yang terpisah-pisah diubah menjadi *problem* yang bisa ditindaklanjuti.
2. Problem diranking dengan **AHP (Analytic Hierarchy Process)**.
3. Setiap problem dihubungkan ke insiden serupa, root cause, dan CAPA beserta pemiliknya.

Semua angka di dashboard **dihitung dari dataset resmi lomba** (Equipment Performance, Production Data,
Incident Database, laporan RCA), bukan data dummy.

> Status: Page 1 Overview, Page 2 Problem Investigation, Page 3 Root Cause & Decision, Page 4 Action & Reliability,
> Knowledge Base, dan Data Sources sudah jadi. Data HSE, energi, dan finance tidak ada di baseline sehingga
> ditampilkan sebagai Phase 2 / Future, tanpa angka.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + build produksi ke dist/
npm run preview   # serve hasil build (http://localhost:4173)
npm run data      # (opsional) bangun ulang data dari folder dataset — lihat di bawah
```

Butuh Node.js ≥ 18 (sudah dites di Node 20). Web tetap jalan **offline**: data dan font sudah ikut di-bundle.

## Data: dari dataset lomba ke dashboard

```
Case 2_ Intelligence Manufacturing/        (dataset resmi panitia)
├── Equipment Performance/*.xlsx   info aset, limit alarm/trip, 26 minggu history kondisi, KPI reliability
├── Production Data/*.xlsx         PI tag + data per jam selama 1 bulan sekitar failure
├── Incident Database/*.xlsx       380 insiden: plant, tipe, komponen, mekanisme, downtime, loss, status RCA/CAPA
└── RCA - Downtime Data/*.pptx     laporan RCA: kronologi, verifikasi 4P & 4M+1E, root cause, CAPA, PM, risk

        │  npm run data   (scripts/build-dataset.mjs — SheetJS + JSZip)
        ▼
src/data/generated/dataset.json    satu file JSON bertipe (src/data/dataset.ts), ~350 KB
        │
        ▼  src/lib/analytics.ts + builder per halaman (src/data/plant.ts, investigation.ts, rootCause.ts, actions.ts)
Dashboard
```

Kalau panitia memberi dataset baru dengan format yang sama, cukup taruh foldernya di root project lalu
jalankan `npm run data`. Script juga memberi peringatan kalau ada tabel RCA yang gagal terbaca.

### Mode replay ("as of")

Setiap failure di dataset terjadi pada tanggal berbeda (Mar–Jul 2026). Karena itu dashboard punya
**tanggal replay**, dipilih lewat dropdown periode di Page 1 (preset "1 wk before {tag} failure" atau tanggal akhir custom range). Semua halaman menghitung
kondisi aset, KPI, insiden yang sudah diketahui, dan CAPA **pada tanggal tersebut**. Dengan begitu juri bisa
melihat bagaimana degradasi sebenarnya sudah terlihat berminggu-minggu sebelum aset trip.

## Apakah perlu training AI?

**Tidak.** Dataset-nya kecil, yaitu 5 aset × 26 minggu, 5 laporan RCA, dan 380 insiden. Itu terlalu sedikit untuk
melatih model machine learning yang bisa dipercaya, dan juri tidak bisa memverifikasi model yang tidak transparan.
CALIBER memakai metode **analitik yang bisa dijelaskan**, semuanya di `src/lib/analytics.ts` dan `src/lib/ahpPairwise.ts`:

| Kemampuan | Metode | Dipakai di |
|---|---|---|
| Health & early warning | Baseline (6 pembacaan normal pertama, mean ± 2σ), *degradation index* (0 = baseline, 1 = trip), regresi linear 6 minggu terakhir → **proyeksi hari menuju alarm/trip** | Page 1, 2 |
| Similar incident retrieval | Skor kemiripan berbobot: tipe equipment 30%, keluarga komponen 30%, mekanisme 25%, disiplin 10%, plant 5%. Hanya insiden yang sudah terjadi sebelum tanggal replay | Page 2, 3, 4 |
| Prioritas problem | AHP 6 kriteria. Konsekuensi (loss & produksi dari RCA), pre-risk, kelas aset, degradasi saat ini, rekurensi (insiden mirip) | Page 1 |
| Ranking root cause | AHP penuh: **pairwise matrix Saaty (bisa diisi supervisor/user) → eigenvector → Consistency Ratio** → sintesis skor hipotesis. Evidence dari tabel 4P/4M+1E (NG = mendukung, G = membantah) + korelasi tren CM | Page 3 |
| KPI | Agregasi Incident Database per jendela waktu (downtime, loss, exposure risiko terbuka, closure rate, repeat pattern) | Page 1, 4 |

**Pengembangan berikutnya (opsional):** *Ask CALIBER* bisa disambungkan ke LLM (mis. Claude API) dengan pola
RAG, yaitu mengambil teks RCA dan insiden mirip sebagai konteks. Pola ini juga tidak butuh training. Saat ini
jawabannya disusun dari data secara rule-based supaya demo tetap offline.

## Tech stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Build tool | **Vite 6** | Dev server instan, build cepat |
| UI framework | **React 18 + TypeScript** | Berbasis komponen, type-safe |
| Styling | **Tailwind CSS v4** | Design token dari Figma di `@theme` (`src/index.css`) |
| Routing | **React Router 6** | Multi-halaman sesuai sidebar; breadcrumb dari `handle` route |
| Icons / Font | **lucide-react**, **IBM Plex Sans** + **IBM Plex Mono** (`@fontsource`) | Font industri/enterprise yang tidak generik, di-bundle lokal |
| Chart | Komponen SVG custom | Ringan, sama persis dengan desain, ada hover tooltip |
| ETL | **SheetJS** (Excel) + **JSZip** (PowerPoint) | Membaca dataset lomba langsung, tanpa konversi manual |

## Struktur folder

```
scripts/build-dataset.mjs     ETL dataset lomba → src/data/generated/dataset.json
src/
├── data/
│   ├── dataset.ts            Tipe + akses dataset hasil ETL
│   ├── plant.ts              Builder Page 1 (problem, KPI, plant, urgent action, lifecycle)
│   ├── investigation.ts      Builder Page 2
│   ├── rootCause.ts          Builder Page 3 (+ kurasi judul hipotesis & pemetaan 4P → parameter)
│   ├── actions.ts            Builder Page 4
│   ├── sources.ts            Katalog Data Sources (coverage dihitung dari dataset)
│   └── knowledge.ts          Glossary Knowledge Base (dengan label sumber)
├── lib/
│   ├── analytics.ts          Health, early warning, retrieval, KPI, PI helper
│   ├── ahp.ts                AHP prioritas problem (Page 1)
│   ├── ahpPairwise.ts        AHP penuh untuk root cause (matrix, eigenvector, CR)
│   ├── asOf.tsx              Context tanggal replay
│   ├── useDecision.ts        Keputusan engineer (localStorage)
│   ├── usePersistentState.ts useState yang tersimpan di localStorage
│   ├── role.tsx              Context role operasional + matriks permission
│   └── dossier.ts            Export dossier investigasi & RCA (PDF, jsPDF + autotable, lazy-load)
├── features/
│   ├── overview/             Page 1: PeriodSelect, KpiStrip, ProblemTank, PriorityRanking (+ LossPareto), UnitImpactChart, …
│   ├── investigation/        Page 2: ParameterCard, TrendChart, PiReplay, AskCaliberChat, SidePanels, SimilarIncidents, …
│   ├── rootcause/            Page 3: HypothesisCard, RankingPanel, ValidationPanel, AuditTrail, KnowledgePath, …
│   ├── actions/              Page 4: CapaTable, AddActionModal, VerificationChart
│   └── datasources/          UploadModal (preview metadata, pending validation)
├── components/               Layout (Sidebar, Topbar) & UI (Card, Modal, Drawer, Toast, StatusLabel)
└── pages/                    Overview, Investigation, RootCause, Actions, KnowledgeBase, DataSources
```

## Fitur per halaman

### Page 1 — Plant Intelligence (`/`)
- **Period selector**: dropdown yang bisa dicari: Last 7/30/90 days, 6/12 months, custom range, dan tanggal replay (1 minggu sebelum tiap failure, latest data). Periode selalu berakhir di tanggal replay.
- **KPI**:
  - Availability aset termonitor.
  - Downtime dan loss dari Incident DB dalam periode terpilih, dengan delta terhadap periode sebelumnya.
  - Exposure = potential loss dari risiko yang masih terbuka.
- **Lifecycle**: jumlah insiden per status (New Registered → RCA Process → CA/PA Execution → Monitoring → Risk Closed).
- **Problem Tank**:
  - Aset dengan fase early-warning / alarm / trip / CAPA.
  - Sinyal berisi nilai asli terhadap limit, plus proyeksi "Trip in ~N d".
  - Kotak pencarian, filter severity, urutan, dan pilihan tampilan **Cards / List** supaya tetap rapi saat problem banyak (kartu dibatasi 4 dengan tombol *Show more*).
  - **Risk Priority Ranking** (skor berbobot 6 kriteria) dengan tab **Pareto**: Total Loss (k US$) Incident DB per tipe equipment dalam periode terpilih, garis kumulatif %, dan referensi 80%. Ada juga Ask CALIBER.
- **Urgent Actions**: action CAPA terbuka dari laporan RCA, ditandai *Overdue* relatif terhadap tanggal replay.
- **Downtime vs Loss by Plant**: data dari Incident Database. Klik plant untuk memfilter problem.

### Page 2 — Problem Investigation (`/investigation/:tag`)
- **Empat parameter condition monitoring** per aset (26 minggu), lengkap dengan:
  - pita baseline, garis alarm/trip, dan tooltip,
  - perubahan 4 minggu dan proyeksi menuju alarm/trip.
- **Historical PI Telemetry**: data extract PI historis (bukan real-time); tombol *Replay PI history* memutar ulang data jam demi jam. Untuk KO-3201,
  terlihat vibrasi naik 27–29 April sampai trip, dan arsiran abu-abu menandai jam saat RUN_STATUS = OFF.
- **Benchmark, Impact Translation, Data Confidence**: semuanya dihitung, termasuk *expected loss* dari rata-rata insiden paling mirip.
- **Similar Historical Incidents**: hasil retrieval dari 380 insiden, lengkap dengan skor dan alasan kecocokan.

### Page 3 — Root Cause & Decision (`/root-cause/:tag`)
- **H1** = root cause terverifikasi dari RCA. Bukti diambil dari item 4P / 4M+1E berstatus NG, ditambah korelasi tren CM yang dihitung.
- **H2/H3** = item berstatus G yang membantah hipotesis alternatif (mis. *process surge*, *rotor unbalance*).
- **Pairwise matrix bisa diisi**: lewat *Fill pairwise matrix*, supervisor/user memilih nilai Saaty (1/9 sampai 9). Bobot, λmax, CI, dan CR dihitung langsung. Penilaian hanya bisa disimpan kalau CR < 0.10, lalu dipakai untuk ranking hipotesis dan dicatat siapa pengisinya.
- **Decision constraints**: ikon pensil membuka pop-up untuk menambah batasan, misalnya downtime window, budget, spare part, manpower, permit, atau komitmen produksi.
- **Solution impact report**: untuk setiap solusi CAPA dari hipotesis terpilih, ditampilkan dampak baik, dampak buruk (termasuk risk analysis dari RCA), dan benturan dengan constraint.
- **Engineer Validation**: Accept / Modify / Request Evidence / Reject. Semua aksi masuk audit trail yang diisi dari **kronologi RCA asli**.
- **Historical Prior** (insiden mirip yang sudah ditutup) dan **Knowledge Path**: aset → komponen → mode → sinyal → AR → CAPA → PM.

### Page 4 — Action & Reliability Loop (`/actions/:tag`)
- **CAPA dari RCA**: corrective, pro-active, dan preventive, lengkap dengan PIC, tanggal rencana, dan status. Status bisa diubah, action baru bisa ditambahkan, dan tabel bisa difilter per status (Open / Not started / In progress / Done) serta diurutkan berdasarkan due date, priority, status, atau tipe.
- **PM schedule** dan **risk analysis** dari laporan RCA.
- **Verifikasi before/after** memakai history kondisi asli (sebelum dan sesudah repair), ditambah pengecekan normalisasi dan recurrence watch.
- **KPI dari Incident DB**: risk closure rate, CAPA plan lead time, repeat pattern rate, dan jumlah insiden in monitoring.
- **Fleet vulnerability**: tag dari action pro-active (mis. KO-3202/3203) dan aset sejenis di plant yang sama.
- **Integrasi dengan Page 3**: kalau hipotesis sudah di-*Accept* di Page 3, banner validasi memakai keputusan tersebut.

### Role operasional

Selector di sidebar (6 role: Reliability Engineer, Operations Manager, Maintenance Planner, Finance Manager,
HSE Manager, Plant Director) menentukan kontrol edit yang aktif (`src/lib/role.tsx`). Semua role bisa melihat
keempat halaman, memakai Ask CALIBER, dan export PDF. Kontrol yang tidak diizinkan tetap terlihat tapi disabled.

| Aksi | Role yang boleh |
|---|---|
| Engineer Validation (Accept/Modify/Request evidence/Reject) | Reliability Engineer |
| Pairwise matrix Page 3, per sel: role boleh edit sel kalau memiliki kriteria baris **atau** kolom (`CRITERION_OWNERS`) | Reliability Engineer: Evidence Strength, Historical Similarity, Temporal Correlation, Engineering Consistency, Data Confidence · Maintenance Planner: Controllability & Risk · role lain: view only |
| Decision constraints | Reliability Engineer, Operations Manager |
| CAPA: tambah action, ubah status, close/reopen/escalate, fleet review; field request (Page 2) | Reliability Engineer, Maintenance Planner |

| Upload data (Data Sources), per domain | Reliability Engineer: Equipment Performance, Incident, RCA / CAPA, Downtime · Operations Manager: Production, Downtime · Maintenance Planner: Downtime, RCA / CAPA (semua: Other). Finance, HSE, Director: belum ada skema → disabled |

Ask CALIBER di Page 2 berbentuk chat **demo**: jawaban tetap disusun dari data kasus yang tampil, tidak terhubung ke LLM.

### HSE & Safety (Page 1)

Baseline **tidak punya** klasifikasi HSE (kategori *Highest Impact* semuanya operasional). Karena itu KPI
"HSE Incidents" dan status HSE ditampilkan sebagai **Phase 2 / Data not in baseline**: tanpa angka, nol, atau tren.
Section "HSE & Safety" menampilkan ketersediaan data (sistem HSE: *not connected*), metrik lingkungan masa depan
tanpa nilai, dan konteks insiden operasional aset termonitor sampai tanggal replay. Insiden ini dilabeli
**bukan** event HSE. Untuk role HSE Manager, section ini dipindah ke atas dan ranking diberi label *Operational risk view*.

### Knowledge Base & Data Sources

- **Knowledge Base** (`/knowledge`): glossary read-only berisi 56 istilah dengan search, filter kategori, dan drawer
  detail (definisi, peran di CALIBER, related terms, halaman pemakai, kasus terkait). Setiap entri diberi label sumber:
  *CALIBER case terminology*, *Provided RCA material*, atau *General industrial definition* (bukan standar internal).
  Kategori HSE sengaja kosong.
- **Data Sources** (`/data-sources`): katalog 4 sumber baseline (format file lomba dipisah dari domain data), coverage
  dan field asli, diagram arsitektur, dan sumber *Future / Conceptual* yang *not connected*. Ada juga upload XLSX/CSV
  yang hanya membaca metadata di browser lalu berstatus *Pending validation*; data hasil upload tidak pernah masuk analytics.
  Manifest file (nama, ukuran, sheet, jumlah baris/slide) ditulis oleh `npm run data` ke `sourceFiles`.

> Reset data demo: DevTools → Application → Local Storage → hapus key `caliber.*`.

## Aset dari Figma

Desain: [Figma – Caliber](https://www.figma.com/design/zlQH8RYCAdNQyYJQXJvZjD/Caliber?node-id=0-1).
Logo di `components/layout/BrandMark.tsx` masih placeholder. Untuk menggantinya, export logo resmi sebagai SVG
ke `public/logo.svg`, lalu ganti `<svg>` di komponen tersebut dengan `<img src="/logo.svg" … />`.

## Roadmap

1. Integrasi sumber Future (PI/historian, HSE, energi, ERP) setelah skema data disetujui.
2. Ask CALIBER via LLM + RAG atas teks RCA dan Incident Database.
3. Code-splitting dataset (dynamic import) supaya bundle awal lebih kecil.
4. Deploy ke Vercel / Netlify (`npm run build` → `dist/`).
