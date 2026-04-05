// Сохраняем рецепты для сайдбара
let SIDEBAR_RECIPES = []

// --- Построить сайдбар ---
async function buildSidebar() {
    
    SIDEBAR_RECIPES = await getAllRecipes()
    
    if (!SIDEBAR_RECIPES) {
        SIDEBAR_RECIPES = []
    }

    // Создаем пустые списки для каждой категории
    let gamesNames = []
    let moviesNames = []
    let cartoonsNames = []
    let seriesNames = []

    // Проходим по всем рецептам
    for (let i = 0; i < SIDEBAR_RECIPES.length; i++) {
        let recipe = SIDEBAR_RECIPES[i]

        if (recipe.category == 'games') {
            if (gamesNames.indexOf(recipe.subcategory) == -1) {
                gamesNames.push(recipe.subcategory)
            }
        }

        if (recipe.category == 'movies') {
            if (moviesNames.indexOf(recipe.subcategory) == -1) {
                moviesNames.push(recipe.subcategory)
            }
        }

        if (recipe.category == 'cartoons') {
            if (cartoonsNames.indexOf(recipe.subcategory) == -1) {
                cartoonsNames.push(recipe.subcategory)
            }
        }

        if (recipe.category == 'series') {
            if (seriesNames.indexOf(recipe.subcategory) == -1) {
                seriesNames.push(recipe.subcategory)
            }
        }
    }

    // Заполняем каждое меню 
    fillMenu("menu-games", gamesNames, "games")
    fillMenu("menu-movies", moviesNames, "movies")
    fillMenu("menu-cartoons", cartoonsNames, "cartoons")
    fillMenu("menu-series", seriesNames, "series")

    return SIDEBAR_RECIPES
}

// --- Заполняем одно меню ссылками ---
function fillMenu(menuId, names, category) {
    
    let menu = document.getElementById(menuId)
    if (!menu) return

    menu.innerHTML = ""

    // Создаем ссылку "Все игры" и т.д.
    let allLink = document.createElement("a")
    allLink.href = "catalog.html?cat=" + category
    allLink.className = "sidebar-link sidebar-link-all"
    allLink.setAttribute("data-category", category)

    if (category == "games") allLink.innerText = "📂 Все игры"
    if (category == "movies") allLink.innerText = "📂 Все фильмы"
    if (category == "cartoons") allLink.innerText = "📂 Все мультфильмы"
    if (category == "series") allLink.innerText = "📂 Все сериалы"

    menu.appendChild(allLink)

    // Если названий нет
    if (names.length == 0) {
        let empty = document.createElement("a")
        empty.href = "#"
        empty.innerText = "Пусто 😔"
        empty.className = "sidebar-link-empty"
        menu.appendChild(empty)
        return
    }

    // Добавляем названия
    for (let i = 0; i < names.length; i++) {
        let name = names[i]
        
        let link = document.createElement("a")
        link.href = "catalog.html?cat=" + category + "&subcat=" + encodeURIComponent(name)
        link.innerText = "• " + name
        link.className = "sidebar-link"
        link.setAttribute("data-category", category)
        link.setAttribute("data-subcategory", name)
        
        menu.appendChild(link)
    }
}