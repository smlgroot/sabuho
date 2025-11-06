'use client'

import { useState, useEffect } from 'react'
import { Plus, TicketSlash } from 'lucide-react'
import * as supabaseService from '@/services/supabaseService'
import { useTranslation } from 'react-i18next'

export function DomainCodesSection({ domain, onCodesCountUpdate }) {
  const { t } = useTranslation()
  const [domainCodes, setDomainCodes] = useState([])
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCodes, setIsLoadingCodes] = useState(true)
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')

  // Load domain codes
  const loadDomainCodes = async () => {
    if (!domain?.id) return
    setIsLoadingCodes(true)
    try {
      const { data: codes, error: codesError } =
        await supabaseService.fetchDomainCodes(domain.id)
      if (codesError) throw codesError
      setDomainCodes(codes || [])
      // Update parent with codes count
      if (onCodesCountUpdate) {
        onCodesCountUpdate(codes?.length || 0)
      }
    } catch (error) {

    } finally {
      setIsLoadingCodes(false)
    }
  }

  // Load user credits
  const loadUserCredits = async () => {
    try {
      const { user } = await supabaseService.getCurrentUser()
      const { data: credits, error } = await supabaseService.getUserCredits(user.id)
      if (error) throw error
      setUserCredits(credits?.credits || 0)
    } catch (error) {

    }
  }

  useEffect(() => {
    loadDomainCodes()
    loadUserCredits()
  }, [domain?.id])

  // Generate a random 8-character code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Create domain code
  const createDomainCode = async () => {
    await loadUserCredits()
    if (userCredits < 1) {
      setShowCreditDialog(true)
      return
    }

    setIsCreatingCode(true)
    try {
      const { user } = await supabaseService.getCurrentUser()
      const code = generateCode()

      // 1. Create the domain code
      const { data: newCode, error: codeError } =
        await supabaseService.createDomainCode(user.id, domain.id, code)
      if (codeError) throw codeError

      // 2. Deduct 1 credit
      const { error: creditError } =
        await supabaseService.deductUserCredit(user.id, 1)
      if (creditError) throw creditError

      // 3. Update UI
      setUserCredits(prev => prev - 1)
      await loadDomainCodes()
      setGeneratedCode(code)
      setShowCodeDialog(false)
      setShowSuccessDialog(true)
    } catch (error) {

      alert('Failed to create domain code. Please try again.')
    } finally {
      setIsCreatingCode(false)
    }
  }

  // Copy code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    // Visual feedback is provided by the UI state
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium flex items-center gap-2">
          {t("Domain Codes")}
          {isLoadingCodes && (<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />)}
        </h2>
        {domainCodes.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              await loadUserCredits()
              setShowCodeDialog(true)
            }}
            disabled={!domain?.id}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('Generate Code')}
          </button>
        )}
      </div>

      {isLoadingCodes ? (
        <div className="border rounded-md p-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">{t("Loading codes...")}</span>
          </div>
        </div>
      ) : domainCodes.length > 0 ? (
        <div className="border rounded-md">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>{t('Code')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Created')}</th>
                  <th>{t('Claimed By')}</th>
                </tr>
              </thead>
              <tbody>
                {domainCodes.map((code) => {
                  const isClaimed = code.user_domain_codes && code.user_domain_codes.length > 0
                  return (
                    <tr key={code.id}>
                      <td>
                        <code
                          className="bg-base-200 px-2 py-1 rounded text-sm font-mono cursor-pointer hover:bg-base-300"
                          onClick={() => copyToClipboard(code.code)}
                          title="Click to copy"
                        >
                          {code.code}
                        </code>
                      </td>
                      <td>
                        {isClaimed ? (
                          <span className="badge badge-success px-2">{t("Claimed")}</span>
                        ) : (
                          <span className="badge badge-outline px-2">{t("Available")}</span>
                        )}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {new Date(code.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {isClaimed ?
                          `User ${code.user_domain_codes[0].user_id.slice(-8)}` :
                          '-'
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border rounded-md">
          <TicketSlash className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("No codes created yet.")}</p>
          <button
            className="btn btn-primary btn-sm mt-3"
            onClick={async () => {
              await loadUserCredits()
              setShowCodeDialog(true)
            }}
            disabled={!domain?.id}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('Create First Code')}
          </button>
        </div>
      )}

      {/* Credit Dialog */}
      {showCreditDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t("Insufficient Credits")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("You need credits to create domain codes. You currently have")} {userCredits} {t("credit(s). Please purchase more credits to continue.")}
            </p>
            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => setShowCreditDialog(false)}
              >
                {t('Cancel')}
              </button>
              <button className="btn btn-primary">
                {t("Buy Credits")}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreditDialog(false)} />
        </div>
      )}

      {/* Code Creation Dialog */}
      {showCodeDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t("Create Domain Code")}</h3>
            <div className="space-y-4 mb-6">
              <div className="alert alert-info">
                <div>
                  <p className="text-sm">
                    Creating a domain code will use 1 credit. You currently have {userCredits} credit(s) available.
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground">
                A unique code will be generated that users can redeem to access this domain.
              </p>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-outline"
                onClick={() => setShowCodeDialog(false)}
                disabled={isCreatingCode}
              >
                {t('Cancel')}
              </button>
              <button
                className="btn btn-primary"
                onClick={createDomainCode}
                disabled={isCreatingCode || userCredits < 1}
              >
                {isCreatingCode ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  t('Create Code')
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isCreatingCode && setShowCodeDialog(false)} />
        </div>
      )}

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t("Code Created Successfully!")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("Your domain code has been generated:")}
            </p>
            <div className="bg-base-200 p-4 rounded-lg mb-6 text-center">
              <code
                className="text-2xl font-mono font-bold cursor-pointer hover:text-primary"
                onClick={() => copyToClipboard(generatedCode)}
                title="Click to copy"
              >
                {generatedCode}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                {t('Code copied to clipboard!')}
              </p>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  copyToClipboard(generatedCode)
                  setShowSuccessDialog(false)
                }}
              >
                {t('Close')}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowSuccessDialog(false)} />
        </div>
      )}
    </div>
  )
}
