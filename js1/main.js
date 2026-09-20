// 全站 JSON 動態同步引擎
document.addEventListener('DOMContentLoaded', () => {
  // 自動載入最新 JSON 檔
  fetch('js/websit-content.json')
    .then(response => {
      if (!response.ok) throw new Error('JSON 讀取失敗');
      return response.json();
    })
    .then(data => {
      // 1. 同步全站靜態文字與導覽列
      syncStaticTexts(data);
      syncNavigation(data.nav);

      // 2. 取得當前檔名並執行對應渲染
      const path = window.location.pathname;
      const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

      if (currentPage.includes('curriculum')) {
        renderCurriculumPage(data.curriculumPage);
      } else if (currentPage.includes('products')) {
        renderProductsPage(data.productsPage);
      } else if (currentPage.includes('about')) {
        renderAboutPage(data.aboutPage);
      } else if (currentPage.includes('quiz')) {
        renderQuizPage(data.quizPage);
      } else {
        // 預設渲染首頁 (包含 Hero、品牌特色與 FAQ 區塊)
        renderHomePage(data);

        // 如果 URL 帶有 #faq 網址 Hash，自動滑動至 FAQ 區塊
        if (window.location.hash === '#faq') {
          setTimeout(() => {
            const faqTarget = document.getElementById('faq');
            if (faqTarget) {
              faqTarget.scrollIntoView({ behavior: 'smooth' });
            }
          }, 200);
        }
      }
    })
    .catch(error => console.error('JSON 同步錯誤:', error));

  // 綁定行動版導覽列漢堡選單
  initMobileNav();
});

// 解析 JSON 深層路徑
function getJsonValue(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
}

// 替換所有帶有 JS-json 屬性的純文字標籤
function syncStaticTexts(data) {
  const elements = document.querySelectorAll('[JS-json]');
  elements.forEach(el => {
    const keyPath = el.getAttribute('JS-json');
    const value = getJsonValue(data, keyPath);
    if (value !== undefined) {
      el.textContent = value;
    }
  });
}

// 同步導覽列選單、高亮與 FAQ 平滑捲動觸發
function syncNavigation(navData) {
  const navMenu = document.getElementById('nav-menu');
  if (!navMenu || !navData) return;

  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  navMenu.innerHTML = navData.map(item => {
    const isActive = (item.link === currentPage || (currentPage === '' && item.link === 'index.html')) ? 'class="active"' : '';
    return `<li><a href="${item.link}" ${isActive} data-id="${item.id}">${item.name}</a></li>`;
  }).join('');

  // 綁定導覽按鈕點擊事件（特別針對常見問題 FAQ 平滑捲動）
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');

      if (href.includes('#faq')) {
        const isHomePage = currentPage === '' || currentPage === 'index.html' || currentPage.includes('index');
        
        if (isHomePage) {
          e.preventDefault(); // 阻擋預設重新整理
          const faqTarget = document.getElementById('faq');
          if (faqTarget) {
            faqTarget.scrollIntoView({ behavior: 'smooth' });
          }
          // 關閉行動版選單
          const navMenuEl = document.getElementById('nav-menu');
          if (navMenuEl) navMenuEl.classList.remove('active');
        }
      }
    });
  });
}

// 動態渲染首頁區塊與 FAQ
function renderHomePage(data) {
  // 1. 渲染 Hero 區塊
  if (data.hero) {
    const kicker = document.getElementById('hero-kicker');
    const title = document.getElementById('hero-title');
    const subtitle = document.getElementById('hero-subtitle');
    const cta = document.getElementById('hero-cta');

    if (kicker) kicker.textContent = data.hero.kicker;
    if (title) title.textContent = data.hero.title;
    if (subtitle) subtitle.textContent = data.hero.subtitle;
    if (cta) cta.textContent = data.hero.cta;
  }

  // 2. 渲染品牌特色卡片
  const featuresTitleEl = document.getElementById('features-title');
  const featuresContainerEl = document.getElementById('features-container');
  if (featuresTitleEl && data.featuresTitle) featuresTitleEl.textContent = data.featuresTitle;
  if (featuresContainerEl && data.features) {
    featuresContainerEl.innerHTML = data.features.map((item, index) => `
      <article class="feature-card" data-index="${index}">
        <img src="${item.imageUrl}" alt="${item.imageAlt}" class="feature-image">
        <div class="feature-body">
          <h3 class="feature-title">${item.title}</h3>
          <p class="feature-description">${item.description}</p>
        </div>
      </article>
    `).join('');

    initFeatureModals();
  }

  // 3. 渲染 FAQ 常見問題與手風琴開關
  const faqTitleEl = document.getElementById('faq-title');
  const faqContainerEl = document.getElementById('faq-container');

  if (faqTitleEl && data.faqTitle) {
    faqTitleEl.textContent = data.faqTitle;
  }

  if (faqContainerEl && data.faq) {
    faqContainerEl.innerHTML = data.faq.map(item => `
      <div class="faq-item">
        <button type="button" class="faq-header">
          <span>${item.question}</span>
          <span class="faq-icon">+</span>
        </button>
        <div class="faq-content">
          <div class="faq-body">${item.answer}</div>
        </div>
      </div>
    `).join('');

    initFaqAccordion();
  }

  // 4. 渲染聯絡區塊與頁尾
  if (data.contact) {
    const contactTitle = document.getElementById('contact-title');
    const contactDesc = document.getElementById('contact-description');
    if (contactTitle) contactTitle.textContent = data.contact.title;
    if (contactDesc) contactDesc.textContent = data.contact.description;
  }

  const footerText = document.getElementById('footer-text');
  if (footerText && data.footer) footerText.textContent = data.footer;
}

