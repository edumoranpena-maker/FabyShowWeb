import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Servicios from '../components/Servicios'
import Paquetes from '../components/Paquetes'
import Galeria from '../components/Galeria'
import ComoTrabajamos from '../components/ComoTrabajamos'
import Testimonios from '../components/Testimonios'
import FAQ from '../components/FAQ'
import Contacto from '../components/Contacto'
import Footer from '../components/Footer'
import WhatsAppFloat from '../components/WhatsAppFloat'

// El sitio público (landing) tal cual estaba, ahora aislado como su propia
// "ruta" dentro de App.jsx — separado del panel de administración para
// que ambos puedan evolucionar de forma independiente.
export default function MarketingSite() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Servicios />
        <Galeria />
        <Paquetes />
        <ComoTrabajamos />
        <Testimonios />
        <FAQ />
        <Contacto />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}
