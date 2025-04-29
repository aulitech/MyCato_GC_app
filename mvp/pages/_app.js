import '../styles/global.scss';
import '../styles/firebaseui-styling.global.scss';
import { AuthUserProvider } from '../firebase/auth';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../styles/theme.js';
import AdapterDateFns from '@mui/lab/AdapterDateFns';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import NavBar from '../components/navbar'; // ✅ Import NavBar
import { useRouter } from 'next/router'; // ✅ Import useRouter

export default function App({ Component, pageProps }) {
  const router = useRouter(); // ✅ Get the current route

  // ✅ Define pages where the NavBar should be visible
  const showNavBar = router.pathname === "/dashboard" || router.pathname === "/gesture-collection";

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <AuthUserProvider>
        <ThemeProvider theme={theme}>
          <div>
            {showNavBar && <NavBar />} {/* ✅ Show NavBar only on specific pages */}
            <Component {...pageProps} />
          </div>
        </ThemeProvider>
      </AuthUserProvider>
    </LocalizationProvider>
  );
}
