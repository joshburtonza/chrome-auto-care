import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Car, Shield, Sparkles, Calendar, Store, Award, User } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background-alt to-background">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(246,250,255,0.03),transparent_50%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-8">
              <div className="p-2 sm:p-3 rounded-lg chrome-surface chrome-glow">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.4} />
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="chrome-heading text-3xl sm:text-5xl md:text-7xl mb-4 sm:mb-6">
              RACE TECHNIK
            </h1>
            <p className="chrome-label text-xs sm:text-base md:text-lg mb-2 sm:mb-4 text-accent-dark">
              AUTOMOTIVE DETAILING & PROTECTION
            </p>
            <p className="text-text-secondary text-sm sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light px-4">
              Premium paint protection, ceramic coating, and detailing services for automotive enthusiasts who demand perfection
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center pt-6 sm:pt-8 px-4">
              <ChromeButton size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/auth/signup">
                  <Calendar className="mr-2 h-4 w-4" strokeWidth={1.4} />
                  Get Started
                </Link>
              </ChromeButton>
              <ChromeButton variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/auth/client-login">
                  <User className="mr-2 h-4 w-4" strokeWidth={1.4} />
                  Client Login
                </Link>
              </ChromeButton>
              <ChromeButton variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/auth/staff-login">
                  <Shield className="mr-2 h-4 w-4" strokeWidth={1.4} />
                  Staff Login
                </Link>
              </ChromeButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-3xl mx-auto pt-8 sm:pt-16 px-2">
              {[
                { value: "500+", label: "Vehicles Protected" },
                { value: "98%", label: "Client Satisfaction" },
                { value: "12+", label: "Years Experience" },
              ].map((stat, idx) => (
                <ChromeSurface key={idx} className="p-3 sm:p-6 chrome-sheen" glow>
                  <div className="chrome-title text-lg sm:text-3xl text-primary mb-1 sm:mb-2">{stat.value}</div>
                  <div className="chrome-label text-[8px] sm:text-xs text-text-tertiary">{stat.label}</div>
                </ChromeSurface>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>

      {/* Services Preview */}
      <section className="py-12 sm:py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="chrome-title text-2xl sm:text-4xl mb-2 sm:mb-4">OUR SERVICES</h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto px-4">
              Comprehensive protection and enhancement solutions for your vehicle
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: "Paint Protection",
                description: "Premium PPF installation with self-healing technology",
              },
              {
                icon: Sparkles,
                title: "Ceramic Coating",
                description: "Long-lasting protection with hydrophobic properties",
              },
              {
                icon: Car,
                title: "Detailing",
                description: "Complete interior and exterior rejuvenation",
              },
            ].map((service, idx) => (
              <ChromeSurface key={idx} className="p-5 sm:p-8 chrome-sheen group hover:chrome-glow-strong transition-all duration-300" glow>
                <div className="mb-4 sm:mb-6 inline-flex p-3 sm:p-4 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.4} />
                </div>
                <h3 className="chrome-label text-sm sm:text-base mb-2 sm:mb-3 text-foreground">{service.title}</h3>
                <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">{service.description}</p>
              </ChromeSurface>
            ))}
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <ChromeButton className="w-full sm:w-auto" asChild>
              <Link to="/services">
                View All Services
              </Link>
            </ChromeButton>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 sm:py-24 bg-background-alt relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <ChromeSurface className="p-5 sm:p-8" glow sheen>
              <Store className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-3 sm:mb-4" strokeWidth={1.4} />
              <h3 className="chrome-label text-sm sm:text-base mb-2 sm:mb-3 text-foreground">MERCHANDISE STORE</h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4 sm:mb-6">Premium detailing products and accessories</p>
              <ChromeButton variant="outline" className="w-full sm:w-auto" asChild>
                <Link to="/store">Browse Store</Link>
              </ChromeButton>
            </ChromeSurface>

            <ChromeSurface className="p-5 sm:p-8" glow sheen>
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-3 sm:mb-4" strokeWidth={1.4} />
              <h3 className="chrome-label text-sm sm:text-base mb-2 sm:mb-3 text-foreground">CLIENT PORTAL</h3>
              <p className="text-text-secondary text-xs sm:text-sm mb-4 sm:mb-6">Track your bookings and manage your garage</p>
              <ChromeButton variant="outline" className="w-full sm:w-auto" asChild>
                <Link to="/dashboard">Access Dashboard</Link>
              </ChromeButton>
            </ChromeSurface>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <p className="chrome-label text-xs sm:text-sm text-text-tertiary">
            © 2025 RACE TECHNIK. PRECISION PROTECTION.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
