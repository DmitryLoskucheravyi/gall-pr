import BottomMenu from "../../navigation/BottomMenu";
import Header from "./Header";
export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            {children}
            <BottomMenu />
        </>
    );
}