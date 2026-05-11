import { Route,Routes } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import PageNotFound from '../pages/PageNotFound'
import Signup from '../pages/SignupPage'
import SignupPage from '../pages/SignupPage'
import ChatPage from '../pages/ChatPage'

const AllRoutes = () => {
  return (
    <Routes>

        <Route path="/" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path='*' element={<PageNotFound/>}/>
    </Routes>
  )
}

export default AllRoutes