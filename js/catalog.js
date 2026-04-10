let grid = document.getElementById('recipes-grid')
let title = document.getElementById('page-title')
let search = document.getElementById('search-input')
let filterType = document.getElementById('filter-type')
let filterDiff = document.getElementById('filter-diff')

let ALL_RECIPES = []
let currentCategory = null
let currentSubcategory = null

startCatalog()

async function startCatalog() {
    if (!grid) {
        await buildSidebar()
        return
    }

    grid.innerHTML = `
        <div class="loading-card">
            <span class="loading-icon">⏳</span>
            Загрузка рецептов...
        </div>
    `

    ALL_RECIPES = await buildSidebar()

    readFiltersFromURL()
    setupSearch()
    setupFilters()
    setupSidebarClicks()
    showRecipes()
}

function readFiltersFromURL() {
    let params = new URLSearchParams(window.location.search)

    let cat = params.get('cat')
    if (cat) currentCategory = cat

    let subcat = params.get('subcat')
    if (subcat) currentSubcategory = subcat
}

function setupSidebarClicks() {
    let allButton = document.querySelector('.sidebar-btn-all')
    if (allButton) {
        allButton.onclick = function (e) {
            e.preventDefault()
            resetFilters()
        }
    }

    let links = document.querySelectorAll('.sidebar-link')

    for (let i = 0; i < links.length; i++) {
        links[i].onclick = function (e) {
            e.preventDefault()

            let category = this.getAttribute('data-category')
            let subcategory = this.getAttribute('data-subcategory')

            if (subcategory) {
                currentCategory = category
                currentSubcategory = subcategory
                history.pushState({}, '', 'catalog.html?cat=' + category + '&subcat=' + encodeURIComponent(subcategory))
            } else {
                currentCategory = category
                currentSubcategory = null
                history.pushState({}, '', 'catalog.html?cat=' + category)
            }

            if (search) search.value = ''
            showRecipes()
        }
    }
}

function setupFilters() {
    if (filterType) filterType.onchange = showRecipes
    if (filterDiff) filterDiff.onchange = showRecipes
}

function setupSearch() {
    if (search) search.oninput = showRecipes
}

function showRecipes() {
    let searchText = search ? search.value.toLowerCase() : ''
    let typeValue = filterType ? filterType.value : 'all'
    let diffValue = filterDiff ? filterDiff.value : 'all'

    let result = []

    for (let i = 0; i < ALL_RECIPES.length; i++) {
        let recipe = ALL_RECIPES[i]
        let ok = true

        if (currentCategory && recipe.category != currentCategory) ok = false
        if (currentSubcategory && recipe.subcategory != currentSubcategory) ok = false
        if (typeValue != 'all' && recipe.type != typeValue) ok = false
        if (diffValue != 'all' && recipe.difficulty != diffValue) ok = false

        if (searchText != '') {
            let inTitle = (recipe.title || '').toLowerCase().indexOf(searchText) != -1
            let inSubcat = (recipe.subcategory || '').toLowerCase().indexOf(searchText) != -1
            if (!inTitle && !inSubcat) ok = false
        }

        if (ok) result.push(recipe)
    }

    updateTitle()
    drawCards(result)
}

function resetFilters() {
    currentCategory = null
    currentSubcategory = null
    if (search) search.value = ''
    if (filterType) filterType.value = 'all'
    if (filterDiff) filterDiff.value = 'all'
    history.pushState({}, '', 'catalog.html')
    showRecipes()
}

function updateTitle() {
    if (!title) return

    if (currentSubcategory) {
        title.innerText = currentSubcategory
        return
    }

    if (currentCategory) {
        if (currentCategory == 'games') title.innerText = '🎮 Все игры'
        if (currentCategory == 'movies') title.innerText = '🎬 Все фильмы'
        if (currentCategory == 'cartoons') title.innerText = '📺 Все мультфильмы'
        if (currentCategory == 'series') title.innerText = '🍿 Все сериалы'
        return
    }

    title.innerText = 'Все рецепты'
}

function drawCards(recipes) {
    grid.innerHTML = ''

    if (recipes.length == 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#777;padding:40px;">😔 Ничего не найдено</p>'
        return
    }

    for (let i = 0; i < recipes.length; i++) {
        let recipe = recipes[i]
        let imageHTML = '<span style="font-size:3rem;">🍲</span>'

        if (recipe.image && /^https?:\/\//.test(recipe.image.trim())) {
            let img = recipe.image.trim()

            // focusX и focusY — это уже точка на картинке в процентах (0-100)
            // Это напрямую object-position!
            let opX = parseFloat(recipe.image_focus_x || 50)
            let opY = parseFloat(recipe.image_focus_y || 50)

            opX = Math.max(0, Math.min(100, opX))
            opY = Math.max(0, Math.min(100, opY))

            imageHTML = `<img
                src="${img}"
                alt="${recipe.title || ''}"
                style="
                    position:absolute;
                    top:0; left:0;
                    width:100%; height:100%;
                    object-fit:cover;
                    object-position:${opX.toFixed(1)}% ${opY.toFixed(1)}%;
                ">`
        }

        let diffBadge = ''
        if (recipe.difficulty) {
            diffBadge = `<span class="difficulty-badge diff-${recipe.difficulty}">${getDifficultyName(recipe.difficulty)}</span>`
        }

        grid.innerHTML += `
        <article class="recipe-card">
            <div class="card-img-placeholder">${imageHTML}</div>
            <div class="card-info">
                <div class="card-tags">
                    <span class="tag">${recipe.subcategory || 'Без категории'}</span>
                    ${diffBadge}
                </div>
                <h3>${recipe.title || 'Без названия'}</h3>
                <p class="meta">${getTypeName(recipe.type)}</p>
                <a href="recipe.html?id=${recipe.id}" class="btn-card">Открыть</a>
            </div>
        </article>`
    }
}

function getTypeName(type) {
    if (type == 'main') return '🍗 Горячее блюдо'
    if (type == 'soup') return '🍲 Суп'
    if (type == 'salad') return '🥗 Салат'
    if (type == 'pasta') return '🍝 Паста'
    if (type == 'baking') return '🥐 Выпечка'
    if (type == 'fastfood') return '🍔 Фастфуд'
    if (type == 'breakfast') return '🍳 Завтрак'
    if (type == 'dessert') return '🍰 Десерт'
    if (type == 'drink') return '🥤 Напиток'
    if (type == 'snack') return '🥪 Закуска'
    if (type == 'sauce') return '🍡 Соус'

    return '🍽️ Блюдо'
}

function getDifficultyName(diff) {
    if (diff == 'easy') return 'Легко'
    if (diff == 'medium') return 'Средне'
    if (diff == 'hard') return 'Сложно'
    return ''
}