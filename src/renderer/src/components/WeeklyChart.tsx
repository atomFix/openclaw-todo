import React from 'react'
import { InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { WeeklyStat } from '../types/todo'

interface Props {
  data: WeeklyStat[]
}

function formatWeekLabel(week: string): string {
  // week format: "2026-W13"
  const match = week.match(/^(\d{4})-W(\d+)$/)
  if (!match) return week.replace(/^\d{4}-W/, '')
  const year = parseInt(match[1], 10)
  const weekNum = parseInt(match[2], 10)
  // ISO week: Monday is the first day
  const jan4 = dayjs(`${year}-01-04`) // Jan 4 is always in week 1
  const monday = jan4.startOf('week').add(1, 'day').add((weekNum - 1) * 7, 'day')
  const sunday = monday.add(6, 'day')
  return `${monday.format('M/D')}-${sunday.format('M/D')}`
}

const WeeklyChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{
        marginTop: 16,
        padding: '32px 20px',
        background: 'var(--bg-card)',
        borderRadius: 14,
        border: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.25s ease, border-color 0.25s ease',
      }}>
        <InboxOutlined style={{ fontSize: 24, color: 'var(--text-quinary)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-quaternary)', fontWeight: 500 }}>
          暂无统计数据
        </span>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.created, d.completed)), 1)
  const chartHeight = 90

  return (
    <div style={{
      marginTop: 16,
      padding: '16px 20px',
      background: 'var(--bg-card)',
      borderRadius: 14,
      border: '1px solid var(--border-primary)',
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
        周报统计
      </div>
      <div className="weekly-chart">
        {data.map((stat, i) => {
          const createdH = Math.max(2, (stat.created / maxVal) * chartHeight)
          const completedH = Math.max(2, (stat.completed / maxVal) * chartHeight)
          const weekLabel = formatWeekLabel(stat.week)
          return (
            <div key={i} className="weekly-chart-col">
              <div className="weekly-chart-bars">
                <div
                  className="weekly-chart-bar created"
                  style={{ height: createdH }}
                  title={`创建: ${stat.created}`}
                />
                <div
                  className="weekly-chart-bar completed"
                  style={{ height: completedH }}
                  title={`完成: ${stat.completed}`}
                />
              </div>
              <span className="weekly-chart-label">{weekLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="weekly-chart-legend">
        <div className="weekly-chart-legend-item">
          <div className="weekly-chart-legend-dot" style={{ background: 'var(--brand-primary)' }} />
          创建
        </div>
        <div className="weekly-chart-legend-item">
          <div className="weekly-chart-legend-dot" style={{ background: 'var(--semantic-success)' }} />
          完成
        </div>
      </div>
    </div>
  )
}

export default WeeklyChart
