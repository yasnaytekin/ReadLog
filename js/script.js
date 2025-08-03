document.addEventListener('DOMContentLoaded', () => {
    const GOOGLE_BOOKS_API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    const searchButton = document.querySelector('.search-bar button');
    const searchInput = document.querySelector('.search-bar input');
    const autocompleteResultsDiv = document.querySelector('.autocomplete-results'); // Yeni: Otomatik tamamlama sonuç div'i

    let debounceTimeout; // Debounce için zamanlayıcı


    // --- Helper Fonksiyonlar (Mevcut olanlar ve yeniler) ---

    function updateStars(starContainer, rating, type = 'static') {
        if (!starContainer) return;

        const stars = starContainer.querySelectorAll('i');
        stars.forEach((star, index) => {
            if (index < Math.floor(rating)) {
                star.className = 'fas fa-star';
            } else if (index === Math.floor(rating) && (rating % 1 !== 0)) {
                star.className = 'fas fa-star-half-alt';
            } else {
                star.className = 'far fa-star';
            }
        });

        if (type === 'interactive') {
            starContainer.dataset.rating = rating;
        }
    }

    function createBookCard(book) {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');

        const bookId = book.id || book.volumeInfo.industryIdentifiers?.[0]?.identifier || 'no-id';
        bookCard.dataset.bookId = bookId;

        const thumbnailUrl = book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x190?text=No+Cover';
        const title = book.volumeInfo.title || 'Bilinmeyen Kitap';
        const authors = book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Bilinmeyen Yazar';

        bookCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${title} Kapak" class="book-cover">
            <p class="book-title">${title}</p>
            <p class="book-author">${authors}</p>
        `;

        bookCard.addEventListener('click', () => {
            console.log(`"${title}" kitabına tıklandı. Detay sayfasına yönlendiriliyor...`);
            window.location.href = `book-detail.html?id=${bookId}`;
        });

        return bookCard;
    }

    // Yeni: Otomatik tamamlama için kitap öğesi oluşturan fonksiyon
    function createAutocompleteItem(book) {
        const item = document.createElement('div');
        item.classList.add('autocomplete-item');

        const bookId = book.id || book.volumeInfo.industryIdentifiers?.[0]?.identifier || 'no-id';
        item.dataset.bookId = bookId;

        const thumbnailUrl = book.volumeInfo.imageLinks?.smallThumbnail || book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/40x60?text=No+Cover';
        const title = book.volumeInfo.title || 'Bilinmeyen Kitap';
        const authors = book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Bilinmeyen Yazar';

        item.innerHTML = `
            <img src="${thumbnailUrl}" alt="${title} Kapak">
            <div class="item-info">
                <p class="item-title">${title}</p>
                <p class="item-author">${authors}</p>
            </div>
        `;

        item.addEventListener('click', () => {
            // Tıklanan öğeye göre arama kutusunu doldur ve detay sayfasına git
            searchInput.value = title; // Arama kutusunu seçilen kitabın adıyla doldur
            autocompleteResultsDiv.style.display = 'none'; // Sonuçları gizle
            window.location.href = `book-detail.html?id=${bookId}`; // Detay sayfasına yönlendir
        });

        return item;
    }

    /**
     * API'den kitapları çeken fonksiyon.
     * @param {string} query - Arama sorgusu.
     * @param {number} maxResults - Kaç sonuç döndürüleceği.
     * @returns {Promise<Array>} Kitap verilerini içeren bir Promise.
     */
    async function fetchBooks(query, maxResults = 10) {
        if (!query.trim()) return []; // Boş sorguları engelle

        let url = `${GOOGLE_BOOKS_API_BASE_URL}?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

        // "popüler kitaplar" gibi özel bir sorgu için
        if (query === "popüler kitaplar" && document.body.classList.contains('home-page')) {
            // Ana sayfada popüler kitaplar için daha genel bir arama yapılabilir
            url = `${GOOGLE_BOOKS_API_BASE_URL}?q=bestseller&orderBy=relevance&maxResults=${maxResults}`;
        }
        // Otomatik tamamlama için daha az bilgi içeren bir URL de kullanılabilir,
        // ancak genel arama yeterli olacaktır.
        // Google Books API'de otomatik tamamlama için ayrı bir endpoint yok,
        // bu yüzden standart arama endpoint'ini kullanacağız.

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error("Kitaplar çekilirken bir hata oluştu:", error);
            return [];
        }
    }


    // --- Event Listeners ---

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (!loginBtn.classList.contains('active')) {
                window.location.href = '../html/login.html';
            }
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            if (!signupBtn.classList.contains('active')) {
                window.location.href = '../html/signup.html';
            }
        });
    }

    // Arama kutusuna her yazıldığında otomatik tamamlama tetiklenir
    if (searchInput && autocompleteResultsDiv) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout); // Önceki zamanlayıcıyı temizle
            const query = searchInput.value.trim();

            if (query.length > 2) { // 2 karakterden sonra aramayı başlat
                debounceTimeout = setTimeout(async () => {
                    const books = await fetchBooks(query, 5); // Otomatik tamamlama için 5 sonuç yeterli
                    displayAutocompleteResults(books);
                }, 300); // 300ms gecikme
            } else {
                autocompleteResultsDiv.style.display = 'none'; // Daha az karakterde gizle
                autocompleteResultsDiv.innerHTML = ''; // İçeriği temizle
            }
        });

        // Arama kutusu odak dışına çıktığında sonuçları gizle (küçük bir gecikmeyle)
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                autocompleteResultsDiv.style.display = 'none';
            }, 100); // Item click eventinin tetiklenmesi için küçük bir gecikme
        });

        // Arama kutusuna tekrar odaklandığında ve içerik varsa sonuçları göster
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length > 2 && autocompleteResultsDiv.children.length > 0) {
                autocompleteResultsDiv.style.display = 'block';
            }
        });
    }


    // Arama butonuna tıklama olayı (Ana arama)
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', async () => {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                console.log(`Ana Arama Yapılıyor: "${searchTerm}"`);
                alert(`Tam arama sonuçları gösteriliyor: ${searchTerm}`);
                // İleride burada search.html gibi bir arama sonuç sayfasına yönlendirebiliriz
                // window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
            } else {
                alert("Lütfen aramak istediğiniz kitabı girin.");
            }
        });

        // Enter tuşu ile arama yapma
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                searchButton.click();
            }
        });
    }

    // Yeni: Otomatik tamamlama sonuçlarını gösteren fonksiyon
    function displayAutocompleteResults(books) {
        autocompleteResultsDiv.innerHTML = ''; // Eski sonuçları temizle

        if (books.length > 0) {
            books.forEach(book => {
                const item = createAutocompleteItem(book);
                autocompleteResultsDiv.appendChild(item);
            });
            autocompleteResultsDiv.style.display = 'block'; // Sonuçları göster
        } else {
            autocompleteResultsDiv.style.display = 'none'; // Sonuç yoksa gizle
        }
    }


    // --- Sayfaya Özel Fonksiyonlar (Mevcut kod) ---

    // Ana Sayfa (index.html) için
    if (document.body.classList.contains('home-page')) {
        const trendBooksContainer = document.querySelector('.trend-books .book-list');

        // Yeni: Kategori elementlerini seçelim
        const categoryItems = document.querySelectorAll('.category-item');

        // Kategori öğelerine tıklama olay dinleyicisi ekle
        if (categoryItems.length > 0 && trendBooksContainer) {
            categoryItems.forEach(item => {
                item.addEventListener('click', async (event) => {
                    event.preventDefault(); // Sayfa yenilemesini engelle

                    // Tıklanan kategoriyi al
                    const category = item.dataset.category;
                    const categoryDisplayName = item.textContent; // Kullanıcıya göstereceğimiz isim

                    console.log(`"${categoryDisplayName}" kategorisine tıklandı. Kitaplar çekiliyor...`);

                    // Tüm kategori butonlarından 'active' sınıfını kaldır
                    categoryItems.forEach(link => link.classList.remove('active'));
                    // Tıklanan kategori butonuna 'active' sınıfını ekle (opsiyonel: görsel geri bildirim için)
                    item.classList.add('active');

                    // API'den kategoriye göre kitapları çek
                    // Google Books API'de konu araması 'subject:' öneki ile yapılır.
                    const query = `subject:${category}`;
                    const books = await fetchBooks(query, 15); // 15 kitap çekelim

                    // "Trend Kitaplar" başlığını kategorinin adıyla güncelle
                    document.querySelector('.trend-books h2').textContent = `${categoryDisplayName} Kitapları`;


                    // Çekilen kitapları ana sayfadaki trend kitaplar bölümünde göster
                    if (books.length > 0) {
                        trendBooksContainer.innerHTML = ''; // Mevcut kitapları temizle
                        books.forEach(book => {
                            const bookCard = createBookCard(book);
                            trendBooksContainer.appendChild(bookCard);
                        });
                    } else {
                        trendBooksContainer.innerHTML = `<p>"${categoryDisplayName}" kategorisinde kitap bulunamadı.</p>`;
                    }
                });
            });
        }

        // Ana sayfa ilk yüklendiğinde varsayılan trend kitapları göster (Kategori tıklanmadığında)
        if (trendBooksContainer) {
            // Sadece sayfa ilk yüklendiğinde popüler kitapları çek
            // Kategori tıklandığında bu kısım tekrar çalışmayacak.
            fetchBooks("subject:classics", 15).then(books => { // Başlangıçta klasik kitapları çek
                if (books.length > 0) {
                    trendBooksContainer.innerHTML = '';
                    books.forEach(book => {
                        const bookCard = createBookCard(book);
                        trendBooksContainer.appendChild(bookCard);
                    });
                } else {
                    trendBooksContainer.innerHTML = '<p>Trend kitaplar bulunamadı.</p>';
                }
            }).catch(error => {
                console.error("Trend kitaplar yüklenirken hata:", error);
                trendBooksContainer.innerHTML = '<p>Trend kitaplar yüklenirken bir sorun oluştu.</p>';
            });
        }
    }

    // Kitap Detay Sayfası (book-detail.html) için
    if (document.body.classList.contains('book-detail-page')) {
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('id');

        if (bookId) {
            console.log(`Kitap Detay Sayfası: ID ${bookId} için veri çekiliyor.`);
            fetch(`${GOOGLE_BOOKS_API_BASE_URL}/${bookId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(book => {
                    if (book) {
                        document.title = `${book.volumeInfo.title || 'Bilinmeyen Kitap'} - ReadLog Detay`;
                        document.querySelector('.book-title-detail').textContent = book.volumeInfo.title || 'Bilinmeyen Kitap';
                        document.querySelector('.book-author-detail').textContent = book.volumeInfo.authors ? book.volumeInfo.authors.join(', ') : 'Bilinmeyen Yazar';
                        document.getElementById('book-year').textContent = book.volumeInfo.publishedDate ? book.volumeInfo.publishedDate.substring(0, 4) : 'Bilinmiyor';
                        document.getElementById('book-category').textContent = book.volumeInfo.categories ? book.volumeInfo.categories.join(', ') : 'Bilinmiyor';
                        document.getElementById('book-description-text').innerHTML = book.volumeInfo.description || 'Kitap açıklaması bulunamadı.';

                        const bookCoverElement = document.querySelector('.book-cover-detail.placeholder');
                        if (book.volumeInfo.imageLinks?.medium || book.volumeInfo.imageLinks?.thumbnail) {
                            const imageUrl = book.volumeInfo.imageLinks.medium || book.volumeInfo.imageLinks.thumbnail;
                            bookCoverElement.innerHTML = `<img src="${imageUrl}" alt="${book.volumeInfo.title} Kapak">`;
                            bookCoverElement.classList.remove('placeholder');
                            bookCoverElement.style.backgroundColor = 'transparent';
                            bookCoverElement.style.border = 'none';
                        } else {
                            bookCoverElement.textContent = 'Kapak Yok';
                        }

                        const avgRating = book.volumeInfo.averageRating || 0;
                        const ratingsCount = book.volumeInfo.ratingsCount || 0;
                        const staticStarsContainer = document.querySelector('.book-rating-summary .star-rating.static');
                        if (staticStarsContainer) {
                            updateStars(staticStarsContainer, avgRating);
                            document.querySelector('.average-rating-text').textContent = `(${avgRating} / 5) (${ratingsCount} oy)`;
                        }

                    } else {
                        alert("Kitap detayları bulunamadı.");
                        console.error("API'den kitap detayı gelmedi.");
                    }
                })
                .catch(error => {
                    console.error("Kitap detayı çekilirken hata:", error);
                    alert("Kitap detayları yüklenirken bir sorun oluştu.");
                });
        } else {
            alert("Kitap ID'si bulunamadı. Lütfen geçerli bir kitap seçin.");
            console.error("URL'de kitap ID'si yok.");
        }

        const interactiveStars = document.querySelector('.star-rating.interactive');
        if (interactiveStars) {
            const stars = interactiveStars.querySelectorAll('i');
            let currentRating = parseInt(interactiveStars.dataset.rating || '0');

            stars.forEach(star => {
                star.addEventListener('mouseover', () => {
                    const value = parseInt(star.dataset.value);
                    updateStars(interactiveStars, value, 'interactive');
                });

                star.addEventListener('mouseout', () => {
                    updateStars(interactiveStars, currentRating, 'interactive');
                });

                star.addEventListener('click', () => {
                    const value = parseInt(star.dataset.value);
                    currentRating = value;
                    interactiveStars.dataset.rating = value;
                    updateStars(interactiveStars, currentRating, 'interactive');
                    console.log(`Kitap ${currentRating} yıldız olarak puanlandı.`);
                });
            });

            updateStars(interactiveStars, currentRating, 'interactive');
        }

        const statusButtons = document.querySelectorAll('.reading-status-buttons .status-btn');
        statusButtons.forEach(button => {
            button.addEventListener('click', () => {
                const status = button.dataset.status;
                alert(`Kitap durumu "${status}" olarak ayarlandı.`);
                console.log(`Kitap durumu: ${status}`);
            });
        });

        const saveReviewBtn = document.querySelector('.btn-save-review');
        if (saveReviewBtn) {
            saveReviewBtn.addEventListener('click', (event) => {
                event.preventDefault();

                const userComment = document.getElementById('user-comment').value.trim();
                const myNotes = document.getElementById('my-notes').value.trim();
                const favoriteQuote = document.getElementById('favorite-quote').value.trim();
                const recommendReason = document.getElementById('recommend-reason').value.trim();
                const readingReason = document.getElementById('reading-reason').value;
                const rating = interactiveStars ? interactiveStars.dataset.rating : 0;

                console.log('Yorum ve Değerlendirme Kaydediliyor:');
                console.log('Puan:', rating);
                console.log('Yorum:', userComment);
                console.log('Kendi Notların:', myNotes);
                console.log('Favori Alıntı:', favoriteQuote);
                console.log('Öneri Nedeni:', recommendReason);
                console.log('Okuma Sebebi:', readingReason);

                alert('Yorumunuz ve değerlendirmeleriniz kaydedildi (şimdilik konsola yazıldı).');
            });
        }
    }

    if (document.body.classList.contains('profile-page')) {
        const profileNavLinks = document.querySelectorAll('.profile-nav-menu ul li a');

        profileNavLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();

                profileNavLinks.forEach(navLink => navLink.classList.remove('active'));
                link.classList.add('active');

                console.log(`Profilde "${link.textContent}" bölümüne gidildi.`);
                alert(`"${link.textContent}" bölümü açıldı (içerik değişimi henüz aktif değil).`);
            });
        });

        const editProfileBtn = document.querySelector('.btn-edit-profile');
        if(editProfileBtn){
            editProfileBtn.addEventListener('click', () => {
                alert("Profili düzenleme sayfası açılıyor (henüz hazır değil).");
                console.log("Profili Düzenle butonuna tıklandı.");
            });
        }
    }
});