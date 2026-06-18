import AppLayout from "../components/layout/AppLayout"
import { TitleLayout, TextLayout } from "../components/layout/components.styled"
import { ScreenLayout } from "../components/layout/components.styled"
import { useAuthStore } from "../store/authStore"
import { useNavigation } from "@react-navigation/native"
import { NavigationProps } from "../components/menu/Menu"
import { useEffect } from "react";

const ProfileScreen = () => {
    const user = useAuthStore(
        state => state.user
    );

    const accessToken = useAuthStore(
        state => state.accessToken
    );

    const navigation =
        useNavigation<NavigationProps>();

    useEffect(() => {
        if (!user) {
             navigation.navigate(
                "Home"
            );
            navigation.navigate(
                "Login"
            );
        }
    }, [user]);

    if (!user) {
        return null;
    }

    console.log(accessToken)
    return (
        <AppLayout>
            <ScreenLayout>
                <TitleLayout>
                    Велкам, {user.firstName}!
                </TitleLayout>
                <TextLayout>
                    email: {user.email}
                </TextLayout>
                <TextLayout>
                    lastName: {user.lastName}
                </TextLayout>
                <TextLayout>
                    тел: {user.phone}
                </TextLayout>
                {user.role === 'ADMIN' ?
                    <TextLayout>
                        адміністратор
                    </TextLayout>
                    : null}


            </ScreenLayout>
        </AppLayout>
    )
}
export default ProfileScreen;