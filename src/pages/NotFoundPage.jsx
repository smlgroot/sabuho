import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-xl mt-4">{t("Page not found")}</p>
        <Link to="/" className="btn btn-primary mt-6">
{t("Go home")}
        </Link>
      </div>
    </div>
  )
}