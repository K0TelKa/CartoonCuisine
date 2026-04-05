let form = document.getElementById('recipe-form')
let imageInput = document.getElementById('image')
let previewBox = document.getElementById('image-preview')
let cropImage = document.getElementById('crop-image')
let previewText = document.getElementById('image-preview-text')

let imageScaleInput = document.getElementById('image-scale')
let imageFocusXInput = document.getElementById('image-focus-x')
let imageFocusYInput = document.getElementById('image-focus-y')

let ingrList = document.getElementById('ingredients-list')
let stepsList = document.getElementById('steps-list')

let recipeId = null

let cropState = {
    scale: 1,
    focusX: 50,
    focusY: 50,
    dragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startFocusX: 50,
    startFocusY: 50
}

startEditPage()

async function startEditPage() {
    let loadingMsg = document.getElementById('loading-message')
    let formElement = document.getElementById('recipe-form')

    await buildSidebar()

    let user = await requireAuth()
    if (!user) return

    let params = new URLSearchParams(window.location.search)
    recipeId = params.get('id')

    let recipe = await getRecipeById(recipeId)

    if (!recipe) {
        loadingMsg.innerText = 'Рецепт не найден'
        return
    }

    let canEdit = await canEditRecipe(recipe, user)

    if (!canEdit) {
        loadingMsg.innerText = '⛔ У вас нет прав на редактирование этого рецепта'
        return
    }

    initCropper()
    fillForm(recipe)

    imageInput.oninput = handleImageUrlChange
    document.getElementById('add-ingr-btn').onclick = addIngrRow
    document.getElementById('add-step-btn').onclick = addStepRow
    form.onsubmit = submitEditForm

    loadingMsg.style.display = 'none'
    formElement.style.display = 'block'
}

function initCropper() {
    previewBox.addEventListener('mousedown', function (e) {
        if (!cropImage.src) return
        cropState.dragging = true
        cropState.startMouseX = e.clientX
        cropState.startMouseY = e.clientY
        cropState.startFocusX = cropState.focusX
        cropState.startFocusY = cropState.focusY
    })

    window.addEventListener('mousemove', function (e) {
        if (!cropState.dragging) return

        let frame = document.querySelector('.crop-frame-border')
        if (!frame) return

        let rect = frame.getBoundingClientRect()
        let dx = e.clientX - cropState.startMouseX
        let dy = e.clientY - cropState.startMouseY

        cropState.focusX = cropState.startFocusX + (dx / rect.width) * 100
        cropState.focusY = cropState.startFocusY + (dy / rect.height) * 100

        clampCropState()
        applyCropTransform()
    })

    window.addEventListener('mouseup', function () {
        cropState.dragging = false
    })

    previewBox.addEventListener('wheel', function (e) {
        if (!cropImage.src) return
        e.preventDefault()

        let delta = e.deltaY > 0 ? -0.1 : 0.1
        cropState.scale += delta

        if (cropState.scale < 1) cropState.scale = 1
        if (cropState.scale > 3) cropState.scale = 3

        clampCropState()
        applyCropTransform()
    }, { passive: false })
}

function fillForm(recipe) {
    document.getElementById('title').value = recipe.title || ''
    document.getElementById('category').value = recipe.category || ''
    document.getElementById('subcategory').value = recipe.subcategory || ''
    document.getElementById('type').value = recipe.type || ''
    document.getElementById('difficulty').value = recipe.difficulty || ''
    document.getElementById('image').value = recipe.image || ''
    document.getElementById('desc').value = recipe.desc || ''

    cropState.scale = parseFloat(recipe.image_scale || 1)
    cropState.focusX = parseFloat(recipe.image_focus_x || 50)
    cropState.focusY = parseFloat(recipe.image_focus_y || 50)

    imageScaleInput.value = cropState.scale
    imageFocusXInput.value = cropState.focusX
    imageFocusYInput.value = cropState.focusY

    handleImageUrlChange(false)

    ingrList.innerHTML = ''
    stepsList.innerHTML = ''

    if (recipe.ingr && recipe.ingr.length) {
        for (let i = 0; i < recipe.ingr.length; i++) {
            addIngrRow(recipe.ingr[i].name, recipe.ingr[i].amount)
        }
    } else {
        addIngrRow()
    }

    if (recipe.steps) {
        let stepsArray = []

        if (typeof recipe.steps === 'string' && recipe.steps.indexOf('[') == 0) {
            stepsArray = JSON.parse(recipe.steps)
        } else if (typeof recipe.steps === 'string') {
            stepsArray = recipe.steps.split('\n')
        }

        if (stepsArray.length) {
            for (let i = 0; i < stepsArray.length; i++) {
                addStepRow(stepsArray[i])
            }
        } else {
            addStepRow()
        }
    } else {
        addStepRow()
    }
}

