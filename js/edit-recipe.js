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
    imgX: 0,
    imgY: 0,
    dragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startImgX: 0,
    startImgY: 0,
    loaded: false
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

    imageInput.oninput = () => handleImageUrlChange(true)
    document.getElementById('add-ingr-btn').onclick = addIngrRow
    document.getElementById('add-step-btn').onclick = addStepRow
    form.onsubmit = submitEditForm

    loadingMsg.style.display = 'none'
    formElement.style.display = 'block'
}

function initCropper() {
    previewBox.addEventListener('mousedown', function (e) {
        if (!cropState.loaded) return
        e.preventDefault()
        cropState.dragging = true
        cropState.startMouseX = e.clientX
        cropState.startMouseY = e.clientY
        cropState.startImgX = cropState.imgX
        cropState.startImgY = cropState.imgY
        previewBox.style.cursor = 'grabbing'
    })

    window.addEventListener('mousemove', function (e) {
        if (!cropState.dragging) return
        cropState.imgX = cropState.startImgX + (e.clientX - cropState.startMouseX)
        cropState.imgY = cropState.startImgY + (e.clientY - cropState.startMouseY)
        clampPosition()
        drawImage()
    })

    window.addEventListener('mouseup', function () {
        if (cropState.dragging) {
            cropState.dragging = false
            previewBox.style.cursor = 'grab'
        }
    })

    previewBox.addEventListener('wheel', function (e) {
        if (!cropState.loaded) return
        e.preventDefault()
        e.stopPropagation()

        let oldScale = cropState.scale
        let delta = e.deltaY < 0 ? 0.1 : -0.1
        let newScale = parseFloat((oldScale + delta).toFixed(2))
        if (newScale < 1) newScale = 1
        if (newScale > 10) newScale = 10

        let boxW = previewBox.offsetWidth
        let boxH = previewBox.offsetHeight
        let cx = boxW / 2
        let cy = boxH / 2
        let r = newScale / oldScale

        cropState.imgX = cx - (cx - cropState.imgX) * r
        cropState.imgY = cy - (cy - cropState.imgY) * r
        cropState.scale = newScale

        clampPosition()
        drawImage()
    }, { passive: false })
}

function getSize() {
    let boxW = previewBox.offsetWidth
    let boxH = previewBox.offsetHeight
    let natW = cropImage.naturalWidth
    let natH = cropImage.naturalHeight
    let ratio = Math.max(boxW / natW, boxH / natH)
    return {
        w: natW * ratio * cropState.scale,
        h: natH * ratio * cropState.scale
    }
}

function clampPosition() {
    let boxW = previewBox.offsetWidth
    let boxH = previewBox.offsetHeight
    let s = getSize()

    if (s.w >= boxW) {
        if (cropState.imgX > 0) cropState.imgX = 0
        if (cropState.imgX < boxW - s.w) cropState.imgX = boxW - s.w
    } else {
        cropState.imgX = (boxW - s.w) / 2
    }

    if (s.h >= boxH) {
        if (cropState.imgY > 0) cropState.imgY = 0
        if (cropState.imgY < boxH - s.h) cropState.imgY = boxH - s.h
    } else {
        cropState.imgY = (boxH - s.h) / 2
    }
}

function drawImage() {
    let s = getSize()
    cropImage.style.left = Math.round(cropState.imgX) + 'px'
    cropImage.style.top = Math.round(cropState.imgY) + 'px'
    cropImage.style.width = Math.round(s.w) + 'px'
    cropImage.style.height = Math.round(s.h) + 'px'
    saveCropState()
}

function saveCropState() {
    let boxW = previewBox.offsetWidth
    let boxH = previewBox.offsetHeight
    let s = getSize()

    // Вычисляем какая точка картинки сейчас в центре блока
    // Это и будет object-position при отображении
    let centerOnImgX = (boxW / 2 - cropState.imgX) / s.w * 100
    let centerOnImgY = (boxH / 2 - cropState.imgY) / s.h * 100

    centerOnImgX = Math.max(0, Math.min(100, centerOnImgX))
    centerOnImgY = Math.max(0, Math.min(100, centerOnImgY))

    imageScaleInput.value = cropState.scale.toFixed(4)
    imageFocusXInput.value = centerOnImgX.toFixed(4)
    imageFocusYInput.value = centerOnImgY.toFixed(4)
}

function centerImage() {
    let boxW = previewBox.offsetWidth
    let boxH = previewBox.offsetHeight
    let s = getSize()
    cropState.imgX = (boxW - s.w) / 2
    cropState.imgY = (boxH - s.h) / 2
}

