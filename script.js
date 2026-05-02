// ==========================================================================
// 1. DOM ELEMENTLERİ
// ==========================================================================
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const resultsGrid = document.getElementById('resultsGrid');
const yearFilter = document.getElementById('yearFilter');
const ratingFilter = document.getElementById('ratingFilter');
const ratingDisplay = document.getElementById('ratingDisplay');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const favCountEl = document.getElementById('favCount');
const showFavoritesBtn = document.getElementById('showFavorites');
const homeLogo = document.querySelector('.logo');

// Modal Elementleri
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModalBtn');

// Tema Elementleri
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = themeToggleBtn.querySelector('i');

// Hero Slider Elementleri
const heroSection = document.getElementById('heroSection');
const heroBackdrop = document.getElementById('heroBackdrop');
const heroTitle = document.getElementById('heroTitle');
const heroGenre = document.getElementById('heroGenre');
const heroPlot = document.getElementById('heroPlot');
const heroYear = document.getElementById('heroYear');
const heroRating = document.getElementById('heroRating').querySelector('span');
const heroPoster = document.getElementById('heroPoster');
const heroDetailBtn = document.getElementById('heroDetailBtn');
const heroFavBtn = document.getElementById('heroFavBtn');
const heroDotsContainer = document.getElementById('heroDots');

// Magic Search (AI) Elementleri
const magicSearchBtn = document.getElementById('magicSearchBtn');
let isAiMode = false;

// ==========================================================================
// 2. GLOBAL DEĞİŞKENLER
// ==========================================================================
let currentPage = 1;
let currentSearch = "";
let allFetchedMovies = []; 
let detailedMoviesCache = {}; 
let favorites = JSON.parse(localStorage.getItem('myMovies')) || [];
let totalApiResults = 0;
let isFetchingDetails = false;

// ==========================================================================
// 3. BAŞLANGIÇ VE TEMA AYARLARI
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('movieHubTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    updateFavCount();
    updateSliderFill(ratingFilter); 
    loadFeaturedHero(); 
});

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('movieHubTheme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// ==========================================================================
// 4. SİNEMATİK HERO SLIDER MANTIĞI
// ==========================================================================
let heroMovies = [];
let currentHeroIndex = 0;
let heroTimer;

async function loadFeaturedHero() {
    const featuredIds = ['tt0111161', 'tt0068646', 'tt0468569', 'tt0120737', 'tt1375666']; 
    try {
        const promises = featuredIds.map(id => fetch(`https://www.omdbapi.com/?i=${id}&apikey=${config.OMDB_API_KEY}&plot=short`).then(res => res.json()));
        heroMovies = await Promise.all(promises);
        
        createHeroDots();
        updateHeroUI(0);
        heroSection.classList.remove('hidden');
        startHeroAutoPlay();    
    } catch (error) {
        console.error("Hero Slider yüklenemedi:", error);
    }
}

function createHeroDots() {
    heroDotsContainer.innerHTML = heroMovies.map((_, i) => `<div class="hero-dot" data-index="${i}"></div>`).join('');
    document.querySelectorAll('.hero-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            stopHeroAutoPlay();
            updateHeroUI(parseInt(e.target.dataset.index));
            startHeroAutoPlay();
        });
    });
}

