/**
 * Task Creation Forms - Create new Epics, Stories, Tasks, and Subtasks
 * 
 * Epic 2 Story 4.2: Task Creation and Editing
 * Provides forms for creating hierarchical task items with proper validation
 */

import React, { useCallback, useState } from 'react'
import { Modal, ModalBody, ModalFooter } from '@/renderer/components/common/Modal'
import type { 
  TaskType, 
  TaskPriority, 
  CreateEpicInput,
  CreateStoryInput, 
  CreateTaskInput,
  CreateSubtaskInput
} from '@/shared/types/tasks'

// =============================================================================
// Task Creation Form Props
// =============================================================================

export interface TaskCreateFormProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly taskType: TaskType
  readonly parentId?: string
  readonly projectId: string
  readonly onSubmit: (data: CreateEpicInput | CreateStoryInput | CreateTaskInput | CreateSubtaskInput) => void
}

// =============================================================================
// Task Creation Form Component
// =============================================================================

export const TaskCreateForm: React.FC<TaskCreateFormProps> = ({
  isOpen,
  onClose,
  taskType,
  parentId,
  projectId,
  onSubmit
}) => {
  const [formData, setFormData] = useState(() => getInitialFormData(taskType))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    
    const validationErrors = validateFormData(formData, taskType)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const submitData = buildSubmitData(formData, taskType, parentId, projectId)
      await onSubmit(submitData)
      onClose()
      setFormData(getInitialFormData(taskType))
      setErrors({})
    } catch (error) {
      console.error('Failed to create task:', error)
      setErrors({ submit: 'Failed to create task. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, taskType, parentId, projectId, onSubmit, onClose])

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose()
      setFormData(getInitialFormData(taskType))
      setErrors({})
    }
  }, [isSubmitting, onClose, taskType])

  const taskTypeConfig = getTaskTypeConfig(taskType)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Create ${taskTypeConfig.label}`}
      size="lg"
      closable={!isSubmitting}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-6">
            {/* Title */}
            <FormField
              label="Title"
              required
              error={errors.title}
            >
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${taskTypeConfig.label.toLowerCase()} title`}
                disabled={isSubmitting}
                autoFocus
              />
            </FormField>

            {/* Description */}
            <FormField
              label="Description"
              error={errors.description}
            >
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Describe the ${taskTypeConfig.label.toLowerCase()}`}
                disabled={isSubmitting}
              />
            </FormField>

            {/* Epic-specific fields */}
            {taskType === 'epic' && (
              <>
                <FormField
                  label="Business Value"
                  required
                  error={errors.businessValue}
                >
                  <textarea
                    value={formData.businessValue || ''}
                    onChange={(e) => handleInputChange('businessValue', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What business value does this epic provide?"
                    disabled={isSubmitting}
                  />
                </FormField>

                <AcceptanceCriteriaField
                  value={formData.acceptanceCriteria || []}
                  onChange={(criteria) => setFormData(prev => ({ ...prev, acceptanceCriteria: criteria }))}
                  disabled={isSubmitting}
                  error={errors.acceptanceCriteria}
                />
              </>
            )}

            {/* Story-specific fields */}
            {taskType === 'story' && (
              <>
                <FormField
                  label="User Story"
                  required
                  error={errors.userStory}
                >
                  <textarea
                    value={formData.userStory || ''}
                    onChange={(e) => handleInputChange('userStory', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="As a [user], I want [goal] so that [benefit]"
                    disabled={isSubmitting}
                  />
                </FormField>

                <AcceptanceCriteriaField
                  value={formData.acceptanceCriteria || []}
                  onChange={(criteria) => setFormData(prev => ({ ...prev, acceptanceCriteria: criteria }))}
                  disabled={isSubmitting}
                  error={errors.acceptanceCriteria}
                />
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <FormField
                label="Priority"
                required
                error={errors.priority}
              >
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </FormField>

              {/* Story Points (for Epic, Story, Task) */}
              {['epic', 'story', 'task'].includes(taskType) && (
                <FormField
                  label="Story Points"
                  error={errors.storyPoints}
                >
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.storyPoints || ''}
                    onChange={(e) => handleInputChange('storyPoints', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Estimate effort"
                    disabled={isSubmitting}
                  />
                </FormField>
              )}

              {/* Estimated Hours (for Task) */}
              {taskType === 'task' && (
                <FormField
                  label="Estimated Hours"
                  error={errors.estimatedHours}
                >
                  <input
                    type="number"
                    min="0.5"
                    max="40"
                    step="0.5"
                    value={formData.estimatedHours || ''}
                    onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Hours"
                    disabled={isSubmitting}
                  />
                </FormField>
              )}

              {/* Estimated Minutes (for Subtask) */}
              {taskType === 'subtask' && (
                <FormField
                  label="Estimated Minutes"
                  error={errors.estimatedMinutes}
                >
                  <input
                    type="number"
                    min="15"
                    max="480"
                    step="15"
                    value={formData.estimatedMinutes || ''}
                    onChange={(e) => handleInputChange('estimatedMinutes', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minutes"
                    disabled={isSubmitting}
                  />
                </FormField>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : `Create ${taskTypeConfig.label}`}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

// =============================================================================
// Supporting Components
// =============================================================================

interface FormFieldProps {
  readonly label: string
  readonly required?: boolean
  readonly error?: string
  readonly children: React.ReactNode
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  children
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

interface AcceptanceCriteriaFieldProps {
  readonly value: string[]
  readonly onChange: (criteria: string[]) => void
  readonly disabled?: boolean
  readonly error?: string
}

const AcceptanceCriteriaField: React.FC<AcceptanceCriteriaFieldProps> = ({
  value,
  onChange,
  disabled,
  error
}) => {
  const [newCriterion, setNewCriterion] = useState('')

  const addCriterion = useCallback(() => {
    if (newCriterion.trim()) {
      onChange([...value, newCriterion.trim()])
      setNewCriterion('')
    }
  }, [newCriterion, value, onChange])

  const removeCriterion = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }, [value, onChange])

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addCriterion()
    }
  }, [addCriterion])

  return (
    <FormField
      label="Acceptance Criteria"
      required
      error={error}
    >
      <div className="space-y-2">
        {value.map((criterion, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <span className="flex-1 text-sm">{criterion}</span>
            <button
              type="button"
              onClick={() => removeCriterion(index)}
              disabled={disabled}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add acceptance criterion"
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addCriterion}
            disabled={disabled || !newCriterion.trim()}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </FormField>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

function getInitialFormData(_taskType: TaskType) {
  return {
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    storyPoints: undefined,
    estimatedHours: undefined,
    estimatedMinutes: undefined,
    businessValue: '',
    userStory: '',
    acceptanceCriteria: [] as string[]
  }
}

function getTaskTypeConfig(taskType: TaskType) {
  const configs = {
    epic: { label: 'Epic', icon: '🏆' },
    story: { label: 'Story', icon: '📖' },
    task: { label: 'Task', icon: '📝' },
    subtask: { label: 'Subtask', icon: '📌' }
  }
  return configs[taskType]
}

function validateFormData(data: any, taskType: TaskType): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.title?.trim()) {
    errors.title = 'Title is required'
  }

  if (taskType === 'epic') {
    if (!data.businessValue?.trim()) {
      errors.businessValue = 'Business value is required for epics'
    }
    if (!data.acceptanceCriteria?.length) {
      errors.acceptanceCriteria = 'At least one acceptance criterion is required'
    }
  }

  if (taskType === 'story') {
    if (!data.userStory?.trim()) {
      errors.userStory = 'User story is required'
    }
    if (!data.acceptanceCriteria?.length) {
      errors.acceptanceCriteria = 'At least one acceptance criterion is required'
    }
  }

  return errors
}

function buildSubmitData(
  data: any, 
  taskType: TaskType, 
  parentId: string | undefined, 
  projectId: string
): CreateEpicInput | CreateStoryInput | CreateTaskInput | CreateSubtaskInput {
  const base = {
    title: data.title.trim(),
    description: data.description?.trim() || '',
    priority: data.priority
  }

  switch (taskType) {
    case 'epic':
      return {
        ...base,
        businessValue: data.businessValue.trim(),
        acceptanceCriteria: data.acceptanceCriteria,
        projectId
      } as CreateEpicInput

    case 'story':
      return {
        ...base,
        userStory: data.userStory.trim(),
        acceptanceCriteria: data.acceptanceCriteria,
        storyPoints: data.storyPoints || undefined,
        epicId: parentId!
      } as CreateStoryInput

    case 'task':
      return {
        ...base,
        storyPoints: data.storyPoints || undefined,
        estimatedHours: data.estimatedHours || undefined,
        storyId: parentId!
      } as CreateTaskInput

    case 'subtask':
      return {
        ...base,
        estimatedMinutes: data.estimatedMinutes || undefined,
        taskId: parentId!
      } as CreateSubtaskInput

    default:
      throw new Error(`Unknown task type: ${taskType}`)
  }
}