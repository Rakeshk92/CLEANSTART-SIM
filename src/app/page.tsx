"use client";

import { useState, useEffect } from "react";
import supabaseBrowser from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push("/game");
    });
  }, []);

  const signUp = async () => {
    setMessage("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) return setMessage(error.message);
    setMessage("Signup successful! You can now login.");
  };

  const signIn = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return setMessage(error.message);
    router.push("/game");
  };

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Startup Simulation</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />

        <button onClick={signIn} style={{ padding: 10 }}>
          Login
        </button>

        <button onClick={signUp} style={{ padding: 10 }}>
          Sign Up
        </button>

        {message && <p style={{ color: "red" }}>{message}</p>}
      </div>
    </main>
  );
}