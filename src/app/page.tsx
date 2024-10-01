import dynamic from 'next/dynamic'
import { ThemeProvider } from "../components/theme-provider"

const AnimatedTopographicMap = dynamic(() => import('@/components/topographic-map'), { 
  ssr: false,
  loading: () => <p className="text-center p-4">Loading...</p>
})

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-7xl h-[calc(100vh-2rem)] m-4 bg-card rounded-lg overflow-hidden shadow-lg">
          <AnimatedTopographicMap />
        </div>
      </main>
    </ThemeProvider>
  )
}