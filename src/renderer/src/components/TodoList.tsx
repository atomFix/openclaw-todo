import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Empty, Pagination, Popconfirm, Select, Tooltip, Button } from 'antd'
import { InboxOutlined, SearchOutlined, CalendarOutlined, ExclamationCircleOutlined, FolderOutlined, CheckCircleOutlined, RocketOutlined, DeleteOutlined, CloseOutlined, TagOutlined } from '@ant-design/icons'
import type { Todo, SmartView, CreateTodoInput } from '../types/todo'
import TodoItem from './TodoItem'
import TodoSkeleton from './TodoSkeleton'
import InlineTodoCreate from './InlineTodoCreate'

interface Props {
  todos: Todo[]
  total: number
  loading: boolean
  page: number
  pageSize: number
  onPageChange: (page: number, pageSize: number) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  onStatusChange: (id: string, status: Todo['status']) => void
  onToggleSubtask: (id: string, index: number) => void
  onPromoteSubtask: (todoId: string, index: number) => void
  onViewSummary: (todo: Todo) => void
  focusedIndex?: number
  onFocusedIndexChange?: (index: number) => void
  // Context for empty states
  isSearch?: boolean
  isFiltered?: boolean
  activeSmartView?: SmartView
  groupName?: string | null
  // Selection & batch
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onBatchStatusChange: (status: Todo['status']) => void
  onBatchDelete: () => void
  onBatchArchive: () => void
  onBatchAddTags: (tags: string[]) => void
  // Inline create
  onCreateTodo?: (input: CreateTodoInput) => void
  onOpenFullForm?: (title: string, priority?: 'low' | 'medium' | 'high') => void
  defaultGroupId?: string | null
  inlineCreateRef?: React.RefObject<{ expand: () => void } | null>
}

