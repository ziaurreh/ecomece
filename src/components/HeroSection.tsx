import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHeroStore } from '@/store/hero';

export const HeroSection = () => {
  const { heroSections, loadHeroSections } = useHeroStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadHeroSections();
  }, []);

  // Filter active hero sections
  const activeHeroSections = heroSections.filter(hero => hero.is_active);

  // Auto-slide functionality
  useEffect(() => {
    if (activeHeroSections.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeHeroSections.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [activeHeroSections.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activeHeroSections.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activeHeroSections.length) % activeHeroSections.length);
  };

  if (activeHeroSections.length === 0) {
    // Default hero section if no active sections
    return (
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              ✨ Welcome to the Future of Shopping
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Discover Amazing Products at Unbeatable Prices
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Shop the latest trends, find unique items, and enjoy a seamless shopping experience with fast delivery and excellent customer service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products">
                <Button size="lg" className="group">
                  Shop Now
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="outline">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentHero = activeHeroSections[currentSlide];

  return (
    <section 
      className="relative py-20 min-h-[600px] flex items-center"
      style={{
        backgroundImage: currentHero.background_image 
          ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${currentHero.background_image})`
          : 'linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--background)) 50%, hsl(var(--secondary) / 0.05) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {currentHero.subtitle && (
            <Badge className="mb-4" variant="secondary">
              {currentHero.subtitle}
            </Badge>
          )}
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${
            currentHero.background_image 
              ? 'text-white' 
              : 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
          }`}>
            {currentHero.title}
          </h1>
          {currentHero.description && (
            <p className={`text-xl mb-8 max-w-2xl mx-auto ${
              currentHero.background_image ? 'text-white/90' : 'text-muted-foreground'
            }`}>
              {currentHero.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={currentHero.cta_link}>
              <Button size="lg" className="group">
                {currentHero.cta_text}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="outline">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation arrows for multiple slides */}
      {activeHeroSections.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            onClick={prevSlide}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            onClick={nextSlide}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Slide indicators */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {activeHeroSections.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};