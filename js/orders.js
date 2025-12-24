document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("orders-container");
  const emptyText = document.getElementById("orders-empty");

  const modal = document.getElementById("orders-modal");
  const modalTitle = document.getElementById("orders-modal-title");
  const modalBody = document.getElementById("orders-modal-body");
  const modalActions = document.getElementById("orders-modal-actions");
  const modalClose = document.getElementById("orders-modal-close");

  function openModal(title, bodyNode, actionsNode) {
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = "";
    modalBody.appendChild(bodyNode);
    modalActions.innerHTML = "";
    if (actionsNode) modalActions.appendChild(actionsNode);
    modal.hidden = false;
    modal.classList.remove("hidden");
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add("hidden");
  }

  if (modal) {
    // синхронизируем состояние, если hidden есть в HTML
    if (modal.hidden) {
      modal.classList.add("hidden");
    }
    // закрытие по клику на фон
    modal.addEventListener("click", evt => {
      if (evt.target === modal) {
        closeModal();
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  async function loadOrders() {
    console.log("Начало загрузки заказов...");
    
    if (!container || !emptyText) {
      console.error("Не найдены необходимые элементы DOM", { container, emptyText });
      return;
    }
    
    if (typeof ORDERS_API_URL === "undefined" || typeof API_KEY === "undefined") {
      console.error("Не определены ORDERS_API_URL или API_KEY", { ORDERS_API_URL, API_KEY });
      emptyText.textContent = "Ошибка конфигурации: не определены настройки API.";
      emptyText.style.display = "block";
      return;
    }

    try {
      let response;
      let apiUrl = `${ORDERS_API_URL}/api/orders?api_key=${encodeURIComponent(API_KEY)}`;
      console.log("Попытка загрузки с URL:", apiUrl);
      
      try {
        response = await fetch(apiUrl);
        console.log("Ответ получен:", response.status, response.statusText);
      } catch (fetchError) {
        console.error("Ошибка fetch основного URL:", fetchError);
        // Если основной URL не работает, пробуем альтернативный
        if (fetchError.message === "Failed to fetch" || fetchError.name === "TypeError") {
          console.log("Основной URL не доступен, пробуем альтернативный...");
          const altUrl = `http://lab8-api.std-900.ist.mospolytech.ru/api/orders?api_key=${encodeURIComponent(API_KEY)}`;
          try {
            response = await fetch(altUrl);
            console.log("Ответ альтернативного URL получен:", response.status);
          } catch (altError) {
            console.error("Ошибка альтернативного URL:", altError);
            throw fetchError;
          }
        } else {
          throw fetchError;
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ошибка ответа:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const orders = await response.json();
      console.log("Загружено заказов:", orders, "Тип:", typeof orders, "Является массивом:", Array.isArray(orders));
      
      if (!Array.isArray(orders)) {
        console.error("Ответ API не является массивом:", orders);
        emptyText.textContent = "Ошибка: неверный формат данных от сервера.";
        emptyText.style.display = "block";
        if (container) container.innerHTML = "";
        return;
      }

      // Всегда проверяем localStorage и объединяем с заказами из API
      try {
        const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
        if (savedOrders.length > 0) {
          console.log(`Найдено ${savedOrders.length} заказов в localStorage`);
          
          // Объединяем заказы из API и localStorage
          // Если заказ есть в обоих местах, приоритет у localStorage (более свежие данные)
          savedOrders.forEach(savedOrder => {
            const existingIndex = orders.findIndex(o => {
              if (o.id && savedOrder.id) {
                return String(o.id) === String(savedOrder.id);
              }
              // Если ID нет, сравниваем по дате и составу
              return o.created_at === savedOrder.created_at && 
                     JSON.stringify(o.dishes || []) === JSON.stringify(savedOrder.dishes || []);
            });
            
            if (existingIndex !== -1) {
              // Заменяем заказ из API на заказ из localStorage (более свежий)
              console.log("Заменяем заказ из API на заказ из localStorage");
              orders[existingIndex] = savedOrder;
            } else {
              // Добавляем заказ, которого нет в API
              orders.push(savedOrder);
            }
          });
        }
      } catch (e) {
        console.error("Ошибка чтения из localStorage:", e);
      }
      
      if (!orders.length) {
        console.log("Заказов нет ни в API, ни в localStorage");
        emptyText.style.display = "block";
        if (container) container.innerHTML = "";
        return;
      }

      console.log(`Отображаем ${orders.length} заказов`);
      if (emptyText) emptyText.style.display = "none";
      
      // сортировка по дате (по убыванию)
      orders.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });

      if (container) {
        container.innerHTML = "";
        orders.forEach((order, index) => {
          console.log(`Создание элемента заказа ${index + 1}:`, order);
          
          // Убеждаемся, что dishes - это массив
          const dishesArray = Array.isArray(order.dishes) ? order.dishes : (order.dishes ? [order.dishes] : []);
        const row = document.createElement("div");
        row.className = "order-row";

        const idx = document.createElement("div");
        idx.textContent = index + 1;

        const info = document.createElement("div");
        const dishesDisplay = dishesArray.length > 0 ? dishesArray.join(", ") : "Не указано";
        info.innerHTML = `<strong>${new Date(order.created_at || Date.now()).toLocaleString("ru-RU")}</strong><br>
          Состав: ${dishesDisplay}`;

        const price = document.createElement("div");
        price.textContent = `Стоимость: ${order.total_price || "—"} ₽`;

        const actions = document.createElement("div");
        actions.className = "order-row-actions";

        const btnMore = document.createElement("button");
        btnMore.type = "button";
        btnMore.className = "btn-primary";
        btnMore.textContent = "Подробнее";
        btnMore.addEventListener("click", () => showDetails(order));

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-primary";
        btnEdit.textContent = "Редактировать";
        btnEdit.addEventListener("click", () => showEdit(order));

        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn-primary";
        btnDelete.textContent = "Удалить";
        btnDelete.addEventListener("click", () => showDeleteConfirm(order));

          actions.append(btnMore, btnEdit, btnDelete);
          row.append(idx, info, price, actions);
          container.appendChild(row);
          console.log(`Заказ ${index + 1} добавлен в DOM`);
        });
        console.log("Все заказы отображены, элементов в контейнере:", container.children.length);
      }
    } catch (error) {
      console.error("Ошибка загрузки заказов:", error);
      
      // При ошибке подключения пытаемся загрузить из localStorage
      if (error.message && (error.message.includes("Failed to fetch") || error.name === "TypeError")) {
        console.log("Ошибка подключения, проверяем localStorage...");
        try {
          const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
          if (savedOrders.length > 0) {
            console.log(`Найдено ${savedOrders.length} заказов в localStorage, отображаем их`);
            // Сортируем по дате
            savedOrders.sort((a, b) => {
              const dateA = new Date(a.created_at || 0);
              const dateB = new Date(b.created_at || 0);
              return dateB - dateA;
            });
            
            if (emptyText) emptyText.style.display = "none";
            if (container) {
              container.innerHTML = "";
              savedOrders.forEach((order, index) => {
                const row = document.createElement("div");
                row.className = "order-row";

                const idx = document.createElement("div");
                idx.textContent = index + 1;

                const info = document.createElement("div");
                info.innerHTML = `<strong>${new Date(order.created_at || Date.now()).toLocaleString("ru-RU")}</strong><br>
                  Состав: ${Array.isArray(order.dishes) ? order.dishes.join(", ") : (order.dishes || "")}`;

                const price = document.createElement("div");
                price.textContent = `Стоимость: ${order.total_price || "—"} ₽`;

                const actions = document.createElement("div");
                actions.className = "order-row-actions";

                const btnMore = document.createElement("button");
                btnMore.type = "button";
                btnMore.className = "btn-primary";
                btnMore.textContent = "Подробнее";
                btnMore.addEventListener("click", () => showDetails(order));

                actions.append(btnMore);
                row.append(idx, info, price, actions);
                container.appendChild(row);
              });
            }
            return;
          }
        } catch (e) {
          console.error("Ошибка чтения из localStorage:", e);
        }
      }
      
      if (emptyText) {
        // Если это ошибка подключения, показываем более мягкое сообщение
        if (error.message && (error.message.includes("Failed to fetch") || error.name === "TypeError")) {
          emptyText.textContent = "Заказов пока нет или нет подключения к серверу.";
        } else {
          emptyText.textContent = "Не удалось загрузить список заказов. Проверьте подключение к интернету и настройки API.";
        }
        emptyText.style.display = "block";
      }
      if (container) {
        container.innerHTML = "";
      }
    }
  }

  function showDetails(order) {
    const body = document.createElement("div");
    body.innerHTML = `
      <p><strong>Дата:</strong> ${new Date(order.created_at).toLocaleString("ru-RU")}</p>
      <p><strong>ФИО:</strong> ${order.full_name || ""}</p>
      <p><strong>Email:</strong> ${order.email || ""}</p>
      <p><strong>Телефон:</strong> ${order.phone || ""}</p>
      <p><strong>Адрес:</strong> ${order.delivery_address || ""}</p>
      <p><strong>Тип доставки:</strong> ${order.delivery_type || ""}</p>
      <p><strong>Время доставки:</strong> ${order.delivery_time || "Как можно скорее (с 7:00 до 23:00)"}</p>
      <p><strong>Состав заказа:</strong> ${Array.isArray(order.dishes) ? order.dishes.join(", ") : ""}</p>
      <p><strong>Стоимость:</strong> ${order.total_price || "—"} ₽</p>
      <p><strong>Комментарий:</strong> ${order.comment || "—"}</p>
    `;

    const actions = document.createElement("div");
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "btn-primary";
    okBtn.textContent = "Ок";
    okBtn.addEventListener("click", closeModal);
    actions.appendChild(okBtn);

    openModal("Подробности заказа", body, actions);
  }

  function showEdit(order) {
    const form = document.createElement("form");
    form.className = "form";
    form.innerHTML = `
      <label>ФИО<input type="text" name="full_name" value="${order.full_name || ""}"></label>
      <label>Email<input type="email" name="email" value="${order.email || ""}"></label>
      <label>Телефон<input type="tel" name="phone" value="${order.phone || ""}"></label>
      <label>Адрес доставки<input type="text" name="delivery_address" value="${order.delivery_address || ""}"></label>
      <label>Тип доставки
        <select name="delivery_type">
          <option value="asap" ${order.delivery_type === "asap" ? "selected" : ""}>Как можно скорее</option>
          <option value="by_time" ${order.delivery_type === "by_time" ? "selected" : ""}>К указанному времени</option>
        </select>
      </label>
      <label>Время доставки<input type="time" name="delivery_time" value="${order.delivery_time || ""}"></label>
      <label>Комментарий<textarea name="comment" rows="3">${order.comment || ""}</textarea></label>
    `;

    // Добавляем кнопки внутри формы
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.gap = "8px";
    buttonsDiv.style.justifyContent = "flex-end";
    buttonsDiv.style.marginTop = "16px";
    
    const saveBtn = document.createElement("button");
    saveBtn.type = "button"; // Изменяем на button, чтобы обрабатывать клик вручную
    saveBtn.className = "btn-primary";
    saveBtn.textContent = "Сохранить";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-primary";
    cancelBtn.textContent = "Отмена";
    cancelBtn.addEventListener("click", closeModal);

    buttonsDiv.append(saveBtn, cancelBtn);
    form.appendChild(buttonsDiv);

    const actions = document.createElement("div");
    // actions оставляем пустым, так как кнопки теперь в форме

    // Обработчик сохранения на кнопке
    const handleSave = async (evt) => {
      if (evt) evt.preventDefault();
      
      console.log("Начало сохранения заказа...");
      const formData = new FormData(form);
      const payload = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        delivery_address: formData.get("delivery_address"),
        delivery_type: formData.get("delivery_type"),
        delivery_time: formData.get("delivery_time"),
        comment: formData.get("comment")
      };
      
      console.log("Данные формы:", payload);
      
      // Сохраняем исходные данные заказа (dishes, total_price, created_at, id)
      const updatedOrder = {
        ...order,
        ...payload
      };
      
      let savedToAPI = false;
      let savedToLocalStorage = false;
      
      // Пытаемся сохранить через API
      try {
        let response;
        let apiUrl = `${ORDERS_API_URL}/api/orders/${order.id}?api_key=${encodeURIComponent(API_KEY)}`;
        
        try {
          response = await fetch(apiUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (fetchError) {
          // Если основной URL не работает, пробуем альтернативный
          if (fetchError.message === "Failed to fetch" || fetchError.name === "TypeError") {
            console.log("Основной URL не доступен, пробуем альтернативный...");
            const altUrl = `http://lab8-api.std-900.ist.mospolytech.ru/api/orders/${order.id}?api_key=${encodeURIComponent(API_KEY)}`;
            try {
              response = await fetch(altUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
            } catch (altError) {
              console.log("API недоступен, сохраняем в localStorage:", altError);
              throw fetchError;
            }
          } else {
            throw fetchError;
          }
        }
        
        if (response.ok) {
          savedToAPI = true;
          console.log("Заказ успешно обновлен через API");
        } else {
          console.log("API вернул ошибку, сохраняем в localStorage");
        }
      } catch (apiError) {
        console.log("Ошибка API, сохраняем в localStorage:", apiError);
      }
      
      // Сохраняем в localStorage в любом случае
      try {
        const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
        console.log("Текущий заказ для обновления:", order);
        console.log("Заказы в localStorage:", savedOrders);
        
        let orderIndex = -1;
        
        // Пытаемся найти заказ по ID
        if (order.id) {
          orderIndex = savedOrders.findIndex(o => {
            // Сравниваем по ID (может быть число или строка)
            return String(o.id) === String(order.id);
          });
          console.log("Поиск по ID:", order.id, "Найден индекс:", orderIndex);
        }
        
        // Если не нашли по ID, ищем по дате и составу
        if (orderIndex === -1) {
          orderIndex = savedOrders.findIndex(o => {
            const dateMatch = o.created_at === order.created_at;
            const dishesMatch = JSON.stringify(o.dishes || []) === JSON.stringify(order.dishes || []);
            return dateMatch && dishesMatch;
          });
          console.log("Поиск по дате и составу. Найден индекс:", orderIndex);
        }
        
        // Если все еще не нашли, ищем по всем полям (для заказов из API)
        if (orderIndex === -1 && order.id) {
          // Пробуем найти по другим полям, которые могут совпадать
          orderIndex = savedOrders.findIndex(o => {
            return o.full_name === order.full_name && 
                   o.email === order.email &&
                   o.phone === order.phone &&
                   Math.abs(new Date(o.created_at) - new Date(order.created_at)) < 60000; // в пределах минуты
          });
          console.log("Поиск по полям. Найден индекс:", orderIndex);
        }
        
        if (orderIndex !== -1) {
          // Обновляем существующий заказ, сохраняя все исходные поля
          const existingOrder = savedOrders[orderIndex];
          savedOrders[orderIndex] = {
            ...existingOrder,
            ...updatedOrder,
            // Убеждаемся, что важные поля не потеряны
            id: existingOrder.id || updatedOrder.id || order.id,
            created_at: existingOrder.created_at || updatedOrder.created_at || order.created_at,
            dishes: existingOrder.dishes || updatedOrder.dishes || order.dishes,
            total_price: existingOrder.total_price || updatedOrder.total_price || order.total_price
          };
          savedToLocalStorage = true;
          console.log("Заказ обновлен в localStorage по индексу:", orderIndex);
        } else {
          // Если заказа нет в localStorage, добавляем его
          // Убеждаемся, что у заказа есть все необходимые поля
          if (!updatedOrder.id) {
            updatedOrder.id = order.id || Date.now();
          }
          if (!updatedOrder.created_at) {
            updatedOrder.created_at = order.created_at || new Date().toISOString();
          }
          savedOrders.push(updatedOrder);
          savedToLocalStorage = true;
          console.log("Заказ добавлен в localStorage как новый");
        }
        
        localStorage.setItem("foodexpress_saved_orders", JSON.stringify(savedOrders));
        console.log("Заказ сохранен в localStorage. Всего заказов:", savedOrders.length);
        console.log("Обновленный заказ:", savedOrders[orderIndex !== -1 ? orderIndex : savedOrders.length - 1]);
      } catch (e) {
        console.error("Ошибка сохранения в localStorage:", e);
        console.error("Детали ошибки:", e.message, e.stack);
      }
      
      // Показываем сообщение перед закрытием модального окна
      const successBody = document.createElement("p");
      if (savedToLocalStorage) {
        successBody.textContent = "Заказ успешно сохранен";
      } else {
        successBody.textContent = "Не удалось сохранить изменения. Проверьте консоль для деталей.";
      }
      
      const okBtn = document.createElement("button");
      okBtn.type = "button";
      okBtn.className = "btn-primary";
      okBtn.textContent = "Ок";
      okBtn.addEventListener("click", async () => {
        closeModal();
        // Перезагружаем заказы после закрытия модального окна
        await loadOrders();
      });
      const actions = document.createElement("div");
      actions.appendChild(okBtn);
      
      // Показываем сообщение в модальном окне
      openModal(savedToLocalStorage ? "Успешно" : "Ошибка", successBody, actions);
      
      // Если сохранение прошло успешно, сразу перезагружаем заказы
      if (savedToLocalStorage) {
        // Небольшая задержка, чтобы пользователь увидел сообщение
        setTimeout(async () => {
          await loadOrders();
        }, 100);
      }
    };
    
    // Обработчик клика на кнопку "Сохранить"
    saveBtn.addEventListener("click", handleSave);
    
    // Также обрабатываем submit формы (на случай, если пользователь нажмет Enter)
    form.addEventListener("submit", (evt) => {
      evt.preventDefault();
      handleSave(evt);
    });

    const wrapper = document.createElement("div");
    wrapper.appendChild(form);
    openModal("Редактирование заказа", wrapper, actions);
  }

  function showDeleteConfirm(order) {
    const body = document.createElement("p");
    body.textContent = "Вы уверены, что хотите удалить заказ?";

    const actions = document.createElement("div");
    const yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.className = "btn-primary";
    yesBtn.textContent = "Да";
    yesBtn.addEventListener("click", async () => {
      try {
        // Пытаемся удалить через API
        let deletedFromAPI = false;
        try {
          const response = await fetch(`${ORDERS_API_URL}/api/orders/${order.id}?api_key=${encodeURIComponent(API_KEY)}`, {
            method: "DELETE"
          });
          if (response.ok) {
            deletedFromAPI = true;
          }
        } catch (apiError) {
          console.log("API недоступен, удаляем из localStorage:", apiError);
        }
        
        // Удаляем из localStorage в любом случае
        try {
          const savedOrders = JSON.parse(localStorage.getItem("foodexpress_saved_orders") || "[]");
          const filteredOrders = savedOrders.filter(o => {
            // Сравниваем по id или по дате создания, если id нет
            if (o.id && order.id) {
              return o.id !== order.id;
            }
            // Если id нет, сравниваем по дате и составу
            return !(o.created_at === order.created_at && 
                     JSON.stringify(o.dishes) === JSON.stringify(order.dishes));
          });
          localStorage.setItem("foodexpress_saved_orders", JSON.stringify(filteredOrders));
          console.log("Заказ удален из localStorage");
        } catch (e) {
          console.error("Ошибка удаления из localStorage:", e);
        }
        
        closeModal();
        // Перезагружаем список заказов
        await loadOrders();
        
        if (deletedFromAPI) {
          // Показываем сообщение только если удалили через API
          // Для localStorage удаление происходит автоматически
        }
      } catch (error) {
        console.error("Ошибка при удалении заказа:", error);
        closeModal();
        // Все равно перезагружаем список
        await loadOrders();
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn-primary";
    cancelBtn.textContent = "Отмена";
    cancelBtn.addEventListener("click", closeModal);

    actions.append(yesBtn, cancelBtn);
    openModal("Удаление заказа", body, actions);
  }

  // Загружаем заказы при загрузке страницы
  console.log("Инициализация страницы заказов...");
  loadOrders().catch(error => {
    console.error("Критическая ошибка при загрузке заказов:", error);
  });
});
