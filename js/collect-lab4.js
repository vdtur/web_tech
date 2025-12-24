(function() {
  // Массив объектов с блюдами
  const dishes = [
    // Супы
    {
      keyword: "gaspacho",
      name: "Гаспачо",
      price: 195,
      category: "soup",
      count: "350 г",
      image: "images/soup1.jpg"
    },
    {
      keyword: "mushroom_soup",
      name: "Суп-пюре грибной",
      price: 185,
      category: "soup",
      count: "330 г",
      image: "images/soup2.jpg"
    },
    {
      keyword: "fish_soup",
      name: "Рыбный суп с лососем",
      price: 230,
      category: "soup",
      count: "340 г",
      image: "images/soup3.jpg"
    },
    // Главные блюда
    {
      keyword: "chicken_grill",
      name: "Куриное филе с овощами-гриль",
      price: 290,
      category: "main",
      count: "320 г",
      image: "images/main1.jpg"
    },
    {
      keyword: "fish_lemon",
      name: "Рыба запечённая с лимоном",
      price: 340,
      category: "main",
      count: "300 г",
      image: "images/main2.jpg"
    },
    {
      keyword: "pasta_veg",
      name: "Паста с овощами и соусом песто",
      price: 260,
      category: "main",
      count: "310 г",
      image: "images/main3.jpg"
    },
    // Напитки
    {
      keyword: "lemonade",
      name: "Домашний лимонад",
      price: 140,
      category: "drink",
      count: "400 мл",
      image: "images/drink1.jpg"
    },
    {
      keyword: "berry_mors",
      name: "Морс ягодный",
      price: 120,
      category: "drink",
      count: "350 мл",
      image: "images/drink2.jpg"
    },
    {
      keyword: "americano",
      name: "Американо",
      price: 130,
      category: "drink",
      count: "250 мл",
      image: "images/drink3.jpg"
    }
  ];

  function renderCategory(category, container, dishesArray) {
    // Фильтруем блюда по категории
    const filtered = dishesArray
      .filter(d => d.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

    // Очищаем контейнер, оставляя первый option (placeholder)
    const placeholder = container.querySelector('option[value=""]');
    container.innerHTML = "";
    if (placeholder) {
      container.appendChild(placeholder);
    }

    // Перебираем массив и создаем option элементы
    filtered.forEach(dish => {
      // Создаем элемент option
      const option = document.createElement("option");
      option.value = dish.keyword;
      option.textContent = `${dish.name} - ${dish.price} ₽`;
      option.dataset.dish = dish.keyword;
      
      // Добавляем option в select через DOM
      container.appendChild(option);
    });
  }

  const orderState = {
    soup: null,
    main: null,
    drink: null
  };

  function updateOrderView() {
    let total = 0;
    let hasSelected = false;

    ["soup", "main", "drink"].forEach(category => {
      const wrapper = document.querySelector(`[data-order-wrapper="${category}"]`);
      const p = document.querySelector(`.order-item[data-order-category="${category}"]`);
      const dish = orderState[category];
      
      if (dish) {
        // Отображаем название и цену блюда
        p.textContent = `${dish.name} ${dish.price}₽`;
        total += dish.price;
        hasSelected = true;
        if (wrapper) {
          wrapper.hidden = false;
          wrapper.classList.remove("hidden");
        }
      } else {
        // Если блюдо не выбрано, скрываем категорию
        p.textContent = "";
        if (wrapper) {
          wrapper.hidden = true;
          wrapper.classList.add("hidden");
        }
      }
    });

    // Показываем/скрываем сообщение о пустой корзине
    const emptyText = document.getElementById("order-empty");
    if (emptyText) {
      if (hasSelected) {
        emptyText.style.display = "none";
      } else {
        emptyText.style.display = "block";
      }
    }

    const totalBlock = document.getElementById("order-total-lab4");
    const sumSpan = totalBlock ? totalBlock.querySelector(".order-sum") : null;
    if (totalBlock && sumSpan) {
      if (total > 0) {
        sumSpan.textContent = total;
        totalBlock.hidden = false;
        totalBlock.classList.remove("hidden");
      } else {
        totalBlock.hidden = true;
        totalBlock.classList.add("hidden");
      }
    }

    // скрытые поля для отправки keyword
    const soupInput = document.getElementById("order-soup-input");
    const mainInput = document.getElementById("order-main-input");
    const drinkInput = document.getElementById("order-drink-input");
    if (soupInput) soupInput.value = orderState.soup ? orderState.soup.keyword : "";
    if (mainInput) mainInput.value = orderState.main ? orderState.main.keyword : "";
    if (drinkInput) drinkInput.value = orderState.drink ? orderState.drink.keyword : "";
  }

  // Функция для обновления выделения select элементов
  function updateSelectionHighlight() {
    // Обновляем значения в select элементах
    ["soup", "main", "drink"].forEach(category => {
      const select = document.querySelector(`.dish-select[data-category="${category}"]`);
      const dish = orderState[category];
      if (select) {
        if (dish) {
          select.value = dish.keyword;
        } else {
          select.value = "";
        }
      }
    });
  }

  function selectDish(category, dish) {
    // Сохраняем выбранное блюдо в состояние заказа
    orderState[category] = dish;
    // Обновляем отображение формы заказа
    updateOrderView();
    // Обновляем выделение карточек
    updateSelectionHighlight();
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Находим select элементы для каждой категории
    const soupSelect = document.querySelector('.js-dishes[data-category="soup"]');
    const mainSelect = document.querySelector('.js-dishes[data-category="main"]');
    const drinkSelect = document.querySelector('.js-dishes[data-category="drink"]');

    // Перебираем массив блюд и создаем option элементы для каждой категории
    renderCategory("soup", soupSelect, dishes);
    renderCategory("main", mainSelect, dishes);
    renderCategory("drink", drinkSelect, dishes);

    // Добавляем обработчики событий для select элементов
    [soupSelect, mainSelect, drinkSelect].forEach(select => {
      if (select) {
        select.addEventListener("change", (e) => {
          const keyword = e.target.value;
          const category = select.dataset.category;
          
          if (keyword) {
            // Используем data-атрибут для поиска блюда в массиве
            const foundDish = dishes.find(d => d.keyword === keyword && d.category === category);
            if (foundDish) {
              selectDish(category, foundDish);
            }
          } else {
            // Если выбрано пустое значение, снимаем выбор
            orderState[category] = null;
            updateOrderView();
            updateSelectionHighlight();
          }
        });
      }
    });

    // Инициализируем отображение заказа и выделение
    updateOrderView();
    updateSelectionHighlight();

    const form = document.getElementById("order-form-lab4");
    const modal = document.getElementById("lab4-modal");
    const modalText = document.getElementById("lab4-modal-text");
    const modalOk = document.getElementById("lab4-modal-ok");

    function hideModal() {
      if (!modal) return;
      modal.hidden = true;
      modal.classList.add("hidden");
    }

    function showModal(text) {
      if (!modal || !modalText) return;
      modalText.textContent = text;
      modal.hidden = false;
      modal.classList.remove("hidden");
    }

    if (modal) {
      // синхронизируем состояние, если hidden есть в HTML
      if (modal.hidden) {
        modal.classList.add("hidden");
      }
      // закрытие по клику на фон
      modal.addEventListener("click", evt => {
        if (evt.target === modal) {
          hideModal();
        }
      });
    }

    form.addEventListener("submit", (evt) => {
      if (!orderState.soup && !orderState.main && !orderState.drink) {
        evt.preventDefault();
        showModal("Выберите хотя бы одно блюдо, прежде чем отправлять заказ.");
      }
    });

    if (modalOk) {
      modalOk.addEventListener("click", hideModal);
    }
  });
})();

