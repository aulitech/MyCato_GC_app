import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import { useAuth } from '../firebase/auth';
import { useRouter } from "next/router"; // ✅ Import useRouter
import styles from '../styles/navbar.module.scss';

export default function NavBar() {
  const { authUser, signOut } = useAuth();
  const router = useRouter(); // ✅ Initialize router
  const firstName = authUser?.displayName?.split(" ")[0] || "User";


  return (
    <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" className={styles.appbar}>
            <Toolbar className={styles.toolbar}>
                <Container className={styles.container}>
                    {/* ✅ Clickable "Cato Gestures" */}
                    <Typography
                        variant="h3"
                        sx={{ flexGrow: 1, alignSelf: "center", cursor: "pointer" }}
                        onClick={() => router.push("/dashboard")}
                    >
                        Cato Gestures
                    </Typography>
                    
                    {/* ✅ Welcome message with first name
                    <Typography variant="h6" sx={{ marginRight: "1rem" }}>
                        Welcome back, {firstName}!
                    </Typography> */}

                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Typography variant="h6">
                            {authUser?.email}
                        </Typography>
                        <Button variant="text" color="secondary" onClick={signOut}>
                            Logout
                        </Button>
                    </Stack>
                </Container>
            </Toolbar>
        </AppBar>
    </Box>
);
}