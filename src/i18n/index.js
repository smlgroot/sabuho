import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources - only Spanish translations needed
// English text will be used as keys and displayed when no translation exists
const resources = {
  es: {
    translation: {
      // Navigation and common
      "Welcome to Sabuho": "Bienvenido a Sabuho",
      "Home": "Inicio",
      "Login": "Iniciar Sesión",
      "Register": "Registrarse",
      "Config": "Configuración",
      "Logout": "Cerrar Sesión",
      "Language": "Idioma",
      "English": "Inglés",
      "Spanish": "Español",
      
      // Home/Landing page
      "Start Learning": "Comenzar a Aprender",
      "Continue Learning": "Continuar Aprendiendo",
      "Welcome back": "Bienvenido de vuelta",
      "Ready to continue your learning journey?": "¿Listo para continuar tu viaje de aprendizaje?",
      "Hello": "Hola",
      "The free, fun, and effective way to practice for your exams!": "¡La forma gratuita, divertida y efectiva de practicar para tus exámenes!",
      "Get Started": "Comenzar",
      "Admin Portal": "Portal de Administración",
      "Choose your path to get started": "Elige tu camino para comenzar",
      
      // Auth
      "Email": "Correo Electrónico",
      "Password": "Contraseña",
      "Sign In": "Iniciar Sesión",
      "Sign Up": "Registrarse",
      "Create Account": "Crear Cuenta",
      "Already have an account?": "¿Ya tienes una cuenta?",
      "Don't have an account?": "¿No tienes una cuenta?",
      "Welcome back": "Bienvenido de vuelta",
      "Sign in to continue your learning journey": "Inicia sesión para continuar tu viaje de aprendizaje",
      "Email address": "Dirección de correo electrónico",
      "Enter your email": "Ingresa tu correo electrónico",
      "Enter your password": "Ingresa tu contraseña",
      "Signing in": "Iniciando sesión",
      "Sign in": "Iniciar sesión",
      "Create account": "Crear cuenta",
      "Join Sabuho to start practicing exams": "Únete a Sabuho para comenzar a practicar exámenes",
      "Full name": "Nombre completo",
      "Enter your full name": "Ingresa tu nombre completo",
      "Create a password (min. 6 characters)": "Crea una contraseña (mín. 6 caracteres)",
      "Confirm password": "Confirmar contraseña",
      "Confirm your password": "Confirma tu contraseña",
      "Creating account": "Creando cuenta",
      "Close": "Cerrar",
      "An unexpected error occurred": "Ocurrió un error inesperado",
      "Passwords do not match": "Las contraseñas no coinciden",
      "Password must be at least 6 characters long": "La contraseña debe tener al menos 6 caracteres",
      "Please check your email to confirm your account before signing in.": "Por favor revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.",
      
      // Config/Settings
      "Settings": "Configuración",
      "Account": "Cuenta",
      "Preferences": "Preferencias",
      "App Version": "Versión de la App",
      "Sign Out": "Cerrar Sesión",
      "Profile": "Perfil",
      "Verified Account": "Cuenta Verificada",
      "Appearance": "Apariencia",
      "Choose your preferred theme": "Elige tu tema preferido",
      "Light Mode": "Modo Claro",
      "Bright and clean": "Brillante y limpio",
      "Dark Mode": "Modo Oscuro",
      "Easy on the eyes": "Suave para los ojos",
      "Learning reminders": "Recordatorios de aprendizaje",
      "Sound Effects": "Efectos de Sonido",
      "Audio feedback": "Retroalimentación de audio",
      "Auto-save": "Guardado automático",
      "Save progress": "Guardar progreso",
      "Account Settings": "Configuración de Cuenta",
      "Privacy & Security": "Privacidad y Seguridad",
      
      // Learning
      "Learning": "Aprendizaje",
      "Learning Paths": "Rutas de Aprendizaje",
      "Quizzes": "Cuestionarios",
      "Progress": "Progreso",
      "Start Quiz": "Iniciar Cuestionario",
      "Next": "Siguiente",
      "Previous": "Anterior",
      "Submit": "Enviar",
      "Score": "Puntuación",
      "Level": "Nivel",
      "Complete": "Completo",
      "Incomplete": "Incompleto",
      "Welcome to Sabuho!": "¡Bienvenido a Sabuho!",
      "Begin your learning journey and unlock your potential.": "Comienza tu viaje de aprendizaje y desbloquea tu potencial.",
      "Completed": "Completado",
      "In Progress": "En Progreso",
      "Accuracy": "Precisión",
      "Continue Learning": "Continuar Aprendiendo",
      "Pick up where you left off in your learning path.": "Continúa donde lo dejaste en tu ruta de aprendizaje.",
      "Continue": "Continuar",
      "Take a Quiz": "Tomar un Cuestionario",
      "Test your knowledge with practice quizzes.": "Pon a prueba tu conocimiento con cuestionarios de práctica.",
      "Start Quiz": "Iniciar Cuestionario",
      "Notifications": "Notificaciones",
      
      // Quiz Screen
      "Quiz": "Cuestionario",
      "Review Mode": "Modo de Revisión",
      "Question": "Pregunta",
      "of": "de",
      "Previous": "Anterior",
      "Submit Answer": "Enviar Respuesta",
      "Next": "Siguiente",
      "Finish": "Finalizar",
      "Answer Review": "Revisión de Respuesta",
      "Explanation": "Explicación",
      "Exit Quiz?": "¿Salir del Cuestionario?",
      "Are you sure you want to exit this quiz? Your progress will be lost.": "¿Estás seguro de que quieres salir de este cuestionario? Tu progreso se perderá.",
      "Cancel": "Cancelar",
      "Exit Quiz": "Salir del Cuestionario",
      
      // Common actions
      "Save": "Guardar",
      "Cancel": "Cancelar",
      "Delete": "Eliminar",
      "Edit": "Editar",
      "Back": "Atrás",
      "Close": "Cerrar",
      "Loading": "Cargando",
      "Error": "Error",
      "Success": "Éxito"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    // This ensures that if a translation is missing, the key (English text) is displayed
    saveMissing: false,
    parseMissingKeyHandler: (key) => key,
  });

export default i18n;