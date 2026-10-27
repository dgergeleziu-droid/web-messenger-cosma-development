'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Profile({ user, onClose, onOpenNewChat, onOpenSettings, onOpenCreateChat, onOpenAdmin, onOpenTheme }: any) {
  const supabase = createClient()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => { setIsDark(document.documentElement.classList.contains('dark')) }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }

  const gifts = user?.gifts_inventory || []

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="w-[320px] h-full bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-2xl flex flex-col shadow-2xl border-r border-white/
