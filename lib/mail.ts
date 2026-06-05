import { Resend } from 'resend'

import { env } from '~/env.mjs'
import { isEmailEnabled } from '~/lib/services'

export const resend = isEmailEnabled ? new Resend(env.RESEND_API_KEY) : null