// FAQ 手風琴展開／折疊邏輯
function initFaqAccordion() {
  const faqHeaders = document.querySelectorAll('.faq-header');
  faqHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const currentItem = header.parentElement;
      const isActive = currentItem.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));

      if (!isActive) {
        currentItem.classList.add('active');
      }
    });
  });
}

// 品牌特色 Modal 彈窗
function initFeatureModals() {
  const modal = document.getElementById('service-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  if (!modal || !modalTitle || !modalBody) return;

  const featureDetails = [
    {
      title: '✨ 天賦密碼解析',
      content: `<p>透過西元生日計算出您的生命天賦數，深入了解個人特質與潛能。</p>`
    },
    {
      title: '🌿 植物能量調香',
      content: `<p>根據您的天賦數字量身調配專屬植物精油，達到心靈平衡。</p>`
    },
    {
      title: '🎓 心理諮詢與課程',
      content: `<p>手把手帶領您運用天賦與調香技巧，提升職場與家庭溝通力量。</p>`
    }
  ];

  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = card.getAttribute('data-index');
      const detail = featureDetails[index];

      if (detail) {
        modalTitle.textContent = detail.title;
        modalBody.innerHTML = detail.content;
        modal.classList.add('show');
      }
    });
  });

  const closeModal = () => modal.classList.remove('show');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// 其餘頁面渲染函式
function renderCurriculumPage(pageData) {
  const grid = document.querySelector('.course-grid');
  if (!grid || !pageData || !pageData.courses) return;

  grid.innerHTML = pageData.courses.map(course => `
    <article class="course-card">
      <div>
        <span class="course-tag">${course.tag}</span>
        <h2 class="course-title">${course.title}</h2>
        <p class="course-desc">${course.description}</p>
      </div>
      <div class="course-footer">
        <span class="course-price">${course.price}</span>
        <a href="${course.btnLink || '#'}" target="_blank" rel="noopener noreferrer" class="btn-primary">${course.btnText}</a>
      </div>
    </article>
  `).join('');
}

function renderProductsPage(pageData) {
  const grid = document.getElementById('product-grid');
  if (!grid || !pageData || !pageData.items) return;

  grid.innerHTML = pageData.items.map(item => `
    <article class="product-card" data-category="${item.category}">
      <div class="product-image-box">
        <span class="product-tag">${item.tag}</span>
        <img src="${item.image}" alt="${item.title}" onerror="this.style.display='none'">
      </div>
      <div class="product-body">
        <span class="product-number">${item.number}</span>
        <h2 class="product-title">${item.title}</h2>
        <p class="product-notes">${item.notes}</p>
        <p class="product-description">${item.description}</p>
        <div class="product-footer">
          <span class="product-price">${item.price}</span>
          <a href="signup.html" class="btn-primary">${item.btnText}</a>
        </div>
      </div>
    </article>
  `).join('');
}

function renderAboutPage(pageData) {
  if (!pageData) return;
  const storyTitleEl = document.querySelector('.story-title');
  if (storyTitleEl && pageData.storyTitle) storyTitleEl.textContent = pageData.storyTitle;

  const storyContainer = document.getElementById('story-container');
  if (storyContainer && pageData.story) {
    storyContainer.innerHTML = pageData.story.map(paragraph => `<p class="story-text">${paragraph}</p>`).join('');
  }
}

function renderQuizPage(pageData) {
  if (!pageData) return;
  const titleEl = document.querySelector('.section-title');
  const subtitleEl = document.querySelector('.section-subtitle');
  if (titleEl && pageData.title) titleEl.textContent = pageData.title;
  if (subtitleEl && pageData.subtitle) subtitleEl.textContent = pageData.subtitle;

  if (window.initQuizEngine && pageData.questions) {
    window.initQuizEngine(pageData.questions);
  }
}

function initMobileNav() {
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
    });
  }
}