import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources - only Spanish translations needed
// English text will be used as keys and displayed when no translation exists
const resources = {
  es: {
    translation: {
      "Learning Hub": "Centro de Aprendizaje",
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
      "Pick up where you left off in your learning path.": "Continúa donde lo dejaste en tu ruta de aprendizaje.",
      "Continue": "Continuar",
      "Take a Quiz": "Tomar un Cuestionario",
      "Test your knowledge with practice quizzes.": "Pon a prueba tu conocimiento con cuestionarios de práctica.",
      "Notifications": "Notificaciones",
      
      // Quiz Screen
      "Quiz": "Cuestionario",
      "Review Mode": "Modo de Revisión",
      "Question": "Pregunta",
      "of": "de",
      "Submit Answer": "Enviar Respuesta",
      "Finish": "Finalizar",
      "Answer Review": "Revisión de Respuesta",
      "Explanation": "Explicación",
      "Exit Quiz?": "¿Salir del Cuestionario?",
      "Are you sure you want to exit this quiz? Your progress will be lost.": "¿Estás seguro de que quieres salir de este cuestionario? Tu progreso se perderá.",
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
      "Success": "Éxito",
      
      // Landing Page & Meta
      "Quiz Quest": "Quest de Cuestionarios",
      "Master any subject through interactive quizzes and comprehensive learning tools": "Domina cualquier materia a través de cuestionarios interactivos y herramientas de aprendizaje integrales",
      "Sabuho Admin": "Administrador de Sabuho",
      "Manage your learning domains, quizzes, and educational content all in one place.": "Gestiona tus dominios de aprendizaje, cuestionarios y contenido educativo en un solo lugar.",
      "Go to Admin Panel": "Ir al Panel de Administración",
      "Page not found": "Página no encontrada",
      "Loading...": "Cargando...",
      
      // Authentication - Extended
      "Welcome Back": "Bienvenido de Vuelta",
      "Sign in to access Quiz Quest Admin": "Inicia sesión para acceder al Administrador de Quiz Quest",
      "Signing in...": "Iniciando sesión...",
      "Sign up": "Regístrate",
      "Password must be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
      "Check your email for a confirmation link!": "¡Revisa tu correo electrónico para obtener un enlace de confirmación!",
      "Join Quiz Quest Admin": "Únete al Administrador de Quiz Quest",
      "Create a password (min 6 chars)": "Crea una contraseña (mín. 6 caracteres)",
      "Confirm Password": "Confirmar Contraseña",
      "Creating account...": "Creando cuenta...",
      "User ID": "ID de Usuario",
      "Account Created": "Cuenta Creada",
      "Last Sign In": "Último Inicio de Sesión",
      
      // Game/Learning Components
      "No Quizzes Available": "No Hay Cuestionarios Disponibles",
      "To start your learning journey, you need to add quizzes first...": "Para comenzar tu viaje de aprendizaje, primero necesitas agregar cuestionarios...",
      "Go to Quizzes": "Ir a Cuestionarios",
      "Use a valid quiz code to unlock learning paths and challenges.": "Usa un código de cuestionario válido para desbloquear rutas de aprendizaje y desafíos.",
      "Select a Quiz to Begin": "Selecciona un Cuestionario para Comenzar",
      "Choose a quiz from the selector above to view your learning path...": "Elige un cuestionario del selector de arriba para ver tu ruta de aprendizaje...",
      "Your learning journey awaits! Pick a subject to get started.": "¡Tu viaje de aprendizaje te espera! Elige una materia para comenzar.",
      "Click to review": "Haz clic para revisar",
      "Select a quiz": "Selecciona un cuestionario",
      "Choose Quiz": "Elegir Cuestionario",
      "Add a quiz code to get started!": "¡Agrega un código de cuestionario para comenzar!",
      "Add More": "Agregar Más",
      
      // Quiz Management
      "Failed to load quizzes": "Error al cargar cuestionarios",
      "Please enter a valid code": "Por favor ingresa un código válido",
      "Failed to verify code": "Error al verificar código",
      "Please log in to check for claimed quizzes": "Por favor inicia sesión para verificar cuestionarios reclamados",
      "Add Quiz": "Agregar Cuestionario",
      "Checking Claimed Quizzes...": "Verificando Cuestionarios Reclamados...",
      "Check for Claimed Quizzes": "Verificar Cuestionarios Reclamados",
      "No quizzes yet": "Aún no hay cuestionarios",
      "Enter a quiz code to get started 🔑": "Ingresa un código de cuestionario para comenzar 🔑",
      "Quiz code": "Código de cuestionario",
      "Enter your quiz code": "Ingresa tu código de cuestionario",
      "Adding Quiz": "Agregando Cuestionario",
      "Exit quiz and return to learning hub": "Salir del cuestionario y volver al centro de aprendizaje",
      "Progress will be lost": "El progreso se perderá",
      "You'll need to restart the quiz from the beginning if you continue.": "Necesitarás reiniciar el cuestionario desde el principio si continúas.",
      
      // Admin Panel
      "No domain selected": "Ningún dominio seleccionado",
      "Are you sure you want to delete this question?": "¿Estás seguro de que quieres eliminar esta pregunta?",
      "Are you sure you want to delete this quiz?": "¿Estás seguro de que quieres eliminar este cuestionario?",
      "Store": "Tienda",
      "Creator": "Creador",
      "Domains": "Dominios",
      "Quiz Creator": "Creador de Cuestionarios",
      "Welcome to Quiz Creator": "Bienvenido al Creador de Cuestionarios",
      "Create engaging quizzes with our intuitive builder. Add questions, set difficulty levels, and track student progress - all from one powerful interface.": "Crea cuestionarios atractivos con nuestro constructor intuitivo. Agrega preguntas, establece niveles de dificultad y rastrea el progreso estudiantil - todo desde una interfaz poderosa.",
      "Get started by creating your first domain, then add quizzes and questions to build comprehensive learning experiences.": "Comienza creando tu primer dominio, luego agrega cuestionarios y preguntas para construir experiencias de aprendizaje integrales.",
      "Loading domains...": "Cargando dominios...",
      "Creating quiz...": "Creando cuestionario...",
      "Access your personalized learning dashboard": "Accede a tu panel de aprendizaje personalizado",
      "Explore and purchase additional quiz content": "Explora y compra contenido de cuestionarios adicional",
      "Build custom quizzes and manage content": "Construye cuestionarios personalizados y gestiona contenido",
      "Organize your quiz topics and subjects": "Organiza tus temas y materias de cuestionarios",
      "Welcome to Quiz Quest Admin": "Bienvenido al Administrador de Quiz Quest",
      "View Learning Hub": "Ver Centro de Aprendizaje",
      "Open Quiz Creator": "Abrir Creador de Cuestionarios",
      "Manage Domains": "Gestionar Dominios",
      
      // Forms
      "Edit Domain": "Editar Dominio",
      "Create New Domain": "Crear Nuevo Dominio",
      "Name": "Nombre",
      "Domain name": "Nombre del dominio",
      "Description": "Descripción",
      "Optional description": "Descripción opcional",
      "Thumbnail URL": "URL de Miniatura",
      "Optional thumbnail URL": "URL de miniatura opcional",
      "All options must have labels": "Todas las opciones deben tener etiquetas",
      "Edit Question": "Editar Pregunta",
      "Create New Question": "Crear Nueva Pregunta",
      "Source Resource": "Recurso Fuente",
      "Select a resource": "Seleccionar un recurso",
      "Enter your question here...": "Ingresa tu pregunta aquí...",
      "Explain the correct answer...": "Explica la respuesta correcta...",
      "Answer Options": "Opciones de Respuesta",
      "Upload Resource": "Subir Recurso",
      "Resource Name": "Nombre del Recurso",
      "Enter resource name": "Ingresa el nombre del recurso",
      "Enter resource description": "Ingresa la descripción del recurso",
      "Uploading...": "Subiendo...",
      
      // Search & Filters
      "Search domains...": "Buscar dominios...",
      "No domains found.": "No se encontraron dominios.",
      "Move Questions": "Mover Preguntas",
      "No other domains available": "No hay otros dominios disponibles",
      "Search questions...": "Buscar preguntas...",
      "Advanced Filters": "Filtros Avanzados",
      "Filters": "Filtros",
      "Created Date Range": "Rango de Fecha de Creación",
      "From date": "Fecha desde",
      "From": "Desde",
      "To date": "Fecha hasta",
      "Question Type": "Tipo de Pregunta",
      "No questions match your search.": "Ninguna pregunta coincide con tu búsqueda.",
      "No questions created yet.": "Aún no se han creado preguntas.",
      
      // Additional Common Actions & States
      "Create": "Crear",
      "Upload": "Subir",
      "Saving...": "Guardando...",
      "Failed to...": "Error al...",
      "Successfully...": "Exitosamente...",
      "Go home": "Ir al inicio",
      "Confirm...": "Confirmar...",
      "Delete this...": "Eliminar esto...",
      "To": "Hasta"
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