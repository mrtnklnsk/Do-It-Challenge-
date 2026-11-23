import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Flame,
  Trophy,
  Users,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  AlertTriangle,
  Coins,
  Dumbbell,
  Sparkles,
  Award,
  UserPlus,
  X,
  Check,
  Sun,
  Moon,
  Smartphone,
  Sunset,
  Zap,
  Activity,
  Palette,
  LayoutGrid,
  Quote,
  Shield,
  ShieldCheck,
  Crown,
  User,
  Upload,
  Camera,
  Eye,
  RotateCcw,
  Image as ImageIcon,
  Lock,
  Unlock,
  KeyRound,
  Share2,
  Copy,
  Wifi,
  WifiOff,
  Loader2,
  LogOut
} from 'lucide-react';

// ============================================================================
// INICIALIZACE FIREBASE (MIMO KOMPONENTU DLE PRAVIDEL)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBSqqqK-gS6RL_EcTYuzuvzXH17cDearcY",
  authDomain: "do-it-666.firebaseapp.com",
  projectId: "do-it-666",
  storageBucket: "do-it-666.firebasestorage.app",
  messagingSenderId: "121646030674",
  appId: "1:121646030674:web:fb27ad8f75091d7d16248b"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'do-it-666-anglicak';

// ============================================================================
// POMOCNÉ FUNKCE PRO DATUM, BARVY A KOMPRESI OBRÁZKŮ
// ============================================================================

const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateStr = (dateStr, daysToAdd) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysToAdd);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const diffDays = (startStr, endStr) => {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
};

const formatCzechDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
};

// Výpočet cílového počtu angličáků pro konkrétní den výzvy (dayNum >= 1)
const getTargetBurpeesForDay = (dayNum, settings) => {
  if (dayNum < 1) return 0;
  const startCount = Math.max(1, Number(settings?.startCount) || 1);
  const stepAmount = Math.max(0, Number(settings?.stepAmount ?? 1));
  const stepFrequency = settings?.stepFrequency === 'weekly' ? 'weekly' : 'daily';

  const periodsElapsed =
    stepFrequency === 'weekly'
      ? Math.floor((dayNum - 1) / 7)
      : dayNum - 1;

  return startCount + periodsElapsed * stepAmount;
};

// Komprese obrázku na max 120x120px JPEG/PNG base64 pro bezpečné uložení do Firestore dokumentu
const compressImageFile = (file, maxSize = 120) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nebyl vybrán žádný soubor.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === 'image/png' || file.type === 'image/svg+xml' || file.type === 'image/webp';
        const dataUrl = isPng ? canvas.toDataURL('image/png', 0.8) : canvas.toDataURL('image/jpeg', 0.78);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Obrázek se nepodařilo načíst.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Chyba při čtení souboru.'));
    reader.readAsDataURL(file);
  });
};

