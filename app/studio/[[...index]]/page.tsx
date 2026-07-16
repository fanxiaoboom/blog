import Studio from './Studio'

// Studio access is authorized per request by the parent layout.
export const dynamic = 'force-dynamic'

// Set the right `viewport`, `robots` and `referer` meta tags
export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <Studio />
}
