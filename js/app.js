/**
 * Подготовка к гос.экзамену по Истории Казахстана
 * Чистый Vanilla JavaScript без зависимостей
 */

(function () {
  'use strict';

  // DOM Элементы
  const screenStart = document.getElementById('screen-start');
  const screenQuestion = document.getElementById('screen-question');
  const btnStart = document.getElementById('btn-start');
  
  const btnHamburger = document.getElementById('btn-hamburger');
  const questionHeaderTitle = document.getElementById('question-header-title');
  const questionScrollArea = document.getElementById('question-scroll-area');
  const questionContent = document.getElementById('question-content');
  
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const navCounter = document.getElementById('nav-counter');
  
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerPanel = document.getElementById('drawer-panel');
  const btnDrawerClose = document.getElementById('btn-drawer-close');
  const drawerList = document.getElementById('drawer-list');

  // Состояние приложения
  let questions = [];
  let currentIndex = 0;
  let isDrawerOpen = false;

  const STORAGE_KEY = 'history_kz_last_question_id';

  /**
   * Инициализация приложения
   */
  async function init() {
    try {
      const response = await fetch('data/questions.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      questions = await response.json();
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Данные вопросов пусты или неверного формата');
      }

      renderDrawerList();
      bindEvents();
    } catch (err) {
      console.error('Ошибка при загрузке вопросов:', err);
      if (questionContent) {
        questionContent.innerHTML = `
          <div style="color: #b91c1c; padding: 20px; text-align: center;">
            <h3>Ошибка загрузки данных</h3>
            <p>Не удалось загрузить вопросы из data/questions.json.</p>
          </div>
        `;
      }
    }
  }

  /**
   * Привязка обработчиков событий
   */
  function bindEvents() {
    // Стартовая кнопка «Перейти»
    btnStart.addEventListener('click', onStartClick);

    // Кнопка-гамбургер (открытие/закрытие меню)
    btnHamburger.addEventListener('click', toggleDrawer);

    // Кнопка закрытия меню
    if (btnDrawerClose) {
      btnDrawerClose.addEventListener('click', closeDrawer);
    }

    // Тап по затемнению (оверлею)
    drawerBackdrop.addEventListener('click', closeDrawer);

    // Кнопки навигации «Назад» и «Далее»
    btnPrev.addEventListener('click', () => {
      if (currentIndex > 0) {
        goToQuestion(currentIndex - 1);
      }
    });

    btnNext.addEventListener('click', () => {
      if (currentIndex < questions.length - 1) {
        goToQuestion(currentIndex + 1);
      }
    });

    // Навигация с клавиатуры
    document.addEventListener('keydown', (e) => {
      if (isDrawerOpen && e.key === 'Escape') {
        closeDrawer();
      }
    });
  }

  /**
   * Обработчик клика на стартовом экране
   */
  function onStartClick() {
    let targetIndex = 0;
    const savedId = localStorage.getItem(STORAGE_KEY);
    
    if (savedId) {
      const parsedId = parseInt(savedId, 10);
      const foundIdx = questions.findIndex(q => q.id === parsedId);
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
      }
    }

    // Переключение экранов
    screenStart.classList.add('hidden');
    screenStart.setAttribute('aria-hidden', 'true');

    screenQuestion.classList.remove('hidden');
    screenQuestion.setAttribute('aria-hidden', 'false');

    goToQuestion(targetIndex);
  }

  /**
   * Переход к вопросу по индексу
   */
  function goToQuestion(index) {
    if (index < 0 || index >= questions.length) return;

    currentIndex = index;
    const q = questions[currentIndex];

    // Запоминание в localStorage
    try {
      localStorage.setItem(STORAGE_KEY, q.id.toString());
    } catch (e) {
      console.warn('Не удалось сохранить в localStorage', e);
    }

    // Обновление заголовка в шапке «№[id] [title вопроса]»
    questionHeaderTitle.textContent = `№${q.id} ${q.title}`;
    questionHeaderTitle.title = `№${q.id} ${q.title}`;

    // Рендеринг ответа
    renderAnswer(q.answer);

    // Сброс прокрутки контента вверх
    questionScrollArea.scrollTop = 0;

    // Обновление состояния кнопок «Назад» / «Далее»
    btnPrev.disabled = (currentIndex === 0);
    btnNext.disabled = (currentIndex === questions.length - 1);
    navCounter.textContent = `${currentIndex + 1} / ${questions.length}`;

    // Обновление активного пункта в меню
    updateDrawerActiveItem();
  }

  /**
   * Форматирование и вывод ответа с сохранением абзацев, списков и таблиц
   */
  function renderAnswer(answerText) {
    if (!answerText) {
      questionContent.innerHTML = '';
      return;
    }

    const blocks = answerText.split(/\n\n+/);
    const htmlParts = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;

      // Проверка на Markdown таблицу
      if (block.startsWith('|') && block.includes('\n|')) {
        const tableHtml = parseMarkdownTable(block);
        if (tableHtml) {
          htmlParts.push(`<div class="table-responsive-wrapper">${tableHtml}</div>`);
          continue;
        }
      }

      // Проверка на ключевые подзаголовки
      const sectionMatch = block.match(/^(Краткий ответ|Подробный разбор|Предпосылки|Ход событий|Ход|Итоги|Значение|Личности|Хронология|Таблица сравнения|Вывод|Источник)(\:?)(.*)$/s);
      
      if (sectionMatch) {
        const prefix = sectionMatch[1];
        const colon = sectionMatch[2] || ':';
        const rest = sectionMatch[3];

        if (prefix === 'Подробный разбор' || prefix === 'Личности' || prefix === 'Хронология' || prefix === 'Таблица сравнения' || prefix === 'Источник') {
          htmlParts.push(`<h3 class="section-heading">${escapeHtml(prefix)}</h3>`);
          if (rest.trim()) {
            htmlParts.push(`<p>${escapeHtml(rest.trim())}</p>`);
          }
        } else {
          htmlParts.push(`
            <p>
              <strong class="subsection-title">${escapeHtml(prefix + colon)}</strong>
              ${escapeHtml(rest)}
            </p>
          `);
        }
        continue;
      }

      // Обычный абзац текста
      htmlParts.push(`<p>${escapeHtml(block)}</p>`);
    }

    questionContent.innerHTML = htmlParts.join('\n');
  }

  /**
   * Преобразование Markdown таблицы в чистый HTML <table>
   */
  function parseMarkdownTable(md) {
    const lines = md.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length < 2) return null;

    const parseCells = (line) => {
      // Убираем внешние |
      let clean = line;
      if (clean.startsWith('|')) clean = clean.substring(1);
      if (clean.endsWith('|')) clean = clean.substring(0, clean.length - 1);
      return clean.split('|').map(c => c.trim());
    };

    const headerCells = parseCells(lines[0]);
    let startRow = 1;
    // Пропускаем строку разделителя (| --- | --- |)
    if (lines.length > 1 && lines[1].includes('---')) {
      startRow = 2;
    }

    let rowsHtml = '';
    for (let r = startRow; r < lines.length; r++) {
      const cells = parseCells(lines[r]);
      const tds = cells.map(c => `<td>${escapeHtml(c)}</td>`).join('');
      rowsHtml += `<tr>${tds}</tr>`;
    }

    const ths = headerCells.map(c => `<th>${escapeHtml(c)}</th>`).join('');

    return `
      <table class="question-table">
        <thead>
          <tr>${ths}</tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  /**
   * Экранирование HTML для защиты от XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Генерация меню «Варианты»
   */
  function renderDrawerList() {
    drawerList.innerHTML = '';
    
    questions.forEach((q, idx) => {
      const li = document.createElement('li');
      li.className = 'drawer-item';
      li.dataset.index = idx;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-item-btn';
      btn.setAttribute('aria-label', `Вопрос №${q.id}: ${q.title}`);

      const numSpan = document.createElement('span');
      numSpan.className = 'drawer-item-num';
      numSpan.textContent = `№${q.id}`;

      const textSpan = document.createElement('span');
      textSpan.className = 'drawer-item-text';
      textSpan.textContent = q.title;

      btn.appendChild(numSpan);
      btn.appendChild(textSpan);

      // Тап по строке открывает вопрос и закрывает меню
      btn.addEventListener('click', () => {
        goToQuestion(idx);
        closeDrawer();
      });

      li.appendChild(btn);
      drawerList.appendChild(li);
    });
  }

  /**
   * Подсветка текущего вопроса в списке «Варианты»
   */
  function updateDrawerActiveItem() {
    const items = drawerList.querySelectorAll('.drawer-item');
    items.forEach((item, idx) => {
      if (idx === currentIndex) {
        item.classList.add('active');
        if (isDrawerOpen) {
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Переключение состояния выдвижной панели
   */
  function toggleDrawer() {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function openDrawer() {
    isDrawerOpen = true;
    drawerBackdrop.classList.add('open');
    drawerBackdrop.setAttribute('aria-hidden', 'false');

    drawerPanel.classList.add('open');
    drawerPanel.setAttribute('aria-hidden', 'false');

    btnHamburger.setAttribute('aria-expanded', 'true');

    // Прокручиваем к активному элементу
    const activeItem = drawerList.querySelector('.drawer-item.active');
    if (activeItem) {
      setTimeout(() => {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 100);
    }
  }

  function closeDrawer() {
    isDrawerOpen = false;
    drawerBackdrop.classList.remove('open');
    drawerBackdrop.setAttribute('aria-hidden', 'true');

    drawerPanel.classList.remove('open');
    drawerPanel.setAttribute('aria-hidden', 'true');

    btnHamburger.setAttribute('aria-expanded', 'false');
  }

  // Запуск
  document.addEventListener('DOMContentLoaded', init);
})();
