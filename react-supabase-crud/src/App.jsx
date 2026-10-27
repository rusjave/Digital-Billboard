import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title)

const PRICING_PACKAGES = [
  { id: 'basic', name: 'Basic', price: 10000, dailyPlays: 64 },
  { id: 'package-1', name: 'Package 1', price: 15000, dailyPlays: 128 },
  { id: 'package-2', name: 'Package 2', price: 20000, dailyPlays: 192 },
  { id: 'package-3', name: 'Package 3', price: 75000, dailyPlays: 384 },
  { id: 'package-4', name: 'Package 4', price: 100000, dailyPlays: 960 },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState('user')
  const [viewMode, setViewMode] = useState('user') // 'user' or 'admin'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  // Auth form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // Modal States
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)

  // Admin User CRUD state in Directory Modal
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminFirstName, setNewAdminFirstName] = useState('')
  const [newAdminLastName, setNewAdminLastName] = useState('')
  const [newAdminMiddleName, setNewAdminMiddleName] = useState('')
  const [newAdminContact, setNewAdminContact] = useState('')
  const [newAdminAddress, setNewAdminAddress] = useState('')
  const [newAdminRole, setNewAdminRole] = useState('user')

  const [editingUserId, setEditingUserId] = useState(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editMiddleName, setEditMiddleName] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editRole, setEditRole] = useState('user')

  // User Task Form state
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [planTab, setPlanTab] = useState('custom')
  const [customPlanSettings, setCustomPlanSettings] = useState({ rate: 0, rateUnit: 'second', playLength: 0 })
  const [customPlanSettingsForm, setCustomPlanSettingsForm] = useState({ rate: '', rateUnit: 'second', playLength: '' })
  const [customRunsPerSlot, setCustomRunsPerSlot] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [customTimeSlots, setCustomTimeSlots] = useState(['09:00'])
  const [videoFile, setVideoFile] = useState(null)
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(null)
  const [paymentOption, setPaymentOption] = useState('paymongo')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [hasPaid, setHasPaid] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  // Admin state & Pagination
  const [adminUsers, setAdminUsers] = useState([])
  const [allTodos, setAllTodos] = useState([])
  const [adminSearchTerm, setAdminSearchTerm] = useState('')
  const [adminEditingId, setAdminEditingId] = useState(null)
  const [adminEditText, setAdminEditText] = useState('')
  const [salesFilter, setSalesFilter] = useState('month') // 'year', 'month', 'week'
  const [adminSection, setAdminSection] = useState('overview')
  const [pricingPackages, setPricingPackages] = useState(PRICING_PACKAGES)
  const [packageForm, setPackageForm] = useState({ id: null, name: '', price: '', dailyPlays: '' })
  const [savingPackage, setSavingPackage] = useState(false)
  const [adminCalendarMonth, setAdminCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null)

  // Pagination State for Global Tasks
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // 1. Session & Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchUserProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUserRole('user')
        setViewMode('user')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (data) setUserRole(data.role)
    } catch (err) {
      console.log('Profile fetch error:', err)
    }
    setLoading(false)
  }

  // Fetch data on session or role change
  useEffect(() => {
    if (session) {
      fetchTodos()
      fetchPricingPackages()
      fetchCustomPlanSettings()
      if (userRole === 'admin') fetchAdminData()
    }
  }, [session, userRole])

  // Pricing selection handler. The package sets the payment total and play capacity.
  const handlePackageChange = (selectedPackage) => {
    setDuration(`${selectedPackage.name} — ${selectedPackage.dailyPlays} 10-sec plays/day`)
    setPrice(selectedPackage.price.toString())
  }

  // The Custom and Package tabs are mutually exclusive. Changing tabs clears
  // the previous plan and payment confirmation before another plan is chosen.
  const handlePlanTabChange = (nextTab) => {
    setPlanTab(nextTab)
    setDuration('')
    setPrice('')
    setHasPaid(false)
  }

  const customPlanDays = customStartDate && customEndDate && customEndDate >= customStartDate
    ? Math.floor((new Date(`${customEndDate}T00:00:00`) - new Date(`${customStartDate}T00:00:00`)) / 86400000) + 1
    : 0
  const videoDurationInRateUnit = customPlanSettings.rateUnit === 'minute'
    ? Number(videoDurationSeconds || 0) / 60
    : Number(videoDurationSeconds || 0)
  const customPlanTotal = Number(customPlanSettings.rate) * videoDurationInRateUnit * Number(customRunsPerSlot) * customTimeSlots.length * customPlanDays
  const customPlanSummary = `Custom plan: ₱${customPlanSettings.rate || 0}/${customPlanSettings.rateUnit}; ${Number(videoDurationSeconds || 0).toFixed(2)}-second uploaded video; ${customRunsPerSlot || 0} run(s) at ${customTimeSlots.join(', ') || 'no times'} daily; ${customPlanDays} day(s) (${customStartDate || 'start'} to ${customEndDate || 'end'})`

  const updateCustomTimeSlot = (index, value) => {
    setCustomTimeSlots(customTimeSlots.map((time, timeIndex) => timeIndex === index ? value : time))
  }

  const handleVideoFileChange = (file) => {
    setVideoFile(file || null)
    setVideoDurationSeconds(null)
    setHasPaid(false)
    if (!file) return

    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setVideoDurationSeconds(video.duration)
      } else {
        alert('We could not determine the video duration. Please select another video file.')
      }
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      alert('We could not read this video file. Please select a supported video.')
    }
    video.src = objectUrl
  }

  useEffect(() => {
    if (planTab === 'custom') {
      setPrice(customPlanTotal > 0 ? customPlanTotal.toFixed(2) : '')
    }
  }, [planTab, customPlanSettings, videoDurationSeconds, customRunsPerSlot, customStartDate, customEndDate, customTimeSlots])

  // --- AUTH ACTIONS ---
  const handleAuth = async (e) => {
    e.preventDefault()
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            contact_number: contactNumber,
            address: address
          }
        }
      })
      if (error) alert(error.message)
      else alert('Account created successfully!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // --- USER CRUD ACTIONS ---
  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*, profiles(email, role, first_name, last_name)')
      .order('inserted_at', { ascending: false })

    if (error) console.error(error)
    else setTodos(data || [])
  }

  const addTodo = async (e) => {
    e.preventDefault()
    
    // Strict Field Validations
    if (!newTodo.trim()) {
      alert('Please enter a task title.')
      return
    }

    if (!scheduledAt) {
      alert('Please select a scheduled date and time.')
      return
    }

    if (!price || parseFloat(price) <= 0) {
      alert('Please enter or select a valid price package.')
      return
    }

    if (planTab === 'package' && !duration) {
      alert('Please select a pricing package.')
      return
    }

    if (planTab === 'custom' && (!customPlanSettings.rate || !videoDurationSeconds || !customRunsPerSlot || !customStartDate || !customEndDate || customPlanDays <= 0 || customTimeSlots.some(time => !time))) {
      alert('Wait for the uploaded video duration, then complete the custom plan runs, date range, and time slots.')
      return
    }

    if (!videoFile) {
      alert('Please upload a video file attachment.')
      return
    }

    if (!referenceNumber.trim()) {
      alert('Please enter your payment reference / transaction number.')
      return
    }

    if (!hasPaid) {
      alert('Please confirm that you have completed the required payment.')
      return
    }

    setUploading(true)
    let uploadedVideoUrl = null

    try {
      // 1. Upload Video File
      const fileExt = videoFile.name.split('.').pop()
      const fileName = `${session.user.id}_${Date.now()}.${fileExt}`
      const filePath = `tasks/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('task-videos')
        .upload(filePath, videoFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('task-videos')
        .getPublicUrl(filePath)

      uploadedVideoUrl = publicUrlData.publicUrl

      // 2. Insert Task to Supabase
      const { data, error } = await supabase
        .from('todos')
        .insert([{ 
          title: newTodo, 
          user_id: session.user.id,
          scheduled_at: scheduledAt,
          price: parseFloat(price),
          duration: planTab === 'custom' ? customPlanSummary : duration,
          video_url: uploadedVideoUrl,
          payment_option: paymentOption,
          reference_number: referenceNumber,
          payment_verified: true
        }])
        .select('*, profiles(email, role, first_name, last_name)')

      if (error) throw error

      setTodos([data[0], ...todos])
      
      // Reset state and close modal
      setNewTodo('')
      setScheduledAt('')
      setPrice('')
      setDuration('')
      setPlanTab('custom')
      setCustomRunsPerSlot('')
      setCustomStartDate('')
      setCustomEndDate('')
      setCustomTimeSlots(['09:00'])
      setVideoFile(null)
      setVideoDurationSeconds(null)
      setPaymentOption('paymongo')
      setReferenceNumber('')
      setHasPaid(false)
      setShowTaskModal(false)

    } catch (err) {
      alert(err.message || 'Error creating task')
    } finally {
      setUploading(false)
    }
  }

  const toggleComplete = async (todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.is_completed })
      .eq('id', todo.id)

    if (error) alert(error.message)
    else {
      setTodos(todos.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t))
    }
  }

  const saveEdit = async (id) => {
    const { error } = await supabase
      .from('todos')
      .update({ title: editText })
      .eq('id', id)

    if (error) alert(error.message)
    else {
      setTodos(todos.map(t => t.id === id ? { ...t, title: editText } : t))
      setEditingId(null)
      setEditText('')
    }
  }

  const deleteTodo = async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) alert(error.message)
    else setTodos(todos.filter(t => t.id !== id))
  }

  // --- ADMIN DATA & CRUD ACTIONS ---
  const fetchAdminData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*')
    const { data: todos, error } = await supabase
      .from('todos')
      .select('*, profiles(email, role, first_name, last_name)')
      .order('inserted_at', { ascending: false })

    if (profiles) setAdminUsers(profiles)
    if (error) console.error('Error fetching admin data:', error)
    if (todos) setAllTodos(todos)
    fetchPricingPackages()
    fetchCustomPlanSettings()
  }

  const fetchPricingPackages = async () => {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .order('sort_order', { ascending: true })

    // The built-in plans remain visible until the pricing_packages migration is applied.
    if (error) {
      console.warn('Unable to load managed pricing packages:', error.message)
      return
    }

    setPricingPackages((data || []).map(item => ({
      ...item,
      dailyPlays: Number(item.daily_plays),
      price: Number(item.price),
    })))
  }

  const fetchCustomPlanSettings = async () => {
    const { data, error } = await supabase
      .from('custom_plan_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle()

    if (error || !data) {
      if (error) console.warn('Unable to load custom plan settings:', error.message)
      return
    }

    const settings = { rate: Number(data.rate), rateUnit: data.rate_unit, playLength: Number(data.play_length) }
    setCustomPlanSettings(settings)
    setCustomPlanSettingsForm(settings)
  }

  const saveCustomPlanSettings = async (e) => {
    e.preventDefault()
    const rate = Number(customPlanSettingsForm.rate)
    const playLength = Number(customPlanSettingsForm.playLength)
    if (rate <= 0 || playLength <= 0) {
      alert('Enter a valid rate and play length.')
      return
    }

    const { error } = await supabase
      .from('custom_plan_settings')
      .upsert({ id: true, rate, rate_unit: customPlanSettingsForm.rateUnit, play_length: playLength })

    if (error) {
      alert(`Unable to save custom plan settings: ${error.message}`)
      return
    }

    const settings = { rate, rateUnit: customPlanSettingsForm.rateUnit, playLength }
    setCustomPlanSettings(settings)
    setCustomPlanSettingsForm(settings)
    alert('Custom plan settings updated.')
  }

  const savePricingPackage = async (e) => {
    e.preventDefault()
    const name = packageForm.name.trim()
    const price = Number(packageForm.price)
    const dailyPlays = Number(packageForm.dailyPlays)
    if (!name || price <= 0 || dailyPlays <= 0) {
      alert('Enter a package name, a valid price, and daily plays.')
      return
    }

    setSavingPackage(true)
    const payload = { name, price, daily_plays: dailyPlays }
    const query = packageForm.id
      ? supabase.from('pricing_packages').update(payload).eq('id', packageForm.id)
      : supabase.from('pricing_packages').insert([{ ...payload, sort_order: pricingPackages.length }])
    const { error } = await query
    setSavingPackage(false)

    if (error) {
      alert(`Unable to save package: ${error.message}`)
      return
    }

    setPackageForm({ id: null, name: '', price: '', dailyPlays: '' })
    fetchPricingPackages()
  }

  const editPricingPackage = (pricingPackage) => {
    setPackageForm({
      id: pricingPackage.id,
      name: pricingPackage.name,
      price: pricingPackage.price,
      dailyPlays: pricingPackage.dailyPlays,
    })
  }

  const deletePricingPackage = async (pricingPackage) => {
    if (!window.confirm(`Delete the ${pricingPackage.name} package?`)) return
    const { error } = await supabase.from('pricing_packages').delete().eq('id', pricingPackage.id)
    if (error) {
      alert(`Unable to delete package: ${error.message}`)
      return
    }
    if (packageForm.id === pricingPackage.id) setPackageForm({ id: null, name: '', price: '', dailyPlays: '' })
    fetchPricingPackages()
  }

  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) alert(error.message)
    else setAdminUsers(adminUsers.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  // --- USER DIRECTORY CRUD ACTIONS ---
  const handleAdminAddUser = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
        options: {
          data: {
            first_name: newAdminFirstName,
            last_name: newAdminLastName,
            middle_name: newAdminMiddleName,
            contact_number: newAdminContact,
            address: newAdminAddress,
            role: newAdminRole
          }
        }
      })

      if (error) throw error

      alert('User added successfully!')
      setShowAddUserForm(false)
      setNewAdminEmail('')
      setNewAdminPassword('')
      setNewAdminFirstName('')
      setNewAdminLastName('')
      setNewAdminMiddleName('')
      setNewAdminContact('')
      setNewAdminAddress('')
      setNewAdminRole('user')
      fetchAdminData()

    } catch (err) {
      alert(err.message || 'Error adding user')
    }
  }

  const startEditUser = (user) => {
    setEditingUserId(user.id)
    setEditFirstName(user.first_name || '')
    setEditLastName(user.last_name || '')
    setEditMiddleName(user.middle_name || '')
    setEditContact(user.contact_number || '')
    setEditAddress(user.address || '')
    setEditRole(user.role || 'user')
  }

  const saveEditUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          middle_name: editMiddleName,
          contact_number: editContact,
          address: editAddress,
          role: editRole
        })
        .eq('id', userId)

      if (error) throw error

      setAdminUsers(adminUsers.map(u => u.id === userId ? {
        ...u,
        first_name: editFirstName,
        last_name: editLastName,
        middle_name: editMiddleName,
        contact_number: editContact,
        address: editAddress,
        role: editRole
      } : u))

      setEditingUserId(null)
      alert('User updated successfully!')
    } catch (err) {
      alert(err.message || 'Error updating user profile')
    }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user profile?')) return

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error

      setAdminUsers(adminUsers.filter(u => u.id !== userId))
      alert('User removed successfully!')
    } catch (err) {
      alert(err.message || 'Error deleting user profile')
    }
  }

  const adminToggleComplete = async (todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !todo.is_completed })
      .eq('id', todo.id)

    if (error) alert(error.message)
    else {
      setAllTodos(allTodos.map(t => t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t))
    }
  }

  const adminSaveEdit = async (id) => {
    const { error } = await supabase
      .from('todos')
      .update({ title: adminEditText })
      .eq('id', id)

    if (error) alert(error.message)
    else {
      setAllTodos(allTodos.map(t => t.id === id ? { ...t, title: adminEditText } : t))
      setAdminEditingId(null)
      setAdminEditText('')
    }
  }

  const adminDeleteTodo = async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) alert(error.message)
    else setAllTodos(allTodos.filter(t => t.id !== id))
  }

  // --- SEARCH AND PAGINATION CALCULATIONS ---
  const filteredAdminTodos = allTodos.filter(t => 
    t.title.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    (t.profiles?.email && t.profiles.email.toLowerCase().includes(adminSearchTerm.toLowerCase()))
  )

  const totalPages = Math.ceil(filteredAdminTodos.length / itemsPerPage) || 1
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentPaginatedTodos = filteredAdminTodos.slice(indexOfFirstItem, indexOfLastItem)

  const handleSearchChange = (e) => {
    setAdminSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to page 1 on new search
  }

  const calendarMonthLabel = adminCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  const calendarGridStart = new Date(adminCalendarMonth.getFullYear(), adminCalendarMonth.getMonth(), 1)
  calendarGridStart.setDate(calendarGridStart.getDate() - calendarGridStart.getDay())
  const adminCalendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarGridStart)
    date.setDate(calendarGridStart.getDate() + index)
    return date
  })

  const getBookingsForCalendarDay = (date) => allTodos.filter(todo => {
    if (!todo.scheduled_at) return false
    const bookingDate = new Date(todo.scheduled_at)
    return bookingDate.getFullYear() === date.getFullYear()
      && bookingDate.getMonth() === date.getMonth()
      && bookingDate.getDate() === date.getDate()
  })
  const selectedCalendarBookings = selectedCalendarDate ? getBookingsForCalendarDay(selectedCalendarDate) : []

  // --- SALES GRAPH DATA AGGREGATOR ---
  const getSalesChartData = () => {
    const salesMap = {}

    allTodos.forEach(t => {
      if (!t.inserted_at) return
      const date = new Date(t.inserted_at)
      let key = ''

      if (salesFilter === 'year') {
        key = date.getFullYear().toString()
      } else if (salesFilter === 'month') {
        key = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      } else if (salesFilter === 'week') {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
        key = `Week ${weekNum}, ${date.getFullYear()}`
      }

      const taskPrice = Number(t.price || 0)
      salesMap[key] = (salesMap[key] || 0) + taskPrice
    })

    const labels = Object.keys(salesMap).sort()
    const dataValues = labels.map(label => salesMap[label])

    return {
      labels,
      datasets: [
        {
          label: `Total Sales (₱)`,
          data: dataValues,
          backgroundColor: [
            '#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#20c997', '#fd7e14'
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  if (loading) {
    return (
      <div className="container d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column min-vh-100 app-shell">
      {/* TOP NAVBAR HEADER */}
      <nav className="navbar app-topbar px-3 sticky-top">
        <div className="d-flex align-items-center gap-2 gap-md-3">
          {session && (
            <button 
              className="btn btn-outline-light btn-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰ Menu
            </button>
          )}
          <span className="navbar-brand fw-bold mb-0 h1 fs-5 fs-md-4 app-brand"><span className="brand-mark">◆</span> KKK GROUP <small>Digital Billboard</small></span>
        </div>

        {session && (
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <span className="text-muted small d-none d-md-inline">{session.user.email}</span>
            <span className={`badge ${userRole === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
              {userRole.toUpperCase()}
            </span>
            <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
              Logout
            </button>
          </div>
        )}
      </nav>

      {/* BODY LAYOUT WITH SIDEBAR */}
      <div className="d-flex flex-grow-1 position-relative">
        {session && sidebarOpen && (
          <aside 
            className="app-sidebar text-white p-3 d-flex flex-column shadow" 
            style={{ 
              width: '260px', 
              minWidth: '260px', 
              position: window.innerWidth < 768 ? 'absolute' : 'relative',
              zIndex: 1000,
              height: window.innerWidth < 768 ? '100%' : 'auto'
            }}
          >
            <h6 className="text-uppercase text-white-50 small fw-bold mb-3">Navigation</h6>
            <ul className="nav nav-pills flex-column mb-auto gap-1">
              <li className="nav-item">
                <button 
                  className={`nav-link text-start w-100 ${viewMode === 'user' ? 'active bg-primary' : 'text-white'}`}
                  onClick={() => { setViewMode('user'); if(window.innerWidth < 768) setSidebarOpen(false); }}
                >
                  📋 Tasks List
                </button>
              </li>
              {userRole === 'admin' && (
                <>
                  <li className="nav-item">
                    <button 
                      className={`nav-link text-start w-100 ${viewMode === 'admin' ? 'active bg-danger' : 'text-white'}`}
                      onClick={() => { setViewMode('admin'); setAdminSection('overview'); if(window.innerWidth < 768) setSidebarOpen(false); }}
                    >
                      🛡️ Admin Control Panel
                    </button>
                  </li>
                  <li className="nav-item ms-3 mt-1">
                    <div className="text-uppercase text-white-50 small fw-bold px-2 mb-1">Admin pages</div>
                    {[
                      ['overview', 'Overview'],
                      ['calendar', '📅 Bookings Calendar'],
                      ['packages', '📦 Package Management'],
                      ['tasks', '🌐 Global Tasks'],
                      ['users', `👤 Registered Users (${adminUsers.length})`],
                    ].map(([section, label]) => (
                      <button
                        type="button"
                        key={section}
                        className={`nav-link text-start w-100 py-1 small ${viewMode === 'admin' && adminSection === section ? 'active bg-danger' : 'text-white'}`}
                        onClick={() => { setViewMode('admin'); setAdminSection(section); if(window.innerWidth < 768) setSidebarOpen(false); }}
                      >
                        {label}
                      </button>
                    ))}
                  </li>
                </>
              )}
            </ul>
            <hr className="text-secondary" />
            <div className="text-white-50 small">
              <div>Signed in as:</div>
              <div className="text-truncate fw-bold text-white">{session.user.email}</div>
            </div>
          </aside>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="container-fluid p-3 p-md-4 flex-grow-1 overflow-hidden app-main">
          {!session ? (
            /* AUTH CARD */
            <div className="row justify-content-center">
              <div className="col-12 col-sm-10 col-md-8 col-lg-6">
                <div className="card shadow border-0 my-4">
                  <div className="card-body p-3 p-md-4">
                    <h3 className="card-title text-center mb-4 fw-bold text-dark">
                      {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h3>
                    <form onSubmit={handleAuth}>
                      {isSignUp && (
                        <>
                          <div className="row">
                            <div className="col-12 col-md-4 mb-3">
                              <label className="form-label">First Name</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                              />
                            </div>
                            <div className="col-12 col-md-4 mb-3">
                              <label className="form-label">Middle Name</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="M."
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                              />
                            </div>
                            <div className="col-12 col-md-4 mb-3">
                              <label className="form-label">Last Name</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Contact Number</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="+1234567890"
                              value={contactNumber}
                              onChange={(e) => setContactNumber(e.target.value)}
                              required
                            />
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Address</label>
                            <textarea
                              className="form-control"
                              rows="2"
                              placeholder="123 Street Name, City, Country"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              required
                            ></textarea>
                          </div>
                        </>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Email address</label>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-success w-100 py-2 mb-3 fw-semibold">
                        {isSignUp ? 'Sign Up' : 'Login'}
                      </button>
                    </form>
                    <div className="text-center">
                      <button 
                        className="btn btn-link text-decoration-none p-0 small"
                        onClick={() => setIsSignUp(!isSignUp)}
                      >
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'admin' && userRole === 'admin' ? (
            /* ADMIN DASHBOARD */
            <div className="d-flex flex-column gap-4">
              <div className="card shadow border-0 p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                  <h2 className="text-danger m-0 fs-4 fs-md-3">🛡️ Admin Dashboard & Control Panel</h2>
                  <div className="d-flex gap-2 flex-wrap">
                    <button 
                      className="btn btn-sm btn-dark fw-bold"
                      onClick={() => setAdminSection('users')}
                    >
                      📋 View Registered Users Directory ({adminUsers.length})
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={fetchAdminData}>
                      🔄 Refresh Data
                    </button>
                  </div>
                </div>

                {/* SALES GRAPH SECTION WITH FILTER */}
                {adminSection === 'overview' && (
                  <>
                <div className="row row-cols-2 row-cols-lg-4 g-3 mb-4">
                  <div className="col"><div className="card h-100 p-3"><small className="text-muted">Total Advertisers</small><div className="fs-3 fw-bold text-primary">{adminUsers.length}</div><small className="text-success">Registered users</small></div></div>
                  <div className="col"><div className="card h-100 p-3"><small className="text-muted">Active Bookings</small><div className="fs-3 fw-bold text-primary">{allTodos.filter(todo => !todo.is_completed).length}</div><small className="text-success">Awaiting completion</small></div></div>
                  <div className="col"><div className="card h-100 p-3"><small className="text-muted">Total Revenue</small><div className="fs-3 fw-bold text-primary">₱{allTodos.reduce((total, todo) => total + Number(todo.price || 0), 0).toLocaleString('en-PH')}</div><small className="text-success">All recorded tasks</small></div></div>
                  <div className="col"><div className="card h-100 p-3"><small className="text-muted">Packages</small><div className="fs-3 fw-bold text-primary">{pricingPackages.length}</div><small className="text-success">Available plans</small></div></div>
                </div>
                <div className="card bg-light border-0 p-3 mb-4">
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-3 gap-2">
                    <h4 className="m-0 fs-5">📊 Total Sales Analytics</h4>
                    <div className="btn-group" role="group" aria-label="Sales Filter">
                      <button 
                        type="button" 
                        className={`btn btn-sm ${salesFilter === 'year' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setSalesFilter('year')}
                      >
                        Yearly
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${salesFilter === 'month' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setSalesFilter('month')}
                      >
                        Monthly
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${salesFilter === 'week' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        onClick={() => setSalesFilter('week')}
                      >
                        Weekly
                      </button>
                    </div>
                  </div>

                  <div className="row justify-content-center">
                    <div className="col-12 col-md-6 col-lg-5" style={{ maxHeight: '350px' }}>
                      <Doughnut 
                        data={getSalesChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'bottom' }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
                  </>
                )}
                
                {/* ALL BOOKINGS CALENDAR */}
                {adminSection === 'calendar' && (
                  <>
                <div className="card border-info mb-4">
                  <div className="card-header bg-info-subtle d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                    <h4 className="m-0 fs-5">📅 All Bookings Calendar</h4>
                    <div className="btn-group" aria-label="Calendar month navigation">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdminCalendarMonth(new Date(adminCalendarMonth.getFullYear(), adminCalendarMonth.getMonth() - 1, 1))}>‹ Previous</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
                        const today = new Date()
                        setAdminCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                      }}>Today</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setAdminCalendarMonth(new Date(adminCalendarMonth.getFullYear(), adminCalendarMonth.getMonth() + 1, 1))}>Next ›</button>
                    </div>
                  </div>
                  <div className="card-body p-2 p-md-3">
                    <h5 className="text-center fw-bold fs-6 mb-3">{calendarMonthLabel}</h5>
                    <div className="d-grid border rounded overflow-hidden" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div className="bg-light border-bottom p-2 text-center fw-bold small" key={day}>{day}</div>
                      ))}
                      {adminCalendarDays.map((date) => {
                        const bookings = getBookingsForCalendarDay(date)
                        const isCurrentMonth = date.getMonth() === adminCalendarMonth.getMonth()
                        const isToday = date.toDateString() === new Date().toDateString()
                        const isSelected = selectedCalendarDate?.toDateString() === date.toDateString()

                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedCalendarDate(date)}
                            className={`border-end border-bottom p-1 p-md-2 text-start border-0 ${isCurrentMonth ? 'bg-white' : 'bg-light text-muted'} ${isSelected ? 'shadow-inset border border-primary' : ''}`}
                            style={{ minHeight: '130px' }}
                            key={date.toISOString()}
                            aria-label={`View bookings for ${date.toLocaleDateString()}`}
                          >
                            <div className={`small fw-bold mb-1 ${isToday ? 'text-primary' : ''}`}>{date.getDate()}</div>
                            <div className="d-flex flex-column gap-1">
                              {bookings.slice(0, 3).map(booking => (
                                <div className="bg-primary-subtle border border-primary-subtle rounded px-1 py-1 small text-truncate" title={`${booking.title} — ${booking.profiles?.email || 'Unknown user'}`} key={booking.id}>
                                  <span className="fw-bold">{new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                                  <span className="d-none d-md-inline">{booking.title}</span>
                                </div>
                              ))}
                              {bookings.length > 3 && <small className="text-primary fw-semibold">+{bookings.length - 3} more</small>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <small className="d-block text-muted mt-2">Click a calendar date to open its booking schedule.</small>
                  </div>
                </div>

                {selectedCalendarDate && (
                  <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby="bookingScheduleTitle" style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }} onMouseDown={() => setSelectedCalendarDate(null)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onMouseDown={(e) => e.stopPropagation()}>
                      <div className="modal-content">
                        <div className="modal-header bg-info-subtle">
                          <div>
                            <h5 className="modal-title fw-bold" id="bookingScheduleTitle">📅 Booking Schedule</h5>
                            <small className="text-muted">{selectedCalendarDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</small>
                          </div>
                          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedCalendarDate(null)}></button>
                        </div>
                        <div className="modal-body">
                          {selectedCalendarBookings.length ? (
                            <div className="d-flex flex-column gap-3">
                              {selectedCalendarBookings.map(booking => (
                                <div className="border rounded p-3" key={booking.id}>
                                  <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-2">
                                    <h6 className="fw-bold mb-0">{booking.title}</h6>
                                    <span className="badge bg-primary align-self-start">{new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="row small g-2">
                                    <div className="col-12 col-md-6"><strong>Customer:</strong> {booking.profiles?.email || 'Unknown user'}</div>
                                    <div className="col-12 col-md-6"><strong>Price:</strong> ₱{Number(booking.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                                    <div className="col-12"><strong>Plan:</strong> {booking.duration || 'Not specified'}</div>
                                    {booking.video_url && <div className="col-12"><a href={booking.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary mt-1">▶ Watch Video</a></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-muted mb-0">No bookings scheduled for this date.</p>}
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={() => setSelectedCalendarDate(null)}>Close</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* PRICING PACKAGE MANAGEMENT */}
                {adminSection === 'packages' && (
                <div className="card border-primary mb-4">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h4 className="m-0 fs-5">📦 Package Management</h4>
                    <span className="badge bg-light text-primary">{pricingPackages.length} package{pricingPackages.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="card-body">
                    <p className="small text-muted">Manage the package names, prices, and daily 10-second play capacity shown to users in the Package Plan tab.</p>
                    <form onSubmit={saveCustomPlanSettings} className="border rounded p-3 mb-4 bg-light">
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                        <h5 className="fs-6 fw-bold mb-0">Customize Plan Defaults</h5>
                        <small className="text-muted">These values are shown to users and cannot be edited from the Create Task form.</small>
                      </div>
                      <div className="row g-2 align-items-end">
                        <div className="col-12 col-md-4">
                          <label className="form-label small fw-semibold">Rate (₱) per</label>
                          <div className="input-group">
                            <span className="input-group-text">₱</span>
                            <input type="number" min="0.01" step="0.01" className="form-control" value={customPlanSettingsForm.rate} onChange={(e) => setCustomPlanSettingsForm({ ...customPlanSettingsForm, rate: e.target.value })} required />
                            <select className="form-select" value={customPlanSettingsForm.rateUnit} onChange={(e) => setCustomPlanSettingsForm({ ...customPlanSettingsForm, rateUnit: e.target.value })}>
                              <option value="second">Second</option>
                              <option value="minute">Minute</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                            <label className="form-label small fw-semibold">Reference play length ({customPlanSettingsForm.rateUnit}s)</label>
                          <input type="number" min="0.01" step="0.01" className="form-control" value={customPlanSettingsForm.playLength} onChange={(e) => setCustomPlanSettingsForm({ ...customPlanSettingsForm, playLength: e.target.value })} required />
                        </div>
                        <div className="col-12 col-md-4">
                          <button type="submit" className="btn btn-primary w-100">Save Custom Defaults</button>
                        </div>
                      </div>
                    </form>
                    <div className="row g-4">
                      <div className="col-12 col-lg-5">
                        <form onSubmit={savePricingPackage} className="border rounded p-3 bg-light">
                          <h5 className="fs-6 fw-bold mb-3">{packageForm.id ? 'Edit Package' : 'Add Package'}</h5>
                          <div className="mb-2">
                            <label className="form-label small fw-semibold">Package name</label>
                            <input className="form-control" value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} placeholder="e.g. Premium" required />
                          </div>
                          <div className="row g-2">
                            <div className="col-6">
                              <label className="form-label small fw-semibold">Monthly price (₱)</label>
                              <input type="number" min="0.01" step="0.01" className="form-control" value={packageForm.price} onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })} required />
                            </div>
                            <div className="col-6">
                              <label className="form-label small fw-semibold">10-sec plays/day</label>
                              <input type="number" min="1" step="1" className="form-control" value={packageForm.dailyPlays} onChange={(e) => setPackageForm({ ...packageForm, dailyPlays: e.target.value })} required />
                            </div>
                          </div>
                          <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-primary" type="submit" disabled={savingPackage}>{savingPackage ? 'Saving…' : packageForm.id ? 'Save Package' : 'Add Package'}</button>
                            {packageForm.id && <button className="btn btn-outline-secondary" type="button" onClick={() => setPackageForm({ id: null, name: '', price: '', dailyPlays: '' })}>Cancel</button>}
                          </div>
                        </form>
                      </div>
                      <div className="col-12 col-lg-7">
                        <div className="table-responsive">
                          <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-light"><tr><th>Package</th><th>Monthly price</th><th>Plays/day</th><th className="text-end">Actions</th></tr></thead>
                            <tbody>
                              {pricingPackages.map((pricingPackage) => (
                                <tr key={pricingPackage.id}>
                                  <td className="fw-semibold">{pricingPackage.name}</td>
                                  <td className="text-success fw-bold">₱{Number(pricingPackage.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                  <td>{Number(pricingPackage.dailyPlays).toLocaleString('en-PH')}</td>
                                  <td className="text-end text-nowrap">
                                    <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => editPricingPackage(pricingPackage)}>Edit</button>
                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deletePricingPackage(pricingPackage)}>Delete</button>
                                  </td>
                                </tr>
                              ))}
                              {pricingPackages.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-3">No packages yet. Add your first package.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* USER PROFILES & TODO CARDS SECTION */}
                {adminSection === 'overview' && (
                  <>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-3 gap-2">
                  <h4 className="m-0 fs-5">👤 User Profiles & Task Overview</h4>
                  <button 
                    className="btn btn-sm btn-outline-primary fw-semibold"
                    onClick={() => setAdminSection('users')}
                  >
                    🔍 Open Full Directory Table
                  </button>
                </div>

                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                  {adminUsers.map(u => {
                    const userTasks = allTodos.filter(t => t.user_id === u.id)
                    const completedCount = userTasks.filter(t => t.is_completed).length
                    const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || 'N/A'

                    return (
                      <div className="col" key={u.id}>
                        <div className="card h-100 shadow-sm border-start border-4 border-primary">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="card-title fw-bold m-0 text-truncate" style={{ maxWidth: '160px' }}>
                                  {fullName}
                                </h6>
                                <small className="text-muted d-block text-truncate" style={{ maxWidth: '160px' }}>
                                  {u.email}
                                </small>
                                <span className={`badge mt-1 ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>
                                  {u.role.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-end">
                                <span className="badge bg-info text-dark">
                                  {userTasks.length} Tasks
                                </span>
                              </div>
                            </div>
                            
                            <div className="small text-muted mb-2">
                              <div><strong>Phone:</strong> {u.contact_number || 'N/A'}</div>
                              <div className="text-truncate"><strong>Address:</strong> {u.address || 'N/A'}</div>
                            </div>

                            <div className="progress mb-2" style={{ height: '6px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${userTasks.length ? (completedCount / userTasks.length) * 100 : 0}%` }}
                              ></div>
                            </div>
                            
                            <small className="text-muted d-block">
                              Completed: {completedCount} / {userTasks.length} tasks
                            </small>
                          </div>
                          <div className="card-footer bg-transparent border-0 pt-0 text-end">
                            {u.id !== session.user.id && (
                              <button 
                                className="btn btn-xs btn-outline-dark" 
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => toggleUserRole(u.id, u.role)}
                              >
                                Toggle Role
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                  </>
                )}

                {adminSection === 'users' && (
                  <div className="card border-primary">
                    <div className="card-header bg-primary text-white d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                      <div>
                        <h4 className="m-0 fs-5 text-white">👤 Registered Users Directory</h4>
                        <small className="text-white-50">Manage advertisers, clients, and administrator accounts</small>
                      </div>
                      <button type="button" className="btn btn-light btn-sm fw-semibold" onClick={() => setShowUsersModal(true)}>Manage Users</button>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr><th>User</th><th>Email</th><th>Contact</th><th>Role</th><th className="text-center">Bookings</th><th className="text-end">Actions</th></tr>
                          </thead>
                          <tbody>
                            {adminUsers.map(user => {
                              const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') || 'N/A'
                              const bookingCount = allTodos.filter(todo => todo.user_id === user.id).length
                              return (
                                <tr key={user.id}>
                                  <td><div className="fw-bold">{fullName}</div><small className="text-muted">{user.address || 'No address provided'}</small></td>
                                  <td>{user.email}</td>
                                  <td>{user.contact_number || '—'}</td>
                                  <td><span className={`badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>{user.role}</span></td>
                                  <td className="text-center"><span className="badge bg-info text-dark">{bookingCount}</span></td>
                                  <td className="text-end"><button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowUsersModal(true)}>View / Edit</button></td>
                                </tr>
                              )
                            })}
                            {adminUsers.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-4">No registered users found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEPARATE GLOBAL TASKS SECTION WITH PAGINATION */}
              {adminSection === 'tasks' && (
              <div className="card shadow border-0 p-3 p-md-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
                  <h4 className="m-0 fs-5">🌐 Global Tasks List by User Profile ({allTodos.length})</h4>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ maxWidth: '100%', width: '300px' }}
                    placeholder="🔍 Search tasks or added user email..."
                    value={adminSearchTerm}
                    onChange={handleSearchChange}
                  />
                </div>

                {/* Global Tasks Table */}
                <div className="table-responsive">
                  <table className="table table-bordered align-middle bg-white mb-0">
                    <thead className="table-secondary">
                      <tr>
                        <th style={{ minWidth: '180px' }}>Added By</th>
                        <th style={{ minWidth: '220px' }}>Task Details</th>
                        <th style={{ minWidth: '160px' }}>Price & Payment</th>
                        <th style={{ minWidth: '100px' }}>Video</th>
                        <th style={{ minWidth: '100px' }}>Status</th>
                        <th style={{ minWidth: '130px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPaginatedTodos.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-primary rounded-circle p-2">📧</span>
                              <div>
                                <div className="fw-bold small">{t.profiles?.email || session.user.email}</div>
                                <span className={`badge ${t.profiles?.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                  {t.profiles?.role || 'user'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {adminEditingId === t.id ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={adminEditText}
                                onChange={(e) => setAdminEditText(e.target.value)}
                              />
                            ) : (
                              <div>
                                <div className={t.is_completed ? 'text-decoration-line-through text-muted fw-bold' : 'fw-bold'}>
                                  {t.title}
                                </div>
                                {t.scheduled_at && (
                                  <small className="text-primary d-block">
                                    📅 Scheduled: {new Date(t.scheduled_at).toLocaleString()}
                                  </small>
                                )}
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  Created: {t.inserted_at ? new Date(t.inserted_at).toLocaleString() : 'N/A'}
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="fw-bold text-success">
                              ₱{t.price ? Number(t.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                            </div>
                            {t.duration && (
                              <span className="badge bg-info text-dark me-1" style={{ fontSize: '0.65rem' }}>
                                📦 {t.duration}
                              </span>
                            )}
                            <span className="badge bg-light text-dark border text-uppercase" style={{ fontSize: '0.65rem' }}>
                              💳 {t.payment_option || 'None'}
                            </span>
                            {t.reference_number && (
                              <div className="small text-muted mt-1">
                                Ref: <code>{t.reference_number}</code>
                              </div>
                            )}
                          </td>
                          <td>
                            {t.video_url ? (
                              <a href={t.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline-primary py-0 px-2" style={{ fontSize: '0.75rem' }}>
                                ▶️ Watch
                              </a>
                            ) : (
                              <span className="text-muted small">No video</span>
                            )}
                          </td>
                          <td>
                            <div className="form-check form-switch">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                checked={t.is_completed}
                                onChange={() => adminToggleComplete(t)}
                              />
                              <span className="small text-muted ms-1">
                                {t.is_completed ? 'Done' : 'Pending'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              {adminEditingId === t.id ? (
                                <button className="btn btn-sm btn-success" onClick={() => adminSaveEdit(t.id)}>Save</button>
                              ) : (
                                <button className="btn btn-sm btn-outline-warning" onClick={() => { setAdminEditingId(t.id); setAdminEditText(t.title); }}>Edit</button>
                              )}
                              <button className="btn btn-sm btn-outline-danger" onClick={() => adminDeleteTodo(t.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredAdminTodos.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No tasks found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {filteredAdminTodos.length > 0 && (
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 pt-2 border-top gap-2">
                    <div className="small text-muted">
                      Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, filteredAdminTodos.length)}</strong> of <strong>{filteredAdminTodos.length}</strong> tasks
                    </div>
                    <nav aria-label="Tasks Page Navigation">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          >
                            Previous
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(number)}
                            >
                              {number}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
              )}
            </div>
          ) : (
            /* USER DASHBOARD WITH PROFESSIONAL DATA TABLE DISPLAY */
            <div className="row justify-content-center">
              <div className="col-12">
                <div className="card shadow border-0 p-3 p-md-4">
                  {/* TRIGGER MODAL BUTTON */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                    <div>
                      <h4 className="fw-bold text-dark m-0 fs-4">📋 My Tasks Directory</h4>
                      <small className="text-muted">Manage your tasks, scheduled delivery dates, and payment logs</small>
                    </div>
                    <button 
                      className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
                      onClick={() => setShowTaskModal(true)}
                    >
                      ➕ Create New Task
                    </button>
                  </div>

                  {/* PROFESSIONAL TASKS TABLE DISPLAY */}
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle bg-white mb-0 shadow-sm">
                      <thead className="table-dark">
                        <tr>
                          <th style={{ width: '90px' }} className="text-center">Status</th>
                          <th style={{ minWidth: '220px' }}>Task Details</th>
                          <th style={{ minWidth: '120px' }}>Video</th>
                          <th style={{ minWidth: '140px' }}>Package & Price</th>
                          <th style={{ minWidth: '180px' }}>Payment Status</th>
                          <th style={{ width: '130px' }} className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todos.map(todo => (
                          <tr key={todo.id}>
                            {/* Checkbox Status Column */}
                            <td className="text-center">
                              <input
                                type="checkbox"
                                className="form-check-input me-1"
                                checked={todo.is_completed}
                                onChange={() => toggleComplete(todo)}
                                title="Mark completed"
                              />
                              <span className={`badge ${todo.is_completed ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.65rem' }}>
                                {todo.is_completed ? 'Done' : 'Pending'}
                              </span>
                            </td>

                            {/* Task Details Column */}
                            <td>
                              {editingId === todo.id ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                />
                              ) : (
                                <div>
                                  <div className={todo.is_completed ? 'text-decoration-line-through text-muted fw-bold' : 'fw-bold text-dark'}>
                                    {todo.title}
                                  </div>

                                  {todo.scheduled_at && (
                                    <div className="small text-primary mt-1">
                                      📅 Scheduled: <strong>{new Date(todo.scheduled_at).toLocaleString()}</strong>
                                    </div>
                                  )}

                                  <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                                    Created: {todo.inserted_at ? new Date(todo.inserted_at).toLocaleString() : 'N/A'}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Video Column */}
                            <td>
                              {todo.video_url ? (
                                <a 
                                  href={todo.video_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-xs btn-outline-primary py-1 px-2 fw-semibold"
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  ▶️ Watch Video
                                </a>
                              ) : (
                                <span className="text-muted small">No Attachment</span>
                              )}
                            </td>

                            {/* Package & Price Column */}
                            <td>
                              <div className="fw-bold text-success fs-6">
                                ₱{todo.price ? Number(todo.price).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                              </div>
                              {todo.duration && (
                                <span className="badge bg-info text-dark mt-1" style={{ fontSize: '0.7rem' }}>
                                  📦 {todo.duration}
                                </span>
                              )}
                            </td>

                            {/* Payment Status Column */}
                            <td>
                              {todo.payment_verified ? (
                                <span className="badge bg-success-subtle text-success border border-success px-2 py-1 fw-bold d-inline-block mb-1">
                                  🟢 Paid
                                </span>
                              ) : (
                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1 fw-bold d-inline-block mb-1">
                                  🟡 Pending
                                </span>
                              )}

                              <div className="small text-muted">
                                {todo.payment_option && (
                                  <span className="badge bg-light text-dark border text-uppercase me-1" style={{ fontSize: '0.65rem' }}>
                                    💳 {todo.payment_option}
                                  </span>
                                )}
                                {todo.reference_number && (
                                  <div className="mt-1" style={{ fontSize: '0.75rem' }}>
                                    Ref: <code>{todo.reference_number}</code>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-1">
                                {editingId === todo.id ? (
                                  <button className="btn btn-xs btn-success" onClick={() => saveEdit(todo.id)}>Save</button>
                                ) : (
                                  <button className="btn btn-xs btn-outline-warning" onClick={() => { setEditingId(todo.id); setEditText(todo.title); }}>Edit</button>
                                )}
                                <button className="btn btn-xs btn-outline-danger" onClick={() => deleteTodo(todo.id)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {todos.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center text-muted py-4">
                              No tasks created yet. Click <strong>"➕ Create New Task"</strong> above to get started!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* REGISTERED USERS DIRECTORY MODAL WITH ADD, EDIT & DELETE */}
      {showUsersModal && (
        <div className="modal fade show d-block px-2" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold fs-5">📋 Registered Users Directory ({adminUsers.length})</h5>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-sm btn-primary fw-bold"
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                  >
                    {showAddUserForm ? '❌ Cancel Add' : '➕ Add New User'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowUsersModal(false)}
                  ></button>
                </div>
              </div>

              <div className="modal-body p-3">
                {/* ADD NEW USER FORM */}
                {showAddUserForm && (
                  <div className="card bg-light border-primary mb-4">
                    <div className="card-header bg-primary text-white fw-bold">
                      👤 Register New User Profile
                    </div>
                    <div className="card-body">
                      <form onSubmit={handleAdminAddUser}>
                        <div className="row">
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">First Name</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={newAdminFirstName}
                              onChange={(e) => setNewAdminFirstName(e.target.value)}
                              required 
                            />
                          </div>
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">Middle Name</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={newAdminMiddleName}
                              onChange={(e) => setNewAdminMiddleName(e.target.value)}
                            />
                          </div>
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">Last Name</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={newAdminLastName}
                              onChange={(e) => setNewAdminLastName(e.target.value)}
                              required 
                            />
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">Email</label>
                            <input 
                              type="email" 
                              className="form-control form-control-sm" 
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              required 
                            />
                          </div>
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">Password</label>
                            <input 
                              type="password" 
                              className="form-control form-control-sm" 
                              value={newAdminPassword}
                              onChange={(e) => setNewAdminPassword(e.target.value)}
                              required 
                            />
                          </div>
                          <div className="col-12 col-md-4 mb-3">
                            <label className="form-label small fw-bold">Role</label>
                            <select 
                              className="form-select form-select-sm" 
                              value={newAdminRole}
                              onChange={(e) => setNewAdminRole(e.target.value)}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-12 col-md-6 mb-3">
                            <label className="form-label small fw-bold">Contact Number</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={newAdminContact}
                              onChange={(e) => setNewAdminContact(e.target.value)}
                            />
                          </div>
                          <div className="col-12 col-md-6 mb-3">
                            <label className="form-label small fw-bold">Address</label>
                            <input 
                              type="text" 
                              className="form-control form-control-sm" 
                              value={newAdminAddress}
                              onChange={(e) => setNewAdminAddress(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="text-end">
                          <button type="submit" className="btn btn-success btn-sm px-4 fw-bold">
                            Save User
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* USER DIRECTORY TABLE */}
                <div className="table-responsive">
                  <table className="table table-striped align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Contact Number</th>
                        <th>Address</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            {editingUserId === u.id ? (
                              <div className="d-flex gap-1">
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  placeholder="First"
                                  value={editFirstName} 
                                  onChange={(e) => setEditFirstName(e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm" 
                                  placeholder="Last"
                                  value={editLastName} 
                                  onChange={(e) => setEditLastName(e.target.value)} 
                                />
                              </div>
                            ) : (
                              <strong>{[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || 'N/A'}</strong>
                            )}
                          </td>
                          <td>{u.email}</td>
                          <td>
                            {editingUserId === u.id ? (
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                value={editContact} 
                                onChange={(e) => setEditContact(e.target.value)} 
                              />
                            ) : (
                              u.contact_number || 'N/A'
                            )}
                          </td>
                          <td>
                            {editingUserId === u.id ? (
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                value={editAddress} 
                                onChange={(e) => setEditAddress(e.target.value)} 
                              />
                            ) : (
                              u.address || 'N/A'
                            )}
                          </td>
                          <td>
                            {editingUserId === u.id ? (
                              <select 
                                className="form-select form-select-sm"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>
                                {u.role}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {editingUserId === u.id ? (
                                <>
                                  <button 
                                    className="btn btn-xs btn-success" 
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => saveEditUser(u.id)}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    className="btn btn-xs btn-secondary" 
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => setEditingUserId(null)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="btn btn-xs btn-outline-warning" 
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => startEditUser(u)}
                                  >
                                    Edit
                                  </button>
                                  {u.id !== session.user.id && (
                                    <button 
                                      className="btn btn-xs btn-outline-danger" 
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => deleteUser(u.id)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button 
                  type="button" 
                  className="btn btn-secondary fw-semibold px-4" 
                  onClick={() => setShowUsersModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED TASK ADD MODAL WITH ALL STRICT REQUIRED FIELDS */}
      {showTaskModal && (
        <div className="modal fade show d-block px-2" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold fs-5">➕ Create New Task with Payment</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowTaskModal(false)}
                ></button>
              </div>

              <div className="modal-body p-3 p-md-4">
                <form id="taskAddModalForm" onSubmit={addTodo}>
                  {/* Task Title (REQUIRED) */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Task Title <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="What needs to be done?"
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                      required
                    />
                  </div>

                  {/* Video Upload (REQUIRED) */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">📹 Upload Video Attachment <span className="text-danger">*</span></label>
                    <input
                      type="file"
                      accept="video/*"
                      className="form-control"
                      onChange={(e) => handleVideoFileChange(e.target.files[0])}
                      required
                    />
                    {videoFile && (
                      <small className={`d-block mt-1 ${videoDurationSeconds ? 'text-success' : 'text-muted'}`}>
                        {videoDurationSeconds ? `Detected video duration: ${videoDurationSeconds.toFixed(2)} seconds` : 'Reading video duration…'}
                      </small>
                    )}
                  </div>

                  <div className="row">
                    {/* Calendar with Time (REQUIRED) */}
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label fw-semibold">📅 Scheduled Date & Time <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required
                      />
                    </div>

                    {/* Price is calculated from the selected plan */}
                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label fw-semibold">💰 {planTab === 'custom' ? 'Custom Plan Total' : 'Package Price'} (₱) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control bg-light"
                        placeholder={planTab === 'custom' ? 'Complete the custom plan below' : 'Select a package below'}
                        value={price}
                        readOnly
                        required
                      />
                    </div>
                  </div>

                  {/* Only the active plan tab can have a selected plan. */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold d-block">Select a Plan <span className="text-danger">*</span></label>
                    <div className="nav nav-tabs mb-3" role="tablist" aria-label="Plan type">
                      <button
                        type="button"
                        className={`nav-link ${planTab === 'custom' ? 'active' : ''}`}
                        onClick={() => handlePlanTabChange('custom')}
                        aria-selected={planTab === 'custom'}
                      >
                        Customize Plan
                      </button>
                      <button
                        type="button"
                        className={`nav-link ${planTab === 'package' ? 'active' : ''}`}
                        onClick={() => handlePlanTabChange('package')}
                        aria-selected={planTab === 'package'}
                      >
                        Package Plan
                      </button>
                    </div>

                    {planTab === 'custom' ? (
                      <div className="p-3 bg-light border rounded">
                        <p className="small text-muted mb-3">Your administrator sets the rate and play length. Choose your runs, dates, and daily timings below; the total updates automatically.</p>
                        <div className="row g-3">
                          <div className="col-12">
                            <div className="alert alert-info mb-0 py-2 small">
                              <strong>Admin pricing:</strong> ₱{Number(customPlanSettings.rate || 0).toLocaleString('en-PH')} per {customPlanSettings.rateUnit}. The detected uploaded-video duration ({videoDurationSeconds ? `${videoDurationSeconds.toFixed(2)} seconds` : 'not ready'}) is used in the calculation.
                            </div>
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Runs per time slot <span className="text-danger">*</span></label>
                            <input type="number" min="1" step="1" className="form-control" placeholder="e.g. 3" value={customRunsPerSlot} onChange={(e) => setCustomRunsPerSlot(e.target.value)} required />
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Calculated schedule</label>
                            <div className="form-control bg-white">{customPlanDays || 0} day(s) × {customTimeSlots.length} time slot(s) × {customRunsPerSlot || 0} runs</div>
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">Start date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} required />
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label small fw-semibold">End date <span className="text-danger">*</span></label>
                            <input type="date" min={customStartDate || undefined} className="form-control" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} required />
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label small fw-semibold mb-0">Daily run times <span className="text-danger">*</span></label>
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setCustomTimeSlots([...customTimeSlots, ''])}>+ Add time</button>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {customTimeSlots.map((time, index) => (
                              <div className="input-group" style={{ width: '170px' }} key={`time-slot-${index}`}>
                                <input type="time" className="form-control" value={time} onChange={(e) => updateCustomTimeSlot(index, e.target.value)} required />
                                {customTimeSlots.length > 1 && (
                                  <button type="button" className="btn btn-outline-danger" aria-label={`Remove time ${index + 1}`} onClick={() => setCustomTimeSlots(customTimeSlots.filter((_, timeIndex) => timeIndex !== index))}>×</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="small text-muted mb-2">Each play is 10 seconds. Choose the monthly package that matches your required daily play capacity.</p>
                        <div className="row g-2">
                          {pricingPackages.map((pricingPackage) => {
                            const packageDetail = `${pricingPackage.name} — ${pricingPackage.dailyPlays} 10-sec plays/day`
                            const isSelected = duration === packageDetail

                            return (
                              <div className="col-12 col-md-6" key={pricingPackage.id}>
                                <input
                                  className="btn-check"
                                  type="radio"
                                  name="pricingPackage"
                                  id={`pricing-${pricingPackage.id}`}
                                  checked={isSelected}
                                  onChange={() => handlePackageChange(pricingPackage)}
                                  required={planTab === 'package'}
                                />
                                <label className={`btn w-100 text-start border p-3 ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`} htmlFor={`pricing-${pricingPackage.id}`}>
                                  <span className="d-flex justify-content-between align-items-center gap-2">
                                    <span className="fw-bold">{pricingPackage.name}</span>
                                    <span className="fw-bold">₱{pricingPackage.price.toLocaleString('en-PH')}</span>
                                  </span>
                                  <span className="d-block small mt-1">{pricingPackage.dailyPlays.toLocaleString('en-PH')} 10-sec plays / day</span>
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PAYMENT OPTION SECTION (ALL REQUIRED) */}
                  <div className="card border-primary mb-3">
                    <div className="card-header bg-primary text-white fw-bold small">
                      💳 Payment Required Before Task Submission
                    </div>
                    <div className="card-body p-3">
                      <label className="form-label fw-semibold d-block mb-2">Select Payment Method <span className="text-danger">*</span></label>
                      <div className="d-flex flex-wrap gap-3 gap-md-4 mb-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentOption"
                            id="modalPaymentPaymongo"
                            value="paymongo"
                            checked={paymentOption === 'paymongo'}
                            onChange={(e) => setPaymentOption(e.target.value)}
                            required
                          />
                          <label className="form-check-label fw-bold text-success" htmlFor="modalPaymentPaymongo">
                            🟢 PayMongo Gateway
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentOption"
                            id="modalPaymentGcash"
                            value="gcash"
                            checked={paymentOption === 'gcash'}
                            onChange={(e) => setPaymentOption(e.target.value)}
                            required
                          />
                          <label className="form-check-label fw-bold text-primary" htmlFor="modalPaymentGcash">
                            GCash Direct
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentOption"
                            id="modalPaymentMaya"
                            value="maya"
                            checked={paymentOption === 'maya'}
                            onChange={(e) => setPaymentOption(e.target.value)}
                            required
                          />
                          <label className="form-check-label fw-bold text-info" htmlFor="modalPaymentMaya">
                            Maya Direct
                          </label>
                        </div>

                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="paymentOption"
                            id="modalPaymentBank"
                            value="bank_transfer"
                            checked={paymentOption === 'bank_transfer'}
                            onChange={(e) => setPaymentOption(e.target.value)}
                            required
                          />
                          <label className="form-check-label fw-bold text-dark" htmlFor="modalPaymentBank">
                            Bank Transfer
                          </label>
                        </div>
                      </div>

                      {/* DYNAMIC PAYMENT UI */}
                      {paymentOption === 'paymongo' && (
                        <div className="p-3 bg-light border text-center rounded mb-3">
                          <h6 className="fw-bold text-success mb-2">💳 PayMongo Online Checkout</h6>
                          <p className="small text-muted mb-3">
                            Pay via GCash, GrabPay, Maya, Cards, or Billease using the secure PayMongo Gateway.
                          </p>
                          <a 
                            href={`https://paymongo.page/l/checkout?amount=${price || 0}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-success fw-bold px-3 py-2 mb-3"
                          >
                            🚀 Click Here to Open PayMongo Checkout Page
                          </a>
                          <div>
                            <label className="form-label fw-semibold small d-block">PayMongo Reference / Payment ID <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control form-control-sm text-center"
                              placeholder="e.g. pay_123456789"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {paymentOption === 'gcash' && (
                        <div className="p-3 bg-light border text-center rounded mb-3">
                          <h6 className="fw-bold text-primary mb-2">Scan GCash QR Code</h6>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=GCASH_PAYMENT_${price || 0}`} 
                            alt="GCash QR Code" 
                            className="img-thumbnail mb-2"
                            style={{ maxWidth: '140px' }}
                          />
                          <div className="small text-muted mb-2">
                            Amount to Pay: <strong className="text-success">₱{price || '0.00'}</strong>
                          </div>
                          <div>
                            <label className="form-label fw-semibold small d-block">GCash Reference / Transaction Number <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control form-control-sm text-center"
                              placeholder="Enter GCash Reference Number"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {paymentOption === 'maya' && (
                        <div className="p-3 bg-light border text-center rounded mb-3">
                          <h6 className="fw-bold text-info mb-2">Scan Maya QR Code</h6>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=MAYA_PAYMENT_${price || 0}`} 
                            alt="Maya QR Code" 
                            className="img-thumbnail mb-2"
                            style={{ maxWidth: '140px' }}
                          />
                          <div className="small text-muted mb-2">
                            Amount to Pay: <strong className="text-success">₱{price || '0.00'}</strong>
                          </div>
                          <div>
                            <label className="form-label fw-semibold small d-block">Maya Reference / Transaction Number <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control form-control-sm text-center"
                              placeholder="Enter Maya Reference Number"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      )}

                      {paymentOption === 'bank_transfer' && (
                        <div className="p-3 bg-light border rounded mb-3">
                          <h6 className="fw-bold text-dark mb-2">🏦 Bank Transfer Details</h6>
                          <div className="small mb-3">
                            <div><strong>Bank Name:</strong> BDO Unibank / BPI</div>
                            <div><strong>Account Name:</strong> TaskManager Pro Inc.</div>
                            <div><strong>Account Number:</strong> 1234-5678-9012</div>
                            <div><strong>Amount to Pay:</strong> <span className="text-success fw-bold">₱{price || '0.00'}</span></div>
                          </div>
                          
                          <label className="form-label fw-semibold">Reference / Transaction Number <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter Bank Reference Number"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            required
                          />
                        </div>
                      )}

                      {/* PAYMENT CONFIRMATION CHECKBOX (REQUIRED) */}
                      <div className="form-check bg-warning-subtle p-3 rounded border border-warning">
                        <input
                          className="form-check-input ms-0 me-2"
                          type="checkbox"
                          id="modalConfirmPayment"
                          checked={hasPaid}
                          onChange={(e) => setHasPaid(e.target.checked)}
                          required
                        />
                        <label className="form-check-label fw-bold text-dark small" htmlFor="modalConfirmPayment">
                          I confirm that I have completed the required payment of ₱{price || '0.00'} <span className="text-danger">*</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-footer bg-light">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="taskAddModalForm"
                  className="btn btn-success px-4 fw-bold"
                  disabled={uploading || !hasPaid}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Submitting...
                    </>
                  ) : 'Submit Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-dark text-white text-center py-3 mt-auto shadow-sm">
        <div className="container">
          <small className="text-white-50">© 2026 TaskManager Pro. Built with React, Supabase & Bootstrap 5.</small>
        </div>
      </footer>
    </div>
  )
}
