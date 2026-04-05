console.log('data.js loaded')
console.log('supabase =', typeof supabase)

// Адрес БД
const url = 'https://qydybwvicanhasemevlr.supabase.co'
const key = 'sb_publishable_6n4pvHsmw9esWaZN-o0Kcw_1sYIL4EO'

// Клиент Supabase
window.db = supabase.createClient(url, key)

// --- Получение профиля пользователя ---
window.getProfileById = async function (userId) {
    if (!userId) return null

    let response = await window.db
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (response.error) {
        console.error('getProfileById error:', response.error)
        return null
    }

    return response.data
}

// --- Получение текущего пользователя ---
window.getCurrentUser = async function () {
    let response = await window.db.auth.getUser()
    return response.data.user
}

// --- Проверка: админ ли пользователь ---
window.isAdmin = async function (user) {
    if (!user) return false

    let profile = await window.getProfileById(user.id)
    if (!profile) return false

    return profile.role === 'admin'
}

window.canEditRecipe = async function (recipe, user) {
    if (!recipe || !user) return false

    let admin = await window.isAdmin(user)
    if (admin) return true

    return recipe.author_id === user.id
}

// --- Требуем авторизацию ---
window.requireAuth = async function () {
    let user = await window.getCurrentUser()

    if (!user) {
        alert('Чтобы добавить или редактировать рецепт, нужно войти в аккаунт.')
        window.location.href = 'index.html'
        return null
    }

    return user
}

// --- Регистрация ---
window.signUp = async function (email, password) {
    let response = await window.db.auth.signUp({
        email: email,
        password: password
    })

    if (response.error) {
        alert(response.error.message)
        return null
    }

    return response.data
}

// --- Вход ---
window.signIn = async function (email, password) {
    let response = await window.db.auth.signInWithPassword({
        email: email,
        password: password
    })

    if (response.error) {
        alert(response.error.message)
        return null
    }

    return response.data
}

// --- Выход ---
window.signOut = async function () {
    let response = await window.db.auth.signOut()

    if (response.error) {
        console.error('signOut error:', response.error)
        alert('Ошибка выхода: ' + response.error.message)
        return
    }

    window.location.href = 'index.html'
}

// --- Получение всех рецептов ---
window.getAllRecipes = async function () {
    let response = await window.db
        .from('recipes')
        .select('*')
        .order('id', { ascending: false })

    if (response.error) {
        console.error(response.error)
        return []
    }

    return response.data || []
}

// --- Получение одного рецепта по ID ---
window.getRecipeById = async function (id) {
    let response = await window.db
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

    if (response.error) {
        console.error(response.error)
        return null
    }

    return response.data
}

// --- Добавление рецепта ---
window.addRecipeToDB = async function (data) {
    let user = await window.requireAuth()
    if (!user) return null

    let recipeData = {
        ...data,
        author_id: user.id,
        author_email: user.email
    }

    let response = await window.db
        .from('recipes')
        .insert([recipeData])
        .select()
        .single()

    if (response.error) {
        console.error(response.error)
        alert('Ошибка при добавлении рецепта: ' + response.error.message)
        return null
    }

    return response.data.id
}

// --- Обновление рецепта ---
window.updateRecipeInDB = async function (id, data) {
    let user = await window.requireAuth()
    if (!user) return false

    let recipe = await window.getRecipeById(id)
    if (!recipe) {
        alert('Рецепт не найден')
        return false
    }

    let canEdit = await window.canEditRecipe(recipe, user)

    if (!canEdit) {
        alert('Вы не можете редактировать этот рецепт')
        return false
    }

    let response = await window.db
        .from('recipes')
        .update(data)
        .eq('id', id)
        .select()

    if (response.error) {
        console.error(response.error)
        alert('Ошибка при сохранении: ' + response.error.message)
        return false
    }

    return true
}

console.log('window.getCurrentUser =', typeof window.getCurrentUser)