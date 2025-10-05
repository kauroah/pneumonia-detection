export const translations = {
  // Authentication
  login: "Вход",
  register: "Регистрация",
  email: "Электронная почта",
  password: "Пароль",
  fullName: "Полное имя",
  role: "Роль",
  doctor: "Врач",
  nurse: "Медсестра",
  signIn: "Войти",
  signUp: "Зарегистрироваться",
  alreadyHaveAccount: "Уже есть аккаунт?",
  dontHaveAccount: "Нет аккаунта?",
  logout: "Выйти",

  // Dashboard
  dashboard: "Панель управления",
  newAnalysis: "Новый анализ",
  recentAnalyses: "Недавние анализы",
  uploadXray: "Загрузить рентген",

  // Analysis
  patientName: "Имя пациента",
  patientAge: "Возраст пациента",
  uploadImage: "Загрузить изображение",
  analyze: "Анализировать",
  analyzing: "Анализ...",
  diagnosis: "Диагноз",
  confidence: "Уверенность",
  recommendation: "Рекомендация",

  // Results
  pneumoniaDetected: "Обнаружена пневмония",
  noPneumonia: "Пневмония не обнаружена",
  aiAssistant: "ИИ-ассистент",
  askAI: "Спросить ИИ",

  // Messages
  uploadSuccess: "Файл успешно загружен",
  analysisComplete: "Анализ завершен",
  error: "Ошибка",
  loading: "Загрузка...",

  // File types
  supportedFormats: "Поддерживаемые форматы: PNG, JPEG, PDF",
  dragAndDrop: "Перетащите файл сюда или нажмите для выбора",

  // Medical terms
  treatment: "Лечение",
  prevention: "Профилактика",
  lungHealth: "Здоровье легких",
  consultation: "Консультация",
}

export type TranslationKey = keyof typeof translations
