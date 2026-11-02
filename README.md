# BambangShop RESTful Catalog API — Hands-on Template

This directory contains the starter template for the hands-on tutorial in **Module 08: Django REST Framework** for Platform-Based Programming (PBP).

By executing the step-by-step milestones below, this template will become a fully functional RESTful application matching `bambangshop_api`.

---

## Hands-on Roadmap (see the last chapter in Module 8)

### Milestone 1: Define Models and Serialization
1. In `bambangshop_api/settings.py`, register `'rest_framework'`, `'rest_framework.authtoken'`, and `'catalog'` in `INSTALLED_APPS`.
2. In `catalog/models.py`, implement `Category` and `Product` models.
3. Run database migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. In `catalog/serializers.py`, implement `CategorySerializer` and `ProductSerializer`.

### Milestone 2: ViewSets, Permissions, and Routers
1. In `catalog/permissions.py`, implement `IsOwnerOrReadOnly` custom object-level permission.
2. In `catalog/views.py`, implement `CategoryViewSet` and `ProductViewSet` extending `ModelViewSet`.
3. In `catalog/urls.py`, configure `DefaultRouter` and register both viewsets under `/api/v1/`.

### Milestone 3: Filtering, Search, and OpenAPI / Swagger Integration
1. In `catalog/views.py`, add `DjangoFilterBackend`, `SearchFilter`, and `OrderingFilter` to `ProductViewSet`, and implement the `@action` restock endpoint.
2. In `bambangshop_api/settings.py`, register `'django_filters'` and `'drf_spectacular'` in `INSTALLED_APPS`, and configure `REST_FRAMEWORK` and `SPECTACULAR_SETTINGS`.
3. In `bambangshop_api/urls.py`, wire OpenAPI schema and Swagger UI endpoints (`/api/schema/`, `/api/docs/swagger/`, `/api/docs/redoc/`, `/api/v1/auth/token/`).

### Milestone 4: Integrating the Frontend with AJAX
1. Examine the modular frontend structure in `catalog/templates/catalog/product_list.html`, `catalog/templates/modals/`, and `catalog/static/catalog/`.
2. In `catalog/views.py`, implement `product_list_page` function view. Wire it at the root path in `catalog/urls.py` and include `catalog.urls` in `bambangshop_api/urls.py`.
3. In `catalog/static/catalog/js/product_list.js`, implement the client-side AJAX routines using the Fetch API with session authentication and `X-CSRFToken` protection.
4. Run the automated test suite to verify your implementation:
   ```bash
   python manage.py test
   ```

---

## Reflections

### Reflection Practice-1
1. *In ProductSerializer, why are owner and category_name configured with read_only=True via ReadOnlyField? What security vulnerability occurs if owner is writable?*
   - Field owner dan category_name bersifat informatif dan nilainya ditentukan oleh server. Field owner diisi secara otomatis melalui perform_create berdasarkan request.user, sedangkan category_name diperoleh dari relasi ForeignKey. Jika owner bersifat writable, hal ini dapat menimbulkan celah keamanan berupa Privilege Escalation / Ownership Spoofing. Pengguna yang berniat jahat dapat memanipulasi kepemilikan produk dengan mengirimkan ID pengguna lain dalam payload request, sehingga produk dapat dibuat atau diubah seolah-olah dimiliki oleh pengguna tersebut.

2. *Explain the execution order of field-level validation (validate_price) versus object-level validation (validate). When would you choose one over the other?*
   - Urutan Eksekusi: Validasi tingkat field (seperti validate_price) dieksekusi terlebih dahulu untuk setiap field secara independen. Jika seluruh validasi tingkat field berhasil/lolos, barulah DRF mengeksekusi validasi tingkat objek (validate(self, attrs)).
   - Kriteria Penggunaan: Gunakan validasi tingkat field untuk aturan terisolasi yang hanya melibatkan satu atribut (misalnya memastikan nilai price harus positif). Gunakan validasi tingkat objek ketika logika validasi memerlukan perbandingan atau ketergantungan antar-beberapa field sekaligus (misalnya memastikan discount_price bernilai lebih kecil dari price).

### Reflection Practice-2
1. *When an anonymous user attempts to issue an HTTP DELETE request to `/api/v1/products/1/`, which permission check fails first? Explain the step-by-step evaluation between IsAuthenticatedOrReadOnly and IsOwnerOrReadOnly.*
   - **`IsAuthenticatedOrReadOnly`** gagal terlebih dahulu. DRF mengevaluasi kelas *permission* secara berurutan sesuai deklarasi pada `permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]`.
      - DRF memanggil `has_permission()` pada `IsAuthenticatedOrReadOnly`. Karena permintaan berupa HTTP `DELETE` (bukan *safe method* seperti GET) dan pengguna belum terautentikasi (*anonymous*), metode `has_permission()` langsung mengembalikan `False`.
      - DRF langsung menolak permintaan tanpa melanjutkan pemeriksaan ke permission berikutnya. Respons yang diberikan dapat berupa **`401 Unauthorized`** atau **`403 Forbidden`**, bergantung pada konfigurasi autentikasi yang digunakan. Dengan demikian, pengecekan tingkat objek `has_object_permission()` pada `IsOwnerOrReadOnly` tidak pernah dijalankan.

