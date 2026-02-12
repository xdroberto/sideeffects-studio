import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CustomLogo } from './CustomLogo'
import { usePathname } from 'next/navigation'

interface NavProps {
  className?: string
  onGalleryClick: () => void
  onAboutClick: () => void
}

export function Nav({ className, onGalleryClick, onAboutClick }: NavProps) {
  const pathname = usePathname()
  return (
    <nav className={cn("flex items-center justify-between p-4 w-full", className)}>
      <Link href="/" className="text-red-500 hover:text-red-600 transition-colors">
        <CustomLogo />
      </Link>
      <div className="flex gap-8 text-lg">
  <Link 
    href="/" 
    className={`transition-colors ${pathname === '/' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
  >
    Home
  </Link>
  <button 
    onClick={onGalleryClick}
    className={`transition-colors cursor-pointer ${pathname === '/gallery' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
  >
    Gallery
  </button>
  <button 
    onClick={onAboutClick}
    className={`transition-colors cursor-pointer ${pathname === '/about' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
  >
    About
  </button>
  <Link 
    href="/sf01" 
    className={`transition-colors ${pathname === '/sf01' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
  >
    SF01
  </Link>
</div>
    </nav>
  )
}

