import React, { useEffect, useRef } from 'react'
import { Modal, Form, Input, Select, DatePicker, Tooltip } from 'antd'
import type { InputRef } from 'antd'
import { MinusCircleOutlined, PlusOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { Todo, CreateTodoInput, UpdateTodoInput, Subtask, Group } from '../types/todo'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const priorityOptions: { value: Todo['priority']; label: string; color: string; bg: string }[] = [
  { value: 'high', label: '高', color: 'var(--semantic-danger)', bg: 'var(--semantic-danger-bg)' },
  { value: 'medium', label: '中', color: 'var(--semantic-warning)', bg: 'var(--semantic-warning-bg)' },
  { value: 'low', label: '低', color: 'var(--semantic-success)', bg: 'var(--semantic-success-bg)' },
]

const statusOptions: { value: Todo['status']; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'pending', label: '待处理', color: 'var(--text-tertiary)', bg: 'var(--bg-secondary)', dot: 'var(--text-quaternary)' },
  { value: 'in_progress', label: '进行中', color: 'var(--brand-primary)', bg: 'var(--brand-primary-light)', dot: 'var(--brand-primary)' },
  { value: 'done', label: '已完成', color: 'var(--semantic-success)', bg: 'var(--semantic-success-bg)', dot: 'var(--semantic-success)' },
]

const SectionLabel: React.FC<{ children: React.ReactNode; optional?: boolean }> = ({ children, optional }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
    {children}
    {optional && <span style={{ fontWeight: 400, marginLeft: 4 }}>(可选)</span>}
  </div>
)

const SectionDivider = () => (
  <div style={{ height: 1, background: 'var(--border-secondary)', margin: '16px 0' }} />
)

interface Props {
  open: boolean
  todo: Todo | null
  onSubmit: (data: CreateTodoInput | UpdateTodoInput) => void
  onClose: () => void
  sources: string[]
  groups?: Group[]
  defaultGroupId?: string | null
  prefilledTitle?: string
  prefilledPriority?: Todo['priority']
  prefilledTags?: string[]
  prefilledDueDate?: string
}

