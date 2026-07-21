import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from 'styled-components/native';
import { useTheme } from './src/hooks/useTheme';
import { useEffect } from 'react';
import { bootstrapAuth } from './src/auth/bootstrap';
export default function App() {
  const theme = useTheme();
  useEffect(() => {
    bootstrapAuth();
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <AppNavigator />
    </ThemeProvider>
  );
}

// import { useEffect } from "react";
// import { View } from "react-native";
// import { api } from "./src/api";
// import { register, login, getMe } from "./src/api/auth.api";

// import { useAuthStore } from "./src/store/authStore";
// export default function App() {
//   useEffect(() => {
//     // const testRegister = async () => {
//     //   try {
//     //     const response = await register({
//     //       email: "kererelore23@gmail.com",
//     //       password: "73880202",
//     //       firstName: "Dmytro",
//     //       lastName: "Loskucheravyi",
//     //       phone: "+380964585876",
//     //     });

//     //     console.log("SUCCESS");
//     //     console.log(response);
//     //   } catch (error) {
//     //     console.log("ERROR");
//     //     console.log(error);
//     //   }
//     // };

//     // testRegister();

//     const testLogin = async () => {
//       try {
//         const response = await login({
//           email: "kererelore23@gmail.com",
//           password: "73880202"
//         });

//         console.log("SUCCESS");
//         console.log(response);
//         useAuthStore
//           .getState()
//           .setAuth(response);

//         console.log(
//           useAuthStore.getState()
//         );
//       } catch (error) {
//         console.log("ERROR");
//         console.log(error);
//       }
//     };

//     testLogin();

//     const testAuth = async () => {
//       try {
//         const response = await getMe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsImVtYWlsIjoia2VyZXJlbG9yZTIzQGdtYWlsLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzgxNzI4ODE0LCJleHAiOjE3ODE3Mjk3MTR9.7nCg2qEfWR-B5qV396brfZjFPFOj1wbAHbZr4OlXYAI');

//         console.log("SUCCESS");
//         console.log(response);

//       } catch (error) {
//         console.log("ERROR");
//         console.log(error);
//       }
//     };

//     // testAuth();

//   }, []);

//   return <View />;
// }
