const sidebarAds = [
    {
        image: 'images/ad1.jpg',
        link: 'https://eda.yandex.ru/'
    },
    {
        image: 'images/ad2.jpg',
        link: 'https://samokat.ru/'
    },
    {
        image: 'images/ad3.jpg',
        link: 'https://myspar.ru/'
    }
]

let currentAdIndex = 0
let adInterval = null

function renderSidebarAd(index, animate = true) {
    const img = document.getElementById('sidebar-ad-img')
    const link = document.getElementById('sidebar-ad-link')
    const dotsBox = document.getElementById('sidebar-ad-dots')

    if (!img || !link || !dotsBox || !sidebarAds.length) return

    const ad = sidebarAds[index]

    function updateDots() {
        dotsBox.innerHTML = ''

        for (let i = 0; i < sidebarAds.length; i++) {
            const dot = document.createElement('span')
            dot.className = 'sidebar-ad-dot' + (i === index ? ' active' : '')
            dot.onclick = function () {
                currentAdIndex = i
                renderSidebarAd(currentAdIndex)
                restartAdInterval()
            }
            dotsBox.appendChild(dot)
        }
    }

    if (!animate || !img.src) {
        img.src = ad.image
        link.href = ad.link
        updateDots()
        return
    }

    img.classList.add('fade-out')

    setTimeout(function () {
        img.src = ad.image
        link.href = ad.link
        updateDots()

        img.classList.remove('fade-out')
    }, 450)
}

function nextSidebarAd() {
    currentAdIndex++
    if (currentAdIndex >= sidebarAds.length) {
        currentAdIndex = 0
    }
    renderSidebarAd(currentAdIndex)
}

function restartAdInterval() {
    if (adInterval) {
        clearInterval(adInterval)
    }

    adInterval = setInterval(function () {
        nextSidebarAd()
    }, 4000)
}

function startSidebarAds() {
    if (!document.getElementById('sidebar-ad-img')) return
    if (!sidebarAds.length) return

    renderSidebarAd(currentAdIndex, false)
    restartAdInterval()
}

window.addEventListener('load', startSidebarAds)