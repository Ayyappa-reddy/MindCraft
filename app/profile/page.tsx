'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Key, Mail, Phone, Calendar, Save, Lock, Camera } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const [profileData, setProfileData] = useState({
    displayName: '',
    dob: '',
    phone: '',
    personalEmail: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    setUser(data)
    setProfileData({
      displayName: data?.display_name || data?.name || '',
      dob: data?.dob || '',
      phone: data?.phone || '',
      personalEmail: data?.personal_email || '',
    })
    setLoading(false)
  }

  const handleUpdateProfile = async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('users')
      .update({
        display_name: profileData.displayName,
        name: profileData.displayName,
        dob: profileData.dob || null,
        phone: profileData.phone || null,
        personal_email: profileData.personalEmail || null,
      })
      .eq('id', authUser?.id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Profile updated successfully')
    loadProfile()
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    const supabase = createClient()

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordData.currentPassword,
    })

    if (signInError) {
      alert('Current password is incorrect')
      return
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Password changed successfully')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <a href="/" className="text-2xl font-bold text-blue-600">MindCraft</a>
              <a href="/learn" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Learn</a>
              <a href="/exams" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Exams</a>
              <a href="/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600">Dashboard</a>
              <a href="/profile" className="text-blue-600 font-medium">Profile</a>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Profile Information</CardTitle>
                      <CardDescription>Update your personal details</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Email Field - Full Width */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Address</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      id="email" 
                      value={user?.email || ''} 
                      disabled 
                      className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    />
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Email cannot be changed</p>
                </div>

                {/* Display Name and DOB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Display Name</span>
                    </Label>
                    <Input
                      id="displayName"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      placeholder="Enter your name"
                      className="border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Date of Birth</span>
                    </Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profileData.dob}
                      onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                      className="border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Phone and Personal Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>Phone Number</span>
                    </Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+1 555 123 4567"
                      className="border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalEmail" className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Personal Email</span>
                      <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="personalEmail"
                      type="email"
                      value={profileData.personalEmail}
                      onChange={(e) => setProfileData({ ...profileData, personalEmail: e.target.value })}
                      placeholder="your.personal@gmail.com"
                      className="border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleUpdateProfile}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current" className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Current Password</span>
                  </Label>
                  <Input
                    id="current"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="border-gray-300 dark:border-gray-700 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new" className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>New Password</span>
                  </Label>
                  <Input
                    id="new"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="border-gray-300 dark:border-gray-700 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span>Confirm New Password</span>
                  </Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="border-gray-300 dark:border-gray-700 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div className="pt-4 border-t">
                  <Button 
                    onClick={handleChangePassword}
                    className="w-full md:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            <Card className="border-2 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.display_name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <h3 className="text-xl font-bold mb-1">{user?.display_name || user?.name || 'User'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user?.email}</p>
                <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Account Type</p>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold capitalize">
                    {user?.role || 'Student'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