function updateHeroUI(index) {
    currentHeroIndex = index;
    const movie = heroMovies[index];
    const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450';
    
    const heroContentDiv = document.querySelector('.hero-content');
    const heroPosterWrapper = document.querySelector('.hero-poster-wrapper');

    heroContentDiv.classList.add('slide-out');
    heroPosterWrapper.classList.add('slide-out');
    heroBackdrop.classList.add('dimmed');

    setTimeout(() => {
        heroBackdrop.style.backgroundImage = `url('${posterUrl}')`;
        heroPoster.src = posterUrl;
        heroTitle.textContent = movie.Title;
        heroYear.textContent = movie.Year;
        heroRating.textContent = movie.imdbRating;
        heroGenre.textContent = movie.Genre && movie.Genre !== "N/A" ? movie.Genre.split(',').slice(0, 2).join(' • ') : "N/A";
        heroPlot.textContent = movie.Plot !== 'N/A' ? movie.Plot : 'No plot available.';

        document.querySelectorAll('.hero-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        heroContentDiv.classList.remove('slide-out');
        heroPosterWrapper.classList.remove('slide-out');
        heroBackdrop.classList.remove('dimmed');
    }, 500);

    heroDetailBtn.onclick = () => getMovieDetails(movie.imdbID);
    heroFavBtn.onclick = () => toggleFavorite(movie.imdbID, movie.Title, movie.Poster);
}

function startHeroAutoPlay() {
    stopHeroAutoPlay();
    heroTimer = setInterval(() => {
        let nextIndex = (currentHeroIndex + 1) % heroMovies.length;
        updateHeroUI(nextIndex);
    }, 3000); 
}

function stopHeroAutoPlay() { clearInterval(heroTimer); }

document.getElementById('heroPrev').addEventListener('click', () => {
    stopHeroAutoPlay();
    let prevIndex = (currentHeroIndex - 1 + heroMovies.length) % heroMovies.length;
    updateHeroUI(prevIndex);
    startHeroAutoPlay();
});

document.getElementById('heroNext').addEventListener('click', () => {
    stopHeroAutoPlay();
    let nextIndex = (currentHeroIndex + 1) % heroMovies.length;
    updateHeroUI(nextIndex);
    startHeroAutoPlay();
});

heroSection.addEventListener('mouseenter', stopHeroAutoPlay);
heroSection.addEventListener('mouseleave', startHeroAutoPlay);

// ==========================================================================
// 5. YAPAY ZEKA (AI) MAGIC SEARCH MANTIĞI
// ==========================================================================
magicSearchBtn.addEventListener('click', () => {
    isAiMode = !isAiMode;
    magicSearchBtn.classList.toggle('active', isAiMode);
    
    if (isAiMode) {
        searchInput.placeholder = "Describe your mood or a theme (e.g. 'cyberpunk vibes')...";
        searchInput.value = "";
        searchSuggestions.classList.add('hidden');
    } else {
        searchInput.placeholder = "Search for movies, series...";
    }
    searchInput.focus();
});

async function executeMagicSearch(query) {
    if(query.length < 3) return;
    
    heroSection.classList.add('hidden');
    loadMoreContainer.classList.add('hidden');
    
    resultsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon-wrapper" style="box-shadow: 0 0 30px rgba(255,215,0,0.4); border: 2px solid #FFD700;">
                <i class="fas fa-wand-magic-sparkles" style="font-size: 40px; color: #FFD700; animation: aiPulse 1.5s infinite;"></i>
            </div>
            <h3 style="color: #FFD700;">AI is analyzing your mood...</h3>
            <p>Looking for the best movies for you.</p>
        </div>`;

    try {
        const systemPrompt = `You are a movie expert. Suggest the top 5 great movies that fit the following user's mood or theme: "${query}". 
        Give me ONLY a valid JSON array containing the original English titles of the movies. 
        Do not provide explanations, do not converse. Just write the names inside square brackets. Example: ["Inception", "The Matrix", "Interstellar"]`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        const aiData = await aiResponse.json();

        if (aiData.error) throw new Error(aiData.error.message);

        let rawText = aiData.candidates[0].content.parts[0].text;
        
        const startIndex = rawText.indexOf('[');
        const endIndex = rawText.lastIndexOf(']');
        const jsonString = rawText.substring(startIndex, endIndex + 1);
        const recommendedMovies = JSON.parse(jsonString);

        allFetchedMovies = [];
        totalApiResults = recommendedMovies.length; // AI araması için toplam sonucu 5 yapıyoruz

        for (let title of recommendedMovies) {
            try {
                const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${config.OMDB_API_KEY}`);
                const movie = await res.json();
                if (movie.Response === "True") {
                    allFetchedMovies.push(movie);
                    detailedMoviesCache[movie.imdbID] = { Genre: movie.Genre || "", Rating: movie.imdbRating || "0" };
                }
            } catch (e) { console.error("OMDB Hatası:", e); }
        }

        applyFilters();

    } catch (error) {
        console.error("AI Hatası:", error);
        resultsGrid.innerHTML = `<div class="error-msg">AI couldn't process your request right now. Please try again.</div>`;
    }
}

