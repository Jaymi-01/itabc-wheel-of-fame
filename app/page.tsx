"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Wheel from "@/components/Wheel";
import OptionEditor from "@/components/OptionEditor";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  getDocs,
  FirestoreError
} from "firebase/firestore";
interface WheelOption {
  id: string;
  text: string;
  isPicked: boolean;
  colorIndex: number;
}

const COLLECTION_NAME = "wheel_options";

export default function Home() {
  const [options, setOptions] = useState<WheelOption[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentRotationRef = useRef(0);
  const initializingRef = useRef(false);

  const initializeData = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    
    try {
      const initialOptions = Array.from({ length: 12 }, (_, i) => ({
        text: `Book ${i + 1}`,
        isPicked: false,
        colorIndex: i
      }));
      
      console.log("Initializing Firestore with batch write...");
      const batch = writeBatch(db);
      initialOptions.forEach((opt) => {
        const docRef = doc(collection(db, COLLECTION_NAME));
        batch.set(docRef, opt);
      });
      await batch.commit();
      console.log("Batch initialization complete.");
    } catch (err: unknown) {
      console.error("Error during initialization:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to initialize database: ${errorMessage}. Check your Firebase console and rules.`);
      setIsLoading(false);
    }
  };

  // Sync with Firestore
  useEffect(() => {
    console.log("Setting up Firestore listener for:", COLLECTION_NAME);
    
    // Check if Firebase config is potentially missing
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "your_api_key") {
      console.warn("Firebase API Key is missing or default. Check your .env file.");
      setError("Firebase configuration is missing. Please check your .env file and restart the server.");
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, COLLECTION_NAME), orderBy("colorIndex", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Received Firestore snapshot. Document count:", snapshot.docs.length);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WheelOption[];
      
      if (data.length === 0) {
        console.log("Database is empty, initializing default data...");
        initializeData();
      } else {
        setOptions(data);
        setIsLoading(false);
        setError(null);
      }
    }, (err: FirestoreError) => {
      console.error("Firestore subscription error:", err);
      setError(`Firestore Error: ${err.message}. Ensure your rules are published and .env is correct.`);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []); // Only run once on mount

  const spin = useCallback(async () => {
    if (isSpinning || options.length === 0) return;
    
    // Check if all available options are already picked
    const availableOptions = options.filter(o => !o.isPicked);
    if (availableOptions.length === 0) {
      alert("All books have been picked! Please reset the wheel.");
      return;
    }

    setIsSpinning(true);
    setWinner(null);

    let finalRotation = currentRotationRef.current;
    let selectedOption: WheelOption | null = null;
    let totalExtraSpins = 0;

    // Logic for "re-spinning" if it lands on a picked option
    const findValidWinner = () => {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const randomIndex = array[0] % options.length;
      const option = options[randomIndex];

      const anglePerSegment = 360 / options.length;
      const segmentCenter = (randomIndex * anglePerSegment) + (anglePerSegment / 2);
      const stopOffset = 360 - segmentCenter;

      // Base spins
      const extraSpins = 5 + Math.floor(Math.random() * 5);
      totalExtraSpins += extraSpins;
      
      finalRotation = finalRotation + (extraSpins * 360) + (stopOffset - (finalRotation % 360));
      if (finalRotation < currentRotationRef.current + (extraSpins * 360)) {
        finalRotation += 360;
      }

      if (option.isPicked) {
        // If it lands on a picked option, we add more spins and try again
        // We'll visually represent this as a continuous long spin
        return findValidWinner();
      } else {
        selectedOption = option;
        return randomIndex;
      }
    };

    const winnerIndex = findValidWinner();
    currentRotationRef.current = finalRotation;
    setRotation(finalRotation);

    // Wait for animation (5s)
    setTimeout(async () => {
      setIsSpinning(false);
      if (selectedOption) {
        setWinner(selectedOption.text);
        // Persist "isPicked" to Firestore
        const docRef = doc(db, COLLECTION_NAME, selectedOption.id);
        await updateDoc(docRef, { isPicked: true });
      }
    }, 5000);
  }, [isSpinning, options]);

  // Firestore Handlers
  const handleAdd = async () => {
    if (options.length < 30) {
      await addDoc(collection(db, COLLECTION_NAME), {
        text: `Book ${options.length + 1}`,
        isPicked: false,
        colorIndex: options.length
      });
    }
  };

  const handleRemove = async (id: string) => {
    if (options.length > 10) {
      const bookToRemove = options.find(o => o.id === id);
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      toast.error(`"${bookToRemove?.text}" has been deleted.`, {
        description: "The book was removed from the list.",
      });
    }
  };

  const handleUpdate = async (id: string, text: string) => {
    await updateDoc(doc(db, COLLECTION_NAME, id), { text });
  };

  const handleTogglePicked = async (id: string) => {
    const option = options.find(o => o.id === id);
    if (option) {
      await updateDoc(doc(db, COLLECTION_NAME, id), { isPicked: !option.isPicked });
    }
  };

  const handleReset = async () => {
    if (confirm("Reset all picked books?")) {
      const batch = writeBatch(db);
      let count = 0;
      options.forEach((opt) => {
        if (opt.isPicked) {
          const docRef = doc(db, COLLECTION_NAME, opt.id);
          batch.update(docRef, { isPicked: false });
          count++;
        }
      });
      
      if (count > 0) {
        await batch.commit();
      }
      setWinner(null);
    }
  };

  const handleClearAll = async () => {
    if (confirm("DANGER: This will delete ALL books from the database. Are you sure?")) {
      setIsLoading(true);
      const batch = writeBatch(db);
      options.forEach((opt) => {
        const docRef = doc(db, COLLECTION_NAME, opt.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      // After commit, the onSnapshot will see 0 items and re-initialize correctly once.
      initializingRef.current = false; 
      toast.info("Database has been cleared and re-initialized.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EBD48F] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#141935]"></div>
        <p className="text-[#141935] font-medium">Connecting to the wheel database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#EBD48F] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-red-100 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-[#141935]">Connection Issue</h2>
          <p className="text-zinc-600 mb-8">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#141935] text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EBD48F] text-[#141935] font-sans p-4 sm:p-6 md:p-8">
      <header className="max-w-6xl mx-auto flex justify-start mb-4 sm:mb-0">
        <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white/30 shadow-lg border-2 border-white/40">
          <Image
            src="/logo.png"
            alt="Wheel of Fame Logo"
            fill
            className="object-cover"
            priority
          />
        </div>
      </header>
      <main className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 md:gap-12 pt-4 sm:pt-8 lg:pt-8">
        
        {/* Left Side: The Wheel */}
        <div className="flex flex-col items-center gap-6 sm:gap-8 flex-1 w-full max-w-[500px] lg:max-w-none">
          <div className="relative w-full px-4 sm:px-0 flex items-center justify-center">
            <Wheel options={options} rotation={rotation} isSpinning={isSpinning} />
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={spin}
              disabled={isSpinning}
              className={`
                px-12 py-4 rounded-full text-xl font-bold transition-all transform active:scale-95
                ${isSpinning 
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" 
                  : "bg-[#141935] text-white hover:shadow-xl hover:-translate-y-1 active:shadow-inner"
                }
              `}
            >
              {isSpinning ? "Spinning..." : "SPIN!"}
            </button>
            
            {winner && !isSpinning && (
              <div className="animate-bounce flex flex-col items-center">
                <p className="text-sm font-bold uppercase tracking-widest text-center">The book of the month is</p>
                <h2 className="text-4xl font-extrabold text-[#141935] text-center drop-shadow-sm">
                  {winner}
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Options Editor */}
        <div className="w-full max-w-md flex flex-col gap-6">
          <OptionEditor 
            options={options} 
            onAdd={handleAdd}
            onRemove={handleRemove}
            onUpdate={handleUpdate}
            onTogglePicked={handleTogglePicked}
            disabled={isSpinning} 
          />
          
          <button
            onClick={handleReset}
            disabled={isSpinning}
            className="w-full py-3 bg-[#141935] text-white rounded-xl font-semibold hover:bg-[#141935]/90 transition-colors disabled:opacity-50"
          >
            Reset All Books
          </button>

          <button
            onClick={handleClearAll}
            disabled={isSpinning}
            className="w-full py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-all uppercase tracking-widest"
          >
            Clear & Re-initialize Wheel
          </button>

          {/* <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <h3 className="text-blue-800 dark:text-blue-300 font-bold mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Smart Wheel Logic
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-disc pl-5">
              <li>Persists data in <strong>Firebase Firestore</strong>.</li>
              <li>Picked options are <strong>grayed out</strong> visually.</li>
              <li>If the wheel lands on a picked option, it <strong>automatically re-spins</strong> until a valid winner is found.</li>
            </ul>
          </div> */}
        </div>
      </main>
    </div>
  );
}
