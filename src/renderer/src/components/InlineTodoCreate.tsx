import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { PlusOutlined, RightOutlined } from '@ant-design/icons'
import type { CreateTodoInput } from '../types/todo'

export interface InlineTodoCreateHandle {
  expand: () => void
}

interface Props {
  onCreateTodo: (input: CreateTodoInput) => void
  onOpenFullForm?: (title: string, priority?: 'low' | 'medium' | 'high') => void
  defaultGroupId?: string | null
}

const priorityOptions: { value: 'low' | 'medium' | 'high'; label: string; color: string; bg: string }[] = [
  { value: 'low', label: '低', color: 'var(--semantic-success)', bg: 'var(--semantic-success-bg)' },
  { value: 'medium', label: '中', color: 'var(--semantic-warning)', bg: 'var(--semantic-warning-bg)' },
  { value: 'high', label: '高', color: 'var(--semantic-danger)', bg: 'var(--semantic-danger-bg)' },
]

const InlineTodoCreate = forwardRef<InlineTodoCreateHandle, Props>(
  ({ onCreateTodo, onOpenFullForm, defaultGroupId }, ref) => {
    const [expanded, setExpanded] = useState(false)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low')
    const titleInputRef = useRef<HTMLInputElement>(null)
    const descInputRef = useRef<HTMLTextAreaElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const resetForm = useCallback(() => {
      setExpanded(false)
      setTitle('')
      setDescription('')
      setPriority('low')
    }, [])

    useImperativeHandle(ref, () => ({
      expand: () => {
        setExpanded(true)
      },
    }))

    useEffect(() => {
      if (expanded) {
        setTimeout(() => titleInputRef.current?.focus(), 0)
      }
    }, [expanded])

    // Click outside to dismiss expanded form
    useEffect(() => {
      if (!expanded) return
      const handleClick = (e: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          resetForm()
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [expanded, resetForm])

    const handleSubmit = useCallback(() => {
      const trimmed = title.trim()
      if (!trimmed) return
      onCreateTodo({
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        group_id: defaultGroupId ?? undefined,
      })
      resetForm()
    }, [title, description, priority, defaultGroupId, onCreateTodo, resetForm])

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        descInputRef.current?.focus()
      } else if (e.key === 'Escape') {
        resetForm()
      }
    }, [handleSubmit, resetForm])

    const handleDescKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        resetForm()
      }
    }, [handleSubmit, resetForm])

    const handleOpenMore = useCallback(() => {
      if (!title.trim()) return
      onOpenFullForm?.(title.trim(), priority)
      resetForm()
    }, [title, priority, onOpenFullForm, resetForm])

    if (!expanded) {
      return (
        <div
          className="inline-create-collapsed"
          role="button"
          tabIndex={0}
          aria-label="添加新任务"
          onClick={() => setExpanded(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setExpanded(true)
            }
          }}
        >
          <div className="inline-create-plus-icon">
            <PlusOutlined style={{ fontSize: 12 }} />
          </div>
          <span>添加新任务...</span>
        </div>
      )
    }

    return (
      <div className="inline-create-form-wrapper expanded" ref={wrapperRef}>
        <input
          ref={titleInputRef}
          className="inline-create-title-input"
          placeholder="任务标题"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
        />
        <textarea
          ref={descInputRef}
          className="inline-create-desc-input"
          placeholder="描述（可选）"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={handleDescKeyDown}
          rows={2}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {priorityOptions.map(opt => {
              const active = priority === opt.value
              return (
                <button
                  key={opt.value}
                  className="inline-create-pill"
                  data-active={active ? 'true' : undefined}
                  style={{
                    color: active ? opt.color : 'var(--text-quaternary)',
                    background: active ? opt.bg : 'transparent',
                  }}
                  onClick={() => setPriority(opt.value)}
                >
                  <span className="inline-create-pill-dot" style={{ background: active ? opt.color : 'transparent' }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="inline-create-hint">Enter 提交</span>
            {onOpenFullForm && (
              <button className="inline-create-more-link" onClick={handleOpenMore}>
                更多选项 <RightOutlined style={{ fontSize: 9 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)

InlineTodoCreate.displayName = 'InlineTodoCreate'

export default InlineTodoCreate