// ==========================================================================
// 6. ARAMA VE FİLTRELEME SİSTEMİ
// ==========================================================================
let suggestionTimeout = null;

searchInput.addEventListener('input', (e) => {
    if (isAiMode) return; 

    clearTimeout(suggestionTimeout);
    const query = e.target.value.trim();
    
    if (query.length === 0) {
        searchSuggestions.classList.add('hidden');
        resetToHome();
        return;
    }

    suggestionTimeout = setTimeout(async () => {
        if (query.length > 2) {
            try {
                const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&page=1&apikey=${config.OMDB_API_KEY}`);
                const data = await res.json();
                if (data.Response === "True") {
                    showSuggestions(data.Search.slice(0, 5)); 
                } else {
                    searchSuggestions.classList.add('hidden');
                }
            } catch (err) { console.error(err); }
        }
    }, 400);
});

function showSuggestions(movies) {
    searchSuggestions.innerHTML = movies.map(movie => `
        <div style="display:flex; align-items:center; gap:15px; padding:12px 20px; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.2s;" 
             onmouseover="this.style.background='var(--bg-hover)'" 
             onmouseout="this.style.background='transparent'"
             onclick="selectSuggestion('${movie.imdbID}')">
            <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'}" style="width:40px; height:60px; object-fit:cover; border-radius:4px;">
            <div>
                <h4 style="margin:0; font-size:14px; color:var(--text-main);">${movie.Title}</h4>
                <span style="font-size:12px; color:var(--text-muted);">${movie.Year} • ${movie.Type.toUpperCase()}</span>
            </div>
        </div>
    `).join('');
    
    searchSuggestions.innerHTML += `
        <div style="padding:12px; text-align:center; cursor:pointer; color:var(--accent); font-weight:600; font-size:14px;"
             onclick="executeFullSearch()">
            See all results for "${searchInput.value}"
        </div>
    `;
    searchSuggestions.classList.remove('hidden');
}

function selectSuggestion(id) {
    searchSuggestions.classList.add('hidden');
    getMovieDetails(id);
}

function executeFullSearch() {
    searchSuggestions.classList.add('hidden');
    const query = searchInput.value.trim();
    
    if (query.length > 2) {
        if (isAiMode) {
            executeMagicSearch(query);
        } else {
            currentSearch = query;
            currentPage = 1;
            allFetchedMovies = []; 
            searchMovies();
        }
    }
}

async function searchMovies() {
    heroSection.classList.add('hidden'); 
    loadMoreContainer.classList.add('hidden');
    showSkeletonLoading();
    
    const type = document.querySelector('input[name="typeFilter"]:checked').value;

    try {
        let url = `https://www.omdbapi.com/?s=${encodeURIComponent(currentSearch)}&page=${currentPage}&apikey=${config.OMDB_API_KEY}`;
        if (type) url += `&type=${type}`; 

        const res = await fetch(url);
        const data = await res.json();

        if (data.Response === "True") {
            totalApiResults = parseInt(data.totalResults);
            if (currentPage === 1) allFetchedMovies = data.Search;
            else allFetchedMovies = [...allFetchedMovies, ...data.Search];
            
            const selectedGenres = Array.from(document.querySelectorAll('.genre-list input[type="checkbox"]:checked'));
            const minRating = parseFloat(ratingFilter.value);

            if((selectedGenres.length > 0 || minRating > 0) && !isFetchingDetails) await fetchAllDetailsSlowly();
            else applyFilters();
            
        } else {
            if (currentPage === 1) {
                resultsGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon-wrapper" style="box-shadow: none;">
                            <i class="fas fa-search-minus" style="font-size: 50px;"></i>
                        </div>
                        <h3 style="margin-top: 15px;">No Results Found</h3>
                        <p>We couldn't find anything matching "${currentSearch}". Try different keywords or check your filters.</p>
                    </div>`;
            }
            loadMoreContainer.classList.add('hidden');
        }
    } catch (err) {
        console.error("Search Error:", err);
        resultsGrid.innerHTML = `<div class="error-msg">A connection error occurred. Please try again.</div>`;
    }
}

async function fetchAllDetailsSlowly() {
    isFetchingDetails = true;
    for (let i = 0; i < allFetchedMovies.length; i++) {
        const movie = allFetchedMovies[i];
        if (!detailedMoviesCache[movie.imdbID]) {
            try {
                const res = await fetch(`https://www.omdbapi.com/?i=${movie.imdbID}&apikey=${config.OMDB_API_KEY}`);
                const detailData = await res.json();
                detailedMoviesCache[movie.imdbID] = { Genre: detailData.Genre || "", Rating: detailData.imdbRating || "0" };
            } catch (e) {
                detailedMoviesCache[movie.imdbID] = { Genre: "N/A", Rating: "0" };
            }
        }
    }
    isFetchingDetails = false;
    applyFilters();
}

function updateSliderFill(slider) {
    const val = slider.value;
    const percent = (val / 10) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent) ${percent}%, var(--bg-hover) ${percent}%)`;
}

ratingFilter.addEventListener('input', (e) => {
    ratingDisplay.textContent = e.target.value;
    updateSliderFill(e.target);
});

const apiFilterInputs = document.querySelectorAll('input[name="typeFilter"]');
apiFilterInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (allFetchedMovies.length > 0) {
            currentPage = 1;
            allFetchedMovies = [];
            searchMovies(); 
        }
    });
});

const uiFilterInputs = document.querySelectorAll('input[name="sortFilter"], .genre-list input[type="checkbox"]');
uiFilterInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (allFetchedMovies.length > 0) {
            const selectedGenres = Array.from(document.querySelectorAll('.genre-list input[type="checkbox"]:checked'));
            if(selectedGenres.length > 0 && !isFetchingDetails) {
                 showSkeletonLoading(); 
                 fetchAllDetailsSlowly();
            } else {
                 applyFilters();
            }
        }
    });
});

ratingFilter.addEventListener('change', () => {
     if (allFetchedMovies.length > 0) {
        const minRating = parseFloat(ratingFilter.value);
        if(minRating > 0 && !isFetchingDetails) {
             showSkeletonLoading();
             fetchAllDetailsSlowly();
        } else {
             applyFilters();
        }
    }
});

yearFilter.addEventListener('input', () => {
    if (allFetchedMovies.length > 0 && !isFetchingDetails) applyFilters();
});

function applyFilters() {
    let filteredList = [...allFetchedMovies];

    const minYearInput = parseInt(yearFilter.value);
    if (!isNaN(minYearInput) && minYearInput > 1800) {
        filteredList = filteredList.filter(movie => {
            const movieYear = parseInt(movie.Year.substring(0, 4));
            return movieYear >= minYearInput;
        });
    }

    const selectedGenres = Array.from(document.querySelectorAll('.genre-list input[type="checkbox"]:checked')).map(cb => cb.value.toLowerCase());
    if (selectedGenres.length > 0) {
        filteredList = filteredList.filter(movie => {
            const cacheData = detailedMoviesCache[movie.imdbID];
            if (!cacheData || cacheData.Genre === "N/A" || cacheData.Genre === "") return false;
            const movieGenres = cacheData.Genre.split(',').map(g => g.trim().toLowerCase());
            return selectedGenres.some(selectedGenre => movieGenres.includes(selectedGenre));
        });
    }

    const minRating = parseFloat(ratingFilter.value);
    if (minRating > 0) {
        filteredList = filteredList.filter(movie => {
            const cacheData = detailedMoviesCache[movie.imdbID];
            if (!cacheData || cacheData.Rating === "N/A") return false;
            const movieRating = parseFloat(cacheData.Rating);
            return !isNaN(movieRating) && movieRating >= minRating;
        });
    }

    const sortValue = document.querySelector('input[name="sortFilter"]:checked').value;
    filteredList.sort((a, b) => {
        const yearA = parseInt(a.Year.substring(0, 4)) || 0;
        const yearB = parseInt(b.Year.substring(0, 4)) || 0;
        if (sortValue === "newest") return yearB - yearA; 
        else return yearA - yearB; 
    });

    if (filteredList.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon-wrapper" style="box-shadow:none;">
                    <i class="fas fa-filter" style="font-size: 40px; color: var(--border);"></i>
                </div>
                <h3>No Matches Found</h3>
                <p>Try adjusting your filters to see more results.</p>
            </div>`;
    } else {
        displayResults(filteredList);
    }

    if (totalApiResults > allFetchedMovies.length && selectedGenres.length === 0 && minRating === 0 && !isAiMode) {
         loadMoreContainer.classList.remove('hidden');
    } else {
         loadMoreContainer.classList.add('hidden');
    }
}

function displayResults(movies) {
    resultsGrid.innerHTML = movies.map(movie => {
        const isFav = favorites.some(f => f.imdbID === movie.imdbID);
        const typeAndYear = movie.Type ? `${movie.Year} • ${movie.Type.toUpperCase()}` : '';
        const cacheData = detailedMoviesCache[movie.imdbID];
        
        const ratingBadge = (cacheData && cacheData.Rating !== "N/A" && cacheData.Rating !== "0") ? 
                            `<div class="rating-badge"><i class="fas fa-star"></i> ${cacheData.Rating}</div>` : '';
        
        return `
            <div class="movie-card" onclick="getMovieDetails('${movie.imdbID}')">
                ${ratingBadge}
                <div class="fav-icon ${isFav ? 'active' : ''}" 
                     onclick="event.stopPropagation(); toggleFavorite('${movie.imdbID}', '${movie.Title.replace(/'/g, "")}', '${movie.Poster}')">
                    <i class="fas fa-heart"></i>
                </div>
                <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450'}" class="card-poster" alt="${movie.Title}">
                <div class="card-content">
                    <h4>${movie.Title}</h4>
                    <p>${typeAndYear}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================================================
// 7. YARDIMCI FONKSİYONLAR VE MODAL
// ==========================================================================
function toggleFavorite(id, title, poster) {
    const index = favorites.findIndex(f => f.imdbID === id);
    if (index === -1) favorites.push({ imdbID: id, Title: title, Poster: poster });
    else favorites.splice(index, 1);
    
    localStorage.setItem('myMovies', JSON.stringify(favorites));
    updateFavCount();
    
    if (currentSearch.length > 2 || allFetchedMovies.length > 0) applyFilters();
    else if (heroSection.classList.contains('hidden')) showFavoritesBtn.click();
}

function updateFavCount() { favCountEl.textContent = favorites.length; }

showFavoritesBtn.addEventListener('click', () => {
    heroSection.classList.add('hidden');
    loadMoreContainer.classList.add('hidden');
    searchInput.value = '';
    
    isAiMode = false;
    magicSearchBtn.classList.remove('active');
    searchInput.placeholder = "Search for movies, series...";
    
    if (favorites.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon-wrapper">
                    <i class="fas fa-bookmark" style="color: var(--text-muted);"></i>
                </div>
                <h3>Your Watchlist is Empty</h3>
                <p>Click the heart icon on any movie to add it here.</p>
            </div>`;
    } else {
        displayResults(favorites);
    }
});

homeLogo.addEventListener('click', () => resetToHome());

function resetToHome() {
    searchInput.value = '';
    currentSearch = '';
    
    isAiMode = false;
    magicSearchBtn.classList.remove('active');
    searchInput.placeholder = "Search for movies, series...";
    
    document.querySelector('input[name="typeFilter"][value=""]').checked = true; 
    document.querySelector('input[name="sortFilter"][value="newest"]').checked = true; 
    document.getElementById('yearFilter').value = ''; 
    document.querySelectorAll('.genre-list input[type="checkbox"]').forEach(cb => cb.checked = false); 
    ratingFilter.value = 0;
    ratingDisplay.textContent = 0;
    updateSliderFill(ratingFilter); 
    
    allFetchedMovies = [];
    currentPage = 1;
    
    heroSection.classList.remove('hidden'); 
    loadMoreContainer.classList.add('hidden'); 
    
    resultsGrid.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon-wrapper">
                <i class="fas fa-film"></i>
            </div>
            <h3>Welcome to MovieHub</h3>
            <p>Discover your next favorite movie or TV series.</p>
        </div>`; 
}

function showSkeletonLoading() {
    const skeletonHTML = Array(10).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton-poster"></div>
            <div style="padding: 10px 4px;">
                <div class="skeleton-text-1" style="margin-bottom:8px;"></div>
                <div class="skeleton-text-2"></div>
            </div>
        </div>
    `).join('');
    
    if (currentPage === 1) resultsGrid.innerHTML = skeletonHTML;
    else resultsGrid.insertAdjacentHTML('beforeend', skeletonHTML);
}

