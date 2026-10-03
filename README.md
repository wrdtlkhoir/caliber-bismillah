# CALIBER — Plant Intelligence Dashboard

Dashboard reliability & risk untuk **Case 2: Intelligent Manufacturing**. Tujuannya menjawab satu pertanyaan:
**"Apa yang perlu ditangani sekarang?"** Caranya:

1. Data condition monitoring yang terpisah-pisah diubah menjadi *problem* yang bisa ditindaklanjuti.
2. Problem diranking dengan **AHP (Analytic Hierarchy Process)**.
3. Setiap problem dihubungkan ke insiden serupa, root cause, dan CAPA beserta pemiliknya.

Semua angka di dashboard **dihitung dari dataset resmi lomba** (Equipment Performance, Production Data,
Incident Database, laporan RCA), bukan data dummy.

> Status: Page 1 Overview, Page 2 Problem Investigation, Page 3 Root Cause & Decision, dan Page 4 Action & Reliability
> sudah jadi. Knowledge Base dan Data Sources masih placeholder.

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
**tanggal replay**, yaitu slider di Page 1 dengan preset "1 week before {tag} failure". Semua halaman menghitung
kondisi aset, KPI, insiden yang sudah diketahui, dan CAPA **pada tanggal tersebut**. Dengan begitu juri bisa
melihat bagaimana degradasi sebenarnya sudah terlihat berminggu-minggu sebelum aset trip.

## Apakah perlu training AI?

**Tidak.** Dataset-nya kecil, yaitu 5 aset × 26 minggu, 5 laporan RCA, dan 380 insiden. Itu terlalu sedikit untuk
melatih model machine learning yang bisa dipercaya, dan juri tidak bisa memverifikasi model yang tidak transparan.
CALIBER memakai metode **analitik yang bisa dijelaskan**, semuanya di `src/lib/analytics.ts` dan `src/lib/ahpPairwise.ts`:

| Kemampuan | Metode | Dipakai di |
|---|---|---|
| Health & early warning | Baseline (6 pembacaan normal pertama, mean ± 2σ), *degradation index* (0 = baseline, 1 = trip), regresi linear 6 minggu terakhir → **proyeksi hari menuju alarm/trip** | Page 1, 2 |
| Backtest | Aturan early-warning diputar ulang di setiap minggu sebelum failure | Page 1 |
| Similar incident retrieval | Skor kemiripan berbobot: tipe equipment 30%, keluarga komponen 30%, mekanisme 25%, disiplin 10%, plant 5%. Hanya insiden yang sudah terjadi sebelum tanggal replay | Page 2, 3, 4 |
| Prioritas problem | AHP 6 kriteria. Konsekuensi (loss & produksi dari RCA), pre-risk, kelas aset, degradasi saat ini, rekurensi (insiden mirip) | Page 1 |
| Ranking root cause | AHP penuh: **pairwise matrix Saaty → eigenvector → Consistency Ratio (≈0.06)** → sintesis skor hipotesis. Evidence dari tabel 4P/4M+1E (NG = mendukung, G = membantah) + korelasi tren CM | Page 3 |
| KPI | Agregasi Incident Database per jendela waktu (downtime, loss, exposure risiko terbuka, closure rate, repeat pattern) | Page 1, 4 |

