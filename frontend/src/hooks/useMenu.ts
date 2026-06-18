import { useUIStore } from "../store/UIStore";

export const useMenu = () => {
    const isMenuOpen = useUIStore((state) => state.isMenuOpen);
    const openMenu = useUIStore((state) => state.openMenu);
    const closeMenu = useUIStore((state) => state.closeMenu);

    return {
        isMenuOpen,
        openMenu,
        closeMenu,
    };
};