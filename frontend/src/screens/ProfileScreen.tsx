import { TitleLayout, TextLayout } from "../components/layout/components.styled"
import { ScreenLayout } from "../components/layout/components.styled"
import Header from "../components/layout/Header"
import { useAuthStore } from "../store/authStore"
const ProfileScreen = () => {

    const user = useAuthStore(state => state.user)
    if (!user) return
    return (
        <ScreenLayout>
            <Header />
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
        </ScreenLayout>
    )
}
export default ProfileScreen;