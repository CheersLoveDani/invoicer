import { db } from '@/db/database'
import type { UserProfile } from '@/types'

const PROFILE_ID = 'user-profile'

const defaultProfile: UserProfile = {
  id: PROFILE_ID,
  name: '',
  email: '',
  address: '',
  phone: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankSortCode: '',
  bankName: '',
  defaultCurrency: 'GBP',
}

export const profileService = {
  async get(): Promise<UserProfile> {
    const profile = await db.userProfile.get(PROFILE_ID)
    return profile ?? { ...defaultProfile }
  },

  async save(data: Partial<UserProfile>): Promise<void> {
    const existing = await db.userProfile.get(PROFILE_ID)
    if (existing) {
      await db.userProfile.update(PROFILE_ID, data)
    } else {
      await db.userProfile.add({ ...defaultProfile, ...data, id: PROFILE_ID })
    }
  },
}
