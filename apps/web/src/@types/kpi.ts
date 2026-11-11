export interface KpiPeriod {
  id: string
  companyId: string
  name: string
  startDate: string
  endDate: string
  graceEndDate?: string | null
  status: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface DepartmentKpiItem {
  id: string
  companyId: string
  departmentId: string
  periodId: string
  title: string
  category: string
  description?: string | null
  measurementUnit: string
  targetValue: string | number
  weight: string | number
  targetPosition?: string | null
  isActive: boolean
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface EmployeeKpiTask {
  id: string
  assessmentItemId: string
  assessmentId: string
  employeeId: string
  companyId: string
  departmentId: string
  title: string
  progressValue: string | number
  completedDate: string
  evidenceUrl?: string | null
  notes?: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  reviewedBy?: string | null
  reviewNotes?: string | null
  reviewedAt?: string | null
  createdAt?: string
  updatedAt?: string
  employeeName?: string
  employeeEmail?: string
  employeeAvatarUrl?: string | null
  employeePosition?: string
  departmentName?: string
  itemTitle?: string
  measurementUnit?: string
  targetValue?: string | number
  actualValue?: string | number
}

export interface EmployeeKpiAssessmentItem {
  id: string
  assessmentId: string
  departmentKpiItemId?: string | null
  title: string
  category: string
  description?: string | null
  measurementUnit: string
  targetValue: string | number
  actualValue: string | number
  weight: string | number
  achievementPercentage: string | number
  weightedScore: string | number
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
  tasks?: EmployeeKpiTask[]
}

export interface EmployeeKpiAssessment {
  id: string
  companyId: string
  departmentId: string
  employeeId: string
  periodId: string
  evaluatorId?: string | null
  totalWeight: string | number
  finalScore: string | number
  grade?: string | null
  status: string
  notesFromEvaluator?: string | null
  employeeFeedback?: string | null
  verifiedAt?: string | null
  employeeName?: string
  employeeEmail?: string
  employeePosition?: string
  employeeAvatarUrl?: string | null
  items?: EmployeeKpiAssessmentItem[]
}

export interface DepartmentSummary {
  id: string
  code: string
  name: string
  description?: string | null
  isMandatory: boolean
  kpiItems: DepartmentKpiItem[]
  totalWeight: number
  isBalanced: boolean
  assessments: EmployeeKpiAssessment[]
  pendingTasksCount: number
  averageScore: number
}

export interface KpiSummaryData {
  activePeriod: KpiPeriod | null
  departments: DepartmentSummary[]
  stats: {
    totalEmployees: number
    averageScore: number
    pendingTasksCount: number
  }
}

export interface MyKpiData {
  employee: {
    id: string
    name: string
    email: string
    position?: string | null
    avatarUrl?: string | null
    departmentId?: string | null
    departmentName?: string
    role?: string
  }
  period: KpiPeriod | null
  assessment: EmployeeKpiAssessment | null
  items: EmployeeKpiAssessmentItem[]
}

