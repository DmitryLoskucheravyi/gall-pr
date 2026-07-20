import { Painting } from "../../types/painting.types";
import {
    Container,
    ImageWrapper,
    CardImage,
    DiscountBadge,
    DiscountText,
    Content,
    Title,
    Author,
    Size,
    PriceContainer,
    CurrentPrice,
    OldPrice,
    ButtonsRow,
    DetailsButton,
    BuyButton,
    DetailsText,
    BuyText,
    AdminButtonsRow,
    EditButton,
    DeleteButton,
    EditText,
    DeleteText,
} from "./PaintingCard.styles";

type Props = {
    painting: Painting;
    onPress?: () => void;
    onBuy?: () => void;
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
};

export default function PaintingCard({
    painting,
    onPress,
    onBuy,
    isAdmin,
    onEdit,
    onDelete,
}: Props) {
    const hasDiscount = painting.discount > 0;

    const currentPrice = Number(painting.price);

    const oldPrice = hasDiscount
        ? currentPrice / (1 - painting.discount / 100)
        : currentPrice;

    return (
        <Container>
            <ImageWrapper>
                <CardImage
                    source={{
                        uri: painting.cardImage,
                    }}
                />

                {hasDiscount && (
                    <DiscountBadge>
                        <DiscountText>
                            -{painting.discount}%
                        </DiscountText>
                    </DiscountBadge>
                )}
            </ImageWrapper>

            <Content>
                <Title numberOfLines={1}>
                    {painting.title}
                </Title>

                {!!painting.author && (
                    <Author numberOfLines={1}>
                        {painting.author}
                    </Author>
                )}

                {(painting.width && painting.height) && (
                    <Size>
                        {painting.width} × {painting.height} см
                    </Size>
                )}

                <PriceContainer>
                    <CurrentPrice>
                        {currentPrice.toLocaleString()} ₴
                    </CurrentPrice>

                    {hasDiscount && (
                        <OldPrice>
                            {Math.round(oldPrice).toLocaleString()} ₴
                        </OldPrice>
                    )}
                </PriceContainer>

                <ButtonsRow>
                    <DetailsButton onPress={onPress}>
                        <DetailsText>
                            Детальніше
                        </DetailsText>
                    </DetailsButton>

                    <BuyButton onPress={onBuy}>
                        <BuyText>
                            Купити
                        </BuyText>
                    </BuyButton>
                </ButtonsRow>
                {isAdmin && (
                    <AdminButtonsRow>
                        <EditButton onPress={onEdit}>
                            <EditText>
                                Редагувати
                            </EditText>
                        </EditButton>

                        <DeleteButton onPress={onDelete}>
                            <DeleteText>
                                Видалити
                            </DeleteText>
                        </DeleteButton>
                    </AdminButtonsRow>
                )}
            </Content>
        </Container>
    );
}

