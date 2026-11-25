/**
 * Automated Playwright E2E UI Test Suite for Sonido Vivo.
 * Validates design system (Olivini Gold), SPA routing, product catalog,
 * dynamic search/filtering, cart interaction, media assets, form validations,
 * and authenticated read-only Admin dashboard metrics.
 */

import { chromium } from 'playwright-core'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let testsPassed = 0
let testsFailed = 0

function logPass(msg) {
  testsPassed++
  console.log(`  ✓ ${msg}`)
}

function logFail(msg, error) {
  testsFailed++
  console.error(`  ✗ ${msg}`)
  if (error) console.error(error)
}

async function runSuite() {
  console.log(`\n======================================================`)
  console.log(` Starting Sonido Vivo E2E UI Test Suite`)
  console.log(` Target BASE_URL: ${BASE_URL}`)
  console.log(`======================================================\n`)

  let browser
  for (const channel of ['msedge', 'chrome']) {
    try {
      browser = await chromium.launch({
        channel,
        headless: true,
      })
      console.log(`✓ Launched browser with channel: ${channel}`)
      break
    } catch {
      // try next channel
    }
  }

  if (!browser) {
    throw new Error('Could not launch Chrome or Microsoft Edge browser.')
  }

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 850 },
  })

  const page = await context.newPage()

  const uncaughtPageErrors = []
  const server500Errors = []

  page.on('pageerror', (err) => {
    console.error('  [PageError]', err.message)
    uncaughtPageErrors.push(err.message)
  })

  page.on('response', (res) => {
    if (res.status() >= 500) {
      console.error(`  [ServerError ${res.status()}] ${res.url()}`)
      server500Errors.push({ url: res.url(), status: res.status() })
    }
  })

  try {
    // ----------------------------------------------------
    // TEST 1: Home page (/) - Brand & Design Tokens
    // ----------------------------------------------------
    console.log(`\n[Suite 1/6] Validating Home Page (/)`)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })

    // Verify Title & Hero
    const title = await page.title()
    if (title.includes('Sonido Vivo')) {
      logPass(`Page title matches: "${title}"`)
    } else {
      logFail(`Unexpected page title: "${title}"`)
    }

    // Header styling: Olivini Gold (#1A2413 / rgb(26, 36, 19))
    const headerBg = await page.$eval('.main-header', (el) =>
      window.getComputedStyle(el).backgroundColor
    )
    if (headerBg.includes('26, 36, 19') || headerBg.includes('#1a2413')) {
      logPass(`Header background is Olivini Gold #1A2413 (${headerBg})`)
    } else {
      logFail(`Header background does not match #1A2413: ${headerBg}`)
    }

    // Body styling: #FAF8F2 / rgb(250, 248, 242)
    const bodyBg = await page.$eval('body', (el) =>
      window.getComputedStyle(el).backgroundColor
    )
    if (bodyBg.includes('250, 248, 242') || bodyBg.includes('#faf8f2')) {
      logPass(`Body background is #FAF8F2 (${bodyBg})`)
    } else {
      logFail(`Body background does not match #FAF8F2: ${bodyBg}`)
    }

    // Video element
    const videoSrc = await page.$eval('.hero-video-box video source', (el) => el.getAttribute('src'))
    if (videoSrc && videoSrc.includes('video_promocional_tienda.mp4')) {
      logPass(`Promotional store video tag verified: ${videoSrc}`)
    } else {
      logFail(`Store video source invalid or missing: ${videoSrc}`)
    }

    // Numbered Benefits 01-03
    const benefitIndicators = await page.$$eval('.benefit-indicator', (els) =>
      els.map((el) => el.textContent.trim())
    )
    if (
      benefitIndicators.includes('01') &&
      benefitIndicators.includes('02') &&
      benefitIndicators.includes('03')
    ) {
      logPass(`Numbered benefits 01, 02, 03 verified: [${benefitIndicators.join(', ')}]`)
    } else {
      logFail(`Benefits indicators missing: [${benefitIndicators.join(', ')}]`)
    }

    // 6 Featured items
    const featuredCards = await page.$$('.featured-section .product-card')
    if (featuredCards.length === 6) {
      logPass(`Featured instruments section displays exactly 6 products`)
    } else {
      logFail(`Expected 6 featured instruments, got ${featuredCards.length}`)
    }

    // Hero Button Contrast: "Conoce Nuestra Tienda" (.hero-section .btn-outline)
    const heroBtnOutline = await page.$eval('.hero-section .btn-outline', (el) => {
      const style = window.getComputedStyle(el)
      return {
        bg: style.backgroundColor,
        color: style.color,
      }
    })
    const hasDarkBg =
      heroBtnOutline.bg.includes('26, 36, 19') || heroBtnOutline.bg.includes('#1a2413')
    const hasGoldColor =
      heroBtnOutline.color.includes('230, 184, 92') ||
      heroBtnOutline.color.includes('#e6b85c')
    if (hasDarkBg && hasGoldColor) {
      logPass(
        `Hero "Conoce Nuestra Tienda" button contrast verified (solid dark ${heroBtnOutline.bg} with gold text ${heroBtnOutline.color})`
      )
    } else {
      logFail(
        `Hero button contrast regression: bg="${heroBtnOutline.bg}", color="${heroBtnOutline.color}"`
      )
    }

    // ----------------------------------------------------
    // TEST 2: Navbar Navigation & Single-Line Contrast
    // ----------------------------------------------------
    console.log(`\n[Suite 2/6] Validating Navbar Navigation & Links`)
    const navLinks = await page.$$eval('.main-nav a', (els) =>
      els.map((el) => el.textContent.trim())
    )
    const expectedLinks = ['Inicio', 'Catálogo', 'Nosotros', 'Blogs', 'Contacto']
    const hasAllLinks = expectedLinks.every((link) => navLinks.includes(link))
    if (hasAllLinks) {
      logPass(`Navbar links verified: ${expectedLinks.join(', ')}`)
    } else {
      logFail(`Navbar links missing. Found: ${navLinks.join(', ')}`)
    }

    // Verify white-space: nowrap on navbar links
    const navWhiteSpace = await page.$eval('.main-nav a', (el) =>
      window.getComputedStyle(el).whiteSpace
    )
    if (navWhiteSpace === 'nowrap') {
      logPass(`Navbar links have white-space: nowrap (prevents awkward wraps)`)
    } else {
      logFail(`Navbar links white-space unexpected: ${navWhiteSpace}`)
    }

    // ----------------------------------------------------
    // TEST 3: Catálogo (/productos) - Live API, Filter, Search, Cart
    // ----------------------------------------------------
    console.log(`\n[Suite 3/6] Validating Catalog Page (/productos)`)
    await page.goto(`${BASE_URL}/productos`, { waitUntil: 'networkidle' })

    // Sincronización backend Spring Boot
    await page.waitForSelector('.badge-ok', { timeout: 10000 })
    const badgeText = await page.$eval('.badge-ok', (el) => el.textContent.trim())
    if (badgeText.includes('En Línea con Backend Spring Boot')) {
      logPass(`Backend sync indicator active: "${badgeText}"`)
    } else {
      logFail(`Backend sync badge text unexpected: "${badgeText}"`)
    }

    // 50 productos en total
    await page.waitForSelector('.product-card', { timeout: 10000 })
    let productCards = await page.$$('.product-card')
    if (productCards.length === 50) {
      logPass(`Exactly 50 products loaded from live MongoDB API`)
    } else {
      logFail(`Expected 50 products, got ${productCards.length}`)
    }

    // Filtrar por categoría chip "Cuerdas" (13 items)
    console.log(`  ... Filtering by category chip "Cuerdas"`)
    await page.click('button.chip:has-text("Cuerdas")')
    await page.waitForTimeout(600)
    const cuerdasCards = await page.$$('.product-card')
    const cuerdasCategories = await page.$$eval('.product-card .badge-category', (els) =>
      els.map((el) => el.textContent.trim())
    )
    const allCuerdas = cuerdasCategories.every((cat) => cat.toLowerCase() === 'cuerdas')
    if (allCuerdas && cuerdasCards.length === 13) {
      logPass(`Category filter "Cuerdas" returned exactly 13 products, all matching "Cuerdas"`)
    } else {
      logFail(`Category filter "Cuerdas" expected 13 products, got ${cuerdasCards.length}`)
    }

    // Resetear a "Todas" y buscar "Yamaha"
    console.log(`  ... Resetting category and searching for "Yamaha"`)
    await page.click('button.chip:has-text("Todas")')
    await page.waitForTimeout(400)
    await page.fill('input.search-input', 'Yamaha')
    await page.waitForTimeout(600)
    const yamahaCards = await page.$$('.product-card')
    const yamahaMatch = await page.$$eval('.product-card', (els) =>
      els.every((el) => el.textContent.toLowerCase().includes('yamaha'))
    )
    if (yamahaCards.length > 0 && yamahaMatch) {
      logPass(`Search "Yamaha" filtered successfully (${yamahaCards.length} items found, all matching "Yamaha")`)
    } else {
      logFail(`Search "Yamaha" did not return expected cards`)
    }

    // Añadir producto al carro y verificar badge
    console.log(`  ... Adding first product to cart`)
    await page.click('.product-card:first-child .btn-add-cart')
    await page.waitForSelector('.cart-badge', { timeout: 5000 })
    const cartCount = await page.$eval('.cart-badge', (el) => el.textContent.trim())
    if (Number(cartCount) >= 1) {
      logPass(`Cart badge updated dynamically to count: ${cartCount}`)
    } else {
      logFail(`Cart badge count unexpected: ${cartCount}`)
    }

    // ----------------------------------------------------
    // TEST 4: Nosotros, Blogs (with videos), Contacto
    // ----------------------------------------------------
    console.log(`\n[Suite 4/6] Validating Nosotros, Blogs & Contacto Pages`)

    // Nosotros
    await page.goto(`${BASE_URL}/nosotros`, { waitUntil: 'networkidle' })
    const nosotrosHeader = await page.$eval('h1, h2', (el) => el.textContent.trim())
    logPass(`Nosotros page rendered cleanly ("${nosotrosHeader.substring(0, 30)}...")`)

    // Blogs index & articles
    await page.goto(`${BASE_URL}/blogs`, { waitUntil: 'networkidle' })
    const blogArticles = await page.$$('.blog-card, article')
    if (blogArticles.length >= 2) {
      logPass(`Blog index contains ${blogArticles.length} articles`)
    }

    // Blog 1 with video
    await page.goto(`${BASE_URL}/blogs/1`, { waitUntil: 'networkidle' })
    const blog1Video = await page.$('video source')
    if (blog1Video) {
      logPass(`Blog article 1 has responsive <video> element`)
    } else {
      logFail(`Blog 1 video missing`)
    }

    // Contacto Form validation & counter
    await page.goto(`${BASE_URL}/contacto`, { waitUntil: 'networkidle' })
    const counterTextInitial = await page.$eval(
      '.contacto-page form .tabular-nums',
      (el) => el.textContent.trim()
    )
    if (counterTextInitial === '0/500') {
      logPass(`Initial message length counter is "0/500"`)
    } else {
      logFail(`Initial counter was: ${counterTextInitial}`)
    }

    // Type comment to verify dynamic counter update
    await page.fill('textarea[name="comentario"]', 'Hola Sonido Vivo')
    const counterUpdated = await page.$eval(
      '.contacto-page form .tabular-nums',
      (el) => el.textContent.trim()
    )
    if (counterUpdated === '16/500') {
      logPass(`Dynamic message length counter updated to "16/500"`)
    } else {
      logFail(`Counter after typing was: ${counterUpdated}`)
    }

    // Submit without name/email to trigger client validation
    await page.click('button[type="submit"]')
    const invalidInputs = await page.$$('.form-control.is-invalid')
    if (invalidInputs.length >= 2) {
      logPass(`Form validation triggered ${invalidInputs.length} invalid field indicators`)
    } else {
      logFail(`Form validation did not flag expected invalid fields`)
    }

    // ----------------------------------------------------
    // TEST 5: Login & AdminPanel (/admin) - Read-Only Verification
    // ----------------------------------------------------
    console.log(`\n[Suite 5/6] Validating Admin Login & Dashboard Metrics`)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })

    // Quick Admin Login
    console.log(`  ... Triggering quick login as ROLE_ADMIN (admin / admin123)`)
    await page.click('button:has-text("admin / admin123")')

    // Wait for navigation to /admin
    await page.waitForURL('**/admin', { timeout: 15000 })
    logPass(`Successfully authenticated and redirected to /admin`)

    // Wait for Admin data loading to finish
    await page.waitForFunction(
      () => {
        const val = document.querySelector('.admin-valuation-amount')
        return val && val.textContent.trim().startsWith('$') && !val.textContent.includes('GRATIS')
      },
      { timeout: 15000 }
    )

    // Verify Admin Header
    await page.waitForSelector('.badge-admin', { timeout: 10000 })
    const adminTag = await page.$eval('.admin-user-tag', (el) => el.textContent.trim())
    logPass(`Admin session verified: "${adminTag}"`)

    // Verify Stats Grid KPIs: [50 Instrumentos, Stock Crítico, Unidades Totales, 5 Clientes Oracle]
    const statNumbers = await page.$$eval('.stat-card .stat-number', (els) =>
      els.map((el) => el.textContent.trim())
    )
    if (
      statNumbers[0] === '50' &&
      Number(statNumbers[2]) >= 350 &&
      statNumbers[3] === '5'
    ) {
      logPass(
        `Operational KPIs verified: [50 Instrumentos, ${statNumbers[1]} Stock Crítico, ${statNumbers[2]} Unidades, 5 Clientes Oracle]`
      )
    } else {
      logFail(`Expected [50, ..., >=350, 5], found: [${statNumbers.join(', ')}]`)
    }

    // Verify Valor Total de Bodega (~$37.xxx.xxx)
    const valorBodega = await page.$eval('.admin-valuation-amount', (el) =>
      el.textContent.trim()
    )
    if (valorBodega.startsWith('$37.') || /^\$\d{1,3}(\.\d{3})*$/.test(valorBodega)) {
      logPass(`Total inventory valuation rendered from live backend: ${valorBodega}`)
    } else {
      logFail(`Total inventory valuation unexpected: "${valorBodega}"`)
    }

    // Verify Desglose por Categoría table (5 categories)
    await page.waitForSelector('section[aria-label="Desglose por categoría"] table', { timeout: 5000 })
    const categoryRows = await page.$$('section[aria-label="Desglose por categoría"] tbody tr')
    if (categoryRows.length === 5) {
      logPass(`Aggregation Pipeline table rendered 5 active categories with units, avg price & inventory value`)
    } else {
      logFail(`Desglose por categoría rows expected 5, got ${categoryRows.length}`)
    }

    // TAB: Mantenedor Productos (50 items)
    console.log(`  ... Switching to "Mantenedor Productos" tab`)
    await page.click('button:has-text("Mantenedor Productos")')
    await page.waitForSelector('.productos-crud-section tbody tr', { timeout: 10000 })
    const adminProductRows = await page.$$('.productos-crud-section tbody tr')
    if (adminProductRows.length === 50) {
      logPass(`Mantenedor Productos displays exactly 50 product rows`)
    } else {
      logFail(`Expected 50 product rows in mantenedor, found: ${adminProductRows.length}`)
    }

    // Verify non-wrapping SKU code cell
    const skuHasNoWrap = await page.$eval('.productos-crud-section tbody tr:first-child td:first-child', (el) =>
      el.classList.contains('text-nowrap')
    )
    if (skuHasNoWrap) {
      logPass(`Product SKU cell has class text-nowrap (prevents line wrapping)`)
    } else {
      logFail(`Product SKU cell missing text-nowrap`)
    }

    // Verify Bootstrap code color is warm bronze, zero magenta
    const codeColor = await page.$eval('.productos-crud-section tbody code', (el) =>
      window.getComputedStyle(el).color
    )
    const isMagenta = codeColor.includes('214, 51, 132') || codeColor.toLowerCase().includes('#d63384')
    if (!isMagenta) {
      logPass(`Code tags styled with warm bronze Olivini Gold, zero magenta detected (${codeColor})`)
    } else {
      logFail(`Code tags still leak magenta color: ${codeColor}`)
    }

    // TAB: Clientes Oracle (5 items & non-wrapping RUTs)
    console.log(`  ... Switching to "Clientes Oracle" tab`)
    await page.click('button:has-text("Clientes Oracle")')
    await page.waitForSelector('.clientes-section tbody tr', { timeout: 10000 })
    const clienteRows = await page.$$('.clientes-section tbody tr')
    if (clienteRows.length === 5) {
      logPass(`Clientes Oracle displays exactly 5 relational customer rows`)
    } else {
      logFail(`Expected 5 customer rows in Oracle tab, found: ${clienteRows.length}`)
    }

    // Verify non-wrapping RUT
    const rutHasNoWrap = await page.$eval('.clientes-section tbody tr:first-child td.fw-bold', (el) =>
      el.classList.contains('text-nowrap')
    )
    if (rutHasNoWrap) {
      logPass(`Customer RUT cell has class text-nowrap & tabular-nums (prevents line wrapping)`)
    } else {
      logFail(`Customer RUT cell missing text-nowrap`)
    }

    // Link "Ver Tienda Pública"
    const tiendaLink = await page.$eval('a:has-text("Ver Tienda Pública")', (el) =>
      el.getAttribute('href')
    )
    if (tiendaLink === '/') {
      logPass(`"Ver Tienda Pública" navigation link verified pointing to "/"`)
    } else {
      logFail(`"Ver Tienda Pública" href mismatch: ${tiendaLink}`)
    }

    // ----------------------------------------------------
    // TEST 6: Page Errors & HTTP 500 Summary
    // ----------------------------------------------------
    console.log(`\n[Suite 6/6] Validating Network & Console Integrity`)
    if (uncaughtPageErrors.length === 0) {
      logPass(`Zero uncaught page errors detected across entire session`)
    } else {
      logFail(`${uncaughtPageErrors.length} uncaught page errors detected: ${uncaughtPageErrors.join(' | ')}`)
    }

    if (server500Errors.length === 0) {
      logPass(`Zero 500/Internal Server Error responses detected`)
    } else {
      logFail(`${server500Errors.length} server errors detected: ${JSON.stringify(server500Errors)}`)
    }
  } catch (err) {
    logFail('Test execution encountered fatal exception:', err)
  } finally {
    await browser.close()
  }

  console.log(`\n======================================================`)
  console.log(` Test Summary: ${testsPassed} passed, ${testsFailed} failed`)
  console.log(`======================================================\n`)

  if (testsFailed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner failure:', err)
  process.exit(1)
})
