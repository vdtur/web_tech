(function() {
  function renderCategory(category, container, dishes) {
    const filtered = dishes
      .filter(d => d.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));

    container.innerHTML = "";
    filtered.forEach(dish => {
      const card = document.createElement("div");
      card.className = "dish-card";

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

      card.append(img, price, name, count, btn);
      container.appendChild(card);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const soupContainer = document.querySelector('.js-dishes[data-category="soup"]');
    const mainContainer = document.querySelector('.js-dishes[data-category="main"]');
    const drinkContainer = document.querySelector('.js-dishes[data-category="drink"]');

    // Загружаем блюда из API (с fallback на локальные данные)
    const dishes = await loadDishes();

    renderCategory("soup", soupContainer, dishes);
    renderCategory("main", mainContainer, dishes);
    renderCategory("drink", drinkContainer, dishes);
  });
})();

