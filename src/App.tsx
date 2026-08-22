import { BrowserRouter, Routes, Route } from 'react-router'
import { AppProvider } from './app/AppContext'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { Profile } from './pages/Profile'
import { PostPage } from './pages/PostPage'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/:username" element={<Profile />} />
          <Route path="/:username/post/:postId" element={<PostPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
