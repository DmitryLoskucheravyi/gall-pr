import styled from "styled-components/native";
import { ContainerLayout, TitleLayout } from "./components.styled";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useMenu } from "../../hooks/useMenu";
import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavigationProps } from "../menu/Menu";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

const HeaderLayout = styled.View`
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`;

const IconContainer = styled.View`
    flex-direction: row;
    align-items: center;
    gap: 20px;
`;


const Header = () => {
    const theme = useTheme();
    const { isDark, toggleTheme } = useThemeStore()
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const navigation = useNavigation<NavigationProps>()
    const { openMenu } = useMenu()
    return (
        <ContainerLayout>
            <HeaderLayout>
                <Pressable onPress={() => navigation.navigate('Home')}>
                    <TitleLayout>Viktorumm</TitleLayout>
                </Pressable>

                <IconContainer>
                    <Pressable onPress={toggleTheme}>

                        <Ionicons name={ !isDark ? "sunny" : "moon"} size={24} color={theme.text} />

                    </Pressable>

                    <Ionicons name="cart" size={30} color={theme.text}
                    />

                    <Ionicons name="menu" size={30} color={theme.text} onPress={openMenu}
                    />
                </IconContainer>
            </HeaderLayout>


        </ContainerLayout>
    );
};

export default Header;