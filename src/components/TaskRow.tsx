import type { Task } from '../types'
import { ShameBadge, TagBadge } from './win95/Badge'

interface Props {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onOpen: (id: string) => void
}

export function TaskRow({ task, onToggle, onOpen }: Props) {
  const done = task.status === 'completed'
  return (
    <li className={done ? 'taskrow taskrow--done' : 'taskrow'}>
      <input
        type="checkbox"
        className="taskrow__check"
        checked={done}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        aria-label={`Mark "${task.title}" as ${done ? 'not done' : 'done'}`}
      />
      <div className="taskrow__main">
        <button className="taskrow__title" onClick={() => onOpen(task.id)}>
          {task.title}
        </button>
        {(task.keepCount > 0 || task.tags.length > 0 || task.notes || task.remindAt) && (
          <div className="taskrow__meta">
            <ShameBadge keepCount={task.keepCount} />
            {task.remindAt && (
              <span className="badge badge--remind">🔔 {task.remindAt}</span>
            )}
            {task.tags.map((t) => (
              <TagBadge key={t} name={t} />
            ))}
            {task.notes && (
              <span className="badge" title="Has notes" aria-label="Has notes">
                ✎
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
