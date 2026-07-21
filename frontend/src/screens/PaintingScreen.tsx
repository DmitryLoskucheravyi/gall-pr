
import { ScrollView, View } from "react-native";

import { useEffect, useState } from "react";
import {
    FlatList,
    ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
    useNavigation,
    useRoute,
} from "@react-navigation/native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppLayout from "../components/layout/AppLayout";
import { ScreenLayout } from "../components/layout/components.styled";

import { paintingsService } from "../api/paintings.api";;
import { Painting } from "../types/painting.types";

import { useTheme } from "../hooks/useTheme";

import {
    LoaderContainer,
    BackButton,
    CoverImage,
    Title,
    Author,
    Price,
    Description,
    BuyButton,
    BuyButtonText,
    GalleryImage,
    ContentCard,
    SectionTitle,
    ImageWrapper,
    BottomBar,
    InfoLabel,
    InfoRow,
    HideWrapper,
    InfoValue
} from "./stydel/painting.styled";



export default function PaintingScreen() {
    const theme = useTheme();

    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();

    const [painting, setPainting] = useState<Painting | null>(null);
    const [loading, setLoading] = useState(true);

    const [isHideChar, setIsHideChar] = useState(true)
    const [isHideDesc, setIsHideDesc] = useState(true)

    useEffect(() => {
        loadPainting();
    }, []);

    const loadPainting = async () => {
        try {
            const data = await paintingsService.getPainting(route.params.id);
            setPainting(data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <LoaderContainer>
                <ActivityIndicator size="large" color={theme.primary} />
            </LoaderContainer>
        );
    }

    if (!painting) return null;

    return (
        <AppLayout>
            <ScreenLayout>
                <ScrollView showsVerticalScrollIndicator={false}>

                    <ImageWrapper>
                        <CoverImage
                            source={{ uri: painting.cardImage }}
                        />

                        <BackButton
                            onPress={() => navigation.goBack()}
                            style={{
                                top: 12,
                                backgroundColor: theme.primary,
                            }}
                        >
                            <Ionicons
                                name="arrow-back"
                                size={22}
                                color={theme.background}
                            />
                        </BackButton>
                    </ImageWrapper>

                    <ContentCard>

                        <Title>
                            {painting.title}
                        </Title>

                        {painting.author && (
                            <Author>
                                {painting.author}
                            </Author>
                        )}

                        <Price>
                            ₴ {Number(painting.price).toLocaleString()}
                        </Price>
                        <HideWrapper onPress={() => setIsHideDesc(prev => !prev)}>
                            <SectionTitle>
                                Опис
                                <Ionicons name={isHideDesc ? "arrow-down-circle-sharp" : "arrow-up-circle-sharp"} size={20} />
                            </SectionTitle>
                        </HideWrapper>
                        
                        {!isHideDesc ? (<Description>
                            {painting.description}
                        </Description>) : null}

                        <HideWrapper onPress={() => setIsHideChar(prev => !prev)}>
                            <SectionTitle>
                                Характеристики
                                <Ionicons name={isHideChar ? "arrow-down-circle-sharp" : "arrow-up-circle-sharp"} size={20} />
                            </SectionTitle>
                        </HideWrapper>


                        {!isHideChar && painting.author && (
                            <InfoRow>
                                <InfoLabel>Автор</InfoLabel>
                                <InfoValue>{painting.author}</InfoValue>
                            </InfoRow>
                        )}

                        {!isHideChar && painting.year && (
                            <InfoRow>
                                <InfoLabel>Рік</InfoLabel>
                                <InfoValue>{painting.year}</InfoValue>
                            </InfoRow>
                        )}

                        {!isHideChar && painting.technique && (
                            <InfoRow>
                                <InfoLabel>Техніка</InfoLabel>
                                <InfoValue>{painting.technique}</InfoValue>
                            </InfoRow>
                        )}

                        {!isHideChar && painting.material && (
                            <InfoRow>
                                <InfoLabel>Матеріал</InfoLabel>
                                <InfoValue>{painting.material}</InfoValue>
                            </InfoRow>
                        )}


                        {!isHideChar && painting.width && painting.height && (
                            <InfoRow>
                                <InfoLabel>Розмір</InfoLabel>
                                <InfoValue>
                                    {painting.width} × {painting.height} см
                                </InfoValue>
                            </InfoRow>
                        )}

                        {painting.images.length > 0 && (
                            <>
                                <SectionTitle>
                                    Галерея
                                </SectionTitle>

                                <FlatList
                                    horizontal
                                    pagingEnabled
                                    data={painting.images}
                                    keyExtractor={(item, index) =>
                                        `${item}-${index}`
                                    }
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{
                                        paddingRight: 20,
                                    }}
                                    renderItem={({ item }) => (
                                        <GalleryImage
                                            source={{ uri: item }}
                                        />
                                    )}
                                />
                            </>
                        )}

                    </ContentCard>

                </ScrollView>

                <BottomBar>
                    <BuyButton>
                        <BuyButtonText>
                            Купити за {Number(painting.price).toLocaleString()} ₴
                        </BuyButtonText>
                    </BuyButton>
                </BottomBar>


            </ScreenLayout>
        </AppLayout>
    );
}


