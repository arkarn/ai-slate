import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRocket, FaMicrophone, FaPencilAlt, FaBrain, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import UserProfile from './UserProfile';
import { supabase } from '@/lib/supabase.js';

function Homepage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGetStarted = () => {
    if (session) {
      navigate('/playground');
    } else {
      scrollToAuth();
    }
  };

  const handleLogin = () => {
    scrollToAuth();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setError('Check your email for the confirmation link!');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
      } else {
        // Redirect to playground after successful sign in
        navigate('/playground');
      }
    }
    setLoading(false);
  };

  const scrollToAuth = () => {
    document.getElementById('auth-section')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'center'
    });
  };

  const features = [
    {
      icon: FaPencilAlt,
      title: "Natural Writing",
      description: "Write and draw naturally on the digital slate, just like on paper"
    },
    {
      icon: FaMicrophone,
      title: "Voice Interaction", 
      description: "Talk to your slate and get instant responses from AI"
    },
    {
      icon: FaBrain,
      title: "AI Understanding",
      description: "AI sees what you draw and write, providing intelligent feedback"
    },
    {
      icon: FaRocket,
      title: "Interactive Learning",
      description: "Solve problems together with your AI learning companion"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <FaPencilAlt className="text-3xl text-cyan-400" />
              <span className="text-2xl font-bold">AISlate</span>
            </button>
            <nav className="hidden md:flex items-center space-x-8">
              {session ? (
                <UserProfile />
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                The Future of Learning
                <span className="block bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  AI-Powered Slate
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Where young minds meet artificial intelligence. Write, draw, speak, and learn 
                with an interactive slate designed for students aged 5-12.
              </p>
              <button 
                onClick={handleGetStarted}
                className="group bg-gradient-to-r from-cyan-400 to-purple-500 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:shadow-cyan-400/25 transition-all transform hover:scale-105"
              >
                <span className="flex items-center space-x-2">
                  <span>{session ? 'Start Learning' : 'Login to start learning'}</span>
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
            
            {/* Floating Cards */}
            <div className="relative h-96 hidden lg:block">
              <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center space-x-3 animate-float">
                <FaBrain className="text-2xl text-cyan-400" />
                <span className="font-semibold">AI Assistant</span>
              </div>
              <div className="absolute top-32 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center space-x-3 animate-float" style={{animationDelay: '2s'}}>
                <FaMicrophone className="text-2xl text-cyan-400" />
                <span className="font-semibold">Voice Chat</span>
              </div>
              <div className="absolute bottom-16 left-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center space-x-3 animate-float" style={{animationDelay: '4s'}}>
                <FaPencilAlt className="text-2xl text-cyan-400" />
                <span className="font-semibold">Digital Writing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
            Intelligent Learning Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-cyan-400/50 transition-all hover:shadow-xl hover:shadow-cyan-400/10 hover:-translate-y-2">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="text-2xl text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Auth Section - Always visible but highlighted when showAuth is true */}
      <section 
        id="auth-section"
        className="py-20 bg-white/5"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Features */}
            <div className="text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Join the AI Learning Revolution
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Start your journey with AISlate - where AI meets creativity for students aged 5-12
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: FaPencilAlt, title: "Natural Writing", desc: "Write like on a real slate" },
                  { icon: FaMicrophone, title: "Voice Interaction", desc: "Talk to your AI assistant" },
                  { icon: FaBrain, title: "Smart Learning", desc: "AI-powered problem solving" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-shrink-0 p-3 bg-cyan-400/20 rounded-lg">
                      <feature.icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                      <p className="text-gray-300 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-8 pt-6 border-t border-white/20">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">1000+</div>
                  <div className="text-sm text-gray-400">Students Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">95%</div>
                  <div className="text-sm text-gray-400">Engagement Rate</div>
                </div>
              </div>
            </div>

            {/* Right side - Auth form */}
            <div className="w-full">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                  </h3>
                  <p className="text-gray-300">
                    {isSignUp ? 'Join thousands of students learning with AI' : 'Sign in to continue your learning journey'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-all focus:bg-white/20"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-all focus:bg-white/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-cyan-400/25 transition-all disabled:opacity-50 hover:transform hover:-translate-y-1"
                  >
                    {loading 
                      ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                      : (isSignUp ? 'Sign Up Free' : 'Sign In')
                    }
                  </button>
                  
                  {error && (
                    <p className={`text-sm text-center ${error.includes('Check your email') ? 'text-green-400' : 'text-red-400'}`}>
                      {error}
                    </p>
                  )}
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                  >
                    {isSignUp 
                      ? 'Already have an account? Sign In' 
                      : "Don't have an account? Sign Up"
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <FaPencilAlt className="text-2xl text-cyan-400" />
              <span className="text-xl font-bold">AISlate</span>
            </div>
            <p className="text-gray-400">Empowering young minds with AI-powered learning</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;