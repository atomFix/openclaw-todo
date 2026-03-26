import React, { useState, useRef, useEffect } from 'react'
import { Input, Select, DatePicker, Tooltip } from 'antd'
import { SearchOutlined, ReloadOutlined, FilterOutlined, CloseOutlined } from '@ant-design/icons'
import type { TodoQuery } from '../types/todo'

const { Option } = Select

interface Props {
  query: TodoQuery
  onQueryChange: (query: TodoQuery) => void
  onRefresh: () => void
  sources: string[]
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
}

const priorityLabels: Record<string, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
}

const TodoFilter: React.FC<Props> = ({ query, onQueryChange, onRefresh, sources }) => {
  const [search, setSearch] = useState(query.search ?? '')
  const showArchived = query.archived === '1'
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Debounced search: auto-fire 300ms after typing stops
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onQueryChange({ ...query, search: search || undefined, page: 1 })
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const selectStyle: React.CSSProperties = { width: 110 }

  // Active filters for chips display
  const activeFilters: { key: string; label: string; onRemove: () => void }[] = []
  if (query.status) {
    activeFilters.push({
      key: 'status',
      label: `状态: ${statusLabels[query.status] || query.status}`,
      onRemove: () => onQueryChange({ ...query, status: undefined, page: 1 }),
    })
  }
  if (query.priority) {
    activeFilters.push({
      key: 'priority',
      label: `优先级: ${priorityLabels[query.priority] || query.priority}`,
      onRemove: () => onQueryChange({ ...query, priority: undefined, page: 1 }),
    })
  }
  if (query.source) {
    activeFilters.push({
      key: 'source',
      label: `来源: ${query.source}`,
      onRemove: () => onQueryChange({ ...query, source: undefined, page: 1 }),
    })
  }
  if (query.search) {
    activeFilters.push({
      key: 'search',
      label: `搜索: "${query.search}"`,
      onRemove: () => {
        setSearch('')
        onQueryChange({ ...query, search: undefined, page: 1 })
      },
    })
  }

  const hasActiveFilters = activeFilters.length > 0

  const clearAllFilters = () => {
    setSearch('')
    const { search: _, status, priority, source, sort_by, sort_order, archived, ...rest } = query
    onQueryChange({ ...rest, page: 1, sort_by: sort_by, sort_order: sort_order, archived })
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '0 0 240px' }} className="todo-filter-search">
          <Input
            placeholder="搜索任务..."
            prefix={<SearchOutlined style={{ color: 'var(--text-quaternary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            onClear={() => { setSearch(''); onQueryChange({ ...query, search: undefined, page: 1 }) }}
            style={{ borderRadius: 10, height: 36 }}
          />
        </div>

        <Select
          placeholder="状态"
          allowClear
          value={query.status}
          onChange={(val) => onQueryChange({ ...query, status: val, page: 1 })}
          style={selectStyle}
          className="filter-chip"
        >
          <Option value="pending">待处理</Option>
          <Option value="in_progress">进行中</Option>
          <Option value="done">已完成</Option>
        </Select>

        <Select
          placeholder="优先级"
          allowClear
          value={query.priority}
          onChange={(val) => onQueryChange({ ...query, priority: val, page: 1 })}
          style={selectStyle}
          className="filter-chip"
        >
          <Option value="high">高优先</Option>
          <Option value="medium">中优先</Option>
          <Option value="low">低优先</Option>
        </Select>

        {sources.length > 0 && (
          <Select
            placeholder="来源"
            allowClear
            value={query.source}
            onChange={(val) => onQueryChange({ ...query, source: val, page: 1 })}
            style={selectStyle}
            showSearch
            className="filter-chip"
          >
            {sources.map((s) => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>
        )}

        <Select
          placeholder="排序"
          value={`${query.sort_by || 'created_at'}_${query.sort_order || 'DESC'}`}
          onChange={(val) => {
            const [sortBy, sortOrder] = val.split('_')
            onQueryChange({ ...query, sort_by: sortBy, sort_order: sortOrder, page: 1 })
          }}
          style={{ width: 140 }}
          className="filter-chip"
        >
          <Option value="created_at_DESC">最新创建</Option>
          <Option value="created_at_ASC">最早创建</Option>
          <Option value="updated_at_DESC">最近更新</Option>
          <Option value="due_date_ASC">截止日期</Option>
          <Option value="priority_DESC">优先级</Option>
        </Select>

        <Tooltip title={showArchived ? '隐藏已归档' : '显示已归档'}>
          <button
            onClick={() => onQueryChange({ ...query, archived: showArchived ? '0' : '1', page: 1 })}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 10,
              border: `1px solid ${showArchived ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
              background: showArchived ? 'var(--brand-primary-light)' : 'var(--bg-card)',
              color: showArchived ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <FilterOutlined style={{ fontSize: 13 }} />
            归档
          </button>
        </Tooltip>

        {hasActiveFilters && (
          <Tooltip title="清除所有筛选">
            <button
              onClick={clearAllFilters}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid var(--semantic-danger)',
                background: 'var(--semantic-danger-bg)',
                color: 'var(--semantic-danger)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <CloseOutlined style={{ fontSize: 11 }} />
              清除筛选
            </button>
          </Tooltip>
        )}

        <div style={{ flex: 1 }} />

        <Tooltip title="刷新">
          <button
            onClick={onRefresh}
            className="action-btn"
            style={{
              width: 36,
              height: 36,
              border: '1px solid var(--border-primary)',
              borderRadius: 10,
              background: 'var(--bg-card)',
            }}
          >
            <ReloadOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
          </button>
        </Tooltip>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {activeFilters.map(f => (
            <span
              key={f.key}
              onClick={f.onRemove}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--brand-primary)',
                background: 'var(--brand-primary-light)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: '18px',
              }}
            >
              {f.label}
              <CloseOutlined style={{ fontSize: 9 }} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TodoFilter
