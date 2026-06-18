import styled from "styled-components/native";
import { Ionicons, } from "@expo/vector-icons";

import { Animated } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { NavigateLink } from "../layout/components.styled";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useMenu } from "../../hooks/useMenu";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
type RootStackParamList = {
    Home: undefined;
    Profile: undefined;
    Register: undefined;
    Login: undefined;
};
export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const NavContainer = styled.View`
    gap: 14px;
`;

const LinkWrapper = styled.Pressable`
    flex-direction: row;
    align-items: center;
    gap:10px;
    min-height: 56px;
    padding: 0 4px;
`;


const Menu = () => {
    const isAuthenticated = useAuthStore(
        state => state.isAuthenticated
    );
    const logout = useAuthStore(
        (state) => state.logout
    );
    const theme = useTheme()
    const navigation = useNavigation<NavigationProps>()
    const { isMenuOpen, closeMenu } = useMenu();

    const NavTo = (route: keyof RootStackParamList) => {
        setTimeout(() => { navigation.navigate(route) }, 150)

        closeMenu()
    }


    const translateX = useRef(new Animated.Value(500)).current;
    useEffect(() => {
        Animated.timing(translateX, {
            toValue: isMenuOpen ? 0 : 500,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isMenuOpen]);

    return (
        <Animated.ScrollView
            pointerEvents={isMenuOpen ? "auto" : "none"}
            style={{
                flex: 1,
                position: "absolute",
                top: 0,
                left: '25%',
                right: 0,
                bottom: 0,
                borderColor: theme.text,
                borderWidth: 1,
                paddingVertical: 50,
                paddingHorizontal: 25,
                zIndex: 999,
                height: '100%',
                backgroundColor: theme.background,
                transform: [{ translateX }],
            }}
        >
            <NavContainer>
                {isAuthenticated ? <LinkWrapper onPress={() => NavTo('Profile')}>

                    <Ionicons name="person" size={35} color={theme.text} />
                    <NavigateLink>Profile</NavigateLink>
                </LinkWrapper> : null}
                {!isAuthenticated ? <LinkWrapper onPress={() => NavTo('Login')}>
                    <Ionicons name="chevron-forward-outline" size={35} color={theme.text} />
                    <NavigateLink>Увійти</NavigateLink>
                </LinkWrapper> : null}

                {isAuthenticated ? <LinkWrapper onPress={logout}>
                    <Ionicons name="enter" size={35} color={theme.text} />
                    <NavigateLink>Вийти</NavigateLink>
                </LinkWrapper> : null}


            </NavContainer>

            <Ionicons
                style={{ position: 'absolute', top: 10, right: 0, }}
                name="close-outline" size={35}
                color={theme.text}
                onPress={closeMenu}
            />
        </Animated.ScrollView>
    )
}


export default Menu;