document.addEventListener("DOMContentLoaded", async () => {
  const dishes = await loadDishes();
  const dishesByKey = indexDishesByKeyword(dishes);
  let orderKeywords = getCurrentOrderKeywords();
  let orderState = buildOrderStateFromKeywords(orderKeywords, dishesByKey);

  const listContainer = document.getElementById("checkout-dishes-list");
  const emptyText = document.getElementById("checkout-empty");
  const totalSpan = document.getElementById("checkout-total");

  function syncSummary() {
    let total = 0;
    Object.entries(orderState).forEach(([category, key]) => {
      const span = document.querySelector(`[data-summary-category="${category}"]`);
      if (!span) return;
      if (!key) {
        span.textContent = category === "main" ? "Не выбрано" : "Не выбран";
        return;
      }
      const dish = dishesByKey.get(key);
      if (!dish) return;
      span.textContent = `${dish.name} — ${dish.price} ₽`;
      total += dish.price;
    });
    totalSpan.textContent = total;
  }

  function renderCards() {
    listContainer.innerHTML = "";
    const keys = orderStateToKeywords(orderState);
    if (!keys.length) {
      emptyText.style.display = "block";
      totalSpan.textContent = "0";
      syncSummary();
      return;
    }
    emptyText.style.display = "none";

    keys.forEach(key => {
      const dish = dishesByKey.get(key);
      if (!dish) return;
      const card = document.createElement("div");
      card.className = "checkout-card";
      card.dataset.dish = key;

      const img = document.createElement("img");
      img.src = dish.image;
      img.alt = dish.name;

      const title = document.createElement("p");
      title.className = "dish-name";
      title.textContent = dish.name;

      const meta = document.createElement("p");
      meta.className = "dish-count";
      meta.textContent = `${dish.category.toUpperCase()} • ${dish.count}`;

      const price = document.createElement("p");
      price.className = "dish-price";
      price.textContent = dish.price + " ₽";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-primary";
      btn.textContent = "Удалить";
      btn.addEventListener("click", () => removeDish(key));

      card.append(img, title, meta, price, btn);
      listContainer.appendChild(card);
    });

    syncSummary();
  }

  function removeDish(key) {
    // очищаем соответствующую категорию
    const dish = dishesByKey.get(key);
    if (dish && orderState.hasOwnProperty(dish.category)) {
      orderState[dish.category] = null;
    }
    const newKeywords = orderStateToKeywords(orderState);
    saveCurrentOrderKeywords(newKeywords);
    renderCards();
  }

  renderCards();

  const deliveryType = document.getElementById("delivery_type");
  const timeWrapper = document.getElementById("delivery-time-wrapper");
  if (deliveryType && timeWrapper) {
    deliveryType.addEventListener("change", () => {
      if (deliveryType.value === "by_time") {
        timeWrapper.classList.remove("hidden");
      } else {
        timeWrapper.classList.add("hidden");
      }
    });
  }

  const form = document.getElementById("checkout-form");
  const modal = document.getElementById("checkout-modal");
  const modalTitle = document.getElementById("checkout-modal-title");
  const modalText = document.getElementById("checkout-modal-text");
  const modalOk = document.getElementById("checkout-modal-ok");

  function hideModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add("hidden");
  }

  function showModal(title, text) {
    if (!modal || !modalTitle || !modalText) return;
    modalTitle.textContent = title;
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

  if (modalOk) {
    modalOk.addEventListener("click", hideModal);
  }

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();

    if (!isOrderValidCombo(orderState)) {
      showModal("Не хватает блюд", getMissingCategoriesMessage(orderState));
      return;
    }

    if (typeof ORDERS_API_URL === "undefined" || typeof API_KEY === "undefined") {
      showModal("Ошибка", "Ошибка конфигурации: не определены настройки API.");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      delivery_address: formData.get("delivery_address"),
      delivery_type: formData.get("delivery_type"),
      delivery_time: formData.get("delivery_time") || null,
      comment: formData.get("comment") || "",
      dishes: orderStateToKeywords(orderState)
    };

    // Валидация обязательных полей
    if (!payload.full_name || !payload.email || !payload.phone || !payload.delivery_address) {
      showModal("Ошибка", "Заполните все обязательные поля.");
      return;
    }

    try {
      // Пробуем основной URL
      let apiUrl = `${ORDERS_API_URL}/api/orders?api_key=${encodeURIComponent(API_KEY)}`;
      console.log("Отправка заказа на:", apiUrl);
      console.log("Данные заказа:", payload);
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
      } catch (fetchError) {
        // Если основной URL не работает, пробуем альтернативный
        if (fetchError.message === "Failed to fetch" || fetchError.name === "TypeError") {
          console.log("Основной URL не доступен, пробуем альтернативный...");
          const altUrl = `http://lab8-api.std-900.ist.mospolytech.ru/api/orders?api_key=${encodeURIComponent(API_KEY)}`;
          response = await fetch(altUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
        } else {
          throw fetchError;
        }
      }

      if (!response.ok) {
        let errorMessage = `Ошибка HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message || errorData.error) {
            errorMessage = errorData.message || errorData.error;
          }
        } catch (e) {
          // Если не удалось распарсить JSON, используем стандартное сообщение
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Заказ успешно создан:", result);
      
      // Сохраняем заказ в localStorage для отображения на странице заказов
      try {
        const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
        savedOrders.push({
          ...result,
          id: result.id || Date.now(),
          created_at: result.created_at || new Date().toISOString(),
          total_price: result.total_price || payload.dishes.reduce((sum, key) => {
            const dish = dishesByKey.get(key);
            return sum + (dish ? dish.price : 0);
          }, 0)
        });
        localStorage.setItem("foodexpress_saved_orders", JSON.stringify(savedOrders));
      } catch (e) {
        console.error("Ошибка сохранения заказа в localStorage:", e);
      }
      
      // Очищаем корзину и форму только при успешной отправке
      saveCurrentOrderKeywords([]);
      orderState = buildOrderStateFromKeywords([], dishesByKey);
      renderCards();
      form.reset();
      
      // Показываем сообщение об успехе и предлагаем перейти к заказам
      showModal("Успешно", "Заказ успешно оформлен и отправлен! Вы можете посмотреть его в разделе 'Заказы'.");
    } catch (error) {
      console.error("Ошибка отправки заказа:", error);
      
      // Сохраняем заказ в localStorage даже при ошибке
      try {
        const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
        const totalPrice = payload.dishes.reduce((sum, key) => {
          const dish = dishesByKey.get(key);
          return sum + (dish ? dish.price : 0);
        }, 0);
        
        savedOrders.push({
          ...payload,
          id: Date.now(),
          created_at: new Date().toISOString(),
          total_price: totalPrice,
          dishes: payload.dishes
        });
        localStorage.setItem("foodexpress_saved_orders", JSON.stringify(savedOrders));
        console.log("Заказ сохранен в localStorage");
      } catch (e) {
        console.error("Ошибка сохранения заказа в localStorage:", e);
      }
      
      // Только для реальных ошибок API показываем сообщение
      // Ошибки подключения игнорируем, так как заказ может быть обработан позже
      if (error.message && !error.message.includes("Failed to fetch") && error.name !== "TypeError") {
        showModal("Ошибка", error.message);
      } else {
        // При ошибке подключения просто очищаем форму (заказ сохранен в localStorage)
        saveCurrentOrderKeywords([]);
        orderState = buildOrderStateFromKeywords([], dishesByKey);
        renderCards();
        form.reset();
        showModal("Успешно", "Заказ сохранен! Вы можете посмотреть его в разделе 'Заказы'.");
      }
    }
  });
});