async function getMovieDetails(id) {
    modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; padding:20px;">
            <div class="skeleton-poster" style="height:200px;"></div>
            <div class="skeleton-text-1"></div>
            <div class="skeleton-text-2"></div>
        </div>`;
    modalBackdrop.style.backgroundImage = 'none';
    movieModal.classList.remove('hidden');
    
    try {
        const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${config.OMDB_API_KEY}`);
        const movie = await res.json();
        
        const posterUrl = movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450';
        
        modalBackdrop.style.backgroundImage = `url('${posterUrl}')`;
        
        modalBody.innerHTML = `
            <div style="display:flex; flex-wrap:wrap; gap:40px;">
                <img src="${posterUrl}" style="width: 300px; height: 450px; object-fit: cover; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); flex:none;">
                <div style="flex:1; min-width:300px; display:flex; flex-direction:column; justify-content:center;">
                    <h2 style="margin-bottom:15px; font-size: 36px; font-weight:800; letter-spacing:-1px;">
                        ${movie.Title} <span style="font-weight: 500; color: rgba(255,255,255,0.7); font-size: 24px;">(${movie.Year})</span>
                    </h2>
                    
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:25px;">
                        <span style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-size:13px; font-weight:600;">${movie.Rated}</span>
                        <span style="background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-size:13px; font-weight:600;">${movie.Runtime}</span>
                        <span style="color: rgba(255,255,255,0.8); font-size:14px; display:flex; align-items:center;">${movie.Genre}</span>
                    </div>

                    <p style="margin-bottom:12px; font-size:15px;"><strong style="color: rgba(255,255,255,0.6);">Director:</strong> ${movie.Director}</p>
                    <p style="margin-bottom:12px; font-size:15px;"><strong style="color: rgba(255,255,255,0.6);">Writers:</strong> ${movie.Writer}</p>
                    <p style="margin-bottom:12px; font-size:15px;"><strong style="color: rgba(255,255,255,0.6);">Stars:</strong> ${movie.Actors}</p>
                    
                    <div style="margin-top: 25px; padding-top:25px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <h4 style="margin-bottom: 10px; color:rgba(255,255,255,0.6); text-transform:uppercase; font-size:13px; letter-spacing:1px;">Storyline</h4>
                        <p style="line-height:1.7; font-size: 16px; color:rgba(255,255,255,0.9);">${movie.Plot}</p>
                    </div>
                    
                    <div style="margin-top: 30px; display: inline-flex; align-items: center; gap: 10px; background: rgba(229,9,20,0.15); padding: 12px 25px; border-radius: 12px; border: 1px solid rgba(229,9,20,0.3); width: fit-content;">
                        <i class="fas fa-star" style="color: var(--rating-star); font-size: 24px;"></i>
                        <div>
                            <span style="font-size: 22px; font-weight: 800; color: #fff;">${movie.imdbRating}</span>
                            <span style="color: rgba(255,255,255,0.6); font-size: 14px; font-weight:600;">/ 10</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error fetching details:", error);
        modalBody.innerHTML = `<div class="error-msg">Failed to load movie details.</div>`;
    }
}

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    searchMovies();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(suggestionTimeout);
        executeFullSearch();
    }
});

closeModalBtn.onclick = () => movieModal.classList.add('hidden');
window.onclick = (e) => { if (e.target == movieModal) movieModal.classList.add('hidden'); };

