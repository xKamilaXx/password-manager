'use client';

import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';

// Modele danych (interfejsy)

// Opisuje jedno zapisane hasło na liście
interface PasswordEntry {
  id: string;
  service: string;
  username: string;
  password: string;
  category: string;
  createdAt: string;
}

// Opisuje konto użytkownika w programie
interface UserAccount {
  login: string;
  email: string;
  masterPassword: string;
}

// Konto testowe do szybkiego sprawdzenia projektu
const DEFAULT_ACCOUNT: UserAccount = {
  login: 'admin',
  email: 'admin@example.com',
  masterPassword: '1234',
};

export default function Home() {

  // Stany do logowania i rejestracji
  const [currentUser, setCurrentUser] = useState<string | null>(null); // Kto jest zalogowany
  const [isRegistering, setIsRegistering] = useState<boolean>(false); // Czy kliknięto "Stwórz nowe konto"
  const [authLogin, setAuthLogin] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>(''); // Komunikat jak coś pójdzie nie tak

  // Stany do bazy haseł
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);           

  // Pola formularza dodawania nowego hasła
  const [service, setService] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [category, setCategory] = useState<string>('Ogólne');
  const [search, setSearch] = useState<string>('');

  // Podgląd hasła (oczko) i kopiowanie
  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Ustawienia losowania hasła
  const [genLength, setGenLength] = useState<number>(16);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [useNumbers, setUseNumbers] = useState<boolean>(true);

  // Odpala się raz na start,ładuje konto admina i sprawdza czy ktoś już był zalogowany
  useEffect(() => {
    const storedUsers: UserAccount[] = JSON.parse(
      localStorage.getItem('pm_users') || '[]'
    );
    const hasAdmin = storedUsers.some((u) => u.login === DEFAULT_ACCOUNT.login);

    // Jak nie ma jeszcze admina w pamięci, to go wrzucamy
    if (!hasAdmin) {
      storedUsers.push(DEFAULT_ACCOUNT);
      localStorage.setItem('pm_users', JSON.stringify(storedUsers));
    }

    // Sprawdzamy czy w przeglądarce wisi zalogowana sesja
    const session = localStorage.getItem('pm_session_user');
    if (session) {
      setCurrentUser(session);
      const userVault = localStorage.getItem(`pm_vault_${session}`);
      if (userVault) {
        try {
          setPasswords(JSON.parse(userVault) as PasswordEntry[]);
        } catch {
          setPasswords([]);
        }
      }
    }
    setIsLoaded(true);
  }, []);

  // Za każdym razem jak dodamy/usuniemy hasło,zapisuje się to do localStorage pod danego uzytkownika
  useEffect(() => {
    if (currentUser && isLoaded) {
      localStorage.setItem(`pm_vault_${currentUser}`, JSON.stringify(passwords));
    }
  }, [passwords, currentUser, isLoaded]);

  // Kopiowanie: po 2 sekundach zmieniamy zielony ptaszek z powrotem na ikonkę clipboarda
  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  // Generator: losuje znaki, ale pilnuje żeby pierwszy znak nie był symbolem
  const generatePassword = useCallback((): void => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const firstCharPool = useNumbers ? letters + '0123456789' : letters;

    let chars = letters;
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    // Pierwszy znak bierzemy tylko z liter albo cyfr
    let result = firstCharPool.charAt(
      Math.floor(Math.random() * firstCharPool.length)
    );

    // Reszta hasła normalnie
    for (let i = 1; i < genLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  }, [genLength, useNumbers, useSymbols]);

  // Kliknięcie oczka, pokazuje lub ukrywa konkretne hasło
  const toggleVisibility = useCallback((id: string): void => {
    setVisibleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Usuwanie wpisu z tablicy
  const handleDelete = useCallback((id: string): void => {
    setPasswords((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Kopiowanie hasła do schowka systemowego
  const copyToClipboard = useCallback(async (text: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
  }, []);

  // Filtrowanie haseł w wyszukiwarce (useMemo żeby nie mieliło tego bez sensu przy każdym renderze)
  const filteredPasswords = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return passwords;

    return passwords.filter(
      (p) =>
        p.service.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [passwords, search]);

  // Funkcja od logowania i tworzenia nowego konta
  const handleAuth = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setAuthError('');

    const cleanIdentifier = authLogin.trim().toLowerCase();
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPass = authPassword.trim();

    const storedUsers: UserAccount[] = JSON.parse(
      localStorage.getItem('pm_users') || '[]'
    );

    if (isRegistering) {
      if (!cleanIdentifier || !cleanEmail || !cleanPass) {
        setAuthError('Wypełnij wszystkie pola formularza.');
        return;
      }

      // Proste sprawdzenie czy mail ma @ i kropkę
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setAuthError('Podaj poprawny adres e-mail.');
        return;
      }

      // Sprawdzamy czy login albo mail już są zajęte
      if (storedUsers.some((u) => u.login === cleanIdentifier)) {
        setAuthError('Użytkownik o takim loginie już istnieje.');
        return;
      }
      if (storedUsers.some((u) => u.email === cleanEmail)) {
        setAuthError('Konto z tym adresem e-mail jest już zarejestrowane.');
        return;
      }

      // Dodajemy nowego użytkownika
      storedUsers.push({
        login: cleanIdentifier,
        email: cleanEmail,
        masterPassword: cleanPass,
      });

      localStorage.setItem('pm_users', JSON.stringify(storedUsers));
      localStorage.setItem('pm_session_user', cleanIdentifier);
      setCurrentUser(cleanIdentifier);
      setPasswords([]); // Nowe konto ma pustą bazę
    } else {
      if (!cleanIdentifier || !cleanPass) {
        setAuthError('Wprowadź login/e-mail oraz hasło.');
        return;
      }

      // Logowanie działa zarówno jak i po użyciu loginu, jak i hasła
      const user = storedUsers.find(
        (u) =>
          (u.login === cleanIdentifier || u.email === cleanIdentifier) &&
          u.masterPassword === cleanPass
      );

      if (!user) {
        setAuthError('Nieprawidłowy login/e-mail lub hasło.');
        return;
      }

      localStorage.setItem('pm_session_user', user.login);
      setCurrentUser(user.login);

      // Wczytujemy hasła tylko dla tego użytkownika
      const userVault = localStorage.getItem(`pm_vault_${user.login}`);
      setPasswords(userVault ? JSON.parse(userVault) : []);
    }

    setAuthLogin('');
    setAuthEmail('');
    setAuthPassword('');
  };

  // Wylogowanie czyści stan i sesję w przeglądarce
  const handleLogout = (): void => {
    localStorage.removeItem('pm_session_user');
    setCurrentUser(null);
    setPasswords([]);
    setVisibleIds({});
  };

  // Dodawanie nowego hasła do listy
  const handleAdd = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!service.trim() || !password.trim()) return;

    // Blokada: hasło nie może zaczynać się od znaku specjalnego
    if (!/^[a-zA-Z0-9]/.test(password)) {
      alert('Hasło nie może zaczynać się od znaku specjalnego! Użyj litery lub cyfry na początku.');
      return;
    }

    const newEntry: PasswordEntry = {
      id: crypto.randomUUID(),
      service: service.trim(),
      username: username.trim(),
      password: password.trim(),
      category,
      createdAt: new Date().toLocaleDateString('pl-PL'),
    };

    setPasswords([newEntry, ...passwords]);
    setService('');
    setUsername('');
    setPassword('');
  };

  // Jak nikt nie jest zalogowany, pokazujemy formularz logowania/rejestracji
  if (!currentUser) {
    return (
      <main className="auth-wrapper">
        <div className="card auth-card">
          <header className="header">
            <h1>🔒 Menadżer Haseł</h1>
            <p>
              {isRegistering
                ? 'Utwórz konto, aby zarządzać swoimi hasłami'
                : 'Zaloguj się do swojego menadżera haseł'}
            </p>
          </header>

          <form onSubmit={handleAuth}>
            {authError && <div className="alert-error">{authError}</div>}

            <div className="form-group">
              <label htmlFor="auth-login">
                {isRegistering ? 'Nazwa użytkownika (login)' : 'Login lub E-mail'}
              </label>
              <input
                id="auth-login"
                type="text"
                value={authLogin}
                onChange={(e) => setAuthLogin(e.target.value)}
                placeholder={isRegistering ? 'np. jankowalski' : 'admin lub admin@example.com'}
                required
              />
            </div>

            {/* Pole na maila tylko przy rejestracji */}
            {isRegistering && (
              <div className="form-group">
                <label htmlFor="auth-email">Adres E-mail</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="np. jan@example.com"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-pass">Hasło</label>
              <input
                id="auth-pass"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="np. 1234"
                required
              />
            </div>

            <button type="submit" className="btn-primary">
              {isRegistering ? 'Zarejestruj konto' : 'Odblokuj dostęp'}
            </button>
          </form>

            {!isRegistering && (
            <div style={{ marginTop: '0.85rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
              Konto testowe: <strong>admin</strong> | Hasło: <strong>1234</strong>
            </div>
          )}

          <div className="auth-footer">
            <span>
              {isRegistering
                ? 'Masz już konto?'
                : 'Nie masz jeszcze konta?'}
            </span>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
                setAuthEmail('');
              }}
            >
              {isRegistering ? 'Zaloguj się' : 'Stwórz nowe konto'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Widok po zalogowaniu, główny program
  return (
    <main className="container">
      <header className="header app-header">
        <div>
          <h1>🔑 Menadżer Haseł</h1>
          <p>
            Zalogowano jako: <strong>{currentUser}</strong>
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          Wyloguj się
        </button>
      </header>

      <div className="grid">
        {/* Lewa strona: formularz dodawania nowego hasła */}
        <section className="card">
          <h2>Dodaj nowe hasło</h2>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label htmlFor="service">Serwis / Strona *</label>
              <input
                id="service"
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="np. Spotify, Discord"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Login / E-mail</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="np. uczen@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Hasło *</label>
              <div className="input-with-button">
                <input
                  id="password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wpisz lub wygeneruj"
                  required
                />
                <button
                  type="button"
                  className="btn-icon"
                  title="Wygeneruj hasło"
                  onClick={generatePassword}
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Suwak i checkboxy generatora */}
            <div className="generator-options">
              <label htmlFor="length">
                Długość: {genLength}
                <input
                  id="length"
                  type="range"
                  min="8"
                  max="32"
                  value={genLength}
                  onChange={(e) => setGenLength(Number(e.target.value))}
                />
              </label>
              <div className="checkboxes">
                <label>
                  <input
                    type="checkbox"
                    checked={useNumbers}
                    onChange={(e) => setUseNumbers(e.target.checked)}
                  />
                  Cyfry
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={useSymbols}
                    onChange={(e) => setUseSymbols(e.target.checked)}
                  />
                  Symbole
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="category">Kategoria</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Ogólne">Ogólne</option>
                <option value="Szkoła">Szkoła</option>
                <option value="Gry / Rozrywka">Gry / Rozrywka</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">
              Zapisz hasło
            </button>
          </form>
        </section>

        {/* Prawa strona: wyszukiwarka i lista zapisanych haseł */}
        <section className="card list-section">
          <div className="list-header">
            <h2>Twoje hasła ({filteredPasswords.length})</h2>
            <input
              type="text"
              placeholder="Szukaj..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredPasswords.length === 0 ? (
            <p className="empty-message">Brak haseł do wyświetlenia.</p>
          ) : (
            <ul className="password-list">
              {filteredPasswords.map((item) => {
                const isVisible = Boolean(visibleIds[item.id]);
                const isCopied = copiedId === item.id;

                return (
                  <li key={item.id} className="password-item">
                    <div className="item-info">
                      <div className="item-title">
                        <strong>{item.service}</strong>
                        <span className="badge">{item.category}</span>
                      </div>
                      {item.username && <p className="item-sub">{item.username}</p>}
                      <div className="password-display">
                        <code>{isVisible ? item.password : '••••••••••••'}</code>
                      </div>
                    </div>

                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        title={isVisible ? 'Ukryj' : 'Pokaż'}
                        onClick={() => toggleVisibility(item.id)}
                      >
                        {isVisible ? '🙈' : '👁️'}
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Kopiuj do schowka"
                        onClick={() => copyToClipboard(item.password, item.id)}
                      >
                        {isCopied ? '✅' : '📋'}
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        title="Usuń wpis"
                        onClick={() => handleDelete(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}