const TodoList: React.FC<Props> = ({
  todos, total, loading, page, pageSize,
  onPageChange, onEdit, onDelete, onStatusChange, onToggleSubtask, onPromoteSubtask, onViewSummary,
  focusedIndex, onFocusedIndexChange,
  isSearch, isFiltered, activeSmartView, groupName,
  selectedIds, onSelectionChange,
  onBatchStatusChange, onBatchDelete, onBatchArchive, onBatchAddTags,
  onCreateTodo, onOpenFullForm, defaultGroupId, inlineCreateRef,
}) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const lastClickedIndex = useRef<number | null>(null)
  const [batchTags, setBatchTags] = useState<string[]>([])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex !== undefined && focusedIndex >= 0 && focusedIndex < itemRefs.current.length) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [focusedIndex])

  // Clear selection when todos change
  useEffect(() => {
    onSelectionChange(new Set())
    lastClickedIndex.current = null
  }, [todos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectionToggle = useCallback((index: number) => {
    const todo = todos[index]
    if (!todo) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(todo.id)) {
      newSelected.delete(todo.id)
    } else {
      newSelected.add(todo.id)
    }
    lastClickedIndex.current = index
    onSelectionChange(newSelected)
  }, [todos, selectedIds, onSelectionChange])

  const handleShiftClick = useCallback((index: number) => {
    const start = lastClickedIndex.current ?? index
    const lo = Math.min(start, index)
    const hi = Math.max(start, index)
    const newSelected = new Set(selectedIds)
    for (let i = lo; i <= hi; i++) {
      if (todos[i]) newSelected.add(todos[i].id)
    }
    lastClickedIndex.current = index
    onSelectionChange(newSelected)
  }, [todos, selectedIds, onSelectionChange])

  const handleBatchAddTagsConfirm = useCallback(() => {
    if (batchTags.length > 0) {
      onBatchAddTags(batchTags)
      setBatchTags([])
    }
  }, [batchTags, onBatchAddTags])

  if (loading) {
    return <TodoSkeleton />
  }

  if (!loading && todos.length === 0) {
    let icon = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
    let mainMessage = '暂无任务'
    let subMessage = '点击右上角「新建任务」开始'

    if (isSearch) {
      icon = <SearchOutlined style={{ fontSize: 28, color: 'var(--text-quinary)' }} />
      mainMessage = '没有找到匹配的任务'
      subMessage = '试试其他关键词'
    } else if (activeSmartView === 'today') {
      icon = <CalendarOutlined style={{ fontSize: 28, color: 'var(--brand-primary)' }} />
      mainMessage = '今天没有待办任务'
      subMessage = '好好休息，享受当下'
    } else if (activeSmartView === 'overdue') {
      icon = <CheckCircleOutlined style={{ fontSize: 28, color: 'var(--semantic-success)' }} />
      mainMessage = '没有过期任务'
      subMessage = '一切尽在掌控之中'
    } else if (groupName) {
      icon = <FolderOutlined style={{ fontSize: 28, color: 'var(--text-quinary)' }} />
      mainMessage = '分组中没有任务'
      subMessage = `在「${groupName}」中创建第一个任务`
    } else if (total === 0 && !isFiltered) {
      icon = <RocketOutlined style={{ fontSize: 28, color: 'var(--brand-primary)' }} />
      mainMessage = '开始你的第一个任务'
      subMessage = '使用快捷键 N 快速添加'
    } else if (todos.every(t => t.status === 'done')) {
      icon = <CheckCircleOutlined style={{ fontSize: 28, color: 'var(--semantic-success)' }} />
      mainMessage = '所有任务已完成'
      subMessage = '太棒了，继续保持'
    }

    return (
      <div className="empty-state-container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <div className="empty-state-icon" style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          {icon}
        </div>
        <p style={{ color: 'var(--text-quaternary)', fontSize: 14, fontWeight: 500, marginTop: 8 }}>
          {mainMessage}
        </p>
        <p style={{ color: 'var(--text-quinary)', fontSize: 12 }}>
          {subMessage}
        </p>
      </div>
    )
  }

  const hasSelection = selectedIds.size > 0

  return (
    <div>
      {/* Batch action bar */}
      {hasSelection && (
        <div className="batch-action-bar">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            已选择 {selectedIds.size} 项
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              size="small"
              placeholder="改状态"
              style={{ width: 110 }}
              onChange={(val) => onBatchStatusChange(val)}
              options={[
                { value: 'pending', label: '待处理' },
                { value: 'in_progress', label: '进行中' },
                { value: 'done', label: '已完成' },
              ]}
            />
            <Select
              size="small"
              mode="tags"
              placeholder="加标签"
              style={{ width: 130 }}
              value={batchTags}
              onChange={setBatchTags}
              onBlur={handleBatchAddTagsConfirm}
              tokenSeparators={[',']}
              suffixIcon={<TagOutlined style={{ fontSize: 12 }} />}
            />
            <Popconfirm
              title={`确定删除 ${selectedIds.size} 个任务？`}
              onConfirm={onBatchDelete}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
            <Tooltip title="归档选中任务">
              <Button size="small" icon={<InboxOutlined />} onClick={onBatchArchive}>归档</Button>
            </Tooltip>
            <Tooltip title="清除选择">
              <button className="action-btn" style={{ width: 28, height: 28 }} onClick={() => onSelectionChange(new Set())}>
                <CloseOutlined style={{ fontSize: 12, color: 'var(--text-quaternary)' }} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Todo list */}
      <div
        style={{
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 1px 3px var(--shadow-card)',
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* Inline create — hidden during batch selection */}
        {onCreateTodo && selectedIds.size === 0 && (
          <div style={{ padding: '8px 16px' }}>
            <InlineTodoCreate
              ref={inlineCreateRef}
              onCreateTodo={onCreateTodo}
              onOpenFullForm={onOpenFullForm}
              defaultGroupId={defaultGroupId}
            />
          </div>
        )}
        {/* Separator between inline create and first todo */}
        {onCreateTodo && selectedIds.size === 0 && todos.length > 0 && (
          <div style={{ height: 1, background: 'var(--border-secondary)', marginLeft: 80 }} />
        )}
        {todos.map((todo, index) => (
          <div key={todo.id} ref={el => { itemRefs.current[index] = el }} style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
            <TodoItem
              todo={todo}
              focused={focusedIndex === index}
              selected={selectedIds.has(todo.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onToggleSubtask={onToggleSubtask}
              onPromoteSubtask={onPromoteSubtask}
              onViewSummary={onViewSummary}
              onSelectionToggle={() => handleSelectionToggle(index)}
              onShiftClick={() => handleShiftClick(index)}
            />
            {index < todos.length - 1 && (
              <div style={{ height: 1, background: 'var(--border-secondary)', marginLeft: 80 }} />
            )}
          </div>
        ))}
      </div>

      {total > pageSize && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={onPageChange}
            showSizeChanger={false}
            showTotal={(t) => `共 ${t} 条`}
            pageSizeOptions={['10', '20', '50']}
          />
        </div>
      )}
    </div>
  )
}

export default TodoList
