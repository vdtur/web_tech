// ключ для localStorage
const ORDER_STORAGE_KEY = "foodexpress_order_keywords";

function getCurrentOrderKeywords() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCurrentOrderKeywords(keywords) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(keywords));
}

// Преобразуем список блюд в объект по keyword
function indexDishesByKeyword(dishes) {
  const map = new Map();
  dishes.forEach(d => map.set(d.keyword, d));
  return map;
}

// Поскольку по заданию в заказе по сути по одному блюду каждой категории,
// храним структуру: {category: keyword | null}
function buildOrderStateFromKeywords(keywords, dishesByKey) {
  const state = {
    soup: null,
    main: null,
    starter: null,
    drink: null,
    dessert: null
  };

  keywords.forEach(key => {
    const dish = dishesByKey.get(key);
    if (!dish) return;
    if (state.hasOwnProperty(dish.category)) {
      state[dish.category] = key;
    }
  });

  return state;
}

function orderStateToKeywords(state) {
  return Object.values(state).filter(Boolean);
}

// Проверка соответствия комбо (упрощённая логика ЛР6):
// валидный ланч, если выбраны хотя бы суп, главное и напиток
function isOrderValidCombo(state) {
  return Boolean(state.soup && state.main && state.drink);
}

// Текст с недостающими категориями для уведомления
function getMissingCategoriesMessage(state) {
  const missing = [];
  if (!state.soup) missing.push("суп");
  if (!state.main) missing.push("главное блюдо");
  if (!state.drink) missing.push("напиток");
  if (!state.starter) missing.push("салат или стартер (необязательно, но будет вкуснее)");
  if (!state.dessert) missing.push("десерт (по желанию)");
  if (!missing.length) return "Все блюда выбраны. Можно оформить заказ.";
  return "Чтобы оформить заказ, добавьте: " + missing.join(", ") + ".";
}
