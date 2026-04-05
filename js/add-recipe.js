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
    focusX: 50,
    focusY: 50,
    dragging: false,
    startMouseX: 0,
    startMouseY: 0,
    startFocusX: 50,
    startFocusY: 50
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

function handleImageUrlChange() {
    let url = imageInput.value.trim()

    if (!url) {
        cropImage.style.display = 'none'
        cropImage.removeAttribute('src')
        previewText.style.display = 'block'
        previewText.innerText = 'Предпросмотр'
        resetCrop()
        return
    }

    cropImage.onload = function () {
        cropImage.style.display = 'block'
        previewText.style.display = 'none'
        resetCrop()
        applyCropTransform()
    }

    cropImage.onerror = function () {
        cropImage.style.display = 'none'
        previewText.style.display = 'block'
        previewText.innerText = 'Не удалось загрузить изображение'
        resetCrop()
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

    let newRecipe = {
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
    btn.innerText = '⏳ Отправка...'

    let id = await addRecipeToDB(newRecipe)

    if (id) {
        window.location.href = 'recipe.html?id=' + id
    } else {
        btn.disabled = false
        btn.innerText = '✅ Опубликовать'
    }
}