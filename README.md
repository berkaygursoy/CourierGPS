# CourierGPS 🛵

> **Real-time courier dispatch for the food & delivery industry — built for speed, designed for clarity.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🚀 Features

- **Dispatcher Control Room** — A single-screen command centre showing all pending orders, courier positions, and KPI metrics at a glance
- **Live Proximity Ranking** — Couriers are re-ranked by Haversine distance every time the dispatcher selects a different order; the two nearest idle couriers are highlighted instantly
- **Smart Order Queue** — Order strip displays queue age in real time; after a courier is assigned the dispatcher is auto-advanced to the next oldest order
- **KPI Dashboard Strip** — Live counts of pending orders, idle couriers, and in-transit deliveries with delta indicators
- **Layered REST API** — Full CRUD for `couriers`, `merchants`, and `orders` with Zod validation, typed error responses, and structured Winston logging
- **Database Migrations** — Schema versioning via `node-pg-migrate`; clean rollback support
- **Health Endpoint** — `/health` checks both PostgreSQL and Redis connectivity; compatible with Kubernetes liveness probes
- **Control Room Editorial UI** — Dark canvas design with Instrument Serif + IBM Plex typography and a vermillion signal colour system

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 (App Router) | Framework, routing, API proxy rewrites |
| [React](https://react.dev) | 19 | UI rendering |
| [Tailwind CSS](https://tailwindcss.com) | v4 | Utility-first styling |
| [TanStack React Query](https://tanstack.com/query) | v5 | Server state management & caching |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | — | Form handling & schema validation |
| [Leaflet](https://leafletjs.com) / [react-leaflet](https://react-leaflet.js.org) | 1.9 / 5.0 | Interactive map (in progress) |
| [Vitest](https://vitest.dev) | v2 | Unit testing |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 | Runtime |
| [Express](https://expressjs.com) | 4 | HTTP server |
| [PostgreSQL](https://postgresql.org) | 16 | Primary database |
| [Redis](https://redis.io) | 7 | Pub/sub, GEO queries, caching |
| [ioredis](https://github.com/redis/ioredis) | 5 | Redis client |
| [Zod](https://zod.dev) | 3 | Runtime schema validation |
| [Winston](https://github.com/winstonjs/winston) | 3 | Structured logging |
| [node-pg-migrate](https://github.com/salsita/node-pg-migrate) | 8 | Database migrations |
| [Jest](https://jestjs.io) + [Supertest](https://github.com/ladjs/supertest) | — | Integration testing |

---

## 📦 Installation

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 16
- Redis 7

### 1 — Clone the repository

```bash
git clone [REPO_URL_HERE]
cd kuryeTakip
```

### 2 — Backend setup

```bash
cd backend
npm install
```

Copy the example env file and fill in your database/Redis credentials:

```bash
cp .env.example .env
```

```env
# .env (minimum required)
DATABASE_URL=postgresql://user:password@localhost:5432/couriergps
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

Run migrations:

```bash
npm run migrate:up
```

### 3 — Frontend setup

```bash
cd ../frontend
npm install
```

```bash
cp .env.example .env.local
```

```env
# .env.local
BACKEND_URL=http://localhost:3000
```

---

## 💻 Usage

### Start the development servers

**Backend** (runs on port 3000):
```bash
cd backend
npm run dev
```

**Frontend** (runs on port 3001):
```bash
cd frontend
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Run tests

**Backend integration tests:**
```bash
cd backend
npm test
```

**Frontend unit tests:**
```bash
cd frontend
npm test
```

### API Overview

```
GET    /health                  → DB + Redis health check
GET    /api/couriers            → List all couriers
POST   /api/couriers            → Create courier
PATCH  /api/couriers/:id        → Update courier
GET    /api/orders              → List orders (filter: ?status=)
POST   /api/orders              → Create order
PATCH  /api/orders/:id          → Update / assign order
GET    /api/merchants           → List merchants
POST   /api/merchants           → Create merchant
PATCH  /api/merchants/:id       → Update merchant
DELETE /api/merchants/:id       → Delete merchant
```

---

## 🗺️ Roadmap

- [ ] **WebSocket fan-out (Socket.io)** — Push order and courier state changes to all connected dispatchers in real time without polling
- [ ] **Redis GEO queries** — Replace Haversine client-side math with `GEOADD` / `GEORADIUS` server-side lookups for sub-millisecond nearest-courier resolution
- [ ] **JWT Authentication** — Role-based access (`admin` / `dispatcher`) backed by the existing `users` table in the database schema

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please make sure your code passes all existing tests before submitting a PR.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## ✉️ Contact

**Berkay Gürsoy**
- Email: [gursoyberkay@outlook.com](mailto:gursoyberkay@outlook.com)
- LinkedIn: [www.linkedin.com/in/berkay-gürsoy]
- Portfolio: [https://berkaygursoy.github.io/myPortfolio/]

---

---

# CourierGPS 🛵

> **Yiyecek & teslimat sektörü için gerçek zamanlı kurye yönetim paneli — hız için inşa edildi, netlik için tasarlandı.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
![Lisans](https://img.shields.io/badge/Lisans-MIT-green?style=flat-square)

---

## 🚀 Özellikler

- **Dispeçer Kontrol Odası** — Bekleyen siparişleri, kurye konumlarını ve KPI metriklerini tek ekranda gösteren komuta merkezi
- **Canlı Yakınlık Sıralaması** — Dispeçer farklı bir sipariş seçtiğinde kuryeler Haversine mesafesine göre anında yeniden sıralanır; en yakın iki boş kurye vurgulanır
- **Akıllı Sipariş Kuyruğu** — Sipariş şeridi kuyruktaki bekleme süresini gerçek zamanlı gösterir; kurye ataması yapıldıktan sonra dispeçer otomatik olarak bir sonraki en eski siparişe geçer
- **KPI Gösterge Paneli** — Bekleyen sipariş, boş kurye ve yolda teslimat sayılarını delta göstergeleriyle canlı olarak yansıtır
- **Katmanlı REST API** — `couriers`, `merchants` ve `orders` için Zod doğrulamalı, tip güvenli hata yanıtlı ve Winston günlüklü tam CRUD
- **Veritabanı Migrasyonları** — `node-pg-migrate` ile şema versiyonlama; temiz geri alma desteği
- **Sağlık Endpoint'i** — `/health` hem PostgreSQL hem Redis bağlantısını kontrol eder; Kubernetes liveness probe'larıyla uyumludur
- **Control Room Editorial Arayüzü** — Instrument Serif + IBM Plex tipografisi ve vermillion sinyal renk sistemiyle koyu kanvas tasarımı

---

## 🛠️ Kullanılan Teknolojiler

### Frontend
| Teknoloji | Sürüm | Amaç |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 (App Router) | Framework, yönlendirme, API proxy yeniden yazımları |
| [React](https://react.dev) | 19 | UI render |
| [Tailwind CSS](https://tailwindcss.com) | v4 | Utility-first stil sistemi |
| [TanStack React Query](https://tanstack.com/query) | v5 | Sunucu durumu yönetimi ve önbellekleme |
| [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | — | Form yönetimi ve şema doğrulama |
| [Leaflet](https://leafletjs.com) / [react-leaflet](https://react-leaflet.js.org) | 1.9 / 5.0 | Etkileşimli harita (geliştirme aşamasında) |
| [Vitest](https://vitest.dev) | v2 | Birim testleri |

### Backend
| Teknoloji | Sürüm | Amaç |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 20 | Çalışma ortamı |
| [Express](https://expressjs.com) | 4 | HTTP sunucusu |
| [PostgreSQL](https://postgresql.org) | 16 | Ana veritabanı |
| [Redis](https://redis.io) | 7 | Pub/sub, GEO sorguları, önbellekleme |
| [ioredis](https://github.com/redis/ioredis) | 5 | Redis istemcisi |
| [Zod](https://zod.dev) | 3 | Çalışma zamanı şema doğrulama |
| [Winston](https://github.com/winstonjs/winston) | 3 | Yapılandırılmış günlükleme |
| [node-pg-migrate](https://github.com/salsita/node-pg-migrate) | 8 | Veritabanı migrasyonları |
| [Jest](https://jestjs.io) + [Supertest](https://github.com/ladjs/supertest) | — | Entegrasyon testleri |

---

## 📦 Kurulum

### Gereksinimler

- Node.js ≥ 20
- PostgreSQL 16
- Redis 7

### 1 — Depoyu klonlayın

```bash
git clone [REPO_URL_BURAYA]
cd kuryeTakip
```

### 2 — Backend kurulumu

```bash
cd backend
npm install
```

Örnek env dosyasını kopyalayın ve veritabanı/Redis bilgilerinizi girin:

```bash
cp .env.example .env
```

```env
# .env (minimum gereksinimler)
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/couriergps
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

Migrasyonları çalıştırın:

```bash
npm run migrate:up
```

### 3 — Frontend kurulumu

```bash
cd ../frontend
npm install
```

```bash
cp .env.example .env.local
```

```env
# .env.local
BACKEND_URL=http://localhost:3000
```

---

## 💻 Kullanım

### Geliştirme sunucularını başlatın

**Backend** (3000 portunda çalışır):
```bash
cd backend
npm run dev
```

**Frontend** (3001 portunda çalışır):
```bash
cd frontend
npm run dev
```

Tarayıcıda [http://localhost:3001](http://localhost:3001) adresini açın.

### Testleri çalıştırın

**Backend entegrasyon testleri:**
```bash
cd backend
npm test
```

**Frontend birim testleri:**
```bash
cd frontend
npm test
```

### API Özeti

```
GET    /health                  → Veritabanı + Redis sağlık kontrolü
GET    /api/couriers            → Tüm kuryeleri listele
POST   /api/couriers            → Kurye oluştur
PATCH  /api/couriers/:id        → Kurye güncelle
GET    /api/orders              → Siparişleri listele (filtre: ?status=)
POST   /api/orders              → Sipariş oluştur
PATCH  /api/orders/:id          → Sipariş güncelle / kurye ata
GET    /api/merchants           → İşletmeleri listele
POST   /api/merchants           → İşletme oluştur
PATCH  /api/merchants/:id       → İşletme güncelle
DELETE /api/merchants/:id       → İşletme sil
```

---

## 🗺️ Yol Haritası (Roadmap)

- [ ] **WebSocket yayını (Socket.io)** — Sipariş ve kurye durum değişikliklerini sorgulama yapmadan tüm bağlı dispeçerlere gerçek zamanlı iletme
- [ ] **Redis GEO sorguları** — İstemci tarafındaki Haversine hesaplamasını, milisaniyenin altında en yakın kurye çözümü için sunucu taraflı `GEOADD` / `GEORADIUS` sorguları ile değiştirme
- [ ] **JWT Kimlik Doğrulama** — Veritabanı şemasındaki mevcut `users` tablosuna dayanan rol tabanlı erişim kontrolü (`admin` / `dispatcher`)

---

## 🤝 Katkıda Bulunma (Contributing)

Katkılarınızı bekliyoruz! Başlamak için:

1. Depoyu fork'layın
2. Özellik dalı oluşturun: `git checkout -b ozellik/ozellik-adi`
3. Değişikliklerinizi commit'leyin: `git commit -m 'feat: yeni özellik ekle'`
4. Dalı push'layın: `git push origin ozellik/ozellik-adi`
5. Pull Request açın

PR göndermeden önce mevcut tüm testlerin geçtiğinden emin olun.

---

## 📄 Lisans (License)

Bu proje **MIT Lisansı** altında lisanslanmıştır. Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

---

## ✉️ İletişim (Contact)

**Berkay Gürsoy**
- E-posta: [gursoyberkay@outlook.com](mailto:gursoyberkay@outlook.com)
- LinkedIn: [www.linkedin.com/in/berkay-gürsoy]
- Portfolyo: [https://berkaygursoy.github.io/myPortfolio/]
