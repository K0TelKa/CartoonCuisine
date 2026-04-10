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

startAddPage()

async function startAddPage() {
    let loadingMsg = document.getElementById('loading-message')
    let formElement = document.getElementById('recipe-form')

    let user = await requireAuth()
    if (!user) return

    await buildSidebar()

    addIngrRow()
    addStepRow()

    imageInput.oninput = handleImageUrlChange
    form.onsubmit = submitForm

    document.getElementById('add-ingr-btn').onclick = addIngrRow
    document.getElementById('add-step-btn').onclick = addStepRow

    initCropper()

    if (loadingMsg) loadingMsg.style.display = 'none'
    if (formElement) formElement.style.display = 'block'
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
        // вверх = больше, вниз = меньше
        let delta = e.deltaY < 0 ? 0.1 : -0.1
        let newScale = parseFloat((oldScale + delta).toFixed(2))
        if (newScale < 1) newScale = 1
        if (newScale > 10) newScale = 10

        // масштаб от центра блока
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
    // cover: заполнить весь блок
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

    // Картинка всегда должна полностью перекрывать блок
    // left (imgX) должен быть <= 0 и >= boxW - imgW
    if (s.w >= boxW) {
        if (cropState.imgX > 0) cropState.imgX = 0
        if (cropState.imgX < boxW - s.w) cropState.imgX = boxW - s.w
    } else {
        // картинка уже — центрируем (не должно быть при scale>=1)
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

function handleImageUrlChange() {
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
        cropState.scale = 1
        cropState.loaded = true
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

function addIngrRow() {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    div.innerHTML = `
        <input type="text" class="ingr-name" placeholder="Название (мука)" required>
        <input type="text" class="ingr-amount" placeholder="Кол-во (200г)">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `
    ingrList.appendChild(div)
}

function addStepRow() {
    let div = document.createElement('div')
    div.className = 'dynamic-row'
    div.innerHTML = `
        <textarea class="step-text" placeholder="Описание шага..." rows="2" required></textarea>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">✕</button>
    `
    stepsList.appendChild(div)
}

async function submitForm(e) {
    e.preventDefault()

    let ingredients = []
    let ingrRows = ingrList.querySelectorAll('.ingr-name')
    let amountRows = ingrList.querySelectorAll('.ingr-amount')
    for (let i = 0; i < ingrRows.length; i++) {
        if (ingrRows[i].value.trim()) {
            ingredients.push({
                name: ingrRows[i].value.trim(),
                amount: amountRows[i].value.trim()
            })
        }
    }

    let stepRows = stepsList.querySelectorAll('.step-text')
    let stepsArray = []
    for (let i = 0; i < stepRows.length; i++) {
        if (stepRows[i].value.trim()) stepsArray.push(stepRows[i].value.trim())
    }

    let newRecipe = {
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
    btn.innerText = '⏳ Отправка...'

    let id = await addRecipeToDB(newRecipe)

    if (id) {
        window.location.href = 'recipe.html?id=' + id
    } else {
        btn.disabled = false
        btn.innerText = '✅ Опубликовать'
    }
}