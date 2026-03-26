import React, { useEffect, useRef } from 'react'
import { Empty, Pagination } from 'antd'
import { InboxOutlined, SearchOutlined, CalendarOutlined, ExclamationCircleOutlined, FolderOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons'
import type { Todo, SmartView } from '../types/todo'
import TodoItem from './TodoItem'
import TodoSkeleton from './TodoSkeleton'

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
}

const TodoList: React.FC<Props> = ({
  todos, total, loading, page, pageSize,
  onPageChange, onEdit, onDelete, onStatusChange, onToggleSubtask, onPromoteSubtask, onViewSummary,
  focusedIndex, onFocusedIndexChange,
  isSearch, isFiltered, activeSmartView, groupName,
}) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex !== undefined && focusedIndex >= 0 && focusedIndex < itemRefs.current.length) {
      itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [focusedIndex])

  if (loading) {
    return <TodoSkeleton />
  }

  if (!loading && todos.length === 0) {
    // Contextual empty state
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
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{
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

  return (
    <div>
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
        {todos.map((todo, index) => (
          <div key={todo.id} ref={el => { itemRefs.current[index] = el }}>
            <TodoItem
              todo={todo}
              focused={focusedIndex === index}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onToggleSubtask={onToggleSubtask}
              onPromoteSubtask={onPromoteSubtask}
              onViewSummary={onViewSummary}
            />
            {index < todos.length - 1 && (
              <div style={{ height: 1, background: 'var(--border-secondary)', marginLeft: 54 }} />
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
