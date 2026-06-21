import { useEffect, useState } from "react";
import {
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Pressable,
} from "react-native";
import { Alert } from "react-native";
import { deletePainting } from "../api/paintings.api";
import { Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationProps } from "../components/menu/Menu";
import { getPaintings } from "../api/paintings.api";
import { Painting } from "../types/painting.types";
import CreatePaintingForm from "../components/admin/CreatePaintingForm";
import { useTheme } from "../hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import PaintingCard from "../components/layout/PaintingCard";
import styled from "styled-components/native";
import { ImageBackground } from "react-native";

import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore";
import AppLayout from "../components/layout/AppLayout";

const dark = require("../../assets/bg/square-dark.jpg")
const light = require("../../assets/bg/square.jpg");
export default function CatalogScreen() {
    const navigation = useNavigation<NavigationProps>();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore(({ isDark }) => isDark)
    const user = useAuthStore(state => state.user)
    const [paintings, setPaintings] = useState<Painting[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateForm, setShowCreateForm] =
        useState(false);

    const [editingPainting, setEditingPainting] =
        useState<Painting | null>(null);
    const backgroundSource = isDark ? dark : light
    useEffect(() => {
        loadPaintings();
    }, []);

    const loadPaintings = async () => {
        try {
            const response = await getPaintings();
            console.log(
                response.data.map(item => item.id)
            );
            setPaintings(response.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    const handleDelete = (painting: Painting) => {
        Alert.alert(
            "Видалити картину?",
            painting.title,
            [
                {
                    text: "Скасувати",
                    style: "cancel",
                },
                {
                    text: "Видалити",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePainting(
                                painting.id
                            );

                            setPaintings(prev =>
                                prev.filter(
                                    item =>
                                        item.id !== painting.id
                                )
                            );
                        } catch (error) {
                            console.log(error);
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadPaintings();
    };
    const renderHeader = () => {
        if (user?.role !== "ADMIN") {
            return null;
        }

        return (
            <ListHeaderContainer>
                <CreateButton
                    onPress={() =>
                        setShowCreateForm(true)
                    }
                >
                    <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color="white"
                    />

                    <CreateButtonText>
                        Створити картину
                    </CreateButtonText>
                </CreateButton>
            </ListHeaderContainer>
        );
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
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={paintings}
                        ListHeaderComponent={renderHeader}
                        keyExtractor={item => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingTop: 10,
                            paddingBottom:
                                insets.bottom + 70,
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
                                isAdmin={
                                    user?.role === "ADMIN"
                                }
                                onPress={() => {
                                    navigation.navigate(
                                        "Painting",
                                        {
                                            id: item.id,
                                        }
                                    );
                                }}
                                onBuy={() => {
                                    console.log(
                                        "buy",
                                        item.id
                                    );
                                }}
                                onEdit={() => {
                                    setEditingPainting(
                                        item
                                    );
                                }}
                                onDelete={() => {
                                    handleDelete(item);
                                }}
                            />
                        )}
                    />
                    <Modal
                        visible={!!editingPainting}
                        transparent
                        animationType="slide"
                        onRequestClose={() =>
                            setEditingPainting(null)
                        }
                    >
                        <ModalContainer>
                            <ModalBackground
                                onPress={() =>
                                    setEditingPainting(null)
                                }
                            />
                            <ModalContent>
                                <ModalHeader>
                                    <ModalCloseButton
                                        onPress={() =>
                                            setEditingPainting(
                                                null
                                            )
                                        }
                                    >
                                        <ModalCloseText>
                                            ✕
                                        </ModalCloseText>
                                    </ModalCloseButton>
                                </ModalHeader>
                                <ScrollView
                                    showsVerticalScrollIndicator={
                                        false
                                    }
                                    contentContainerStyle={{
                                        paddingBottom: 30,
                                    }}
                                    scrollEnabled={true}
                                >
                                    {editingPainting && (
                                        <CreatePaintingForm
                                            painting={
                                                editingPainting
                                            }
                                            onCreated={() => {
                                                loadPaintings();
                                                setEditingPainting(
                                                    null
                                                );
                                            }}
                                            onClose={() => {
                                                setEditingPainting(
                                                    null
                                                );
                                            }}
                                        />
                                    )}
                                </ScrollView>
                            </ModalContent>
                        </ModalContainer>
                    </Modal>
                    <Modal
                        visible={showCreateForm}
                        transparent
                        animationType="slide"
                        onRequestClose={() =>
                            setShowCreateForm(false)
                        }
                    >
                        <ModalContainer>
                            <ModalBackground
                                onPress={() =>
                                    setShowCreateForm(false)
                                }
                            />
                            <ModalContent>
                                <ModalHeader>
                                    <ModalCloseButton
                                        onPress={() =>
                                            setShowCreateForm(
                                                false
                                            )
                                        }
                                    >
                                        <ModalCloseText>
                                            ✕
                                        </ModalCloseText>
                                    </ModalCloseButton>
                                </ModalHeader>
                                <ScrollView
                                    showsVerticalScrollIndicator={
                                        false
                                    }
                                    contentContainerStyle={{
                                        paddingBottom: 30,
                                    }}
                                    scrollEnabled={true}
                                >
                                    <CreatePaintingForm
                                        onCreated={() => {
                                            setShowCreateForm(
                                                false
                                            );
                                            loadPaintings();
                                        }}
                                        onClose={() => {
                                            setShowCreateForm(
                                                false
                                            );
                                        }}
                                    />
                                </ScrollView>
                            </ModalContent>
                        </ModalContainer>
                    </Modal>
                </View>
            </ScreenLayout>
        </AppLayout>
    );
}

const ScreenLayout = styled.View`
    flex: 1;
    background-color: ${({ theme }) => theme.background};
`;
const ListHeaderContainer = styled.View`
    margin: 12px 8px 20px;
`;

const CreateButton = styled.Pressable`
    height: 56px;

    flex-direction: row;
    align-items: center;
    justify-content: center;

    gap: 10px;

    border-radius: 16px;

    background-color: ${({ theme }) => theme.primary};
`;

const CreateButtonText = styled.Text`
    color: ${({ theme }) => theme.primaryText};

    font-size: 16px;
    font-weight: 700;
`;

const ModalContainer = styled.View`
    flex: 1;
    justify-content: flex-end;
`;

const ModalBackground = styled.Pressable`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled.View`
    background-color: ${({ theme }) => theme.background};
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    max-height: 90%;
    padding: 16px;
`;

const ModalHeader = styled.View`
    flex-direction: row;
    justify-content: flex-end;
    margin-bottom: 16px;
`;

const ModalCloseButton = styled.Pressable`
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
`;

const ModalCloseText = styled.Text`
    font-size: 24px;
    color: ${({ theme }) => theme.text};
    font-weight: 700;
`;