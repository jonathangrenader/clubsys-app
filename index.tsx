// --- CORRECCION V0 ---
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    writeBatch
} from "firebase/firestore";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDjoNwDZsDklD_tuUCjsUxmRGL7gcNAJQY",
  authDomain: "clubsys-app.firebaseapp.com",
  projectId: "clubsys-app",
  storageBucket: "clubsys-app.firebasestorage.app",
  messagingSenderId: "758775607643",
  appId: "1:758775607643:web:38abcda3e40086dc272a7e",
  measurementId: "G-493HJXPHVM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ORIGINAL MOCK DATA FOR SEEDING ---
const mockDatabaseSeed = {
    users: [
        // The user documents are now primarily identified by email for simplicity in seeding
        // The actual documents in Firestore will use the Firebase Auth UID as the document ID
        { email: 'super_admin', role: 'super_admin', name: 'Super Admin', initial: 'S' },
        { email: 'demo_club', role: 'club', name: 'Club "El Progreso"', initial: 'C' },
        { email: 'demo_instructor', role: 'instructor', name: 'Juan Perez', initial: 'J', clubId: 'demo_club', instructorId: 'i2' },
    ],
    clubs: {
        'demo_club': {
            name: 'Club "El Progreso"',
            socios: [
                { id: 's101', nombre: 'Ana García', fechaIngreso: '2022-01-15', membresia: 'Premium', estado: 'activo' },
                { id: 's102', nombre: 'Carlos Rodriguez', fechaIngreso: '2021-11-20', membresia: 'Básica', estado: 'activo' },
                { id: 's103', nombre: 'Luisa Martinez', fechaIngreso: '2023-03-10', membresia: 'Familiar', estado: 'inactivo' },
                 { id: 's104', nombre: 'Miguel Hernandez', fechaIngreso: '2024-05-20', membresia: 'Premium', estado: 'activo' },
            ],
            membresias: [
                { id: 'm1', nombre: 'Básica', precio: 30, periodicidad: 'Mensual', descripcion: 'Acceso a instalaciones.' },
                { id: 'm2', nombre: 'Premium', precio: 50, periodicidad: 'Mensual', descripcion: 'Acceso 24/7 y clases.' },
                 { id: 'm3', nombre: 'Familiar', precio: 80, periodicidad: 'Mensual', descripcion: 'Acceso para 4 personas.' },
            ],
            pagos: [
                { id: 'p1', socioId: 's101', socioNombre: 'Ana García', fechaPago: '2024-07-01', monto: 50, membresia: 'Premium', estado: 'pagado' },
                { id: 'p2', socioId: 's102', socioNombre: 'Carlos Rodriguez', fechaPago: '2024-07-05', monto: 30, membresia: 'Básica', estado: 'pagado' },
                 { id: 'p3', socioId: 's104', socioNombre: 'Miguel Hernandez', fechaPago: '2024-07-10', monto: 50, membresia: 'Premium', estado: 'pendiente' },
            ],
            instructores: [
                { id: 'i1', nombre: 'Laura Pausini', especialidad: 'Yoga', telefono: '555-1234', email: 'laura.p@email.com' },
                { id: 'i2', nombre: 'Pedro Infante', especialidad: 'CrossFit', telefono: '555-5678', email: 'pedro.i@email.com' },
            ],
             clases: [
                { id: 'c1', nombre: 'Yoga Avanzado', instructorId: 'i1', horario: 'Lunes y Miércoles 18:00', sociosInscritos: ['s101'] },
                { id: 'c2', nombre: 'CrossFit Intensivo', instructorId: 'i2', horario: 'Martes y Jueves 20:00', sociosInscritos: ['s102', 's104'] },
            ]
        },
    },
    systemConfig: {
        platformName: 'ClubSys',
        supportEmail: 'support@clubsys.com',
        plans: [
            { id: 'plan1', name: 'Básico', description: 'Funciones esenciales.' },
            { id: 'plan2', name: 'Profesional', description: 'Funciones avanzadas.' },
        ]
    }
};

