// components/HeroSection.jsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion'; // You'll need to install framer-motion

const HeroSection = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background with overlay gradient */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/file.svg" // Add your own background image
          alt="Luxury Background"
          layout="fill"
          objectFit="cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
      </div>
      
      {/* Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center">
          <div className="mr-2 text-gold-300">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 5C11.7157 5 5 11.7157 5 20C5 28.2843 11.7157 35 20 35C28.2843 35 35 28.2843 35 20C35 11.7157 28.2843 5 20 5ZM20 10C25.5228 10 30 14.4772 30 20C30 25.5228 25.5228 30 20 30C14.4772 30 10 25.5228 10 20C10 14.4772 14.4772 10 20 10Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="font-serif text-xl font-bold text-white">GOLDEN<span className="text-gold-400">RESERVE</span></span>
        </div>
        
        <nav className="hidden md:block">
          <ul className="flex space-x-8">
            {['HOME', 'ABOUT', 'SERVICES', 'INVESTMENTS', 'CONTACT'].map((item) => (
              <li key={item}>
                <Link href={`/${item.toLowerCase()}`}>
                  <span className="cursor-pointer text-sm font-medium tracking-wider text-white hover:text-gold-300 transition-colors">
                    {item}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <button className="md:hidden text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </header>
      
      {/* Hero Content */}
      <div className="relative z-10 flex h-4/5 flex-col justify-center px-8 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Elevating Gold Investment
            <span className="block mt-2">For Exceptional Returns</span>
          </h1>
          <p className="mt-4 text-xl font-light text-gray-200 max-w-xl">
            With a world-class reputation and expertise in precious metals
          </p>
          
          <div className="mt-10 flex flex-wrap gap-6">
            <Link href="/discover">
              <span className="group inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-sm font-medium text-black transition-all hover:bg-gold-500">
                Discover More
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </Link>
            
            <Link href="/contact">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10">
                Contact Us
              </span>
            </Link>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <span className="text-xs text-white/70 uppercase tracking-widest mb-2">Scroll</span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 rounded-full border border-white/30 flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;