function handleImageUrlChange(reset = true) {
    let url = imageInput.value.trim()

    if (!url) {
        cropImage.style.display = 'none'
        cropImage.removeAttribute('src')
        previewText.style.display = 'block'
        previewText.innerText = 'Предпросмотр'
        if (reset) resetCrop()
        return
    }

    cropImage.onload = function () {
        cropImage.style.display = 'block'
        previewText.style.display = 'none'
        if (reset) resetCrop()
        applyCropTransform()
    }

    cropImage.onerror = function () {
        cropImage.style.display = 'none'
        previewText.style.display = 'block'
        previewText.innerText = 'Не удалось загрузить изображение'
        if (reset) resetCrop()
    }

    cropImage.src = url
}

function resetCrop() {
    cropState.scale = 1
    cropState.focusX = 50
    cropState.focusY = 50
    saveCropState()
}

function clampCropState() {
    if (cropState.focusX < 0) cropState.focusX = 0
    if (cropState.focusX > 100) cropState.focusX = 100
    if (cropState.focusY < 0) cropState.focusY = 0
    if (cropState.focusY > 100) cropState.focusY = 100
}

function applyCropTransform() {
    cropImage.style.transform =
        'translate(-' + cropState.focusX + '%, -' + cropState.focusY + '%) scale(' + cropState.scale + ')'

    saveCropState()
}

function saveCropState() {
    imageScaleInput.value = cropState.scale
    imageFocusXInput.value = cropState.focusX
    imageFocusYInput.value = cropState.focusY
}

function addIngrRow(name = '', amount = '') {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    div.innerHTML = `
        <input type="text" class="ingr-name" value="${name}" placeholder="Название" required>
        <input type="text" class="ingr-amount" value="${amount}" placeholder="Кол-во">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `
    ingrList.appendChild(div)
}

function addStepRow(text = '') {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    div.innerHTML = `
        <textarea class="step-text" placeholder="Описание..." rows="2" required>${text}</textarea>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `
    stepsList.appendChild(div)
}

async function submitEditForm(e) {
    e.preventDefault()

    let ingredients = []
    let ingrRows = ingrList.querySelectorAll('.ingr-name')
    let amountRows = ingrList.querySelectorAll('.ingr-amount')

    for (let i = 0; i < ingrRows.length; i++) {
        if (ingrRows[i].value) {
            ingredients.push({
                name: ingrRows[i].value,
                amount: amountRows[i].value
            })
        }
    }

    let stepRows = stepsList.querySelectorAll('.step-text')
    let stepsArray = []

    for (let i = 0; i < stepRows.length; i++) {
        if (stepRows[i].value) {
            stepsArray.push(stepRows[i].value)
        }
    }

    let stepsText = stepsArray.join('\n')

    let updatedRecipe = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        subcategory: document.getElementById('subcategory').value,
        type: document.getElementById('type').value,
        difficulty: document.getElementById('difficulty').value,
        image: document.getElementById('image').value,
        image_scale: parseFloat(imageScaleInput.value || '1'),
        image_focus_x: parseFloat(imageFocusXInput.value || '50'),
        image_focus_y: parseFloat(imageFocusYInput.value || '50'),
        desc: document.getElementById('desc').value,
        ingr: ingredients,
        steps: stepsText
    }

    let btn = document.querySelector('.btn-submit')
    btn.disabled = true
    btn.innerText = '💾 Сохранение...'

    let success = await updateRecipeInDB(recipeId, updatedRecipe)

    if (success) {
        window.location.href = 'recipe.html?id=' + recipeId
    } else {
        btn.disabled = false
        btn.innerText = '✅ Сохранить изменения'
    }
}