// --- MENU CONFIG ---
const allMenuItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Panel de Control', roles: ['club', 'super_admin', 'instructor'] },
    { id: 'clientes', icon: 'business', label: 'Clientes (Clubes)', roles: ['super_admin'] },
    { id: 'socios', icon: 'groups', label: 'Socios', roles: ['club'] },
    { id: 'membresias', icon: 'card_membership', label: 'Membresías', roles: ['club'] },
    { id: 'pagos', icon: 'payments', label: 'Pagos', roles: ['club'] },
    { id: 'informes', icon: 'analytics', label: 'Informes', roles: ['club', 'super_admin'] },
    { id: 'instructores', icon: 'sports', label: 'Instructores', roles: ['club'] },
    { id: 'mis_clases', icon: 'event', label: 'Mis Clases', roles: ['instructor'] },
    { id: 'configuracion', icon: 'settings', label: 'Configuración', roles: ['club', 'super_admin'] },
];

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
    children: React.ReactNode;
}
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary card">
                    <div className="error-header"><span className="material-icons-sharp">error_outline</span><h2>¡Oops! Algo salió mal.</h2></div>
                    <p>Se ha producido un error al renderizar esta sección. Esto suele deberse a una inconsistencia en los datos.</p>
                    <details className="error-details">
                        <summary>Detalles del error (para depuración)</summary>
                        <pre>{this.state.error && this.state.error.toString()}<br />{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- APP COMPONENT ---
const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setCurrentUser({ uid: firebaseUser.uid, email: firebaseUser.email, ...userDoc.data() });
                } else {
                    // This is a new user, let's create a profile for them from the seed data if it exists
                    const userSeed = mockDatabaseSeed.users.find(u => u.email === firebaseUser.email);
                    if(userSeed){
                        await setDoc(userDocRef, userSeed);
                        setCurrentUser({ uid: firebaseUser.uid, ...userSeed });
                    } else {
                        // User not found in seed, logout
                         signOut(auth);
                    }
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            return { success: false, message: 'Usuario o contraseña incorrectos.' };
        }
    };
    
    const handleLogout = async () => {
        await signOut(auth);
    }

    if (loading) {
        return <div className="login-wrapper"><h1>Cargando...</h1></div>;
    }

    return (
        currentUser 
            ? <DashboardPage currentUser={currentUser} onLogout={handleLogout} /> 
            : <LoginPage onLogin={handleLogin} />
    );
};

// --- LOGIN PAGE ---
const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await onLogin(email, password);
        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <h1>Bienvenido</h1><p>Inicia sesión para gestionar tu club</p>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-control"><input type="text" placeholder="Usuario" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                    <div className="form-control"><input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn btn-primary">Iniciar Sesión</button>
                </form>
            </div>
        </div>
    );
};

