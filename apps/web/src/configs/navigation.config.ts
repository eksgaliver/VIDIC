import type { IconType } from 'react-icons'
import {
  HiOutlineClock,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineSpeakerphone,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiOutlineViewGrid
} from 'react-icons/hi'
import {
  DASHBOARD_PATH,
  COMPANIES_PATH,
  DEPARTMENTS_PATH,
  EMPLOYEES_PATH,
  POSTS_PATH,
  PROFILE_PATH,
  SHIFTS_PATH
} from '@/constants/route.constant'

export interface NavigationItem {
  key: string
  title: string
  path: string
  icon: IconType
  section: 'workspace' | 'account'
  badge?: string
}

export const navigationConfig: NavigationItem[] = [
  {
    key: 'dashboard',
    title: 'Dasbor',
    path: DASHBOARD_PATH,
    icon: HiOutlineHome,
    section: 'workspace'
  },
  {
    key: 'companies',
    title: 'Perusahaan',
    path: COMPANIES_PATH,
    icon: HiOutlineOfficeBuilding,
    section: 'workspace'
  },
  {
    key: 'departments',
    title: 'Departemen',
    path: DEPARTMENTS_PATH,
    icon: HiOutlineViewGrid,
    section: 'workspace'
  },
  {
    key: 'employees',
    title: 'Karyawan',
    path: EMPLOYEES_PATH,
    icon: HiOutlineUsers,
    section: 'workspace'
  },
  {
    key: 'shifts',
    title: 'Shift',
    path: SHIFTS_PATH,
    icon: HiOutlineClock,
    section: 'workspace'
  },
  {
    key: 'posts',
    title: 'Postingan',
    path: POSTS_PATH,
    icon: HiOutlineSpeakerphone,
    section: 'workspace'
  },
  {
    key: 'profile',
    title: 'Profil',
    path: PROFILE_PATH,
    icon: HiOutlineUserCircle,
    section: 'account'
  }
]