**Hasil backtest** dari dataset: aturan early-warning CALIBER menyala **70–105 hari sebelum failure (rata-rata 84 hari)**.
Status ALARM di data condition monitoring rata-rata baru muncul 67 hari sebelum failure. Untuk PM-4405B,
CALIBER memberi peringatan 35 hari lebih awal.

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
| Icons / Font | **lucide-react**, **Inter** + **JetBrains Mono** (`@fontsource`) | Sesuai desain, di-bundle lokal |
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
│   └── actions.ts            Builder Page 4
├── lib/
│   ├── analytics.ts          Health, early warning, backtest, retrieval, KPI, PI helper
│   ├── ahp.ts                AHP prioritas problem (Page 1)
│   ├── ahpPairwise.ts        AHP penuh untuk root cause (matrix, eigenvector, CR)
│   ├── asOf.tsx              Context tanggal replay
│   ├── useDecision.ts        Keputusan engineer (localStorage)
│   ├── usePersistentState.ts useState yang tersimpan di localStorage
│   └── dossier.ts            Export dossier investigasi & RCA (.md)
├── features/
│   ├── overview/             Page 1: AsOfControl, KpiStrip, ProblemTank, PriorityRanking, UnitImpactChart, BacktestPanel, …
│   ├── investigation/        Page 2: ParameterCard, TrendChart, PiReplay, SidePanels, SimilarIncidents, …
│   ├── rootcause/            Page 3: HypothesisCard, RankingPanel, ValidationPanel, AuditTrail, KnowledgePath, …
│   └── actions/              Page 4: CapaTable, AddActionModal, VerificationChart
├── components/               Layout (Sidebar, Topbar) & UI (Card, Modal, Drawer, Toast)
└── pages/                    Overview, Investigation, RootCause, Actions, ComingSoon
```

## Fitur per halaman

### Page 1 — Plant Intelligence (`/`)
- **Dataset replay**: slider tanggal + preset sebelum tiap failure.
- **KPI**:
  - Availability aset termonitor.
  - Downtime dan loss dari Incident DB per jendela 90 hari / 6 bulan / 12 bulan, dengan delta terhadap periode sebelumnya.
  - Exposure = potential loss dari risiko yang masih terbuka.
- **Lifecycle**: jumlah insiden per status (New Registered → RCA Process → CA/PA Execution → Monitoring → Risk Closed).
- **Problem Tank**:
  - Aset dengan fase early-warning / alarm / trip / CAPA.
  - Sinyal berisi nilai asli terhadap limit, plus proyeksi "Trip in ~N d".
  - Ranking AHP dan Ask CALIBER.
- **Urgent Actions**: action CAPA terbuka dari laporan RCA, ditandai *Overdue* relatif terhadap tanggal replay.
- **Downtime vs Loss by Plant**: data dari Incident Database. Klik plant untuk memfilter problem.
- **Early-Warning Backtest**: klik baris untuk melompat ke tanggal peringatan pertama.

### Page 2 — Problem Investigation (`/investigation/:tag`)
- **Empat parameter condition monitoring** per aset (26 minggu), lengkap dengan:
  - pita baseline, garis alarm/trip, dan tooltip,
  - perubahan 4 minggu dan proyeksi menuju alarm/trip.
- **Hourly PI Telemetry**: tombol *Live Telemetry* memutar ulang data PI jam demi jam. Untuk KO-3201,
  terlihat vibrasi naik 27–29 April sampai trip, dan arsiran abu-abu menandai jam saat RUN_STATUS = OFF.
- **Benchmark, Impact Translation, Data Confidence**: semuanya dihitung, termasuk *expected loss* dari rata-rata insiden paling mirip.
- **Similar Historical Incidents**: hasil retrieval dari 380 insiden, lengkap dengan skor dan alasan kecocokan.

### Page 3 — Root Cause & Decision (`/root-cause/:tag`)
- **H1** = root cause terverifikasi dari RCA. Bukti diambil dari item 4P / 4M+1E berstatus NG, ditambah korelasi tren CM yang dihitung.
- **H2/H3** = item berstatus G yang membantah hipotesis alternatif (mis. *process surge*, *rotor unbalance*).
- **AHP pairwise**: matriks, λmax, CI, dan CR bisa dilihat lewat *View pairwise comparison matrix*.
- **Engineer Validation**: Accept / Modify / Request Evidence / Reject. Semua aksi masuk audit trail yang diisi dari **kronologi RCA asli**.
- **Historical Prior** (insiden mirip yang sudah ditutup) dan **Knowledge Path**: aset → komponen → mode → sinyal → AR → CAPA → PM.

### Page 4 — Action & Reliability Loop (`/actions/:tag`)
- **CAPA dari RCA**: corrective, pro-active, dan preventive, lengkap dengan PIC, tanggal rencana, dan status. Status bisa diubah, dan action baru bisa ditambahkan.
- **PM schedule** dan **risk analysis** dari laporan RCA.
- **Verifikasi before/after** memakai history kondisi asli (sebelum dan sesudah repair), ditambah pengecekan normalisasi dan recurrence watch.
- **KPI dari Incident DB**: risk closure rate, CAPA plan lead time, repeat pattern rate, dan jumlah insiden in monitoring.
- **Fleet vulnerability**: tag dari action pro-active (mis. KO-3202/3203) dan aset sejenis di plant yang sama.
- **Integrasi dengan Page 3**: kalau hipotesis sudah di-*Accept* di Page 3, banner validasi memakai keputusan tersebut.

> Reset data demo: DevTools → Application → Local Storage → hapus key `caliber.*`.

## Aset dari Figma

Desain: [Figma – Caliber](https://www.figma.com/design/zlQH8RYCAdNQyYJQXJvZjD/Caliber?node-id=0-1).
Logo di `components/layout/BrandMark.tsx` masih placeholder. Untuk menggantinya, export logo resmi sebagai SVG
ke `public/logo.svg`, lalu ganti `<svg>` di komponen tersebut dengan `<img src="/logo.svg" … />`.

## Roadmap

1. Page 5–6: Knowledge Base (indeks RCA & lessons learned) dan Data Sources (status pipeline ETL).
2. Ask CALIBER via LLM + RAG atas teks RCA dan Incident Database.
3. Code-splitting dataset (dynamic import) supaya bundle awal lebih kecil.
4. Deploy ke Vercel / Netlify (`npm run build` → `dist/`).
