import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#FDFDFD] overflow-hidden relative font-sans text-gray-900 selection:bg-blue-100">

            {/* Background Subtle Grid/Dots (Optional, to match the image subtly) */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 mix-blend-multiply"></div>

            {/* Navigation Bar */}
            <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo_mel.png" alt="ARIVAGAM Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tight">ARIVAGAM</span>
                </div>

                {/* Center Links */}
                <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
                    <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                    <a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a>
                    <a href="#resources" className="hover:text-blue-600 transition-colors">Resources</a>
                    <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
                </div>

                {/* Right CTA */}
                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-4 py-2">
                        Sign in
                    </Link>
                    <Link to="/register" className="text-sm font-medium bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all rounded-full px-5 py-2.5">
                        Get demo
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 px-4 text-center max-w-5xl mx-auto mt-12">

                {/* Central Icon/Decoration (matching the middle icon in reference) */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-900 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-900 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-900 rounded-full"></div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-6xl md:text-7xl lg:text-[80px] font-bold tracking-tight text-gray-900 leading-[1.05]"
                >
                    Upload, analyze, and chat <br />
                    <span className="text-gray-400">with your documents</span>
                </motion.h1>

                {/* Primary CTA */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-10"
                >
                    <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1">
                        Get free demo
                    </Link>
                </motion.div>

            </main>
        </div>
    );
};

export default Landing;
