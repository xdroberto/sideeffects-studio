import { notFound } from 'next/navigation'
import { isLocalAdminEnabled } from '@/lib/local-admin.mjs'

export default function Sf01InternalLayout({ children }: { children: React.ReactNode }) {
    if (!isLocalAdminEnabled()) {
        notFound()
    }

    return children
}
