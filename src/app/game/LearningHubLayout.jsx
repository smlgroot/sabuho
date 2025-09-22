import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  ClipboardList, 
  Settings, 
  LogOut
} from 'lucide-react';

function LearningHubLayout({ title, children, headerAction }) {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/learning-hub/path', icon: BookOpen, label: t('Learning') },
    { path: '/learning-hub/quizzes', icon: ClipboardList, label: t('Quizzes') },
    { path: '/learning-hub/config', icon: Settings, label: t('Config') }
  ];


  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Desktop Header Navigation */}
      <header className="hidden md:block bg-base-200 border-b border-base-300 sticky top-0 z-50">
        <div className="navbar">
          <div className="navbar-start">
          </div>
          
          <div className="navbar-center">
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`btn btn-ghost btn-sm ${
                      isActive(item.path) ? 'btn-active' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="navbar-end">
            {headerAction && (
              <div className="mr-2">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-base-200 border-b border-base-300 sticky top-0 z-50">
        <div className="navbar">
          <div className="navbar-start">
          </div>
          
          <div className="navbar-center">
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>

          <div className="navbar-end">
            {headerAction}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  isActive(item.path) 
                    ? 'text-primary bg-primary/10' 
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-300/50'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default LearningHubLayout;