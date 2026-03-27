import React, { useState, useEffect } from 'react'
import { Modal } from 'antd'
import MDEditor from '@uiw/react-md-editor'
import type { Todo } from '../types/todo'
import dayjs from 'dayjs'

interface Props {
  open: boolean
  todo: Todo | null
  onSave: (todoId: string, summary: string) => void
  onClose: () => void
}

const SummaryModal: React.FC<Props> = ({ open, todo, onSave, onClose }) => {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (open && todo) {
      setContent(todo.summary || '')
    }
  }, [open, todo])

  if (!todo) return null

  const handleSave = () => {
    onSave(todo.id, content)
    onClose()
  }

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={(_, { CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-quinary)' }}>
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter 保存
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <CancelBtn />
            <button
              onClick={handleSave}
              style={{
                padding: '5px 16px',
                background: 'var(--brand-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
      width={900}
      destroyOnHidden
      styles={{ body: { padding: '24px 28px 12px' } }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {todo.title}
        </h2>
        <div style={{ fontSize: 12, color: 'var(--text-quinary)', marginTop: 6 }}>
          更新于 {dayjs(todo.updated_at).format('YYYY-MM-DD HH:mm')}
        </div>
      </div>

      <div data-color-mode={document.documentElement.dataset.colorMode || 'light'}>
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          preview="live"
          height={420}
          minHeight={280}
          maxHeight={600}
          visibleDragbar
          textareaProps={{
            placeholder: '在此输入 Markdown 摘要内容...',
            onKeyDown: (e: React.KeyboardEvent) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
            },
          }}
        />
      </div>
    </Modal>
  )
}

export default SummaryModal
