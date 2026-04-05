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
        let scale = parseFloat(recipe.image_scale || 1)
        let focusX = parseFloat(recipe.image_focus_x || 50)
        let focusY = parseFloat(recipe.image_focus_y || 50)

        if (recipe.image.indexOf('<img') === 0) {
            imageHTML = recipe.image
        } else if (recipe.image.indexOf('http') === 0) {
            imageHTML = `
                <div class="recipe-image-crop">
                    <img 
                        src="${recipe.image}" 
                        alt=""
                        style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            object-position:${focusX}% ${focusY}%;
                            transform: scale(${scale});
                            transform-origin:${focusX}% ${focusY}%;
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
        descHTML = '<div class="recipe-description"><p>' + recipe.desc + '</p></div>'
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
        authorHTML = '<p class="recipe-author">Автор: ' + recipe.author_email + '</p>'
    }

    let editBtn = ''
    if (canEdit) {
        editBtn = `<a href="edit.html?id=${recipe.id}" class="btn-edit" style="float:right; text-decoration:none;">✏️ Редактировать</a>`
    }

    let html = `
    <div class="recipe-header">
        <div class="recipe-tags">
            <span class="tag">${recipe.subcategory || ''}</span>
            ${diffBadge}
        </div>
        <h1>${recipe.title || 'Без названия'} ${editBtn}</h1>
        <p class="recipe-meta">${getTypeText(recipe.type)}</p>
        ${authorHTML}
    </div>
    <div class="recipe-image">${imageHTML}</div>
    ${descHTML}
    ${ingrHTML}
    ${stepsHTML}`

    container.innerHTML = html
}

function formatIngredients(ingr) {
    let html = '<ul class="ingredients-list">'

    for (let i = 0; i < ingr.length; i++) {
        let item = ingr[i]

        if (item.amount) {
            html += '<li><strong>' + item.name + '</strong> — ' + item.amount + '</li>'
        } else {
            html += '<li><strong>' + item.name + '</strong></li>'
        }
    }

    html += '</ul>'
    return html
}

function formatSteps(steps) {
    let stepsArray = []

    if (typeof steps === 'string' && steps.indexOf('[') == 0) {
        stepsArray = JSON.parse(steps)
    } else if (typeof steps === 'string') {
        stepsArray = steps.split('\n')
    }

    let html = '<ol class="steps-list">'

    for (let i = 0; i < stepsArray.length; i++) {
        let step = stepsArray[i].trim()
        if (step != '') {
            html += '<li>' + step + '</li>'
        }
    }

    html += '</ol>'
    return html
}

function getTypeText(type) {
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

function getDiffText(diff) {
    if (diff == 'easy') return '🟢 Легко'
    if (diff == 'medium') return '🟡 Средне'
    if (diff == 'hard') return '🔴 Сложно'
    return ''
}