let container = document.getElementById('recipe-container')

startRecipePage()

async function startRecipePage() {
    await buildSidebar()

    if (!container) return

    let params = new URLSearchParams(window.location.search)
    let recipeId = params.get('id')

    let recipe = await getRecipeById(recipeId)

    if (!recipe) {
        container.innerHTML = '<p>Рецепт не найден</p>'
        return
    }

    let user = await getCurrentUser()
    let canEdit = await canEditRecipe(recipe, user)

    showRecipe(recipe, user, canEdit)
    document.title = recipe.title + ' - Cartoon Cuisine'
}

function showRecipe(recipe, user, canEdit) {
    let imageHTML = '<div class="no-image">🍲</div>'

    if (recipe.image && recipe.image !== '') {
        let opX = parseFloat(recipe.image_focus_x || 50)
        let opY = parseFloat(recipe.image_focus_y || 50)

        opX = Math.max(0, Math.min(100, opX))
        opY = Math.max(0, Math.min(100, opY))

        if (recipe.image.indexOf('http') === 0) {
            imageHTML = `
                <div class="recipe-image-crop">
                    <img
                        src="${recipe.image}"
                        alt="${escapeHtml(recipe.title || '')}"
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            object-position:${opX.toFixed(1)}% ${opY.toFixed(1)}%;
                        "
                    >
                </div>
            `
        }
    }

    let diffBadge = ''

    if (recipe.difficulty) {
        let diffClass = 'diff-' + recipe.difficulty
        diffBadge = '<span class="difficulty-badge ' + diffClass + '">' + getDiffText(recipe.difficulty) + '</span>'
    }

    let descHTML = ''
    if (recipe.desc) {
        descHTML = '<div class="recipe-description"><p>' + escapeHtml(recipe.desc) + '</p></div>'
    }

    let ingrHTML = ''
    if (recipe.ingr) {
        ingrHTML = '<div class="recipe-section"><h3>🥗 Ингредиенты</h3>' + formatIngredients(recipe.ingr) + '</div>'
    }

    let stepsHTML = ''
    if (recipe.steps) {
        stepsHTML = '<div class="recipe-section"><h3>📝 Приготовление</h3>' + formatSteps(recipe.steps) + '</div>'
    }

    let authorHTML = ''
    if (recipe.author_email) {
        authorHTML = '<p class="recipe-author">Автор: ' + escapeHtml(recipe.author_email) + '</p>'
    }

    let editBtn = ''
    if (canEdit) {
        editBtn = `<a href="edit.html?id=${recipe.id}" class="btn-edit" style="float:right; text-decoration:none;">✏️ Редактировать</a>`
    }

    let html = `
    <div class="recipe-header">
        <div class="recipe-tags">
            <span class="tag">${escapeHtml(recipe.subcategory || '')}</span>
            ${diffBadge}
        </div>
        <h1>${escapeHtml(recipe.title || 'Без названия')} ${editBtn}</h1>
        <p class="recipe-meta">${getTypeText(recipe.type)}</p>
        ${authorHTML}
    </div>
    <div class="recipe-image">${imageHTML}</div>
    ${descHTML}
    ${ingrHTML}
    ${stepsHTML}`

    container.innerHTML = html
}

function escapeHtml(text) {
    if (!text) return ''
    let div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function formatIngredients(ingr) {
    if (!ingr || !Array.isArray(ingr)) {
        return '<p>Нет ингредиентов</p>'
    }

    let html = '<ul class="ingredients-list">'

    for (let i = 0; i < ingr.length; i++) {
        let item = ingr[i]

        if (!item || !item.name) continue

        if (item.amount) {
            html += '<li><strong>' + escapeHtml(item.name) + '</strong> — ' + escapeHtml(item.amount) + '</li>'
        } else {
            html += '<li><strong>' + escapeHtml(item.name) + '</strong></li>'
        }
    }

    html += '</ul>'
    return html
}

function formatSteps(steps) {
    let stepsArray = []

    // Проверяем тип данных
    if (typeof steps === 'string' && steps.trim().startsWith('[')) {
        // Пытаемся распарсить JSON
        try {
            stepsArray = JSON.parse(steps)
        } catch (e) {
            console.warn('Не удалось распарсить JSON, используем split:', e)
            stepsArray = steps.split('\n')
        }
    } else if (typeof steps === 'string') {
        // Обычная строка с переносами
        stepsArray = steps.split('\n')
    } else if (Array.isArray(steps)) {
        // Уже массив
        stepsArray = steps
    } else {
        // Неизвестный формат
        return '<p>Нет инструкций</p>'
    }

    let html = '<ol class="steps-list">'
    let stepCount = 0

    for (let i = 0; i < stepsArray.length; i++) {
        let step = String(stepsArray[i]).trim()
        
        if (step !== '') {
            html += '<li>' + escapeHtml(step) + '</li>'
            stepCount++
        }
    }

    html += '</ol>'

    if (stepCount === 0) {
        return '<p>Нет инструкций</p>'
    }

    return html
}

function getTypeText(type) {
    const types = {
        'main': '🍗 Горячее блюдо',
        'soup': '🍲 Суп',
        'salad': '🥗 Салат',
        'pasta': '🍝 Паста',
        'baking': '🥐 Выпечка',
        'fastfood': '🍔 Фастфуд',
        'breakfast': '🍳 Завтрак',
        'dessert': '🍰 Десерт',
        'drink': '🥤 Напиток',
        'snack': '🥪 Закуска',
        'sauce': '🍡 Соус'
    }

    return types[type] || '🍽️ Блюдо'
}

function getDiffText(diff) {
    const difficulties = {
        'easy': '🟢 Легко',
        'medium': '🟡 Средне',
        'hard': '🔴 Сложно'
    }

    return difficulties[diff] || ''
}