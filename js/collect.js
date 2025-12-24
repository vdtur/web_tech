document.addEventListener("DOMContentLoaded", async () => {
  const dishes = await loadDishes();
  const dishesByKey = indexDishesByKeyword(dishes);
  let currentOrder = buildOrderStateFromKeywords(getCurrentOrderKeywords(), dishesByKey);

  const dishContainers = document.querySelectorAll(".js-dishes");

  function renderFilters() {
    const categories = ["soup", "main", "starter", "drink", "dessert"];
    const kindLabels = {
      fish: "рыбное",
      meat: "мясное",
      veg: "вегетарианское",
      cold: "холодный",
      hot: "горячий",
      small: "маленькая порция",
      mid: "средняя порция",
      big: "большая порция"
    };

    categories.forEach(category => {
      const filtersContainer = document.querySelector(`.filters[data-filters-for="${category}"]`);
      if (!filtersContainer) return;
      const kinds = Array.from(new Set(dishes.filter(d => d.category === category).map(d => d.kind).filter(Boolean)));
      filtersContainer.innerHTML = "";
      kinds.forEach(kind => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-btn";
        btn.dataset.kind = kind;
        btn.textContent = kindLabels[kind] || kind;
        btn.addEventListener("click", () => {
          const isActive = btn.classList.contains("active");
          Array.from(filtersContainer.children).forEach(b => b.classList.remove("active"));
          if (!isActive) {
            btn.classList.add("active");
            applyFilter(category, kind);
          } else {
            applyFilter(category, null);
          }
        });
        filtersContainer.appendChild(btn);
      });
    });
  }

  function applyFilter(category, kind) {
    const container = document.querySelector(`.js-dishes[data-category="${category}"]`);
    if (!container) return;
    Array.from(container.children).forEach(card => {
      const key = card.dataset.dish;
      const dish = dishesByKey.get(key);
      if (!dish) return;
      if (!kind || dish.kind === kind) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  }

  function updateSelectionHighlight() {
    dishContainers.forEach(container => {
      Array.from(container.children).forEach(card => {
        const key = card.dataset.dish;
        const dish = dishesByKey.get(key);
        if (!dish) return;
        if (currentOrder[dish.category] === key) {
          card.classList.add("selected");
        } else {
          card.classList.remove("selected");
        }
      });
    });
  }

  function updatePanel() {
    const sumSpans = document.querySelectorAll("#order-panel-sum");
    let total = 0;

    Object.entries(currentOrder).forEach(([category, key]) => {
      const span = document.querySelector(`[data-panel-category="${category}"]`);
      if (!span) return;
      if (!key) {
        span.textContent = category === "main" ? "Не выбрано" : "Не выбран";
        return;
      }
      const dish = dishesByKey.get(key);
      if (!dish) return;
      total += dish.price;
      span.textContent = `${dish.name} — ${dish.price} ₽`;
    });

    sumSpans.forEach(s => (s.textContent = total));

    const panel = document.getElementById("order-panel");
    if (!panel) return;
    if (total === 0) {
      panel.style.display = "none";
    } else {
      panel.style.display = "block";
    }

    const link = document.getElementById("go-checkout");
    if (!link) return;
    if (isOrderValidCombo(currentOrder)) {
      link.classList.remove("disabled");
      link.setAttribute("aria-disabled", "false");
    } else {
      link.classList.add("disabled");
      link.setAttribute("aria-disabled", "true");
    }
  }

  function selectDish(key) {
    const dish = dishesByKey.get(key);
    if (!dish) return;
    if (!currentOrder.hasOwnProperty(dish.category)) return;
    // повторный клик по выбранному блюду — снимаем выбор
    if (currentOrder[dish.category] === key) {
      currentOrder[dish.category] = null;
    } else {
      currentOrder[dish.category] = key;
    }
    const keywords = orderStateToKeywords(currentOrder);
    saveCurrentOrderKeywords(keywords);
    updateSelectionHighlight();
    updatePanel();
  }

  function renderDishes() {
    dishContainers.forEach(container => {
      const category = container.dataset.category;
      const categoryDishes = dishes
        .filter(d => d.category === category)
        .sort((a, b) => a.name.localeCompare(b.name, "ru"));
      container.innerHTML = "";
      categoryDishes.forEach(dish => {
        const card = document.createElement("div");
        card.className = "dish-card";
        card.dataset.dish = dish.keyword;

        const img = document.createElement("img");
        img.src = dish.image;
        img.alt = dish.name;

        const price = document.createElement("p");
        price.className = "dish-price";
        price.textContent = dish.price + " ₽";

        const name = document.createElement("p");
        name.className = "dish-name";
        name.textContent = dish.name;

        const count = document.createElement("p");
        count.className = "dish-count";
        count.textContent = dish.count;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Добавить";

        btn.addEventListener("click", () => selectDish(dish.keyword));
        card.addEventListener("click", (evt) => {
          if (evt.target === btn) return;
          selectDish(dish.keyword);
        });

        card.append(img, price, name, count, btn);
        container.appendChild(card);
      });
    });

    updateSelectionHighlight();
  }

  renderDishes();
  renderFilters();
  updatePanel();

  // удаление из панели заказа
  const removeButtons = document.querySelectorAll(".panel-remove[data-remove]");
  removeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.remove;
      if (!currentOrder.hasOwnProperty(category)) return;
      currentOrder[category] = null;
      saveCurrentOrderKeywords(orderStateToKeywords(currentOrder));
      updateSelectionHighlight();
      updatePanel();
    });
  });

  // модалка валидации используется при попытке оформить заказ с collect-lunch (если захотите делать submit здесь)
  const validationModal = document.getElementById("validation-modal");
  const validationModalText = document.getElementById("validation-modal-text");
  const validationModalOk = document.getElementById("validation-modal-ok");

  function hideValidationModal() {
    if (!validationModal) return;
    validationModal.hidden = true;
    validationModal.classList.add("hidden");
  }

  function showValidationModal() {
    if (!validationModal || !validationModalText) return;
    validationModal.hidden = false;
    validationModal.classList.remove("hidden");
    validationModalText.textContent = getMissingCategoriesMessage(currentOrder);
  }

  if (validationModal) {
    // синхронизируем состояние, если hidden есть в HTML
    if (validationModal.hidden) {
      validationModal.classList.add("hidden");
    }
    validationModal.addEventListener("click", evt => {
      if (evt.target === validationModal) {
        hideValidationModal();
      }
    });
  }

  if (validationModal && validationModalOk) {
    validationModalOk.addEventListener("click", hideValidationModal);
  }

  // На всякий случай экспортируем несколько функций в глобал
  window._foodexpress = {
    getCurrentOrder: () => ({ ...currentOrder }),
    isOrderValidCombo: () => isOrderValidCombo(currentOrder),
    showMissingMessage: showValidationModal
  };
});
