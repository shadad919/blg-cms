'use client'

import { useTranslations } from 'next-intl'

export interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  reason: string
  onReasonChange: (value: string) => void
}

export default function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  reason,
  onReasonChange,
}: RejectModalProps) {
  const t = useTranslations()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reject-modal-title" className="text-lg font-semibold text-text dark:text-white mb-2">
          {t('posts.rejectConfirmTitle')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('posts.rejectConfirmMessage')}
        </p>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {t('posts.rejectionReasonLabel')}
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={t('posts.rejectionReasonPlaceholder')}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {t('posts.confirmReject')}
          </button>
        </div>
      </div>
    </div>
  )
}
