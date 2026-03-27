import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Dropdown, message, Popover, Tooltip } from 'antd'
import type { InputRef } from 'antd'
import dayjs from 'dayjs'
import {
  AppstoreOutlined,
  PlusOutlined,
  FolderOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  TagOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HolderOutlined,
  FileTextOutlined,
  SunOutlined,
  MoonOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { Group, CreateGroupInput, UpdateGroupInput, TodoSummaryItem, SmartView, SmartCounts } from '../types/todo'

interface Props {
  groups: Group[]
  selectedGroupId: string | null
  allCount: number
  collapsed: boolean
  onToggleCollapse: () => void
  onSelectGroup: (id: string | null) => void
  onCreateGroup: (input: CreateGroupInput) => Promise<Group>
  onRenameGroup: (id: string, input: UpdateGroupInput) => Promise<Group>
  onDeleteGroup: (id: string) => Promise<void>
  onReorderGroups: (items: { id: string; sort_order: number }[]) => Promise<void>
  summaryTodos: TodoSummaryItem[]
  onViewSummary: (todoId: string) => void
  isDark: boolean
  onToggleTheme: () => void
  smartCounts: SmartCounts
  activeSmartView: SmartView
  onSmartViewChange: (view: SmartView) => void
  allTags: string[]
  onFilterTag: (tag: string | null) => void
  activeTag: string | null
  tagCounts: Record<string, number>
}

const Sidebar: React.FC<Props> = ({
  groups, selectedGroupId, allCount, collapsed,
  onToggleCollapse,
  onSelectGroup, onCreateGroup, onRenameGroup, onDeleteGroup, onReorderGroups,
  summaryTodos, onViewSummary,
  isDark, onToggleTheme,
  smartCounts, activeSmartView, onSmartViewChange,
  allTags, onFilterTag, activeTag, tagCounts,
}) => {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<InputRef>(null)
  const editRef = useRef<InputRef>(null)

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creating])

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
    }
  }, [editingId])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      setCreating(false)
      setNewName('')
      return
    }
    try {
      const group = await onCreateGroup({ name })
      setCreating(false)
      setNewName('')
      onSelectGroup(group.id)
    } catch (err: any) {
      message.error(err.message || '创建分组失败')
    }
  }

  const handleRename = async () => {
    if (!editingId) return
    const name = editName.trim()
    if (!name) {
      setEditingId(null)
      return
    }
    try {
      await onRenameGroup(editingId, { name })
      setEditingId(null)
    } catch (err: any) {
      message.error(err.message || '重命名失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onDeleteGroup(id)
      message.success('分组已删除')
    } catch (err: any) {
      message.error(err.message || '删除失败')
    }
  }

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Need a small timeout so the drag image captures correctly
    setTimeout(() => setDropIndex(null), 0)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex !== null && dragIndex !== index) {
      setDropIndex(index)
    }
  }, [dragIndex])

  const handleDrop = useCallback(async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    const newGroups = [...groups]
    const [moved] = newGroups.splice(dragIndex, 1)
    newGroups.splice(targetIndex, 0, moved)
    const items = newGroups.map((g, i) => ({ id: g.id, sort_order: i }))
    try {
      await onReorderGroups(items)
    } catch (err: any) {
      message.error(err.message || '排序失败')
    }
    setDragIndex(null)
    setDropIndex(null)
  }, [dragIndex, groups, onReorderGroups])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  const themeIcon = isDark
    ? <SunOutlined style={{ fontSize: 14 }} />
    : <MoonOutlined style={{ fontSize: 14 }} />

  // If collapsed, show a minimal sidebar
  if (collapsed) {
    return (
      <div className="sidebar sidebar-collapsed">
        <div className="sidebar-header sidebar-header-collapsed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <button className="sidebar-collapse-btn" onClick={onToggleCollapse}>
              <MenuUnfoldOutlined style={{ fontSize: 14 }} />
            </button>
            <Tooltip title={isDark ? '切换亮色模式' : '切换暗色模式'}>
              <button className="sidebar-collapse-btn" onClick={onToggleTheme}>
                {themeIcon}
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="sidebar-nav">
          <div
            className={`sidebar-item sidebar-item-collapsed ${selectedGroupId === null ? 'active' : ''}`}
            onClick={() => onSelectGroup(null)}
          >
            <TagOutlined style={{ fontSize: 16 }} />
          </div>
          <div className="sidebar-separator" />
          {groups.map(group => (
            <div
              key={group.id}
              className={`sidebar-item sidebar-item-collapsed ${selectedGroupId === group.id ? 'active' : ''}`}
              onClick={() => onSelectGroup(group.id)}
            >
              <FolderOutlined style={{ fontSize: 16 }} />
            </div>
          ))}
        </div>
        {summaryTodos.length > 0 && (
          <Tooltip title="摘要文档">
            <Popover
              placement="rightTop"
              trigger="click"
              content={
                <div style={{ maxHeight: 300, overflow: 'auto', minWidth: 160 }}>
                  {summaryTodos.slice(0, 8).map(item => (
                    <div
                      key={item.id}
                      onClick={() => onViewSummary(item.id)}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {item.title.length > 14 ? item.title.slice(0, 14) + '...' : item.title}
                    </div>
                  ))}
                </div>
              }
            >
              <div
                className="sidebar-item sidebar-item-collapsed"
                style={{ marginTop: 4 }}
              >
                <FileTextOutlined style={{ fontSize: 16, color: 'var(--semantic-purple)' }} />
              </div>
            </Popover>
          </Tooltip>
        )}
        <div className="sidebar-footer">
          <button
            className="sidebar-new-btn sidebar-new-btn-collapsed"
            onClick={() => {
              setCreating(true)
              setNewName('')
              onToggleCollapse()
            }}
          >
            <PlusOutlined style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      {/* Logo area - extra top padding for macOS traffic lights */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ fontSize: 18, color: 'var(--brand-primary)' }} />
            <span className="sidebar-logo-text">OpenClaw Todo</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title={isDark ? '切换亮色模式' : '切换暗色模式'}>
              <button className="sidebar-collapse-btn" onClick={onToggleTheme}>
                {themeIcon}
              </button>
            </Tooltip>
            <button className="sidebar-collapse-btn" onClick={onToggleCollapse}>
              <MenuFoldOutlined style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="sidebar-nav">
        {/* All tasks */}
        <div
          className={`sidebar-item ${selectedGroupId === null && activeSmartView === 'all' ? 'active' : ''}`}
          onClick={() => { onSelectGroup(null); onSmartViewChange('all') }}
        >
          <TagOutlined style={{ fontSize: 14, color: selectedGroupId === null && activeSmartView === 'all' ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
          <span className="sidebar-item-text">全部任务</span>
          <span key={allCount} className="sidebar-item-badge count-badge-pulse">{allCount}</span>
        </div>

        {/* Smart views */}
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quinary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            智能视图
          </div>
        </div>
        <div
          className={`sidebar-item ${activeSmartView === 'today' ? 'active' : ''}`}
          onClick={() => { onSelectGroup(null); onSmartViewChange('today') }}
          style={{ paddingLeft: 16 }}
        >
          <CalendarOutlined style={{ fontSize: 14, color: activeSmartView === 'today' ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
          <span className="sidebar-item-text">今天</span>
          {smartCounts.today > 0 && <span key={smartCounts.today} className="sidebar-item-badge count-badge-pulse">{smartCounts.today}</span>}
        </div>
        <div
          className={`sidebar-item ${activeSmartView === 'upcoming' ? 'active' : ''}`}
          onClick={() => { onSelectGroup(null); onSmartViewChange('upcoming') }}
          style={{ paddingLeft: 16 }}
        >
          <ClockCircleOutlined style={{ fontSize: 14, color: activeSmartView === 'upcoming' ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
          <span className="sidebar-item-text">即将到期</span>
          {smartCounts.upcoming > 0 && <span key={smartCounts.upcoming} className="sidebar-item-badge count-badge-pulse">{smartCounts.upcoming}</span>}
        </div>
        <div
          className={`sidebar-item ${activeSmartView === 'overdue' ? 'active' : ''}`}
          onClick={() => { onSelectGroup(null); onSmartViewChange('overdue') }}
          style={{ paddingLeft: 16 }}
        >
          <ExclamationCircleOutlined style={{ fontSize: 14, color: activeSmartView === 'overdue' ? 'var(--semantic-danger)' : 'var(--text-tertiary)' }} />
          <span className="sidebar-item-text">已过期</span>
          {smartCounts.overdue > 0 && (
            <span key={smartCounts.overdue} className="sidebar-item-badge count-badge-pulse" style={{ background: 'var(--semantic-danger-bg)', color: 'var(--semantic-danger)' }}>{smartCounts.overdue}</span>
          )}
        </div>

        {/* Separator */}
        <div className="sidebar-separator" />

        {/* Groups section title */}
        {groups.length > 0 && (
          <div style={{ padding: '4px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quinary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              分组
            </div>
          </div>
        )}

        {/* Group list - draggable */}
        {groups.map((group, idx) => (
          <div key={group.id}>
            {/* Drop indicator line */}
            {dropIndex === idx && dragIndex !== null && dragIndex !== idx && (
              <div className="sidebar-drop-indicator" />
            )}
            {editingId === group.id ? (
              <div className="sidebar-item editing">
                <Input
                  ref={editRef}
                  size="small"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onPressEnter={handleRename}
                  onBlur={handleRename}
                  style={{ flex: 1, fontSize: 13, height: 28 }}
                />
              </div>
            ) : (
              <div
                className={`sidebar-item ${selectedGroupId === group.id ? 'active' : ''} ${dragIndex === idx ? 'dragging' : ''}`}
                onClick={() => { onSelectGroup(group.id); onSmartViewChange('all') }}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                <HolderOutlined
                  className="sidebar-drag-handle"
                  style={{ fontSize: 12, color: 'var(--text-quinary)', cursor: 'grab' }}
                />
                <FolderOutlined style={{ fontSize: 14, color: selectedGroupId === group.id ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
                <span className="sidebar-item-text">{group.name}</span>
                <span key={group.todo_count} className="sidebar-item-badge count-badge-pulse">{group.todo_count ?? 0}</span>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'rename',
                        icon: <EditOutlined style={{ fontSize: 12 }} />,
                        label: '重命名',
                        onClick: () => {
                          setEditingId(group.id)
                          setEditName(group.name)
                        },
                      },
                      { type: 'divider' },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined style={{ fontSize: 12 }} />,
                        label: '删除',
                        danger: true,
                        onClick: () => handleDelete(group.id),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <button
                    className="sidebar-item-more"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreOutlined style={{ fontSize: 12, color: 'var(--text-quaternary)' }} />
                  </button>
                </Dropdown>
              </div>
            )}
            {/* Drop indicator at end */}
            {dropIndex === idx + 1 && dragIndex === groups.length - 1 && idx === groups.length - 1 && (
              <div className="sidebar-drop-indicator" />
            )}
          </div>
        ))}

        {/* Drop zone at the bottom of group list */}
        {dragIndex !== null && dropIndex === groups.length && (
          <div className="sidebar-drop-indicator" />
        )}

        {/* New group input */}
        {creating && (
          <div className="sidebar-item editing">
            <Input
              ref={inputRef}
              size="small"
              placeholder="分组名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onPressEnter={handleCreate}
              onBlur={handleCreate}
              style={{ flex: 1, fontSize: 13, height: 28 }}
            />
          </div>
        )}

        {/* Tags section */}
        {allTags.length > 0 && (
          <>
            <div className="sidebar-separator" />
            <div style={{ padding: '4px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quinary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                标签
              </div>
            </div>
            {allTags.slice(0, 10).map(tag => (
              <div
                key={tag}
                className={`sidebar-item${activeTag === tag ? ' active' : ''}`}
                onClick={() => onFilterTag(activeTag === tag ? null : tag)}
                style={{ padding: '6px 12px' }}
              >
                <span className="sidebar-item-text" style={{ fontSize: 12 }}>
                  {tag}
                </span>
                <span className="sidebar-item-badge">
                  {tagCounts[tag] || 0}
                </span>
              </div>
            ))}
            {allTags.length > 10 && (
              <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-quinary)' }}>
                +{allTags.length - 10} 更多
              </div>
            )}
          </>
        )}

        {/* Summary docs section */}
        {summaryTodos.length > 0 && (
          <>
            <div className="sidebar-separator" />
            <div style={{ padding: '4px 12px', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileTextOutlined style={{ fontSize: 11, color: 'var(--semantic-purple)' }} />
                摘要文档
              </div>
            </div>
            {summaryTodos.slice(0, 8).map(item => (
              <div
                key={item.id}
                className="sidebar-item"
                onClick={() => onViewSummary(item.id)}
                style={{ padding: '6px 12px' }}
              >
                <span className="sidebar-item-text" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {item.title.length > 12 ? item.title.slice(0, 12) + '...' : item.title}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-quinary)', flexShrink: 0 }}>
                  {dayjs(item.updated_at).format('MM/DD')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Bottom: new group button */}
      <div className="sidebar-footer">
        <button
          className="sidebar-new-btn"
          onClick={() => {
            setCreating(true)
            setNewName('')
          }}
        >
          <PlusOutlined style={{ fontSize: 12 }} />
          <span>新建分组</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar
