import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function AdminDashboard({ session }) {
  const [users, setUsers] = useState([])
  const [allTodos, setAllTodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)

    // Fetch all user profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch all todos across all users
    const { data: todosData, error: todosError } = await supabase
      .from('todos')
      .select('*, profiles(email)')
      .order('inserted_at', { ascending: false })

    if (profilesError) console.error('Error fetching profiles:', profilesError)
    else setUsers(profilesData || [])

    if (todosError) console.error('Error fetching all todos:', todosError)
    else setAllTodos(todosData || [])

    setLoading(false)
  }

  // Admin function: Change user role
  const toggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) alert(error.message)
    else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  // Admin function: Delete any user's todo item
  const deleteAnyTodo = async (id) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) alert(error.message)
    else setAllTodos(allTodos.filter(t => t.id !== id))
  }

  if (loading) return <div>Loading Admin Panel...</div>

  return (
    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
      <h2 style={{ color: '#d9534f' }}>🛡️ Admin Dashboard</h2>

      {/* User Management Section */}
      <section style={{ marginBottom: '30px' }}>
        <h3>Registered Users ({users.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'white' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', padding: '8px' }}>
              <th style={{ padding: '8px' }}>Email</th>
              <th style={{ padding: '8px' }}>Role</th>
              <th style={{ padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{user.email}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '4px', 
                    background: user.role === 'admin' ? '#d9534f' : '#5bc0de', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '8px' }}>
                  {user.id !== session.user.id && (
                    <button 
                      onClick={() => toggleUserRole(user.id, user.role)}
                      style={{ padding: '4px 8px', cursor: 'pointer' }}
                    >
                      Toggle Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Global System Data Section */}
      <section>
        <h3>All User Todos Across Platform ({allTodos.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {allTodos.map((todo) => (
            <li key={todo.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'white', marginBottom: '6px', border: '1px solid #ddd' }}>
              <div>
                <strong>{todo.profiles?.email || 'Unknown User'}:</strong> {todo.title}
              </div>
              <button onClick={() => deleteAnyTodo(todo.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '4px 8px', cursor: 'pointer' }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}