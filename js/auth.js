window.addEventListener('load', function () {
    startAuth()
})

async function startAuth() {
    let profileBtn = document.getElementById('profile-btn')
    let modal = document.getElementById('auth-modal')
    let closeBtn = document.getElementById('auth-modal-close')

    let guestView = document.getElementById('auth-guest-view')
    let userView = document.getElementById('auth-user-view')

    let emailInput = document.getElementById('modal-auth-email')
    let passwordInput = document.getElementById('modal-auth-password')

    let loginBtn = document.getElementById('modal-login-btn')
    let signupBtn = document.getElementById('modal-signup-btn')
    let logoutBtn = document.getElementById('modal-logout-btn')

    let userEmail = document.getElementById('modal-user-email')

    if (!profileBtn || !modal) return

    async function refreshAuthUI() {
        let user = await window.getCurrentUser()

        if (user) {
            guestView.style.display = 'none'
            userView.style.display = 'block'
            userEmail.innerText = user.email || ''

            profileBtn.innerText = '🟢 ' + (user.email || 'Профиль')
            profileBtn.classList.add('profile-btn-auth')
            profileBtn.classList.remove('profile-btn-guest')
        } else {
            guestView.style.display = 'block'
            userView.style.display = 'none'
            userEmail.innerText = ''

            profileBtn.innerText = '⚪ Войти'
            profileBtn.classList.add('profile-btn-guest')
            profileBtn.classList.remove('profile-btn-auth')
        }

        profileBtn.classList.remove('profile-btn-loading')
        setupProtectedAddLinks(user)
    }

    function setupProtectedAddLinks(user) {
        let addLinks = document.querySelectorAll('a[href="add.html"]')

        for (let i = 0; i < addLinks.length; i++) {
            addLinks[i].onclick = null

            if (!user) {
                addLinks[i].onclick = function (e) {
                    e.preventDefault()
                    alert('Чтобы добавить рецепт, войдите в аккаунт.')
                }
            }
        }
    }

    function openModal() {
        modal.style.display = 'flex'
    }

    function closeModal() {
        modal.style.display = 'none'
    }

    profileBtn.onclick = async function () {
        await refreshAuthUI()
        openModal()
    }

    if (closeBtn) {
        closeBtn.onclick = closeModal
    }

    modal.onclick = function (e) {
        if (e.target === modal) {
            closeModal()
        }
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal()
        }
    })

    if (loginBtn) {
        loginBtn.onclick = async function () {
            let email = emailInput.value.trim()
            let password = passwordInput.value.trim()

            if (!email || !password) {
                alert('Введите email и пароль')
                return
            }

            loginBtn.disabled = true
            loginBtn.innerText = 'Вход...'

            let result = await window.signIn(email, password)

            loginBtn.disabled = false
            loginBtn.innerText = 'Войти'

            if (result) {
                await refreshAuthUI()
                closeModal()
                window.location.reload()
            }
        }
    }

    if (signupBtn) {
        signupBtn.onclick = async function () {
            let email = emailInput.value.trim()
            let password = passwordInput.value.trim()

            if (!email || !password) {
                alert('Введите email и пароль')
                return
            }

            signupBtn.disabled = true
            signupBtn.innerText = 'Создание...'

            let result = await window.signUp(email, password)

            signupBtn.disabled = false
            signupBtn.innerText = 'Регистрация'

            if (result) {
                alert('Регистрация выполнена')
                await refreshAuthUI()
            }
        }
    }

    if (logoutBtn) {
        logoutBtn.onclick = async function () {
            logoutBtn.disabled = true
            logoutBtn.innerText = 'Выходим...'

            await window.signOut()
        }
    }

    await refreshAuthUI()

    if (window.db && window.db.auth) {
        window.db.auth.onAuthStateChange(function (event, session) {
            let user = session ? session.user : null

            if (user) {
                guestView.style.display = 'none'
                userView.style.display = 'block'
                userEmail.innerText = user.email || ''

                profileBtn.innerText = '🟢 ' + (user.email || 'Профиль')
                profileBtn.classList.add('profile-btn-auth')
                profileBtn.classList.remove('profile-btn-guest')
            } else {
                guestView.style.display = 'block'
                userView.style.display = 'none'
                userEmail.innerText = ''

                profileBtn.innerText = '⚪ Войти'
                profileBtn.classList.add('profile-btn-guest')
                profileBtn.classList.remove('profile-btn-auth')
            }
            profileBtn.classList.remove('profile-btn-loading')      
            setupProtectedAddLinks(user)
        })
    }
}