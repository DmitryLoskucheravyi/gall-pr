import { useEffect, useState } from "react";
import {
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationProps } from "../components/menu/Menu";
import { getPaintings } from "../api/paintings.api";
import { Painting } from "../types/painting.types";

import { useTheme } from "../hooks/useTheme";

import PaintingCard from "../components/layout/PaintingCard";
import styled from "styled-components/native";
import { ImageBackground } from "react-native";

import { useThemeStore } from "../store/themeStore";

import AppLayout from "../components/layout/AppLayout";

const dark = require("../../assets/bg/square-dark.jpg")
const light = require("../../assets/bg/square.jpg");
export default function CatalogScreen() {
    const navigation = useNavigation<NavigationProps>();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore(({ isDark }) => isDark)

    const [paintings, setPaintings] = useState<Painting[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const backgroundSource = isDark ? dark : light
    useEffect(() => {
        loadPaintings();
    }, []);

    const loadPaintings = async () => {
        try {
            const response = await getPaintings();
            setPaintings(response.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPaintings();
    };

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }


    return (
        <AppLayout>
            <ScreenLayout>
                <ImageBackground source={backgroundSource} resizeMode="repeat" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, }} />
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={paintings}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: 10,
                            paddingBottom: insets.bottom + 70,
                            paddingHorizontal: 8,
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        renderItem={({ item }) => (
                            <PaintingCard
                                painting={item}
                                onPress={() => {
                                    navigation.navigate(
                                        "Painting",
                                        {
                                            id: item.id,
                                        }
                                    );
                                }}
                                onBuy={() => {
                                    console.log("buy", item.id);
                                }}
                            />
                        )}
                    />
                </View>
            </ScreenLayout>
        </AppLayout>
    );
}

const ScreenLayout = styled.View`
    flex: 1;
    background-color: ${({ theme }) => theme.background};
`;