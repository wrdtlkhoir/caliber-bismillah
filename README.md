# CALIBER — Plant Intelligence Dashboard

Dashboard reliability & risk untuk unit Olefins & Polyolefins. Tujuannya menjawab satu pertanyaan:
**"Apa yang perlu ditangani sekarang?"** Caranya: alarm mentah dikelompokkan jadi *problem*, lalu
problem diranking dengan **AHP (Analytic Hierarchy Process)**, dan setiap problem dihubungkan ke aksi dan pemiliknya.

> Status: **Page 1 – Overview**, **Page 2 – Problem Investigation**, **Page 3 – Root Cause & Decision**, dan
> **Page 4 – Action & Reliability** sudah jadi. Knowledge Base dan Data Sources baru berupa placeholder dengan routing.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + build produksi ke dist/
npm run preview   # serve hasil build
```

Butuh Node.js ≥ 18 (sudah dites di Node 20).

## Tech stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Build tool | **Vite 6** | Dev server instan + HMR, build cepat, konfigurasinya minim |
| UI framework | **React 18 + TypeScript** | Berbasis komponen, type-safe, ekosistemnya paling besar |
| Styling | **Tailwind CSS v4** | Design token dari Figma ditaruh di `@theme` (`src/index.css`), utility-first jadi mudah dibuat sama persis dengan Figma |
| Routing | **React Router 6** | Struktur multi-halaman sesuai sidebar; query pencarian disimpan di URL (`?q=`) |
| Icons | **lucide-react** | Set ikon yang sama gayanya dengan desain (stroke 1.5–2px) |
| Font | **Inter** + **JetBrains Mono** (via `@fontsource`) | Font di-bundle lokal, jadi tetap jalan **offline** saat presentasi |
| Chart | Komponen custom (HTML/CSS + SVG) | Ringan, tanpa library, bisa dibuat persis seperti desain, plus hover tooltip |

Tidak ada backend: data diambil dari `src/data/plant.ts` (mock). Di produksi, data ini nantinya
datang dari historian (mis. OSIsoft PI), CMMS (SAP PM), dan sistem condition monitoring.

## Struktur folder

```
src/
├── components/
│   ├── layout/        AppLayout, Sidebar, Topbar, BrandMark
│   └── ui/            Card, Mono (primitive)
├── features/overview/ Komponen Page 1
│   ├── KpiStrip.tsx          6 KPI + animasi count-up
│   ├── LifecyclePipeline.tsx Detected → … → Closed
│   ├── ProblemTank.tsx       Filter severity + sort
│   ├── ProblemCard.tsx       Kartu problem + sinyal sensor
│   ├── AskCaliber.tsx        Asisten kontekstual (Q&A)
│   ├── PriorityRanking.tsx   Ranking AHP
│   ├── UrgentActions.tsx     Aksi + owner + due date
│   └── UnitImpactChart.tsx   Downtime vs Production Loss per unit
├── features/investigation/ Komponen Page 2
│   ├── AssetSummary.tsx      Info aset + stepper lifecycle
│   ├── RelevantParameters.tsx Parameter terpilih AI + daftar semua sinyal
│   ├── ParameterCard.tsx     Kartu parameter (nilai, limit, tren)
│   ├── TrendChart.tsx        Line chart SVG + crosshair tooltip
│   ├── SidePanels.tsx        Benchmark, Impact Translation, Data Confidence
│   └── SimilarIncidents.tsx  Tabel insiden historis + filter
├── features/rootcause/ Komponen Page 3
│   ├── HypothesisCard.tsx    Kartu hipotesis (expanded / compact)
│   ├── RankingPanel.tsx      Breakdown AHP + modal pairwise matrix
│   ├── ValidationPanel.tsx   Accept / Modify / Request Evidence / Reject
│   ├── AuditTrail.tsx        Decision audit trail
│   ├── PriorCheck.tsx        Bayesian prior + perbandingan unit kembar
│   └── KnowledgePath.tsx     Knowledge path + kanvas ontologi
├── features/actions/   Komponen Page 4
│   ├── CapaTable.tsx         Tabel CAPA (status bisa diubah)
│   ├── AddActionModal.tsx    Form tambah action item
│   └── VerificationChart.tsx Chart before vs after perbaikan
├── lib/
│   ├── ahp.ts         Bobot AHP + perhitungan skor & breakdown
│   ├── ahpPairwise.ts AHP penuh: pairwise matrix → eigenvector → CR → sintesis
│   ├── useDecision.ts Keputusan engineer (disimpan di localStorage)
│   ├── usePersistentState.ts useState yang tersimpan di localStorage
│   ├── severity.ts    Mapping warna severity/status
│   ├── useCountUp.ts  Animasi angka KPI
│   ├── useLiveSeries.ts Streaming telemetry (mode Live)
│   ├── series.ts      Generator time-series mock
│   ├── dossier.ts     Export dossier investigasi (.md)
│   └── useSyncClock.ts Simulasi sinkronisasi real-time
├── data/              Tipe data + mock data
└── pages/             Overview (1), Investigation (2), RootCause (3), Actions (4), ComingSoon
```

## Fitur Page 1 (selain visual)

- **Skor AHP dihitung, bukan di-hardcode.** `lib/ahp.ts` menjumlahkan skor 6 kriteria × bobot
  (Safety 28%, Prod Loss 24%, Financial 20%, Crit. Equip 14%, Degradation 9%, Recurrence 5%).
  Hover baris ranking untuk melihat driver terbesarnya.
- **Time range 7d / 30d / 90d** mengubah KPI (dengan animasi count-up) dan grafik unit.
- **Problem Tank**: tab severity dengan jumlah per kategori, sort (AHP / Newest / ID), dan pencarian global
  di topbar (shortcut `/` atau `Ctrl+K`, `Esc` untuk clear).
- **Ask CALIBER**: klik kartu problem untuk mengganti *Active Context*. Tombol *Why prioritized? /
  What changed? / Show evidence / Next step?* menghasilkan jawaban yang dirangkai dari data
  (breakdown AHP, sinyal, aksi terkait). Fungsi `answer()` bisa diganti dengan panggilan LLM.
- **Panel saling terhubung**: klik item di Priority Ranking atau Urgent Actions akan scroll ke kartu
  terkait dan menyorotnya; hover ranking juga menyorot kartunya.
- **Grafik unit bisa diklik** untuk mengisolasi problem di unit tersebut (filter Problem Tank + ranking).
  Garis threshold putus-putus, tooltip saat hover bar.
- **Indikator real-time**: label "Sync Xm ago" berjalan, auto-sync tiap 5 menit, dan bisa diklik untuk sync manual.
- **Responsif**: sidebar jadi drawer di layar kecil, KPI menyusun ulang ke 2–3 kolom, grafik bisa di-scroll horizontal.
- **Aksesibilitas**: atribut ARIA untuk tab/radio/breadcrumb, mendukung `prefers-reduced-motion`.

## Fitur Page 2 — Problem Investigation (`/investigation/:id`)

Dibuka dari tombol **View ›** di kartu problem Page 1, atau ketik tag persis (mis. `KO-3201`) di
pencarian lalu tekan **Enter**. Kelima problem punya data investigasi lengkap.

- **Relevant Parameters (AI Filtered)**: 4 sensor paling relevan untuk failure mode, masing-masing dengan
  nilai, limit Trip/Alarm, tren (pita hijau = normal, garis merah = alarm), dan hover tooltip per titik.
  *Show all signals* membuka daftar sinyal lainnya.
- **Live Telemetry**: tombol di kanan atas menyalakan mode streaming; chart, nilai, dan pin benchmark
  bergerak setiap 1,5 detik.
- **What Changed? — Benchmark**: posisi nilai sekarang terhadap zona normal, alarm, dan kegagalan historis.
- **Impact Translation & Risk**: rantai dari anomali sensor → kesehatan mesin → bahaya operasional → biaya.
- **Data Confidence Score**: hover segmen untuk melihat sumber data mana yang sudah selaras atau belum ada.
- **Similar Historical Incidents**: filter All / High Similarity / per kategori, lengkap dengan RCA dan perbaikannya.
- **Export Dossier** mengunduh ringkasan investigasi (`.md`); **Ask CALIBER** membuka panel samping;
  **Request Field …** membuat nomor work request (toast); **Proceed to Root Cause Analysis** lanjut ke Page 3.

## Fitur Page 3 — Root Cause & Decision (`/root-cause/:id`)

Dibuka dari tombol **Proceed to Root Cause Analysis** di Page 2.

- **AHP sungguhan, bukan angka statis.** Bobot 6 kriteria (Evidence 28%, Historical 20%, Temporal 18%,
  Engineering 16%, Data Confidence 10%, Controllability 8%) dihitung dari **pairwise comparison matrix**
  skala Saaty lewat eigenvector utama. **Consistency Ratio** (CR ≈ 0.06 < 0.10) juga dihitung. Skor tiap
  hipotesis lalu disintesis dan dinormalisasi supaya totalnya 1.00 (H1 0.52 · H2 0.31 · H3 0.17).
  Klik *View pairwise comparison matrix* untuk melihat matriks, λmax, CI, RI, dan CR.
  Logikanya ada di `src/lib/ahpPairwise.ts`.
- **Klik hipotesis mana pun** untuk membuka detailnya; panel "Why is Hx ranked…" ikut berganti.
- **Engineer Validation**:
  - *Accept* mencatat keputusan dan memunculkan tombol *Proceed to Action Plan*.
  - *Reject* dan *Modify* wajib diisi justifikasinya.
  - *Request Evidence* otomatis menyebut sumber data yang belum tersedia.
  - Semua aksi masuk ke **Decision Audit Trail** dan **tersimpan di localStorage**, jadi tidak hilang saat refresh.
- **Compare Twins** membandingkan sinyal saat ini dengan kejadian serupa di unit kembar.
- **Expand Ontology Canvas** menampilkan graf failure-mode (aset → komponen → mode → bukti → riwayat → aksi).
- **Export RCA Dossier** mengunduh ranking, bukti, keputusan, dan audit trail (`.md`).

> Untuk mereset keputusan saat demo: buka DevTools → Application → Local Storage → hapus key `caliber.rc.*` (Page 3) dan `caliber.capa.*` (Page 4).

## Fitur Page 4 — Action & Reliability Loop (`/actions/:id`)

Dibuka dari tombol **Proceed to Action Plan** setelah Accept di Page 3, atau dari *View All Actions* di Page 1.

- **Terhubung dengan Page 3**: kalau hipotesis sudah di-*Accept*, banner "Validated root cause" memakai
  hipotesis dan waktu keputusan tersebut.
- **Action Plan (CAPA)**:
  - Status tiap action bisa diubah langsung dari tabel. Workflow strip (Maintenance work dst.) dan
    lifecycle ikut menyesuaikan, dan action yang lewat tenggat ditandai *Overdue*.
  - *Add Action Item* menambah baris baru dengan nomor WO otomatis.
- **Post-Action Verification**: chart before (merah) vs after (hijau) dengan garis Trip/Alarm, penanda waktu
  maintenance, dan hover tooltip.
- **Close CAPA** memperingatkan kalau masih ada action terbuka; **Reopen / Escalate** wajib diisi alasannya.
- **Symptom fixed, system cause still open** muncul otomatis selama action preventif belum selesai;
  *View Action #n* men-scroll dan menyorot baris terkait.
- **Cross-Equipment Learning**: *Create Pro-active Review* membuat nomor review untuk aset sejenis di fleet.
- Semua perubahan tersimpan di localStorage (key `caliber.capa.*`).

## Aset dari Figma

Desain: [Figma – Caliber](https://www.figma.com/design/zlQH8RYCAdNQyYJQXJvZjD/Caliber?node-id=0-1)

Logo di `components/layout/BrandMark.tsx` masih **placeholder SVG**. Untuk memakai logo resmi:
pilih logo di Figma → *Export* → SVG → simpan sebagai `public/logo.svg`, lalu ganti `<svg>` di
`BrandMark.tsx` dengan `<img src="/logo.svg" alt="Chandra Asri" className="h-8" />`.
Ikon lain sudah dari `lucide-react`, jadi tidak perlu di-export.

## Roadmap

1. Page 5–6 (Knowledge Base, Data Sources)
2. Ganti mock data dengan API (mis. React Query + REST/WebSocket untuk data real-time)
3. Ask CALIBER disambungkan ke LLM, dengan konteks dari data problem
4. Deploy ke Vercel / Netlify (`npm run build` → folder `dist/`)
