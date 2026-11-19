import { Container } from 'react-bootstrap'
import { Route, Routes } from 'react-router-dom'
import Footer from './components/Footer'
import Navigation from './components/Navbar'
import Home from './pages/Home'

function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navigation cartCount={0} />

      <Container as="main" className="page-content flex-grow-1 py-4">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Container>

      <Footer />
    </div>
  )
}

export default App