function fillForm(recipe) {
    document.getElementById('title').value = recipe.title || ''
    document.getElementById('category').value = recipe.category || ''
    document.getElementById('subcategory').value = recipe.subcategory || ''
    document.getElementById('type').value = recipe.type || ''
    document.getElementById('difficulty').value = recipe.difficulty || ''
    document.getElementById('image').value = recipe.image || ''
    document.getElementById('desc').value = recipe.desc || ''

    let savedScale = parseFloat(recipe.image_scale || 1)
    let savedFocusX = parseFloat(recipe.image_focus_x || 0)
    let savedFocusY = parseFloat(recipe.image_focus_y || 0)

    if (isNaN(savedScale) || savedScale < 1) savedScale = 1
    if (savedScale > 10) savedScale = 10
    if (isNaN(savedFocusX)) savedFocusX = 0
    if (isNaN(savedFocusY)) savedFocusY = 0

    cropState.scale = savedScale

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
        if (typeof recipe.steps === 'string' && recipe.steps.trim().startsWith('[')) {
            try { stepsArray = JSON.parse(recipe.steps) }
            catch (ex) { stepsArray = recipe.steps.split('\n') }
        } else if (typeof recipe.steps === 'string') {
            stepsArray = recipe.steps.split('\n')
        }
        for (let i = 0; i < stepsArray.length; i++) {
            if (stepsArray[i].trim()) addStepRow(stepsArray[i])
        }
    }
    if (stepsList.children.length === 0) addStepRow()

    let url = recipe.image ? recipe.image.trim() : ''
    if (!url) {
        cropImage.style.display = 'none'
        previewText.style.display = 'block'
        return
    }

    cropImage.onload = function () {
        cropImage.style.display = 'block'
        previewText.style.display = 'none'
        previewBox.style.cursor = 'grab'
        cropState.loaded = true

        let boxW = previewBox.offsetWidth
        let boxH = previewBox.offsetHeight
        let s = getSize()

        // Обратная формула: из focusX% восстанавливаем imgX
        // centerOnImgX = (boxW/2 - imgX) / imgW * 100
        // imgX = boxW/2 - centerOnImgX/100 * imgW
        cropState.imgX = boxW / 2 - (savedFocusX / 100) * s.w
        cropState.imgY = boxH / 2 - (savedFocusY / 100) * s.h

        clampPosition()
        drawImage()
    }

    cropImage.onerror = function () {
        cropImage.style.display = 'none'
        previewText.style.display = 'block'
        previewText.innerText = 'Не удалось загрузить изображение'
    }

    cropImage.src = url
}

function handleImageUrlChange(shouldReset) {
    let url = imageInput.value.trim()

    if (!url) {
        cropImage.style.display = 'none'
        cropImage.removeAttribute('src')
        previewText.style.display = 'block'
        previewText.innerText = 'Предпросмотр'
        previewBox.style.cursor = 'default'
        cropState.loaded = false
        imageScaleInput.value = '1'
        imageFocusXInput.value = '0'
        imageFocusYInput.value = '0'
        return
    }

    cropImage.onload = function () {
        cropImage.style.display = 'block'
        previewText.style.display = 'none'
        previewBox.style.cursor = 'grab'
        cropState.loaded = true

        if (shouldReset) cropState.scale = 1

        centerImage()
        clampPosition()
        drawImage()
    }

    cropImage.onerror = function () {
        cropImage.style.display = 'none'
        previewText.style.display = 'block'
        previewText.innerText = 'Не удалось загрузить изображение'
        previewBox.style.cursor = 'default'
        cropState.loaded = false
    }

    cropImage.src = url
}

function addIngrRow(name = '', amount = '') {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    let eName = String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    let eAmt = String(amount).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    div.innerHTML = `
        <input type="text" class="ingr-name" value="${eName}" placeholder="Название" required>
        <input type="text" class="ingr-amount" value="${eAmt}" placeholder="Кол-во">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `
    ingrList.appendChild(div)
}

function addStepRow(text = '') {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    let eText = String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    div.innerHTML = `
        <textarea class="step-text" placeholder="Описание..." rows="2" required>${eText}</textarea>
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
        if (ingrRows[i].value.trim()) {
            ingredients.push({ name: ingrRows[i].value.trim(), amount: amountRows[i].value.trim() })
        }
    }

    let stepRows = stepsList.querySelectorAll('.step-text')
    let stepsArray = []
    for (let i = 0; i < stepRows.length; i++) {
        if (stepRows[i].value.trim()) stepsArray.push(stepRows[i].value.trim())
    }

    let updatedRecipe = {
        title: document.getElementById('title').value.trim(),
        category: document.getElementById('category').value,
        subcategory: document.getElementById('subcategory').value.trim(),
        type: document.getElementById('type').value,
        difficulty: document.getElementById('difficulty').value,
        image: document.getElementById('image').value.trim(),
        image_scale: parseFloat(imageScaleInput.value || '1'),
        image_focus_x: parseFloat(imageFocusXInput.value || '0'),
        image_focus_y: parseFloat(imageFocusYInput.value || '0'),
        desc: document.getElementById('desc').value.trim(),
        ingr: ingredients,
        steps: stepsArray.join('\n')
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