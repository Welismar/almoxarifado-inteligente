"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível entrar.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Stockwise">
        <div className="login-brand"><span className="brand-mark">+</span><span>stock<span className="brand-accent">wise</span></span></div>
        <div className="login-message"><p className="eyebrow">ALMOXARIFADO INTELIGENTE</p><h1>O controle da obra começa no estoque.</h1><p>Materiais, ferramentas e decisões importantes em um só lugar.</p></div>
        <div className="login-quote">“Informação certa, no momento certo, para a obra não parar.”</div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand"><span className="brand-mark">+</span><span>stock<span className="brand-accent">wise</span></span></div>
          <p className="eyebrow">BEM-VINDO DE VOLTA</p>
          <h2>Entrar na sua conta</h2>
          <p className="login-subtitle">Acesse a operação do seu almoxarifado.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">E-mail profissional<input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label htmlFor="password">Senha<span className="password-label"><a href="#recuperar">Esqueci minha senha</a></span><input id="password" name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary-button login-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar na plataforma"}<span>→</span></button>
          </form>
          <p className="login-help">Precisa de acesso? <a href="mailto:suporte@stockwise.local">Fale com o administrador</a></p>
        </div>
        <footer className="login-footer"><span>© 2024 Stockwise</span><span>Operação segura <i className="status-dot" /></span></footer>
      </section>
    </main>
  );
}
