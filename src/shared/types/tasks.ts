/**
 * Task Hierarchy Types
 * 
 * Defines the Epic → Story → Task hierarchy for project management
 */

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'not-started' | 'in-progress' | 'review' | 'completed' | 'blocked'
export type TaskType = 'epic' | 'story' | 'task' | 'subtask'

export interface BaseTask {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly type: TaskType
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly storyPoints?: number
  readonly assignedAgent?: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly completedAt?: Date
  readonly projectId: string
}

export interface Epic extends BaseTask {
  readonly type: 'epic'
  readonly stories: Story[]
  readonly businessValue: string
  readonly acceptanceCriteria: string[]
}

export interface Story extends BaseTask {
  readonly type: 'story'
  readonly tasks: Task[]
  readonly epicId: string
  readonly acceptanceCriteria: string[]
  readonly userStory: string // "As a... I want... so that..."
}

export interface Task extends BaseTask {
  readonly type: 'task'
  readonly subtasks: Subtask[]
  readonly storyId: string
  readonly estimatedHours?: number
  readonly actualHours?: number
}

export interface Subtask extends BaseTask {
  readonly type: 'subtask'
  readonly taskId: string
  readonly estimatedMinutes?: number
  readonly actualMinutes?: number
}

export type HierarchyItem = Epic | Story | Task | Subtask

export interface TaskHierarchy {
  readonly epics: Epic[]
  readonly totalStoryPoints: number
  readonly completedStoryPoints: number
  readonly progressPercentage: number
}

export interface TaskTreeNode {
  readonly item: HierarchyItem
  readonly children: TaskTreeNode[]
  readonly level: number
  readonly expanded: boolean
  readonly path: string[] // Array of parent IDs
}

export interface CreateEpicInput {
  readonly title: string
  readonly description: string
  readonly businessValue: string
  readonly acceptanceCriteria: string[]
  readonly priority: TaskPriority
  readonly projectId: string
}

export interface CreateStoryInput {
  readonly title: string
  readonly description: string
  readonly userStory: string
  readonly acceptanceCriteria: string[]
  readonly priority: TaskPriority
  readonly storyPoints?: number
  readonly epicId: string
}

export interface CreateTaskInput {
  readonly title: string
  readonly description: string
  readonly priority: TaskPriority
  readonly storyPoints?: number
  readonly estimatedHours?: number
  readonly assignedAgent?: string
  readonly storyId: string
}

export interface CreateSubtaskInput {
  readonly title: string
  readonly description: string
  readonly priority: TaskPriority
  readonly estimatedMinutes?: number
  readonly assignedAgent?: string
  readonly taskId: string
}

export interface UpdateTaskInput {
  readonly title?: string
  readonly description?: string
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
  readonly storyPoints?: number
  readonly assignedAgent?: string
  readonly estimatedHours?: number
  readonly actualHours?: number
}

// Task tree state management
export interface TaskTreeState {
  readonly expandedNodes: Set<string>
  readonly selectedNode: string | null
  readonly filter: TaskTreeFilter
}

export interface TaskTreeFilter {
  readonly status?: TaskStatus[]
  readonly priority?: TaskPriority[]
  readonly assignedAgent?: string[]
  readonly search?: string
  readonly showCompleted: boolean
}

// Progress calculation utilities
export interface ProgressStats {
  readonly totalItems: number
  readonly completedItems: number
  readonly inProgressItems: number
  readonly blockedItems: number
  readonly notStartedItems: number
  readonly completionPercentage: number
  readonly storyPointsTotal: number
  readonly storyPointsCompleted: number
  readonly storyPointsPercentage: number
}