// Výpočet dynamických odstínů a kontrastu z libovolného HEX kódu
const hexToRgb = (hex) => {
  const clean = (hex || '#059669').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 5, g: 150, b: 105 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

const adjustHexBrightness = (hex, amount) => {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const getContrastText = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
};

// Přednastavené barvy profilů
const AVATAR_COLORS = [
  { id: 'emerald', hex: '#10b981', label: 'Smaragdová' },
  { id: 'amber', hex: '#f59e0b', label: 'Zlatá' },
  { id: 'sky', hex: '#0ea5e9', label: 'Nebeská' },
  { id: 'rose', hex: '#f43f5e', label: 'Červená' },
  { id: 'violet', hex: '#8b5cf6', label: 'Fialová' },
  { id: 'orange', hex: '#f97316', label: 'Oranžová' },
];

// Přednastavené palety celé aplikace
const PRESET_ACCENTS = [
  { id: 'emerald', label: 'Smaragdová', hex: '#059669' },
  { id: 'orange', label: 'Oranžová', hex: '#ea580c' },
  { id: 'blue', label: 'Modrá', hex: '#2563eb' },
  { id: 'violet', label: 'Fialová', hex: '#7c3aed' },
  { id: 'rose', label: 'Červená', hex: '#e11d48' },
];

// Výchozí vektorové ikony výzvy
const BUILTIN_ICONS = [
  { id: 'flame', label: 'Oheň', Icon: Flame },
  { id: 'zap', label: 'Blesk', Icon: Zap },
  { id: 'dumbbell', label: 'Činka', Icon: Dumbbell },
  { id: 'trophy', label: 'Trofej', Icon: Trophy },
  { id: 'activity', label: 'Tep', Icon: Activity },
];

const MOTIVATION_QUOTES = [
  "Skvělá práce! Dnešní dávka je v kapse.",
  "Stroj na angličáky! Jen tak dál.",
  "Další den odškrtnutý. Tělo ti poděkuje (časem).",
  "Žádné výmluvy, čistá dřina. Respekt!",
  "Paráda! Tvoje série pokračuje."
];

const DAILY_QUOTES = [
  "Disciplína je most mezi cíli a jejich dosažením.",
  "Nezáleží na tom, jak pomalu jdeš, dokud se nezastavíš.",
  "Dnešní bolest je zítřejší síla.",
  "I jeden angličák se počítá víc než nula na gauči.",
  "Šampioni se nerodí v posilovně, ale z touhy uvnitř.",
  "Každý den o jeden víc. Jednoduchá matematika, velký výsledek."
];

// Výchozí stav výzvy pro inicializaci prázdné databáze
const createDefaultChallengeState = (todayStr) => ({
  members: [
    { id: 'm1', name: 'Já (Zakladatel)', role: 'founder', color: 'emerald', avatarDataUrl: null },
    { id: 'm2', name: 'Kamarád', role: 'player', color: 'amber', avatarDataUrl: null }
  ],
  completions: {
    m1: [1, 2, 3, 4],
    m2: [1, 2, 4]
  },
  settings: {
    startDate: addDaysToDateStr(todayStr, -4),
    startCount: 1, // Počáteční počet cviků v Den 1 (např. 1, 2, 5...)
    stepFrequency: 'daily', // 'daily' | 'weekly'
    stepAmount: 1, // O kolik cviků se dávka navýší
    penaltyEnabled: true,
    penaltyType: 'money', // 'money' | 'burpees' | 'both'
    penaltyAmount: 50,
    penaltyBurpeesAmount: 10,
    adminPassword: 'admin123',
    primaryColorHex: '#059669',
    selectedIconId: 'flame',
    customIcons: [],
    visibleWidgets: {
      streak: true,
      total: true,
      penalty: true,
      quote: true
    }
  }
});

// Komponenta pro zobrazení avatara uživatele
function UserAvatar({ member, sizeClass = 'w-10 h-10 text-sm', ringClass = '' }) {
  const colorObj = AVATAR_COLORS.find(c => c.id === member?.color) || AVATAR_COLORS[0];
  const initials = (member?.name || '?')
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const imgSrc = member?.avatarDataUrl || member?.avatarUrl;

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={member.name}
        className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 ${ringClass}`}
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: colorObj.hex, color: getContrastText(colorObj.hex) }}
      className={`${sizeClass} rounded-full font-extrabold flex items-center justify-center shrink-0 shadow-sm ${ringClass}`}
    >
      {initials}
    </div>
  );
}

// Komponenta pro zobrazení hlavní ikony výzvy
function ChallengeLogoIcon({ selectedIconId, customIcons, className = 'w-6 h-6' }) {
  if (selectedIconId?.startsWith('custom:')) {
    const customId = selectedIconId.replace('custom:', '');
    const found = (customIcons || []).find(ic => ic.id === customId);
    if (found) {
      return (
        <img
          src={found.dataUrl}
          alt={found.name}
          className={`${className} object-contain rounded-md`}
        />
      );
    }
  }
  const builtIn = BUILTIN_ICONS.find(i => i.id === selectedIconId) || BUILTIN_ICONS[0];
  const IconComp = builtIn.Icon;
  return <IconComp className={`${className} stroke-[2.5]`} />;
}

export default function App() {
  const todayStr = useMemo(() => getTodayStr(), []);

  // 1. Firebase Auth stav
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // 2. Cloudový stav místnosti / výzvy (Firestore)
  const [roomId, setRoomId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom && urlRoom.trim()) return urlRoom.trim();
      try {
        const storedRoom = localStorage.getItem('ac_cloud_roomId');
        if (storedRoom) return storedRoom;
      } catch {}
    }
    return 'hlavni-vyzva';
  });

  const [cloudData, setCloudData] = useState(null);
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting' | 'live' | 'error'
  const [syncErrorMsg, setSyncErrorMsg] = useState(null);

  // 3. Lokální preference zařízení (pouze 2 věci v localStorage dle zadání: currentUserId a themeMode)
  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem(`ac_cloud_user_${roomId}`) || '';
    } catch {
      return '';
    }
  });

  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('ac_cloud_themeMode') || 'light';
    } catch {
      return 'light';
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Uložení lokálních preferencí zařízení
  useEffect(() => {
    try {
      localStorage.setItem('ac_cloud_themeMode', themeMode);
    } catch {}
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem('ac_cloud_roomId', roomId);
      if (currentUserId) {
        localStorage.setItem(`ac_cloud_user_${roomId}`, currentUserId);
      } else {
        localStorage.removeItem(`ac_cloud_user_${roomId}`);
      }
    } catch {}
  }, [currentUserId, roomId]);

  // Autentizace Firebase (RULE 3: Auth FIRST, před jakýmkoliv dotazem do Firestore)
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Chyba autentizace:', err);
        if (isMounted) {
          setSyncStatus('error');
          setSyncErrorMsg('Nepodařilo se připojit ke službě ověření.');
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (isMounted) {
        setUser(firebaseUser);
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time posluchač na dokument výzvy ve Firestore (RULE 1 & RULE 3)
  useEffect(() => {
    if (!user) return;

    setSyncStatus('connecting');
    setSyncErrorMsg(null);

    // Striktní cesta dle pravidel: /artifacts/{appId}/public/data/{collectionName}/{documentId}
    const challengeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'anglicak_challenges', roomId);

    const unsubscribe = onSnapshot(
      challengeDocRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          // Inicializace výchozího dokumentu v databázi, pokud je prázdná
          const defaultState = createDefaultChallengeState(todayStr);
          try {
            await setDoc(challengeDocRef, defaultState);
            setCloudData(defaultState);
            setSyncStatus('live');
          } catch (writeErr) {
            console.error('Chyba při zakládání výzvy:', writeErr);
            setSyncStatus('error');
            setSyncErrorMsg('Nepodařilo se vytvořit sdílenou výzvu.');
          }
        } else {
          const data = snapshot.data();
          setCloudData(data);
          setSyncStatus('live');
        }
      },
      (err) => {
        console.error('Chyba real-time synchronizace:', err);
        setSyncStatus('error');
        setSyncErrorMsg('Výpadek připojení k databázi. Zkontroluj internet.');
      }
    );

    return () => unsubscribe();
  }, [user, roomId, todayStr]);

  // Sledování systémového režimu a času pro Soumrak
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentHour(new Date().getHours()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    if (themeMode === 'system') return systemPrefersDark;
    if (themeMode === 'twilight') return currentHour >= 19 || currentHour < 6;
    return false;
  }, [themeMode, systemPrefersDark, currentHour]);

  // Rozbalení cloudových dat s bezpečnými výchozími hodnotami
  const members = useMemo(() => cloudData?.members || [], [cloudData]);
  const completions = useMemo(() => cloudData?.completions || {}, [cloudData]);
  const settings = useMemo(() => {
    const fallback = createDefaultChallengeState(todayStr).settings;
    return {
      ...fallback,
      ...(cloudData?.settings || {}),
      visibleWidgets: {
        ...fallback.visibleWidgets,
        ...(cloudData?.settings?.visibleWidgets || {})
      }
    };
  }, [cloudData, todayStr]);

  const primaryColorHex = settings.primaryColorHex || '#059669';

  // Dynamické CSS proměnné podle zvolené barvy v cloudu
  const dynamicColorVars = useMemo(() => {
    const { r, g, b } = hexToRgb(primaryColorHex);
    const hoverHex = adjustHexBrightness(primaryColorHex, -18);
    const contrastHex = getContrastText(primaryColorHex);
    return {
      '--primary': primaryColorHex,
      '--primary-hover': hoverHex,
      '--primary-contrast': contrastHex,
      '--primary-soft': `rgba(${r}, ${g}, ${b}, ${isDark ? 0.18 : 0.11})`,
      '--primary-border': `rgba(${r}, ${g}, ${b}, ${isDark ? 0.42 : 0.32})`,
      '--primary-ring': `rgba(${r}, ${g}, ${b}, 0.35)`,
    };
  }, [primaryColorHex, isDark]);

  // UI stavy aplikace
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'leaderboard' | 'history' | 'profile'
  const [adminSubTab, setAdminSubTab] = useState('members'); // 'members' | 'rules' | 'brand'
  const [previewAsPlayer, setPreviewAsPlayer] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Admin odemčení heslem
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordSavedNotice, setPasswordSavedNotice] = useState(false);

  // Modál pro přidání / úpravu člena v Administraci
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', color: 'sky', role: 'player', avatarDataUrl: null });

  // Rychlé přidání nového hráče z uvítací obrazovky "Kdo jsi?"
  const [quickJoinName, setQuickJoinName] = useState('');
  const [quickJoinColor, setQuickJoinColor] = useState('sky');
  const [showQuickJoinForm, setShowQuickJoinForm] = useState(false);

  // Modál pro sdílení odkazu / místnosti
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');

  // Lokální editace jména v Profilu (aby se neposílal zápis při každém písmenu)
  const [profileNameDraft, setProfileNameDraft] = useState('');

  // Refs pro file inputy
  const profileAvatarInputRef = useRef(null);
  const adminMemberAvatarInputRef = useRef(null);
  const customIconInputRef = useRef(null);

  // Aktivní přihlášený člen na tomto zařízení
  const activeMember = useMemo(() => {
    if (!currentUserId || members.length === 0) return null;
    return members.find(m => m.id === currentUserId) || null;
  }, [members, currentUserId]);

  useEffect(() => {
    if (activeMember) {
      setProfileNameDraft(activeMember.name);
    }
  }, [activeMember]);

  const hasAdminRights = useMemo(() => {
    return activeMember?.role === 'founder' || activeMember?.role === 'admin';
  }, [activeMember]);

  // Pokud přepneme na uživatele bez admin role, zamkneme Admin sekci
  useEffect(() => {
    if (!hasAdminRights) {
      setIsAdminUnlocked(false);
      setPreviewAsPlayer(false);
    }
  }, [hasAdminRights]);

  // Pomocná funkce pro zápis změn do Firestore dokumentu
  const updateChallengeDoc = async (partialData) => {
    if (!user) return;
    try {
      const challengeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'anglicak_challenges', roomId);
      await updateDoc(challengeDocRef, partialData);
    } catch (err) {
      console.error('Chyba při ukládání do cloudu:', err);
      setSyncErrorMsg('Změnu se nepodařilo uložit do cloudu.');
    }
  };

  // Aktuální den výzvy
  const currentDayNumber = useMemo(
    () => diffDays(settings.startDate, todayStr) + 1,
    [settings.startDate, todayStr]
  );

  // Cílový počet angličáků pro dnešní den dle pravidel (startCount, stepFrequency, stepAmount)
  const todayTargetBurpees = useMemo(
    () => getTargetBurpeesForDay(currentDayNumber, settings),
    [currentDayNumber, settings]
  );

  // Odkliknutí splnění dne (ukládá pole splněných dnů [1, 2, 3...] do cloudu)
  const toggleDayCompletion = async (memberId, dayNum) => {
    if (dayNum < 1 || !user) return;
    const existingDays = Array.isArray(completions[memberId]) ? completions[memberId] : [];
    const wasDone = existingDays.includes(dayNum);

    let updatedDays;
    if (wasDone) {
      updatedDays = existingDays.filter(d => d !== dayNum);
    } else {
      updatedDays = [...existingDays, dayNum].sort((a, b) => a - b);
      if (dayNum === currentDayNumber && memberId === activeMember?.id) {
        const quote = MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)];
        setCelebrationMsg(quote);
        setTimeout(() => setCelebrationMsg(null), 3500);
      }
    }

    await updateChallengeDoc({
      [`completions.${memberId}`]: updatedDays
    });
  };

  // Výpočet statistik všech členů z cloudových dat
  const memberStats = useMemo(() => {
    const effectiveDaysCount = Math.max(0, currentDayNumber);
    const pastLimit = Math.max(0, currentDayNumber - 1);

    return members.map(member => {
      const doneArr = Array.isArray(completions[member.id]) ? completions[member.id] : [];
      const doneSet = new Set(doneArr);

      let totalBurpees = 0;
      let completedDaysCount = 0;
      let missedDaysCount = 0;

      const maxDay = Math.max(effectiveDaysCount, ...doneArr, 0);
      for (let d = 1; d <= maxDay; d++) {
        if (doneSet.has(d)) {
          totalBurpees += getTargetBurpeesForDay(d, settings);
          completedDaysCount++;
        } else if (d <= pastLimit) {
          missedDaysCount++;
        }
      }

      let currentStreak = 0;
      if (currentDayNumber >= 1) {
        let checkDay = doneSet.has(currentDayNumber) ? currentDayNumber : currentDayNumber - 1;
        while (checkDay >= 1 && doneSet.has(checkDay)) {
          currentStreak++;
          checkDay--;
        }
      }

      const penaltyMoney = settings.penaltyEnabled && (settings.penaltyType === 'money' || settings.penaltyType === 'both')
        ? missedDaysCount * (settings.penaltyAmount || 0)
        : 0;
      const penaltyBurpees = settings.penaltyEnabled && (settings.penaltyType === 'burpees' || settings.penaltyType === 'both')
        ? missedDaysCount * (settings.penaltyBurpeesAmount || 0)
        : 0;

      return {
        ...member,
        totalBurpees,
        completedDaysCount,
        missedDaysCount,
        currentStreak,
        penaltyMoney,
        penaltyBurpees,
        isTodayDone: currentDayNumber >= 1 ? doneSet.has(currentDayNumber) : false
      };
    });
  }, [members, completions, currentDayNumber, settings]);

  const activeMemberStats = useMemo(
    () => memberStats.find(m => m.id === activeMember?.id) || null,
    [memberStats, activeMember]
  );

  const totalBankMoney = useMemo(() => memberStats.reduce((s, m) => s + m.penaltyMoney, 0), [memberStats]);
  const totalGroupBurpees = useMemo(() => memberStats.reduce((s, m) => s + m.totalBurpees, 0), [memberStats]);

  const leaderboard = useMemo(() => {
    return [...memberStats].sort((a, b) => {
      if (b.totalBurpees !== a.totalBurpees) return b.totalBurpees - a.totalBurpees;
      return b.currentStreak - a.currentStreak;
    });
  }, [memberStats]);

  const historyDays = useMemo(() => {
    const maxDay = Math.max(currentDayNumber, 1);
    const list = [];
    for (let d = maxDay; d >= 1; d--) {
      list.push({
        dayNumber: d,
        dateStr: addDaysToDateStr(settings.startDate, d - 1),
        isToday: d === currentDayNumber
      });
    }
    return list;
  }, [currentDayNumber, settings.startDate]);

  // Rychlé připojení nového hráče z obrazovky "Kdo jsi?"
  const handleQuickJoinSubmit = async (e) => {
    e.preventDefault();
    const cleanName = quickJoinName.trim();
    if (!cleanName || !user) return;

    const newId = 'm_' + Date.now();
    const newMember = {
      id: newId,
      name: cleanName,
      role: 'player',
      color: quickJoinColor,
      avatarDataUrl: null
    };

    await updateChallengeDoc({
      members: [...members, newMember],
      [`completions.${newId}`]: []
    });

    setCurrentUserId(newId);
    setQuickJoinName('');
    setShowQuickJoinForm(false);
  };

  // Odblokování Admin sekce heslem vůči settings.adminPassword v cloudu
  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (!hasAdminRights) {
      setPasswordError('Tvůj profil nemá roli Admin / Zakladatel. Přepni se na profil s právy Admina.');
      return;
    }
    if (passwordInput === settings.adminPassword) {
      setIsAdminUnlocked(true);
      setPreviewAsPlayer(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Nesprávné heslo administrátora.');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setPreviewAsPlayer(false);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    const trimmed = newPasswordInput.trim();
    if (trimmed.length < 4) return;
    await updateChallengeDoc({
      'settings.adminPassword': trimmed
    });
    setNewPasswordInput('');
    setPasswordSavedNotice(true);
    setTimeout(() => setPasswordSavedNotice(false), 3000);
  };

  // Nahrání vlastního avatara v Profilu -> uložení do cloudu
  const handleOwnAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeMember) return;
    try {
      setUploadError(null);
      const compressed = await compressImageFile(file, 120);
      const updatedMembers = members.map(m =>
        m.id === activeMember.id ? { ...m, avatarDataUrl: compressed } : m
      );
      await updateChallengeDoc({ members: updatedMembers });
    } catch (err) {
      setUploadError(err.message || 'Nepodařilo se nahrát obrázek.');
    }
    e.target.value = '';
  };

  const handleSaveProfileName = async () => {
    if (!activeMember) return;
    const trimmed = profileNameDraft.trim();
    if (!trimmed || trimmed === activeMember.name) return;
    const updatedMembers = members.map(m =>
      m.id === activeMember.id ? { ...m, name: trimmed } : m
    );
    await updateChallengeDoc({ members: updatedMembers });
  };

  // Nahrání avatara v Admin formuláři člena
  const handleAdminModalAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadError(null);
      const compressed = await compressImageFile(file, 120);
      setMemberForm(prev => ({ ...prev, avatarDataUrl: compressed }));
    } catch (err) {
      setUploadError(err.message || 'Nepodařilo se nahrát obrázek.');
    }
    e.target.value = '';
  };

  // Nahrání vlastní ikony výzvy v Administraci -> uložení do cloudu
  const handleCustomIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadError(null);
      const compressed = await compressImageFile(file, 110);
      const newIcon = {
        id: 'ico_' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18) || 'Vlastní ikona',
        dataUrl: compressed
      };
      const nextIcons = [...(settings.customIcons || []), newIcon];
      await updateChallengeDoc({
        'settings.customIcons': nextIcons,
        'settings.selectedIconId': `custom:${newIcon.id}`
      });
    } catch (err) {
      setUploadError(err.message || 'Nepodařilo se nahrát ikonu.');
    }
    e.target.value = '';
  };

  // Správa členů v Administraci
  const openCreateMemberModal = () => {
    setEditingMemberId(null);
    const nextColor = AVATAR_COLORS[members.length % AVATAR_COLORS.length].id;
    setMemberForm({ name: '', color: nextColor, role: 'player', avatarDataUrl: null });
    setMemberModalOpen(true);
  };

  const openEditMemberModal = (member) => {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      color: member.color,
      role: member.role,
      avatarDataUrl: member.avatarDataUrl || null
    });
    setMemberModalOpen(true);
  };

  const handleSaveMemberForm = async (e) => {
    e.preventDefault();
    const cleanName = memberForm.name.trim();
    if (!cleanName) return;

    if (editingMemberId) {
      const updatedMembers = members.map(m => {
        if (m.id !== editingMemberId) return m;
        const finalRole = m.role === 'founder' ? 'founder' : memberForm.role;
        return {
          ...m,
          name: cleanName,
          color: memberForm.color,
          role: finalRole,
          avatarDataUrl: memberForm.avatarDataUrl
        };
      });
      await updateChallengeDoc({ members: updatedMembers });
    } else {
      const newId = 'm_' + Date.now();
      const newMember = {
        id: newId,
        name: cleanName,
        color: memberForm.color,
        role: memberForm.role,
        avatarDataUrl: memberForm.avatarDataUrl
      };
      await updateChallengeDoc({
        members: [...members, newMember],
        [`completions.${newId}`]: []
      });
    }
    setMemberModalOpen(false);
    setEditingMemberId(null);
  };

  const toggleMemberAdminRole = async (memberId) => {
    const updatedMembers = members.map(m => {
      if (m.id !== memberId || m.role === 'founder') return m;
      return { ...m, role: m.role === 'admin' ? 'player' : 'admin' };
    });
    await updateChallengeDoc({ members: updatedMembers });
  };

  const handleDeleteMember = async (id) => {
    const target = members.find(m => m.id === id);
    if (!target || target.role === 'founder' || members.length <= 1) return;

    const nextMembers = members.filter(m => m.id !== id);
    const nextCompletions = { ...completions };
    delete nextCompletions[id];

    await updateChallengeDoc({
      members: nextMembers,
      completions: nextCompletions
    });

    if (currentUserId === id) {
      setCurrentUserId(nextMembers[0]?.id || '');
    }
    setConfirmDeleteId(null);
  };

  // Reset celé výzvy v databázi do výchozího stavu
  const handleFactoryReset = async () => {
    if (!user) return;
    const challengeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'anglicak_challenges', roomId);
    const freshState = createDefaultChallengeState(todayStr);
    await setDoc(challengeDocRef, freshState);
    setIsAdminUnlocked(false);
    setPreviewAsPlayer(false);
    setCurrentUserId('m1');
    setConfirmResetOpen(false);
    setActiveTab('today');
  };

  // Sdílení odkazu na výzvu
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  }, [roomId]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSwitchRoom = (e) => {
    e.preventDefault();
    const cleaned = customRoomInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleaned) return;
    setRoomId(cleaned);
    setCurrentUserId('');
    setIsAdminUnlocked(false);
    setCustomRoomInput('');
    setShareModalOpen(false);
  };

  const dailyQuote = DAILY_QUOTES[Math.max(0, currentDayNumber - 1) % DAILY_QUOTES.length];
  const isAdminStudioActive = activeTab === 'profile' && hasAdminRights && isAdminUnlocked && !previewAsPlayer;

  // Načítací obrazovka při prvním připojení ke cloudu
  if (!authReady || (!cloudData && syncStatus === 'connecting')) {
    return (
      <div className={isDark ? 'dark' : ''} style={dynamicColorVars}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div
            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h1 className="text-xl font-extrabold">Připojuji Angličák Challenge...</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
            Synchronizuji data týmu s cloudem v reálném čase.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // UVÍTACÍ OBRAZOVKA NA NOVÉM MOBILU: "KDO JSI?"
  // ============================================================================
  if (!activeMember && members.length > 0) {
    return (
      <div className={isDark ? 'dark' : ''} style={dynamicColorVars}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md"
              >
                <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live výzva • Místnost: {roomId}
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Kdo jsi?
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Vyber svůj profil na tomto zařízení, nebo se přidej do výzvy jako nový hráč.
              </p>
            </div>

            <div className="space-y-2.5">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => setCurrentUserId(member.id)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar member={member} sizeClass="w-11 h-11 text-sm" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{member.name}</span>
                        {(member.role === 'founder' || member.role === 'admin') && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {member.role === 'founder' ? 'Zakladatel výzvy' : member.role === 'admin' ? 'Administrátor' : 'Hráč'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{ color: 'var(--primary)' }}
                    className="text-xs font-extrabold group-hover:translate-x-0.5 transition-transform"
                  >
                    Vybrat →
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {!showQuickJoinForm ? (
                <button
                  type="button"
                  onClick={() => setShowQuickJoinForm(true)}
                  className="w-full py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:border-slate-400 flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Nejsem v seznamu – připojit se jako nový hráč
                </button>
              ) : (
                <form onSubmit={handleQuickJoinSubmit} className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">Nový hráč</span>
                    <button
                      type="button"
                      onClick={() => setShowQuickJoinForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Tvoje jméno nebo přezdívka..."
                    value={quickJoinName}
                    onChange={(e) => setQuickJoinName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5">
                    {AVATAR_COLORS.map(col => (
                      <button
                        type="button"
                        key={col.id}
                        onClick={() => setQuickJoinColor(col.id)}
                        style={{ backgroundColor: col.hex }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${
                          quickJoinColor === col.id ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-70'
                        }`}
                      >
                        {quickJoinColor === col.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold"
                  >
                    Vstoupit do výzvy
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDark ? 'dark' : ''} style={dynamicColorVars}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 pb-24 md:pb-10">

        {/* Motivační toast po splnění */}
        {celebrationMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
              className="font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5"
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>{celebrationMsg}</span>
            </div>
          </div>
        )}

        {/* Chybová hláška sítě */}
        {syncErrorMsg && (
          <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-bold text-center">
            {syncErrorMsg}
          </div>
        )}

        {/* Lišta při zapnutém "Náhled jako Hráč" */}
        {hasAdminRights && isAdminUnlocked && previewAsPlayer && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              Náhled jako běžný Hráč (Admin ovládání je skryté)
            </span>
            <button
              onClick={() => {
                setPreviewAsPlayer(false);
                setActiveTab('profile');
              }}
              className="underline hover:opacity-80 font-extrabold"
            >
              Zpět do Admin sekce
            </button>
          </div>
        )}

        {/* ČISTÁ HORNÍ LIŠTA S INDIKÁTOREM ŽIVÉ SYNCHRONIZACE */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            {/* Logo, název a Live indikátor */}
            <div
              onClick={() => setActiveTab('today')}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <div
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 transition-all"
              >
                <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-base sm:text-lg tracking-tight leading-none text-slate-900 dark:text-white truncate">
                    Angličák <span style={{ color: 'var(--primary)' }}>Challenge</span>
                  </h1>

                  {/* Live cloud indikátor */}
                  {syncStatus === 'live' ? (
                    <span
                      title="Živá synchronizace s cloudem je aktivní"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  ) : syncStatus === 'connecting' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      <Wifi className="w-3 h-3 animate-pulse" />
                    </span>
                  ) : (
                    <span
                      title="Offline / chyba připojení"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-[10px] font-bold text-rose-600 dark:text-rose-400 shrink-0"
                    >
                      <WifiOff className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pravá strana horní lišty: Přihlášený profil na mobilu + tlačítko Sdílet */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShareModalOpen(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors"
                title="Pozvat kamaráda / Sdílet odkaz"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {activeMember && (
                <button
                  onClick={() => setActiveTab('profile')}
                  style={{ borderColor: 'var(--primary-border)' }}
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border transition-all"
                  title="Otevřít profil"
                >
                  <UserAvatar member={activeMember} sizeClass="w-6 h-6 text-[11px]" />
                  <span className="truncate max-w-[95px] sm:max-w-[130px]">{activeMember.name}</span>
                  {(activeMember.role === 'founder' || activeMember.role === 'admin') && (
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* HLAVNÍ OBSAH */}
        <main className="max-w-4xl mx-auto px-4 pt-5 space-y-6">

          {/* Desktop navigace - 4 čisté hráčské záložky */}
          <nav className="hidden md:flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-1">
            {[
              { id: 'today', label: 'Dnes', icon: () => <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-4 h-4" /> },
              { id: 'leaderboard', label: 'Žebříček', icon: Trophy },
              { id: 'history', label: 'Historie', icon: CalendarIcon },
              { id: 'profile', label: 'Profil', icon: User },
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={active ? { backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' } : {}}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* ====================================================================
              HERNÍ REŽIM - ZÁLOŽKA 1: DNES
             ==================================================================== */}
          {activeTab === 'today' && activeMember && (
            <div className="space-y-6 animate-fadeIn">
              {currentDayNumber < 1 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold">Výzva startuje {formatCzechDate(settings.startDate)}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Začíná se za {Math.abs(currentDayNumber) + 1} {Math.abs(currentDayNumber) + 1 === 1 ? 'den' : 'dny'}. Datum startu může upravit Administrátor.
                  </p>
                </div>
              ) : (
                <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div
                    style={{ backgroundColor: 'var(--primary-soft)' }}
                    className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <div
                        style={{
                          backgroundColor: 'var(--primary-soft)',
                          borderColor: 'var(--primary-border)',
                          color: 'var(--primary)'
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-2"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Den {currentDayNumber} • {formatCzechDate(todayStr)}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        <span>Dnešní dávka pro</span>
                        <span style={{ color: 'var(--primary)' }}>{activeMember.name}</span>
                      </h2>
                    </div>

                    {settings.visibleWidgets.streak && (
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/70 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                          <Flame className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aktuální série</div>
                          <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                            {activeMemberStats?.currentStreak || 0} {activeMemberStats?.currentStreak === 1 ? 'den' : (activeMemberStats?.currentStreak >= 2 && activeMemberStats?.currentStreak <= 4 ? 'dny' : 'dní')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Počet angličáků a tlačítko splnění */}
                  <div className="py-7 flex flex-col items-center text-center">
                    <div className="text-7xl sm:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                      {todayTargetBurpees}
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-slate-500 dark:text-slate-400 mt-2">
                      {todayTargetBurpees === 1 ? 'angličák' : (todayTargetBurpees >= 2 && todayTargetBurpees <= 4 ? 'angličáky' : 'angličáků')}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Start od {settings.startCount || 1} ks • +{settings.stepAmount ?? 1} {settings.stepFrequency === 'weekly' ? 'týdně' : 'denně'}
                    </div>

                    {settings.visibleWidgets.penalty && activeMemberStats?.penaltyBurpees > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300 text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        + {activeMemberStats.penaltyBurpees} trestných angličáků za vynechané dny
                      </div>
                    )}

                    <div className="mt-7 w-full max-w-sm">
                      <button
                        onClick={() => toggleDayCompletion(activeMember.id, currentDayNumber)}
                        style={
                          activeMemberStats?.isTodayDone
                            ? {
                                backgroundColor: 'var(--primary-soft)',
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)'
                              }
                            : {
                                backgroundColor: 'var(--primary)',
                                color: 'var(--primary-contrast)',
                                borderColor: 'transparent'
                              }
                        }
                        className="w-full py-4 px-6 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg border-2"
                      >
                        {activeMemberStats?.isTodayDone ? (
                          <>
                            <CheckCircle2 className="w-6 h-6" />
                            <span>Dnes splněno!</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-6 h-6 stroke-[2.5]" />
                            <span>Odkliknout splnění</span>
                          </>
                        )}
                      </button>
                      {activeMemberStats?.isTodayDone && (
                        <p className="text-xs text-slate-400 mt-2">
                          Kliknutím znovu můžeš stav zrušit
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Informační dlaždice */}
              {(settings.visibleWidgets.total || settings.visibleWidgets.penalty) && (
                <div className={`grid grid-cols-1 ${settings.visibleWidgets.total && settings.visibleWidgets.penalty ? 'sm:grid-cols-2' : ''} gap-4`}>
                  {settings.visibleWidgets.total && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-sm">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Celkem odcvičeno ({activeMember.name})
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                          {activeMemberStats?.totalBurpees || 0} <span className="text-sm font-bold text-slate-400">ks</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Splněno {activeMemberStats?.completedDaysCount || 0} z {Math.max(1, currentDayNumber)} dnů
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'var(--primary-soft)',
                          borderColor: 'var(--primary-border)',
                          color: 'var(--primary)'
                        }}
                        className="w-12 h-12 rounded-2xl border flex items-center justify-center"
                      >
                        <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-6 h-6" />
                      </div>
                    </div>
                  )}

                  {settings.visibleWidgets.penalty && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-sm">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Tresty & Společný bank
                        </div>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                          {settings.penaltyEnabled ? (
                            settings.penaltyType === 'burpees'
                              ? `+${activeMemberStats?.penaltyBurpees || 0} ks`
                              : `${activeMemberStats?.penaltyMoney || 0} Kč`
                          ) : 'Vypnuto'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {settings.penaltyEnabled
                            ? `Vynecháno: ${activeMemberStats?.missedDaysCount || 0} d • Bank týmu: ${totalBankMoney} Kč`
                            : 'Tresty nejsou v této výzvě aktivní'}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400 flex items-center justify-center">
                        <Coins className="w-6 h-6" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Citát dne */}
              {settings.visibleWidgets.quote && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex items-start gap-3.5 shadow-sm">
                  <div
                    style={{
                      backgroundColor: 'var(--primary-soft)',
                      borderColor: 'var(--primary-border)',
                      color: 'var(--primary)'
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <Quote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Citát dne</div>
                    <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 mt-0.5 italic">
                      „{dailyQuote}“
                    </p>
                  </div>
                </div>
              )}

              {/* Přehled týmu dnes (živě synchronizovaný) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Users style={{ color: 'var(--primary)' }} className="w-5 h-5" />
                    Stav týmu dnes
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {memberStats.filter(m => m.isTodayDone).length} / {members.length} splněno
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {memberStats.map(member => (
                    <div
                      key={member.id}
                      style={
                        member.isTodayDone
                          ? { backgroundColor: 'var(--primary-soft)', borderColor: 'var(--primary-border)' }
                          : {}
                      }
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        member.isTodayDone
                          ? ''
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar member={member} sizeClass="w-11 h-11 text-sm" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                            <span className="truncate">{member.name}</span>
                            {member.id === activeMember.id && (
                              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                Ty
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Série: <strong className="text-slate-800 dark:text-slate-200">{member.currentStreak}d</strong></span>
                            <span>•</span>
                            <span>Celkem: <strong className="text-slate-800 dark:text-slate-200">{member.totalBurpees}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div
                        style={member.isTodayDone ? { color: 'var(--primary)' } : {}}
                        className={`p-2 rounded-xl shrink-0 ${
                          member.isTodayDone ? '' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {member.isTodayDone ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              HERNÍ REŽIM - ZÁLOŽKA 2: ŽEBŘÍČEK
             ==================================================================== */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <span style={{ color: 'var(--primary)' }}>
                      <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-4 h-4" />
                    </span>
                    Týmové angličáky
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {totalGroupBurpees}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-sky-500" />
                    Aktuální den
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {Math.max(1, currentDayNumber)}.
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    Společný bank
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {totalBankMoney} Kč
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Pořadí hráčů
                </h2>

                {leaderboard.map((member, index) => {
                  const maxPossibleDays = Math.max(1, currentDayNumber);
                  const completionRate = Math.min(100, Math.round((member.completedDaysCount / maxPossibleDays) * 100));

                  return (
                    <div
                      key={member.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center shrink-0 ${
                            index === 0 ? 'bg-amber-400 text-slate-950' :
                            index === 1 ? 'bg-slate-300 text-slate-950' :
                            index === 2 ? 'bg-amber-700 text-white' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {index + 1}.
                          </div>

                          <UserAvatar member={member} sizeClass="w-12 h-12 text-base" />

                          <div className="min-w-0">
                            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.name}</span>
                              {index === 0 && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Úspěšnost: <span className="text-slate-800 dark:text-slate-200 font-semibold">{completionRate} %</span> ({member.completedDaysCount} z {maxPossibleDays} dnů)
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div style={{ color: 'var(--primary)' }} className="text-2xl font-black">{member.totalBurpees}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">angličáků</div>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${completionRate}%`, backgroundColor: 'var(--primary)' }}
                          className="h-full transition-all duration-500 rounded-full"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-2.5 text-center border border-slate-200/70 dark:border-slate-800/60">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Série</div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 flex items-center justify-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {member.currentStreak} d
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-2.5 text-center border border-slate-200/70 dark:border-slate-800/60">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Vynecháno</div>
                          <div className={`font-bold text-sm mt-0.5 ${member.missedDaysCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {member.missedDaysCount} {member.missedDaysCount === 1 ? 'den' : 'dnů'}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-2.5 text-center border border-slate-200/70 dark:border-slate-800/60">
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Tresty</div>
                          <div className={`font-bold text-sm mt-0.5 ${
                            (member.penaltyMoney > 0 || member.penaltyBurpees > 0) ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {!settings.penaltyEnabled ? 'Vypnuto' : (
                              settings.penaltyType === 'money' ? `${member.penaltyMoney} Kč` :
                              settings.penaltyType === 'burpees' ? `+${member.penaltyBurpees} ks` :
                              `${member.penaltyMoney} Kč / +${member.penaltyBurpees}`
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====================================================================
              HERNÍ REŽIM - ZÁLOŽKA 3: HISTORIE DNŮ
             ==================================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Historie a zpětné doplnění</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hasAdminRights && isAdminUnlocked && !previewAsPlayer
                    ? 'Jako Admin můžeš kliknutím upravit splnění u kteréhokoliv hráče.'
                    : 'Kliknutím u svého jména můžeš zpětně doplnit zapomenutý den.'}
                </p>
              </div>

              {currentDayNumber < 1 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400">
                  Výzva ještě nezačala, historie je zatím prázdná.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyDays.map(dayObj => {
                    const dayTarget = getTargetBurpeesForDay(dayObj.dayNumber, settings);
                    const allDone = members.every(m => {
                      const arr = Array.isArray(completions[m.id]) ? completions[m.id] : [];
                      return arr.includes(dayObj.dayNumber);
                    });

                    return (
                      <div
                        key={dayObj.dayNumber}
                        style={dayObj.isToday ? { borderColor: 'var(--primary)' } : {}}
                        className={`p-4 rounded-2xl border transition-all ${
                          dayObj.isToday
                            ? 'bg-white dark:bg-slate-900 shadow-sm'
                            : 'bg-white/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              style={
                                dayObj.isToday
                                  ? { backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }
                                  : allDone
                                  ? { backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'var(--primary-border)' }
                                  : {}
                              }
                              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${
                                dayObj.isToday || allDone
                                  ? 'border'
                                  : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <span className="text-[10px] uppercase leading-none opacity-80">Den</span>
                              <span className="text-lg leading-tight">{dayObj.dayNumber}</span>
                            </div>

                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{dayTarget} {dayTarget === 1 ? 'angličák' : (dayTarget >= 2 && dayTarget <= 4 ? 'angličáky' : 'angličáků')}</span>
                                {dayObj.isToday && (
                                  <span
                                    style={{
                                      backgroundColor: 'var(--primary-soft)',
                                      color: 'var(--primary)',
                                      borderColor: 'var(--primary-border)'
                                    }}
                                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                                  >
                                    Dnes
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{formatCzechDate(dayObj.dateStr)}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {members.map(member => {
                              const arr = Array.isArray(completions[member.id]) ? completions[member.id] : [];
                              const isDone = arr.includes(dayObj.dayNumber);
                              const canToggle = member.id === activeMember?.id || (hasAdminRights && isAdminUnlocked && !previewAsPlayer);

                              return (
                                <button
                                  key={member.id}
                                  disabled={!canToggle}
                                  onClick={() => canToggle && toggleDayCompletion(member.id, dayObj.dayNumber)}
                                  style={
                                    isDone
                                      ? {
                                          backgroundColor: 'var(--primary-soft)',
                                          color: 'var(--primary)',
                                          borderColor: 'var(--primary-border)'
                                        }
                                      : {}
                                  }
                                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                    isDone
                                      ? ''
                                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  } ${canToggle ? 'hover:opacity-90 cursor-pointer' : 'opacity-75 cursor-default'}`}
                                >
                                  <UserAvatar member={member} sizeClass="w-5 h-5 text-[10px]" />
                                  <span>{member.name}</span>
                                  {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====================================================================
              HERNÍ REŽIM - ZÁLOŽKA 4: PROFIL + SEKCE ADMINISTRÁTOR NA KONCI
             ==================================================================== */}
          {activeTab === 'profile' && activeMember && (
            <div className="space-y-6 animate-fadeIn">

              {/* Karta profilu hráče: Vlastní avatar a jméno */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Můj profil</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Uprav si přezdívku a nahraj profilovou fotku – uvidí ji všichni ve skupině.
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    activeMember.role === 'founder'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : activeMember.role === 'admin'
                      ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {activeMember.role === 'founder' && <><Crown className="w-3.5 h-3.5" /> Zakladatel</>}
                    {activeMember.role === 'admin' && <><ShieldCheck className="w-3.5 h-3.5" /> Admin</>}
                    {activeMember.role === 'player' && <><User className="w-3.5 h-3.5" /> Hráč</>}
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    {uploadError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative group">
                    <UserAvatar member={activeMember} sizeClass="w-20 h-20 text-2xl" />
                    <button
                      type="button"
                      onClick={() => profileAvatarInputRef.current?.click()}
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      title="Nahrát vlastní avatar"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={profileAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleOwnAvatarUpload}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Jméno / Přezdívka
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={profileNameDraft}
                          onChange={(e) => setProfileNameDraft(e.target.value)}
                          onBlur={handleSaveProfileName}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveProfileName()}
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                        {profileNameDraft.trim() !== activeMember.name && (
                          <button
                            type="button"
                            onClick={handleSaveProfileName}
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                            className="px-3.5 py-2 rounded-xl text-xs font-extrabold shrink-0"
                          >
                            Uložit
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => profileAvatarInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Nahrát vlastní avatar
                      </button>

                      {activeMember.avatarDataUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            const updatedMembers = members.map(m =>
                              m.id === activeMember.id ? { ...m, avatarDataUrl: null } : m
                            );
                            await updateChallengeDoc({ members: updatedMembers });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Odstranit fotku
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Přepnutí hráče na tomto zařízení */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Přepnout hráče na tomto mobilu</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Uloženo lokálně jen pro toto zařízení</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentUserId('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Odhlásit výběr
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const selected = m.id === activeMember.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCurrentUserId(m.id)}
                        style={selected ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-soft)' } : {}}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          selected
                            ? 'text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <UserAvatar member={m} sizeClass="w-6 h-6 text-[10px]" />
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sdílení výzvy s kamarády */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Share2 style={{ color: 'var(--primary)' }} className="w-4 h-4" />
                    Pozvat kamaráda do výzvy
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pošli kamarádovi odkaz nebo kód místnosti (<strong className="font-mono">{roomId}</strong>), ať se připojí ze svého mobilu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 shadow-sm hover:opacity-95"
                >
                  <Share2 className="w-4 h-4" />
                  Sdílet výzvu
                </button>
              </div>

              {/* Kompaktní jednořádkový přepínač světlého/tmavého režimu */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Režim zobrazení</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Osobní nastavení pro toto zařízení</p>
                </div>

                <div className="inline-flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                  {[
                    { id: 'light', label: 'Světlý', Icon: Sun },
                    { id: 'dark', label: 'Tmavý', Icon: Moon },
                    { id: 'system', label: 'Telefon', Icon: Smartphone },
                    { id: 'twilight', label: 'Soumrak', Icon: Sunset }
                  ].map(opt => {
                    const active = themeMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setThemeMode(opt.id)}
                        style={active ? { backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' } : {}}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          active
                            ? 'shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <opt.Icon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ================================================================
                  SEKCE ADMINISTRÁTOR ÚPLNĚ NA KONCI PROFILU (CHRÁNĚNO HESLEM)
                 ================================================================ */}
              <div className="pt-2">
                {!isAdminStudioActive ? (
                  <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Administrátor
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Zadejte heslo pro otevření administrátorského prostředí.
                          </p>
                        </div>
                      </div>

                      {hasAdminRights && previewAsPlayer && isAdminUnlocked && (
                        <button
                          type="button"
                          onClick={() => setPreviewAsPlayer(false)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold"
                        >
                          Otevřít Admin
                        </button>
                      )}
                    </div>

                    {!hasAdminRights ? (
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                        Aktuální profil <strong className="text-slate-900 dark:text-white">{activeMember.name}</strong> nemá přidělenou roli Admin. Pro správu výzvy se přepněte na profil Zakladatele nebo jiného Admina.
                      </div>
                    ) : (
                      <form onSubmit={handleUnlockAdmin} className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="relative flex-1">
                            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="password"
                              value={passwordInput}
                              onChange={(e) => {
                                setPasswordInput(e.target.value);
                                if (passwordError) setPasswordError('');
                              }}
                              placeholder="Zadejte heslo administrátora..."
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                          >
                            <Unlock className="w-4 h-4" />
                            Odemknout Admin
                          </button>
                        </div>

                        {passwordError && (
                          <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            {passwordError}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400">
                          Výchozí heslo: <code className="font-mono font-bold text-slate-600 dark:text-slate-300">admin123</code> (lze změnit uvnitř Admin sekce).
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* Hlavička odemčeného Admin studia */}
                    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Administrátorské prostředí • Odemčeno
                          </div>
                          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                            Správa výzvy, členů a vzhledu
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewAsPlayer(true);
                            setActiveTab('today');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Náhled jako Hráč
                        </button>

                        <button
                          type="button"
                          onClick={handleLockAdmin}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Zamknout Admin režim
                        </button>
                      </div>
                    </div>

                    {/* Sub-navigace v Admin prostředí */}
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      {[
                        { id: 'members', label: 'Členové & Práva', Icon: Users },
                        { id: 'rules', label: 'Pravidla & Tresty', Icon: AlertTriangle },
                        { id: 'brand', label: 'Barvy, Ikony & Dlaždice', Icon: Palette },
                      ].map(sub => {
                        const active = adminSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setAdminSubTab(sub.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                              active
                                ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <sub.Icon className="w-4 h-4" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* ADMIN SEKCE 1: SPRÁVA ČLENŮ & UDĚLOVÁNÍ PRÁV */}
                    {adminSubTab === 'members' && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Členové a oprávnění</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Přidávej hráče, uděluj práva Admina a upravuj profily v cloudu.
                            </p>
                          </div>
                          <button
                            onClick={openCreateMemberModal}
                            style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity self-start sm:self-auto"
                          >
                            <UserPlus className="w-4 h-4" />
                            Přidat člena
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {members.map(member => (
                            <div
                              key={member.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <UserAvatar member={member} sizeClass="w-11 h-11 text-sm" />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                    <span className="truncate">{member.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {member.role === 'founder' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                        <Crown className="w-3 h-3" /> Hlavní Admin (Zakladatel)
                                      </span>
                                    )}
                                    {member.role === 'admin' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                                        <ShieldCheck className="w-3 h-3" /> Admin
                                      </span>
                                    )}
                                    {member.role === 'player' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <User className="w-3 h-3" /> Hráč (Herní režim)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {member.role !== 'founder' && (
                                  <button
                                    onClick={() => toggleMemberAdminRole(member.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                                      member.role === 'admin'
                                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                                    }`}
                                    title="Přepnout práva Admin / Hráč"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                    {member.role === 'admin' ? 'Odebrat Admina' : 'Udělit Admina'}
                                  </button>
                                )}

                                <button
                                  onClick={() => openEditMemberModal(member)}
                                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                                  title="Upravit profil člena"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {member.role !== 'founder' && members.length > 1 && (
                                  confirmDeleteId === member.id ? (
                                    <div className="flex items-center gap-1 bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-500/40 rounded-xl px-2 py-1">
                                      <button
                                        onClick={() => handleDeleteMember(member.id)}
                                        className="text-xs font-bold text-rose-700 dark:text-rose-300 px-1.5"
                                      >
                                        Smazat
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-xs text-slate-600 dark:text-slate-400 px-1"
                                      >
                                        Ne
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(member.id)}
                                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                                      title="Odebrat člena"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ADMIN SEKCE 2: PRAVIDLA, TRESTY & HESLO */}
                    {adminSubTab === 'rules' && (
                      <div className="space-y-6">
                        {/* Nastavení průběhu a obtížnosti výzvy */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Průběh a náročnost výzvy</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Nastav, s jakým počtem se začíná a jak rychle dávka poroste (denně nebo týdně).
                            </p>
                          </div>

                          {/* Počáteční počet (od 1, od 2, od 5, vlastní) */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                              Počáteční dávka v 1. den výzvy
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {[1, 2, 5, 10].map(presetVal => {
                                const active = (settings.startCount || 1) === presetVal;
                                return (
                                  <button
                                    key={presetVal}
                                    type="button"
                                    onClick={() => updateChallengeDoc({ 'settings.startCount': presetVal })}
                                    style={
                                      active
                                        ? { backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)', borderColor: 'transparent' }
                                        : {}
                                    }
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                                      active
                                        ? 'shadow-sm'
                                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                    }`}
                                  >
                                    Od {presetVal}
                                  </button>
                                );
                              })}

                              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5">
                                <span className="text-xs font-bold text-slate-500">Vlastní:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="500"
                                  value={settings.startCount || 1}
                                  onChange={(e) => updateChallengeDoc({ 'settings.startCount': Math.max(1, Number(e.target.value)) })}
                                  className="w-16 bg-transparent text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Frekvence navyšování: Denně vs. Týdně */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Frekvence přidávání
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: 'daily', label: 'Denně' },
                                  { id: 'weekly', label: 'Týdně (po 7 dnech)' }
                                ].map(freq => {
                                  const active = (settings.stepFrequency || 'daily') === freq.id;
                                  return (
                                    <button
                                      key={freq.id}
                                      type="button"
                                      onClick={() => updateChallengeDoc({ 'settings.stepFrequency': freq.id })}
                                      style={
                                        active
                                          ? { backgroundColor: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                                          : {}
                                      }
                                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                        active
                                          ? ''
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {freq.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                O kolik cviků navýšit
                              </label>
                              <div className="flex items-center gap-2">
                                {[1, 2, 5].map(stepVal => {
                                  const active = (settings.stepAmount ?? 1) === stepVal;
                                  return (
                                    <button
                                      key={stepVal}
                                      type="button"
                                      onClick={() => updateChallengeDoc({ 'settings.stepAmount': stepVal })}
                                      style={
                                        active
                                          ? { backgroundColor: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }
                                          : {}
                                      }
                                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                        active
                                          ? ''
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      +{stepVal}
                                    </button>
                                  );
                                })}
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={settings.stepAmount ?? 1}
                                  onChange={(e) => updateChallengeDoc({ 'settings.stepAmount': Math.max(0, Number(e.target.value)) })}
                                  className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none"
                                  title="Vlastní přírůstek"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Živý náhled průběhu */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-900 dark:text-white">Ukázka plánu: </span>
                            Den 1 = <strong>{getTargetBurpeesForDay(1, settings)} ks</strong>,{' '}
                            Den 2 = <strong>{getTargetBurpeesForDay(2, settings)} ks</strong>,{' '}
                            Den 7 = <strong>{getTargetBurpeesForDay(7, settings)} ks</strong>,{' '}
                            Den 8 = <strong>{getTargetBurpeesForDay(8, settings)} ks</strong>,{' '}
                            Den 15 = <strong>{getTargetBurpeesForDay(15, settings)} ks</strong>.
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Datum začátku výzvy</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Určuje aktuální den výzvy pro celý tým.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <input
                              type="date"
                              value={settings.startDate}
                              onChange={(e) => e.target.value && updateChallengeDoc({ 'settings.startDate': e.target.value })}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              onClick={() => updateChallengeDoc({ 'settings.startDate': todayStr })}
                              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors self-start sm:self-auto"
                            >
                              Nastavit dnešek jako Den 1
                            </button>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Tresty za nesplněný den
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Automatický výpočet sankcí za vynechané dny pro celý tým.
                              </p>
                            </div>
                            <button
                              onClick={() => updateChallengeDoc({ 'settings.penaltyEnabled': !settings.penaltyEnabled })}
                              style={settings.penaltyEnabled ? { backgroundColor: 'var(--primary)' } : {}}
                              className={`w-12 h-7 rounded-full transition-colors p-1 ${
                                settings.penaltyEnabled ? '' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                settings.penaltyEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {settings.penaltyEnabled && (
                            <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Typ trestu</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {[
                                    { id: 'money', label: 'Pokuta do banku (Kč)' },
                                    { id: 'burpees', label: 'Angličáky navíc' },
                                    { id: 'both', label: 'Obojí dohromady' }
                                  ].map(opt => (
                                    <button
                                      key={opt.id}
                                      onClick={() => updateChallengeDoc({ 'settings.penaltyType': opt.id })}
                                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                        settings.penaltyType === opt.id
                                          ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500 dark:text-amber-300'
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(settings.penaltyType === 'money' || settings.penaltyType === 'both') && (
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                      Pokuta za 1 vynechaný den (Kč)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="10"
                                      value={settings.penaltyAmount}
                                      onChange={(e) => updateChallengeDoc({ 'settings.penaltyAmount': Math.max(0, Number(e.target.value)) })}
                                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                )}

                                {(settings.penaltyType === 'burpees' || settings.penaltyType === 'both') && (
                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                      Trestné angličáky za 1 vynechaný den
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="5"
                                      value={settings.penaltyBurpeesAmount}
                                      onChange={(e) => updateChallengeDoc({ 'settings.penaltyBurpeesAmount': Math.max(0, Number(e.target.value)) })}
                                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Změna hesla administrátora */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3 shadow-sm">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Heslo do Admin sekce</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Nastavte vlastní heslo (min. 4 znaky) uložené v cloudu pro celý tým.
                            </p>
                          </div>
                          <form onSubmit={handleChangeAdminPassword} className="flex flex-col sm:flex-row gap-2.5">
                            <input
                              type="password"
                              minLength={4}
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              placeholder="Nové heslo administrátora..."
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
                            />
                            <button
                              type="submit"
                              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                              className="px-4 py-2.5 rounded-xl text-xs font-extrabold transition-opacity hover:opacity-95 shrink-0"
                            >
                              Uložit nové heslo
                            </button>
                          </form>
                          {passwordSavedNotice && (
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Heslo administrátora bylo úspěšně změněno.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ADMIN SEKCE 3: GLOBÁLNÍ BARVY, VLASTNÍ IKONY & DLAŽDICE */}
                    {adminSubTab === 'brand' && (
                      <div className="space-y-6">

                        {/* Vlastní barevná paleta celé aplikace */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Barevné schéma aplikace</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Vyber předvolenou barvu nebo namíchej vlastní odstín – propíše se všem hráčům.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            {PRESET_ACCENTS.map(preset => {
                              const active = primaryColorHex.toLowerCase() === preset.hex.toLowerCase();
                              return (
                                <button
                                  key={preset.id}
                                  onClick={() => updateChallengeDoc({ 'settings.primaryColorHex': preset.hex })}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                    active
                                      ? 'bg-slate-900 text-white dark:bg-slate-800 border-slate-900 dark:border-white shadow-sm'
                                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                  }`}
                                >
                                  <span
                                    style={{ backgroundColor: preset.hex }}
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                                  >
                                    {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </span>
                                  <span>{preset.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 cursor-pointer hover:border-slate-400 transition-colors">
                              <input
                                type="color"
                                value={primaryColorHex}
                                onChange={(e) => updateChallengeDoc({ 'settings.primaryColorHex': e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                              />
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Vlastní barva</span>
                            </label>

                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
                              <span className="text-xs font-bold text-slate-400">HEX</span>
                              <input
                                type="text"
                                maxLength={7}
                                value={primaryColorHex.toUpperCase()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val) && val.length === 7) {
                                    updateChallengeDoc({ 'settings.primaryColorHex': val });
                                  }
                                }}
                                className="w-20 bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Výběr hlavní ikony + nahrání vlastních ikon */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Hlavní ikona výzvy</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Zvol výchozí ikonu nebo nahraj vlastní obrázky/ikony ze svého zařízení.
                              </p>
                            </div>

                            <div>
                              <button
                                type="button"
                                onClick={() => customIconInputRef.current?.click()}
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
                              >
                                <Upload className="w-4 h-4" />
                                Nahrát vlastní ikonu
                              </button>
                              <input
                                ref={customIconInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCustomIconUpload}
                                className="hidden"
                              />
                            </div>
                          </div>

                          {uploadError && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                              {uploadError}
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Vestavěné ikony</div>
                            <div className="grid grid-cols-5 gap-2">
                              {BUILTIN_ICONS.map(opt => {
                                const active = settings.selectedIconId === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => updateChallengeDoc({ 'settings.selectedIconId': opt.id })}
                                    style={
                                      active
                                        ? {
                                            backgroundColor: 'var(--primary-soft)',
                                            borderColor: 'var(--primary)',
                                            color: 'var(--primary)'
                                          }
                                        : {}
                                    }
                                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                      active
                                        ? 'font-bold'
                                        : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                  >
                                    <opt.Icon className="w-5 h-5" />
                                    <span className="text-[11px]">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Nahrané ikony v cloudu ({(settings.customIcons || []).length})
                            </div>

                            {(!settings.customIcons || settings.customIcons.length === 0) ? (
                              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                                Zatím nebyla nahrána žádná vlastní ikona.
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                                {settings.customIcons.map(ico => {
                                  const key = `custom:${ico.id}`;
                                  const active = settings.selectedIconId === key;
                                  return (
                                    <div
                                      key={ico.id}
                                      onClick={() => updateChallengeDoc({ 'settings.selectedIconId': key })}
                                      style={
                                        active
                                          ? {
                                              backgroundColor: 'var(--primary-soft)',
                                              borderColor: 'var(--primary)'
                                            }
                                          : {}
                                      }
                                      className={`relative group p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                                        active
                                          ? 'font-bold'
                                          : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      <img src={ico.dataUrl} alt={ico.name} className="w-8 h-8 object-contain rounded" />
                                      <span className="text-[10px] truncate w-full text-center text-slate-700 dark:text-slate-300">
                                        {ico.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const filtered = settings.customIcons.filter(item => item.id !== ico.id);
                                          await updateChallengeDoc({
                                            'settings.customIcons': filtered,
                                            ...(settings.selectedIconId === key ? { 'settings.selectedIconId': 'flame' } : {})
                                          });
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        title="Smazat ikonu"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Viditelnost dlaždic na hlavní obrazovce */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <LayoutGrid style={{ color: 'var(--primary)' }} className="w-5 h-5" />
                              Dlaždice na hlavní obrazovce
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Urči, jaké informační karty se zobrazí všem hráčům na obrazovce Dnes.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { key: 'streak', label: 'Série dní (Streak)', desc: 'Počet dnů v řadě bez přerušení' },
                              { key: 'total', label: 'Celkem odcvičeno', desc: 'Součet všech odcvičených kusů' },
                              { key: 'penalty', label: 'Karta s tresty a bankem', desc: 'Přehled pokut a trestných angličáků' },
                              { key: 'quote', label: 'Motivační citát dne', desc: 'Krátký citát na úvodní obrazovce' }
                            ].map(tile => {
                              const enabled = !!settings.visibleWidgets[tile.key];
                              return (
                                <div
                                  key={tile.key}
                                  onClick={() => updateChallengeDoc({ [`settings.visibleWidgets.${tile.key}`]: !enabled })}
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                >
                                  <div className="pr-3">
                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{tile.label}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{tile.desc}</div>
                                  </div>
                                  <button
                                    type="button"
                                    style={enabled ? { backgroundColor: 'var(--primary)' } : {}}
                                    className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                                      enabled ? '' : 'bg-slate-300 dark:bg-slate-700'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                      enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Reset celé výzvy v databázi */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">Resetovat výzvu v cloudu</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Vrátí společnou databázi do výchozího stavu.</div>
                          </div>

                          {confirmResetOpen ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleFactoryReset}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold"
                              >
                                Ano, resetovat
                              </button>
                              <button
                                onClick={() => setConfirmResetOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                              >
                                Zrušit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmResetOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset výzvy
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* SPODNÍ MOBILNÍ NAVIGACE - 4 čisté hráčské záložky */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around">
          {[
            { id: 'today', label: 'Dnes', icon: () => <ChallengeLogoIcon selectedIconId={settings.selectedIconId} customIcons={settings.customIcons} className="w-5 h-5" /> },
            { id: 'leaderboard', label: 'Žebříček', icon: Trophy },
            { id: 'history', label: 'Historie', icon: CalendarIcon },
            { id: 'profile', label: 'Profil', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={active ? { color: 'var(--primary)' } : {}}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[11px] font-bold transition-colors ${
                  active ? '' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className="mb-0.5"><Icon className="w-5 h-5" /></div>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* MODÁL PRO SDÍLENÍ ODKAZU / KÓDU MÍSTNOSTI */}
        {shareModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 style={{ color: 'var(--primary)' }} className="w-5 h-5" />
                  Pozvat kamarády
                </h3>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pošli tento odkaz kamarádům. Když ho otevřou na svém mobilu, vyberou si svůj profil (nebo se přidají) a uvidíte své výsledky živě.
                </p>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent text-xs font-mono text-slate-700 dark:text-slate-300 px-2 focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                    className="px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Zkopírováno!' : 'Kopírovat'}
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>Aktivní místnost:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {roomId}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSwitchRoom} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Připojit se do jiné místnosti (nebo založit novou)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Např. parta-liberec..."
                    value={customRoomInput}
                    onChange={(e) => setCustomRoomInput(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-extrabold shrink-0"
                  >
                    Přejít
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODÁL PRO PŘIDÁNÍ / ÚPRAVU ČLENA V ADMINISTRACI */}
        {memberModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingMemberId ? 'Upravit člena' : 'Nový člen týmu'}
                </h3>
                <button
                  onClick={() => setMemberModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMemberForm} className="space-y-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    member={{ name: memberForm.name || '?', color: memberForm.color, avatarDataUrl: memberForm.avatarDataUrl }}
                    sizeClass="w-16 h-16 text-lg"
                  />
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => adminMemberAvatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Nahrát fotku / avatar
                    </button>
                    {memberForm.avatarDataUrl && (
                      <button
                        type="button"
                        onClick={() => setMemberForm(prev => ({ ...prev, avatarDataUrl: null }))}
                        className="block text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Odebrat nahraný obrázek
                      </button>
                    )}
                    <input
                      ref={adminMemberAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAdminModalAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Jméno nebo přezdívka</label>
                  <input
                    type="text"
                    required
                    placeholder="Např. Petr, Honza..."
                    value={memberForm.name}
                    onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Barva iniciál (pokud nemá fotku)</label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_COLORS.map(col => (
                      <button
                        type="button"
                        key={col.id}
                        onClick={() => setMemberForm(prev => ({ ...prev, color: col.id }))}
                        style={{ backgroundColor: col.hex, color: getContrastText(col.hex) }}
                        className={`h-9 rounded-xl flex items-center justify-center transition-transform ${
                          memberForm.color === col.id ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        {memberForm.color === col.id && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {(!editingMemberId || members.find(m => m.id === editingMemberId)?.role !== 'founder') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Oprávnění v aplikaci</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMemberForm(prev => ({ ...prev, role: 'player' }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          memberForm.role === 'player'
                            ? 'bg-slate-900 text-white dark:bg-slate-800 border-slate-900 dark:border-white'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        Hráč (Herní režim)
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberForm(prev => ({ ...prev, role: 'admin' }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          memberForm.role === 'admin'
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Admin (Plná práva)
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-contrast)' }}
                    className="flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-opacity hover:opacity-95"
                  >
                    {editingMemberId ? 'Uložit změny' : 'Přidat člena'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
