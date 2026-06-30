import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/dashboard')({
  component: DashboardBypassComponent,
})

function DashboardBypassComponent() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch current active session inside the browser client
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Attach browser listener to catch login state changes natively
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    )
  }

  // 🛡️ Safe client-side fallback: If no token is cached in the browser, send them back to login
  if (!session) {
    return <Navigate to="/auth" replace />
  }

  // 🎉 THE FIX: Render the main black application theme shell and mount sub-routes dynamically
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Note: If your original layout had a shared <Sidebar /> or <Navbar />, 
        you can safely place those components right here!
      */}
      <div className="flex flex-col md:flex-row min-h-screen">
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          
          {/* 🔌 THE CORE PLUG: This handles rendering child views like profile, metrics, tables, etc. */}
          <Outlet /> 

        </main>
      </div>
    </div>
  )
}
