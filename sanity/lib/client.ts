import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  apiVersion,
  dataset,
  projectId,
  // 强制使用 CDN 加速访问
  useCdn: true,
  // perspective: 'published',
  // 增加重试次数以应对网络延迟
  maxRetries: 5,
})
