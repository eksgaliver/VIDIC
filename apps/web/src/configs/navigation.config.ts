import type { IconType } from 'react-icons'
import {
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineViewGrid
} from 'react-icons/hi'
import { DASHBOARD_PATH, COMPANIES_PATH, DEPARTMENTS_PATH } from '@/constants/route.constant'

export interface NavigationItem {
  key: string
  title: string
  path: string
  icon: IconType
  badge?: string
}

export const navigationConfig: NavigationItem[] = [
  {
    key: 'dashboard',
    title: 'Dasbor',
    path: DASHBOARD_PATH,
    icon: HiOutlineHome
  },
  {
    key: 'companies',
    title: 'Perusahaan',
    path: COMPANIES_PATH,
    icon: HiOutlineOfficeBuilding
  },
  {
    key: 'departments',
    title: 'Departemen',
    path: DEPARTMENTS_PATH,
    icon: HiOutlineViewGrid
  }
]
