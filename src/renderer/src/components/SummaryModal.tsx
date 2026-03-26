import React, { useState, useEffect, useRef } from 'react'
import { Modal, Tabs } from 'antd'
import { EditOutlined, EyeOutlined } from '@ant-design/icons'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && todo) {
      setContent(todo.summary || '')
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open, todo])

  if (!todo) return null

  const handleSave = () => {
    onSave(todo.id, content)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  const tabItems = [
    {
      key: 'edit',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditOutlined style={{ fontSize: 12 }} />
          编辑
        </span>
      ),
      children: (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="在此输入 Markdown 摘要内容..."
          style={{
            width: '100%',
            minHeight: 360,
            padding: 16,
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: '22px',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      ),
    },
    {
      key: 'preview',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <EyeOutlined style={{ fontSize: 12 }} />
          预览
        </span>
      ),
      children: (
        <div
          className="markdown-preview"
          style={{
            minHeight: 360,
            padding: 16,
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            background: 'var(--bg-card)',
            overflowY: 'auto',
            maxHeight: 500,
          }}
        >
          {content ? (
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
          ) : (
            <p style={{ color: 'var(--text-quinary)', fontSize: 13, fontStyle: 'italic' }}>暂无摘要内容</p>
          )}
        </div>
      ),
    },
  ]

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
      width={720}
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

      <Tabs defaultActiveKey="edit" items={tabItems} size="small" />
    </Modal>
  )
}

export default SummaryModal
