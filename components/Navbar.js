"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from 'next/link';
import Image from 'next/image'; // For image optimization
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { data: session } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);  // Ref for dropdown menu
  const buttonRef = useRef(null);  // Ref for dropdown button

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <nav className="relative bg-white/10 backdrop-blur-lg shadow-xl rounded-b-2xl text-white flex justify-between items-center px-6 py-2 md:h-14 flex-col md:flex-row border-b border-white/20 overflow-visible z-[101]">
      <Link href={"/"} className="logo font-bold text-base flex items-center gap-2">
        <span className="text-2xl font-extrabold italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-blue-500 drop-shadow-lg">
          TrustPayHub
        </span>
        <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded-full bg-black shadow-lg border border-white/30" />
      </Link>

      <div className="relative flex flex-col md:block gap-2 items-center">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <button
              ref={buttonRef}
              onClick={() => setShowDropdown(!showDropdown)}
              className="mx-2 text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 transition-transform duration-200 focus:ring-2 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center inline-flex items-center shadow"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path></svg>
              Welcome, {session.user.email}
              <svg className="w-2 h-2 ml-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
              </svg>
            </button>
          ) : (
            <Link href="/login">
              <button className="bg-gradient-to-br from-purple-600 to-blue-500 hover:scale-105 transition-transform duration-200 focus:ring-2 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center shadow text-white">
                <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M20 8v6M23 11h-6"></path></svg>
                Login
              </button>
            </Link>
          )}
        </div>

        {session && showDropdown && (
          <div
            ref={dropdownRef}
            className="z-[102] absolute left-1/2 transform -translate-x-1/2 mt-2 bg-white/90 backdrop-blur-lg border border-white/30 rounded-xl shadow-2xl w-52"
          >
            <ul className="py-2 text-base text-gray-800">
              <li>
                <Link href="/dashboard" className="block px-5 py-3 hover:bg-purple-100 rounded-lg transition-colors">Dashboard</Link>
              </li>
              <li>
                <Link href={`/${session.user.name}`} className="block px-5 py-3 hover:bg-purple-100 rounded-lg transition-colors">Your Page</Link>
              </li>
              <li>
                <button
                  onClick={async () => {
                    await signOut({ 
                      callbackUrl: '/login', 
                      redirect: true 
                    });
                    // Clear any cached data
                    if (typeof window !== 'undefined') {
                      window.location.href = '/login';
                    }
                  }}
                  className="block px-5 py-3 w-full text-left hover:bg-purple-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
