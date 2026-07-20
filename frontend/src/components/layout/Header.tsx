import { TitleLayout } from "./components.styled";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useMenu } from "../../hooks/useMenu";
import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavigationProps } from "../menu/Menu";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

import { HeaderContainer, HeaderLayout, IconContainer } from "./Header.styles";



const Header = () => {
    const theme = useTheme();
    const { isDark, toggleTheme } = useThemeStore()
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const navigation = useNavigation<NavigationProps>()
    const { openMenu } = useMenu()
    return (
        <HeaderContainer>
            <HeaderLayout>
                <Pressable onPress={() => navigation.navigate('Home')}>
                    <TitleLayout>Viktorumm</TitleLayout>
                </Pressable>

                <IconContainer>
                    <Pressable onPress={toggleTheme}>

                        <Ionicons name={!isDark ? "sunny" : "moon"} size={24} color={theme.text} />

                    </Pressable>


                    <Ionicons name="menu" size={30} color={theme.text} onPress={openMenu}
                    />
                </IconContainer>
            </HeaderLayout>


        </HeaderContainer>
    );
};

export default Header;