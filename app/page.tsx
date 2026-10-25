// ... импорты
import AdminPanel from "../components/AdminPanel"; // <-- ДОБАВИТЬ

export default function Home() {
  // ... твои стейты
  const [showAdmin, setShowAdmin] = useState(false); // <-- ДОБАВИТЬ

  // ... (остальной код)

  return (
    <main className="flex h-screen w-full overflow-hidden relative">
      {/* ... (твой код интерфейса) */}

      {showProfile && (
        <Profile 
          user={currentUser} 
          onClose={() => setShowProfile(false)} 
          onOpenNewChat={() => setShowNewChat(true)} 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenCreateChat={() => setShowCreateChat(true)}
          onOpenAdmin={() => setShowAdmin(true)} // <-- ДОБАВИТЬ
        />
      )}
      
      {/* ... (другие модалки) */}

      {/* ПАНЕЛЬ АДМИНА */}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />} {/* <-- ДОБАВИТЬ */}
    </main>
  );
}