// --- DATA INITIALIZATION ---
const InitializeDataButton = () => {
    const [initializing, setInitializing] = useState(false);
    const [message, setMessage] = useState('');

    const initializeData = async () => {
        if (!window.confirm("¿Estás seguro de que quieres inicializar la base de datos? Esto sobreescribirá los datos existentes.")) return;
        setInitializing(true);
        setMessage('');

        try {
            const batch = writeBatch(db);

            // Set system config
            const configDocRef = doc(db, "system", "config");
            batch.set(configDocRef, mockDatabaseSeed.systemConfig);

            // Set club data
            for (const clubId in mockDatabaseSeed.clubs) {
                const clubData = mockDatabaseSeed.clubs[clubId];
                const clubDocRef = doc(db, "clubs", clubId);
                batch.set(clubDocRef, { name: clubData.name, plan: 'Básico', status: 'activo' });

                for (const collectionName of ['socios', 'membresias', 'pagos', 'instructores', 'clases']) {
                    if (clubData[collectionName]) {
                        for (const item of clubData[collectionName]) {
                            const itemDocRef = doc(collection(db, `clubs/${clubId}/${collectionName}`), item.id);
                            batch.set(itemDocRef, item);
                        }
                    }
                }
            }

            await batch.commit();
            setMessage('¡Base de datos inicializada con éxito! Por favor, refresca la página.');
        } catch (error) {
            console.error("Error initializing data:", error);
            setMessage(`Error al inicializar: ${error.message}`);
        } finally {
            setInitializing(false);
        }
    };

    return (
         <div className="card">
            <h2>Inicialización de Datos</h2>
            <p>Este botón cargará los datos de prueba iniciales en Firestore. Asegúrate de haber creado los usuarios en la consola de Firebase Authentication primero.</p>
            <button className="btn btn-warning" onClick={initializeData} disabled={initializing}>
                {initializing ? 'Inicializando...' : 'Inicializar Base de Datos'}
            </button>
            {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
        </div>
    );
};

// --- DASHBOARD PAGE & ROUTING ---
const DashboardPage = ({ currentUser, onLogout }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const menuItems = allMenuItems.filter(item => item.roles.includes(currentUser.role));
    
    return (
        <div className="container">
            <aside>
                <div className="top">
                    <div className="logo"><span className="material-icons-sharp">sports_kabaddi</span><h2>Club<span style={{color: 'var(--color-primary)'}}>Sys</span></h2></div>
                </div>
                <div className="sidebar">
                    {menuItems.map(item => (<a href="#" key={item.id} className={activeView === item.id ? 'active' : ''} onClick={() => setActiveView(item.id)}><span className="material-icons-sharp">{item.icon}</span><h3>{item.label}</h3></a>))}
                    <a href="#" className="logout" onClick={onLogout}><span className="material-icons-sharp">logout</span><h3>Cerrar Sesión</h3></a>
                </div>
            </aside>
            <main>
                <div className="header">
                    <h1>{menuItems.find(item => item.id === activeView)?.label}</h1>
                    <div className="user-profile">
                        <div className="info"><p>Hola, <b>{currentUser.name}</b></p><small className="text-muted">{currentUser.role}</small></div>
                        <div className="profile-photo">{currentUser.initial}</div>
                    </div>
                </div>
                <div className="content">
                    <ErrorBoundary><MainContent view={activeView} currentUser={currentUser} /></ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

// --- MAIN CONTENT ROUTER ---
const MainContent = ({ view, currentUser }) => {
    const { role, clubId, instructorId } = currentUser;

    const [isDbInitialized, setIsDbInitialized] = useState(true);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const checkData = async () => {
            if (role === 'super_admin') {
                const docRef = doc(db, "system", "config");
                const docSnap = await getDoc(docRef);
                setIsDbInitialized(docSnap.exists());
            }
            setLoading(false);
        };
        checkData();
    }, [role]);

    if (loading) return <div>Cargando...</div>;

    if (role === 'super_admin' && !isDbInitialized && view === 'dashboard') {
        return <InitializeDataButton />;
    }

    // Main Router
    switch (view) {
        case 'dashboard':
            if (role === 'super_admin') return <SuperAdminDashboard />;
            if (role === 'club') return <DashboardView clubId={currentUser.email} />;
            if (role === 'instructor') return <InstructorDashboard clubId={clubId} instructorId={instructorId}/>;
            break;
        case 'clientes':
            if (role === 'super_admin') return <h2>Clientes (WIP)</h2>;
            break;
        case 'socios':
             if (role === 'club') return <h2>Socios (WIP)</h2>;
            break;
        case 'membresias':
            if (role === 'club') return <h2>Membresías (WIP)</h2>;
            break;
        case 'pagos':
            if (role === 'club') return <h2>Pagos (WIP)</h2>;
            break;
        case 'informes':
            if (role === 'club') return <h2>Informes (WIP)</h2>;
            if (role === 'super_admin') return <h2>Informes Globales (WIP)</h2>;
            break;
        case 'instructores':
            if (role === 'club') return <h2>Instructores (WIP)</h2>;
            break;
        case 'mis_clases':
            if (role === 'instructor') return <h2>Mis Clases (WIP)</h2>;
            break;
        case 'configuracion':
            if (role === 'club') return <h2>Configuración (WIP)</h2>;
            if (role === 'super_admin') return <h2>Configuración Global (WIP)</h2>;
            break;
        default:
            return <h2>Vista no encontrada</h2>;
    }
};

// --- DASHBOARD VIEWS ---
const DashboardView = ({ clubId }) => {
    const [stats, setStats] = useState({ activos: 0, total: 0, ingreso: 0, membresias: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sociosRef = collection(db, `clubs/${clubId}/socios`);
                const membresiasRef = collection(db, `clubs/${clubId}/membresias`);
                const sociosSnap = await getDocs(sociosRef);
                const membresiasSnap = await getDocs(membresiasRef);
                
                const sociosData = sociosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const membresiasData = membresiasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const totalSocios = sociosData.length;
                const activos = sociosData.filter(s => s.estado === 'activo').length;
                const totalMembresias = membresiasData.length;

                const monthlyIncome = sociosData
                    .filter(s => s.estado === 'activo')
                    .reduce((acc, socio) => {
                        const membresia = membresiasData.find(m => m.nombre === socio.membresia);
                        if (membresia) {
                            if (membresia.periodicidad === 'Mensual') return acc + (Number(membresia.precio) || 0);
                            if (membresia.periodicidad === 'Anual') return acc + ((Number(membresia.precio) || 0) / 12);
                        }
                        return acc;
                    }, 0);

                setStats({ activos: activos, total: totalSocios, ingreso: monthlyIncome, membresias: totalMembresias });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clubId]);

    if (loading) return <div>Cargando estadísticas...</div>;
    
    return (
        <div className="dashboard-insights">
            <div className="insight-card">
                <span className="material-icons-sharp">groups</span>
                <div className="middle">
                    <div className="left"><h3>Socios Activos</h3><h1>{stats.activos}</h1></div>
                </div>
                <small className="text-muted">de un total de {stats.total}</small>
            </div>
            <div className="insight-card">
                <span className="material-icons-sharp">paid</span>
                <div className="middle">
                    <div className="left"><h3>Ingresos Mensuales (Est.)</h3><h1>${stats.ingreso.toFixed(0)}</h1></div>
                </div>
                <small className="text-muted">Basado en socios activos</small>
            </div>
            <div className="insight-card">
                <span className="material-icons-sharp">card_membership</span>
                <div className="middle">
                    <div className="left"><h3>Tipos de Membresía</h3><h1>{stats.membresias}</h1></div>
                </div>
                <small className="text-muted">Planes disponibles</small>
            </div>
        </div>
    );
};

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({ totalClubs: 0, totalSocios: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const clubsRef = collection(db, "clubs");
                const clubsSnap = await getDocs(clubsRef);
                const totalClubs = clubsSnap.size;
                let totalSocios = 0;
                
                for (const clubDoc of clubsSnap.docs) {
                    const sociosRef = collection(db, `clubs/${clubDoc.id}/socios`);
                    const sociosSnap = await getDocs(sociosRef);
                    totalSocios += sociosSnap.size;
                }

                setStats({ totalClubs, totalSocios });
            } catch (error) {
                console.error("Error fetching super admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if(loading) return <div>Cargando...</div>;

    return (
        <div className="dashboard-insights">
            <div className="insight-card">
                <span className="material-icons-sharp">business</span>
                <div className="middle">
                    <div className="left"><h3>Total de Clubes</h3><h1>{stats.totalClubs}</h1></div>
                </div>
                <small className="text-muted">Plataforma global</small>
            </div>
            <div className="insight-card">
                <span className="material-icons-sharp">groups</span>
                <div className="middle">
                    <div className="left"><h3>Total de Socios</h3><h1>{stats.totalSocios}</h1></div>
                </div>
                <small className="text-muted">En todos los clubes</small>
            </div>
        </div>
    );
};

const InstructorDashboard = ({ clubId, instructorId }) => {
    const [stats, setStats] = useState({ totalClasses: 0, nextClass: 'Ninguna' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInstructorData = async () => {
             if (!clubId || !instructorId) {
                setLoading(false);
                return;
            }
            try {
                const classesRef = collection(db, `clubs/${clubId}/clases`);
                const classesSnap = await getDocs(classesRef);
                const allClasses = classesSnap.docs.map(doc => doc.data());
                const instructorClasses = allClasses.filter(c => c.instructorId === instructorId);
                
                // This is a simplification. A real app would parse dates and find the true "next" class.
                const nextClass = instructorClasses.length > 0 ? `${instructorClasses[0].nombre} - ${instructorClasses[0].horario}` : 'Ninguna';

                setStats({ totalClasses: instructorClasses.length, nextClass });
            } catch (error) {
                console.error("Error fetching instructor data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInstructorData();
    }, [clubId, instructorId]);
    
    if(loading) return <div>Cargando...</div>;

    return (
        <div className="dashboard-insights">
            <div className="insight-card">
                <span className="material-icons-sharp">event_available</span>
                <div className="middle">
                    <div className="left"><h3>Clases Asignadas</h3><h1>{stats.totalClasses}</h1></div>
                </div>
                 <small className="text-muted">Total de clases a cargo</small>
            </div>
            <div className="insight-card">
                 <span className="material-icons-sharp">pending_actions</span>
                <div className="middle">
                    <div className="left"><h3>Próxima Clase</h3><p style={{marginTop: '1rem', fontWeight: 500}}>{stats.nextClass}</p></div>
                </div>
                <small className="text-muted">Siguiente evento en tu agenda</small>
            </div>
        </div>
    );
};

// --- ROOT RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