2. *What actions does DefaultRouter generate automatically for ProductViewSet? List each URL path, supported HTTP method, and corresponding action method.*
   - GET /api/v1/products/ -> list (Mengambil daftar seluruh produk)
   - POST /api/v1/products/ -> create (Membuat produk baru)
   - GET /api/v1/products/{id}/ -> retrieve (Mengambil detail produk tertentu)
   - PUT /api/v1/products/{id}/ -> update (Memperbarui seluruh field produk tertentu)
   - PATCH /api/v1/products/{id}/ -> partial_update (Memperbarui sebagian field produk tertentu)
   - DELETE /api/v1/products/{id}/ -> destroy (Menghapus produk tertentu)
   - POST /api/v1/products/{id}/restock/ -> restock (Custom action untuk menambah stok produk)

### Reflection Practice-3
1. *How does drf-spectacular automatically discover request and response schemas from your ViewSet and ModelSerializer classes?*
   - drf-spectacular melakukan inspeksi kode statis dan refleksi (reflection) pada komponen DRF. Library ini membaca atribut ViewSet seperti serializer_class, get_serializer_class(), queryset, dan definisi field model yang terhubung ke serializer (seperti CharField, DecimalField, ForeignKey). Tipe data tersebut dipetakan secara otomatis ke tipe data OpenAPI 3.0 (seperti string, number, integer) dan mencocokkan metode HTTP dengan aksi ViewSet yang sesuai.

2. *How does providing an interactive Swagger UI interface accelerate collaboration between backend engineers and frontend/mobile developers?*
   - Swagger UI berfungsi sebagai single source of truth interaktif yang selalu diperbarui secara otomatis mengikuti kode backend. Pengembang frontend dan mobile dapat menginspeksi struktur payload request, schema response, parameter, serta header autentikasi tanpa perlu membaca dokumentasi manual. Developer juga dapat menguji API secara langsung melalui browser, sehingga mempercepat proses integrasi dan debugging.

### Reflection Practice-4
1. *Why is the X-CSRFToken header required for session-authenticated write requests (POST, PUT, DELETE) in Django REST Framework, but omitted for read requests (GET)?*
   - Serangan CSRF (Cross-Site Request Forgery) memanfaatkan perilaku browser yang secara otomatis menyertakan cookie sesi (sessionid) pada setiap request cross-origin.
      - POST, PUT, DELETE merupakan operasi yang mengubah status data di server (state-mutating operations), sehingga memerlukan header X-CSRFToken untuk membuktikan bahwa permintaan memang berasal dari aplikasi frontend resmi.
      - GET bersifat aman dan idempotent (non-mutating), artinya tidak mengubah data di server, sehingga perlindungan CSRF tidak diperlukan untuk operasi pembacaan data.

2. *Explain the architectural difference between token-based authentication (`Authorization: Token <key>`) and session-based authentication (`sessionid` cookie) when logging in and issuing API requests from client-side JavaScript.*
   - Autentikasi Berbasis Sesi (Session-Based): Stateful. Server mengelola status sesi di database/cache, dan browser secara otomatis menyertakan cookie sessionid pada setiap request HTTP. Karena cookie dikirim otomatis, header token CSRF wajib disertakan untuk request yang memodifikasi data. Sangat cocok untuk aplikasi web hybrid same-origin
   - Autentikasi Berbasis Token (Token-Based): Stateless. Setelah berhasil login, server mengembalikan string token yang disimpan secara eksplisit oleh client (misalnya di localStorage). Client menyertakan token ini secara manual pada header Authorization: Token <key> di setiap panggilan API. Karena header custom tidak dikirimkan secara otomatis oleh browser, arsitektur ini kebal terhadap serangan CSRF tradisional dan cocok untuk SPA terpisah, aplikasi mobile, serta API publik.

3. *Explain the security distinction between client-side HTML escaping (escapeHtml) and server-side serializer validation. Why are both mechanisms essential?*
   - Validasi Serializer di Server-Side: Melindungi integritas sistem dan konsistensi database dengan menerapkan tipe data, batasan (constraints), serta logika bisnis sebelum data disimpan ke database.
   - Client-Side HTML Escaping (escapeHtml): Mencegah serangan XSS (Cross-Site Scripting) dengan mengonversi karakter HTML yang berpotensi berbahaya (seperti <script>) menjadi entitas HTML aman (seperti &lt;script&gt;) sebelum teks di-render ke DOM browser.
   - Defense-in-Depth: Keduanya sangat krusial karena validasi backend menjaga integritas database dan logika bisnis, sedangkan escaping di frontend melindungi browser pengguna dari eksekusi skrip tanpa izin.


4. *Why is event delegation on the grid container preferred over binding individual event listeners to each restock or delete button?*
   - Efisiensi Memori & Performa: Memasang satu event listener pada kontainer induk (#grid) menghindarkan overhead penggunaan memori dibanding harus memasang event listener terpisah pada setiap elemen kartu produk dinamis.
   - Penanganan DOM Dinamis: Saat kartu produk ditambah, diubah, atau di-render ulang secara dinamis melalui AJAX, event delegation secara otomatis dapat menangani interaksi tersebut tanpa perlu melakukan pemasangan ulang (re-binding) event listener ke elemen DOM yang baru dimasukkan.