const TodoForm: React.FC<Props> = ({ open, todo, onSubmit, onClose, sources, groups, defaultGroupId, prefilledTitle, prefilledPriority, prefilledTags, prefilledDueDate }) => {
  const [form] = Form.useForm()
  const isEdit = !!todo
  const titleRef = useRef<InputRef>(null)

  useEffect(() => {
    if (open) {
      if (todo) {
        let subtasks: Subtask[] = []
        try { subtasks = JSON.parse(todo.subtasks || '[]') } catch { subtasks = [] }
        let todoTags: string[] = []
        try { todoTags = JSON.parse(todo.tags || '[]') } catch { todoTags = [] }
        form.setFieldsValue({
          title: todo.title,
          description: todo.description,
          status: todo.status,
          priority: todo.priority,
          tags: todoTags,
          due_date: todo.due_date ? dayjs(todo.due_date) : null,
          source: todo.source || undefined,
          notes: todo.notes || '',
          subtasks: subtasks.length > 0 ? subtasks : undefined,
          group_id: todo.group_id || undefined,
          summary: todo.summary || '',
        })
      } else {
        form.resetFields()
        form.setFieldsValue({
          status: 'pending',
          priority: prefilledPriority || 'medium',
          tags: prefilledTags || [],
          due_date: prefilledDueDate ? dayjs(prefilledDueDate) : null,
          group_id: defaultGroupId || undefined,
          title: prefilledTitle || '',
        })
      }
      // Auto-focus title
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [open, todo, form, defaultGroupId, prefilledTitle, prefilledPriority, prefilledTags, prefilledDueDate])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        title: values.title,
        description: values.description || '',
        status: values.status,
        priority: values.priority,
        tags: values.tags || [],
        due_date: values.due_date?.format('YYYY-MM-DD') || null,
        source: values.source || '',
        notes: values.notes || '',
        subtasks: values.subtasks || [],
        group_id: values.group_id || null,
        summary: values.summary || '',
      }
      onSubmit(data)
    } catch {
      // form validation failed
    }
  }

  // Handle Ctrl/Cmd+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleOk()
    }
  }

  const priorityValue = Form.useWatch('priority', form) as Todo['priority'] | undefined
  const statusValue = Form.useWatch('status', form) as Todo['status'] | undefined

  return (
    <Modal
      title={null}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '保存修改' : '创建任务'}
      cancelText="取消"
      destroyOnHidden
      width={560}
      footer={(_, { OkBtn, CancelBtn }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-secondary)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-quinary)' }}>
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter 快速提交
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
      styles={{
        body: { padding: '24px 28px 12px' },
      }}
    >
      <div onKeyDown={handleKeyDown}>
        <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {isEdit ? '编辑任务' : '新建任务'}
        </h2>
        {isEdit && todo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: 'var(--text-quinary)' }}>
            <ClockCircleOutlined style={{ fontSize: 11 }} />
            <span>创建于 {dayjs(todo.created_at).format('YYYY-MM-DD HH:mm')}</span>
            {todo.updated_at !== todo.created_at && (
              <span style={{ marginLeft: 8 }}>· 更新于 {dayjs(todo.updated_at).format('MM-DD HH:mm')}</span>
            )}
          </div>
        )}
        {!isEdit && (
          <p style={{ fontSize: 13, color: 'var(--text-quaternary)', margin: '4px 0 0' }}>
            填写任务信息以创建新任务
          </p>
        )}
      </div>

      <Form form={form} layout="vertical" autoComplete="off" size="middle">
        {/* ── Basic: Title ── */}
        <Form.Item
          name="title"
          rules={[
            { required: true, message: '请输入任务标题' },
            { max: 500, message: '标题不能超过 500 字符' },
          ]}
          style={{ marginBottom: 16 }}
        >
          <Input
            ref={titleRef}
            placeholder="输入任务标题..."
            style={{
              fontWeight: 600,
              fontSize: 15,
              height: 42,
              border: 'none',
              borderBottom: '2px solid var(--border-primary)',
              borderRadius: 0,
              background: 'var(--bg-input)',
              padding: '8px 4px',
            }}
          />
        </Form.Item>

        {/* ── Status & Priority pills ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>状态</SectionLabel>
            <Form.Item name="status" style={{ margin: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {statusOptions.map(opt => {
                  const active = statusValue === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setFieldValue('status', opt.value)}
                      style={{
                        flex: 1,
                        height: 34,
                        border: `1.5px solid ${active ? opt.color : 'var(--border-primary)'}`,
                        background: active ? opt.bg : 'var(--bg-card)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: active ? 600 : 500,
                        color: active ? opt.color : 'var(--text-tertiary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: opt.dot,
                        opacity: active ? 1 : 0.4,
                      }} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </Form.Item>
          </div>

          <div style={{ flex: 1 }}>
            <SectionLabel>优先级</SectionLabel>
            <Form.Item name="priority" style={{ margin: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {priorityOptions.map(opt => {
                  const active = priorityValue === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setFieldValue('priority', opt.value)}
                      style={{
                        flex: 1,
                        height: 34,
                        border: `1.5px solid ${active ? opt.color : 'var(--border-primary)'}`,
                        background: active ? opt.bg : 'var(--bg-card)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: active ? 600 : 500,
                        color: active ? opt.color : 'var(--text-tertiary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: opt.color,
                        opacity: active ? 1 : 0.3,
                      }} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </Form.Item>
          </div>
        </div>

        <SectionDivider />

        {/* ── Source & Group ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item
            name="source"
            style={{ flex: 1, marginBottom: 4 }}
          >
            <Select
              placeholder="来源"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {sources.map((s) => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Select>
          </Form.Item>

          {groups && groups.length > 0 && (
            <Form.Item
              name="group_id"
              style={{ flex: 1, marginBottom: 4 }}
            >
              <Select placeholder="分组" allowClear optionFilterProp="children">
                {groups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{g.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-quinary)' }}>{g.todo_count ?? 0}</span>
                    </span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>

        <SectionDivider />

        {/* ── Description & Notes ── */}
        <SectionLabel optional>描述</SectionLabel>
        <Form.Item name="description" style={{ marginBottom: 12 }}>
          <TextArea
            rows={2}
            placeholder="添加任务描述..."
            style={{
              resize: 'none',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
            }}
          />
        </Form.Item>

        <SectionLabel optional>备注</SectionLabel>
        <Form.Item name="notes" style={{ marginBottom: 4 }}>
          <TextArea
            rows={2}
            placeholder="添加备注信息..."
            style={{
              resize: 'none',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
            }}
          />
        </Form.Item>

        <SectionDivider />

        {/* ── Due date & Tags ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel optional>截止日期</SectionLabel>
            <Form.Item name="due_date" style={{ marginBottom: 4 }}>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="选择日期"
              />
            </Form.Item>
          </div>

          <div style={{ flex: 1 }}>
            <SectionLabel optional>标签</SectionLabel>
            <Form.Item name="tags" style={{ marginBottom: 4 }}>
              <Select mode="tags" placeholder="输入后回车" tokenSeparators={[',']} />
            </Form.Item>
          </div>
        </div>

        <SectionDivider />

        {/* ── Subtasks ── */}
        <Form.List name="subtasks">
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <SectionLabel>
                  子任务
                  {fields.length > 0 && (
                    <span style={{ color: 'var(--text-quinary)', fontWeight: 400, marginLeft: 4 }}>
                      {fields.length} 项
                    </span>
                  )}
                </SectionLabel>
                <button
                  type="button"
                  onClick={() => add({ text: '', done: false })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    border: '1px dashed var(--text-quinary)',
                    background: 'transparent',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--brand-primary)'
                    e.currentTarget.style.color = 'var(--brand-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--text-quinary)'
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                  }}
                >
                  <PlusOutlined style={{ fontSize: 11 }} />
                  添加
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fields.map(({ key, name, ...restField }) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg-input)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      border: '1px solid var(--border-secondary)',
                    }}
                  >
                    <Form.Item
                      {...restField}
                      name={[name, 'done']}
                      valuePropName="checked"
                      style={{ margin: 0 }}
                    >
                      <input type="checkbox" className="todo-checkbox" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'text']}
                      rules={[{ required: true, message: '' }]}
                      style={{ margin: 0, flex: 1 }}
                    >
                      <Input
                        placeholder="子任务内容"
                        variant="borderless"
                        style={{ background: 'transparent', fontWeight: 500, fontSize: 13 }}
                      />
                    </Form.Item>
                    <Tooltip title="删除">
                      <button
                        type="button"
                        onClick={() => remove(name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.15s ease',
                          color: 'var(--text-quinary)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--semantic-danger)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-quinary)')}
                      >
                        <MinusCircleOutlined style={{ fontSize: 14 }} />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Form.List>

        <SectionDivider />

        {/* ── Summary (Markdown) ── */}
        <SectionLabel optional>摘要文档 (Markdown)</SectionLabel>
        <Form.Item name="summary" style={{ marginBottom: 4 }}>
          <TextArea
            rows={4}
            placeholder="输入 Markdown 格式的长文本文档..."
            style={{
              resize: 'vertical',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              borderRadius: 8,
              fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              fontSize: 12,
              lineHeight: '20px',
            }}
          />
        </Form.Item>
      </Form>
      </div>
    </Modal>
  )
}

export default TodoForm
