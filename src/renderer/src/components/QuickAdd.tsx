import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { Input } from 'antd'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import type { CreateTodoInput } from '../types/todo'
import { parseQuickAdd, parseQuickAddTokens, type ParsedQuickAdd, type ParsedToken } from '../utils/parseQuickAdd'

export interface QuickAddHandle {
  focus: () => void
}

interface Props {
  onCreate: (input: CreateTodoInput) => void
  onOpenFullForm: (title: string, parsed?: ParsedQuickAdd) => void
}

const QuickAdd = forwardRef<QuickAddHandle, Props>(({ onCreate, onOpenFullForm }, ref) => {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<InputRef>(null)

  // NLP token preview
  const tokens = useMemo<ParsedToken[]>(() => {
    if (!value.trim()) return []
    return parseQuickAddTokens(value).tokens
  }, [value])

  useImperativeHandle(ref, () => ({
    focus: () => {
      setExpanded(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
  }))

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [expanded])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = value.trim()
      if (text) {
        const parsed = parseQuickAdd(text)
        onCreate(parsed)
        setValue('')
        setExpanded(false)
      }
    } else if (e.key === 'Escape') {
      setValue('')
      setExpanded(false)
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      const text = value.trim()
      if (text) {
        const parsed = parseQuickAdd(text)
        setValue('')
        setExpanded(false)
        onOpenFullForm(parsed.title || text, parsed)
      }
    }
  }

  if (!expanded) {
    return (
      <button
        className="quick-add-btn"
        onClick={() => setExpanded(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          border: '1.5px dashed var(--border-primary)',
          background: 'transparent',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--text-quaternary)',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          marginBottom: 20,
        }}
      >
        <PlusOutlined style={{ fontSize: 12 }} />
        快速添加任务...
      </button>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 20,
    }}>
      <Input
        ref={inputRef}
        placeholder={'输入任务标题，支持 "明天 #标签 p1"...'}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!value.trim()) setExpanded(false)
        }}
        style={{ flex: 1, borderRadius: 10, height: 36 }}
        suffix={
          <span style={{ fontSize: 11, color: 'var(--text-quinary)', whiteSpace: 'nowrap' }}>
            Enter 创建 · Shift+Enter 详细
          </span>
        }
      />
      {value.trim() && (
        <button
          onClick={() => {
            const text = value.trim()
            const parsed = parseQuickAdd(text)
            setValue('')
            setExpanded(false)
            onOpenFullForm(parsed.title || text, parsed)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            border: '1px solid var(--border-primary)',
            borderRadius: 10,
            background: 'var(--bg-card)',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}
        >
          <EditOutlined style={{ fontSize: 14 }} />
        </button>
      )}
      {tokens.length > 0 && (
        <div className="quick-add-preview">
          {tokens.map((token, idx) => (
            <span
              key={idx}
              className={`quick-add-chip ${token.type}`}
              style={{ background: token.color + '18', color: token.color, borderColor: token.color + '40' }}
            >
              {token.type === 'date' && '📅 '}
              {token.type === 'tag' && '# '}
              {token.type === 'priority' && '⚡ '}
              {token.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})

QuickAdd.displayName = 'QuickAdd'

export default QuickAdd
