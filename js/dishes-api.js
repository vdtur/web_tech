async function loadDishes() {
  try {
    const response = await fetch(DISHES_API_URL);
    if (!response.ok) {
      throw new Error("Ошибка HTTP " + response.status);
    }
    const raw = await response.json();
    const data = normalizeDishes(raw);
    // сортировка по названию внутри категории
    data.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return data;
  } catch (error) {
    console.error("Не удалось загрузить блюда по API, используется локальный массив:", error);
    const data = normalizeDishes(Array.isArray(LOCAL_DISHES) ? [...LOCAL_DISHES] : []);
    data.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return data;
  }
}

// Приводим категории и размеры к внутреннему формату
function normalizeDishes(list) {
  if (!Array.isArray(list)) return [];
  const categoryMap = {
    "main-course": "main",
    salad: "starter"
  };
  const sizeMap = {
    medium: "mid",
    large: "big"
  };
  return list.map(dish => {
    const normalized = { ...dish };
    if (categoryMap[normalized.category]) {
      normalized.category = categoryMap[normalized.category];
    }
    if (sizeMap[normalized.kind]) {
      normalized.kind = sizeMap[normalized.kind];
    }
    return normalized;
  });
}
